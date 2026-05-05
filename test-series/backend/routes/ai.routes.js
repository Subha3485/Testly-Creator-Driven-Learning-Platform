const express = require("express");
const Question = require("../models/Question");
const Test = require("../models/Test");
const Submission = require("../models/Submission");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Internal server error" });
  }
};

function pickRandom(items, count) {
  const copy = [...items];
  const picked = [];
  while (copy.length > 0 && picked.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    picked.push(copy[index]);
    copy.splice(index, 1);
  }
  return picked;
}

router.post(
  "/generate-question",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { baseQuestionId } = req.body;

    const base = await Question.findById(baseQuestionId);
    if (!base) {
      return res.status(404).json({ message: "Base question not found" });
    }

    const generated = {
      question: `${base.question} (AI Practice Variant)`,
      options: base.options,
      correctAnswer: base.correctAnswer,
      marks: base.marks,
      negativeMarks: base.negativeMarks,
      source: "AI",
      examTarget: base.examTarget,
      year: new Date().getFullYear(),
      topicTags: base.topicTags,
      difficulty: base.difficulty,
      explanation: {
        text: `AI variant generated from a ${base.source} question. Focus on concept: ${(base.topicTags || []).join(", ")}.`
      },
      isVerified: false,
      createdBy: req.user?.sub || "ai-system"
    };

    const question = await Question.create(generated);
    res.status(201).json(question);
  })
);

router.post(
  "/adaptive-test",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { userId, examTarget = "SSC", questionCount = 10 } = req.body;

    const submissions = await Submission.find({ userId: userId || req.user?.sub })
      .sort({ createdAt: -1 })
      .limit(30);

    const weakTopicFrequency = {};
    submissions.forEach((submission) => {
      (submission.weakTopics || []).forEach((topic) => {
        weakTopicFrequency[topic] = (weakTopicFrequency[topic] || 0) + 1;
      });
    });

    const weakTopics = Object.entries(weakTopicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    const baseFilter = { examTarget, isVerified: true };
    const focusFilter = weakTopics.length > 0 ? { ...baseFilter, topicTags: { $in: weakTopics } } : baseFilter;

    const [focusedQuestions, backupQuestions] = await Promise.all([
      Question.find(focusFilter).limit(50),
      Question.find(baseFilter).limit(100)
    ]);

    const selected = pickRandom(
      focusedQuestions.length >= questionCount ? focusedQuestions : [...focusedQuestions, ...backupQuestions],
      Number(questionCount)
    );

    const test = await Test.create({
      title: `Adaptive ${examTarget} Practice`,
      description: `Generated from weak topic analysis${weakTopics.length ? `: ${weakTopics.join(", ")}` : ""}`,
      examTarget,
      testType: "ADAPTIVE",
      duration: Math.max(15, Math.ceil(selected.length * 1.5)),
      difficulty: "MIXED",
      topics: weakTopics,
      questions: selected.map((q) => q._id),
      isPublished: true,
      createdBy: "ai-system"
    });

    res.status(201).json({
      testId: test._id,
      weakTopics,
      questionCount: selected.length
    });
  })
);

module.exports = router;
