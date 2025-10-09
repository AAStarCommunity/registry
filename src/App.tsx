import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DeveloperPortal } from "./pages/DeveloperPortal";
import { OperatorsPortal } from "./pages/OperatorsPortal";
import { LaunchGuide } from "./pages/LaunchGuide";
import { RegistryExplorer } from "./pages/RegistryExplorer";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ThemeToggle } from "./components/ThemeToggle";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <ThemeToggle />
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/developer" element={<DeveloperPortal />} />
            <Route path="/operator" element={<OperatorsPortal />} />
            <Route path="/launch-guide" element={<LaunchGuide />} />
            <Route path="/explorer" element={<RegistryExplorer />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
