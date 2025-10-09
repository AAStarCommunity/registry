import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DeveloperPortal } from "./pages/DeveloperPortal";
import { OperatorsPortal } from "./pages/OperatorsPortal";
import { ThemeToggle } from "./components/ThemeToggle";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <ThemeToggle />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/developer" element={<DeveloperPortal />} />
          <Route path="/operator" element={<OperatorsPortal />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
