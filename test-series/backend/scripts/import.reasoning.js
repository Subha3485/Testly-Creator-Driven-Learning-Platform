require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Question = require("../models/Question");
const Test = require("../models/Test");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/testseries";
const DATA_ROOT_DIR = process.env.BACKEND_DATA_DIR
  ? path.resolve(process.env.BACKEND_DATA_DIR)
  : path.resolve(__dirname, "..", "data");
const ROOT_DIR = path.resolve(DATA_ROOT_DIR, "structured");

const LEVEL_MAP = {
  "Level-1": "EASY",
  "Level-2": "MEDIUM",
  "Level-3": "HARD",
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD"
};

async function main() {
  const files = getJsonFiles(ROOT_DIR);
  if (files.length === 0) {
    console.log(`No structured reasoning files found in ${ROOT_DIR}`);
    return;
  }

  await mongoose.connect(MONGO_URI);

  const importedQuestions = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath, ".json");
    const topicName = normalizeTopicName(fileName);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const entries = extractQuestionEntries(raw);
    const documents = entries
      .map((item, index) => mapQuestion(item, topicName, fileName, index))
      .filter(Boolean);

    if (documents.length === 0) {
      console.log(`Skipped ${fileName}: no valid questions found.`);
      continue;
    }

    await Question.deleteMany({ examTarget: "BANKING", createdBy: fileName });
    const inserted = await Question.insertMany(documents, { ordered: false });
    importedQuestions.push(...inserted);

    await upsertTopicTest(topicName, fileName, inserted);
    console.log(`Imported ${inserted.length} Banking questions from ${fileName}`);
  }

  console.log(`Completed Banking import. Total questions: ${importedQuestions.length}`);
  await mongoose.disconnect();
}

function getJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    });
  }

  return files;
}

function normalizeTopicName(fileName) {
  return fileName
    .replace(/^\d+_/, "")
    .replace(/_chapter_wise_dpp_english.*$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function mapQuestion(item, topicName, fileName, index) {
  const options = Array.isArray(item.options)
    ? item.options
        .map((option) => option.text || option.label || option)
        .map((option) => String(option || "").trim())
        .filter(Boolean)
    : [];
  const optionsRich = Array.isArray(item.options)
    ? item.options.map((option) => pickRichSegments(option, ["rich_text", "text_rich", "segments"]))
    : [];

  if (options.length < 2) {
    return null;
  }

  const questionText = String(item.question || item.question_text || "").trim();
  if (questionText.length < 8) {
    return null;
  }

  const correctAnswer = answerToIndex(item.correctAnswer ?? item.correct_answer, options.length);

  return {
    question: questionText || `Imported Banking question ${index + 1}`,
    questionRich: pickRichSegments(item, ["question_rich", "question_segments", "rich_text", "segments"]),
    options,
    optionsRich,
    correctAnswer,
    marks: Number(item.marks || 1),
    negativeMarks: Number(item.negative_marks || 0.25),
    source: "PYQ",
    examTarget: "BANKING",
    year: item.year || undefined,
    topicTags: buildTags(item.tags || item.topicTags, topicName),
    difficulty: LEVEL_MAP[item.level] || "MEDIUM",
    explanation: {
      text: item.explanation?.text || item.explanation || ""
    },
    explanationRich: pickRichSegments(item, ["explanation_rich", "explanation_segments", "explanationRich"]),
    qualityScore: 0,
    isVerified: true,
    createdBy: fileName
  };
}

function normalizeRichSegments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((segment) => {
      if (typeof segment === "string") {
        return { text: segment };
      }

      if (!segment || typeof segment !== "object") {
        return null;
      }

      const text = String(segment.text || "").trim();
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

function buildTags(tags, topicName) {
  const normalizedTags = Array.isArray(tags) ? tags.map((tag) => String(tag).replace(/_/g, " ").trim()) : [];
  return Array.from(new Set([topicName, ...normalizedTags].filter(Boolean)));
}

function answerToIndex(value, optionsLength) {
  if (typeof value === "number") {
    return normalizeAnswerIndex(value, optionsLength);
  }

  const text = String(value || "").trim().toUpperCase();
  if (!text) {
    return 0;
  }

  const parsed = text.length === 1 ? text.charCodeAt(0) - 65 : Number(text) - 1;
  return normalizeAnswerIndex(parsed, optionsLength);
}

function normalizeAnswerIndex(index, optionsLength) {
  const safeIndex = Number.isFinite(index) ? index : 0;
  if (!Number.isFinite(optionsLength) || optionsLength <= 0) {
    return Math.max(0, safeIndex);
  }
  return Math.min(optionsLength - 1, Math.max(0, safeIndex));
}

function extractQuestionEntries(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && Array.isArray(raw.questions)) {
    return raw.questions;
  }
  if (raw && Array.isArray(raw.items)) {
    return raw.items;
  }
  return [];
}

async function upsertTopicTest(topicName, fileName, questions) {
  const existing = await Test.findOne({ examTarget: "BANKING", createdBy: fileName, title: { $regex: topicName, $options: "i" } });

  const payload = {
    title: `${topicName} Practice Set`,
    description: `Imported practice set for ${topicName}`,
    examTarget: "BANKING",
    testType: "TOPIC",
    duration: Math.max(10, questions.length),
    difficulty: "MIXED",
    topics: [topicName],
    questions: questions.map((question) => question._id),
    isPublished: true,
    createdBy: fileName
  };

  if (existing) {
    await Test.updateOne({ _id: existing._id }, payload);
    return;
  }

  await Test.create(payload);
}

main().catch(async (error) => {
  console.error("Banking reasoning import failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
