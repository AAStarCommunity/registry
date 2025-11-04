/**
 * Get GToken Resource Page
 *
 * Guides users on how to obtain GToken for staking
 */

import React, { useState, useEffect, useCallback } from "react";
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
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [isStaking, setIsStaking] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentNetwork, setCurrentNetwork] = useState<{chainId: number, name: string} | null>(null);
  const [pendingUnstakeInfo, setPendingUnstakeInfo] = useState<{timestamp: number, canComplete: boolean} | null>(null);

  const handleGoBack = () => {
    navigate(-1);
  };

  // Check current network
  const checkCurrentNetwork = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const networkInfo = {
          chainId: Number(network.chainId),
          name: network.name || `Chain ${Number(network.chainId)}`
        };
        setCurrentNetwork(networkInfo);
        return networkInfo;
      }
      return null;
    } catch (error) {
      console.error("Failed to check network:", error);
      return null;
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed. Please install MetaMask to continue.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check network
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== config.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${config.chainId.toString(16)}` }],
          });
        } catch (switchError: unknown) {
          if ((switchError as {code?: number}).code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${config.chainId.toString(16)}`,
                  chainName: config.chainName,
                  rpcUrls: [config.rpcUrl],
                  blockExplorerUrls: [config.explorerUrl],
                }],
              });
            } catch {
              alert(`Failed to add ${config.chainName} network. Please add it manually.`);
              return;
            }
          } else {
            alert(`Failed to switch to ${config.chainName}. Please switch manually.`);
            return;
          }
        }
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      const connectedAccount = accounts[0];
      
      setAccount(connectedAccount);
      await loadBalances(connectedAccount);
      
    } catch {
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Load balances
  const loadBalances = useCallback(async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Load ETH balance
      const ethBalanceWei = await provider.getBalance(userAddress);
      const formattedEthBalance = ethers.formatEther(ethBalanceWei);
      setEthBalance(formattedEthBalance);

      // Load GToken balance
      const gTokenContract = new ethers.Contract(config.contracts.gToken, ERC20_ABI, provider);
      const gTokenBalanceWei = await gTokenContract.balanceOf(userAddress);
      const formattedGtBalance = ethers.formatEther(gTokenBalanceWei);
      setGtokenBalance(formattedGtBalance);

      // Load stGToken balance
      const stakingContract = new ethers.Contract(config.contracts.gTokenStaking, GTokenStakingABI, provider);
      const stGtokenBalanceWei = await stakingContract.balanceOf(userAddress);
      const formattedStGtBalance = ethers.formatEther(stGtokenBalanceWei);
      setStGtokenBalance(formattedStGtBalance);

      // Check for pending unstake
      try {
        const stakeInfo = await stakingContract.getStakeInfo(userAddress);
        // stakeInfo returns: [amount, sGTokenShares, stakedAt, unstakeRequestedAt]
        
        // Access unstakeRequestedAt from struct (handle both object and array access)
        let unstakeRequestedAt;
        if (stakeInfo.unstakeRequestedAt !== undefined) {
          unstakeRequestedAt = stakeInfo.unstakeRequestedAt;
        } else if (stakeInfo[3] !== undefined) {
          unstakeRequestedAt = stakeInfo[3];
        } else {
          unstakeRequestedAt = 0n;
        }
        
        // Validate unstake request to prevent false positives
        // Only consider it a valid unstake request if:
        // 1. unstakeRequestedAt > 0 (not default value)
        // 2. unstakeRequestedAt > stakedAt (requested after staking)
        // 3. unstakeRequestedAt is not in the future
        const stakedAt = stakeInfo.stakedAt || stakeInfo[2] || 0n;
        const now = Math.floor(Date.now() / 1000);
        const isValidUnstakeRequest = unstakeRequestedAt > 0n && 
                                   unstakeRequestedAt > stakedAt && 
                                   Number(unstakeRequestedAt) <= now;
        
        if (isValidUnstakeRequest) {
          const unstakeTime = Number(unstakeRequestedAt);
          const unstakeDelay = 7 * 24 * 60 * 60; // 7 days in seconds
          const canComplete = now >= (unstakeTime + unstakeDelay);
          
          setPendingUnstakeInfo({
            timestamp: unstakeTime,
            canComplete
          });
        } else {
          setPendingUnstakeInfo(null);
        }
      } catch (unstakeError) {
        console.warn("Failed to check pending unstake:", unstakeError);
        setPendingUnstakeInfo(null);
      }
    } catch (error) {
      console.error("Failed to load balances:", error);
    }
  }, [config.contracts.gToken, config.contracts.gTokenStaking]);

  // Handle complete unstake
  const handleCompleteUnstake = async () => {
    if (!account) {
      setError("Please connect your wallet first!");
      return;
    }

    try {
      setIsStaking(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(config.contracts.gTokenStaking, GTokenStakingABI, signer);

      console.log("Completing unstake...");
      const tx = await stakingContract.unstake();
      setTxHash(tx.hash);

      await tx.wait();
      
      // Refresh balances
      await loadBalances(account);
      setPendingUnstakeInfo(null);
      
      // Reset form
      setStakeAmount("");
      setTxHash("");
      setIsStaking(false);
      
      alert("Unstake completed successfully!");
    } catch (error: unknown) {
      console.error("Unstake failed:", error);
      setError((error as {message?: string}).message || "Failed to complete unstake");
      setIsStaking(false);
    }
  };

  // Handle stake
  const handleStake = async () => {
    if (!account) {
      setError("Please connect your wallet first!");
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    // Check if user has sufficient GToken balance
    const stakeAmountWei = ethers.parseEther(stakeAmount);
    const userGTokenBalance = ethers.parseEther(gtokenBalance);
    
    if (stakeAmountWei > userGTokenBalance) {
      setError(`Insufficient GToken balance. You have ${gtokenBalance} GToken but trying to stake ${stakeAmount} GToken`);
      return;
    }

    // Check if user has sufficient ETH for gas
    const ethBalanceWei = ethers.parseEther(ethBalance);
    if (ethBalanceWei < ethers.parseEther("0.01")) {
      setError("Insufficient ETH for gas fees. Please ensure you have at least 0.01 ETH.");
      return;
    }

    try {
      setIsStaking(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // First, approve GToken spending
      const gTokenContract = new ethers.Contract(config.contracts.gToken, ERC20_ABI, signer);
      console.log("Approving GToken spending...");
      const approveTx = await gTokenContract.approve(config.contracts.gTokenStaking, stakeAmountWei);
      await approveTx.wait();

      // Then stake
      const stakingContract = new ethers.Contract(config.contracts.gTokenStaking, GTokenStakingABI, signer);
      console.log("Staking GToken...");
      const stakeTx = await stakingContract.stake(stakeAmountWei);
      setTxHash(stakeTx.hash);

      await stakeTx.wait();
      
      // Refresh balances
      await loadBalances(account);
      
      // Reset form
      setStakeAmount("");
      setTxHash("");
      setIsStaking(false);
      
      alert("Staking successful!");
    } catch (error: unknown) {
      console.error("Staking failed:", error);
      setError((error as {message?: string}).message || "Failed to stake GToken");
      setIsStaking(false);
    }
  };

  // Handle request unstake
  const handleRequestUnstake = async () => {
    if (!account) {
      setError("Please connect your wallet first!");
      return;
    }

    try {
      setIsStaking(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakingContract = new ethers.Contract(config.contracts.gTokenStaking, GTokenStakingABI, signer);

      console.log("Requesting unstake...");
      const tx = await stakingContract.requestUnstake();
      setTxHash(tx.hash);

      await tx.wait();
      
      // Refresh balances and check for pending unstake
      await loadBalances(account);
      
      // Reset form
      setStakeAmount("");
      setTxHash("");
      setIsStaking(false);
      
      alert("Unstake requested successfully! You can complete unstake after 7 days.");
    } catch (error: unknown) {
      console.error("Request unstake failed:", error);
      setError((error as {message?: string}).message || "Failed to request unstake");
      setIsStaking(false);
    }
  };

  // Check network on component mount
  useEffect(() => {
    checkCurrentNetwork();
  }, []);

  // Auto-refresh balances when account changes
  useEffect(() => {
    if (account) {
      loadBalances(account);
    }
  }, [account, loadBalances]);

  // Auto-refresh pending unstake status every 30 seconds
  useEffect(() => {
    if (pendingUnstakeInfo && !pendingUnstakeInfo.canComplete && account) {
      const interval = setInterval(() => {
        loadBalances(account);
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [pendingUnstakeInfo, account, loadBalances]);

  return (
    <div className="get-gtoken-container">
      <div className="get-gtoken-header">
        <button onClick={handleGoBack} className="back-button">
          ← Back
        </button>
        <h1>Get GToken</h1>
        <p>Obtain GToken for staking and participate in network governance</p>
      </div>

      {/* Network Status */}
      <div className="network-status">
        {currentNetwork ? (
          <div className={`network-info ${currentNetwork.chainId === config.chainId ? 'correct' : 'wrong'}`}>
            <span className="network-label">Current Network:</span>
            <span className="network-name">{currentNetwork.name} (Chain ID: {currentNetwork.chainId})</span>
            {currentNetwork.chainId === config.chainId ? (
              <span className="network-status-correct">✅ Correct</span>
            ) : (
              <span className="network-status-wrong">❌ Wrong Network</span>
            )}
          </div>
        ) : (
          <div className="network-info loading">
            <span className="network-label">Checking network...</span>
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      {!account ? (
        <div className="wallet-section">
          <h2>Connect Wallet</h2>
          <p>Please connect your wallet to get GToken</p>
          <button onClick={connectWallet} className="connect-wallet-btn">
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="wallet-connected">
          <div className="account-info">
            <h3>Connected Account</h3>
            <p className="address">{account}</p>
            <button onClick={connectWallet} className="refresh-btn">
              Refresh
            </button>
          </div>

          {/* Balances */}
          <div className="balances-section">
            <h3>Your Balances</h3>
            <div className="balance-grid">
              <div className="balance-item">
                <span className="label">ETH Balance:</span>
                <span className="value">{parseFloat(ethBalance).toFixed(4)} ETH</span>
              </div>
              <div className="balance-item">
                <span className="label">GToken Balance:</span>
                <span className="value">{parseFloat(gtokenBalance).toFixed(2)} GT</span>
              </div>
              <div className="balance-item">
                <span className="label">stGToken Balance:</span>
                <span className="value highlight">{parseFloat(stGtokenBalance).toFixed(2)} stGT</span>
              </div>
            </div>
            
            {/* stGToken Action Links */}
            {parseFloat(stGtokenBalance) > 0 && (
              <div className="stgtoken-actions" style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <p style={{ margin: '0 0 0.75rem 0', color: '#0c4a6e', fontWeight: '600' }}>
                  💡 Use your staked GToken:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <a 
                    href="/get-sbt" 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#0ea5e9',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
                  >
                    🎫 Mint your MySBT
                  </a>
                  <a 
                    href="/register-community" 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    🏛️ Register a Community
                  </a>
                  <a 
                    href="/operator/wizard" 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#8b5cf6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                  >
                    🚀 Launch a Paymaster
                  </a>
                </div>
              </div>
            )}

            {/* Pending Unstake Information */}
            {pendingUnstakeInfo && (
              <div className="pending-unstake-info" style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontWeight: '600' }}>
                  ⏰ Pending Unstake Request
                </h4>
                <p style={{ margin: '0 0 0.5rem 0', color: '#78350f' }}>
                  <strong>Requested at:</strong> {new Date(pendingUnstakeInfo.timestamp * 1000).toLocaleString()}
                </p>
                <p style={{ margin: '0 0 1rem 0', color: '#78350f' }}>
                  <strong>Status:</strong> {pendingUnstakeInfo.canComplete ? '✅ Ready to complete' : '⏳ 7-day cooldown in progress'}
                </p>
                {pendingUnstakeInfo.canComplete && (
                  <button 
                    onClick={handleCompleteUnstake}
                    disabled={isStaking}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      cursor: isStaking ? 'not-allowed' : 'pointer',
                      opacity: isStaking ? 0.6 : 1
                    }}
                  >
                    {isStaking ? 'Processing...' : 'Complete Unstake'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Staking Section */}
          <div className="staking-section">
            <h3>Stake GToken</h3>
            <div className="stake-form">
              <div className="input-group">
                <label>Amount to Stake:</label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  disabled={isStaking}
                />
                <span className="token-symbol">GT</span>
              </div>
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              {txHash && (
                <div className="success-message">
                  Transaction submitted: 
                  <a 
                    href={`${config.explorerUrl}/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    View on Explorer
                  </a>
                </div>
              )}
              
              <div className="button-group">
                <button 
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="stake-btn"
                >
                  {isStaking ? 'Processing...' : 'Stake GToken'}
                </button>
                
                {parseFloat(stGtokenBalance) > 0 && !pendingUnstakeInfo && (
                  <button 
                    onClick={handleRequestUnstake}
                    disabled={isStaking}
                    className="unstake-btn"
                  >
                    {isStaking ? 'Processing...' : 'Request Unstake'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="staking-info">
              <h4>Staking Information</h4>
              <ul>
                <li>Stake GToken to receive stGToken (staked GToken)</li>
                <li>stGToken represents your share of the staking pool</li>
                <li>Unstake requests have a 7-day cooldown period</li>
                <li>You can cancel unstake requests anytime before completion</li>
                <li>Staking rewards are distributed automatically</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* How to Get GToken Section */}
      <div className="get-gtoken-info">
        <h2>How to Get GToken</h2>
        <div className="methods-grid">
          <div className="method-card">
            <h3>🚰 Testnet Faucet</h3>
            <p>Get free GToken from the testnet faucet (if available)</p>
            {isTest && config.resources.gTokenFaucet && (
              <div className="faucet-links">
                <a 
                  href={config.resources.gTokenFaucet} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="faucet-link"
                >
                  GToken Faucet
                </a>
              </div>
            )}
          </div>
          
          <div className="method-card">
            <h3>💱 Decentralized Exchanges</h3>
            <p>Trade for GToken on supported DEXs</p>
            <div className="dex-links">
              <a href="#" className="dex-link">Coming Soon</a>
            </div>
          </div>
          
          <div className="method-card">
            <h3>🏪 Centralized Exchanges</h3>
            <p>Buy GToken on supported centralized exchanges</p>
            <div className="cex-links">
              <a href="#" className="cex-link">Coming Soon</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetGToken;