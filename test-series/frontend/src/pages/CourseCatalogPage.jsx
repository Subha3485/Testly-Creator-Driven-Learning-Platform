import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.getBankingCourses();
        setCourses(response.courses || []);
      } catch (err) {
        setError(err.message || "Unable to load courses.");
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
          <span className="label">Course catalog</span>
          <h1>Structured creator courses for focused exam prep.</h1>
          <p>Explore live creator-led courses generated from available practice content.</p>
          <div className="hero__chips">
            <div className="hero__chip active">All courses</div>
            <div className="hero__chip">Free</div>
            <div className="hero__chip">Featured</div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Top courses</h2>
          <Link to="/">Back to feed</Link>
        </div>

        {error && <div className="card" style={{ padding: 18, background: "#ffecec", color: "#8a1f1f" }}>{error}</div>}
        {loading ? (
          <div>Loading courses...</div>
        ) : (
          <div className="series-grid">
            {courses.map((course) => (
              <article key={course.id} className="series-card">
                <strong>{course.title}</strong>
                <p>{course.teacher}</p>
                <p>{course.description}</p>
                <div className="series-card__footer">
                  <span>{course.lessons} lessons</span>
                  <span>{course.price}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
