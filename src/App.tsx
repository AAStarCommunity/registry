import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DeveloperPortal } from "./pages/DeveloperPortal";
import { OperatorsPortal } from "./pages/OperatorsPortal";
import { LaunchTutorial } from "./pages/LaunchTutorial";
import { ExplorerHub } from "./pages/ExplorerHub";
import { PaymasterDetail } from "./pages/analytics/PaymasterDetail";
import { DeployWizard } from "./pages/operator/DeployWizard";
import { ManagePaymasterFull } from "./pages/operator/ManagePaymasterFull";
import GetGToken from "./pages/resources/GetGToken";
import GetPNTs from "./pages/resources/GetPNTs";
import { GetSBT } from "./pages/resources/GetSBT";
import { GetXPNTs } from "./pages/resources/GetXPNTs";
import TermsOfService from "./pages/legal/TermsOfService";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Security from "./pages/legal/Security";
import Contact from "./pages/legal/Contact";
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
            <Route path="/operator/wizard" element={<DeployWizard />} />
            <Route path="/operator/manage" element={<ManagePaymasterFull />} />
            <Route path="/launch-guide" element={<LaunchTutorial />} />
            <Route path="/launch-tutorial" element={<LaunchTutorial />} />
            <Route path="/demo" element={<Navigate to="/launch-tutorial" replace />} />

            {/* Explorer Hub - with 3 sub-views */}
            <Route path="/explorer" element={<ExplorerHub />} />
            <Route path="/explorer/dashboard" element={<ExplorerHub />} />
            <Route path="/explorer/user" element={<ExplorerHub />} />
            <Route path="/explorer/user/:address" element={<ExplorerHub />} />

            {/* Legacy Analytics routes - redirect to Explorer */}
            <Route path="/analytics" element={<ExplorerHub />} />
            <Route path="/analytics/dashboard" element={<ExplorerHub />} />
            <Route path="/analytics/user" element={<ExplorerHub />} />
            <Route path="/analytics/user/:address" element={<ExplorerHub />} />

            <Route path="/paymaster/:address" element={<PaymasterDetail />} />
            <Route path="/get-gtoken" element={<GetGToken />} />
            <Route path="/get-pnts" element={<GetPNTs />} />
            <Route path="/get-sbt" element={<GetSBT />} />
            <Route path="/get-xpnts" element={<GetXPNTs />} />

            {/* Legal Pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/security" element={<Security />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
