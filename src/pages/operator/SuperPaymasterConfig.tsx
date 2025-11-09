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
  const [walletAPNTsBalance, setWalletAPNTsBalance] = useState<string>("0"); // User's wallet aPNTs balance

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

        // Also load user's wallet aPNTs balance
        try {
          const aPNTsAddress = networkConfig.contracts.aPNTs;
          const erc20ABI = ["function balanceOf(address) view returns (uint256)"];
          const aPNTsToken = new ethers.Contract(aPNTsAddress, erc20ABI, provider);
          const walletBalance = await aPNTsToken.balanceOf(addressToCheck);
          setWalletAPNTsBalance(ethers.formatEther(walletBalance));
          console.log("💰 [SuperPaymaster] Wallet aPNTs balance:", ethers.formatEther(walletBalance));
        } catch (balanceErr) {
          console.error("⚠️ [SuperPaymaster] Failed to load wallet aPNTs balance:", balanceErr);
          setWalletAPNTsBalance("0");
        }
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
      const erc20ABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)"
      ];

      const aPNTs = new ethers.Contract(aPNTsAddress, erc20ABI, signer);
      const superPaymaster = new ethers.Contract(superPaymasterAddress, SuperPaymasterV2ABI, signer);

      const signerAddress = await signer.getAddress();

      // Check balance
      console.log("🔍 Checking aPNTs balance...");
      const balance = await aPNTs.balanceOf(signerAddress);
      console.log(`Balance: ${ethers.formatEther(balance)} aPNTs, Required: ${depositAmount} aPNTs`);

      if (balance < amount) {
        throw new Error(`Insufficient aPNTs balance. You have ${ethers.formatEther(balance)} aPNTs, but need ${depositAmount} aPNTs.`);
      }

      // Check allowance
      console.log("🔍 Checking allowance...");
      const allowance = await aPNTs.allowance(signerAddress, superPaymasterAddress);
      console.log(`Current allowance: ${ethers.formatEther(allowance)} aPNTs`);

      // Step 1: Approve aPNTs if needed
      if (allowance < amount) {
        console.log("⚠️ Insufficient allowance, requesting approval...");
        toast.info("Please approve aPNTs transfer in MetaMask", { autoClose: 3000 });

        const approveTx = await aPNTs.approve(superPaymasterAddress, amount);
        console.log("⏳ Waiting for approval...");
        await approveTx.wait();
        console.log("✅ aPNTs approved");
        toast.success("Approval successful!", { autoClose: 3000 });
      } else {
        console.log("✅ Sufficient allowance already approved");
      }

      // Step 2: Deposit
      console.log("💰 Depositing aPNTs...");
      toast.info("Please confirm deposit in MetaMask", { autoClose: 3000 });

      const depositTx = await superPaymaster.depositAPNTs(amount);
      console.log("⏳ Waiting for deposit transaction...");
      await depositTx.wait();
      console.log("✅ aPNTs deposited");

      // Refresh account info
      await loadAccountInfo();
      setDepositAmount("");
      toast.success(`Successfully deposited ${depositAmount} aPNTs!`, {
        autoClose: 5000,
      });
    } catch (err: any) {
      console.error("❌ Failed to deposit:", err);

      // Better error messages
      let errorMessage = err.message || "Deposit failed";

      if (err.message?.includes("user rejected") || err.message?.includes("User denied")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("Insufficient aPNTs balance")) {
        errorMessage = err.message;  // Use our custom message
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      } else if (err.data?.startsWith("0x9996b315")) {
        errorMessage = "aPNTs transfer failed. The token contract rejected the transfer. Please check your balance and try again.";
      }

      setDepositError(errorMessage);
      toast.error(errorMessage, { autoClose: 7000 });
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
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Contract Balance - Red if < 25, Yellow if < 100, Green otherwise */}
                <div style={{
                  padding: '1rem',
                  background: parseFloat(accountInfo.aPNTsBalance) < 25 ? '#fee2e2' :
                             parseFloat(accountInfo.aPNTsBalance) < 100 ? '#fef3c7' : '#f0fdf4',
                  borderRadius: '8px',
                  border: parseFloat(accountInfo.aPNTsBalance) < 25 ? '2px solid #dc2626' :
                          parseFloat(accountInfo.aPNTsBalance) < 100 ? '2px solid #f59e0b' : '1px solid #86efac',
                  position: 'relative'
                }}>
                  {parseFloat(accountInfo.aPNTsBalance) < 100 && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '8px',
                      background: parseFloat(accountInfo.aPNTsBalance) < 25 ? '#dc2626' : '#f59e0b',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      animation: 'pulse 2s infinite'
                    }}>
                      {parseFloat(accountInfo.aPNTsBalance) < 25 ? 'CRITICAL' : 'LOW'}
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.875rem',
                    color: parseFloat(accountInfo.aPNTsBalance) < 25 ? '#7f1d1d' :
                           parseFloat(accountInfo.aPNTsBalance) < 100 ? '#92400e' : '#15803d',
                    fontWeight: 600
                  }}>
                    Contract Balance
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: parseFloat(accountInfo.aPNTsBalance) < 25 ? '#991b1b' :
                           parseFloat(accountInfo.aPNTsBalance) < 100 ? '#b45309' : '#166534',
                    marginTop: '0.25rem'
                  }}>
                    {accountInfo.aPNTsBalance} aPNTs
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: parseFloat(accountInfo.aPNTsBalance) < 25 ? '#dc2626' :
                           parseFloat(accountInfo.aPNTsBalance) < 100 ? '#f59e0b' : '#4ade80',
                    marginTop: '0.25rem',
                    fontWeight: parseFloat(accountInfo.aPNTsBalance) < 100 ? 600 : 400
                  }}>
                    {parseFloat(accountInfo.aPNTsBalance) < 25 ? '🚨 Critical - Deposit urgently!' :
                     parseFloat(accountInfo.aPNTsBalance) < 100 ? '⚠️ Low balance - Please deposit!' :
                     'Available for sponsoring'}
                  </div>
                </div>

                {/* Wallet Balance */}
                <div style={{ padding: '1rem', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #7dd3fc' }}>
                  <div style={{ fontSize: '0.875rem', color: '#0c4a6e', fontWeight: 600 }}>Wallet Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0369a1', marginTop: '0.25rem' }}>
                    {walletAPNTsBalance} aPNTs
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0ea5e9', marginTop: '0.25rem' }}>Available to deposit</div>
                </div>
              </div>

              <div className="deposit-form">
                <div className="input-group" style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(e.target.value);
                      // Clear error when user types
                      setDepositError("");
                    }}
                    placeholder="Enter amount (e.g., 1000)"
                    className="deposit-input"
                    disabled={isDepositing}
                    step="0.1"
                    min="0"
                  />
                  <span className="input-suffix">aPNTs</span>
                  {parseFloat(walletAPNTsBalance) > 0 && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount(walletAPNTsBalance)}
                      style={{
                        position: 'absolute',
                        right: '80px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '0.25rem 0.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                      MAX
                    </button>
                  )}
                </div>

                {/* Real-time validation warning */}
                {depositAmount && parseFloat(depositAmount) > parseFloat(walletAPNTsBalance) && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem' }}>
                        Insufficient Balance
                      </div>
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        You're trying to deposit {depositAmount} aPNTs, but you only have {walletAPNTsBalance} aPNTs in your wallet.
                      </div>
                    </div>
                  </div>
                )}

                {/* Zero balance warning */}
                {parseFloat(walletAPNTsBalance) === 0 && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#fffbeb',
                    border: '1px solid #fef08a',
                    borderRadius: '6px',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>💡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#92400e', fontWeight: 600, fontSize: '0.875rem' }}>
                        No aPNTs in Wallet
                      </div>
                      <div style={{ color: '#b45309', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        You need to acquire aPNTs tokens first. Get them at{' '}
                        <a href="/resources/get-pnts" target="_blank" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                          Get PNTs
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {depositError && (
                  <div className="error-message">
                    <span className="icon">❌</span>
                    <span>{depositError}</span>
                  </div>
                )}

                <button
                  onClick={handleDeposit}
                  disabled={
                    isDepositing ||
                    parseFloat(walletAPNTsBalance) <= 0 ||  // Must have balance
                    !depositAmount ||                        // Must enter amount
                    parseFloat(depositAmount) <= 0 ||       // Must be > 0
                    parseFloat(depositAmount) > parseFloat(walletAPNTsBalance)  // Must be <= balance
                  }
                  className="deposit-btn"
                  style={{
                    opacity: (
                      isDepositing ||
                      parseFloat(walletAPNTsBalance) <= 0 ||
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0 ||
                      parseFloat(depositAmount) > parseFloat(walletAPNTsBalance)
                    ) ? 0.5 : 1,
                    cursor: (
                      isDepositing ||
                      parseFloat(walletAPNTsBalance) <= 0 ||
                      !depositAmount ||
                      parseFloat(depositAmount) <= 0 ||
                      parseFloat(depositAmount) > parseFloat(walletAPNTsBalance)
                    ) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isDepositing ? "⏳ Depositing..." :
                   parseFloat(walletAPNTsBalance) <= 0 ? "❌ No aPNTs in Wallet" :
                   !depositAmount ? "💎 Deposit aPNTs" :
                   parseFloat(depositAmount) > parseFloat(walletAPNTsBalance) ? "⚠️ Insufficient Balance" :
                   "💎 Deposit aPNTs"}
                </button>
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
              <div className="detail-row">
                <span className="detail-label">aPNTs Token Address:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <a
                    href={getExplorerLink(networkConfig.contracts.aPNTs)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-value link"
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  >
                    {networkConfig.contracts.aPNTs}
                  </a>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontStyle: 'italic'
                  }}>
                    📦 From{' '}
                    <a
                      href="https://www.npmjs.com/package/@aastar/shared-config"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    >
                      @aastar/shared-config
                    </a>
                    {' '}v0.3.1
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
