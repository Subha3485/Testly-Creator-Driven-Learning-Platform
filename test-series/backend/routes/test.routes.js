const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Test = require("../models/Test");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.use(optionalAuth);

const DATA_ROOT_DIR = process.env.BACKEND_DATA_DIR
  ? path.resolve(process.env.BACKEND_DATA_DIR)
  : path.resolve(__dirname, "..", "data");
const STRUCTURED_DIR = path.resolve(DATA_ROOT_DIR, "structured");

const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Internal server error" });
  }
};

const { spawnSync } = require('child_process');

const getWeakTopicsFromBreakdown = (questionBreakdown = []) => {
  const topicStats = {};

  for (const item of questionBreakdown) {
    if (!item || !Array.isArray(item.topicTags)) {
      continue;
    }

    for (const topic of item.topicTags) {
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, incorrect: 0 };
      }
      topicStats[topic].total += 1;
      if (!item.isCorrect) {
        topicStats[topic].incorrect += 1;
      }
    }
  }

  return Object.entries(topicStats)
    .filter(([, stats]) => stats.total > 0 && stats.incorrect / stats.total >= 0.5)
    .sort((a, b) => b[1].incorrect / b[1].total - a[1].incorrect / a[1].total)
    .map(([topic]) => topic)
    .slice(0, 5);
};

function getJsonFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const result = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        result.push(fullPath);
      }
    });
  }

  return result;
}

function normalizeTopicName(fileName) {
  return fileName
    .replace(/^\d+_/, "")
    .replace(/_chapter_wise_dpp_english.*$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseQuestionArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.questions)) return raw.questions;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function normalizeImportedText(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  if (/[ÃÂâ]/.test(input)) {
    try {
      return Buffer.from(input, "latin1").toString("utf8").trim();
    } catch (_error) {
      return input;
    }
  }

  return input;
}

function normalizeRichSegments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((segment) => {
      if (typeof segment === "string") {
        return { text: normalizeImportedText(segment) };
      }

      if (!segment || typeof segment !== "object") {
        return null;
      }

      const text = normalizeImportedText(segment.text || "");
      if (!text) {
        return null;
      }

      return {
        text,
        bold: Boolean(segment.bold),
        italic: Boolean(segment.italic),
        underline: Boolean(segment.underline)
      };
    })
    .filter(Boolean);
}

function pickRichSegments(source, keys) {
  for (const key of keys) {
    const segments = normalizeRichSegments(source?.[key]);
    if (segments.length) {
      return segments;
    }
  }

  return [];
}

function resolveImageUrl(value) {
  const imageValue = normalizeImportedText(value || "");
  if (!imageValue) {
    return "";
  }

  const normalized = imageValue.replace(/\\/g, "/");
  if (normalized.startsWith("output/images/")) {
    return `/${normalized.replace(/^output\/images\//, "question-images/")}`;
  }

  if (normalized.startsWith("images/")) {
    return `/${normalized.replace(/^images\//, "question-images/")}`;
  }

  return normalized;
}

function buildImagePayload(question, fallbackLabel) {
  const rawImageRef = question?.image_ref || question?.imageRef || question?.image?.key || question?.image?.url || "";
  const imageUrl = resolveImageUrl(rawImageRef);

  if (!imageUrl) {
    return { imageRef: "", image: null };
  }

  return {
    imageRef: imageUrl,
    image: {
      url: imageUrl,
      key: normalizeImportedText(rawImageRef || ""),
      sourceType: imageUrl.startsWith("http") ? "remote" : "local",
      alt: normalizeImportedText(question?.image?.alt || fallbackLabel || "Question image") || "Question image"
    }
  };
}

