
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import TestPage from "./pages/TestPage";
import HomeDesign from "./pages/HomeDesign";
import HomePage from "./pages/HomePage";
import HomePageImproved from "./pages/HomePageImproved";
import SolutionPage from "./pages/SolutionPage";
import AdminDashboard from "./admin/AdminDashboard";
import BankingPage from "./pages/BankingPage";
import GatePage from "./pages/GatePage";
import FeedPage from "./pages/FeedPage";
import TeacherProfilePage from "./pages/TeacherProfilePage";
import CourseCatalogPage from "./pages/CourseCatalogPage";
import CommunityPage from "./pages/CommunityPage";
import StudentDashboard from "./pages/StudentDashboard";

function LegacyPracticeRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const topic = params.get("topic") || "";
  const setId = params.get("setId") || params.get("testId") || "";
  const mode = params.get("mode") || "practice";
  const defaultExam = location.pathname.startsWith("/gate/practice") ? "GATE" : "BANKING";

  const nextQuery = new URLSearchParams();
  if (topic) nextQuery.set("topic", topic);
  if (setId) nextQuery.set("setId", setId);
  if (mode) nextQuery.set("mode", mode);
  nextQuery.set("examTarget", defaultExam);

  return <Navigate to={`/tests?${nextQuery.toString()}`} replace />;
}

function AppShell() {
  const location = useLocation();
  const hideHeader = location.pathname === "/";

  return (
    <div className={`page ${hideHeader ? 'page--fullscreen' : ''}`}>
      {!hideHeader && (
        <header className="header">
          <div>
            <div className="label">Creator-Driven Learning Ecosystem</div>
            <div className="brand">PrepNexus</div>
          </div>
          <nav className="nav">
            <NavLink to="/" end>Feed</NavLink>
            <NavLink to="/courses">Courses</NavLink>
            <NavLink to="/tests">Tests</NavLink>
            <NavLink to="/community">Community</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/banking">Banking</NavLink>
            <NavLink to="/gate">GATE</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
        </header>
      )}

      <Routes>
        <Route path="/" element={<HomePageImproved />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/teachers/:id" element={<TeacherProfilePage />} />
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route path="/tests" element={<TestPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/banking/practice/run/test" element={<LegacyPracticeRedirect />} />
        <Route path="/banking/practice/*" element={<LegacyPracticeRedirect />} />
        <Route path="/banking/*" element={<BankingPage />} />
        <Route path="/gate/practice/run/test" element={<LegacyPracticeRedirect />} />
        <Route path="/gate/practice/*" element={<LegacyPracticeRedirect />} />
        <Route path="/gate/*" element={<GatePage />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/solution/*" element={<SolutionPage />} />
        <Route path="/home-design" element={<HomeDesign />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
