import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import AnalysisQuestionCard from "../components/AnalysisQuestionCard";
import AnalysisQuestionNavigator from "../components/AnalysisQuestionNavigator";
import AnalysisSummary from "../components/AnalysisSummary";
import "../styles/solution-analysis.css";

export default function SolutionPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const questionRefs = useRef([]);

  const submissionId = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("submissionId") || "";
  }, []);

  useEffect(() => {
    async function loadSolution() {
      if (!submissionId) {
        setError("Missing submission id in URL");
        setLoading(false);
        return;
      }

      try {
        const response = await api.getSolution(submissionId);
        setData(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSolution();
  }, [submissionId]);

  useEffect(() => {
    async function loadAnalytics() {
      if (!data?.submission?.userId || !data?.submission?.examTarget) {
        return;
      }

      try {
        const response = await api.getUserAnalytics(data.submission.userId, { examTarget: data.submission.examTarget });
        setAnalytics(response);
      } catch (_err) {
        setAnalytics(null);
      }
    }

    loadAnalytics();
  }, [data]);

  const { submission, test, questions } = data || {};
  const normalizedQuestions = useMemo(
    () => normalizeQuestions(questions || [], submission || {}, test || {}),
    [questions, submission, test]
  );
  const stats = useMemo(() => deriveStats(submission || {}, normalizedQuestions), [submission, normalizedQuestions]);
  const sectionRows = useMemo(() => buildSectionRows(normalizedQuestions, stats), [normalizedQuestions, stats]);
  const comparisonRows = useMemo(() => buildComparisonRows(analytics?.recentSubmissions || [], submission), [analytics, submission]);

  if (loading) {
    return <p>Loading solution...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!data) {
    return <p className="error">No solution data found.</p>;
  }

  function handleSelect(index) {
    setActiveIndex(index);
    questionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="solution-analysis">
      <AnalysisSummary submission={submission} test={test} stats={stats} />

      <section className="analysis-panel card">
        <div className="analysis-panel__header">
          <div>
            <div className="label">Result Summary</div>
            <h3>Detailed Analysis</h3>
          </div>
          <button className="secondary" type="button" onClick={() => window.location.assign("/")}>Back to Student Home</button>
        </div>

        <div className="analysis-panel__grid">
          {normalizedQuestions.map((question, index) => (
            <div
              key={question._id || index}
              ref={(node) => {
                questionRefs.current[index] = node;
              }}
            >
              <AnalysisQuestionCard
                question={question}
                index={index}
                selectedAnswer={getSelectedAnswer(submission, index)}
                onSelect={() => handleSelect(index)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="analysis-panel card">
        <div className="analysis-panel__header">
          <div>
            <div className="label">Progress</div>
            <h3>Section Wise Performance</h3>
          </div>
          <button className="analysis-link" type="button">View Detailed Analysis</button>
        </div>

        <div className="analysis-table">
          <div className="analysis-table__head">
            <span>Section</span>
            <span>Score</span>
            <span>Correct</span>
            <span>Incorrect</span>
            <span>Skipped</span>
            <span>Accuracy</span>
            <span>Time Taken</span>
          </div>

          {sectionRows.map((row) => (
            <div className="analysis-table__row" key={row.section}>
              <span className="analysis-table__section">{row.section}</span>
              <span>{row.score}</span>
              <span>{row.correct}</span>
              <span>{row.incorrect}</span>
              <span>{row.skipped}</span>
              <span>{row.accuracy}%</span>
              <span>{formatDuration(row.timeSpentSeconds)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="analysis-panel card">
        <div className="analysis-panel__header">
          <div>
            <div className="label">Comparison</div>
            <h3>Attempt Wise Comparison</h3>
          </div>
        </div>

        <div className="attempt-chart">
          {comparisonRows.map((row, index) => (
            <div className="attempt-chart__item" key={`${row.label}-${index}`}>
              <div className="attempt-chart__barWrap">
                <div className="attempt-chart__bar" style={{ height: `${Math.max(18, row.scorePct)}%` }}>
                  <span>{row.score}</span>
                </div>
              </div>
              <div className="attempt-chart__label">{row.label}</div>
            </div>
          ))}
        </div>
      </section>

      <AnalysisQuestionNavigator
        questions={normalizedQuestions}
        activeIndex={activeIndex}
        onSelect={handleSelect}
        summary={stats.navigatorCounts}
      />
    </div>
  );
}

function normalizeQuestions(questions = [], submission = {}, test = {}) {
  const attempts = extractAttemptMap(submission);

  return questions.map((question, index) => {
    const selectedAnswer = getSelectedAnswer(submission, index);
    const attempt = attempts.get(String(question._id)) || attempts.get(String(index)) || {};
    const correctAnswer = question.correctAnswer ?? question.answerIndex ?? null;
    const status = deriveStatus(selectedAnswer, correctAnswer, attempt.status);

    return {
      ...question,
      selectedAnswer,
      correctAnswer,
      timeSpentSeconds: attempt.timeSpentSeconds ?? attempt.timeSpent ?? question.timeSpentSeconds ?? 0,
      visitedCount: attempt.visitedCount ?? question.visitedCount ?? 0,
      status,
      section: question.section || question.sectionName || test?.title || "All"
    };
  });
}

function deriveStats(submission = {}, questions = []) {
  const counts = questions.reduce(
    (acc, question) => {
      acc.all += 1;
      if (question.status === "correct") acc.correct += 1;
      else if (question.status === "incorrect") acc.incorrect += 1;
      else acc.skipped += 1;
      return acc;
    },
    { all: 0, correct: 0, incorrect: 0, skipped: 0, review: 0 }
  );

  const timeTakenSeconds = submission.timeSpentSeconds ?? submission.totalTime ?? questions.reduce((sum, question) => sum + Number(question.timeSpentSeconds || 0), 0);
  const totalAttempted = counts.correct + counts.incorrect;
  const accuracyPct = submission.accuracyPct ?? (totalAttempted > 0 ? Math.round((counts.correct / totalAttempted) * 100) : 0);

  return {
    correct: counts.correct,
    incorrect: counts.incorrect,
    skipped: counts.skipped,
    accuracyPct,
    timeTakenSeconds,
    navigatorCounts: counts
  };
}

function buildSectionRows(questions = [], stats = {}) {
  const grouped = new Map();

  questions.forEach((question) => {
    const section = question.section || question.topicTags?.[0] || "All";
    if (!grouped.has(section)) {
      grouped.set(section, {
        section,
        score: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        timeSpentSeconds: 0,
        totalQuestions: 0
      });
    }

    const entry = grouped.get(section);
    entry.totalQuestions += 1;
    entry.timeSpentSeconds += Number(question.timeSpentSeconds || 0);

    if (question.status === "correct") {
      entry.correct += 1;
      entry.score += Number(question.marks || 0);
    } else if (question.status === "incorrect") {
      entry.incorrect += 1;
    } else {
      entry.skipped += 1;
    }
  });

  return Array.from(grouped.values()).map((entry) => ({
    ...entry,
    accuracy: entry.correct + entry.incorrect > 0 ? Math.round((entry.correct / (entry.correct + entry.incorrect)) * 100) : 0
  }));
}

function buildComparisonRows(recentSubmissions = [], currentSubmission = {}) {
  const rows = recentSubmissions.slice(0, 4).reverse().map((item, index) => ({
    label: `Attempt ${index + 1}`,
    score: Number(item.score || 0),
    scorePct: Number(item.totalMarks ? (item.score / item.totalMarks) * 100 : item.accuracyPct || 0)
  }));

  rows.push({
    label: "Current",
    score: Number(currentSubmission?.score || 0),
    scorePct: Number(currentSubmission?.totalMarks ? (currentSubmission.score / currentSubmission.totalMarks) * 100 : currentSubmission?.accuracyPct || 0)
  });

  return rows;
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function extractAttemptMap(submission = {}) {
  const map = new Map();
  const possibleCollections = [submission.questionAttempts, submission.questionBreakdown, submission.attemptsByQuestion];

  possibleCollections.filter(Array.isArray).forEach((entries) => {
    entries.forEach((entry, index) => {
      const key = entry.questionId || entry._id || String(index);
      map.set(String(key), entry);
    });
  });

  return map;
}

function getSelectedAnswer(submission = {}, index) {
  const answers = Array.isArray(submission.answers) ? submission.answers : [];
  const value = answers[index];
  return value === undefined || value === null ? undefined : Number(value);
}

function deriveStatus(selectedAnswer, correctAnswer, fallbackStatus) {
  if (fallbackStatus) {
    return fallbackStatus;
  }
  if (selectedAnswer === undefined) {
    return "skipped";
  }
  if (correctAnswer === null || correctAnswer === undefined) {
    return "review";
  }
  return Number(selectedAnswer) === Number(correctAnswer) ? "correct" : "incorrect";
}
