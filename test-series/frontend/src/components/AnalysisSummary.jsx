export default function AnalysisSummary({ submission, test, stats }) {
  const score = Number(submission?.score || 0);
  const totalMarks = Number(submission?.totalMarks || test?.totalMarks || 0);
  const accuracy = Number(submission?.accuracyPct ?? stats?.accuracyPct ?? 0);
  const timeTaken = formatDuration(stats?.timeTakenSeconds ?? submission?.timeSpentSeconds ?? 0);

  function handleReattempt() {
    const testId = test?._id || submission?.testId || "";
    const examTarget = submission?.examTarget || test?.examTarget || "SSC";
    const query = new URLSearchParams({ examTarget, testId, reattempt: "1" });
    window.location.assign(`/?${query.toString()}`);
  }

  return (
    <section className="analysis-hero card">
      <div className="analysis-hero__main">
        <div className="label">Submitted Test</div>
        <h2 className="analysis-title">{test?.title || "Test Analysis"}</h2>
        <div className="analysis-meta">
          <span>{test?.questions?.length ?? stats?.totalQuestions ?? 0} Questions</span>
          <span>{totalMarks} Marks</span>
          <span>{timeTaken}</span>
          <span>{submission?.attemptedOnLabel || stats?.attemptedOnLabel || "Attempted recently"}</span>
        </div>
      </div>

      <div className="analysis-hero__cta">
        <button className="secondary" type="button" onClick={handleReattempt}>Reattempt</button>
        <button className="primary" type="button" onClick={() => window.location.assign("/")}>View Solutions</button>
      </div>

      <div className="analysis-grid">
        <StatCard label="Score" value={`${score}/${totalMarks || 0}`} tone="blue" />
        <StatCard label="Correct" value={stats?.correct ?? 0} tone="green" />
        <StatCard label="Incorrect" value={stats?.incorrect ?? 0} tone="red" />
        <StatCard label="Skipped" value={stats?.skipped ?? 0} tone="gray" />
        <StatCard label="Accuracy" value={`${accuracy}%`} tone="blue" />
        <StatCard label="Time Taken" value={timeTaken} tone="orange" />
      </div>
    </section>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`analysis-stat analysis-stat--${tone}`}>
      <div className="analysis-stat__label">{label}</div>
      <div className="analysis-stat__value">{value}</div>
    </article>
  );
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}