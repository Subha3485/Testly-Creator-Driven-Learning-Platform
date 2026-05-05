
const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    examTarget: {
      type: String,
      required: true,
      trim: true
    },
    testType: {
      type: String,
      enum: ["FULL", "TOPIC", "DAILY", "ADAPTIVE"],
      default: "TOPIC"
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    difficulty: {
      type: String,
      enum: ["MIXED", "EASY", "MEDIUM", "HARD"],
      default: "MIXED"
    },
    topics: {
      type: [String],
      default: []
    },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    isPublished: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: String,
      default: "admin"
    },
    scheduledFor: {
      type: Date
    }
  },
  { timestamps: true }
);

testSchema.index({ examTarget: 1, testType: 1, isPublished: 1 });

module.exports = mongoose.model("Test", testSchema);
