import { Link } from "react-router-dom";

const creators = [
  { id: "sunita-kapoor", name: "Sunita Kapoor", role: "Quant Creator", followers: 18200, rating: 4.9, students: 12800 },
  { id: "rahul-mehra", name: "Rahul Mehra", role: "Reasoning Coach", followers: 14600, rating: 4.8, students: 10400 },
  { id: "neha-sharma", name: "Neha Sharma", role: "English Expert", followers: 9800, rating: 4.7, students: 7200 }
];

const courses = [
  { title: "Quant Mastery Bootcamp", teacher: "Sunita Kapoor", lessons: 32, students: 6200 },
  { title: "Logical Reasoning Crash Course", teacher: "Rahul Mehra", lessons: 20, students: 5200 },
  { title: "English Vocab + Grammar", teacher: "Neha Sharma", lessons: 18, students: 4300 }
];

const tests = [
  { title: "Quant Daily Challenge", questions: 20, time: "30 min", strength: "Speed & accuracy" },
  { title: "Reasoning Topic Drill", questions: 25, time: "40 min", strength: "Visual reasoning" },
  { title: "Mock Test 1", questions: 100, time: "120 min", strength: "Full-length simulated test" }
];

export default function FeedPage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <span className="label">Creator-driven exam prep</span>
          <h1>Learn from teachers, practice with tests, and keep improving daily.</h1>
          <p>Discover creators, jump into courses, solve linked practice, and track your progress in one platform.</p>
          <div className="hero__chips">
            <div className="hero__chip active">Creator Feed</div>
            <div className="hero__chip">Practice</div>
            <div className="hero__chip">Courses</div>
            <div className="hero__chip">Analytics</div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Featured Teachers</h2>
          <Link to="/courses">Explore all courses</Link>
        </div>
        <div className="series-grid">
          {creators.map((creator) => (
            <article key={creator.id} className="series-card">
              <div className="series-card__top">
                <div>
                  <strong>{creator.name}</strong>
                  <p>{creator.role}</p>
                </div>
                <span className="series-card__meta">{creator.rating} ★</span>
              </div>
              <p>{creator.followers.toLocaleString()} followers · {creator.students.toLocaleString()} students</p>
              <Link to={`/teachers/${creator.id}`} className="primary">View profile</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Trending courses</h2>
          <Link to="/courses">See catalog</Link>
        </div>
        <div className="series-grid">
          {courses.map((course) => (
            <article key={course.title} className="series-card">
              <strong>{course.title}</strong>
              <p>{course.teacher}</p>
              <div className="series-card__footer">
                <span>{course.lessons} lessons</span>
                <span>{course.students.toLocaleString()} students</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Quick practice</h2>
          <Link to="/tests">Open tests</Link>
        </div>
        <div className="series-grid">
          {tests.map((test) => (
            <article key={test.title} className="series-card">
              <strong>{test.title}</strong>
              <p>{test.strength}</p>
              <div className="series-card__footer">
                <span>{test.questions} questions</span>
                <span>{test.time}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
