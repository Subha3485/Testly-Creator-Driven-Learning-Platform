
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import TestPage from "./pages/TestPage";
import HomeDesign from "./pages/HomeDesign";
import HomePage from "./pages/HomePage";
import SolutionPage from "./pages/SolutionPage";
import AdminDashboard from "./admin/AdminDashboard";
import BankingPage from "./pages/BankingPage";
import BankingPracticePage from "./pages/BankingPracticePage";
import BankingPracticeRunner from "./pages/BankingPracticeRunner";
import GatePage from "./pages/GatePage";
import GatePracticePage from "./pages/GatePracticePage";
import FeedPage from "./pages/FeedPage";
import TeacherProfilePage from "./pages/TeacherProfilePage";
import CourseCatalogPage from "./pages/CourseCatalogPage";
import TestSeriesPage from "./pages/TestSeriesPage";
import CommunityPage from "./pages/CommunityPage";
import StudentDashboard from "./pages/StudentDashboard";

function AppShell() {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith("/banking/practice/run/test") || location.pathname.startsWith("/gate/practice/run/test");

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
        <Route path="/" element={<FeedPage />} />
        <Route path="/teachers/:id" element={<TeacherProfilePage />} />
        <Route path="/courses" element={<CourseCatalogPage />} />
        <Route path="/tests" element={<TestSeriesPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/banking/practice/run/test" element={<BankingPracticeRunner />} />
        <Route path="/banking/practice/*" element={<BankingPracticePage />} />
        <Route path="/banking/*" element={<BankingPage />} />
        <Route path="/gate/practice/run/test" element={<BankingPracticeRunner />} />
        <Route path="/gate/practice/*" element={<GatePracticePage />} />
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
