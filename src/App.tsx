import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DeveloperPortal } from "./pages/DeveloperPortal";
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
