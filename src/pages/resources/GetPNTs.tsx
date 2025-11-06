/**
 * Get PNTs Resource Page
 *
 * Guides users on how to obtain PNTs (Points Token) for deposits
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentNetworkConfig, isTestnet } from "../../config/networkConfig";
import "./GetPNTs.css";

const GetPNTs: React.FC = () => {
  const navigate = useNavigate();
  const config = getCurrentNetworkConfig();
  const isTest = isTestnet();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="get-pnts-page">
      <div className="get-pnts-container">
        {/* Header */}
        <div className="get-pnts-header">
          <button onClick={handleGoBack} className="back-button">
            ← Back
          </button>
          <h1>Get aPNTs(for Community Operators)</h1>
          <p className="subtitle">
            aPNTs (AAStar Points Token) are used to pay for gas in the SuperPaymaster ecosystem AOA+ mode.
          </p>
        </div>

        {/* What is aPNTs Section */}
        <section className="info-section">
          <h2>💰 What is aPNTs?</h2>
          <p>
            aPNTs (AAStar Points Token) are the utility tokens in the SuperPaymaster eco, used for:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Gas Payment</strong>: Operator Users pay gas fees with aPNTs instead of ETH
            </li>
            <li>
              <strong>Fast Stake Flow Deposit</strong>: Operators can deposit aPNTs for quick setup
            </li>
            <li>
              <strong>Protocol Operations</strong>: Seamless cross-chain conversion
            </li>
            <li>
              <strong>Lower Barriers</strong>: Easier onboarding without large ETH holdings and asset fragments.
            </li>
          </ul>
        </section>

        {/* Contract Information */}
        <section className="info-section">
          <h2>📋 Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Token Name:</span>
              <span className="value">AAStar aPNTss</span>
            </div>
            <div className="info-row">
              <span className="label">Symbol:</span>
              <span className="value">aPNTs</span>
            </div>
            <div className="info-row">
              <span className="label">Network:</span>
              <span className="value">{config.chainName}</span>
            </div>
            <div className="info-row">
              <span className="label">Contract Address:</span>
              <span className="value mono">
                {config.contracts.aPNTs}
                <a
                  href={`${config.explorerUrl}/address/${config.contracts.aPNTs}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Explorer →
                </a>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Minimum Deposit:</span>
              <span className="value highlight">
                {config.requirements.minPntDeposit} aPNTs
              </span>
            </div>
          </div>
        </section>

        {/* How to Get aPNTss */}
        <section className="info-section">
          <h2>🚀 How to Get aPNTss?</h2>

          {isTest ? (
            // Testnet Options
            <>
              <div className="method-card recommended">
                <div className="method-header">
                  <h3>Method 1: Faucet (Recommended)</h3>
                  <span className="badge">FREE</span>
                </div>
                <p>Get free testnet aPNTss from our faucet</p>
                <ul>
                  <li>Instant delivery to your wallet</li>
                  <li>1000 aPNTs per request</li>
                  <li>No gas fees required</li>
                </ul>
                {config.resources.pntFaucet ? (
                  <a
                    href={config.resources.pntFaucet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-button primary"
                  >
                    Go to aPNTs Faucet →
                  </a>
                ) : (
                  <p className="coming-soon">Faucet coming soon</p>
                )}
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 2: Buy aPNTs from Shops</h3>
                </div>
                <p>Buy your aPNTss Token from our Web3 Shops</p>
                <ul>
                  <li>1 aPNTs = 0.02U (testnet rate, dynamic)</li>
                </ul>
                <a
                  href="https://shop.aastar.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Buy aPNTs from Shops →
                </a>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 3: Get aPNTs from DEX</h3>
                </div>
                <p>Buy aPNTs with ETH, USDC, USDT or xaPNTss</p>
                <ul>
                  <li>Practice trading before mainnet</li>
                </ul>
                <a
                  href="https://dex.aastar.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Go to DEX →
                </a>
              </div>
            </>
          ) : (
            // Mainnet Options
            <>
              <div className="method-card recommended">
                <div className="method-header">
                  <h3>Method 1: Exchange GToken (Recommended)</h3>
                  <span className="badge">BEST RATE</span>
                </div>
                <p>Swap your GToken for aPNTss with best exchange rate</p>
                <ul>
                  <li>Dynamic rate based on protocol reserves</li>
                  <li>No slippage</li>
                  <li>Auto-approved to Paymaster</li>
                </ul>
                <a
                  href={config.resources.superPaymasterDex}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button primary"
                >
                  Exchange GToken →
                </a>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 2: SuperPaymaster Pool</h3>
                </div>
                <p>Buy aPNTss directly from the protocol liquidity pool</p>
                <ul>
                  <li>Pay with ETH or stablecoins</li>
                  <li>Market-rate pricing</li>
                  <li>Lower fees than DEXs</li>
                </ul>
                <a
                  href={config.resources.superPaymasterDex}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Buy from Pool →
                </a>
              </div>

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 3: Community Rewards</h3>
                </div>
                <p>Earn aPNTss through community participation</p>
                <ul>
                  <li>Referral rewards</li>
                  <li>Liquidity provider incentives</li>
                  <li>Community airdrops</li>
                </ul>
                <a
                  href="https://community.superpaymaster.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  View Rewards →
                </a>
              </div>
            </>
          )}
        </section>

        {/* Add to Wallet Section */}
        <section className="info-section">
          <h2>🦊 Add aPNTs to MetaMask</h2>
          <p>Click the button below to add aPNTs to your MetaMask wallet:</p>
          <button
            className="action-button outline"
            onClick={async () => {
              try {
                await window.ethereum?.request({
                  method: "wallet_watchAsset",
                  params: {
                    type: "ERC20",
                    options: {
                      address: config.contracts.aPNTs,
                      symbol: "aPNTs",
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
            Add aPNTs to MetaMask
          </button>

          <details className="manual-add">
            <summary>Or add manually</summary>
            <div className="manual-add-content">
              <p>Open MetaMask → Assets → Import tokens, then enter:</p>
              <ul>
                <li>
                  <strong>Token Address:</strong> {config.contracts.pntToken}
                </li>
                <li>
                  <strong>Token Symbol:</strong> aPNTsv2
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
            <summary>How much aPNTs do I need for Fast Stake Flow?</summary>
            <p>
              The minimum deposit requirement is{" "}
              <strong>{config.requirements.minPntDeposit} aPNTs</strong>. This amount
              will be used to sponsor gas fees for user operations. The protocol will
              automatically convert aPNTs to ETH as needed for gas payments.
            </p>
          </details>

          <details className="faq-item">
            <summary>What's the exchange rate between aPNTs and ETH?</summary>
            <p>
              The aPNTs is endores by AAStar's GAS SPONSOR SERVICE PROMISE. The exchange rate is dynamic and managed by the protocol's reserve
              system. On testnet, the default rate is approximately aPNTs=0.02U.
              On mainnet, rates are determined by market conditions and protocol
              reserves to ensure fair pricing.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I withdraw my deposited aPNTs later?</summary>
            <p>
              Yes! As a Paymaster operator, you can withdraw unused aPNTs from your
              deposit at any time through the Operator Portal dashboard. There will be a 7 days lockup period for settlement, but you must maintain the minimum deposit balance to keep
              your Paymaster operational.
            </p>
          </details>

          <details className="faq-item">
            <summary>What happens if I run out of aPNTs?</summary>
            <p>
              If your aPNTs balance falls below the minimum threshold, your Paymaster
              will stop sponsoring transactions until you top up. You'll receive
              notifications before this happens so you can maintain service continuity.
              Consider setting up auto-refill for uninterrupted operation.
            </p>
          </details>

          <details className="faq-item">
            <summary>Is aPNTs the same as GToken?</summary>
            <p>
              No, they serve different purposes. <strong>GToken</strong> is the
              governance token used for staking and protocol participation.{" "}
              <strong>aPNTs</strong> is the utility token used for gas payments and
              deposits. You need both for the Fast Stake Flow: GToken for governance
              stake and aPNTs for gas deposit.
            </p>
          </details>
        </section>

        {/* Action Buttons */}
        <div className="action-footer">
          <button onClick={handleGoBack} className="action-button secondary">
            ← Back to Deployment
          </button>
          <a
            href={`${config.explorerUrl}/address/${config.contracts.pntToken}`}
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

export default GetPNTs;