function serializeQuestionForClient(question) {
  const explanationText = typeof question?.explanation === "string"
    ? question.explanation
    : normalizeImportedText(question?.explanation?.text || "");

  const explanationHtml = normalizeImportedText(
    question?.explanationHtml
      || question?.explanation_html
      || question?.explanation?.html
      || ""
  );

  const { imageRef, image } = buildImagePayload(question, "Question image");

  return {
    _id: question?._id,
    question: question?.question || "",
    questionHtml: normalizeImportedText(question?.questionHtml || question?.question_html || ""),
    questionRich: Array.isArray(question?.questionRich) ? question.questionRich : [],
    options: Array.isArray(question?.options) ? question.options : [],
    optionsHtml: Array.isArray(question?.optionsHtml) ? question.optionsHtml : [],
    optionsRich: Array.isArray(question?.optionsRich) ? question.optionsRich : [],
    correctAnswer: question?.correctAnswer,
    marks: question?.marks,
    negativeMarks: question?.negativeMarks,
    topicTags: Array.isArray(question?.topicTags) ? question.topicTags : [],
    difficulty: question?.difficulty,
    explanation: {
      text: explanationText,
      videoUrl: question?.explanation?.videoUrl || ""
    },
    explanationHtml,
    explanationRich: Array.isArray(question?.explanationRich) ? question.explanationRich : [],
    imageRef,
    image,
    tables: Array.isArray(question?.tables) ? question.tables : [],
    sourcePages: Array.isArray(question?.sourcePages) ? question.sourcePages : [],
    level: normalizeImportedText(question?.level || ""),
    questionNumber: Number(question?.questionNumber || 0)
  };
}

function mapStructuredQuestion(question, index, fileSlug, topic) {
  const options = Array.isArray(question.options)
    ? question.options.map((option) => normalizeImportedText(option?.text || option?.label || option || "")).filter(Boolean)
    : [];
  const optionsHtml = Array.isArray(question.options)
    ? question.options.map((option) => normalizeImportedText(option?.html || option?.text || option?.label || option || ""))
    : [];
  const optionsRich = Array.isArray(question.options)
    ? question.options.map((option) => pickRichSegments(option, ["rich_text", "text_rich", "segments"]))
    : [];

  const questionHtml = normalizeImportedText(question.question_html || question.questionHtml || "");
  const explanationHtml = normalizeImportedText(question.explanation_html || question.explanationHtml || "");
  const { imageRef, image } = buildImagePayload(question, `Question ${index + 1}`);

  const answerSource = question.correctAnswer ?? question.correct_answer ?? 0;
  const answerIndex = typeof answerSource === "number"
    ? answerSource
    : String(answerSource || "A").trim().toUpperCase().length === 1
      ? String(answerSource || "A").trim().toUpperCase().charCodeAt(0) - 65
      : Math.max(0, Number(answerSource) - 1);
  const safeAnswer = Number.isFinite(answerIndex) ? Math.min(Math.max(answerIndex, 0), Math.max(options.length - 1, 0)) : 0;

  return {
    _id: `${fileSlug}-${index + 1}`,
    question: normalizeImportedText(question.question || question.question_text || ""),
    questionHtml,
    questionRich: pickRichSegments(question, ["question_rich", "question_segments", "rich_text", "segments"]),
    options,
    optionsHtml,
    optionsRich,
    correctAnswer: safeAnswer,
    marks: Number(question.marks || 1),
    negativeMarks: Number(question.negative_marks || 0.25),
    topicTags: [topic],
    difficulty: "MEDIUM",
    level: normalizeImportedText(question.level || ""),
    questionNumber: Number(question.question_number || index + 1),
    imageRef,
    image,
    tables: Array.isArray(question.tables) ? question.tables : [],
    sourcePages: Array.isArray(question.sourcePages || question.source_pages) ? (question.sourcePages || question.source_pages) : [],
    explanation: {
      text: normalizeImportedText(question.explanation || "")
    },
    explanationHtml,
    explanationRich: pickRichSegments(question, ["explanation_rich", "explanation_segments"])
  };
}

