import { useEffect, useMemo, useRef, useState } from "react";
import RichText from "../components/RichText";
import { api } from "../lib/api";

const EXAMS = ["SSC", "UPSC", "JEE", "GATE", "BANKING"];
const TEST_TYPES = ["FULL", "TOPIC", "DAILY", "ADAPTIVE"];
const HOME_STATS = [
  { label: "Tests attempted", value: "240+ Cr" },
  { label: "Active learners", value: "8.3+ Cr" },
  { label: "Live classes", value: "4.2K+" },
  { label: "Accuracy insights", value: "Real-time" }
];

const FEATURE_CARDS = [
  {
    title: "Smart exam discovery",
    description: "Find mock tests by exam, topic, or difficulty and jump into practice in one click."
  },
  {
    title: "Detailed score analysis",
    description: "Review correctness, speed, weak topics, and performance trends after every submission."
  },
  {
    title: "Real test experience",
    description: "Use timed mocks, question navigation, and section filters that mirror exam flow."
  },
  {
    title: "Banking practice hub",
    description: "Open Banking topic-wise practice sets from the structured Reasoning content you imported."
  }
];

const initialSearch = new URLSearchParams(window.location.search);

export default function TestPage() {
  const [userId, setUserId] = useState("demo-user");
  const [examTarget, setExamTarget] = useState(initialSearch.get("examTarget") || "SSC");
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(initialSearch.get("testId") || "");
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewedQuestions, setReviewedQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([]);
  const [activeSection, setActiveSection] = useState("All");
  const [testPhase, setTestPhase] = useState("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startEpoch, setStartEpoch] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const autoReattemptStartedRef = useRef(false);
  const shouldAutoStartReattempt = initialSearch.get("reattempt") === "1";

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examTarget]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    loadAnalytics(userId, examTarget);
  }, [userId, examTarget]);

  useEffect(() => {
    if (!testData || testPhase !== "running" || secondsLeft <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [testData, secondsLeft, testPhase]);

  useEffect(() => {
    if (!testData || testPhase !== "running") {
      return;
    }

    setVisitedQuestions((prev) => (prev.includes(currentQuestionIndex) ? prev : [...prev, currentQuestionIndex]));
  }, [testData, testPhase, currentQuestionIndex]);

  useEffect(() => {
    if (!shouldAutoStartReattempt || autoReattemptStartedRef.current || loading || testData || !selectedTestId) {
      return;
    }

    autoReattemptStartedRef.current = true;
    startTest(selectedTestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoStartReattempt, selectedTestId, loading, testData]);

  useEffect(() => {
    document.body.classList.toggle("test-mode", Boolean(testData && testPhase === "running"));

    return () => {
      document.body.classList.remove("test-mode");
    };
  }, [testData, testPhase]);

  const canSubmit = useMemo(() => testData && Object.keys(answers).length > 0, [answers, testData]);
  const featuredTests = useMemo(() => tests.slice(0, 6), [tests]);
  const selectedExamTests = useMemo(() => {
    if (examTarget === "BANKING") {
      return tests.slice(0, 8);
    }

    return tests.filter((test) => String(test.examTarget || "").toUpperCase() === examTarget).slice(0, 8);
  }, [tests, examTarget]);

  async function loadCatalog() {
    try {
      setError("");
      setLoading(true);
      const data = await api.getTests({ examTarget, limit: 40 });
      setTests(data);
      setSelectedTestId(initialSearch.get("testId") || data[0]?._id || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics(targetUserId, targetExam) {
    try {
      const [analyticsData, weakTopicsData] = await Promise.all([
        api.getUserAnalytics(targetUserId, { examTarget: targetExam }),
        api.getWeakTopics(targetUserId)
      ]);
      setAnalytics(analyticsData);
      setWeakTopics(weakTopicsData.weakTopics || []);
    } catch (_error) {
      setAnalytics(null);
      setWeakTopics([]);
    }
  }

  async function startTest(testId = selectedTestId) {
    if (!testId) {
      setError("Choose a test first");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const data = await api.getTestById(testId);
      setTestData(data);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setReviewedQuestions([]);
      setVisitedQuestions([]);
      setActiveSection("All");
      setTestPhase("instructions");
      setSecondsLeft(data.duration * 60);
      setStartEpoch(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(questionIndex, optionIndex) {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  }

  function clearAnswer(questionIndex) {
    setAnswers((prev) => {
      const nextAnswers = { ...prev };
      delete nextAnswers[questionIndex];
      return nextAnswers;
    });
  }

  function goPreviousQuestion() {
    setCurrentQuestionIndex((prev) => {
      const indexes = getSectionQuestionIndexes(testData?.questions || [], activeSection);
      const position = indexes.indexOf(prev);
      if (position <= 0) {
        return prev;
      }
      return indexes[position - 1];
    });
  }

  function goNextQuestion() {
    setCurrentQuestionIndex((prev) => {
      const indexes = getSectionQuestionIndexes(testData?.questions || [], activeSection);
      const position = indexes.indexOf(prev);
      if (position === -1 || position >= indexes.length - 1) {
        return prev;
      }
      return indexes[position + 1];
    });
  }

  function toggleReview(questionIndex) {
    setReviewedQuestions((prev) => {
      if (prev.includes(questionIndex)) {
        return prev.filter((item) => item !== questionIndex);
      }

      return [...prev, questionIndex];
    });
  }

  function markForReviewAndNext(questionIndex) {
    if (!reviewedQuestions.includes(questionIndex)) {
      setReviewedQuestions((prev) => [...prev, questionIndex]);
    }
    goNextQuestion();
  }

  function startAttemptNow() {
    setTestPhase("running");
    setStartEpoch(Date.now());
    setVisitedQuestions([0]);
  }

  function leaveTest() {
    setTestData(null);
    setTestPhase("idle");
    setSecondsLeft(0);
  }

  function openQuestion(questionIndex) {
    setCurrentQuestionIndex(questionIndex);
  }

  function openFeaturedTest(testId) {
    setSelectedTestId(testId);
    startTest(testId);
  }

  async function submitTest() {
    if (!testData) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const elapsedSeconds = startEpoch > 0
        ? Math.max(0, Math.round((Date.now() - startEpoch) / 1000))
        : Math.max(0, (testData?.duration || 0) * 60 - secondsLeft);
      const response = await api.submitTest({
        userId,
        testId: testData._id,
        answers,
        timeSpentSeconds: elapsedSeconds
      });

      window.location.assign(`/solution?submissionId=${response._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  if (testData) {
    const sectionTabs = buildSections(testData.questions || []);
    const sectionQuestionIndexes = getSectionQuestionIndexes(testData.questions || [], activeSection);
    const statusCounts = deriveRunnerStatusCounts(testData.questions || [], answers, visitedQuestions, reviewedQuestions);
    const currentQuestion = testData.questions[currentQuestionIndex] || null;
    const questionNumber = currentQuestionIndex + 1;

    if (testPhase === "instructions") {
      return (
        <div className="test-runner">
          <header className="test-runner__topbar">
            <div className="test-runner__brandBlock">
              <button className="test-runner__back" type="button" onClick={leaveTest}>
                Exit
              </button>
              <div className="test-runner__brandText">
                <strong>PrepNexus Practice</strong>
                <span>Read instructions before starting</span>
              </div>
            </div>

            <div className="test-runner__titleWrap">
              <div className="test-runner__eyebrow">View Instructions</div>
              <h1>{testData.title}</h1>
              <div className="test-runner__meta">
                <span>{testData.questions.length} Questions</span>
                <span>{testData.duration} Minutes</span>
                <span>{testData.testType}</span>
                <span>{examTarget}</span>
              </div>
            </div>

            <div className="test-runner__timerStack">
              <div className="test-runner__timerBox">
                <span>Time Left</span>
                <strong>{formatTime(secondsLeft)}</strong>
              </div>
            </div>
          </header>

          <section className="test-runner__instructions card">
            <h3>General Instructions</h3>
            <ul>
              <li>Click Start Test to begin the timer and open section-wise questions.</li>
              <li>Use Save & Next after selecting an option.</li>
              <li>Use Mark for Review & Next for questions to revisit later.</li>
              <li>Use Clear Response to remove the selected option for current question.</li>
              <li>Question palette states show visited, answered, and review markers.</li>
            </ul>

            <div className="test-runner__instructionFooter">
              <button className="secondary" type="button" onClick={leaveTest}>Back</button>
              <button className="primary" type="button" onClick={startAttemptNow}>Start Test</button>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="test-runner">
        <header className="test-runner__topbar">
          <div className="test-runner__brandBlock">
            <button className="test-runner__back" type="button" onClick={leaveTest}>
              Exit Test
            </button>
            <div className="test-runner__brandText">
              <strong>PrepNexus Practice</strong>
              <span>Online test window</span>
            </div>
          </div>

          <div className="test-runner__titleWrap">
            <div className="test-runner__eyebrow">Sectioned Test View</div>
            <h1>{testData.title}</h1>
            <div className="test-runner__meta">
              <span>{testData.questions.length} Questions</span>
              <span>{testData.duration} Minutes</span>
              <span>{testData.testType}</span>
              <span>{examTarget}</span>
            </div>
          </div>

          <div className="test-runner__timerStack">
            <button className="test-runner__linkBtn" type="button" onClick={() => setTestPhase("instructions")}>
              View Instructions
            </button>
            <div className="test-runner__timerBox">
              <span>Time Left</span>
              <strong>{formatTime(secondsLeft)}</strong>
            </div>
          </div>
        </header>

        <div className="test-runner__sectionTabs card">
          {sectionTabs.map((section) => (
            <button
              key={section}
              className={`test-runner__sectionBtn ${activeSection === section ? "active" : ""}`}
              type="button"
              onClick={() => {
                setActiveSection(section);
                const indexes = getSectionQuestionIndexes(testData.questions || [], section);
                if (indexes.length) {
                  setCurrentQuestionIndex(indexes[0]);
                }
              }}
            >
              {section}
            </button>
          ))}
        </div>

        <section className="test-runner__workspace">
          <main className="test-runner__main">
            <div className="test-runner__infoBar">
              <div className="test-runner__infoItem">
                <span>Question Type</span>
                <strong>MCQ</strong>
              </div>
              <div className="test-runner__infoItem">
                <span>Marks</span>
                <strong>+{currentQuestion?.marks ?? 1}</strong>
              </div>
              <div className="test-runner__infoItem">
                <span>Language</span>
                <strong>English</strong>
              </div>
              <div className="test-runner__questionCounter">
                Question {questionNumber} of {testData.questions.length}
              </div>
            </div>

            {currentQuestion ? (
              <article className="test-runner__question">
                <div className="test-runner__questionHeader">
                  <div className="test-runner__questionBadge">Q{questionNumber}</div>
                  <div className="test-runner__questionMeta">
                    <div className="test-runner__direction">Choose the correct answer from the options below.</div>
                    <div className="test-runner__chipGroup">
                      {(currentQuestion.topicTags || []).slice(0, 3).map((topic) => (
                        <span key={topic} className="test-runner__chip">{topic}</span>
                      ))}
                      {!currentQuestion.topicTags?.length ? <span className="test-runner__chip">General Aptitude</span> : null}
                    </div>
                  </div>
                </div>

                <div className="test-runner__stem">
                  <RichText
                    value={currentQuestion.question}
                    html={currentQuestion.questionHtml || currentQuestion.question_html}
                    segments={currentQuestion.questionRich}
                  />
                  {getQuestionImageUrl(currentQuestion) ? (
                    <div className="test-runner__questionImage">
                      <img src={getQuestionImageUrl(currentQuestion)} alt={currentQuestion?.image?.alt || "Question visual aid"} loading="lazy" />
                    </div>
                  ) : null}
                </div>

                <div className="test-runner__options">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const selected = answers[currentQuestionIndex] === optionIndex;
                    return (
                      <label key={`${currentQuestion._id}-${optionIndex}`} className={`test-runner__option ${selected ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name={`question-${currentQuestion._id}`}
                          checked={selected}
                          onChange={() => updateAnswer(currentQuestionIndex, optionIndex)}
                        />
                        <span className="test-runner__optionIndex">{String.fromCharCode(65 + optionIndex)}</span>
                        <span>
                          <RichText
                            value={option}
                            html={currentQuestion.optionsHtml?.[optionIndex] || currentQuestion.options_html?.[optionIndex]}
                            segments={currentQuestion.optionsRich?.[optionIndex]}
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="test-runner__actionRow">
                  <button className="secondary" type="button" onClick={() => markForReviewAndNext(currentQuestionIndex)}>
                    Mark for Review & Next
                  </button>
                  <button className="secondary" type="button" onClick={() => clearAnswer(currentQuestionIndex)}>
                    Clear Response
                  </button>
                  <button className="primary" type="button" onClick={goNextQuestion}>
                    Save & Next
                  </button>
                </div>
              </article>
            ) : null}
          </main>

          <aside className="test-runner__sidebar">
            <div className="test-runner__profileCard">
              <div className="test-runner__avatar">{userId.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{userId}</strong>
                <span>{activeSection}</span>
              </div>
            </div>

            <div className="test-runner__summary">
              <div className="test-runner__summaryItem"><span>Answered</span><strong>{statusCounts.answered}</strong></div>
              <div className="test-runner__summaryItem"><span>Not Answered</span><strong>{statusCounts.notAnswered}</strong></div>
              <div className="test-runner__summaryItem"><span>Not Visited</span><strong>{statusCounts.notVisited}</strong></div>
              <div className="test-runner__summaryItem"><span>Mark for review</span><strong>{statusCounts.reviewOnly}</strong></div>
              <div className="test-runner__summaryItem"><span>Ans. & Review</span><strong>{statusCounts.answeredReview}</strong></div>
            </div>

            <div className="test-runner__navigator">
              <div className="test-runner__navigatorHead">
                <strong>Question Palette</strong>
                <span>Choose a question</span>
              </div>
              <div className="test-runner__grid">
                {sectionQuestionIndexes.map((index) => {
                  const question = testData.questions[index];
                  const answered = answers[index] !== undefined;
                  const reviewed = reviewedQuestions.includes(index);
                  const visited = visitedQuestions.includes(index);
                  const statusClass = getPaletteStateClass({ answered, reviewed, visited });

                  return (
                    <button
                      key={question._id}
                      type="button"
                      className={`test-runner__gridItem ${currentQuestionIndex === index ? "active" : ""} ${statusClass}`}
                      onClick={() => openQuestion(index)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="primary test-runner__submit" type="button" onClick={submitTest} disabled={!canSubmit || loading}>
              Submit
            </button>
            {secondsLeft === 0 ? <span className="error">Time is over. Submit now.</span> : null}
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="home-page">
      <section className="hero card">
        <div className="hero__content">
          <div className="label">Complete exam prep platform</div>
          <h1>Learn, practice, improve, and succeed from one dashboard.</h1>
          <p>
            Browse popular exams, open topic-wise test series, and continue into a timed practice flow with
            analytics that highlight what to fix next.
          </p>

          <div className="hero__stats">
            {HOME_STATS.map((stat) => (
              <article key={stat.label} className="hero__stat card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>

          <div className="hero__chips">
            {EXAMS.map((exam) => (
              <button
                key={exam}
                type="button"
                className={`hero__chip ${examTarget === exam ? "active" : ""}`}
                onClick={() => setExamTarget(exam)}
              >
                {exam}
              </button>
            ))}
          </div>
        </div>

        <div className="hero__panel card">
          <div className="row spread">
            <div>
              <div className="label">Quick start</div>
              <h3>Pick your exam and open a mock</h3>
            </div>
            <span className="badge">Analytics ready</span>
          </div>

          {examTarget === "BANKING" ? (
            <p className="hero__note">
              Banking selected. Open the Banking hub for topic-wise practice sets and structured reasoning tests.
            </p>
          ) : null}

          <div className="grid hero__form">
            <label>
              Student ID
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value.trim())}
                placeholder="demo-user"
              />
            </label>

            <label>
              Target Exam
              <select value={examTarget} onChange={(e) => setExamTarget(e.target.value)}>
                {EXAMS.map((exam) => (
                  <option key={exam} value={exam}>
                    {exam}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Test Catalog
              <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}>
                {tests.length === 0 ? <option value="">No tests available</option> : null}
                {tests.map((test) => (
                  <option key={test._id} value={test._id}>
                    {test.title} ({test.testType})
                  </option>
                ))}
              </select>
            </label>

            <div className="row home-page__actions">
              <button className="secondary" type="button" onClick={loadCatalog} disabled={loading}>
                Refresh Catalog
              </button>
              {examTarget === "BANKING" ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => window.location.assign("/banking")}
                >
                  Open Banking Hub
                </button>
              ) : null}
              <button
                className="primary"
                type="button"
                onClick={() => startTest()}
                disabled={loading || !selectedTestId}
              >
                Start Test
              </button>
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </div>
      </section>

      <section className="section-block">
        <div className="row spread section-block__head">
          <div>
            <div className="label">Popular test series</div>
            <h2>High-traffic mocks and topic practice sets</h2>
          </div>
          <button
            className="secondary"
            type="button"
            onClick={() => window.location.assign(examTarget === "BANKING" ? "/banking/practice" : "/")}
          >
            Explore more
          </button>
        </div>

        <div className="series-grid">
          {(selectedExamTests.length > 0 ? selectedExamTests : featuredTests).map((test) => (
            <article key={test._id} className="series-card card">
              <div className="series-card__top">
                <span className="badge">{test.testType || "MOCK"}</span>
                <span className="series-card__meta">{test.duration} min</span>
              </div>
              <h3>{test.title}</h3>
              <p>{test.description || "Timed practice with question review and performance analysis."}</p>
              <div className="series-card__footer">
                <span>{test.questions?.length || 0} questions</span>
                <button className="primary" type="button" onClick={() => openFeaturedTest(test._id)}>
                  Start now
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="row spread section-block__head">
          <div>
            <div className="label">Why this layout works</div>
            <h2>Fast discovery, fast practice, better review</h2>
          </div>
          <span className="badge">Built for exam prep</span>
        </div>

        <div className="features-grid">
          {FEATURE_CARDS.map((feature) => (
            <article key={feature.title} className="feature-card card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid cards">
        <article className="card">
          <div className="label">Attempts</div>
          <div className="kpi">{analytics?.attempts ?? 0}</div>
          <p>Recent mock tests by this student.</p>
        </article>

        <article className="card">
          <div className="label">Average Accuracy</div>
          <div className="kpi">{analytics?.avgAccuracy ?? 0}%</div>
          <p>Correct answers out of attempted questions.</p>
        </article>

        <article className="card">
          <div className="label">Average Score</div>
          <div className="kpi">{analytics?.avgScore ?? 0}</div>
          <p>Performance trend for selected exam.</p>
        </article>
      </section>

      {weakTopics.length > 0 ? (
        <section className="card">
          <div className="label">Weak Topic Detection</div>
          <div className="row">
            {weakTopics.slice(0, 6).map((topic) => (
              <span key={topic.topic} className="badge">
                {topic.topic}: {topic.incorrectRate}%
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="label">Upcoming AI Layer Hook</div>
        <p>
          Use <strong>/api/test/catalog/questions/similar/:questionId</strong> to show similar questions and future
          adaptive recommendations.
        </p>
        <div className="row">
          {TEST_TYPES.map((item) => (
            <span key={item} className="badge">
              {item}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function resolveQuestionSection(question, index) {
  if (question.section) {
    return String(question.section);
  }

  const fromTags = Array.isArray(question.topicTags) ? question.topicTags[0] : "";
  if (fromTags) {
    return String(fromTags);
  }

  const fallback = ["English", "Reasoning", "Quant"]; 
  return fallback[index % fallback.length];
}

function buildSections(questions = []) {
  const sections = Array.from(
    new Set(questions.map((question, index) => resolveQuestionSection(question, index)).filter(Boolean))
  );
  return ["All", ...sections];
}

function getSectionQuestionIndexes(questions = [], section = "All") {
  if (section === "All") {
    return questions.map((_, index) => index);
  }

  return questions
    .map((question, index) => ({ sectionName: resolveQuestionSection(question, index), index }))
    .filter((item) => item.sectionName === section)
    .map((item) => item.index);
}

function getPaletteStateClass({ answered, reviewed, visited }) {
  if (answered && reviewed) {
    return "answered-review";
  }
  if (answered) {
    return "answered";
  }
  if (reviewed) {
    return "reviewed";
  }
  if (!visited) {
    return "not-visited";
  }
  return "unanswered";
}

function deriveRunnerStatusCounts(questions = [], answers = {}, visitedQuestions = [], reviewedQuestions = []) {
  return questions.reduce(
    (acc, _question, index) => {
      const answered = answers[index] !== undefined;
      const reviewed = reviewedQuestions.includes(index);
      const visited = visitedQuestions.includes(index);

      if (answered && reviewed) {
        acc.answeredReview += 1;
      } else if (answered) {
        acc.answered += 1;
      } else if (reviewed) {
        acc.reviewOnly += 1;
      } else if (visited) {
        acc.notAnswered += 1;
      } else {
        acc.notVisited += 1;
      }

      return acc;
    },
    {
      answered: 0,
      notAnswered: 0,
      notVisited: 0,
      reviewOnly: 0,
      answeredReview: 0
    }
  );
}

function getQuestionImageUrl(question) {
  const raw = question?.image?.url || question?.imageUrl || question?.image_url || question?.imageRef || question?.image_ref || "";
  if (!raw) {
    return "";
  }
  const normalized = String(raw).replace(/\\/g, "/");
  if (normalized.startsWith("output/images/")) {
    return `/${normalized.replace(/^output\/images\//, "question-images/")}`;
  }
  if (normalized.startsWith("images/")) {
    return `/${normalized.replace(/^images\//, "question-images/")}`;
  }
  if (normalized.startsWith("/")) {
    return normalized;
  }
  return normalized;
}
