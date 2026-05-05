import { useEffect, useState } from "react";
import { api } from "../lib/api";

const testTemplate = {
  title: "",
  description: "",
  examTarget: "SSC",
  testType: "TOPIC",
  duration: 30,
  difficulty: "MIXED",
  topics: "quant,reasoning"
};

const questionTemplate = {
  question: "",
  options: "",
  correctAnswer: 0,
  marks: 1,
  negativeMarks: 0,
  source: "PYQ",
  examTarget: "SSC",
  year: new Date().getFullYear(),
  topicTags: "quant",
  difficulty: "MEDIUM",
  explanationText: ""
};

export default function AdminDashboard() {
  const [authForm, setAuthForm] = useState({ email: "admin@prepnexus.dev", password: "Admin@123" });
  const [currentUser, setCurrentUser] = useState(null);
  const [overview, setOverview] = useState({ questions: 0, tests: 0, submissions: 0 });
  const [tests, setTests] = useState([]);
  const [testForm, setTestForm] = useState(testTemplate);
  const [questionForm, setQuestionForm] = useState(questionTemplate);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const profile = await api.me();
      setCurrentUser(profile);
      await refreshAdminData();
    } catch (_error) {
      setCurrentUser(null);
    }
  }

  async function refreshAdminData() {
    try {
      setLoading(true);
      setError("");
      const [overviewData, testsData] = await Promise.all([api.getAdminOverview(), api.getAdminTests()]);
      setOverview(overviewData);
      setTests(testsData);
      setSelectedTestId(testsData[0]?._id || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTest(event) {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const payload = {
        ...testForm,
        topics: testForm.topics
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        duration: Number(testForm.duration)
      };
      await api.createTest(payload);
      setSuccess("Test created successfully.");
      setTestForm(testTemplate);
      await refreshAdminData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddQuestion(event) {
    event.preventDefault();
    if (!selectedTestId) {
      setError("Select a test to add question");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const questionPayload = {
        question: questionForm.question,
        options: questionForm.options
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        correctAnswer: Number(questionForm.correctAnswer),
        marks: Number(questionForm.marks),
        negativeMarks: Number(questionForm.negativeMarks),
        source: questionForm.source,
        examTarget: questionForm.examTarget,
        year: Number(questionForm.year),
        topicTags: questionForm.topicTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        difficulty: questionForm.difficulty,
        explanation: {
          text: questionForm.explanationText
        },
        isVerified: true,
        createdBy: "admin"
      };

      await api.addQuestionToTest(selectedTestId, { questionPayload });
      setSuccess("Question added to selected test.");
      setQuestionForm(questionTemplate);
      await refreshAdminData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePublishToggle(testId, isPublished) {
    try {
      await api.publishTest(testId, !isPublished);
      await refreshAdminData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await api.login(authForm);
      api.setAuthToken(response.token);
      const profile = await api.me();
      setCurrentUser(profile);
      setSuccess(`Logged in as ${profile.email}`);
      await refreshAdminData();
    } catch (err) {
      setError(err.message);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    api.setAuthToken("");
    setCurrentUser(null);
    setTests([]);
    setOverview({ questions: 0, tests: 0, submissions: 0 });
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <section className="card" style={{ maxWidth: 460 }}>
        <div className="label">Admin Access</div>
        <h3>Login required</h3>
        <p>Use seeded admin credentials to access admin controls.</p>

        <form className="grid" onSubmit={handleLogin}>
          <label>
            Email
            <input
              value={authForm.email}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </label>

          <button className="primary" type="submit" disabled={loading}>
            Login as Admin
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  return (
    <div className="grid">
      <section className="card">
        <div className="row spread">
          <div>
            <div className="label">Signed in</div>
            <h3>{currentUser.name}</h3>
            <p>{currentUser.email}</p>
          </div>
          <button className="secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="grid cards">
        <article className="card">
          <div className="label">Total Questions</div>
          <div className="kpi">{overview.questions}</div>
        </article>
        <article className="card">
          <div className="label">Total Tests</div>
          <div className="kpi">{overview.tests}</div>
        </article>
        <article className="card">
          <div className="label">Submissions</div>
          <div className="kpi">{overview.submissions}</div>
        </article>
      </section>

      <section className="grid cards">
        <form className="card" onSubmit={handleCreateTest}>
          <div className="label">Create Test</div>
          <h3>Mock test setup</h3>
          <div className="grid">
            <label>
              Title
              <input
                required
                value={testForm.title}
                onChange={(e) => setTestForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </label>
            <label>
              Description
              <textarea
                value={testForm.description}
                onChange={(e) => setTestForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              Exam Target
              <select
                value={testForm.examTarget}
                onChange={(e) => setTestForm((prev) => ({ ...prev, examTarget: e.target.value }))}
              >
                <option>SSC</option>
                <option>UPSC</option>
                <option>JEE</option>
                <option>GATE</option>
              </select>
            </label>
            <label>
              Test Type
              <select
                value={testForm.testType}
                onChange={(e) => setTestForm((prev) => ({ ...prev, testType: e.target.value }))}
              >
                <option>FULL</option>
                <option>TOPIC</option>
                <option>DAILY</option>
                <option>ADAPTIVE</option>
              </select>
            </label>
            <label>
              Duration (minutes)
              <input
                type="number"
                min="1"
                value={testForm.duration}
                onChange={(e) => setTestForm((prev) => ({ ...prev, duration: e.target.value }))}
              />
            </label>
            <label>
              Topics (comma separated)
              <input
                value={testForm.topics}
                onChange={(e) => setTestForm((prev) => ({ ...prev, topics: e.target.value }))}
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              Create Test
            </button>
          </div>
        </form>

        <form className="card" onSubmit={handleAddQuestion}>
          <div className="label">Add Question</div>
          <h3>Attach to selected test</h3>
          <div className="grid">
            <label>
              Select Test
              <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
                {tests.length === 0 ? <option value="">No tests found</option> : null}
                {tests.map((test) => (
                  <option key={test._id} value={test._id}>
                    {test.title} ({test.examTarget})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Question
              <textarea
                required
                value={questionForm.question}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, question: e.target.value }))}
              />
            </label>
            <label>
              Options (one per line)
              <textarea
                required
                value={questionForm.options}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, options: e.target.value }))}
                placeholder={"Option A\nOption B\nOption C\nOption D"}
              />
            </label>
            <label>
              Correct Option Index (0-based)
              <input
                type="number"
                min="0"
                value={questionForm.correctAnswer}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, correctAnswer: e.target.value }))}
              />
            </label>
            <label>
              Topic Tags (comma separated)
              <input
                value={questionForm.topicTags}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, topicTags: e.target.value }))}
              />
            </label>
            <label>
              Explanation
              <textarea
                value={questionForm.explanationText}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, explanationText: e.target.value }))}
              />
            </label>
            <button className="primary" type="submit" disabled={loading}>
              Add Question
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="card">
        <div className="row spread">
          <div>
            <div className="label">Tests</div>
            <h3>Publish workflow</h3>
          </div>
          <button className="secondary" type="button" onClick={refreshAdminData}>
            Refresh
          </button>
        </div>

        <div className="grid cards">
          {tests.map((test) => (
            <article className="card" key={test._id}>
              <div className="row spread">
                <h3>{test.title}</h3>
                <span className="badge">{test.isPublished ? "Published" : "Draft"}</span>
              </div>
              <p>
                {test.examTarget} | {test.testType} | {test.duration}m | {test.questionCount} questions
              </p>
              <button
                className={test.isPublished ? "secondary" : "primary"}
                type="button"
                onClick={() => handlePublishToggle(test._id, test.isPublished)}
              >
                {test.isPublished ? "Unpublish" : "Publish"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