router.get(
  "/banking/practice-sets",
  asyncHandler(async (_req, res) => {
    const files = getJsonFilesRecursive(STRUCTURED_DIR);

    const practiceSets = files.map((filePath) => {
      const fileName = path.basename(filePath, ".json");
      const topic = normalizeTopicName(fileName);
      const slug = toSlug(fileName);
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const questions = parseQuestionArray(raw);

      return {
        id: slug,
        fileName,
        topic,
        title: `${topic} Practice Set`,
        questionCount: questions.length
      };
    });

    res.json({
      source: "structured-files",
      count: practiceSets.length,
      sets: practiceSets
    });
  })
);

router.get(
  "/banking/practice-sets/:setId/questions",
  asyncHandler(async (req, res) => {
    const files = getJsonFilesRecursive(STRUCTURED_DIR);
    const match = files.find((filePath) => toSlug(path.basename(filePath, ".json")) === req.params.setId);

    if (!match) {
      return res.status(404).json({ message: "Practice set not found" });
    }

    const fileName = path.basename(match, ".json");
    const topic = normalizeTopicName(fileName);
    const raw = JSON.parse(fs.readFileSync(match, "utf8"));
    const entries = parseQuestionArray(raw);
    const questions = entries.map((question, index) => mapStructuredQuestion(question, index, req.params.setId, topic));

    res.json({
      _id: req.params.setId,
      title: `${topic} Practice Set`,
      description: `Practice questions loaded from ${fileName}.json`,
      examTarget: "BANKING",
      testType: "TOPIC",
      duration: Math.max(10, questions.length),
      topics: [topic],
      questions
    });
  })
);

router.get(
  "/banking/courses",
  asyncHandler(async (_req, res) => {
    const files = getJsonFilesRecursive(STRUCTURED_DIR);
    const courses = files.map((filePath) => {
      const fileName = path.basename(filePath, ".json");
      const topic = normalizeTopicName(fileName);
      const slug = toSlug(fileName);
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const questions = parseQuestionArray(raw);

      return {
        id: slug,
        title: `${topic} Course`,
        teacher: "PrepNexus Creator",
        lessons: Math.min(20, Math.max(6, Math.round(questions.length / 6))),
        price: questions.length > 80 ? "₹499" : "FREE",
        questions: questions.length,
        description: `Practice and course content for ${topic}.`
      };
    });

    res.json({
      source: "structured-files",
      count: courses.length,
      courses
    });
  })
);

router.get(
  "/banking/dashboard",
  asyncHandler(async (_req, res) => {
    const files = getJsonFilesRecursive(STRUCTURED_DIR);
    const practiceSets = files.map((filePath) => {
      const fileName = path.basename(filePath, ".json");
      const topic = normalizeTopicName(fileName);
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return {
        topic,
        questionCount: parseQuestionArray(raw).length
      };
    });

    const totalQuestions = practiceSets.reduce((sum, item) => sum + item.questionCount, 0);
    const topTopics = practiceSets
      .sort((a, b) => b.questionCount - a.questionCount)
      .slice(0, 5)
      .map((item) => item.topic);

    res.json({
      summary: {
        totalPracticeSets: practiceSets.length,
        totalQuestions,
        activeStudents: 14320,
        completedLessons: 8200
      },
      topTopics,
      recommendations: [
        { title: "Practice Quant topic drills", details: "Focus on your weakest topics with short daily mocks." },
        { title: "Complete the latest course", details: "Finish the linked course and attempt the recommended mock." }
      ]
    });
  })
);

router.get(
  "/catalog/tests",
  asyncHandler(async (req, res) => {
    const { examTarget, testType, topic, includeDrafts } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const filter = {};
    if (examTarget) {
      filter.examTarget = examTarget;
    }
    if (testType) {
      filter.testType = testType;
    }
    if (topic) {
      filter.topics = topic;
    }
    if (includeDrafts !== "true") {
      filter.isPublished = true;
    }

    const tests = await Test.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title description examTarget testType duration topics difficulty questions isPublished createdAt");

    const payload = tests.map((test) => ({
      _id: test._id,
      title: test.title,
      description: test.description,
      examTarget: test.examTarget,
      testType: test.testType,
      duration: test.duration,
      topics: test.topics,
      difficulty: test.difficulty,
      questionCount: test.questions.length,
      isPublished: test.isPublished,
      createdAt: test.createdAt
    }));

    res.json(payload);
  })
);

