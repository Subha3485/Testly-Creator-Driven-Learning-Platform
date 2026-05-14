
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 8
    },
    questionRich: {
      type: [
        {
          text: { type: String, required: true },
          bold: { type: Boolean, default: false },
          italic: { type: Boolean, default: false },
          underline: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    questionHtml: {
      type: String,
      default: ""
    },
    options: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: "A question must have at least 2 options."
      }
    },
    optionsHtml: {
      type: [String],
      default: []
    },
    optionsRich: {
      type: [[
        {
          text: { type: String, required: true },
          bold: { type: Boolean, default: false },
          italic: { type: Boolean, default: false },
          underline: { type: Boolean, default: false }
        }
      ]],
      default: []
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
    explanationRich: {
      type: [
        {
          text: { type: String, required: true },
          bold: { type: Boolean, default: false },
          italic: { type: Boolean, default: false },
          underline: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    explanationHtml: {
      type: String,
      default: ""
    },
    imageRef: {
      type: String,
      default: ""
    },
    image: {
      url: { type: String, default: "" },
      key: { type: String, default: "" },
      sourceType: { type: String, default: "" },
      alt: { type: String, default: "" }
    },
    tables: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    sourcePages: {
      type: [Number],
      default: []
    },
    level: {
      type: String,
      default: ""
    },
    questionNumber: {
      type: Number,
      default: 0,
      min: 0
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
