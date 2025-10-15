import "./OperatorsPortal.css";

export function OperatorsPortal() {
  return (
    <div className="operators-portal">
      {/* Hero Section */}
      <section className="op-hero">
        <div className="hero-content-wrapper">
          <h1>Launch Your Community Paymaster</h1>
          <p className="hero-subtitle">
            Deploy in 15 minutes. Start earning fees from gasless transactions.
          </p>
          <div className="hero-ctas">
            <a href="/operator/deploy" className="cta-button primary">
              🚀 Deploy Now
            </a>
            <a href="/launch-guide" className="cta-button secondary">
              📖 Launch Guide
            </a>
            <a
              href="https://demo.aastar.io"
              className="cta-button secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              🎮 Try Demo
            </a>
          </div>
        </div>
      </section>

      {/* Why Community Paymaster */}
      <section className="why-section">
        <div className="content-container">
          <h2>Why Launch a Community Paymaster?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3>Earn Service Fees</h3>
              <p>
                Collect 2% service fee on every gasless transaction. The more
                users, the more revenue.
              </p>
              <div className="example-box">
                <div className="example-label">Example:</div>
                <div className="example-calc">
                  1000 txs/day × $0.50 avg × 2% = <strong>$10/day</strong>
                </div>
              </div>
            </div>

            <div className="benefit-card highlight">
              <div className="benefit-icon">🎯</div>
              <h3>Serve Your Community</h3>
              <p>
                Provide gasless transactions for your users, DAO members, or NFT
                holders.
              </p>
              <ul className="benefit-list">
                <li>✓ Custom token requirements (SBT gating)</li>
                <li>✓ Flexible gas token support</li>
                <li>✓ Community-specific pricing</li>
              </ul>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🛡️</div>
              <h3>Full Control & Security</h3>
              <p>
                You own and control your Paymaster. Set your own rules, fees,
                and supported tokens.
              </p>
              <ul className="benefit-list">
                <li>✓ Non-custodial treasury</li>
                <li>✓ Configurable parameters</li>
                <li>✓ Emergency pause function</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works-section">
        <div className="content-container">
          <h2>How It Works</h2>
          <div className="flow-diagram">
            <div className="flow-step">
              <div className="flow-number">1</div>
              <div className="flow-content">
                <h3>Deploy Paymaster</h3>
                <p>
                  Use our factory contract to deploy your PaymasterV4 in one
                  transaction
                </p>
              </div>
            </div>
            <div className="flow-arrow">→</div>

            <div className="flow-step">
              <div className="flow-number">2</div>
              <div className="flow-content">
                <h3>Configure Tokens</h3>
                <p>Add supported SBTs and Gas Tokens (PNT, custom tokens)</p>
              </div>
            </div>
            <div className="flow-arrow">→</div>

            <div className="flow-step">
              <div className="flow-number">3</div>
              <div className="flow-content">
                <h3>Fund Treasury</h3>
                <p>Deposit ETH for gas sponsorship and set service fee rate</p>
              </div>
            </div>
            <div className="flow-arrow">→</div>

            <div className="flow-step">
              <div className="flow-number">4</div>
              <div className="flow-content">
                <h3>Earn Fees</h3>
                <p>Users pay with PNT, you collect service fees in treasury</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Model */}
      <section className="revenue-section">
        <div className="content-container">
          <h2>Revenue Model</h2>
          <div className="revenue-content">
            <div className="revenue-explanation">
              <h3>How You Earn</h3>
              <div className="revenue-formula">
                <div className="formula-item">
                  <span className="formula-label">User Pays:</span>
                  <span className="formula-value">
                    Gas Cost (in PNT) + Service Fee (2%)
                  </span>
                </div>
                <div className="formula-item">
                  <span className="formula-label">You Receive:</span>
                  <span className="formula-value">
                    Service Fee (2% of gas cost)
                  </span>
                </div>
                <div className="formula-item">
                  <span className="formula-label">Network:</span>
                  <span className="formula-value">
                    Gas cost (you sponsor with ETH)
                  </span>
                </div>
              </div>

              <div className="example-transaction">
                <h4>Example Transaction:</h4>
                <div className="tx-breakdown">
                  <div className="tx-line">
                    <span>Gas cost:</span>
                    <span>0.001 ETH (~$2.50)</span>
                  </div>
                  <div className="tx-line">
                    <span>User pays (in PNT):</span>
                    <span>$2.55 (cost + 2% fee)</span>
                  </div>
                  <div className="tx-line highlight">
                    <span>Your revenue:</span>
                    <span>
                      <strong>$0.05</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="revenue-calculator">
              <h3>Revenue Calculator</h3>
              <div className="calculator-card">
                <div className="calc-input">
                  <label>Daily Transactions:</label>
                  <input type="number" defaultValue="1000" id="dailyTxs" />
                </div>
                <div className="calc-input">
                  <label>Avg Gas Cost (USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue="2.50"
                    id="avgGas"
                  />
                </div>
                <div className="calc-input">
                  <label>Service Fee (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue="2"
                    id="feeRate"
                  />
                </div>
                <div className="calc-result">
                  <div className="result-line">
                    <span>Daily Revenue:</span>
                    <span className="result-value">$50.00</span>
                  </div>
                  <div className="result-line">
                    <span>Monthly Revenue:</span>
                    <span className="result-value">$1,500.00</span>
                  </div>
                  <div className="result-line">
                    <span>Yearly Revenue:</span>
                    <span className="result-value">$18,000.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="requirements-section">
        <div className="content-container">
          <h2>What You Need</h2>
          <div className="requirements-grid">
            <div className="req-card">
              <div className="req-icon">💎</div>
              <h3>Initial Investment</h3>
              <ul className="req-list">
                <li>~0.05 ETH for deployment (~$125)</li>
                <li>Treasury ETH for gas sponsorship (start with 0.1 ETH)</li>
                <li>Optional: Custom SBT/Gas Token deployment</li>
              </ul>
            </div>

            <div className="req-card">
              <div className="req-icon">🛠️</div>
              <h3>Technical Skills</h3>
              <ul className="req-list">
                <li>Basic blockchain knowledge</li>
                <li>MetaMask wallet setup</li>
                <li>No coding required (use our UI)</li>
              </ul>
            </div>

            <div className="req-card">
              <div className="req-icon">⏰</div>
              <h3>Time Commitment</h3>
              <ul className="req-list">
                <li>Initial setup: 15-30 minutes</li>
                <li>Maintenance: 1-2 hours/week</li>
                <li>Monitoring treasury balance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="success-section">
        <div className="content-container">
          <h2>Community Paymasters in Action</h2>
          <div className="stories-grid">
            <div className="story-card">
              <div className="story-stats">
                <div className="stat">
                  <div className="stat-value">15K</div>
                  <div className="stat-label">Monthly Txs</div>
                </div>
                <div className="stat">
                  <div className="stat-value">$750</div>
                  <div className="stat-label">Monthly Revenue</div>
                </div>
              </div>
              <h3>🎮 Gaming DAO</h3>
              <p>
                Provides gasless transactions for 5,000+ active players.
                Integrated with their NFT marketplace.
              </p>
            </div>

            <div className="story-card">
              <div className="story-stats">
                <div className="stat">
                  <div className="stat-value">8K</div>
                  <div className="stat-label">Monthly Txs</div>
                </div>
                <div className="stat">
                  <div className="stat-value">$400</div>
                  <div className="stat-label">Monthly Revenue</div>
                </div>
              </div>
              <h3>🖼️ NFT Community</h3>
              <p>
                Serves NFT holders with gasless minting and trading. SBT-gated
                access.
              </p>
            </div>

            <div className="story-card">
              <div className="story-stats">
                <div className="stat">
                  <div className="stat-value">25K</div>
                  <div className="stat-label">Monthly Txs</div>
                </div>
                <div className="stat">
                  <div className="stat-value">$1.2K</div>
                  <div className="stat-label">Monthly Revenue</div>
                </div>
              </div>
              <h3>🏛️ DeFi Protocol</h3>
              <p>
                Enables gasless swaps and staking for their token holders.
                10,000+ users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="op-cta-section">
        <div className="content-container">
          <h2>Ready to Launch?</h2>
          <p>
            Join the decentralized Paymaster network and start earning today
          </p>
          <div className="cta-buttons">
            <a href="/launch-guide" className="cta-button large primary">
              🚀 Launch Your Paymaster
            </a>
            <a href="/explorer" className="cta-button large secondary">
              🔍 Explore Registry
            </a>
          </div>
          <p className="cta-note">
            Questions? Join our{" "}
            <a
              href="https://discord.gg/aastar"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>{" "}
            community
          </p>
        </div>
      </section>
    </div>
  );
}
