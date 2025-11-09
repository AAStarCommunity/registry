/**
 * SuperPaymaster Configuration Page
 *
 * Manage AOA+ mode SuperPaymaster account:
 * - View account information
 * - Deposit aPNTs
 * - View reputation status
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { SuperPaymasterV2ABI } from "../../config/abis";
import "./SuperPaymasterConfig.css";

export function SuperPaymasterConfig() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const networkConfig = getCurrentNetworkConfig();

  // Wallet state
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");

  // Get operator address from URL query parameter
  const operatorFromUrl = searchParams.get("operator");

  // Account info state
  const [accountInfo, setAccountInfo] = useState<{
    stGTokenLocked: string;
    stakedAt: number;
    aPNTsBalance: string;
    totalSpent: string;
    reputationLevel: number;
    reputationScore: string;
    treasury: string;
    isPaused: boolean;
    totalTxSponsored: string;
  } | null>(null);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string>("");

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fibonacci reputation levels
  const REPUTATION_LEVELS = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

  // Check wallet connection
  useEffect(() => {
    checkWalletConnection();
  }, []);

  // Load account info when wallet connected or operator URL param available
  useEffect(() => {
    if (userAddress || operatorFromUrl) {
      loadAccountInfo();
    }
  }, [userAddress, operatorFromUrl]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum === "undefined") {
      setError("Please install MetaMask");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);

      if (accounts && accounts.length > 0) {
        setIsConnected(true);
        setUserAddress(accounts[0]);
      }
    } catch (err) {
      console.error("Failed to check wallet connection:", err);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      setError("Please install MetaMask");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts && accounts.length > 0) {
        setIsConnected(true);
        setUserAddress(accounts[0]);
      }
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(`Failed to connect wallet: ${err.message}`);
    }
  };

  const loadAccountInfo = async () => {
    setIsLoading(true);
    setError("");

    // Use operator from URL if available, otherwise use connected wallet
    const addressToCheck = operatorFromUrl || userAddress;

    if (!addressToCheck) {
      setError("No address available. Please connect wallet or provide operator address.");
      setIsLoading(false);
      return;
    }

    console.log("🔍 [SuperPaymaster] Loading account info for:", addressToCheck);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const superPaymasterAddress = networkConfig.contracts.superPaymasterV2;

      console.log("📍 [SuperPaymaster] Contract address:", superPaymasterAddress);

      // Use shared-config's SuperPaymasterV2ABI
      const superPaymaster = new ethers.Contract(superPaymasterAddress, SuperPaymasterV2ABI, provider);
      const account = await superPaymaster.accounts(addressToCheck);

      console.log("✅ [SuperPaymaster] Account data:", account);

      if (account.stakedAt === 0n || account[1] === 0n) {
        setError("Account not registered in SuperPaymaster. Please complete AOA+ deployment first.");
        setAccountInfo(null);
      } else {
        // ABI is missing supportedSBTs, so indices are offset by -1 after index 5
        // 0:stGTokenLocked, 1:stakedAt, 2:aPNTsBalance, 3:totalSpent, 4:lastRefillTime, 5:minBalanceThreshold
        // 6:xPNTsToken, 7:treasury, 8:exchangeRate, 9:reputationScore, 10:consecutiveDays
        // 11:totalTxSponsored, 12:reputationLevel, 13:lastCheckTime, 14:isPaused
        setAccountInfo({
          stGTokenLocked: ethers.formatEther(account.stGTokenLocked || account[0]),
          stakedAt: Number(account.stakedAt || account[1]),
          aPNTsBalance: ethers.formatEther(account.aPNTsBalance || account[2]),
          totalSpent: ethers.formatEther(account.totalSpent || account[3]),
          reputationLevel: Number(account.reputationLevel || account[12]),
          reputationScore: ethers.formatEther(account.reputationScore || account[9]),
          treasury: account.treasury || account[7],
          isPaused: account.isPaused ?? account[14],
          totalTxSponsored: (account.totalTxSponsored || account[11])?.toString(),
        });

        console.log("✅ [SuperPaymaster] Account loaded successfully");
      }
    } catch (err: any) {
      console.error("❌ [SuperPaymaster] Failed to load account info:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        data: err.data
      });
      setError(`Failed to load account: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setDepositError("Please enter a valid amount");
      return;
    }

    setIsDepositing(true);
    setDepositError("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const superPaymasterAddress = networkConfig.contracts.superPaymasterV2;
      const aPNTsAddress = networkConfig.contracts.aPNTs;

      const amount = ethers.parseEther(depositAmount);

      // ABIs
      const erc20ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const superPaymasterABI = ["function depositAPNTs(uint256 amount) external"];

      const aPNTs = new ethers.Contract(aPNTsAddress, erc20ABI, signer);
      const superPaymaster = new ethers.Contract(superPaymasterAddress, superPaymasterABI, signer);

      // Step 1: Approve aPNTs
      console.log("Approving aPNTs...");
      const approveTx = await aPNTs.approve(superPaymasterAddress, amount);
      await approveTx.wait();
      console.log("✅ aPNTs approved");

      // Step 2: Deposit
      console.log("Depositing aPNTs...");
      const depositTx = await superPaymaster.depositAPNTs(amount);
      await depositTx.wait();
      console.log("✅ aPNTs deposited");

      // Refresh account info
      await loadAccountInfo();
      setDepositAmount("");
      toast.success(`Successfully deposited ${depositAmount} aPNTs!`, {
        autoClose: 5000,
      });
    } catch (err: any) {
      console.error("Failed to deposit:", err);
      setDepositError(err.message || "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const getReputationLevelName = (level: number): string => {
    const names = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Legend", "Mythic", "Divine", "Immortal", "Eternal"];
    return names[level] || `Level ${level}`;
  };

  const getExplorerLink = (address: string): string => {
    return `https://sepolia.etherscan.io/address/${address}`;
  };

  // If no wallet connected and no operator param, show connect screen
  if (!isConnected && !operatorFromUrl) {
    return (
      <div className="superpaymaster-config">
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          pauseOnHover
          theme="light"
        />
        <div className="page-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <h1>SuperPaymaster Configuration</h1>
        </div>

        <div className="connect-section">
          <div className="connect-card">
            <div className="icon">🔗</div>
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to manage your SuperPaymaster account</p>
            <button onClick={connectWallet} className="connect-btn">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="superpaymaster-config">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        theme="light"
      />
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <h1>SuperPaymaster Configuration</h1>
        <div className="wallet-info">
          {userAddress && (
            <>
              <span className="wallet-label">Connected:</span>
              <code className="wallet-address">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </code>
            </>
          )}
          {operatorFromUrl && (
            <>
              <span className="wallet-label" style={{ marginLeft: userAddress ? '1rem' : 0 }}>
                {userAddress && operatorFromUrl.toLowerCase() !== userAddress.toLowerCase() ? 'Operator:' : 'Account:'}
              </span>
              <code className="wallet-address" style={{
                background: userAddress && operatorFromUrl.toLowerCase() !== userAddress.toLowerCase() ? '#fef3c7' : '#e0f2fe',
                color: userAddress && operatorFromUrl.toLowerCase() !== userAddress.toLowerCase() ? '#92400e' : '#0c4a6e'
              }}>
                {operatorFromUrl.slice(0, 6)}...{operatorFromUrl.slice(-4)}
              </code>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading account information...</p>
        </div>
      ) : accountInfo ? (
        <>
          {/* Account Summary */}
          <div className="account-summary">
            <h2>Account Summary</h2>
            <div className="summary-grid">
              {/* Staked GT */}
              <div className="summary-card">
                <div className="card-icon">🔒</div>
                <div className="card-content">
                  <h3>Staked GT</h3>
                  <p className="card-value">{accountInfo.stGTokenLocked} GT</p>
                  <p className="card-detail">
                    Staked since {new Date(accountInfo.stakedAt * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* aPNTs Balance */}
              <div className="summary-card highlight">
                <div className="card-icon">💎</div>
                <div className="card-content">
                  <h3>aPNTs Balance</h3>
                  <p className="card-value">{accountInfo.aPNTsBalance} aPNTs</p>
                  <p className="card-detail">
                    Total spent: {accountInfo.totalSpent} aPNTs
                  </p>
                </div>
              </div>

              {/* Reputation */}
              <div className="summary-card">
                <div className="card-icon">⭐</div>
                <div className="card-content">
                  <h3>Reputation</h3>
                  <p className="card-value">
                    Level {accountInfo.reputationLevel} - {getReputationLevelName(accountInfo.reputationLevel)}
                  </p>
                  <p className="card-detail">
                    Score: {parseFloat(accountInfo.reputationScore).toFixed(2)}
                  </p>
                  <div className="reputation-progress">
                    <div
                      className="reputation-bar"
                      style={{ width: `${(accountInfo.reputationLevel / 12) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Transaction Stats */}
              <div className="summary-card">
                <div className="card-icon">📊</div>
                <div className="card-content">
                  <h3>Transaction Stats</h3>
                  <p className="card-value">{accountInfo.totalTxSponsored} txns</p>
                  <p className="card-detail">
                    Status: {accountInfo.isPaused ? "⏸️ Paused" : "✅ Active"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit aPNTs Section */}
          <div className="deposit-section">
            <h2>💰 Deposit aPNTs</h2>
            <div className="deposit-card">
              <p className="deposit-description">
                Top up your aPNTs balance to sponsor more transactions.
                Current balance: <strong>{accountInfo.aPNTsBalance} aPNTs</strong>
              </p>

              <div className="deposit-form">
                <div className="input-group">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount (e.g., 1000)"
                    className="deposit-input"
                    disabled={isDepositing}
                    step="0.1"
                    min="0"
                  />
                  <span className="input-suffix">aPNTs</span>
                </div>

                {depositError && (
                  <div className="error-message">
                    <span className="icon">❌</span>
                    <span>{depositError}</span>
                  </div>
                )}

                <button
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount}
                  className="deposit-btn"
                >
                  {isDepositing ? "⏳ Depositing..." : "💎 Deposit aPNTs"}
                </button>

                <p className="deposit-note">
                  Note: You need to have aPNTs tokens in your wallet.
                  Get aPNTs at <a href="/resources/get-pnts" target="_blank">Get PNTs</a>.
                </p>
              </div>
            </div>
          </div>

          {/* Reputation System Info */}
          <div className="reputation-info">
            <h2>⭐ Reputation System</h2>
            <div className="reputation-card">
              <p className="reputation-description">
                Your reputation level increases based on consistent operation and transaction volume.
                Higher levels unlock better benefits and lower fees.
              </p>

              <div className="reputation-levels">
                <h3>Fibonacci Levels</h3>
                <div className="levels-grid">
                  {REPUTATION_LEVELS.map((stake, index) => (
                    <div
                      key={index}
                      className={`level-item ${index === accountInfo.reputationLevel ? 'current' : ''} ${index < accountInfo.reputationLevel ? 'completed' : ''}`}
                    >
                      <div className="level-number">L{index}</div>
                      <div className="level-name">{getReputationLevelName(index)}</div>
                      <div className="level-stake">{stake} GT</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="reputation-tips">
                <h4>How to increase reputation:</h4>
                <ul>
                  <li>✅ Sponsor transactions consistently</li>
                  <li>✅ Maintain sufficient aPNTs balance</li>
                  <li>✅ Avoid service interruptions</li>
                  <li>✅ Increase stake amount</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="account-details">
            <h2>🔍 Account Details</h2>
            <div className="details-card">
              <div className="detail-row">
                <span className="detail-label">Treasury Address:</span>
                <a
                  href={getExplorerLink(accountInfo.treasury)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-value link"
                >
                  {accountInfo.treasury.slice(0, 10)}...{accountInfo.treasury.slice(-8)}
                </a>
              </div>
              <div className="detail-row">
                <span className="detail-label">SuperPaymaster Contract:</span>
                <a
                  href={getExplorerLink(networkConfig.contracts.superPaymasterV2)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-value link"
                >
                  {networkConfig.contracts.superPaymasterV2.slice(0, 10)}...{networkConfig.contracts.superPaymasterV2.slice(-8)}
                </a>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
