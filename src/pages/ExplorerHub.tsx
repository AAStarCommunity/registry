import { useNavigate, useLocation } from "react-router-dom";
import { RegistryExplorer } from "./RegistryExplorer";
import { AnalyticsDashboard } from "./analytics/AnalyticsDashboard";
import { UserGasRecords } from "./analytics/UserGasRecords";
import "./ExplorerHub.css";

type ExplorerView = "explorer" | "dashboard" | "user";

export function ExplorerHub() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current view from URL path
  const getCurrentView = (): ExplorerView => {
    if (location.pathname.includes("/dashboard")) return "dashboard";
    if (location.pathname.includes("/user")) return "user";
    return "explorer";
  };

  const currentView = getCurrentView();

  const switchView = (view: ExplorerView) => {
    switch (view) {
      case "explorer":
        navigate("/explorer");
        break;
      case "dashboard":
        navigate("/explorer/dashboard");
        break;
      case "user":
        navigate("/explorer/user");
        break;
    }
  };

  return (
    <div className="explorer-hub">
      {/* Hero Section */}
      <section className="explorer-hero">
        <div className="hero-content-wrapper">
          <h1>Paymaster Registry Explorer</h1>
          <p className="hero-subtitle">
            Browse registered Paymasters, analyze global statistics, and track
            user gas usage
          </p>
          <div className="hero-ctas">
            <button
              onClick={() => switchView("explorer")}
              className={`cta-button ${currentView === "explorer" ? "primary" : "secondary"}`}
            >
              🔍 Paymaster Registry
            </button>
            <button
              onClick={() => switchView("dashboard")}
              className={`cta-button ${currentView === "dashboard" ? "primary" : "secondary"}`}
            >
              📊 Analytics Dashboard
            </button>
            <button
              onClick={() => switchView("user")}
              className={`cta-button ${currentView === "user" ? "primary" : "secondary"}`}
            >
              👤 User Records
            </button>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <div className="explorer-content">
        {currentView === "explorer" && <RegistryExplorer />}
        {currentView === "dashboard" && <AnalyticsDashboard />}
        {currentView === "user" && <UserGasRecords />}
      </div>
    </div>
  );
}
