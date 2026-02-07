import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { useWallet } from "../contexts/WalletContext";
import { useRegistry } from "../hooks/useRegistry";
import "./Header.css";

export function Header() {
  const location = useLocation();
  const { t } = useTranslation();
  const { address, isConnected, connect } = useWallet();
  const { clearCache } = useRegistry(); // For refresh button

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
          <NetworkSwitcher />
          
          <button 
            className="icon-button refresh-btn" 
            onClick={clearCache} 
            title="Force Refresh Data"
            style={{ fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}
          >
            🔄
          </button>

          <LanguageToggle />
          {isConnected ? (
            <div className="wallet-info">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          ) : (
            <button onClick={connect} className="connect-button">
              Connect Wallet
            </button>
          )}
          <Link to="/v3-admin" className="cta-button">
            Admin Portal
          </Link>
        </div>
      </div>
    </header>
  );
}
