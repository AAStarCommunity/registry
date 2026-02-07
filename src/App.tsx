import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DeveloperPortal } from "./pages/DeveloperPortal";
import { OperatorsPortal } from "./pages/OperatorsPortal";
import { OperationGuide } from "./pages/OperationGuide";
import { ExplorerHub } from "./pages/ExplorerHub";
import { PaymasterDetail } from "./pages/analytics/PaymasterDetail";
import { CommunityDetail } from "./pages/explorer/CommunityDetail";
import { GetSBT } from "./pages/resources/GetSBT";
import { MySBT } from "./pages/resources/MySBT";
import { AdminBatchMint } from "./pages/admin/AdminBatchMint";
import { 
  AdminPortal, 
  ProtocolAdminPage, 
  SuperPaymasterProtocolPage,
  SuperPaymasterAdminPage, 
  PaymasterV4AdminPage 
} from "./pages/v3-admin";
import { GTokenSalePage } from "./pages/v3-admin/GTokenSalePage";
import TermsOfService from "./pages/legal/TermsOfService";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Security from "./pages/legal/Security";
import Contact from "./pages/legal/Contact";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ThemeToggle } from "./components/ThemeToggle";
import { WalletProvider } from "./contexts/WalletContext";
import "./App.css";

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="app">
          <ThemeToggle />
          <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/developer" element={<DeveloperPortal />} />
            <Route path="/operator" element={<OperatorsPortal />} />
            <Route path="/operation-guide" element={<OperationGuide />} />
            {/* Explorer Hub */}
            <Route path="/explorer" element={<ExplorerHub />} />
            <Route path="/explorer/dashboard" element={<ExplorerHub />} />
            <Route path="/explorer/user" element={<ExplorerHub />} />
            <Route path="/explorer/user/:address" element={<ExplorerHub />} />
            <Route
              path="/explorer/community/:address"
              element={<CommunityDetail />}
            />
            {/* Legacy Analytics routes - redirect to Explorer */}
            <Route path="/analytics" element={<ExplorerHub />} />
            <Route path="/analytics/dashboard" element={<ExplorerHub />} />
            <Route path="/analytics/user" element={<ExplorerHub />} />
            <Route path="/analytics/user/:address" element={<ExplorerHub />} />
            <Route path="/paymaster/:address" element={<PaymasterDetail />} />
            {/* User Resources - Keep basic pages */}
            <Route path="/get-sbt" element={<GetSBT />} />
            <Route path="/my-sbt" element={<MySBT />} />
            {/* Admin */}
            <Route path="/admin-batch-mint" element={<AdminBatchMint />} />
            {/* V3 Admin Pages */}
            <Route path="/v3-admin" element={<AdminPortal />} />
            <Route path="/v3-admin/protocol" element={<ProtocolAdminPage />} />
            <Route path="/v3-admin/superpaymaster-protocol" element={<SuperPaymasterProtocolPage />} />
            <Route path="/v3-admin/superpaymaster" element={<SuperPaymasterAdminPage />} />
            <Route path="/v3-admin/paymaster-v4" element={<PaymasterV4AdminPage />} />
            <Route path="/v3-admin/gtoken-market" element={<GTokenSalePage />} />
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
  </WalletProvider>
  );
}

export default App;
