import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.getBankingDashboard();
        setDashboard(response);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <span className="label">Student dashboard</span>
          <h1>Your learning performance at a glance.</h1>
          <p>Track practice progress, recommendations, and your most active topics.</p>
        </div>
      </section>

      {error && <div className="card" style={{ padding: 18, background: "#ffecec", color: "#8a1f1f" }}>{error}</div>}
      {loading ? (
        <div>Loading dashboard...</div>
      ) : (
        dashboard && (
          <>
            <section className="section-block">
              <div className="section-block__head">
                <h2>Insights</h2>
                <p>Real-time practice metrics from the backend.</p>
              </div>
              <div className="hero__stats">
                <div className="hero__stat">
                  <strong>{dashboard.summary.totalPracticeSets}</strong>
                  <span>Practice sets</span>
                </div>
                <div className="hero__stat">
                  <strong>{dashboard.summary.totalQuestions}</strong>
                  <span>Total questions</span>
                </div>
                <div className="hero__stat">
                  <strong>{dashboard.summary.activeStudents}</strong>
                  <span>Active students</span>
                </div>
                <div className="hero__stat">
                  <strong>{dashboard.summary.completedLessons}</strong>
                  <span>Completed lessons</span>
                </div>
              </div>
            </section>

            <section className="section-block">
              <div className="section-block__head">
                <h2>Top topics</h2>
              </div>
              <div className="series-grid">
                {dashboard.topTopics.map((topic) => (
                  <article key={topic} className="series-card">
                    <strong>{topic}</strong>
                    <p>High-priority topic based on available practice content.</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="section-block__head">
                <h2>Recommendations</h2>
              </div>
              <div className="series-grid">
                {dashboard.recommendations.map((item) => (
                  <article key={item.title} className="series-card">
                    <strong>{item.title}</strong>
                    <p>{item.details}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
