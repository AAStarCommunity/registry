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

  // Debug: Log configuration on component mount
  console.log("🚀 === DEBUG: GetGToken Component Mounted ===");
  console.log("📋 Network Config:", {
    chainName: config.chainName,
    chainId: config.chainId,
    isTestnet: isTest,
    gToken: config.contracts.gToken,
    gTokenStaking: config.contracts.gTokenStaking
  });

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
        console.log("🌐 Current network detected:", networkInfo);
        return networkInfo;
      }
    } catch (error) {
      console.error("Failed to check network:", error);
      return null;
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      console.log("🔗 === DEBUG: Connecting Wallet ===");
      
      if (!window.ethereum) {
        console.error("❌ MetaMask not found");
        alert("Please install MetaMask!");
        return;
      }

      console.log("✅ MetaMask found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check current network
      const network = await provider.getNetwork();
      const networkInfo = {
        chainId: Number(network.chainId),
        name: network.name || `Chain ${Number(network.chainId)}`
      };
      setCurrentNetwork(networkInfo);
      
      console.log("🌐 Current Network:", networkInfo);
      console.log("📍 Expected Network:", {
        chainId: config.chainId,
        name: config.chainName
      });
      
      if (Number(network.chainId) !== config.chainId) {
        console.warn("⚠️ Network mismatch!");
        console.warn(`Expected: ${config.chainName} (${config.chainId})`);
        console.warn(`Connected: ${networkInfo.name} (${networkInfo.chainId})`);
        alert(`Wrong network! Please switch to ${config.chainName}`);
        return;
      }
      
      console.log("✅ Network correct, requesting accounts...");
      const accounts = await provider.send("eth_requestAccounts", []);
      console.log("👛 Connected accounts:", accounts);
      
      const connectedAccount = accounts[0];
      console.log("🎯 Using account:", connectedAccount);
      
      setAccount(connectedAccount);
      await loadBalances(connectedAccount);
      
      console.log("✅ === Wallet Connection Complete ===");
    } catch (error) {
      console.error("❌ === Wallet Connection Failed ===");
      console.error("Error:", error);
      
      if ((error as any).code) {
        console.error("Error code:", (error as any).code);
      }
      if ((error as any).message) {
        console.error("Error message:", (error as any).message);
      }
      
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Load balances
  const loadBalances = async (userAddress: string) => {
    try {
      console.log("🔍 === DEBUG: Loading Balances ===");
      console.log("📍 User Address:", userAddress);
      console.log("🌐 Network:", config.chainName);
      console.log("🔗 Chain ID:", config.chainId);
      console.log("💰 GToken Contract:", config.contracts.gToken);
      console.log("🔒 GTokenStaking Contract:", config.contracts.gTokenStaking);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get network info
      const network = await provider.getNetwork();
      console.log("📡 Provider Network:", {
        chainId: Number(network.chainId),
        name: network.name
      });

      // Load ETH balance first
      console.log("💎 Loading ETH balance...");
      const ethBalanceWei = await provider.getBalance(userAddress);
      const formattedEthBalance = ethers.formatEther(ethBalanceWei);
      console.log("💎 ETH Balance Results:");
      console.log("   Raw:", ethBalanceWei.toString());
      console.log("   Formatted:", formattedEthBalance);
      setEthBalance(formattedEthBalance);

      // Load GToken balance
      console.log("🪙 Loading GToken balance...");
      const gtokenContract = new ethers.Contract(
        config.contracts.gToken,
        ERC20_ABI,
        provider
      );
      
      // Test contract connection
      try {
        const symbol = await gtokenContract.symbol();
        const decimals = await gtokenContract.decimals();
        console.log("✅ GToken Contract Connected:", { symbol, decimals });
      } catch (contractError) {
        console.error("❌ GToken Contract Connection Failed:", contractError);
        throw contractError;
      }
      
      const gtBalance = await gtokenContract.balanceOf(userAddress);
      const formattedGtBalance = ethers.formatEther(gtBalance);
      console.log("💰 GToken Balance Results:");
      console.log("   Raw:", gtBalance.toString());
      console.log("   Formatted:", formattedGtBalance);
      setGtokenBalance(formattedGtBalance);

      // Load stGToken balance
      console.log("🔒 Loading stGToken balance...");
      const stakingContract = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI,
        provider
      );
      
      // Test staking contract connection
      try {
        const name = await stakingContract.name();
        console.log("✅ GTokenStaking Contract Connected:", name);
      } catch (contractError) {
        console.error("❌ GTokenStaking Contract Connection Failed:", contractError);
        // Don't throw here, continue with GToken balance
      }
      
      const stGtBalance = await stakingContract.balanceOf(userAddress);
      const formattedStGtBalance = ethers.formatEther(stGtBalance);
      console.log("🔒 stGToken Balance Results:");
      console.log("   Raw:", stGtBalance.toString());
      console.log("   Formatted:", formattedStGtBalance);
      setStGtokenBalance(formattedStGtBalance);

      // Check for pending unstake
      try {
        const stakeInfo = await stakingContract.getStakeInfo(userAddress);
        const unstakeRequestedAt = stakeInfo[3];
        
        if (unstakeRequestedAt > 0n) {
          const unstakeTime = Number(unstakeRequestedAt);
          const now = Math.floor(Date.now() / 1000);
          const unstakeDelay = 7 * 24 * 60 * 60; // 7 days in seconds
          const canComplete = now >= (unstakeTime + unstakeDelay);
          
          setPendingUnstakeInfo({
            timestamp: unstakeTime,
            canComplete
          });
          
          console.log("⏰ Pending unstake detected:", {
            requestedAt: new Date(unstakeTime * 1000).toLocaleString(),
            canComplete,
            remainingTime: canComplete ? 0 : (unstakeTime + unstakeDelay - now)
          });
        } else {
          setPendingUnstakeInfo(null);
        }
      } catch (unstakeError) {
        console.warn("Failed to check pending unstake:", unstakeError);
        setPendingUnstakeInfo(null);
      }
      
      console.log("✅ === Balance Loading Complete ===");
    } catch (error) {
      console.error("❌ === Balance Loading Failed ===");
      console.error("Error details:", error);
      console.error("User address:", userAddress);
      console.error("GToken contract:", config.contracts.gToken);
      console.error("Network:", config.chainName);
      
      // Try to get more specific error info
      if ((error as any).code) {
        console.error("Error code:", (error as any).code);
      }
      if ((error as any).message) {
        console.error("Error message:", (error as any).message);
      }
      if ((error as any).data) {
        console.error("Error data:", (error as any).data);
      }
    }
  };

  // Handle cancel unstake
  const handleCancelUnstake = async () => {
    if (!account) {
      setError("Please connect your wallet first!");
      return;
    }

    try {
      setIsStaking(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const stakingContract = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI,
        signer
      );

      console.log("🚫 Cancelling unstake request...");
      const cancelTx = await stakingContract.cancelUnstake();
      console.log("Transaction sent:", cancelTx.hash);

      const receipt = await cancelTx.wait();
      console.log("✅ Unstake cancelled successfully!");

      setTxHash(receipt.hash);
      setError("");

      // Reload balances
      await loadBalances(account);
    } catch (error: any) {
      console.error("❌ Cancel unstake failed:", error);
      
      let errorMsg = "Failed to cancel unstake!\n\n";
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "Transaction cancelled by user.";
      } else {
        errorMsg += error.message || "Unknown error";
      }
      
      setError(errorMsg);
    } finally {
      setIsStaking(false);
    }
  };

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

      const stakingContract = new ethers.Contract(
        config.contracts.gTokenStaking,
        GTokenStakingABI,
        signer
      );

      console.log("✅ Completing unstake...");
      const unstakeTx = await stakingContract.unstake();
      console.log("Transaction sent:", unstakeTx.hash);

      const receipt = await unstakeTx.wait();
      console.log("✅ Unstake completed successfully!");

      setTxHash(receipt.hash);
      setError("");

      // Reload balances
      await loadBalances(account);
    } catch (error: any) {
      console.error("❌ Complete unstake failed:", error);
      
      let errorMsg = "Failed to complete unstake!\n\n";
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "Transaction cancelled by user.";
      } else {
        errorMsg += error.message || "Unknown error";
      }
      
      setError(errorMsg);
    } finally {
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
      setError("Please enter a valid stake amount!");
      return;
    }

    // Check ETH balance for gas fees
    if (parseFloat(ethBalance) === 0) {
      setError(
        `⚠️ INSUFFICIENT ETH FOR GAS FEES\n\n` +
        `Your ETH balance is 0. You need ETH to pay for gas fees when staking GToken.\n\n` +
        `Please get free testnet ETH from these faucets:\n` +
        config.resources.ethFaucets.map((faucet, index) => `• Faucet ${index + 1}: ${faucet}`).join('\n') +
        `\n\nAfter getting ETH, your balance will update automatically.`
      );
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

  // Check network on component mount
  useEffect(() => {
    checkCurrentNetwork();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        console.log("🔄 === DEBUG: Accounts Changed ===");
        console.log("New accounts:", accounts);
        
        if (accounts.length > 0) {
          const newAccount = accounts[0];
          console.log("🎯 New active account:", newAccount);
          setAccount(newAccount);
          
          // Load balances for new account
          console.log("📊 Loading balances for new account...");
          loadBalances(newAccount);
        } else {
          console.log("🚫 No accounts connected");
          setAccount("");
          setGtokenBalance("0");
          setStGtokenBalance("0");
          setEthBalance("0");
        }
      });

      // Listen for network changes
      window.ethereum.on("chainChanged", (chainId: string) => {
        console.log("🌐 === DEBUG: Network Changed ===");
        console.log("New chain ID:", chainId);
        console.log("Expected chain ID:", `0x${config.chainId.toString(16)}`);
        
        // Update network state
        setTimeout(() => {
          checkCurrentNetwork();
        }, 1000); // Delay to ensure MetaMask has updated
        
        // Reload balances if account is connected
        if (account) {
          console.log("📊 Reloading balances after network change...");
          loadBalances(account);
        }
      });
    }
  }, [account]);

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
                <div className="debug-info" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                  <p>
                    <strong>Network:</strong> 
                    <span style={{ 
                      color: currentNetwork?.chainId === config.chainId ? '#10b981' : '#ef4444',
                      fontWeight: 'bold'
                    }}>
                      {currentNetwork ? `${currentNetwork.name} (${currentNetwork.chainId})` : 'Unknown'}
                    </span>
                    {currentNetwork?.chainId !== config.chainId && (
                      <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>
                        ⚠️ Expected: {config.chainName} ({config.chainId})
                      </span>
                    )}
                  </p>
                  <p><strong>ETH Balance:</strong> <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{parseFloat(ethBalance).toFixed(4)} ETH</span></p>
                  <p><strong>GToken:</strong> <span className="mono" style={{ fontSize: '0.75rem' }}>{config.contracts.gToken}</span></p>
                  <p><strong>GTokenStaking:</strong> <span className="mono" style={{ fontSize: '0.75rem' }}>{config.contracts.gTokenStaking}</span></p>
                </div>
              </div>

              <div className="balance-display">
                <div className="balance-item">
                  <span className="label">ETH Balance:</span>
                  <span className="value" style={{ 
                    color: parseFloat(ethBalance) === 0 ? '#ef4444' : '#3b82f6',
                    fontWeight: parseFloat(ethBalance) === 0 ? 'bold' : 'normal'
                  }}>
                    {parseFloat(ethBalance).toFixed(4)} ETH
                    {parseFloat(ethBalance) === 0 && ' ⚠️'}
                  </span>
                </div>
                {parseFloat(ethBalance) === 0 && (
                  <div className="eth-warning" style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#dc2626', fontWeight: '600' }}>
                      ⚠️ Your ETH balance is 0
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#7f1d1d' }}>
                      You need ETH for gas fees to stake GToken. Get free testnet ETH:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {config.resources.ethFaucets.map((faucet, index) => (
                        <a
                          key={index}
                          href={faucet}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}
                        >
                          🚰 Faucet {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="balance-item">
                  <span className="label">GToken Balance:</span>
                  <span className="value highlight">{parseFloat(gtokenBalance).toFixed(2)} GT</span>
                </div>
                <div className="balance-item">
                  <span className="label">stGToken Balance:</span>
                  <span className="value highlight">{parseFloat(stGtokenBalance).toFixed(2)} stGT</span>
                </div>
              </div>

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
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleCancelUnstake}
                      disabled={isStaking}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        cursor: isStaking ? 'not-allowed' : 'pointer',
                        opacity: isStaking ? 0.6 : 1
                      }}
                    >
                      {isStaking ? 'Cancelling...' : '🚫 Cancel Unstake'}
                    </button>
                    {pendingUnstakeInfo.canComplete && (
                      <button
                        onClick={handleCompleteUnstake}
                        disabled={isStaking}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          cursor: isStaking ? 'not-allowed' : 'pointer',
                          opacity: isStaking ? 0.6 : 1
                        }}
                      >
                        {isStaking ? 'Completing...' : '✅ Complete Unstake'}
                      </button>
                    )}
                  </div>
                  <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: '#92400e' }}>
                    💡 You must cancel or complete the pending unstake before staking more GToken.
                  </p>
                </div>
              )}

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

                  {/* GToken Stake Requirements by Use Case */}
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#374151', fontWeight: '600' }}>
                      GToken Stake Requirements by Use Case
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#6b7280' }}>Mint MySBT:</span>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          0.4 GT <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>(0.3 lock + 0.1 burn)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#6b7280' }}>Register Community:</span>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          30 GT <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>(lock)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#6b7280' }}>Deploy Paymaster (AOA):</span>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          30 GT <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>(lock for reputation)</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#6b7280' }}>Use SuperPaymaster (AOA+):</span>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          50 GT
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: '#6b7280' }}>More service:</span>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          on building
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                <button
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0 || pendingUnstakeInfo !== null}
                  className="action-button primary stake-button"
                  title={pendingUnstakeInfo ? "Please resolve pending unstake first" : ""}
                >
                  {pendingUnstakeInfo 
                    ? "⏳ Pending Unstake - Cannot Stake"
                    : isStaking 
                      ? "Staking..." 
                      : `Stake ${stakeAmount || "0"} GToken`
                  }
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
                <p>For test purpose, get free testnet GToken from our faucet</p>
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
                   <h3>Method 2: Buy real GToken from DEX</h3>
                 </div>
                 <p>Swap GToken in our DEX on Uniswap V4(On building).</p>
                 <ul>
                   <li>Practice trading before mainnet</li>
                   <li>Use any acceptable token to swap</li>
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

              <div className="method-card">
                <div className="method-header">
                  <h3>Method 3: Buy real GToken from Shops</h3>
                </div>
                <p>accept xPNTs(On building).</p>
                <ul>
                  <li>Direct purchase with community tokens</li>
                  <li>Support community ecosystem</li>
                </ul>
                <a
                  href="https://shops.aastar.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Go to Shops →
                </a>
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
                   <h3>Method 2: Buy real GToken from DEX</h3>
                 </div>
                 <p>Swap GToken in our DEX on Uniswap V4(On building).</p>
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
                  <h3>Method 3: Buy real GToken from Shops</h3>
                </div>
                <p>accept xPNTs(On building).</p>
                <ul>
                  <li>Direct purchase with community tokens</li>
                  <li>Support community ecosystem</li>
                </ul>
                <a
                  href="https://shops.aastar.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button secondary"
                >
                  Go to Shops →
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
