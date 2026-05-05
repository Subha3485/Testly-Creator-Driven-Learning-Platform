export default function AnalysisQuestionCard({ question, index, selectedAnswer, onSelect }) {
  const correctAnswer = normalizeAnswer(question.correctAnswer);
  const status = question.status || deriveStatus(selectedAnswer, correctAnswer);
  const answerLabel = selectedAnswer === undefined || selectedAnswer === null ? "Not attempted" : optionLabel(selectedAnswer);
  const correctLabel = optionLabel(correctAnswer);

  return (
    <article className="analysis-question card" id={`analysis-question-${index}`}>
      <div className="analysis-question__top">
        <div>
          <div className="label">Question {index + 1}</div>
          <h3 className="analysis-question__title">{question.question}</h3>
        </div>

        <div className="analysis-question__meta">
          <span className={`analysis-pill ${status}`}>{status.replace("-", " ")}</span>
          {question.timeSpentSeconds !== undefined ? <span className="analysis-pill neutral">Time: {formatSeconds(question.timeSpentSeconds)}</span> : null}
          {question.visitedCount !== undefined ? <span className="analysis-pill neutral">Visited: {question.visitedCount}</span> : null}
        </div>
      </div>

      <div className="analysis-question__body">
        {Array.isArray(question.options) && question.options.length > 0 ? question.options.map((option, optionIndex) => {
          const letter = optionLabel(optionIndex);
          const isCorrect = optionIndex === correctAnswer;
          const isSelected = optionIndex === selectedAnswer;
          const className = ["analysis-option", isCorrect ? "correct" : "", isSelected && !isCorrect ? "wrong" : ""].filter(Boolean).join(" ");

          return (
            <div key={`${question._id || index}-${optionIndex}`} className={className} onClick={() => onSelect?.(optionIndex)} role="button" tabIndex={0}>
              <strong>{letter}.</strong>
              <span>{option}</span>
            </div>
          );
        }) : <p className="analysis-empty">No options available.</p>}
      </div>

      <div className="analysis-question__footer">
        <div><strong>Your answer:</strong> {answerLabel}</div>
        <div><strong>Correct answer:</strong> {correctLabel}</div>
      </div>

      <div className="analysis-explanation">
        <div className="label">Explanation</div>
        <p>{question.explanation?.text || question.explanation || "No explanation added yet."}</p>
      </div>
    </article>
  );
}

function deriveStatus(selectedAnswer, correctAnswer) {
  if (selectedAnswer === undefined || selectedAnswer === null) return "skipped";
  return Number(selectedAnswer) === Number(correctAnswer) ? "correct" : "incorrect";
}

function normalizeAnswer(value) {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
}

function optionLabel(value) {
  if (value === undefined || value === null) return "-";
  const index = Number(value);
  if (Number.isNaN(index)) return String(value);
  return String.fromCharCode(65 + index);
}

function formatSeconds(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}m ${secs}s`;
}