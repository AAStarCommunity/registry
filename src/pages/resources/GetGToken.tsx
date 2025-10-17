/**
 * Get GToken Resource Page
 *
 * Guides users on how to obtain GToken for staking
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentNetworkConfig, isTestnet } from "../../config/networkConfig";
import "./GetGToken.css";

const GetGToken: React.FC = () => {
  const navigate = useNavigate();
  const config = getCurrentNetworkConfig();
  const isTest = isTestnet();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="get-gtoken-page">
      <div className="get-gtoken-container">
        {/* Header */}
        <div className="get-gtoken-header">
          <button onClick={handleGoBack} className="back-button">
            ← Back
          </button>
          <h1>Get GToken</h1>
          <p className="subtitle">
            GToken is required for staking in the SuperPaymaster ecosystem
          </p>
        </div>

        {/* What is GToken Section */}
        <section className="info-section">
          <h2>💎 What is GToken?</h2>
          <p>
            GToken is the governance token of the SuperPaymaster ecosystem, used for:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Staking Requirements</strong>: Stake GToken to become a qualified
              Paymaster operator
            </li>
            <li>
              <strong>Reputation Building</strong>: Higher GToken stake increases your
              reputation score
            </li>
            <li>
              <strong>Governance Participation</strong>: Vote on protocol upgrades and
              parameter changes
            </li>
            <li>
              <strong>Fee Discounts</strong>: Get lower protocol fees with higher stake
            </li>
          </ul>
        </section>

        {/* Contract Information */}
        <section className="info-section">
          <h2>📋 Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Token Name:</span>
              <span className="value">GToken (Governance Token V2)</span>
            </div>
            <div className="info-row">
              <span className="label">Symbol:</span>
              <span className="value">PNTv2</span>
            </div>
            <div className="info-row">
              <span className="label">Network:</span>
              <span className="value">{config.chainName}</span>
            </div>
            <div className="info-row">
              <span className="label">Contract Address:</span>
              <span className="value mono">
                {config.contracts.gToken}
                <a
                  href={`${config.explorerUrl}/address/${config.contracts.gToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Explorer →
                </a>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Minimum Stake:</span>
              <span className="value highlight">
                {config.requirements.minGTokenStake} GToken
              </span>
            </div>
          </div>
        </section>

        {/* How to Get GToken */}
        <section className="info-section">
          <h2>🚀 How to Get GToken?</h2>

          {isTest ? (
            // Testnet Options
            <>
              <div className="method-card recommended">
                <div className="method-header">
                  <h3>Method 1: Faucet (Recommended)</h3>
                  <span className="badge">FREE</span>
                </div>
                <p>Get free testnet GToken from our faucet</p>
                <ul>
                  <li>Instant delivery to your wallet</li>
                  <li>100 GToken per request</li>
                  <li>No gas fees required</li>
                </ul>
                {config.resources.gTokenFaucet ? (
                  <a
                    href={config.resources.gTokenFaucet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-button primary"
                  >
                    Go to GToken Faucet →
                  </a>
                ) : (
                  <p className="coming-soon">Faucet coming soon</p>
                )}
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 2: Test DEX</h3>
                </div>
                <p>Swap testnet ETH for GToken on our test DEX</p>
                <ul>
                  <li>Practice trading before mainnet</li>
                  <li>Fixed exchange rate: 1 ETH = 1000 GToken</li>
                </ul>
                {config.resources.superPaymasterDex ? (
                  <a
                    href={config.resources.superPaymasterDex}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-button secondary"
                  >
                    Go to Test DEX →
                  </a>
                ) : (
                  <p className="coming-soon">DEX coming soon</p>
                )}
              </div>
            </>
          ) : (
            // Mainnet Options
            <>
              <div className="method-card recommended">
                <div className="method-header">
                  <h3>Method 1: Uniswap (Recommended)</h3>
                  <span className="badge">LIQUID</span>
                </div>
                <p>Buy GToken on Uniswap with best liquidity</p>
                <ul>
                  <li>Largest liquidity pool</li>
                  <li>Best price discovery</li>
                  <li>Instant execution</li>
                </ul>
                <a
                  href={config.resources.uniswapGToken}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button primary"
                >
                  Trade on Uniswap →
                </a>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 2: SuperPaymaster DEX</h3>
                </div>
                <p>Swap ETH for GToken on our native DEX</p>
                <ul>
                  <li>Lower fees</li>
                  <li>Direct protocol integration</li>
                  <li>Stake GToken rewards</li>
                </ul>
                <a
                  href={config.resources.superPaymasterDex}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Go to DEX →
                </a>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 3: Community Activities</h3>
                </div>
                <p>Earn GToken through community participation</p>
                <ul>
                  <li>Bug bounty programs</li>
                  <li>Governance participation rewards</li>
                  <li>Community airdrops</li>
                </ul>
                <a
                  href="https://community.superpaymaster.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  View Activities →
                </a>
              </div>
            </>
          )}
        </section>

        {/* Add to Wallet Section */}
        <section className="info-section">
          <h2>🦊 Add GToken to MetaMask</h2>
          <p>Click the button below to add GToken to your MetaMask wallet:</p>
          <button
            className="action-button outline"
            onClick={async () => {
              try {
                await window.ethereum?.request({
                  method: "wallet_watchAsset",
                  params: {
                    type: "ERC20",
                    options: {
                      address: config.contracts.gToken,
                      symbol: "PNTv2",
                      decimals: 18,
                    },
                  },
                });
              } catch (error) {
                console.error("Failed to add token:", error);
                alert("Failed to add token. Please add it manually.");
              }
            }}
          >
            Add GToken to MetaMask
          </button>

          <details className="manual-add">
            <summary>Or add manually</summary>
            <div className="manual-add-content">
              <p>Open MetaMask → Assets → Import tokens, then enter:</p>
              <ul>
                <li>
                  <strong>Token Address:</strong> {config.contracts.gToken}
                </li>
                <li>
                  <strong>Token Symbol:</strong> PNTv2
                </li>
                <li>
                  <strong>Decimals:</strong> 18
                </li>
              </ul>
            </div>
          </details>
        </section>

        {/* FAQ Section */}
        <section className="info-section">
          <h2>❓ Frequently Asked Questions</h2>

          <details className="faq-item">
            <summary>How much GToken do I need to become an operator?</summary>
            <p>
              The minimum stake requirement is{" "}
              <strong>{config.requirements.minGTokenStake} GToken</strong>. However,
              staking more GToken will increase your reputation score and allow you to
              handle larger transaction volumes.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I unstake my GToken later?</summary>
            <p>
              Yes, you can unstake your GToken at any time. However, there is a 7-day
              cooldown period before you can withdraw your tokens to prevent rapid
              changes in operator status.
            </p>
          </details>

          <details className="faq-item">
            <summary>Do I earn rewards for staking GToken?</summary>
            <p>
              Yes! As a Paymaster operator, you earn protocol fees from sponsored
              transactions. The more transactions you process, the more rewards you
              earn. Higher GToken stake also qualifies you for additional governance
              rewards.
            </p>
          </details>

          <details className="faq-item">
            <summary>Is testnet GToken the same as mainnet GToken?</summary>
            <p>
              No, testnet GToken has no real value and is only for testing purposes.
              Mainnet GToken is the real token with actual value. Never transfer
              testnet tokens to mainnet or vice versa.
            </p>
          </details>
        </section>

        {/* Action Buttons */}
        <div className="action-footer">
          <button onClick={handleGoBack} className="action-button secondary">
            ← Back to Deployment
          </button>
          <a
            href={`${config.explorerUrl}/address/${config.contracts.gToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="action-button outline"
          >
            View Contract on Explorer
          </a>
        </div>
      </div>
    </div>
  );
};

export default GetGToken;
