
import TestPage from "./pages/TestPage";
import HomeDesign from "./pages/HomeDesign";
import HomePage from "./pages/HomePage";
import SolutionPage from "./pages/SolutionPage";
import AdminDashboard from "./admin/AdminDashboard";
import BankingPage from "./pages/BankingPage";
import BankingPracticePage from "./pages/BankingPracticePage";
import BankingPracticeRunner from "./pages/BankingPracticeRunner";

export default function App(){
  const path = window.location.pathname;
  const search = window.location.search;
  const isAdmin = path.startsWith("/admin");
  const isSolution = path.startsWith("/solution");
  const isBankingPracticeRunner = path.startsWith("/banking/practice/run/test");
  const isBankingPracticeLanding = path === "/banking/practice/run";
  const isBankingPractice = path.startsWith("/banking/practice") && !isBankingPracticeRunner && !isBankingPracticeLanding;
  const isBanking = path.startsWith("/banking") && !isBankingPractice && !isBankingPracticeRunner;
  const isTest = search.includes("testId");

  return (
    <div className={`page ${isBankingPracticeRunner ? 'page--fullscreen' : ''}`}>
      {!isBankingPracticeRunner && (
        <header className="header">
          <div>
            <div className="label">AI + Community Exam Prep MVP</div>
            <div className="brand">PrepNexus Test Platform</div>
          </div>
          <nav className="nav">
            <button
              className={!isAdmin && !isSolution && !isBanking ? "active" : ""}
              onClick={() => window.location.assign("/")}
              type="button"
            >
              Student
            </button>
            <button
              className={isBanking ? "active" : ""}
              onClick={() => window.location.assign("/banking")}
              type="button"
            >
              Banking
            </button>
            <button
              className={isAdmin ? "active" : ""}
              onClick={() => window.location.assign("/admin")}
              type="button"
            >
              Admin
            </button>
          </nav>
        </header>
      )}

      {isAdmin ? <AdminDashboard /> : null}
      {isSolution ? <SolutionPage /> : null}
      {isBankingPracticeRunner ? <BankingPracticeRunner /> : null}
      {isBankingPractice ? <BankingPracticePage /> : null}
      {isBanking ? <BankingPage /> : null}
      {!isAdmin && !isSolution && !isBanking && !isBankingPracticeRunner && path === "/" && !isTest ? <HomeDesign /> : null}
      {isBankingPracticeLanding ? <HomePage /> : null}
      {!isAdmin && !isSolution && !isBanking && !isBankingPracticeRunner && isTest ? <TestPage /> : null}
    </div>
  );
}
