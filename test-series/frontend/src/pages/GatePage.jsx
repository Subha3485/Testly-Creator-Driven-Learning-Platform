import { useEffect, useState } from "react";
import { api } from "../lib/api";

const PRACTICE_TOPICS = [
  "RDBMS",
  "Operating Systems",
  "Algorithms",
  "Computer Networks",
  "Databases"
];

const MOCK_MODES = [
  {
    key: "practice",
    title: "Practice Mode",
    description: "Topic-wise GATE PYQ practice with a per-question stopwatch and local analysis.",
    href: "/gate/practice"
  },
  {
    key: "sectional",
    title: "Sectional Mock",
    description: "Solve a single subject/section with exam-style timing.",
    href: "/gate/sectional"
  },
  {
    key: "full",
    title: "Full Mock",
    description: "Run a full GATE test with a global timer and full analysis dashboard.",
    href: "/?examTarget=GATE"
  }
];

export default function GatePage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const resp = await api.getGatePracticeSets();
        if (!mounted) return;
        setSets(Array.isArray(resp?.sets) ? resp.sets : []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load GATE sets");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const handleStart = (set) => {
    const id = typeof set === "string" ? set : set.id;
    window.location.assign(`/gate/practice/run/test?setId=${encodeURIComponent(id)}&mode=practice`);
  };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="card">
        <div className="row spread">
          <div>
            <div className="label">GATE PYQ Practice</div>
            <h3>Choose a Practice Set</h3>
            <p>Practice sets are loaded from the backend data folder (e.g. rdbms_first14). Select a set to open the runner.</p>
          </div>
          <span className="badge">GATE</span>
        </div>

        {loading ? (
          <div style={{ marginTop: 16 }}>Loading sets…</div>
        ) : error ? (
          <div style={{ marginTop: 16 }} className="error">{error}</div>
        ) : (!sets || sets.length === 0) ? (
          <div className="banking-runner__empty" style={{ marginTop: 16 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3>No GATE sets available</h3>
              <p>No GATE practice sets have been added yet. Please add `questions.json` folders under the backend `data` directory.</p>
            </div>
          </div>
        ) : (
          <div className="grid cards" style={{ marginTop: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {sets.map((s) => (
              <article key={s.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }}>
                <div className="label" style={{ fontSize: '0.9em' }}>{s.topic}</div>
                <p style={{ marginTop: 8, fontSize: '0.85em', color: '#666' }}>{s.questionCount} questions</p>
                <button className="primary" type="button" onClick={() => handleStart(s)} style={{ marginTop: 'auto' }}>
                  Start Practice
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="label">GATE Topics (sample)</div>
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