router.get(
  "/catalog/questions/similar/:questionId",
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: "Invalid question id" });
    }

    const baseQuestion = await Question.findById(questionId);
    if (!baseQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    const similarQuestions = await Question.find({
      _id: { $ne: baseQuestion._id },
      examTarget: baseQuestion.examTarget,
      difficulty: baseQuestion.difficulty,
      topicTags: { $in: baseQuestion.topicTags }
    })
      .select("question options examTarget difficulty topicTags source")
      .limit(limit);

    res.json(similarQuestions);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid test id" });
    }

    const test = await Test.findById(req.params.id).populate("questions");
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const sanitizedQuestions = test.questions.map((q) => serializeQuestionForClient(q));

    res.json({
      _id: test._id,
      title: test.title,
      description: test.description,
      examTarget: test.examTarget,
      testType: test.testType,
      duration: test.duration,
      topics: test.topics,
      difficulty: test.difficulty,
      questions: sanitizedQuestions
    });
  })
);

router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    const { testId, answers = {}, userId = "demo-user", timeSpentSeconds = 0 } = req.body;
    const resolvedUserId = req.user?.sub || userId;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: "Invalid test id" });
    }

    const test = await Test.findById(testId).populate("questions");
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    let score = 0;
    let totalMarks = 0;
    let attemptedCount = 0;
    let correctCount = 0;

    const questionBreakdown = test.questions.map((q, index) => {
      totalMarks += q.marks;
      const selectedAnswer = answers[index];
      const attempted = selectedAnswer !== undefined && selectedAnswer !== null;
      const isCorrect = attempted && Number(selectedAnswer) === q.correctAnswer;

      if (attempted) {
        attemptedCount += 1;
      }

      if (isCorrect) {
        score += q.marks;
        correctCount += 1;
      } else if (attempted) {
        score -= q.negativeMarks;
      }

      return {
        questionId: q._id,
        selectedAnswer: attempted ? Number(selectedAnswer) : undefined,
        correctAnswer: q.correctAnswer,
        isCorrect,
        topicTags: q.topicTags
      };
    });

    const accuracyPct = attemptedCount === 0 ? 0 : Number(((correctCount / attemptedCount) * 100).toFixed(2));
    const weakTopics = getWeakTopicsFromBreakdown(questionBreakdown);

    const submission = await Submission.create({
      userId: resolvedUserId,
      testId,
      examTarget: test.examTarget,
      testType: test.testType,
      answers,
      score,
      totalMarks,
      accuracyPct,
      timeSpentSeconds,
      weakTopics,
      questionBreakdown
    });

    res.json({
      _id: submission._id,
      userId: resolvedUserId,
      score,
      totalMarks,
      accuracyPct,
      weakTopics,
      attemptedCount,
      totalQuestions: test.questions.length
    });
  })
);

router.get(
  "/solution/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid submission id" });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const test = await Test.findById(submission.testId).populate("questions");
    if (!test) {
      return res.status(404).json({ message: "Test not found for submission" });
    }

    const questions = test.questions.map((q, index) => ({
      ...serializeQuestionForClient(q),
      selectedAnswer: submission.answers[index]
    }));

    res.json({ submission, test, questions });
  })
);

