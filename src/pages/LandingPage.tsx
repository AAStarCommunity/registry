import { useState, useEffect } from "react";
import "./LandingPage.css";

export function LandingPage() {
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

      {/* How to Launch Paymaster Flow */}
      <section className="launch-flow-section">
        <h1 className="section-title">How to Launch Paymaster</h1>
        <p className="section-subtitle">
          Follow these steps to deploy your community Paymaster and start providing gasless transactions
        </p>

        <div className="flow-container">
          <div className="flow-step">
            <div className="flow-card">
              <div className="flow-icon">🏛️</div>
              <h3 className="flow-title">Register Community</h3>
              <p className="flow-description">
                Register your community on-chain with metadata and governance token
              </p>
              <a href="/register-community" className="flow-link">
                Register →
              </a>
            </div>
            <div className="flow-arrow">→</div>
          </div>

          <div className="flow-step">
            <div className="flow-card">
              <div className="flow-icon">🔗</div>
              <h3 className="flow-title">Bind MySBT</h3>
              <p className="flow-description">
                Deploy your Soul Bound Token for community identity verification
              </p>
              <a href="/bind-sbt" className="flow-link">
                Deploy →
              </a>
            </div>
            <div className="flow-arrow">→</div>
          </div>

          <div className="flow-step">
            <div className="flow-card">
              <div className="flow-icon">💎</div>
              <h3 className="flow-title">Deploy xPNTs</h3>
              <p className="flow-description">
                Create your community gas token for payment abstraction
              </p>
              <a href="/get-xpnts" className="flow-link">
                Deploy →
              </a>
            </div>
            <div className="flow-arrow">→</div>
          </div>

          <div className="flow-step">
            <div className="flow-card highlight">
              <div className="flow-icon">🚀</div>
              <h3 className="flow-title">Launch Paymaster</h3>
              <p className="flow-description">
                Deploy your Paymaster via factory with one-click configuration
              </p>
              <a href="/launch-paymaster" className="flow-link primary">
                Launch →
              </a>
            </div>
          </div>
        </div>

        <div className="flow-note">
          <p>
            <strong>💡 Quick Start:</strong> Already have GToken and resources?
            Use the <a href="/operator/wizard">Deployment Wizard</a> for guided setup.
          </p>
        </div>
      </section>

      {/* Features Cards */}
      <section className="features-section">
        <h1 className="section-title">Why SuperPaymaster?</h1>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3 className="feature-title">True Decentralization</h3>
            <p className="feature-description">
              No censorship. No single point of failure. Community-operated Paymasters
              registered on-chain. Anyone can launch, anyone can use.
            </p>
            <ul className="feature-list">
              <li>✓ No tx censorship in gas payment</li>
              <li>✓ On-chain verification</li>
              <li>✓ Community governance</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌱</div>
            <h3 className="feature-title">Community Sustainability</h3>
            <p className="feature-description">
              Any community can provide gasless services based on their own services or products, get liquidity and long term revenue.
            </p>
            <ul className="feature-list">
              <li>✓ Community-owned services</li>
              <li>✓ Sustainable revenue streams</li>
              <li>✓ Long-term liquidity</li>
            </ul>
          </div>

          <div className="feature-card highlight">
            <div className="feature-icon">💎</div>
            <h3 className="feature-title">Flexible Payment Models</h3>
            <p className="feature-description">
              Pay with any ERC-20 token via PNT (Paymaster Native Token).
              Operators earn fees, users enjoy gasless transactions.
            </p>
            <ul className="feature-list">
              <li>✓ Direct payment mode (pay-per-tx)</li>
              <li>✓ Staking mode (deposit once, use many)</li>
              <li>✓ Custom token support</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3 className="feature-title">Developer Friendly</h3>
            <p className="feature-description">
              ERC-4337 compliant with simple integration. Drop-in solution for
              any dApp. Full TypeScript SDK and React hooks.
            </p>
            <ul className="feature-list">
              <li>✓ 5-minute integration</li>
              <li>✓ UserOp v0.7 compatible</li>
              <li>✓ Comprehensive documentation</li>
            </ul>
          </div>
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
