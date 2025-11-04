/**
 * Get GToken Resource Page
 *
 * Guides users on how to obtain GToken for staking
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig, isTestnet } from "../../config/networkConfig";
import { ERC20_ABI, GTokenStakingABI } from "../../config/abis";
import "./GetGToken.css";

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
  const [error, setError] = useState<string>("");

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
        GTokenStakingABI,
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
      setError("Please connect your wallet first!");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError("Please enter a valid stake amount!");
      return;
    }

    try {
      setIsStaking(true);
      setTxHash("");
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const amountWei = ethers.parseEther(stakeAmount);

      console.log("=== Staking Pre-flight Checks ===");
      console.log("User address:", account);
      console.log("Stake amount:", stakeAmount, "GT");
      console.log("GToken contract:", config.contracts.gToken);
      console.log("GTokenStaking contract:", config.contracts.gTokenStaking);

      // Pre-flight Check 1: Verify GToken balance
      const gtokenContract = new ethers.Contract(
        config.contracts.gToken,
        ERC20_ABI,
        provider
      );
      const gTokenBalance = await gtokenContract.balanceOf(account);
      console.log("GToken balance:", ethers.formatEther(gTokenBalance), "GT");

      if (gTokenBalance < amountWei) {
        setError(
          `Insufficient GToken balance!\n\n` +
          `You have: ${ethers.formatEther(gTokenBalance)} GT\n` +
          `Required: ${stakeAmount} GT\n\n` +
          `GToken contract: ${config.contracts.gToken}`
        );
        return;
      }
      console.log("✅ Sufficient GToken balance");

      // Pre-flight Check 2: Check existing stake
      const stakingContract = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI,
        provider
      );

      const stakeInfo = await stakingContract.getStakeInfo(account);
      const stakedAmount = stakeInfo[0];
      const unstakeRequestedAt = stakeInfo[3];

      if (stakedAmount > 0n) {
        console.log(
          `⚠️ Existing stake: ${ethers.formatEther(stakedAmount)} GT\n` +
          `New stake: ${stakeAmount} GT\n` +
          `Total will be: ${ethers.formatEther(stakedAmount + amountWei)} GT`
        );
      }

      // Pre-flight Check 3: Pending unstake request
      if (unstakeRequestedAt > 0n) {
        setError(
          `You have a pending unstake request!\n\n` +
          `Requested at: ${new Date(Number(unstakeRequestedAt) * 1000).toLocaleString()}\n\n` +
          `Please complete or cancel the unstake before staking more.`
        );
        return;
      }
      console.log("✅ No pending unstake request");

      // Step 1: Approve GToken
      const gtokenContractSigner = new ethers.Contract(
        config.contracts.gToken,
        ERC20_ABI,
        signer
      );

      const currentAllowance = await gtokenContractSigner.allowance(
        account,
        config.contracts.gTokenStaking
      );

      if (currentAllowance < amountWei) {
        console.log("📝 Approving GToken...");
        const approveTx = await gtokenContractSigner.approve(
          config.contracts.gTokenStaking,
          amountWei
        );
        await approveTx.wait();
        console.log("✅ Approval successful!");
      } else {
        console.log("✅ Already approved");
      }

      // Step 2: Stake
      const stakingContractSigner = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI,
        signer
      );

      console.log("🔒 Staking GToken...");
      const stakeTx = await stakingContractSigner.stake(amountWei);
      console.log("Transaction sent:", stakeTx.hash);

      const receipt = await stakeTx.wait();
      console.log("✅ Staking successful!");

      setTxHash(receipt.hash);
      setError(""); // Clear any previous errors

      // Reload balances
      await loadBalances(account);
      setStakeAmount("");
    } catch (error: any) {
      console.error("❌ Staking failed:", error);

      // Enhanced error message
      let errorMsg = "Staking failed!\n\n";

      if (error.code === "CALL_EXCEPTION") {
        errorMsg += `Transaction reverted.\n\n`;
        if (error.data) {
          errorMsg += `Error data: ${error.data}\n\n`;
        }
        errorMsg += `Possible reasons:\n`;
        errorMsg += `• Insufficient GToken balance\n`;
        errorMsg += `• Pending unstake request\n`;
        errorMsg += `• Contract interaction issue\n\n`;
        errorMsg += `Contract addresses:\n`;
        errorMsg += `GToken: ${config.contracts.gToken}\n`;
        errorMsg += `GTokenStaking: ${config.contracts.gTokenStaking}\n\n`;
        errorMsg += `Please check browser console for details.`;
      } else if (error.code === "ACTION_REJECTED") {
        errorMsg = "Transaction cancelled by user.";
      } else {
        errorMsg += error.message || "Unknown error";
      }

      setError(errorMsg);
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
          <div className="header-content">
            <div>
              <h1>Get Governance Token</h1>
              <p className="subtitle" style={{ color: '#e5e7eb', fontWeight: '500' }}>
                GToken is required for staking in the SuperPaymaster ecosystem
              </p>
            </div>
            <a href="/operator/wizard" className="wizard-link">
              🚀 Launch Wizard
            </a>
          </div>
        </div>

        {/* Stake GToken Section */}
        <section className="info-section stake-section">
          <h2>🔒 Stake GToken</h2>

          {!account ? (
            <div className="wallet-connect-prompt">
              <p>Connect wallet to stake GToken for various operations</p>
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

                {error && (
                  <div className="error-message" style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
                    {error}
                  </div>
                )}

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
          <h2>💎 What is GToken? Why Stake?</h2>
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
              <strong>Anti-sybil</strong>: Stake is a way to anti-sybil attack to the protocol
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
          </div>

          <h3 style={{marginTop: '2rem', marginBottom: '1rem', color: '#374151'}}>GToken Stake Requirements by Use Case</h3>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Mint MySBT:</span>
              <span className="value highlight">
                0.4 GT <span style={{fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal'}}>(0.3 lock + 0.1 burn)</span>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Register Community:</span>
              <span className="value highlight">
                30 GT <span style={{fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal'}}>(lock)</span>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Deploy Paymaster (AOA):</span>
              <span className="value highlight">
                30 GT <span style={{fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal'}}>(lock for reputation)</span>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Use SuperPaymaster (AOA+):</span>
              <span className="value highlight">
                50 GT
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

          <details className="faq-item">
            <summary>What happens to my staked GToken when I burn MySBT?</summary>
            <p>
              When you burn (destroy) your MySBT, the locked portion of your staked GToken (0.3 GT) is automatically refunded back to your wallet. The burned portion (0.1 GT) is permanently destroyed and cannot be recovered. This allows you to reclaim most of your stake if you no longer need the MySBT.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I get a refund for my staked GToken?</summary>
            <p>
              Yes! You can get a refund through these methods:
            </p>
            <ul style={{marginTop: '0.5rem', paddingLeft: '1.5rem'}}>
              <li><strong>Burn MySBT:</strong> Returns 0.3 GT (locked portion). The 0.1 GT burn fee is non-refundable.</li>
              <li><strong>Unstake from other services:</strong> Most protocol operations allow unstaking with a 7-day cooldown period.</li>
              <li><strong>Community deregistration:</strong> Returns locked GToken after cooldown (varies by service).</li>
            </ul>
            <p style={{marginTop: '0.5rem'}}>
              Note: Refund mechanisms and cooldown periods are enforced by the GTokenStaking smart contract to prevent system abuse.
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
