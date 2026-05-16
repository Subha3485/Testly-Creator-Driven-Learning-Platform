import { useParams, Link } from "react-router-dom";

const teacherData = {
  "sunita-kapoor": {
    name: "Sunita Kapoor",
    title: "Quant Creator",
    followers: 18200,
    students: 12800,
    rating: 4.9,
    bio: "Building concept-first Quant lessons and practice routines for competitive exams.",
    courses: ["Quant Mastery Bootcamp", "Advanced DI & Algebra"],
    tests: ["Quant Daily Challenge", "Mock Test 5"]
  },
  "rahul-mehra": {
    name: "Rahul Mehra",
    title: "Reasoning Coach",
    followers: 14600,
    students: 10400,
    rating: 4.8,
    bio: "Live reasoning sessions, strategy guides, and topic drills for bank exams.",
    courses: ["Logical Reasoning Crash Course", "Seating Arrangement Mastery"],
    tests: ["Reasoning Topic Drill", "Mock Test 3"]
  },
  "neha-sharma": {
    name: "Neha Sharma",
    title: "English Expert",
    followers: 9800,
    students: 7200,
    rating: 4.7,
    bio: "English clarity, vocabulary, and reading practice for high scorers.",
    courses: ["English Vocab + Grammar", "Reading Comprehension Power"],
    tests: ["English Concept Test", "Grammar Booster"]
  }
};

export default function TeacherProfilePage() {
  const { id } = useParams();
  const teacher = teacherData[id] || teacherData["sunita-kapoor"];

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <span className="label">Teacher profile</span>
          <h1>{teacher.name}</h1>
          <p>{teacher.bio}</p>
          <div className="hero__stats">
            <div className="hero__stat">
              <strong>{teacher.followers.toLocaleString()}</strong>
              <span>Followers</span>
            </div>
            <div className="hero__stat">
              <strong>{teacher.students.toLocaleString()}</strong>
              <span>Students</span>
            </div>
            <div className="hero__stat">
              <strong>{teacher.rating} ★</strong>
              <span>Rating</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Courses by {teacher.name}</h2>
          <Link to="/courses">Browse courses</Link>
        </div>
        <div className="series-grid">
          {teacher.courses.map((course) => (
            <article key={course} className="series-card">
              <strong>{course}</strong>
              <p>Structured course with videos, notes, and linked practice.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__head">
          <h2>Tests by {teacher.name}</h2>
          <Link to="/tests">View all tests</Link>
        </div>
        <div className="series-grid">
          {teacher.tests.map((test) => (
            <article key={test} className="series-card">
              <strong>{test}</strong>
              <p>Teacher-created mock test for competitive exam prep.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
