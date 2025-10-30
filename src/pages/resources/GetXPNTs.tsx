/**
 * Get xPNTs Resource Page
 *
 * Guides users on how to obtain and use xPNTs (Extended Points Token)
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentNetworkConfig, isTestnet } from "../../config/networkConfig";
import "./GetXPNTs.css";

const GetXPNTs: React.FC = () => {
  const navigate = useNavigate();
  const config = getCurrentNetworkConfig();
  const isTest = isTestnet();

  const factoryAddress = import.meta.env.VITE_XPNTS_FACTORY_ADDRESS || "0xC2AFEA0F736403E7e61D3F7C7c6b4E5E63B5cab6";

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="get-xpnts-page">
      <div className="get-xpnts-container">
        {/* Header */}
        <div className="get-xpnts-header">
          <button onClick={handleGoBack} className="back-button">
            ← Back
          </button>
          <h1>Get xPNTs</h1>
          <p className="subtitle">
            Extended Points Tokens - Community-branded tokens with gasless operations
          </p>
        </div>

        {/* What is xPNTs Section */}
        <section className="info-section">
          <h2>💎 What are xPNTs?</h2>
          <p>
            xPNTs (Extended Points Token) are community points tokens designed for gasless operations in the SuperPaymaster ecosystem:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Auto-Approval System</strong>: Pre-approved for SuperPaymaster and factory operations
            </li>
            <li>
              <strong>Gasless Support</strong>: Native integration with Account Abstraction
            </li>
            <li>
              <strong>Community Branding</strong>: Custom name, symbol, and community metadata
            </li>
            <li>
              <strong>Flexible Exchange Rate</strong>: Configurable conversion rate with aPNTs
            </li>
            <li>
              <strong>Mint & Burn</strong>: Community owners can manage token supply
            </li>
          </ul>
        </section>

        {/* Factory Information */}
        <section className="info-section">
          <h2>📋 xPNTs Factory Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Factory Address:</span>
              <span className="value mono">
                {factoryAddress}
                <a
                  href={`${config.explorerUrl}/address/${factoryAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Explorer →
                </a>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Network:</span>
              <span className="value">{config.chainName}</span>
            </div>
            <div className="info-row">
              <span className="label">Deploy Fee:</span>
              <span className="value highlight">Free (Gas Only)</span>
            </div>
            <div className="info-row">
              <span className="label">Token Standard:</span>
              <span className="value">ERC-20 Extended</span>
            </div>
            <div className="info-row">
              <span className="label">Default Exchange Rate:</span>
              <span className="value">1:1 with aPNTs</span>
            </div>
          </div>
        </section>

        {/* How to Get xPNTs */}
        <section className="info-section">
          <h2>🚀 How to Get xPNTs?</h2>

          {isTest ? (
            // Testnet Options
            <>
              <div className="method-card recommended">
                <div className="method-header">
                  <h3>Method 1: Deploy Your Own (Recommended)</h3>
                  <span className="badge">FREE</span>
                </div>
                <p>Create your community's xPNTs token in minutes</p>
                <ul>
                  <li>Custom branding (name, symbol, ENS)</li>
                  <li>Configurable exchange rate</li>
                  <li>Auto-approved for gasless operations</li>
                  <li>Community owner controls</li>
                </ul>
                <button
                  className="action-button primary"
                  onClick={() => navigate("/get-xpnts/deploy")}
                >
                  Deploy xPNTs Token →
                </button>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 2: Buy from Community</h3>
                </div>
                <p>Purchase xPNTs tokens from existing communities</p>
                <ul>
                  <li>Exchange rate set by community</li>
                  <li>Instant delivery</li>
                  <li>Support community growth</li>
                </ul>
                <button
                  className="action-button secondary"
                  onClick={() => navigate("/communities")}
                >
                  Browse Communities →
                </button>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 3: Convert from aPNTs</h3>
                </div>
                <p>Swap your aPNTs for community xPNTs</p>
                <ul>
                  <li>Dynamic exchange rate (configured per community)</li>
                  <li>Direct conversion in SuperPaymaster</li>
                  <li>No intermediary fees</li>
                </ul>
                <a
                  href="https://shop.aastar.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Get aPNTs First →
                </a>
              </div>
            </>
          ) : (
            // Mainnet Options
            <>
              <div className="method-card recommended">
                <div className="method-header">
                  <h3>Method 1: Deploy Your Community Token</h3>
                  <span className="badge">BEST FOR COMMUNITIES</span>
                </div>
                <p>Launch your community's branded points token</p>
                <ul>
                  <li>Full customization and control</li>
                  <li>Integrated with SuperPaymaster ecosystem</li>
                  <li>Built-in gasless operation support</li>
                </ul>
                <button
                  className="action-button primary"
                  onClick={() => navigate("/get-xpnts/deploy")}
                >
                  Deploy xPNTs Token →
                </button>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 2: Community Marketplace</h3>
                </div>
                <p>Buy xPNTs from active communities</p>
                <ul>
                  <li>Discover thriving communities</li>
                  <li>Market-driven pricing</li>
                  <li>Instant access to community benefits</li>
                </ul>
                <button
                  className="action-button secondary"
                  onClick={() => navigate("/communities")}
                >
                  Explore Communities →
                </button>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 3: Earn Through Participation</h3>
                </div>
                <p>Receive xPNTs by contributing to communities</p>
                <ul>
                  <li>Community rewards programs</li>
                  <li>Governance participation</li>
                  <li>Activity-based airdrops</li>
                </ul>
                <a
                  href="https://community.superpaymaster.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Join Communities →
                </a>
              </div>
            </>
          )}
        </section>

        {/* Add to Wallet Section */}
        <section className="info-section">
          <h2>🦊 Add xPNTs to MetaMask</h2>
          <p>After deploying or receiving xPNTs, add them to your MetaMask wallet:</p>
          <details className="manual-add">
            <summary>How to add xPNTs manually</summary>
            <div className="manual-add-content">
              <p>Open MetaMask → Assets → Import tokens, then enter:</p>
              <ul>
                <li>
                  <strong>Token Address:</strong> Your xPNTs contract address
                </li>
                <li>
                  <strong>Token Symbol:</strong> Your custom symbol (e.g., xMYC)
                </li>
                <li>
                  <strong>Decimals:</strong> 18
                </li>
              </ul>
              <p style={{ marginTop: "1rem", color: "#667eea", fontWeight: 600 }}>
                💡 Tip: The deployment page will show a button to add your token automatically!
              </p>
            </div>
          </details>
        </section>

        {/* FAQ Section */}
        <section className="info-section">
          <h2>❓ Frequently Asked Questions</h2>

          <details className="faq-item">
            <summary>What's the difference between xPNTs and aPNTs?</summary>
            <p>
              <strong>xPNTs</strong> are community-branded tokens that can be exchanged for <strong>aPNTs</strong> (Abstract Points).
              aPNTs are the base currency in SuperPaymaster used to pay for gas. Each xPNTs token has a configurable
              exchange rate with aPNTs (default 1:1). This allows communities to create their own branded points
              while maintaining compatibility with the gas payment system.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I customize the exchange rate?</summary>
            <p>
              Yes! When deploying your xPNTs token, you can set a custom exchange rate. For example:
              <ul style={{ marginTop: "0.5rem" }}>
                <li>1:1 ratio: 1 aPNTs = 1 xPNTs (default)</li>
                <li>2:1 ratio: 1 aPNTs = 2 xPNTs (community bonus)</li>
                <li>0.5:1 ratio: 1 aPNTs = 0.5 xPNTs (premium token)</li>
              </ul>
              Community owners can update this rate later as needed.
            </p>
          </details>

          <details className="faq-item">
            <summary>What is AOA vs AOA+ mode?</summary>
            <p>
              When deploying xPNTs, you choose the paymaster mode:
              <br /><br />
              <strong>AOA+ Mode (Recommended)</strong>: Uses the shared SuperPaymaster V2. Simple setup,
              no additional paymaster deployment needed. Best for most communities.
              <br /><br />
              <strong>AOA Mode</strong>: Deploy your own PaymasterV4. Full control over gas sponsorship,
              custom fee structures, and independent treasury. Best for advanced operators.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I mint more xPNTs tokens later?</summary>
            <p>
              Yes! As the community owner, you have full control to mint additional xPNTs tokens or burn existing ones.
              This flexibility allows you to manage your community's token economy, reward members, or adjust supply
              based on community needs.
            </p>
          </details>

          <details className="faq-item">
            <summary>Is there a deployment fee?</summary>
            <p>
              No deployment fee! You only pay the gas cost for the transaction (typically a few cents on Sepolia testnet,
              or a few dollars on mainnet depending on gas prices). The xPNTs Factory is completely free to use.
            </p>
          </details>

          <details className="faq-item">
            <summary>How do gasless operations work?</summary>
            <p>
              xPNTs tokens are pre-approved for gasless operations. When users deposit xPNTs into SuperPaymaster,
              they're automatically converted to aPNTs which are used to sponsor gas fees. This means users can
              interact with your dApp without holding ETH, using their community tokens instead!
            </p>
          </details>
        </section>

        {/* Action Buttons */}
        <div className="action-footer">
          <button onClick={handleGoBack} className="action-button secondary">
            ← Back
          </button>
          <button
            onClick={() => navigate("/get-xpnts/deploy")}
            className="action-button primary"
          >
            Deploy Your xPNTs →
          </button>
          <a
            href={`${config.explorerUrl}/address/${factoryAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button outline"
          >
            View Factory on Explorer
          </a>
        </div>
      </div>
    </div>
  );
};

export default GetXPNTs;
