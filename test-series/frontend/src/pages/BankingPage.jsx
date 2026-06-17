const PRACTICE_TOPICS = [
  "Inequality",
  "Coding-Decoding",
  "Circular Arrangements",
  "Linear Arrangements",
  "Square Arrangements",
  "Blood Relations",
  "Direction Distance",
  "Syllogism",
  "Alphabets Basics",
  "Order Ranking"
];

const MOCK_MODES = [
  {
    key: "practice",
    title: "Practice Mode",
    description: "Open the new Banking practice hub with the updated test runner.",
    href: "/tests?examTarget=BANKING"
  },
  {
    key: "sectional",
    title: "Sectional Mock",
    description: "Solve a single subject/section with exam-style timing.",
    href: "/banking/sectional"
  },
  {
    key: "full",
    title: "Full Mock",
    description: "Run a full Banking test with a global timer and full analysis dashboard.",
    href: "/?examTarget=BANKING"
  }
];

export default function BankingPage() {
  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="card">
        <div className="row spread">
          <div>
            <div className="label">Banking Exam</div>
            <h3>Choose a mock mode</h3>
            <p>Start with practice mode to load the Reasoning topic pool from the structured files in `Reasoning/structured`.</p>
          </div>
          <span className="badge">BANKING</span>
        </div>

        <div className="grid cards" style={{ marginTop: 16 }}>
          {MOCK_MODES.map((mode) => (
            <article key={mode.key} className="card">
              <div className="label">{mode.title}</div>
              <p>{mode.description}</p>
              <button className="primary" type="button" onClick={() => window.location.assign(mode.href)}>
                Open {mode.title}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="label">Reasoning Topic Pool</div>
        <div className="row" style={{ marginTop: 10 }}>
          {PRACTICE_TOPICS.map((topic) => (
            <span key={topic} className="badge">
              {topic}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}