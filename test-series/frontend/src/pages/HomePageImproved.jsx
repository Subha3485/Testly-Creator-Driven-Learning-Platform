import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "../styles/HomePageImproved.css";

export default function HomePageImproved() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cohortPickerOpen, setCohortPickerOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [practiceSets, setPracticeSets] = useState([]);
  const [practiceSetsLoading, setPracticeSetsLoading] = useState(true);
  const [practiceSetsError, setPracticeSetsError] = useState("");
  const [user] = useState({ name: "Subhadeep Samanta", email: "subhadeep@prepnexus.dev", avatar: "S" });

  const cohortGroups = [
    {
      id: "competitive-exams",
      name: "Competitive Exams",
      icon: "🎯",
      subtitle: "IIT JEE, NEET, ESE, GATE, AE/JE, Olympiad",
      accent: "#6d28d9",
      defaultExamTarget: "JEE",
      cohorts: [
        {
          name: "IIT JEE",
          examTarget: "JEE",
          description: "Physics, chemistry, and math batches with timed test practice.",
          students: "2.8M",
          tests: "160+ tests"
        },
        {
          name: "NEET",
          examTarget: "SSC",
          description: "Medicine-focused concept drills and daily assessment flow.",
          students: "3.1M",
          tests: "140+ tests"
        },
        {
          name: "ESE",
          examTarget: "GATE",
          description: "Engineering aptitude cohorts with subject-wise benchmarking.",
          students: "420K",
          tests: "90+ tests"
        },
        {
          name: "GATE",
          examTarget: "GATE",
          description: "Branch-wise test series, revision plans, and mock exams.",
          students: "1.2M",
          tests: "120+ tests"
        },
        {
          name: "AE/JE",
          examTarget: "GATE",
          description: "Junior engineer focused test packs for core technical topics.",
          students: "610K",
          tests: "78+ tests"
        },
        {
          name: "Olympiad",
          examTarget: "SSC",
          description: "Speed and accuracy cohorts for school-level competitive exams.",
          students: "980K",
          tests: "110+ tests"
        }
      ]
    },
    {
      id: "ias",
      name: "IAS",
      icon: "🏛️",
      subtitle: "UPSC, State PSC",
      accent: "#0f766e",
      defaultExamTarget: "UPSC",
      cohorts: [
        {
          name: "UPSC CSE",
          examTarget: "UPSC",
          description: "Prelims, mains, and answer-writing cohorts for civil services.",
          students: "1.9M",
          tests: "100+ tests"
        },
        {
          name: "State PSC",
          examTarget: "UPSC",
          description: "State-level coaching tracks built around current affairs and GS.",
          students: "870K",
          tests: "72+ tests"
        }
      ]
    },
    {
      id: "school-prep",
      name: "School Preparation",
      icon: "🏫",
      subtitle: "Foundation (Class 6-10), CuriosJr (1st - 8th)",
      accent: "#ea580c",
      defaultExamTarget: "SSC",
      cohorts: [
        {
          name: "Foundation",
          examTarget: "SSC",
          description: "Core concepts, practice sheets, and chapter tests for classes 6-10.",
          students: "2.4M",
          tests: "95+ tests"
        },
        {
          name: "CuriosJr",
          examTarget: "SSC",
          description: "Early learning cohorts for classes 1-8 with guided practice.",
          students: "1.1M",
          tests: "64+ tests"
        }
      ]
    },
    {
      id: "govt-exams",
      name: "Govt Exam",
      icon: "🪖",
      subtitle: "Judiciary, SSC, Defence, Teaching, Railway",
      accent: "#1d4ed8",
      defaultExamTarget: "SSC",
      cohorts: [
        {
          name: "SSC",
          examTarget: "SSC",
          description: "Tiered exam preparation with daily quizzes and full-length mocks.",
          students: "5.2M",
          tests: "180+ tests"
        },
        {
          name: "Railway",
          examTarget: "SSC",
          description: "Reasoning, arithmetic, and general awareness practice tracks.",
          students: "2.2M",
          tests: "88+ tests"
        },
        {
          name: "Defence",
          examTarget: "SSC",
          description: "Targeted drills for aptitude, GK, and speed-based questions.",
          students: "930K",
          tests: "70+ tests"
        }
      ]
    },
    {
      id: "ug-pg",
      name: "UG & PG Entrance Exams",
      icon: "🎓",
      subtitle: "MBA, IPMAT, IIT JAM, LAW, UGC NET",
      accent: "#7c3aed",
      defaultExamTarget: "JEE",
      cohorts: [
        {
          name: "MBA Entrance",
          examTarget: "SSC",
          description: "Aptitude, reasoning, and verbal sections for entrance prep.",
          students: "1.4M",
          tests: "60+ tests"
        },
        {
          name: "Law",
          examTarget: "SSC",
          description: "Reading comprehension and legal reasoning style practice.",
          students: "380K",
          tests: "44+ tests"
        },
        {
          name: "CUET / UGC NET",
          examTarget: "SSC",
          description: "Mixed cohorts for undergraduate and postgraduate entrance exams.",
          students: "760K",
          tests: "81+ tests"
        }
      ]
    },
    {
      id: "finance",
      name: "Finance",
      icon: "💰",
      subtitle: "CA, CS, Finance Courses, ACCA, CFA",
      accent: "#be185d",
      defaultExamTarget: "BANKING",
      cohorts: [
        {
          name: "Banking",
          examTarget: "BANKING",
          description: "Quant, reasoning, and English practice for bank exams.",
          students: "3.8M",
          tests: "130+ tests"
        },
        {
          name: "CA / ACCA",
          examTarget: "BANKING",
          description: "Commerce-focused cohorts with concept tests and revision drills.",
          students: "1.2M",
          tests: "54+ tests"
        }
      ]
    }
  ];

  const [selectedGroupId, setSelectedGroupId] = useState(cohortGroups[0].id);
  const selectedGroup = useMemo(
    () => cohortGroups.find((group) => group.id === selectedGroupId) || cohortGroups[0],
    [selectedGroupId]
  );

  const examToCourseCategoryMap = {
    SSC: ["SSC"],
    UPSC: ["UPSC"],
    GATE: ["GATE"],
    BANKING: ["Banking", "CA", "ACCA"],
    JEE: ["GATE", "SSC"]
  };

  const mainMenuItems = [
    { id: 1, label: "Dashboard", icon: "📊", path: "/dashboard" },
    { id: 2, label: "My Learning", icon: "📚", path: "/courses" },
    { id: 3, label: "Practice Tests", icon: "✏️", path: "/" },
    { id: 4, label: "My Performance", icon: "📈", path: "/dashboard?view=performance" },
  ];

  const secondaryMenuItems = [
    { id: 5, label: "Wishlist", icon: "❤️", path: "/courses" },
    { id: 6, label: "Downloads", icon: "⬇️", path: "/tests" },
    { id: 7, label: "Settings", icon: "⚙️", path: "/dashboard" },
  ];

  const featuredCourses = [
    { id: 1, title: "SSC CGL Complete 2024", category: "SSC", level: "Beginner", students: 12400, rating: 4.8, price: "₹399", badge: "Popular", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%236366f1' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3ESSC CGL%3C/text%3E%3C/svg%3E" },
    { id: 2, title: "Bank PO Master Guide", category: "Banking", level: "Intermediate", students: 8900, rating: 4.9, price: "₹499", badge: "Top Rated", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%238b5cf6' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EBanking PO%3C/text%3E%3C/svg%3E" },
    { id: 3, title: "GATE CSE 2025 Bootcamp", category: "GATE", level: "Advanced", students: 5200, rating: 4.7, price: "₹599", badge: "New", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%2306b6d4' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EGATE CSE%3C/text%3E%3C/svg%3E" },
    { id: 4, title: "UPSC Prelims FastTrack", category: "UPSC", level: "Advanced", students: 3800, rating: 4.6, price: "₹799", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ec4899' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EUPSC%3C/text%3E%3C/svg%3E" },
    { id: 5, title: "CA Foundation Crash", category: "CA", level: "Beginner", students: 2100, rating: 4.8, price: "₹349", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23f59e0b' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3ECA Foundation%3C/text%3E%3C/svg%3E" },
    { id: 6, title: "ACCA F1 Complete", category: "ACCA", level: "Intermediate", students: 1600, rating: 4.7, price: "₹459", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%2310b981' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EACCA F1%3C/text%3E%3C/svg%3E" },
    { id: 7, title: "Banking Quantitative", category: "Banking", level: "Intermediate", students: 7200, rating: 4.8, price: "₹449", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%238b5cf6' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3EQuantitative%3C/text%3E%3C/svg%3E" },
    { id: 8, title: "SSC English Mastery", category: "SSC", level: "Beginner", students: 9800, rating: 4.9, price: "₹299", badge: "Trending", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%236366f1' width='300' height='150'/%3E%3Ctext x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3ESSC English%3C/text%3E%3C/svg%3E" },
    { id: 9, title: "Unacademy SSC CGL Crash Course", category: "SSC", level: "Beginner", students: 68000, rating: 4.5, price: "Free", badge: "YouTube", source: "YouTube", url: "https://www.youtube.com/c/Unacademy", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ef4444' width='300' height='150'/%3E%3Ctext x='50%' y='30%' font-size='28' fill='white' text-anchor='middle' font-weight='bold'%3EYouTube%3C/text%3E%3Ctext x='50%' y='90%' font-size='16' fill='white' text-anchor='middle'%3EUnacademy%3C/text%3E%3C/svg%3E" },
    { id: 10, title: "Bankers Adda Banking Aptitude Playlist", category: "Banking", level: "Intermediate", students: 54000, rating: 4.6, price: "Free", badge: "YouTube", source: "YouTube", url: "https://www.youtube.com/c/BankersAdda", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ef4444' width='300' height='150'/%3E%3Ctext x='50%' y='30%' font-size='28' fill='white' text-anchor='middle' font-weight='bold'%3EYouTube%3C/text%3E%3Ctext x='50%' y='90%' font-size='16' fill='white' text-anchor='middle'%3EBankers Adda%3C/text%3E%3C/svg%3E" },
    { id: 11, title: "Gate Academy CSE Concept Series", category: "GATE", level: "Advanced", students: 47000, rating: 4.7, price: "Free", badge: "YouTube", source: "YouTube", url: "https://www.youtube.com/c/GateAcademy", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ef4444' width='300' height='150'/%3E%3Ctext x='50%' y='30%' font-size='28' fill='white' text-anchor='middle' font-weight='bold'%3EYouTube%3C/text%3E%3Ctext x='50%' y='90%' font-size='16' fill='white' text-anchor='middle'%3EGate Academy%3C/text%3E%3C/svg%3E" },
    { id: 12, title: "Study IQ UPSC Strategy Sessions", category: "UPSC", level: "Advanced", students: 62000, rating: 4.6, price: "Free", badge: "YouTube", source: "YouTube", url: "https://www.youtube.com/c/StudyIQ", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ef4444' width='300' height='150'/%3E%3Ctext x='50%' y='30%' font-size='28' fill='white' text-anchor='middle' font-weight='bold'%3EYouTube%3C/text%3E%3Ctext x='50%' y='90%' font-size='16' fill='white' text-anchor='middle'%3EStudy IQ%3C/text%3E%3C/svg%3E" },
    { id: 13, title: "Rachna Ranade CA Foundation Series", category: "CA", level: "Beginner", students: 35000, rating: 4.8, price: "Free", badge: "YouTube", source: "YouTube", url: "https://www.youtube.com/c/RachnaRanade", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ef4444' width='300' height='150'/%3E%3Ctext x='50%' y='30%' font-size='28' fill='white' text-anchor='middle' font-weight='bold'%3EYouTube%3C/text%3E%3Ctext x='50%' y='90%' font-size='14' fill='white' text-anchor='middle'%3ERachna Ranade%3C/text%3E%3C/svg%3E" },
    { id: 14, title: "ACCA Mentor F1 YouTube Study Plan", category: "ACCA", level: "Intermediate", students: 21000, rating: 4.5, price: "Free", badge: "YouTube", source: "YouTube", url: "https://www.youtube.com/c/ACCAMentor", thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='150'%3E%3Crect fill='%23ef4444' width='300' height='150'/%3E%3Ctext x='50%' y='30%' font-size='28' fill='white' text-anchor='middle' font-weight='bold'%3EYouTube%3C/text%3E%3Ctext x='50%' y='90%' font-size='16' fill='white' text-anchor='middle'%3EACCA Mentor%3C/text%3E%3C/svg%3E" },
  ];

  const recommendedCourses = useMemo(() => {
    if (!selectedCohort?.examTarget) {
      return featuredCourses;
    }

    const allowedCategories = examToCourseCategoryMap[selectedCohort.examTarget] || [selectedCohort.examTarget];
    const filteredCourses = featuredCourses.filter((course) =>
      allowedCategories.some((category) => String(course.category).toUpperCase() === String(category).toUpperCase())
    );

    return filteredCourses.length > 0 ? filteredCourses : featuredCourses;
  }, [selectedCohort, featuredCourses]);

  useEffect(() => {
    let cancelled = false;

    async function loadPracticeSets() {
      setPracticeSetsLoading(true);
      setPracticeSetsError("");
      try {
        const response = await api.getBankingPracticeSets();
        if (cancelled) {
          return;
        }
        setPracticeSets(response.sets || []);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPracticeSetsError(error.message || "Failed to load practice tests");
        setPracticeSets([]);
      } finally {
        if (!cancelled) {
          setPracticeSetsLoading(false);
        }
      }
    }

    loadPracticeSets();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tests?examTarget=${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedGroupId(category.id);
  };

  const selectCohort = (cohort) => {
    setCohortPickerOpen(false);
    setSelectedCohort(cohort);
  };

  const selectDefaultCohort = () => {
    const defaultCohort = selectedGroup.cohorts.find((cohort) => cohort.examTarget === selectedGroup.defaultExamTarget) || selectedGroup.cohorts[0];
    if (!defaultCohort) {
      return;
    }
    selectCohort(defaultCohort);
  };

  const handleCourseClick = (course) => {
    setActiveModal({ type: "course", data: course });
  };

  const handleTeachClick = () => {
    setActiveModal({ type: "teach" });
  };

  const navigateToMenu = (path) => {
    if (!path) {
      return;
    }
    navigate(path);
  };

  const isMenuPathActive = (path) => {
    if (!path) {
      return false;
    }

    const cleanPath = path.split("?")[0];
    return location.pathname === cleanPath || location.pathname.startsWith(`${cleanPath}/`);
  };

  return (
    <div className="home-improved">
      {/* Sidebar */}
      <aside className={`sidebar-improved ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header-improved">
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "☰" : "→"}
          </button>
          {sidebarOpen && <div className="sidebar-title">PrepNexus</div>}
        </div>

        <nav className="sidebar-nav-improved">
          <div className="menu-section">
            {mainMenuItems.map((item) => (
              <button
                key={item.id}
                className={`menu-item ${isMenuPathActive(item.path) ? "active" : ""}`}
                title={item.label}
                onClick={() => navigateToMenu(item.path)}
              >
                <span className="menu-icon">{item.icon}</span>
                {sidebarOpen && <span className="menu-label">{item.label}</span>}
              </button>
            ))}
          </div>

          <div className="menu-divider"></div>

          <div className="menu-section">
            <div className="section-label">{sidebarOpen && "EXAMS"}</div>
            {cohortGroups.map((exam) => (
              <button
                key={exam.id}
                className="exam-item"
                onClick={() => handleCategoryClick(exam)}
                title={exam.name}
              >
                <span className="exam-icon">{exam.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="exam-name">{exam.name}</span>
                    <span className="exam-badge">{exam.cohorts.length}</span>
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="menu-divider"></div>

          <div className="menu-section">
            {secondaryMenuItems.map((item) => (
              <button
                key={item.id}
                className={`menu-item ${isMenuPathActive(item.path) ? "active" : ""}`}
                title={item.label}
                onClick={() => navigateToMenu(item.path)}
              >
                <span className="menu-icon">{item.icon}</span>
                {sidebarOpen && <span className="menu-label">{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-improved">
        {/* Top Navigation Bar */}
        <div className="top-nav-improved">
          <div className="top-nav-left">
            <button
              type="button"
              className={`cohort-launch-btn ${cohortPickerOpen ? "active" : ""}`}
              onClick={() => setCohortPickerOpen((prev) => !prev)}
            >
              {selectedCohort ? selectedCohort.name : "All Courses"}
              <span className="cohort-launch-btn__caret">{cohortPickerOpen ? "▴" : "▾"}</span>
            </button>

            <form onSubmit={handleSearch} className="search-bar-improved">
              <input
                type="text"
                placeholder="Search courses, exams, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-improved"
              />
              <button type="submit" className="search-submit-btn">🔍</button>
            </form>
          </div>

          <div className="top-nav-actions">
            <button className="teach-btn-improved" onClick={handleTeachClick}>
              ✨ Teach
            </button>

            <div className="user-menu-wrapper">
              <button
                className="user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={user.name}
              >
                <div className="avatar">{user.avatar}</div>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown-improved">
                  <div className="dropdown-user-info">
                    <div className="dropdown-avatar">{user.avatar}</div>
                    <div>
                      <div className="dropdown-name">{user.name}</div>
                      <div className="dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-link">My Profile</button>
                  <button className="dropdown-link">Account Settings</button>
                  <button className="dropdown-link">Billing</button>
                  <button className="dropdown-link">Help & Support</button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-link danger">Sign Out</button>
                </div>
              )}
            </div>
          </div>

          {cohortPickerOpen && (
            <section className="cohort-selector cohort-selector--popover">
              <div className="section-header-improved cohort-selector__header">
                <div>
                  <div className="section-label-inline">PW-style cohort picker</div>
                  <h2 className="section-title">Pick the exam cohort first</h2>
                  <p className="section-copy">Choose a goal on the left and select a cohort to personalize recommendations.</p>
                </div>
                <button className="view-all-improved" type="button" onClick={selectDefaultCohort}>
                  Use highlighted cohort
                </button>
              </div>

              <div className="cohort-selector__layout">
                <div className="cohort-selector__groups">
                  {cohortGroups.map((group) => {
                    const isActive = group.id === selectedGroup.id;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        className={`cohort-group ${isActive ? "active" : ""}`}
                        onClick={() => handleCategoryClick(group)}
                        style={{ borderLeftColor: group.accent }}
                      >
                        <div className="cohort-group__copy">
                          <strong>{group.name}</strong>
                          <p>{group.subtitle}</p>
                        </div>
                        <span className="cohort-group__arrow">→</span>
                      </button>
                    );
                  })}
                </div>

                <div className="cohort-selector__panel">
                  <div className="cohort-panel__head">
                    <div>
                      <div className="label">Selected exam bucket</div>
                      <h3>{selectedGroup.name}</h3>
                      <p>{selectedGroup.subtitle}</p>
                    </div>
                    <div className="cohort-panel__badge">{selectedGroup.cohorts.length} cohorts</div>
                  </div>

                  <div className="cohort-cards-grid">
                    {selectedGroup.cohorts.map((cohort) => (
                      <article key={cohort.name} className="cohort-card" onClick={() => selectCohort(cohort)}>
                        <div className="cohort-card__top">
                          <div>
                            <h4>{cohort.name}</h4>
                            <p>{cohort.description}</p>
                          </div>
                          <span className="cohort-card__chevron">→</span>
                        </div>
                        <div className="cohort-card__stats">
                          <span>{cohort.students} learners</span>
                          <span>{cohort.tests}</span>
                        </div>
                        <button
                          type="button"
                          className="cohort-card__cta"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectCohort(cohort);
                          }}
                        >
                          Select cohort
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Content */}
        <div className="content-improved">
          {/* Hero Banner */}
          <section className="hero-banner-improved">
            <div className="hero-content-improved">
              <div className="hero-kicker">Targeted cohort selection</div>
              <h1>Choose the exam your student is targeting.</h1>
              <p>Browse PW-style exam groups, choose a cohort, and get recommendations for that exam path.</p>
            </div>
          </section>

          {/* Featured Courses */}
          <section className="featured-section">
            <div className="section-header-improved">
              <h2 className="section-title">{selectedCohort ? `Recommended for ${selectedCohort.name}` : "Trending Courses"}</h2>
              <button className="view-all-improved">View All →</button>
            </div>

            <div className="courses-grid-improved">
              {recommendedCourses.map((course) => (
                <div
                  key={course.id}
                  className="course-card-improved"
                  onClick={() => handleCourseClick(course)}
                >
                  {course.badge && <div className="course-badge-improved">{course.badge}</div>}

                  <div className="course-header-improved">
                    {course.thumbnail && (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="course-thumbnail-image"
                      />
                    )}
                    <div className="course-tags-overlay">
                      <div className="course-category-tag">{course.category}</div>
                      <div className="course-level-tag">{course.level}</div>
                    </div>
                  </div>

                  <h3 className="course-title-improved">{course.title}</h3>

                  <div className="course-meta-improved">
                    <span className="meta-item">⭐ {course.rating}</span>
                    <span className="meta-item">👥 {course.students.toLocaleString()}</span>
                  </div>

                  <div className="course-footer-improved">
                    <span className="price-improved">{course.price}</span>
                    <button className="enroll-btn-improved">Enroll</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="featured-section">
            <div className="section-block">
              <div className="section-header-improved">
                <h2 className="section-title">Practice Tests</h2>
                <p>{practiceSetsLoading ? "Loading tests..." : `${practiceSets.length} practice sets`}</p>
              </div>

              {practiceSetsError && (
                <div className="card" style={{ padding: 18, background: "#ffecec", color: "#8a1f1f" }}>
                  {practiceSetsError}
                </div>
              )}

              {!practiceSetsLoading && !practiceSetsError && practiceSets.length === 0 && (
                <div className="card" style={{ padding: 18 }}>
                  No practice sets available right now.
                </div>
              )}

              {practiceSetsLoading && (
                <div className="card" style={{ padding: 18 }}>
                  Loading practice tests...
                </div>
              )}

              <div className="series-grid">
                {practiceSets.map((set) => (
                  <article key={set.id || set.topic} className="series-card">
                    <strong>{set.topic}</strong>
                    <p>{set.questionCount} questions</p>
                    <div className="series-card__footer">
                      <span>{set.title}</span>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => navigate(`/tests?setId=${encodeURIComponent(set.id || set.topic)}`)}
                      >
                        Start
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="cta-section-improved">
            <div className="cta-content">
              <h2>Want to teach on PrepNexus?</h2>
              <p>Share your expertise and earn while helping students succeed</p>
              <button className="cta-btn-improved" onClick={handleTeachClick}>
                Start Teaching Today
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Modals */}
      {activeModal && (
        <div className="modal-backdrop-improved" onClick={() => setActiveModal(null)}>
          <div className="modal-box-improved" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>

            {activeModal.type === "teach" && (
              <div className="teach-modal-improved">
                <div className="teach-icon">✨</div>
                <h2>Teach on PrepNexus</h2>
                <p className="modal-subtitle">Turn your knowledge into opportunity</p>

                <div className="teach-benefits-list">
                  <div className="benefit-card">
                    <span className="benefit-icon">💡</span>
                    <h4>Share Expertise</h4>
                    <p>Create courses on topics you know well</p>
                  </div>
                  <div className="benefit-card">
                    <span className="benefit-icon">💰</span>
                    <h4>Earn Income</h4>
                    <p>Competitive revenue share on every enrollment</p>
                  </div>
                  <div className="benefit-card">
                    <span className="benefit-icon">🌍</span>
                    <h4>Reach Global</h4>
                    <p>Connect with millions of learners worldwide</p>
                  </div>
                </div>

                <button className="modal-cta-btn">Get Started</button>
              </div>
            )}

            {activeModal.type === "course" && (
              <div className="course-modal-improved">
                <div className="modal-course-header">
                  <h2>{activeModal.data.title}</h2>
                  <p className="modal-category">{activeModal.data.category}</p>
                </div>

                <div className="modal-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Level</span>
                    <span className="stat-value">{activeModal.data.level}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Students</span>
                    <span className="stat-value">{activeModal.data.students.toLocaleString()}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Rating</span>
                    <span className="stat-value">⭐ {activeModal.data.rating}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Price</span>
                    <span className="stat-value">{activeModal.data.price}</span>
                  </div>
                </div>

                <p className="modal-description">
                  Comprehensive course covering all essential topics with practice tests, assignments, and expert guidance. Learn from best educators and track your progress in real-time.
                </p>

                <div className="modal-actions">
                  {activeModal.data.url ? (
                    <a
                      className="btn-primary-improved"
                      href={activeModal.data.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Watch on YouTube
                    </a>
                  ) : (
                    <button className="btn-primary-improved">Enroll Now</button>
                  )}
                  <button className="btn-secondary-improved">Add to Wishlist</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
