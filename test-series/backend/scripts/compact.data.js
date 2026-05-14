require("dotenv").config();

const fs = require("fs");
const path = require("path");

const DATA_ROOT_DIR = process.env.BACKEND_DATA_DIR
  ? path.resolve(process.env.BACKEND_DATA_DIR)
  : path.resolve(__dirname, "..", "data");
const STRUCTURED_DIR = path.resolve(DATA_ROOT_DIR, "structured");

function main() {
  const files = getJsonFiles(STRUCTURED_DIR);
  if (files.length === 0) {
    console.log(`No structured files found in ${STRUCTURED_DIR}`);
    return;
  }

  for (const filePath of files) {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const questions = extractQuestionEntries(raw).map((item, index) => normalizeQuestionRecord(item, index));
    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    console.log(`Normalized ${path.basename(filePath)} (${questions.length} questions)`);
  }
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
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    });
  }

  return files;
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

function normalizeQuestionRecord(item, index) {
  const questionText = normalizeText(item.question || item.question_text || "");
  const questionHtml = normalizeText(item.questionHtml || item.question_html || toHtml(questionText));
  const explanationText = normalizeText(item.explanation?.text || item.explanation || "");
  const explanationHtml = normalizeText(item.explanationHtml || item.explanation_html || toHtml(explanationText));

  const options = Array.isArray(item.options)
    ? item.options.map((option, optionIndex) => normalizeOption(option, optionIndex))
    : [];

  return {
    question_number: String(item.question_number || item.questionNumber || index + 1),
    level: normalizeText(item.level || ""),
    question: questionText,
    questionHtml: questionHtml,
    options,
    correctAnswer: normalizeAnswer(item.correctAnswer ?? item.correct_answer, options.length),
    explanation: explanationText,
    explanationHtml,
    tables: Array.isArray(item.tables) ? item.tables : [],
    imageRef: normalizeImageRef(item.imageRef || item.image_ref || item.image?.url || ""),
    image: normalizeImage(item, questionText),
    tags: Array.isArray(item.tags) ? item.tags : Array.isArray(item.topicTags) ? item.topicTags : [],
    sourcePages: Array.isArray(item.sourcePages || item.source_pages) ? (item.sourcePages || item.source_pages) : []
  };
}

function normalizeOption(option, optionIndex) {
  const id = option?.id || String.fromCharCode(65 + optionIndex);
  const text = normalizeText(option?.text || option?.label || option || "");
  return {
    id,
    text,
    html: normalizeText(option?.html || text)
  };
}

function normalizeAnswer(value, optionsLength) {
  if (typeof value === "number") {
    return clampIndex(value, optionsLength);
  }

  const text = String(value || "").trim().toUpperCase();
  if (!text) {
    return 0;
  }

  const parsed = text.length === 1 ? text.charCodeAt(0) - 65 : Number(text) - 1;
  return clampIndex(parsed, optionsLength);
}

function clampIndex(index, optionsLength) {
  const safeIndex = Number.isFinite(index) ? index : 0;
  if (!Number.isFinite(optionsLength) || optionsLength <= 0) {
    return Math.max(0, safeIndex);
  }
  return Math.min(optionsLength - 1, Math.max(0, safeIndex));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function toHtml(value) {
  return normalizeText(value).replace(/\n/g, "<br/>");
}

function normalizeImageRef(value) {
  const imageValue = normalizeText(value);
  if (!imageValue) {
    return "";
  }
  return imageValue.replace(/\\/g, "/");
}

function normalizeImage(item, fallbackLabel) {
  const imageRef = normalizeImageRef(item.imageRef || item.image_ref || item.image?.url || "");
  if (!imageRef) {
    return null;
  }

  return {
    url: imageRef,
    key: imageRef,
    sourceType: imageRef.startsWith("http") ? "remote" : "local",
    alt: normalizeText(item.image?.alt || fallbackLabel || "Question image") || "Question image"
  };
}

main();