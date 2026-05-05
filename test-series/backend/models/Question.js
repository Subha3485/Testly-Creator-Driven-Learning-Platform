
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 8
    },
    options: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: "A question must have at least 2 options."
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
    },
    marks: {
      type: Number,
      default: 1,
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    source: {
      type: String,
      enum: ["PYQ", "AI", "USER"],
      default: "PYQ"
    },
    examTarget: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      min: 1990,
      max: 2100
    },
    topicTags: {
      type: [String],
      default: []
    },
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      default: "MEDIUM"
    },
    explanation: {
      text: {
        type: String,
        default: ""
      },
      videoUrl: {
        type: String,
        default: ""
      }
    },
    qualityScore: {
      type: Number,
      default: 0,
      min: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      default: "system"
    }
  },
  { timestamps: true }
);

questionSchema.index({ examTarget: 1, difficulty: 1, source: 1 });
questionSchema.index({ topicTags: 1 });

questionSchema.pre("validate", function preValidate(next) {
  if (this.correctAnswer >= this.options.length) {
    return next(new Error("correctAnswer index must be within options length."));
  }
  return next();
});

module.exports = mongoose.model("Question", questionSchema);
