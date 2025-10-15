import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DeveloperPortal } from "./pages/DeveloperPortal";
import { OperatorsPortal } from "./pages/OperatorsPortal";
import { LaunchTutorial } from "./pages/LaunchTutorial";
import { RegistryExplorer } from "./pages/RegistryExplorer";
import { AnalyticsDashboard } from "./pages/analytics/AnalyticsDashboard";
import { UserGasRecords } from "./pages/analytics/UserGasRecords";
import { PaymasterDetail } from "./pages/analytics/PaymasterDetail";
import { OperatorPortal } from "./pages/operator/OperatorPortal";
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
            <Route path="/operator/deploy" element={<OperatorPortal />} />
            <Route path="/launch-guide" element={<LaunchTutorial />} />
            <Route path="/launch-tutorial" element={<LaunchTutorial />} />
            <Route path="/explorer" element={<RegistryExplorer />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route
              path="/analytics/dashboard"
              element={<AnalyticsDashboard />}
            />
            <Route path="/analytics/user" element={<UserGasRecords />} />
            <Route
              path="/analytics/user/:address"
              element={<UserGasRecords />}
            />
            <Route path="/paymaster/:address" element={<PaymasterDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