router.get(
  "/analytics/user/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { examTarget } = req.query;

    const filter = { userId };
    if (examTarget) {
      filter.examTarget = examTarget;
    }

    const submissions = await Submission.find(filter).sort({ createdAt: -1 }).limit(100);
    if (submissions.length === 0) {
      return res.json({
        userId,
        attempts: 0,
        avgScore: 0,
        avgAccuracy: 0,
        latestWeakTopics: []
      });
    }

    const attempts = submissions.length;
    const avgScore = Number(
      (submissions.reduce((sum, item) => sum + item.score, 0) / attempts).toFixed(2)
    );
    const avgAccuracy = Number(
      (submissions.reduce((sum, item) => sum + item.accuracyPct, 0) / attempts).toFixed(2)
    );

    const weakTopicFrequency = {};
    submissions.forEach((submission) => {
      submission.weakTopics.forEach((topic) => {
        weakTopicFrequency[topic] = (weakTopicFrequency[topic] || 0) + 1;
      });
    });

    const latestWeakTopics = Object.entries(weakTopicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    res.json({
      userId,
      attempts,
      avgScore,
      avgAccuracy,
      latestWeakTopics,
      recentSubmissions: submissions.slice(0, 10)
    });
  })
);

router.get(
  "/weak-topics/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const submissions = await Submission.find({ userId }).sort({ createdAt: -1 }).limit(100);

    const scorecard = {};
    submissions.forEach((item) => {
      item.questionBreakdown.forEach((detail) => {
        (detail.topicTags || []).forEach((topic) => {
          if (!scorecard[topic]) {
            scorecard[topic] = { total: 0, incorrect: 0 };
          }

          scorecard[topic].total += 1;
          if (!detail.isCorrect) {
            scorecard[topic].incorrect += 1;
          }
        });
      });
    });

    const weakTopics = Object.entries(scorecard)
      .map(([topic, stats]) => ({
        topic,
        total: stats.total,
        incorrect: stats.incorrect,
        incorrectRate: Number(((stats.incorrect / stats.total) * 100).toFixed(2))
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.incorrectRate - a.incorrectRate)
      .slice(0, 10);

    res.json({ userId, weakTopics });
  })
);

// --- Missing-info / review workflow ---

const ADMIN_QUEUE_FILE = path.resolve(DATA_ROOT_DIR, "admin_review_queue.json");
const PDFS_DIR = path.resolve(DATA_ROOT_DIR, "pdfs");

function loadAdminQueue() {
  try {
    if (!fs.existsSync(ADMIN_QUEUE_FILE)) return [];
    return JSON.parse(fs.readFileSync(ADMIN_QUEUE_FILE, "utf8")) || [];
  } catch (err) {
    return [];
  }
}

function saveAdminQueue(queue) {
  try {
    fs.writeFileSync(ADMIN_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
  } catch (err) {
    // ignore
  }
}

function getPdfFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const result = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        result.push(fullPath);
      }
    });
  }

  return result;
}

function attemptAutoRevalidationOnQuestion(filePath, index, question) {
  // Lightweight automated attempt: if html fields are missing but plaintext exists,
  // convert plain text to simple paragraph HTML. Returns updated question or null.
  const updated = { ...question };
  let changed = false;

  if ((!updated.questionHtml || !String(updated.questionHtml).trim()) && updated.question) {
    updated.questionHtml = `<p>${String(updated.question).trim()}</p>`;
    changed = true;
  }

  if ((!updated.explanationHtml || !String(updated.explanationHtml).trim()) && updated.explanation && updated.explanation.text) {
    updated.explanationHtml = `<p>${String(updated.explanation.text).trim()}</p>`;
    changed = true;
  }

  if (changed) return updated;
  return null;
}

