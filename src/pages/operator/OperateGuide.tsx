import React from "react";
import "./OperateGuide.css";

export function OperateGuide() {
  return (
    <div className="operate-guide">
      <div className="guide-header">
        <h1>📚 How to Operate Your Paymaster</h1>
        <p className="guide-subtitle">
          Complete guide to running a successful Paymaster operation
        </p>
      </div>

      {/* Principle */}
      <section className="guide-section">
        <h2>🔬 Principle</h2>
        <div className="section-content">
          <p>
            A Paymaster is a smart contract that sponsors gas fees for users,
            enabling gasless transactions and improving user experience. As a
            Paymaster operator, you:
          </p>
          <ul>
            <li>
              <strong>Sponsor Gas Fees:</strong> Cover transaction costs for users
              meeting your criteria
            </li>
            <li>
              <strong>Set Access Rules:</strong> Define who can use your Paymaster
              (SBT holders, token holders, etc.)
            </li>
            <li>
              <strong>Earn Revenue:</strong> Collect service fees and build community
              reputation
            </li>
          </ul>
        </div>
      </section>

      {/* Resource Investment */}
      <section className="guide-section">
        <h2>💰 Resource Investment</h2>
        <div className="section-content">
          <h3>Required Resources</h3>
          <div className="resource-grid">
            <div className="resource-card">
              <div className="resource-icon">⚡</div>
              <h4>ETH for Gas</h4>
              <p>0.05 - 0.5 ETH</p>
              <span className="resource-desc">
                Initial deposit for sponsoring transactions
              </span>
            </div>
            <div className="resource-card">
              <div className="resource-icon">🔒</div>
              <h4>GToken Stake</h4>
              <p>30 - 100 GToken</p>
              <span className="resource-desc">
                Reputation stake for registry participation
              </span>
            </div>
            <div className="resource-card">
              <div className="resource-icon">🎯</div>
              <h4>aPNTs (Super Mode)</h4>
              <p>1000+ aPNTs</p>
              <span className="resource-desc">
                Advanced PNTs for SuperPaymaster access
              </span>
            </div>
          </div>

          <h3>Ongoing Costs</h3>
          <ul>
            <li>Gas sponsorship: Variable based on usage</li>
            <li>Monitoring and maintenance: Minimal technical overhead</li>
            <li>Parameter optimization: Periodic adjustments</li>
          </ul>
        </div>
      </section>

      {/* Construction & Dependencies */}
      <section className="guide-section">
        <h2>🏗️ Construction & Dependencies</h2>
        <div className="section-content">
          <h3>Technical Setup</h3>
          <div className="dependency-list">
            <div className="dependency-item">
              <span className="dep-number">1</span>
              <div className="dep-content">
                <h4>Deploy Required Contracts</h4>
                <ul>
                  <li>Paymaster Contract (AOA mode) or use SuperPaymaster (Super mode)</li>
                  <li>xPNTs Token (community gas token)</li>
                  <li>SBT Contract (optional, for identity verification)</li>
                </ul>
              </div>
            </div>
            <div className="dependency-item">
              <span className="dep-number">2</span>
              <div className="dep-content">
                <h4>Configure Parameters</h4>
                <ul>
                  <li>Service fee rate (0-10%)</li>
                  <li>Gas price limits and caps</li>
                  <li>Minimum token balance requirements</li>
                </ul>
              </div>
            </div>
            <div className="dependency-item">
              <span className="dep-number">3</span>
              <div className="dep-content">
                <h4>Register & Stake</h4>
                <ul>
                  <li>Deposit ETH to EntryPoint</li>
                  <li>Stake GToken to Registry</li>
                  <li>Submit community metadata</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>Infrastructure Dependencies</h3>
          <ul>
            <li>
              <strong>EntryPoint v0.7:</strong> ERC-4337 account abstraction
              infrastructure
            </li>
            <li>
              <strong>AAStar Registry:</strong> Community discovery and reputation
              system
            </li>
            <li>
              <strong>GToken Staking:</strong> Governance and reputation mechanism
            </li>
          </ul>
        </div>
      </section>

      {/* Expected Returns */}
      <section className="guide-section">
        <h2>📈 Expected Returns</h2>
        <div className="section-content">
          <h3>Revenue Streams</h3>
          <div className="returns-grid">
            <div className="return-card">
              <h4>💵 Service Fees</h4>
              <p>
                Collect 0-10% fee on gas costs sponsored. Typical operators earn
                2-5% per transaction.
              </p>
            </div>
            <div className="return-card">
              <h4>🏆 Reputation</h4>
              <p>
                Build community trust and visibility in the AAStar ecosystem.
                Higher reputation attracts more users.
              </p>
            </div>
            <div className="return-card">
              <h4>👥 User Growth</h4>
              <p>
                Gasless experience reduces friction, increasing user adoption and
                retention for your dApp.
              </p>
            </div>
          </div>

          <h3>ROI Considerations</h3>
          <ul>
            <li>
              <strong>Break-even:</strong> Typically achieved after sponsoring
              100-500 transactions
            </li>
            <li>
              <strong>Profit margin:</strong> 10-30% depending on service fee and
              gas optimization
            </li>
            <li>
              <strong>Long-term value:</strong> Community growth and ecosystem
              participation
            </li>
          </ul>
        </div>
      </section>

      {/* Operation Measures */}
      <section className="guide-section">
        <h2>⚙️ Operation Measures</h2>
        <div className="section-content">
          <h3>1. Parameter Adjustment</h3>
          <p>
            Regularly review and optimize your Paymaster parameters for better
            performance:
          </p>
          <ul>
            <li>
              <strong>Service Fee:</strong> Adjust based on competition and market
              conditions
            </li>
            <li>
              <strong>Gas Limits:</strong> Set appropriate caps to prevent abuse
            </li>
            <li>
              <strong>Token Requirements:</strong> Balance accessibility with
              quality control
            </li>
          </ul>

          <h3>2. Build Small Apps</h3>
          <p>Create applications that leverage your Paymaster:</p>
          <ul>
            <li>Simple dApps showcasing gasless transactions</li>
            <li>Integration examples for developers</li>
            <li>Tools for community members (NFT minting, token swaps, etc.)</li>
          </ul>

          <h3>3. Provide to Developers</h3>
          <p>Attract developers to use your Paymaster:</p>
          <ul>
            <li>
              <strong>Documentation:</strong> Clear integration guides and API
              references
            </li>
            <li>
              <strong>SDK Support:</strong> Use AAStar SDK for easy integration
            </li>
            <li>
              <strong>Support Channels:</strong> Discord, Telegram, or GitHub for
              developer assistance
            </li>
            <li>
              <strong>Incentives:</strong> Offer free gas credits or preferential
              rates for early adopters
            </li>
          </ul>

          <h3>4. Apply for ENS</h3>
          <p>Enhance your Paymaster's discoverability with ENS:</p>
          <ul>
            <li>
              Register an ENS name (e.g., <code>your-community.paymaster.eth</code>)
            </li>
            <li>Link ENS to your Paymaster contract address</li>
            <li>Add metadata: description, logo, social links</li>
            <li>Update Registry profile with ENS name</li>
          </ul>

          <div className="tip-box">
            <div className="tip-icon">💡</div>
            <div className="tip-content">
              <strong>Pro Tip:</strong> Start with conservative parameters and
              gradually optimize based on actual usage patterns. Monitor your ETH
              balance regularly and top up before it runs low.
            </div>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="guide-section resources-section">
        <h2>🔗 Additional Resources</h2>
        <div className="resources-grid">
          <a
            href="https://docs.aastar.io/api#/"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link-card"
          >
            📚 API Documentation
          </a>
          <a
            href="https://demo.aastar.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link-card"
          >
            🎮 Live Demo
          </a>
          <a
            href="/operator/manage"
            className="resource-link-card"
          >
            🔧 Manage Paymaster
          </a>
          <a
            href="http://localhost:5173/launch-tutorial"
            className="resource-link-card"
          >
            📖 Deployment Tutorial
          </a>
        </div>
      </section>

      {/* Back Button */}
      <div className="guide-footer">
        <button
          className="btn-back"
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
        <button
          className="btn-primary"
          onClick={() => (window.location.href = "/operator")}
        >
          Go to Operator Portal →
        </button>
      </div>
    </div>
  );
}
