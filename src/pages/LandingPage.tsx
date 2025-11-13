import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "../components/LanguageToggle";
import "./LandingPage.css";

export function LandingPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalPaymasters: 0,
    totalTransactions: 0,
    totalGasSaved: 0,
  });

  useEffect(() => {
    // Animated counter effect
    const animateValue = (
      start: number,
      end: number,
      duration: number,
      setter: (val: number) => void,
    ) => {
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(start + (end - start) * progress);
        setter(current);
        if (progress === 1) clearInterval(timer);
      }, 16);
    };

    // Simulate loading statistics
    setTimeout(() => {
      animateValue(0, 156, 2000, (val) =>
        setStats((prev) => ({ ...prev, totalPaymasters: val })),
      );
      animateValue(0, 89234, 2500, (val) =>
        setStats((prev) => ({ ...prev, totalTransactions: val })),
      );
      animateValue(0, 4567, 2000, (val) =>
        setStats((prev) => ({ ...prev, totalGasSaved: val })),
      );
    }, 500);
  }, []);

  return (
    <div className="landing-page">
      {/* Language Toggle */}
      <div className="language-toggle-container">
        <LanguageToggle />
      </div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              SuperPaymaster
              <span className="gradient-text">Registry</span>
            </h1>
            <p className="hero-subtitle">
              Decentralized Gasless Transaction Ethereum Infra
            </p>
            <p className="hero-description gradient-text">
              Community-driven Paymaster network enabling seamless gasless transaction with Web3 UX without ETH. Deploy Now!
            </p>
            <div className="hero-ctas">
              <a href="/operator" className="cta-button primary">
                🏪 Operator Portal
              </a>
              <a href="/explorer" className="cta-button secondary">
                🔍 Explore Registry
              </a>
              <a href="/developer" className="cta-button secondary">
                👨‍💻 Developer Portal
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/gas_station_animation.svg"
              alt="SuperPaymaster Animation"
              className="hero-animation"
            />
          </div>
        </div>
      </section>

      {/* Live Statistics */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{stats.totalPaymasters}</div>
            <div className="stat-label">Community Paymasters</div>
            <div className="stat-icon">🏪</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.totalTransactions.toLocaleString()}
            </div>
            <div className="stat-label">Gasless Transactions</div>
            <div className="stat-icon">⚡</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              ${stats.totalGasSaved.toLocaleString()}
            </div>
            <div className="stat-label">Gas Fees Saved</div>
            <div className="stat-icon">💰</div>
          </div>
        </div>
      </section>

      {/* Features Cards */}
      <section className="features-section">
        <h1 className="section-title">{t('landing.whySuperPaymaster')}</h1>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3 className="feature-title">{t('landing.trueDecentralization')}</h3>
            <p className="feature-description">
              {t('landing.trueDecentralizationDesc')}
            </p>
            <ul className="feature-list">
              <li>{t('landing.noTxCensorship')}</li>
              <li>{t('landing.onChainVerification')}</li>
              <li>{t('landing.communityGovernance')}</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌱</div>
            <h3 className="feature-title">{t('landing.communitySustainability')}</h3>
            <p className="feature-description">
              {t('landing.communitySustainabilityDesc')}
            </p>
            <ul className="feature-list">
              <li>{t('landing.communityOwnedServices')}</li>
              <li>{t('landing.sustainableRevenueStreams')}</li>
              <li>{t('landing.longTermLiquidity')}</li>
            </ul>
          </div>

          <div className="feature-card highlight">
            <div className="feature-icon">💎</div>
            <h3 className="feature-title">{t('landing.flexiblePaymentModels')}</h3>
            <p className="feature-description">
              {t('landing.flexiblePaymentModelsDesc')}
            </p>
            <ul className="feature-list">
              <li>{t('landing.directPaymentMode')}</li>
              <li>{t('landing.stakingMode')}</li>
              <li>{t('landing.customTokenSupport')}</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3 className="feature-title">{t('landing.developerFriendly')}</h3>
            <p className="feature-description">
              {t('landing.developerFriendlyDesc')}
            </p>
            <ul className="feature-list">
              <li>{t('landing.fiveMinuteIntegration')}</li>
              <li>{t('landing.userOpCompatible')}</li>
              <li>{t('landing.comprehensiveDocumentation')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to Launch Paymaster Flow */}
      <section className="launch-flow-section">
        <h1 className="section-title">{t('landing.howToLaunch')}</h1>
        <p className="section-subtitle">
          {t('landing.useLaunchWizard')}
        </p>
        <div className="wizard-cta">
          <a href="/operator/wizard" className="wizard-launch-btn">
            {t('landing.launchYourPaymaster')}
          </a>
        </div>

        <div className="flow-container">
          <div className="flow-step">
            <div className="flow-card">
              <div className="flow-icon">🎫</div>
              <h3 className="flow-title">{t('getGToken.title')}</h3>
              <p className="flow-description">
                {t('getGToken.description')}
              </p>
              <a href="/get-gtoken" className="flow-link">
                {t('common.get')} →
              </a>
            </div>
            <div className="flow-arrow">→</div>
          </div>

          <div className="flow-step">
            <div className="flow-card">
              <div className="flow-icon">🏛️</div>
              <h3 className="flow-title">{t('registerCommunity.title')}</h3>
              <p className="flow-description">
                {t('registerCommunity.subtitle')}
              </p>
              <a href="/register-community" className="flow-link">
                {t('registerCommunity.button.register')} →
              </a>
            </div>
            <div className="flow-arrow">→</div>
          </div>

          <div className="flow-step">
            <div className="flow-card">
              <div className="flow-icon">💎</div>
              <h3 className="flow-title">{t('deployXPNTs.title')}</h3>
              <p className="flow-description">
                {t('deployXPNTs.description')}
              </p>
              <a href="/get-xpnts" className="flow-link">
                {t('deployXPNTs.action')} →
              </a>
            </div>
            <div className="flow-arrow">→</div>
          </div>

          <div className="flow-step">
            <div className="flow-card highlight">
              <div className="flow-icon">🚀</div>
              <h3 className="flow-title">{t('launchPaymaster.title')}</h3>
              <p className="flow-description">
                {t('launchPaymaster.description')}
              </p>
              <a href="/launch-paymaster" className="flow-link primary">
                {t('launchPaymaster.action')} →
              </a>
            </div>
          </div>
        </div>

        <div className="flow-note">
          <p>
            <strong>{t('landing.quickStart')}</strong> {t('landing.quickStartText')}
            <a href="/operator/wizard">{t('landing.deploymentWizard')}</a> {t('landing.deploymentWizardText')}
          </p>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Build the Future?</h2>
          <p className="cta-description">
            Join the SuperPaymaster ecosystem. Launch your Paymaster, integrate
            gasless transactions, or explore the registry to find the perfect
            solution for your dApp.
          </p>
          <div className="cta-buttons">
            <a href="http://localhost:5173/operator/wizard" className="cta-button large primary">
              🚀 Launch Your Paymaster
            </a>
            <a
              href="https://demo.aastar.io"
              className="cta-button large secondary"
            >
              🎮 Try Live Demo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>SuperPaymaster</h4>
            <p>Decentralized gasless transaction infrastructure</p>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="/docs">Documentation</a>
              </li>
              <li>
                <a href="/developer">Developer Portal</a>
              </li>
              <li>
                <a href="/launch-tutorial">Launch Tutorial</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <ul>
              <li>
                <a href="https://github.com/AAStarCommunity">GitHub</a>
              </li>
              <li>
                <a href="https://twitter.com/AAStarCommunity">Twitter</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="/terms">Terms of Service</a>
              </li>
              <li>
                <a href="/privacy">Privacy Policy</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 SuperPaymaster. Built with ❤️ by AAStar Community.</p>
        </div>
      </footer>
    </div>
  );
}
