export default function AnalysisQuestionNavigator({ questions, activeIndex, onSelect, summary }) {
  const counts = summary || { all: questions.length, correct: 0, incorrect: 0, skipped: 0, review: 0 };

  return (
    <aside className="analysis-nav card">
      <div className="analysis-nav__tabs">
        {[
          ["All", counts.all],
          ["Correct", counts.correct],
          ["Incorrect", counts.incorrect],
          ["Skipped", counts.skipped],
          ["Review", counts.review]
        ].map(([label, value], index) => (
          <button key={label} type="button" className={`analysis-nav__tab ${index === 0 ? "active" : ""}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </div>

      <div className="analysis-nav__grid">
        {questions.map((question, index) => {
          const status = question.status || "not-visited";
          return (
            <button
              key={question._id || index}
              type="button"
              onClick={() => onSelect(index)}
              className={`analysis-nav__item ${activeIndex === index ? "active" : ""} ${status}`}
              title={`Question ${index + 1}`}
            >
              {index + 1}
              {question.timeSpentSeconds ? <span className="analysis-nav__time">{formatSeconds(question.timeSpentSeconds)}</span> : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function formatSeconds(value) {
  const total = Math.max(0, Number(value || 0));
  if (total < 60) {
    return `${total}s`;
  }
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}m ${secs}s`;
}