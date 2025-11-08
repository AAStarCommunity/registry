import { useState } from "react";
import { RegistryExplorer } from "./RegistryExplorer";
import { AnalyticsDashboard } from "./analytics/AnalyticsDashboard";
import { UserGasRecords } from "./analytics/UserGasRecords";
import "./ExplorerHub.css";

type ExplorerView = "communities" | "members" | "paymasters" | "dashboard" | "user";

export function ExplorerHub() {
  const [activeView, setActiveView] = useState<ExplorerView>("communities");

  return (
    <div className="explorer-hub">
      {/* Hero Section */}
      <section className="explorer-hero">
        <div className="hero-content-wrapper">
          <h1>Registry Explorer</h1>
          <p className="hero-subtitle">
            Browse registered communities, paymasters, members, and analyze statistics
          </p>
          <div className="hero-ctas">
            <button
              onClick={() => setActiveView("communities")}
              className={`cta-button ${activeView === "communities" ? "primary" : "secondary"}`}
            >
              🔍 Community Registry
            </button>
            <button
              onClick={() => setActiveView("members")}
              className={`cta-button ${activeView === "members" ? "primary" : "secondary"}`}
            >
              👥 Community Users Registry
            </button>
            <button
              onClick={() => setActiveView("paymasters")}
              className={`cta-button ${activeView === "paymasters" ? "primary" : "secondary"}`}
            >
              💳 Paymaster Registry
            </button>
            <button
              onClick={() => setActiveView("dashboard")}
              className={`cta-button ${activeView === "dashboard" ? "primary" : "secondary"}`}
            >
              📊 Paymaster Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveView("user")}
              className={`cta-button ${activeView === "user" ? "primary" : "secondary"}`}
            >
              👤 User Records
            </button>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <div className="explorer-content">
        {(activeView === "communities" || activeView === "members" || activeView === "paymasters") && (
          <RegistryExplorer initialTab={activeView} />
        )}
        {activeView === "dashboard" && <AnalyticsDashboard />}
        {activeView === "user" && <UserGasRecords />}
      </div>
    </div>
  );
}
