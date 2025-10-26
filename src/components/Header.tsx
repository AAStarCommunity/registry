import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";
import "./Header.css";

export function Header() {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems: Array<{ path: string; labelKey: string; external?: boolean }> = [
    { path: "/", labelKey: "header.home" },
    { path: "/operator", labelKey: "header.operators" },
    { path: "/explorer", labelKey: "header.explorer" },
    { path: "/developer", labelKey: "header.developers" },
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
                {t(item.labelKey)}
              </a>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? "active" : ""}`}
              >
                {t(item.labelKey)}
              </Link>
            ),
          )}
        </nav>

        <div className="header-actions">
          <LanguageToggle />
          <Link to="/operator/wizard" className="cta-button">
            {t("header.launchPaymaster")}
          </Link>
        </div>
      </div>
    </header>
  );
}
