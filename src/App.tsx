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
import { TestStep1 } from "./pages/operator/deploy-v2/TestStep1";
import { TestStep2 } from "./pages/operator/deploy-v2/TestStep2";
import GetGToken from "./pages/resources/GetGToken";
import GetPNTs from "./pages/resources/GetPNTs";
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
            <Route path="/test-step1" element={<TestStep1 />} />
            <Route path="/test-step2" element={<TestStep2 />} />
            <Route path="/get-gtoken" element={<GetGToken />} />
            <Route path="/get-pnts" element={<GetPNTs />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
