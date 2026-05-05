require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Test = require("../models/Test");
const Question = require("../models/Question");
const User = require("../models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/testseries";

const sscQuestions = [
  {
    question: "What is the value of 25% of 360?",
    options: ["60", "75", "90", "120"],
    correctAnswer: 2,
    marks: 2,
    negativeMarks: 0.5,
    source: "PYQ",
    examTarget: "SSC",
    year: 2023,
    topicTags: ["percentage", "arithmetic"],
    difficulty: "EASY",
    explanation: { text: "25% of 360 = 360 * 25 / 100 = 90." },
    isVerified: true,
    createdBy: "seed-script"
  },
  {
    question: "If SPEED = 25 km/h and TIME = 2.4 hours, distance is:",
    options: ["48 km", "50 km", "60 km", "75 km"],
    correctAnswer: 2,
    marks: 2,
    negativeMarks: 0.5,
    source: "PYQ",
    examTarget: "SSC",
    year: 2022,
    topicTags: ["time-distance", "arithmetic"],
    difficulty: "MEDIUM",
    explanation: { text: "Distance = Speed * Time = 25 * 2.4 = 60 km." },
    isVerified: true,
    createdBy: "seed-script"
  },
  {
    question: "Choose the correct synonym of 'ABUNDANT'.",
    options: ["Scarce", "Plentiful", "Rigid", "Distant"],
    correctAnswer: 1,
    marks: 2,
    negativeMarks: 0.5,
    source: "PYQ",
    examTarget: "SSC",
    year: 2021,
    topicTags: ["english", "vocabulary"],
    difficulty: "EASY",
    explanation: { text: "Abundant means available in large quantities, i.e., plentiful." },
    isVerified: true,
    createdBy: "seed-script"
  },
  {
    question: "Find the next term: 3, 6, 12, 24, ?",
    options: ["30", "36", "42", "48"],
    correctAnswer: 3,
    marks: 2,
    negativeMarks: 0.5,
    source: "PYQ",
    examTarget: "SSC",
    year: 2020,
    topicTags: ["reasoning", "series"],
    difficulty: "EASY",
    explanation: { text: "Each term is doubled. So next is 48." },
    isVerified: true,
    createdBy: "seed-script"
  }
];

async function run() {
  await mongoose.connect(MONGO_URI);

  const adminEmail = "admin@prepnexus.dev";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    await User.create({
      name: "Platform Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      examTarget: "SSC"
    });
  }

  await Question.deleteMany({ createdBy: "seed-script", examTarget: "SSC" });
  const insertedQuestions = await Question.insertMany(sscQuestions);

  await Test.deleteMany({ createdBy: "seed-script", examTarget: "SSC" });
  await Test.create({
    title: "SSC Starter Mock 1",
    description: "Seeded mock to bootstrap SSC onboarding",
    examTarget: "SSC",
    testType: "FULL",
    duration: 20,
    difficulty: "MIXED",
    topics: ["arithmetic", "reasoning", "english"],
    questions: insertedQuestions.map((q) => q._id),
    isPublished: true,
    createdBy: "seed-script"
  });

  console.log("SSC seed complete.");
  console.log("Admin login email: admin@prepnexus.dev");
  console.log("Admin login password: Admin@123");

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
