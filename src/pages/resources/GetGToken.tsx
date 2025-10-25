/**
 * Get GToken Resource Page
 *
 * Guides users on how to obtain GToken for staking
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig, isTestnet } from "../../config/networkConfig";
import GTokenStakingABI from "../../contracts/GTokenStaking.json";
import "./GetGToken.css";

// ERC20 ABI (只包含需要的函数)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const GetGToken: React.FC = () => {
  const navigate = useNavigate();
  const config = getCurrentNetworkConfig();
  const isTest = isTestnet();

  // Wallet & Contract state
  const [account, setAccount] = useState<string>("");
  const [gtokenBalance, setGtokenBalance] = useState<string>("0");
  const [stGtokenBalance, setStGtokenBalance] = useState<string>("0");
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [isStaking, setIsStaking] = useState(false);
  const [txHash, setTxHash] = useState<string>("");

  const handleGoBack = () => {
    navigate(-1);
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await loadBalances(accounts[0]);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Load balances
  const loadBalances = async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Load GToken balance
      const gtokenContract = new ethers.Contract(
        config.contracts.gToken,
        ERC20_ABI,
        provider
      );
      const gtBalance = await gtokenContract.balanceOf(userAddress);
      setGtokenBalance(ethers.formatEther(gtBalance));

      // Load stGToken balance
      const stakingContract = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI.abi,
        provider
      );
      const stGtBalance = await stakingContract.balanceOf(userAddress);
      setStGtokenBalance(ethers.formatEther(stGtBalance));
    } catch (error) {
      console.error("Failed to load balances:", error);
    }
  };

  // Handle stake
  const handleStake = async () => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert("Please enter a valid stake amount!");
      return;
    }

    try {
      setIsStaking(true);
      setTxHash("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const amountWei = ethers.parseEther(stakeAmount);

      // Step 1: Approve GToken
      const gtokenContract = new ethers.Contract(
        config.contracts.gToken,
        ERC20_ABI,
        signer
      );

      const currentAllowance = await gtokenContract.allowance(
        account,
        config.contracts.gTokenStaking
      );

      if (currentAllowance < amountWei) {
        console.log("Approving GToken...");
        const approveTx = await gtokenContract.approve(
          config.contracts.gTokenStaking,
          amountWei
        );
        await approveTx.wait();
        console.log("Approval successful!");
      }

      // Step 2: Stake
      const stakingContract = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI.abi,
        signer
      );

      console.log("Staking GToken...");
      const stakeTx = await stakingContract.stake(amountWei);
      const receipt = await stakeTx.wait();

      setTxHash(receipt.hash);
      alert(`Successfully staked ${stakeAmount} GToken!`);

      // Reload balances
      await loadBalances(account);
      setStakeAmount("");
    } catch (error: any) {
      console.error("Staking failed:", error);
      alert(`Staking failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsStaking(false);
    }
  };

  // Load balances on account change
  useEffect(() => {
    if (account) {
      loadBalances(account);
    }
  }, [account]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount("");
          setGtokenBalance("0");
          setStGtokenBalance("0");
        }
      });
    }
  }, []);

  return (
    <div className="get-gtoken-page">
      <div className="get-gtoken-container">
        {/* Header */}
        <div className="get-gtoken-header">
          <button onClick={handleGoBack} className="back-button">
            ← Back
          </button>
          <h1>Get Governance Token</h1>
          <p className="subtitle">
            GToken is required for staking in the SuperPaymaster ecosystem
          </p>
        </div>

        {/* Stake GToken Section */}
        <section className="info-section stake-section">
          <h2>🔒 Stake GToken</h2>

          {!account ? (
            <div className="wallet-connect-prompt">
              <p>Connect your wallet to stake GToken and receive stGToken</p>
              <button onClick={connectWallet} className="action-button primary">
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="stake-interface">
              <div className="wallet-info">
                <p className="connected-account">
                  Connected: <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </p>
              </div>

              <div className="balance-display">
                <div className="balance-item">
                  <span className="label">GToken Balance:</span>
                  <span className="value highlight">{parseFloat(gtokenBalance).toFixed(2)} GT</span>
                </div>
                <div className="balance-item">
                  <span className="label">stGToken Balance:</span>
                  <span className="value highlight">{parseFloat(stGtokenBalance).toFixed(2)} stGT</span>
                </div>
              </div>

              <div className="stake-form">
                <div className="form-group">
                  <label htmlFor="stake-amount">Amount to Stake:</label>
                  <div className="input-with-max">
                    <input
                      id="stake-amount"
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.0"
                      disabled={isStaking}
                      min="0"
                      step="0.1"
                    />
                    <button
                      className="max-button"
                      onClick={() => setStakeAmount(gtokenBalance)}
                      disabled={isStaking}
                    >
                      MAX
                    </button>
                  </div>
                  <small className="hint">
                    Minimum stake: {config.requirements.minGTokenStake} GT
                  </small>
                </div>

                <button
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="action-button primary stake-button"
                >
                  {isStaking ? "Staking..." : `Stake ${stakeAmount || "0"} GToken`}
                </button>

                {txHash && (
                  <div className="tx-success">
                    <p>✅ Staking successful!</p>
                    <a
                      href={`${config.explorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      View Transaction →
                    </a>
                  </div>
                )}
              </div>

              <div className="stake-info-box">
                <h4>ℹ️ How Staking Works</h4>
                <ul>
                  <li>Stake GToken to receive stGToken (staked GToken) at 1:1 ratio</li>
                  <li>stGToken represents your staked position in the protocol</li>
                  <li>You can unstake at any time (with a 7-day cooldown period)</li>
                  <li>stGToken is required for various protocol operations (MySBT minting, community registration)</li>
                </ul>
              </div>
            </div>
          )}
        </section>

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
            <li>
              <a
                href="https://www.mushroom.box/docs/#/tokenomics-en"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea', textDecoration: 'none' }}
              >
                📖 More about Governance Token →
              </a>
            </li>
          </ul>
        </section>

        {/* Contract Information */}
        <section className="info-section">
          <h2>📋 Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Token Name:</span>
              <span className="value">GToken (Governance Token)</span>
            </div>
            <div className="info-row">
              <span className="label">Symbol:</span>
              <span className="value">GToken</span>
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
                      symbol: "GToken",
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
                  <strong>Token Symbol:</strong> GToken
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
              No! As a Paymaster operator, you earn service fees from sponsored
              transactions. The more transactions you process, the more revenue you
              earn. Higher GToken stake only qualifies you for additional opportunity
              to be choosed.
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
