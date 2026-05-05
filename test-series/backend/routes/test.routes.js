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

const STRUCTURED_DIR = process.env.REASONING_STRUCTURED_DIR
  ? path.resolve(process.env.REASONING_STRUCTURED_DIR)
  : path.resolve(__dirname, "..", "..", "..", "Reasoning", "structured");

const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Internal server error" });
  }
};

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

function mapStructuredQuestion(question, index, fileSlug, topic) {
  const options = Array.isArray(question.options)
    ? question.options.map((option) => normalizeImportedText(option?.text || option?.label || option || "")).filter(Boolean)
    : [];

  const answerRaw = String(question.correct_answer || "A").trim().toUpperCase();
  const answerIndex = answerRaw.length === 1 ? answerRaw.charCodeAt(0) - 65 : Math.max(0, Number(answerRaw) - 1);
  const safeAnswer = Number.isFinite(answerIndex) ? Math.min(Math.max(answerIndex, 0), Math.max(options.length - 1, 0)) : 0;

  return {
    _id: `${fileSlug}-${index + 1}`,
    question: normalizeImportedText(question.question || question.question_text || ""),
    options,
    correctAnswer: safeAnswer,
    marks: Number(question.marks || 1),
    negativeMarks: Number(question.negative_marks || 0.25),
    topicTags: [topic],
    difficulty: "MEDIUM",
    level: normalizeImportedText(question.level || ""),
    questionNumber: Number(question.question_number || index + 1),
    imageRef: normalizeImportedText(question.image_ref || ""),
    explanation: {
      text: normalizeImportedText(question.explanation || "")
    }
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

    const sanitizedQuestions = test.questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      topicTags: q.topicTags,
      difficulty: q.difficulty,
      explanation: q.explanation
    }));

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
      _id: q._id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      topicTags: q.topicTags,
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

module.exports = router;
