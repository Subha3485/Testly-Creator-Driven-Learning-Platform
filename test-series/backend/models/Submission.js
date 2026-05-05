
const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true
    },
    examTarget: {
      type: String,
      required: true
    },
    testType: {
      type: String,
      enum: ["FULL", "TOPIC", "DAILY", "ADAPTIVE"],
      required: true
    },
    answers: {
      type: Object,
      default: {}
    },
    score: {
      type: Number,
      required: true
    },
    totalMarks: {
      type: Number,
      required: true
    },
    accuracyPct: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0
    },
    weakTopics: {
      type: [String],
      default: []
    },
    questionBreakdown: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true
        },
        selectedAnswer: Number,
        correctAnswer: Number,
        isCorrect: Boolean,
        topicTags: {
          type: [String],
          default: []
        }
      }
    ]
  },
  { timestamps: true }
);

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ examTarget: 1, testType: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
