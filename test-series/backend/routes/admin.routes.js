const express = require("express");
const mongoose = require("mongoose");
const Test = require("../models/Test");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Internal server error" });
  }
};

router.post(
  "/questions",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const question = await Question.create(payload);
    res.status(201).json(question);
  })
);

router.post(
  "/tests",
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const test = await Test.create(payload);
    res.status(201).json(test);
  })
);

router.post(
  "/tests/:testId/questions",
  asyncHandler(async (req, res) => {
    const { testId } = req.params;
    const { questionId, questionPayload } = req.body;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: "Invalid test id" });
    }

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    let question;
    if (questionId) {
      if (!mongoose.Types.ObjectId.isValid(questionId)) {
        return res.status(400).json({ message: "Invalid question id" });
      }
      question = await Question.findById(questionId);
    } else if (questionPayload) {
      question = await Question.create(questionPayload);
    }

    if (!question) {
      return res.status(400).json({ message: "Provide questionId or questionPayload" });
    }

    if (!test.questions.find((item) => item.toString() === question._id.toString())) {
      test.questions.push(question._id);
      await test.save();
    }

    res.json({ testId: test._id, questionId: question._id, question });
  })
);

router.patch(
  "/tests/:id/publish",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isPublished = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid test id" });
    }

    const test = await Test.findByIdAndUpdate(id, { isPublished }, { new: true });
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.json(test);
  })
);

router.get(
  "/tests",
  asyncHandler(async (req, res) => {
    const tests = await Test.find({})
      .sort({ createdAt: -1 })
      .select("title examTarget testType duration topics difficulty isPublished questions createdAt");

    const payload = tests.map((test) => ({
      _id: test._id,
      title: test.title,
      examTarget: test.examTarget,
      testType: test.testType,
      duration: test.duration,
      topics: test.topics,
      difficulty: test.difficulty,
      isPublished: test.isPublished,
      questionCount: test.questions.length,
      createdAt: test.createdAt
    }));

    res.json(payload);
  })
);

router.get(
  "/dashboard/overview",
  asyncHandler(async (_req, res) => {
    const [questions, tests, submissions] = await Promise.all([
      Question.countDocuments({}),
      Test.countDocuments({}),
      Submission.countDocuments({})
    ]);

    res.json({ questions, tests, submissions });
  })
);

router.post(
  "/create-test",
  asyncHandler(async (req, res) => {
    const test = await Test.create(req.body);
    res.status(201).json(test);
  })
);

router.post(
  "/add-question/:testId",
  asyncHandler(async (req, res) => {
    const { testId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ message: "Invalid test id" });
    }

    const question = await Question.create(req.body);
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    test.questions.push(question._id);
    await test.save();

    res.status(201).json(question);
  })
);

module.exports = router;