router.post(
  "/questions/:questionId/flag",
  asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    if (!questionId) return res.status(400).json({ message: "Missing question id" });

    // find the structured file and index for this question id
    const files = getJsonFilesRecursive(STRUCTURED_DIR);
    let matched = null;
    let matchedSlug = null;
    for (const f of files) {
      const slug = toSlug(path.basename(f, ".json"));
      if (questionId.startsWith(`${slug}-`)) {
        matched = f;
        matchedSlug = slug;
        break;
      }
    }

    if (!matched) {
      return res.status(404).json({ message: "Question source file not found" });
    }

    const raw = JSON.parse(fs.readFileSync(matched, "utf8"));
    const entries = parseQuestionArray(raw);

    // extract index from id (last hyphen)
    const parts = questionId.split("-");
    const indexStr = parts[parts.length - 1];
    const qIndex = Math.max(0, Number(indexStr) - 1);
    if (!Number.isFinite(qIndex) || qIndex < 0 || qIndex >= entries.length) {
      return res.status(400).json({ message: "Invalid question index" });
    }

    const original = entries[qIndex] || {};

    // track reviewCount on the question object itself (file-backed)
    const meta = original.__reviewMeta || { reviewCount: 0 };

    if (meta.reviewCount >= 1) {
      // escalate to admin queue
      const queue = loadAdminQueue();
      const exists = queue.find((it) => it.questionId === questionId && it.status === "pending");
      if (!exists) {
        queue.push({
          id: `${matchedSlug}-${qIndex + 1}-${Date.now()}`,
          questionId,
          file: path.basename(matched),
          filePath: matched,
          index: qIndex,
          reason: req.body.reason || "flagged_by_user_second_time",
          status: "pending",
          createdAt: new Date().toISOString()
        });
        saveAdminQueue(queue);
      }

      return res.json({ status: "escalated", message: "Sent for manual review" });
    }

    // attempt automated revalidation/fix
    const updatedQuestion = attemptAutoRevalidationOnQuestion(matched, qIndex, original);

    if (updatedQuestion) {
      // apply update and increment reviewCount
      updatedQuestion.__reviewMeta = { reviewCount: (meta.reviewCount || 0) + 1 };
      entries[qIndex] = updatedQuestion;
      // write back to disk atomically
      try {
        const out = Array.isArray(raw) ? entries : { ...(raw || {}), questions: entries };
        fs.writeFileSync(matched, JSON.stringify(out, null, 2), "utf8");
        return res.json({ status: "updated", message: "Question updated via automated revalidation" });
      } catch (err) {
        return res.status(500).json({ message: "Failed to write structured file" });
      }
    }

    // nothing could be auto-fixed -> escalate and increment reviewCount marker
    original.__reviewMeta = { reviewCount: (meta.reviewCount || 0) + 1 };
    entries[qIndex] = original;
    try {
      const out = Array.isArray(raw) ? entries : { ...(raw || {}), questions: entries };
      fs.writeFileSync(matched, JSON.stringify(out, null, 2), "utf8");
    } catch (err) {
      // ignore write errors for meta
    }

    // Attempt stronger pipeline-driven revalidation by invoking Python helper if the original pipeline output exists
    try {
      // try to locate pipeline summary in repo pipeline output
      const pipelineSummary = path.resolve(__dirname, '..', '..', '..', 'pipeline', 'output', 'summary.json');
      let pdfPath = null;
      if (fs.existsSync(pipelineSummary)) {
        const summary = JSON.parse(fs.readFileSync(pipelineSummary, 'utf8')) || [];
        const structuredName = path.basename(matched);
        const entry = summary.find((e) => String(e.structured_output || '').endsWith(structuredName));
        if (entry && entry.pdf) pdfPath = entry.pdf;
      }

      if (pdfPath) {
        const scriptPath = path.resolve(__dirname, '..', '..', '..', 'pipeline', 'revalidate_question.py');
        const args = [scriptPath, '--pdf', pdfPath, '--index', String(qIndex)];
        const py = spawnSync('python', args, { encoding: 'utf8', timeout: 120000 });
        if (!py.error && py.status === 0 && py.stdout) {
          try {
            const parsed = JSON.parse(py.stdout);
            if (parsed && (!parsed.error)) {
              // build optionsHtml array
              const newOptionsHtml = Array.isArray(parsed.options) ? parsed.options.map((o) => o.html || o.text || '') : [];
              const newQuestionHtml = parsed.question_html || '';
              const newExplanationHtml = parsed.explanation_html || '';
              const newImageRef = parsed.image_ref || '';

              let changed = false;
              const target = entries[qIndex] || {};
              if (newQuestionHtml && (String(target.questionHtml || target.question_html || '') !== String(newQuestionHtml))) {
                if (target.hasOwnProperty('questionHtml')) target.questionHtml = newQuestionHtml; else target.question_html = newQuestionHtml;
                changed = true;
              }
              if (newExplanationHtml && (String(target.explanationHtml || target.explanation_html || '') !== String(newExplanationHtml))) {
                if (target.hasOwnProperty('explanationHtml')) target.explanationHtml = newExplanationHtml; else target.explanation_html = newExplanationHtml;
                changed = true;
              }
              if (newOptionsHtml.length) {
                if (target.hasOwnProperty('optionsHtml')) target.optionsHtml = newOptionsHtml; else target.options_html = newOptionsHtml;
                changed = true;
              }
              if (newImageRef && (String(target.imageRef || target.image_ref || '') !== String(newImageRef))) {
                if (target.hasOwnProperty('imageRef')) target.imageRef = newImageRef; else target.image_ref = newImageRef;
                changed = true;
              }

              if (changed) {
                target.__reviewMeta = { reviewCount: (meta.reviewCount || 0) + 1 };
                entries[qIndex] = target;
                const out = Array.isArray(raw) ? entries : { ...(raw || {}), questions: entries };
                fs.writeFileSync(matched, JSON.stringify(out, null, 2), 'utf8');
                return res.json({ status: 'updated', message: 'Question updated via pipeline revalidation' });
              }
            }
          } catch (err) {
            /* parse error -> continue to escalate */
          }
        }
      }
    } catch (err) {
      // ignore pipeline revalidation errors and fall through to escalation
    }

    const queue = loadAdminQueue();
    queue.push({
      id: `${matchedSlug}-${qIndex + 1}-${Date.now()}`,
      questionId,
      file: path.basename(matched),
      filePath: matched,
      index: qIndex,
      reason: req.body.reason || "flagged_by_user",
      status: "pending",
      createdAt: new Date().toISOString()
    });
    saveAdminQueue(queue);

    return res.json({ status: "escalated", message: "Sent for manual review" });
  })
);

