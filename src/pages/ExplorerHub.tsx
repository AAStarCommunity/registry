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
      {/* Navigation Tabs */}
      <div className="explorer-nav-tabs">
        <button
          className={`explorer-tab ${currentView === "explorer" ? "active" : ""}`}
          onClick={() => switchView("explorer")}
        >
          <span className="tab-icon">🔍</span>
          <div className="tab-content">
            <span className="tab-label">Paymaster Explorer</span>
            <span className="tab-description">Browse registered Paymasters</span>
          </div>
        </button>

        <button
          className={`explorer-tab ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => switchView("dashboard")}
        >
          <span className="tab-icon">📊</span>
          <div className="tab-content">
            <span className="tab-label">Analytics Dashboard</span>
            <span className="tab-description">Global statistics & trends</span>
          </div>
        </button>

        <button
          className={`explorer-tab ${currentView === "user" ? "active" : ""}`}
          onClick={() => switchView("user")}
        >
          <span className="tab-icon">👤</span>
          <div className="tab-content">
            <span className="tab-label">User Records</span>
            <span className="tab-description">Query user gas usage</span>
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="explorer-content">
        {currentView === "explorer" && <RegistryExplorer />}
        {currentView === "dashboard" && <AnalyticsDashboard />}
        {currentView === "user" && <UserGasRecords />}
      </div>
    </div>
  );
}
