import { useEffect, useMemo, useRef, useState } from "react";
import RichText from "../components/RichText";
import { api } from "../lib/api";
import "../styles/banking-practice-runner.css";

const PALETTE_FILTERS = [
  { key: "all", label: "All Questions" },
  { key: "answered", label: "Answered" },
  { key: "notAnswered", label: "Not Answered" },
  { key: "marked", label: "Marked" },
  { key: "notVisited", label: "Not Visited" }
];

export default function BankingPracticeRunner() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isTestPage = window.location.pathname.startsWith("/banking/practice/run/test");
  const runnerMode = params.get("mode") === "full" ? "full" : "practice";
  const isPracticeMode = runnerMode === "practice";
  const topic = params.get("topic") || "Inequality";
  const requestedTestId = params.get("testId") || "";
  const requestedSetId = params.get("setId") || "";

  const [tests, setTests] = useState([]);
  const [activeTopic, setActiveTopic] = useState(topic);
  const [activeSetId, setActiveSetId] = useState("");
  const [activeTest, setActiveTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [currentQuestionTimeSeconds, setCurrentQuestionTimeSeconds] = useState(0);
  const [questionTimeByIndex, setQuestionTimeByIndex] = useState({});
  const [questionTimerPaused, setQuestionTimerPaused] = useState(false);
  const [answers, setAnswers] = useState({});
  const [questionMeta, setQuestionMeta] = useState({});
  const [paletteFilter, setPaletteFilter] = useState("all");
  const [sessionResult, setSessionResult] = useState(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    loadCatalogAndTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, requestedTestId, requestedSetId, isTestPage]);

  useEffect(() => {
    if (!tests.length) {
      return;
    }

    const filtered = activeTopic && activeTopic !== "All Topics"
      ? tests.filter((item) => normalizeText(item.topic).includes(normalizeText(activeTopic)))
      : tests;

    if (!filtered.length) {
      return;
    }

    if (!filtered.some((item) => item.id === activeSetId)) {
      setActiveSetId(filtered[0].id);
    }
  }, [tests, activeTopic, activeSetId]);

  useEffect(() => {
    if (!isTestPage || !activeSetId) {
      return;
    }
    loadActiveSetQuestions(activeSetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSetId, isTestPage]);

  useEffect(() => {
    if (!attemptStarted || (isPracticeMode && questionTimerPaused)) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      if (runnerMode === "full") {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            window.clearInterval(timerId);
            return 0;
          }
          return prev - 1;
        });
      }

      setCurrentQuestionTimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [attemptStarted, runnerMode, isPracticeMode, questionTimerPaused]);

  useEffect(() => {
    if (runnerMode !== "full" || !attemptStarted || timeLeftSeconds > 0 || finishingRef.current) {
      return;
    }

    finishingRef.current = true;
    completeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptStarted, runnerMode, timeLeftSeconds]);

  useEffect(() => {
    if (!activeTest?.questions?.length) {
      return;
    }

    setQuestionMeta((prev) => markVisited(prev, currentIndex));
  }, [currentIndex, activeTest]);

  const topicList = useMemo(() => {
    const topics = Array.from(new Set(tests.map((item) => item.topic).filter(Boolean)));
    return ["All Topics", ...topics];
  }, [tests]);

  const visibleSets = useMemo(() => {
    if (activeTopic === "All Topics") {
      return tests;
    }
    return tests.filter((item) => normalizeText(item.topic).includes(normalizeText(activeTopic)));
  }, [tests, activeTopic]);

  const questions = activeTest?.questions || [];
  const currentQuestion = questions[currentIndex] || null;
  const currentSelectedAnswer = answers[currentIndex];
  const currentCorrectAnswer = currentQuestion?.correctAnswer ?? null;
  const currentAnswerIsSelected = currentSelectedAnswer !== undefined && currentSelectedAnswer !== null;
  const currentAnswerIsCorrect = currentAnswerIsSelected && currentCorrectAnswer !== null && Number(currentSelectedAnswer) === Number(currentCorrectAnswer);
  const currentExplanation = extractExplanation(currentQuestion);
  const currentQuestionHtml = getQuestionHtml(currentQuestion);
  const currentExplanationHtml = getQuestionExplanationHtml(currentQuestion);
  const currentQuestionImageUrl = resolveQuestionImageUrl(currentQuestion);
  const paletteCounts = useMemo(() => derivePaletteCounts(questions, answers, questionMeta), [questions, answers, questionMeta]);
  const filteredIndexes = useMemo(
    () => questions.reduce((acc, question, index) => {
      const status = deriveQuestionState(index, answers, questionMeta);
      if (paletteFilter === "all" || matchesPaletteFilter(status, paletteFilter)) {
        acc.push(index);
      }
      return acc;
    }, []),
    [questions, answers, questionMeta, paletteFilter]
  );

  async function loadCatalogAndTest() {
    try {
      setLoading(true);
      setError("");
      const setsResponse = await api.getBankingPracticeSets();
      const setList = Array.isArray(setsResponse?.sets) ? setsResponse.sets : [];
      setTests(setList);

      const match = pickSet(setList, requestedSetId, topic);
      if (!match) {
        if (isTestPage) {
          throw new Error(`No Banking practice set found for ${topic}.`);
        }
        setActiveTopic(topic);
        setActiveSetId("");
        return;
      }

      setActiveTopic(match.topic || topic);
      setActiveSetId(isTestPage ? match.id : "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveSetQuestions(setId) {
    try {
      setLoading(true);
      setError("");
      setSessionResult(null);
      finishingRef.current = false;

      const fullTest = requestedTestId
        ? await api.getTestById(requestedTestId)
        : await api.getBankingPracticeSetQuestions(setId);

      setActiveTest(fullTest);
      setCurrentIndex(0);
      setAnswers({});
      setQuestionMeta({});
      setAttemptStarted(false);
      setPaletteFilter("all");
      setQuestionTimeByIndex({});
      setCurrentQuestionTimeSeconds(0);
      setQuestionTimerPaused(false);
      setTimeLeftSeconds(Math.max(1, Number(fullTest?.duration || fullTest?.questions?.length || 0)) * 60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function pickSet(list, setId, targetTopic) {
    if (setId) {
      return list.find((item) => item.id === setId) || null;
    }

    const normalizedTarget = normalizeText(targetTopic);
    return list.find((item) => normalizeText(item.topic).includes(normalizedTarget)) || list[0] || null;
  }

  function openTest(setItem) {
    const query = new URLSearchParams({
      topic: setItem.topic || activeTopic,
      setId: setItem.id
    });
    window.location.assign(`/banking/practice/run/test?${query.toString()}`);
  }

  function beginAttempt() {
    setSessionResult(null);
    setAttemptStarted(true);
    setQuestionTimeByIndex({});
    setCurrentQuestionTimeSeconds(0);
    setQuestionTimerPaused(false);
    setQuestionMeta((prev) => markVisited(prev, 0));
  }

  function selectQuestion(index) {
    goToQuestion(index);
  }

  function selectAnswer(optionIndex) {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
    if (isPracticeMode) {
      setQuestionTimerPaused(true);
    }
    setQuestionMeta((prev) => ({
      ...markVisited(prev, currentIndex),
      [currentIndex]: {
        ...prev[currentIndex],
        markedForReview: prev[currentIndex]?.markedForReview || false,
        visited: true
      }
    }));
  }

  function clearResponse() {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
    setQuestionMeta((prev) => markVisited(prev, currentIndex));
  }

  function saveAndNext() {
    advanceQuestion();
  }

  function markForReviewAndNext() {
    setQuestionMeta((prev) => ({
      ...markVisited(prev, currentIndex),
      [currentIndex]: {
        ...prev[currentIndex],
        visited: true,
        markedForReview: true
      }
    }));
    advanceQuestion();
  }

  function clearReviewTag() {
    setQuestionMeta((prev) => ({
      ...markVisited(prev, currentIndex),
      [currentIndex]: {
        ...prev[currentIndex],
        visited: true,
        markedForReview: false
      }
    }));
  }

  function goToQuestion(nextIndex) {
    const clamped = Math.min(Math.max(0, nextIndex), Math.max(questions.length - 1, 0));
    if (clamped === currentIndex) {
      return;
    }

    captureQuestionTime(currentIndex);
    setCurrentIndex(clamped);
    setCurrentQuestionTimeSeconds(0);
    setQuestionTimerPaused(false);
  }

  function advanceQuestion() {
    if (currentIndex >= questions.length - 1) {
      completeSession();
      return;
    }

    goToQuestion(currentIndex + 1);
  }

  function captureQuestionTime(index) {
    if (!attemptStarted || !questions.length) {
      return;
    }

    setQuestionTimeByIndex((prev) => ({
      ...prev,
      [index]: Number(prev[index] || 0) + Number(currentQuestionTimeSeconds || 0)
    }));
  }

  function buildQuestionSnapshot() {
    const snapshot = { ...questionTimeByIndex };
    snapshot[currentIndex] = Number(snapshot[currentIndex] || 0) + Number(currentQuestionTimeSeconds || 0);
    return snapshot;
  }

  function completeSession() {
    if (!questions.length || !activeTest) {
      return;
    }

    const questionTimeSnapshot = buildQuestionSnapshot();
    const questionRows = questions.map((question, index) => {
      const status = deriveQuestionState(index, answers, questionMeta);
      const selectedAnswer = answers[index];
      const correctAnswer = question.correctAnswer ?? null;
      const isCorrect = selectedAnswer !== undefined && selectedAnswer !== null && Number(selectedAnswer) === Number(correctAnswer);

      return {
        index,
        questionId: question._id,
        question,
        selectedAnswer: selectedAnswer !== undefined ? Number(selectedAnswer) : undefined,
        correctAnswer,
        status,
        timeSpentSeconds: Number(questionTimeSnapshot[index] || 0),
        visited: Boolean(questionMeta[index]?.visited),
        markedForReview: Boolean(questionMeta[index]?.markedForReview),
        isCorrect
      };
    });

    const totalTimeSpentSeconds = questionRows.reduce((sum, row) => sum + Number(row.timeSpentSeconds || 0), 0);
    const attemptedCount = questionRows.filter((row) => row.selectedAnswer !== undefined).length;
    const correctCount = questionRows.filter((row) => row.isCorrect).length;
    const incorrectCount = attemptedCount - correctCount;
    const averageTimeSeconds = questionRows.length > 0 ? Math.round(totalTimeSpentSeconds / questionRows.length) : 0;

    setSessionResult({
      testTitle: activeTest.title,
      mode: runnerMode,
      totalQuestions: questionRows.length,
      attemptedCount,
      correctCount,
      incorrectCount,
      notVisitedCount: questionRows.filter((row) => row.status === "notVisited").length,
      markedCount: questionRows.filter((row) => row.markedForReview).length,
      totalTimeSpentSeconds,
      averageTimeSeconds,
      accuracyPct: attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0,
      questionRows
    });
    setAttemptStarted(false);
    setCurrentQuestionTimeSeconds(0);
  }

  function restartAttempt() {
    setSessionResult(null);
    setAttemptStarted(false);
    setCurrentIndex(0);
    setAnswers({});
    setQuestionMeta({});
    setQuestionTimeByIndex({});
    setCurrentQuestionTimeSeconds(0);
    setQuestionTimerPaused(false);
    setPaletteFilter("all");
    finishingRef.current = false;
  }

  if (loading) {
    return <p>Loading practice test...</p>;
  }

  if (error) {
    return (
      <div className="banking-runner__empty card">
        <p className="error">{error}</p>
        <button className="secondary" type="button" onClick={() => window.location.assign("/banking")}>Back to Banking Hub</button>
      </div>
    );
  }

  if (sessionResult) {
    return (
      <div className="banking-runner banking-runner--analysis">
        <section className="banking-runner__analysis card">
          <div className="banking-runner__analysisHead">
            <div>
              <div className="label">Practice Analysis</div>
              <h1>{sessionResult.testTitle}</h1>
              <p>{isPracticeMode ? "Practice stopwatch summary with per-question timing." : "Full-length summary with global timer and per-question timing."}</p>
            </div>
            <div className="banking-runner__analysisPills">
              <span className="banking-runner__chip">Mode: {isPracticeMode ? "Practice" : "Full Length"}</span>
              <span className="banking-runner__chip">Questions: {sessionResult.totalQuestions}</span>
            </div>
          </div>

          <div className="banking-runner__analysisStats">
            <StatCard label="Correct" value={sessionResult.correctCount} tone="answered" />
            <StatCard label="Incorrect" value={sessionResult.incorrectCount} tone="notAnswered" />
            <StatCard label="Attempted" value={sessionResult.attemptedCount} tone="marked" />
            <StatCard label="Not Visited" value={sessionResult.notVisitedCount} tone="notVisited" />
            <StatCard label="Accuracy" value={`${sessionResult.accuracyPct}%`} tone="answered" />
            <StatCard label="Avg / Question" value={formatDuration(sessionResult.averageTimeSeconds)} tone="marked" />
            <StatCard label="Total Time" value={formatDuration(sessionResult.totalTimeSpentSeconds)} tone="notVisited" />
          </div>

          <div className="banking-runner__analysisActions">
            <button className="banking-runner__ghost" type="button" onClick={restartAttempt}>
              Review Again
            </button>
            <button className="banking-runner__primary" type="button" onClick={() => window.location.assign(`/banking/practice/run?topic=${encodeURIComponent(activeTopic)}&mode=${runnerMode}`)}>
              Back to Sets
            </button>
          </div>
        </section>

        <section className="banking-runner__analysis card">
          <div className="banking-runner__sidebarTitle">Question Wise Breakdown</div>
          <div className="banking-runner__analysisTable">
            <div className="banking-runner__analysisTableHead">
              <span>Q</span>
              <span>Status</span>
              <span>Answer</span>
              <span>Correct</span>
              <span>Time</span>
            </div>
            {sessionResult.questionRows.map((row) => (
              <div className="banking-runner__analysisTableRow" key={row.questionId || row.index}>
                <span>{row.index + 1}</span>
                <span>{formatStateLabel(row.status)}</span>
                <span>{row.selectedAnswer !== undefined ? optionLabel(row.selectedAnswer) : "-"}</span>
                <span>{row.correctAnswer !== null && row.correctAnswer !== undefined ? optionLabel(row.correctAnswer) : "-"}</span>
                <span>{formatDuration(row.timeSpentSeconds)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="banking-runner">
      {!isTestPage ? (
        <section className="banking-runner__catalog card">
          <div className="banking-runner__catalogHead">
            <div>
              <div className="label">Banking Mock Test</div>
              <h2>Select a practice set</h2>
              <p>Launch the imported reasoning set in a Testbook-style live test environment with instructions, timer, palette, and review actions.</p>
            </div>

            <div className="banking-runner__catalogTabs">
              {topicList.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`banking-runner__catalogTab ${activeTopic === item ? "active" : ""}`}
                  onClick={() => setActiveTopic(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="banking-runner__setList">
            {visibleSets.map((setItem, index) => (
              <article key={setItem.id} className="banking-runner__setCard">
                <div>
                  <div className="banking-runner__setTitle">{setItem.title || `Practice Set ${index + 1}`}</div>
                  <div className="banking-runner__setMeta">
                    <span>{setItem.questionCount} Questions</span>
                    <span>Topic: {setItem.topic}</span>
                    <span>Mode: Live Test Environment</span>
                  </div>
                </div>

                <button className="banking-runner__setBtn" type="button" onClick={() => openTest(setItem)}>
                  Start Test
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isTestPage && activeTest ? (
        !attemptStarted ? (
          <section className="banking-runner__instructions card">
            <div className="banking-runner__instructionsHead">
              <div>
                <div className="label">Mock Test Instructions</div>
                <h1>{activeTest.title}</h1>
                <p>This UI is modeled on the authenticated Testbook test environment. The original page is login-gated, so this implementation reproduces the public interaction pattern locally using your structured set.</p>
              </div>
              <div className="banking-runner__examMeta">
                <span>{questions.length} Questions</span>
                <span>{activeTest.duration} Minutes</span>
                <span>Language: English</span>
              </div>
            </div>

            <div className="banking-runner__instructionsGrid">
              <div className="banking-runner__instructionCard">
                <h3>General Instructions</h3>
                <ul>
                  <li>The timer starts only after you click `I am ready to begin`.</li>
                  <li>You can move across questions using the palette on the right.</li>
                  <li>`Save & Next` stores the answer and advances to the next question.</li>
                  <li>`Mark for Review & Next` flags the question and keeps any selected answer.</li>
                  <li>`Clear Response` removes the selected option for the current question.</li>
                </ul>
              </div>

              <div className="banking-runner__instructionCard">
                <h3>Question Palette Meaning</h3>
                <ul>
                  <li>`Not Visited`: you have not opened the question yet.</li>
                  <li>`Not Answered`: you visited the question but did not save an answer.</li>
                  <li>`Answered`: an option is selected.</li>
                  <li>`Marked`: question is marked for review, with or without an answer.</li>
                </ul>
              </div>
            </div>

            <div className="banking-runner__instructionsActions">
              <button className="banking-runner__ghost" type="button" onClick={() => window.location.assign(`/banking/practice/run?topic=${encodeURIComponent(activeTopic)}`)}>
                Back to Sets
              </button>
              <button className="banking-runner__primary" type="button" onClick={beginAttempt}>
                I am ready to begin
              </button>
            </div>
          </section>
        ) : (
          <section className="banking-runner__test card">
            <header className="banking-runner__topbar">
              <div className="banking-runner__brandBlock">
                <div className="label">Test Environment</div>
                <h1>{activeTest.title}</h1>
                <div className="banking-runner__meta">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span>Topic: {activeTopic}</span>
                  <span>Mode: {isPracticeMode ? "Practice" : "Full Length"}</span>
                  <span>Marks: {currentQuestion?.marks ?? 1}</span>
                </div>
              </div>

              <div className="banking-runner__timerBox">
                  <span>{isPracticeMode ? "Question Time" : "Time Left"}</span>
                  <strong>{isPracticeMode ? formatDuration(currentQuestionTimeSeconds) : formatDuration(timeLeftSeconds)}</strong>
              </div>
            </header>

            <div className="banking-runner__workspace">
              <main className="banking-runner__main">
                <div className="banking-runner__questionHeader">
                  <div className="banking-runner__questionBadge">{currentIndex + 1}</div>
                  <div className="banking-runner__questionMeta">
                    <span className="banking-runner__chip">Level: {currentQuestion?.level || "Medium"}</span>
                    <span className="banking-runner__chip">Type: Single Correct</span>
                    <span className={`banking-runner__chip banking-runner__chip--state ${deriveQuestionState(currentIndex, answers, questionMeta)}`}>
                      {formatStateLabel(deriveQuestionState(currentIndex, answers, questionMeta))}
                    </span>
                  </div>
                </div>

                <article className="banking-runner__question card">
                  <div className="banking-runner__direction">Directions: Choose the most appropriate answer from the options given below.</div>
                  <div className="banking-runner__stem">
                    <RichText
                      value={currentQuestion?.question}
                      html={currentQuestionHtml}
                      segments={currentQuestion?.questionRich}
                    />
                    {currentQuestionImageUrl ? (
                      <div className="banking-runner__questionImage">
                        <img 
                          src={currentQuestionImageUrl} 
                          alt={currentQuestion?.image?.alt || "Question visual aid"} 
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="banking-runner__options">
                    {currentQuestion?.options?.map((option, optionIndex) => {
                      const selected = answers[currentIndex] === optionIndex;
                      const isCorrect = currentAnswerIsSelected && Number(currentCorrectAnswer) === optionIndex;
                      const isWrongSelection = selected && currentAnswerIsSelected && !currentAnswerIsCorrect;
                      const optionSegments = currentQuestion?.optionsRich?.[optionIndex];
                      return (
                        <button
                          key={`${currentQuestion._id}-${optionIndex}`}
                          type="button"
                          className={`banking-runner__option ${selected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrongSelection ? "wrong" : ""}`}
                          onClick={() => selectAnswer(optionIndex)}
                        >
                          <span className="banking-runner__optionIndex">{optionLabel(optionIndex)}</span>
                          <span className="banking-runner__optionText">
                            <RichText
                              value={option}
                              html={currentQuestion?.optionsHtml?.[optionIndex] || currentQuestion?.options_html?.[optionIndex]}
                              segments={optionSegments}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {currentAnswerIsSelected ? (
                    <div className={`banking-runner__explanation ${currentAnswerIsCorrect ? "correct" : "wrong"}`}>
                      <div className="banking-runner__explanationHead">
                        <strong>{currentAnswerIsCorrect ? "Correct answer" : `Wrong answer. Correct option: ${optionLabel(Number(currentCorrectAnswer))}`}</strong>
                        <span>{currentAnswerIsCorrect ? "Your choice matches the key." : "Review the solution below."}</span>
                      </div>
                      <div className="banking-runner__explanationBody">
                        <RichText
                          value={currentExplanation || "Explanation not available for this question."}
                          html={currentExplanationHtml}
                          segments={currentQuestion?.explanationRich}
                        />
                      </div>
                    </div>
                  ) : null}
                </article>

                <div className="banking-runner__actions">
                  <button className="banking-runner__ghost" type="button" onClick={() => goToQuestion(currentIndex - 1)}>Previous</button>
                  <button className="banking-runner__ghost" type="button" onClick={clearResponse}>Clear Response</button>
                  <button className="banking-runner__ghost" type="button" onClick={clearReviewTag}>Unmark Review</button>
                  <button className="banking-runner__accent" type="button" onClick={markForReviewAndNext}>Mark for Review & Next</button>
                  <button className="banking-runner__primary" type="button" onClick={saveAndNext}>
                    {currentIndex === questions.length - 1 ? (isPracticeMode ? "Finish & Analyze" : "Submit Test") : "Save & Next"}
                  </button>
                </div>
              </main>

              <aside className="banking-runner__sidebar">
                <div className="banking-runner__sidebarCard">
                  <div className="banking-runner__sidebarTitle">Question Palette</div>
                  <div className="banking-runner__statusGrid">
                    <StatusPill label="Answered" value={paletteCounts.answered} tone="answered" />
                    <StatusPill label="Not Answered" value={paletteCounts.notAnswered} tone="notAnswered" />
                    <StatusPill label="Marked" value={paletteCounts.marked} tone="marked" />
                    <StatusPill label="Not Visited" value={paletteCounts.notVisited} tone="notVisited" />
                  </div>
                </div>

                <div className="banking-runner__sidebarCard">
                  <div className="banking-runner__filterTabs">
                    {PALETTE_FILTERS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`banking-runner__filterTab ${paletteFilter === item.key ? "active" : ""}`}
                        onClick={() => setPaletteFilter(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="banking-runner__palette">
                    {questions.map((question, index) => {
                      const state = deriveQuestionState(index, answers, questionMeta);
                      const muted = paletteFilter !== "all" && !filteredIndexes.includes(index);
                      return (
                        <button
                          key={question._id || index}
                          type="button"
                          className={`banking-runner__paletteItem ${state} ${currentIndex === index ? "active" : ""} ${muted ? "muted" : ""}`}
                          onClick={() => selectQuestion(index)}
                          title={`Question ${index + 1}`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>

                  {isPracticeMode ? (
                    <div className="banking-runner__paletteFooter">
                      <button className="banking-runner__submit" type="button" onClick={completeSession}>
                        Submit
                      </button>
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </section>
        )
      ) : null}
    </div>
  );
}

function StatusPill({ label, value, tone }) {
  return (
    <div className={`banking-runner__statusPill ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`banking-runner__analysisStat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function optionLabel(index) {
  return String.fromCharCode(65 + Number(index));
}

function resolveQuestionImageUrl(question) {
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

function getQuestionHtml(question) {
  return question?.questionHtml || question?.question_html || "";
}

function getQuestionExplanationHtml(question) {
  return question?.explanationHtml || question?.explanation_html || question?.explanation?.html || "";
}

function markVisited(meta, index) {
  return {
    ...meta,
    [index]: {
      ...meta[index],
      visited: true,
      markedForReview: meta[index]?.markedForReview || false
    }
  };
}

function deriveQuestionState(index, answers, meta) {
  const selectedAnswer = answers[index];
  const details = meta[index];
  const visited = Boolean(details?.visited);
  const markedForReview = Boolean(details?.markedForReview);

  if (markedForReview) {
    return "marked";
  }
  if (selectedAnswer !== undefined && selectedAnswer !== null) {
    return "answered";
  }
  if (visited) {
    return "notAnswered";
  }
  return "notVisited";
}

function derivePaletteCounts(questions, answers, meta) {
  return questions.reduce(
    (acc, _question, index) => {
      const state = deriveQuestionState(index, answers, meta);
      acc[state] += 1;
      return acc;
    },
    { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 }
  );
}

function matchesPaletteFilter(state, filter) {
  if (filter === "all") {
    function StatCard({ label, value, tone }) {
      return (
        <article className={`banking-runner__analysisStat ${tone}`}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      );
    }
    return true;
  }
  return state === filter;
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function formatStateLabel(state) {
  switch (state) {
    case "answered":
      return "Answered";
    case "notAnswered":
      return "Not Answered";
    case "marked":
      return "Marked For Review";
    default:
      return "Not Visited";
  }
}

function extractExplanation(question = {}) {
  if (!question) {
    return "";
  }

  if (typeof question.explanation === "string") {
    return question.explanation.trim();
  }

  if (question.explanation && typeof question.explanation === "object") {
    return String(question.explanation.text || question.explanation.value || "").trim();
  }

  return String(question.solution || question.answerExplanation || "").trim();
}