router.get(
  "/admin/review/queue",
  asyncHandler(async (_req, res) => {
    const queue = loadAdminQueue();
    res.json({ count: queue.length, items: queue });
  })
);

router.get(
  "/storage/validate/reasoning-pdfs",
  asyncHandler(async (_req, res) => {
    const structuredFiles = getJsonFilesRecursive(STRUCTURED_DIR);
    const availablePdfPaths = getPdfFilesRecursive(PDFS_DIR);
    const availablePdfNames = new Set(availablePdfPaths.map((filePath) => path.basename(filePath)));

    const missing = [];
    const seen = new Set();

    for (const filePath of structuredFiles) {
      const fileName = path.basename(filePath, ".json");
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const entries = parseQuestionArray(raw);

      for (const question of entries) {
        const sourcePdf = question?.sourcePdf?.key || question?.source_pdf?.key || question?.sourcePdf || "";
        const pdfName = path.basename(String(sourcePdf || ""));
        if (!pdfName || availablePdfNames.has(pdfName)) {
          continue;
        }

        const token = `${fileName}:${pdfName}`;
        if (seen.has(token)) {
          continue;
        }

        seen.add(token);
        missing.push({
          structuredFile: fileName,
          pdfName,
          expectedPath: path.join(PDFS_DIR, pdfName)
        });
      }
    }

    res.json({
      pdfDir: PDFS_DIR,
      totalPdfFiles: availablePdfPaths.length,
      missingCount: missing.length,
      missing
    });
  })
);

module.exports = router;

