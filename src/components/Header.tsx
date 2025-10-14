import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import "./Header.css";

export function Header() {
  const location = useLocation();
  const [analyticsDropdownOpen, setAnalyticsDropdownOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/developer", label: "Developers" },
    { path: "/operator", label: "Operators" },
    { path: "/explorer", label: "Explorer" },
  ];

  const analyticsItems = [
    {
      path: "/analytics/dashboard",
      label: "📊 Dashboard",
      description: "Global statistics",
    },
    {
      path: "/analytics/user",
      label: "🔍 User Records",
      description: "Query user gas usage",
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <span className="logo-main">SuperPaymaster</span>
            <span className="logo-sub">Registry</span>
          </div>
        </Link>

        <nav className="main-nav">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ),
          )}

          {/* Analytics Dropdown */}
          <div
            className="nav-dropdown"
            onMouseEnter={() => setAnalyticsDropdownOpen(true)}
            onMouseLeave={() => setAnalyticsDropdownOpen(false)}
          >
            <button
              className={`nav-link dropdown-trigger ${isActive("/analytics") ? "active" : ""}`}
              onClick={() => setAnalyticsDropdownOpen(!analyticsDropdownOpen)}
            >
              Analytics ▾
            </button>
            {analyticsDropdownOpen && (
              <div className="dropdown-menu">
                {analyticsItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`dropdown-item ${location.pathname === item.path ? "active" : ""}`}
                    onClick={() => setAnalyticsDropdownOpen(false)}
                  >
                    <div className="dropdown-item-label">{item.label}</div>
                    <div className="dropdown-item-description">
                      {item.description}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="header-actions">
          <a
            href="https://github.com/AAStarCommunity"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <Link to="/launch-guide" className="cta-button">
            Launch Paymaster
          </Link>
        </div>
      </div>
    </header>
  );
}
