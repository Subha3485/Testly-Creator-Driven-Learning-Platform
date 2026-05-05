
import TestPage from "./pages/TestPage";
import SolutionPage from "./pages/SolutionPage";
import AdminDashboard from "./admin/AdminDashboard";
import BankingPage from "./pages/BankingPage";
import BankingPracticePage from "./pages/BankingPracticePage";
import BankingPracticeRunner from "./pages/BankingPracticeRunner";

export default function App(){
  const path = window.location.pathname;
  const isAdmin = path.startsWith("/admin");
  const isSolution = path.startsWith("/solution");
  const isBankingPracticeRunner = path.startsWith("/banking/practice/run");
  const isBankingPractice = path.startsWith("/banking/practice") && !isBankingPracticeRunner;
  const isBanking = path.startsWith("/banking") && !isBankingPractice && !isBankingPracticeRunner;

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
      {!isAdmin && !isSolution && !isBanking && !isBankingPracticeRunner ? <TestPage /> : null}
    </div>
  );
}
