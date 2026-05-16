import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function TestSeriesPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.getBankingPracticeSets();
        setSets(response.sets || []);
      } catch (err) {
        setError(err.message || "Failed to load tests");
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
          <span className="label">Test series</span>
          <h1>Practice sets and mock tests from your creator network.</h1>
          <p>Launch teacher-created tests, daily drills, and full mock series—all in one place.</p>
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Available sets</h2>
          <p>{loading ? "Loading tests..." : sets.length + " practice sets"}</p>
        </div>
        {error && <div className="card" style={{ padding: 18, background: "#ffecec", color: "#8a1f1f" }}>{error}</div>}
        <div className="series-grid">
          {sets.slice(0, 12).map((set) => (
            <article key={set.id} className="series-card">
              <strong>{set.topic}</strong>
              <p>{set.questionCount} questions</p>
              <div className="series-card__footer">
                <span>{set.title}</span>
                <button type="button" className="primary" onClick={() => window.location.assign(`/banking/practice/run/test?topic=${encodeURIComponent(set.topic)}&mode=practice`)}>
                  Start
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
