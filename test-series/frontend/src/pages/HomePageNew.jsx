import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePageNew.css";

export default function HomePageNew() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user] = useState({ name: "Subhadeep Samanta", email: "subhadeep@prepnexus.dev" });

  const categories = [
    { id: 1, name: "CA", icon: "📚", color: "#6366f1" },
    { id: 2, name: "Finance Courses", icon: "💰", color: "#8b5cf6" },
    { id: 3, name: "ACA", icon: "📖", color: "#ec4899" },
    { id: 4, name: "ACCA", icon: "✍️", color: "#f43f5e" },
    { id: 5, name: "SSC", icon: "🎯", color: "#06b6d4" },
    { id: 6, name: "Banking", icon: "🏦", color: "#10b981" },
    { id: 7, name: "GATE", icon: "🔧", color: "#f59e0b" },
    { id: 8, name: "UPSC", icon: "🏛️", color: "#3b82f6" },
  ];

  const menuItems = [
    { id: 1, label: "Home", icon: "🏠" },
    { id: 2, label: "My Courses", icon: "📚" },
    { id: 3, label: "Practice Tests", icon: "✏️" },
    { id: 4, label: "My Analytics", icon: "📊" },
    { id: 5, label: "Wishlist", icon: "❤️" },
    { id: 6, label: "Downloads", icon: "⬇️" },
    { id: 7, label: "Settings", icon: "⚙️" },
  ];

  const courses = [
    { id: 1, title: "CA Foundation", category: "CA", level: "Beginner", students: 1250, rating: 4.8 },
    { id: 2, title: "Financial Accounting", category: "Finance", level: "Intermediate", students: 3420, rating: 4.7 },
    { id: 3, title: "ACA Fundamentals", category: "ACA", level: "Beginner", students: 890, rating: 4.9 },
    { id: 4, title: "ACCA F1", category: "ACCA", level: "Intermediate", students: 2100, rating: 4.6 },
    { id: 5, title: "SSC CGL Prep", category: "SSC", level: "Beginner", students: 5600, rating: 4.8 },
    { id: 6, title: "Banking Exam Complete", category: "Banking", level: "Intermediate", students: 4200, rating: 4.7 },
    { id: 7, title: "GATE CSE 2025", category: "GATE", level: "Advanced", students: 3800, rating: 4.9 },
    { id: 8, title: "UPSC Prelims Crash", category: "UPSC", level: "Advanced", students: 2900, rating: 4.8 },
    { id: 9, title: "CA Inter Advanced", category: "CA", level: "Advanced", students: 1800, rating: 4.9 },
    { id: 10, title: "ACCA F2 Ethics", category: "ACCA", level: "Intermediate", students: 1450, rating: 4.7 },
    { id: 11, title: "Banking Quantitative", category: "Banking", level: "Intermediate", students: 3200, rating: 4.8 },
    { id: 12, title: "GATE Electronics", category: "GATE", level: "Advanced", students: 2100, rating: 4.6 },
  ];

  const handleCategoryClick = (category) => {
    navigate(`/${category.name.toLowerCase().replace(/\s+/g, "")}`);
  };

  const handleCourseClick = (course) => {
    setActiveModal({ type: "course", data: course });
  };

  const handleTeachClick = () => {
    setActiveModal({ type: "teach" });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="home-page-new">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <button
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button key={item.id} className="nav-item">
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-categories">
          {sidebarOpen && <div className="categories-title">Categories</div>}
          <div className="categories-list">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className="category-item"
                onClick={() => handleCategoryClick(cat)}
                title={cat.name}
              >
                <span className="category-icon">{cat.icon}</span>
                {sidebarOpen && <span className="category-name">{cat.name}</span>}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <div className="topbar">
          <div className="search-container">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="What do you want to learn?"
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn">
                🔍
              </button>
            </form>
          </div>

          <div className="topbar-actions">
            <button className="teach-btn" onClick={handleTeachClick}>
              ✨ Teach on PrepNexus
            </button>

            <div className="user-menu-container">
              <button
                className="user-avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item">My Learning</button>
                  <button className="dropdown-item">My Cart</button>
                  <button className="dropdown-item">Wishlist</button>
                  <button className="dropdown-item">Account Settings</button>
                  <button className="dropdown-item">Help & Support</button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>Unlock Your Potential</h1>
            <p>Join millions learning exams, upskill careers & grow knowledge</p>
            <button className="cta-btn" onClick={handleTeachClick}>
              Start Learning Today
            </button>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="courses-section">
          <div className="section-header">
            <h2>Featured Courses</h2>
            <button className="view-all-btn">View All →</button>
          </div>

          <div className="courses-grid">
            {courses.map((course) => (
              <div
                key={course.id}
                className="course-card"
                onClick={() => handleCourseClick(course)}
              >
                <div className="course-image">
                  <div className="course-badge">{course.category}</div>
                  <div className="course-level">{course.level}</div>
                </div>
                <div className="course-info">
                  <h3>{course.title}</h3>
                  <div className="course-meta">
                    <span className="students">👥 {course.students.toLocaleString()}</span>
                    <span className="rating">⭐ {course.rating}</span>
                  </div>
                  <button className="enroll-btn">Enroll Now</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modals */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {activeModal.type === "teach" && (
              <div className="teach-modal">
                <button
                  className="modal-close"
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
                <div className="teach-modal-body">
                  <div className="teach-icon">✨</div>
                  <h2>Teach on PrepNexus</h2>
                  <p>Turn what you know into an opportunity and reach millions around the world.</p>
                  <div className="teach-benefits">
                    <div className="benefit">
                      <span className="benefit-icon">💡</span>
                      <span>Share your expertise</span>
                    </div>
                    <div className="benefit">
                      <span className="benefit-icon">💰</span>
                      <span>Earn competitive income</span>
                    </div>
                    <div className="benefit">
                      <span className="benefit-icon">🌍</span>
                      <span>Reach global students</span>
                    </div>
                  </div>
                  <button className="learn-more-btn">Learn More</button>
                </div>
              </div>
            )}

            {activeModal.type === "course" && (
              <div className="course-modal">
                <button
                  className="modal-close"
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
                <div className="course-modal-body">
                  <h2>{activeModal.data.title}</h2>
                  <div className="modal-stats">
                    <div className="stat">
                      <span className="stat-label">Category:</span>
                      <span className="stat-value">{activeModal.data.category}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Level:</span>
                      <span className="stat-value">{activeModal.data.level}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Students:</span>
                      <span className="stat-value">{activeModal.data.students.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Rating:</span>
                      <span className="stat-value">⭐ {activeModal.data.rating}</span>
                    </div>
                  </div>
                  <div className="modal-description">
                    <p>
                      This comprehensive course covers all essential topics for {activeModal.data.title}.
                      Learn from industry experts and practice with real exam questions.
                    </p>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-enroll">Enroll Now</button>
                    <button className="btn-wishlist">Add to Wishlist</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
