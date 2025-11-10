/**
 * Get GToken Resource Page
 *
 * Guides users on how to obtain GToken for staking
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import {
  getAllV2Contracts,
  getCoreContracts,
  getTokenContracts,
  getBlockExplorer,
  SEPOLIA_V2_VERSIONS,
  getV2ContractByName,
  getRpcUrl,
  getChainId,
  getNetwork,
  GTokenABI,
  GTokenStakingABI,
} from "@aastar/shared-config";
import "./GetGToken.css";

const GetGToken: React.FC = () => {
  const navigate = useNavigate();

  // Get all config from shared-config
  const network = getNetwork("sepolia");
  const core = getCoreContracts("sepolia");
  const tokens = getTokenContracts("sepolia");
  const RPC_URL = getRpcUrl("sepolia");
  const EXPLORER_URL = getBlockExplorer("sepolia");
  const CHAIN_ID = getChainId("sepolia");

  // Get contract addresses from shared-config
  const GTOKEN_ADDRESS = core.gToken;
  const GTOKEN_STAKING_ADDRESS = core.gTokenStaking;

  // Version info state
  const [gtokenVersion, setGtokenVersion] = useState<string>("");
  const [gtokenStakingVersion, setGtokenStakingVersion] = useState<string>("");
  const [sharedConfigVersion, setSharedConfigVersion] = useState<string>("");

  // Get shared-config version
  const getSharedConfigVersion = async () => {
    try {
      return "0.3.4";
    } catch (error) {
      console.warn(
        "Could not fetch shared-config version, using default:",
        error,
      );
      return "0.3.4";
    }
  };

  // Get expected contract versions from shared-config
  const getExpectedContractVersion = (contractName: string) => {
    try {
      // Use SEPOLIA_V2_VERSIONS directly
      if (contractName === "gToken" && SEPOLIA_V2_VERSIONS.core.gToken) {
        return `${SEPOLIA_V2_VERSIONS.core.gToken.version} (${SEPOLIA_V2_VERSIONS.core.gToken.versionCode})`;
      }
      if (
        contractName === "gTokenStaking" &&
        SEPOLIA_V2_VERSIONS.core.gTokenStaking
      ) {
        return `${SEPOLIA_V2_VERSIONS.core.gTokenStaking.version} (${SEPOLIA_V2_VERSIONS.core.gTokenStaking.versionCode})`;
      }
      return "Unknown";
    } catch (error) {
      console.warn(`Could not get expected ${contractName} version:`, error);
      return "Unknown";
    }
  };

  // Fetch version information on mount
  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const sharedConfigVersion = `@aastar/shared-config@${await getSharedConfigVersion()}`;
        setSharedConfigVersion(sharedConfigVersion);

        // Get expected versions from shared-config
        const gtokenVer = getExpectedContractVersion("gToken");
        const gtokenStakingVer = getExpectedContractVersion("gTokenStaking");

        setGtokenVersion(gtokenVer);
        setGtokenStakingVersion(gtokenStakingVer);

        console.log("GToken Version:", gtokenVer);
        console.log("GTokenStaking Version:", gtokenStakingVer);

        console.log("=== GToken Page Version Information ===");
        console.log("Shared Config:", sharedConfigVersion);
        console.log("GToken Address:", GTOKEN_ADDRESS);
        console.log("GToken Version:", getExpectedContractVersion("gToken"));
        console.log("GTokenStaking Address:", GTOKEN_STAKING_ADDRESS);
        console.log(
          "GTokenStaking Version:",
          getExpectedContractVersion("gTokenStaking"),
        );
        console.log("Timestamp:", new Date().toISOString());
        console.log("=========================================");
      } catch (error) {
        console.error("Error fetching version info:", error);
        setGtokenVersion("Error");
        setGtokenStakingVersion("Error");
        setSharedConfigVersion("Error");
      }
    };

    fetchVersionInfo();
  }, []);

  // Wallet & Contract state
  const [account, setAccount] = useState<string>("");
  const [gtokenBalance, setGtokenBalance] = useState<string>("0");
  const [stGtokenBalance, setStGtokenBalance] = useState<string>("0");
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [isStaking, setIsStaking] = useState(false);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentNetwork, setCurrentNetwork] = useState<{
    chainId: number;
    name: string;
  } | null>(null);
  const [pendingUnstakeInfo, setPendingUnstakeInfo] = useState<{
    timestamp: number;
    canComplete: boolean;
  } | null>(null);

  const handleGoBack = () => {
    navigate(-1);
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert(
          "MetaMask is not installed. Please install MetaMask to continue.",
        );
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check network
      const chainId = Number((await provider.getNetwork()).chainId);

      // Set current network info
      const networkInfo = {
        chainId,
        name: network.name || `Chain ${chainId}`,
      };
      setCurrentNetwork(networkInfo);
      console.log("🌐 Current network detected:", networkInfo);

      if (chainId !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number }).code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: `0x${CHAIN_ID.toString(16)}`,
                    chainName: network.name,
                    rpcUrls: [network.rpcUrl],
                    blockExplorerUrls: [network.blockExplorer],
                  },
                ],
              });
            } catch {
              alert(
                `Failed to add ${network.name} network. Please add it manually.`,
              );
              return;
            }
          } else {
            alert(
              `Failed to switch to ${network.name}. Please switch manually.`,
            );
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
  const loadBalances = useCallback(
    async (userAddress: string) => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);

        // Load ETH balance
        const ethBalanceWei = await provider.getBalance(userAddress);
        const formattedEthBalance = ethers.formatEther(ethBalanceWei);
        setEthBalance(formattedEthBalance);

        // Load GToken balance
        const gTokenContract = new ethers.Contract(
          GTOKEN_ADDRESS,
          GTokenABI,
          provider,
        );
        const gTokenBalanceWei = await gTokenContract.balanceOf(userAddress);
        const formattedGtBalance = ethers.formatEther(gTokenBalanceWei);
        setGtokenBalance(formattedGtBalance);

        // Load stGToken balance
        const stakingContract = new ethers.Contract(
          GTOKEN_STAKING_ADDRESS,
          GTokenStakingABI,
          provider,
        );
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
          const isValidUnstakeRequest =
            unstakeRequestedAt > 0n &&
            unstakeRequestedAt > stakedAt &&
            Number(unstakeRequestedAt) <= now;

          if (isValidUnstakeRequest) {
            const unstakeTime = Number(unstakeRequestedAt);
            const unstakeDelay = 7 * 24 * 60 * 60; // 7 days in seconds
            const canComplete = now >= unstakeTime + unstakeDelay;

            setPendingUnstakeInfo({
              timestamp: unstakeTime,
              canComplete,
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
        console.error("GToken contract:", GTOKEN_ADDRESS);
        console.error("Network:", network.name);

        // Try to get more specific error info
        if ((error as { code?: string }).code) {
          console.error("Error code:", (error as { code?: string }).code);
        }
        if ((error as { message?: string }).message) {
          console.error(
            "Error message:",
            (error as { message?: string }).message,
          );
        }
        if ((error as { data?: string }).data) {
          console.error("Error data:", (error as { data?: string }).data);
        }
      }
    },
    [GTOKEN_ADDRESS, GTOKEN_STAKING_ADDRESS, network.name],
  );

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
        GTOKEN_STAKING_ADDRESS,
        GTokenStakingABI,
        signer,
      );

      // Pre-flight check: Verify unstake has been requested and cooldown period passed
      const stakeInfo = await stakingContract.getStakeInfo(account);
      const unstakeRequestedAt = stakeInfo.unstakeRequestedAt;

      if (unstakeRequestedAt === 0n) {
        setError("No unstake request found. Please request unstake first.");
        return;
      }

      const unstakeTime = Number(unstakeRequestedAt);
      const now = Math.floor(Date.now() / 1000);
      const unstakeDelay = 7 * 24 * 60 * 60; // 7 days in seconds

      if (now < unstakeTime + unstakeDelay) {
        const remainingTime = unstakeTime + unstakeDelay - now;
        const days = Math.floor(remainingTime / (24 * 60 * 60));
        const hours = Math.floor((remainingTime % (24 * 60 * 60)) / (60 * 60));
        setError(
          `Unstake cooldown period not yet passed.\n\nTime remaining: ${days} days ${hours} hours`,
        );
        return;
      }

      console.log("✅ Completing unstake...");
      const unstakeTx = await stakingContract.unstake();
      console.log("Transaction sent:", unstakeTx.hash);

      const receipt = await unstakeTx.wait();
      console.log("✅ Unstake completed successfully!");

      setTxHash(receipt.hash);
      setError("");

      // Reload balances
      await loadBalances(account);
    } catch (error: unknown) {
      console.error("❌ Complete unstake failed:", error);

      let errorMsg = "Failed to complete unstake!\n\n";
      if ((error as { code?: string }).code === "ACTION_REJECTED") {
        errorMsg = "Transaction cancelled by user.";
      } else if (
        (error as { message?: string }).message &&
        (error as { message?: string }).message?.includes("StakeIsLocked")
      ) {
        errorMsg =
          "Cannot unstake: Some tokens are still locked.\n\nPlease wait for all locks to expire or use appropriate unlock functions.";
      } else if (
        (error as { message?: string }).message &&
        (error as { message?: string }).message?.includes("UnstakeNotRequested")
      ) {
        errorMsg =
          "No unstake request found.\n\nPlease request unstake first and wait for cooldown period.";
      } else {
        errorMsg = `Complete unstake failed: ${(error as { message?: string }).message || error}`;
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
          `Please get free testnet ETH from faucet:\n` +
          `• https://sepoliafaucet.com/\n` +
          `• https://www.infura.io/faucet/sepolia\n` +
          `\n\nAfter getting ETH, your balance will update automatically.`,
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
      console.log("GToken contract:", GTOKEN_ADDRESS);
      console.log("GTokenStaking contract:", GTOKEN_STAKING_ADDRESS);

      // Pre-flight Check 1: Verify GToken balance
      const gtokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        GTokenABI,
        provider,
      );
      const gTokenBalance = await gtokenContract.balanceOf(account);
      console.log("GToken balance:", ethers.formatEther(gTokenBalance), "GT");

      if (gTokenBalance < amountWei) {
        setError(
          `Insufficient GToken balance!\n\n` +
            `You have: ${ethers.formatEther(gTokenBalance)} GT\n` +
            `Required: ${stakeAmount} GT\n\n` +
            `GToken contract: ${GTOKEN_ADDRESS}`,
        );
        return;
      }
      console.log("✅ Sufficient GToken balance");

      // Pre-flight Check 2: Check existing stake
      const stakingContract = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTokenStakingABI,
        provider,
      );

      const stakeInfo = await stakingContract.getStakeInfo(account);
      // stakeInfo returns: [amount, sGTokenShares, stakedAt, unstakeRequestedAt]
      const stakedAmount = stakeInfo.amount;
      const unstakeRequestedAt = stakeInfo.unstakeRequestedAt;

      if (stakedAmount > 0n) {
        console.log(
          `⚠️ Existing stake: ${ethers.formatEther(stakedAmount)} GT\n` +
            `New stake: ${stakeAmount} GT\n` +
            `Total will be: ${ethers.formatEther(stakedAmount + amountWei)} GT`,
        );
      }

      // Pre-flight Check 3: Pending unstake request
      if (unstakeRequestedAt > 0n) {
        setError(
          `You have a pending unstake request!\n\n` +
            `Requested at: ${new Date(Number(unstakeRequestedAt) * 1000).toLocaleString()}\n\n` +
            `Please complete or cancel the unstake before staking more.`,
        );
        return;
      }
      console.log("✅ No pending unstake request");

      // Step 1: Approve GToken
      const gtokenContractSigner = new ethers.Contract(
        GTOKEN_ADDRESS,
        GTokenABI,
        signer,
      );

      const currentAllowance = await gtokenContractSigner.allowance(
        account,
        GTOKEN_STAKING_ADDRESS,
      );

      if (currentAllowance < amountWei) {
        console.log("📝 Approving GToken...");
        const approveTx = await gtokenContractSigner.approve(
          GTOKEN_STAKING_ADDRESS,
          amountWei,
        );
        await approveTx.wait();
        console.log("✅ Approval successful!");
      } else {
        console.log("✅ Already approved");
      }

      // Step 2: Stake
      const stakingContractSigner = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTokenStakingABI,
        signer,
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
    } catch (error: unknown) {
      console.error("❌ Staking failed:", error);

      // Enhanced error message
      let errorMsg = "Staking failed!\n\n";

      if ((error as { code?: string }).code === "CALL_EXCEPTION") {
        errorMsg += `Transaction reverted.\n\n`;
        if ((error as { data?: string }).data) {
          errorMsg += `Error data: ${(error as { data?: string }).data}\n\n`;
        }
        errorMsg += `Possible reasons:\n`;
        errorMsg += `• Insufficient GToken balance\n`;
        errorMsg += `• Pending unstake request\n`;
        errorMsg += `• Contract interaction issue\n\n`;
        errorMsg += `Contract addresses:\n`;
        errorMsg += `GToken: ${GTOKEN_ADDRESS}\n`;
        errorMsg += `GTokenStaking: ${GTOKEN_STAKING_ADDRESS}\n\n`;
        errorMsg += `Please check browser console for details.`;
      } else if ((error as { code?: string }).code === "ACTION_REJECTED") {
        errorMsg = "Transaction cancelled by user.";
      } else {
        errorMsg += (error as { message?: string }).message || "Unknown error";
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
  }, [account, loadBalances]);

  // Set current network info on component mount
  useEffect(() => {
    const setNetworkInfo = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const chainId = Number((await provider.getNetwork()).chainId);
        const networkInfo = {
          chainId,
          name: network.name || `Chain ${chainId}`,
        };
        setCurrentNetwork(networkInfo);
        console.log("🌐 Current network detected:", networkInfo);
      }
    };

    setNetworkInfo();
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
        console.log("Expected chain ID:", `0x${CHAIN_ID.toString(16)}`);

        // Update network state
        setTimeout(() => {
          // Re-check network info after change
          setNetworkInfo();
        }, 1000); // Delay to ensure MetaMask has updated

        // Reload balances if account is connected
        if (account) {
          console.log("📊 Reloading balances after network change...");
          loadBalances(account);
        }
      });
    }
  }, [account, CHAIN_ID, loadBalances]);

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
              <p
                className="subtitle"
                style={{ color: "#e5e7eb", fontWeight: "500" }}
              >
                GToken is required for staking in the SuperPaymaster ecosystem
              </p>
            </div>
            <a href="/operator/wizard" className="wizard-link">
              🚀 Launch Wizard
            </a>
          </div>
        </div>

        {/* Version Info Banner */}
        <div className="version-info-banner">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <div style={{ marginBottom: "8px" }}>
              <strong>GToken Contract:</strong>{" "}
              <a
                href={`${EXPLORER_URL}/address/${GTOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2196f3",
                  textDecoration: "underline",
                  fontFamily: "monospace",
                  fontSize: "0.9em",
                }}
              >
                {GTOKEN_ADDRESS}
              </a>
              <span className="network-badge">Sepolia Testnet</span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <strong>GTokenStaking Contract:</strong>{" "}
              <a
                href={`${EXPLORER_URL}/address/${GTOKEN_STAKING_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2196f3",
                  textDecoration: "underline",
                  fontFamily: "monospace",
                  fontSize: "0.9em",
                }}
              >
                {GTOKEN_STAKING_ADDRESS}
              </a>
              <span className="network-badge">Sepolia Testnet</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>GToken Version:</strong>{" "}
                <span className="version-badge">
                  {gtokenVersion || "Loading..."}
                </span>
              </div>
              <div>
                <strong>GTokenStaking Version:</strong>{" "}
                <span className="version-badge">
                  {gtokenStakingVersion || "Loading..."}
                </span>
              </div>
              <div>
                <strong>Shared Config:</strong>{" "}
                <span className="version-badge">{sharedConfigVersion}</span>
              </div>
            </div>
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
                  Connected:{" "}
                  <span className="mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </p>
                <div
                  className="debug-info"
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.85rem",
                    color: "#666",
                  }}
                >
                  <p>
                    <strong>Network:</strong>
                    <span
                      style={{
                        color:
                          currentNetwork?.chainId === CHAIN_ID
                            ? "#10b981"
                            : "#ef4444",
                        fontWeight: "bold",
                      }}
                    >
                      {currentNetwork
                        ? `${currentNetwork.name} (${currentNetwork.chainId})`
                        : "Unknown"}
                    </span>
                    {currentNetwork?.chainId !== config.chainId && (
                      <span style={{ color: "#ef4444", marginLeft: "0.5rem" }}>
                        ⚠️ Expected: {network.name} ({CHAIN_ID})
                      </span>
                    )}
                  </p>
                  <p>
                    <strong>ETH Balance:</strong>{" "}
                    <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
                      {parseFloat(ethBalance).toFixed(4)} ETH
                    </span>
                  </p>
                  <p>
                    <strong>GToken:</strong>{" "}
                    <span className="mono" style={{ fontSize: "0.75rem" }}>
                      {GTOKEN_ADDRESS}
                    </span>
                  </p>
                  <p>
                    <strong>GTokenStaking:</strong>{" "}
                    <span className="mono" style={{ fontSize: "0.75rem" }}>
                      {GTOKEN_STAKING_ADDRESS}
                    </span>
                  </p>
                </div>
              </div>

              <div className="balance-display">
                <div className="balance-item">
                  <span className="label">ETH Balance:</span>
                  <span
                    className="value"
                    style={{
                      color:
                        parseFloat(ethBalance) === 0 ? "#ef4444" : "#3b82f6",
                      fontWeight:
                        parseFloat(ethBalance) === 0 ? "bold" : "normal",
                    }}
                  >
                    {parseFloat(ethBalance).toFixed(4)} ETH
                    {parseFloat(ethBalance) === 0 && " ⚠️"}
                  </span>
                </div>
                {parseFloat(ethBalance) === 0 && (
                  <div
                    className="eth-warning"
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.75rem",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 0.5rem 0",
                        color: "#dc2626",
                        fontWeight: "600",
                      }}
                    >
                      ⚠️ Your ETH balance is 0
                    </p>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#7f1d1d" }}>
                      You need ETH for gas fees to stake GToken. Get free
                      testnet ETH:
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <a
                        href="https://sepoliafaucet.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#dc2626",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                        }}
                      >
                        🚰 Sepolia Faucet
                      </a>
                      <a
                        href="https://www.infura.io/faucet/sepolia"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#dc2626",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                          marginLeft: "0.5rem",
                        }}
                      >
                        🚰 Infura Faucet
                      </a>
                    </div>

                  </div>
                )}
                <div className="balance-item">
                  <span className="label">GToken Balance:</span>
                  <span className="value highlight">
                    {parseFloat(gtokenBalance).toFixed(2)} GT
                  </span>
                </div>
                <div className="balance-item">
                  <span className="label">stGToken Balance:</span>
                  <span className="value highlight">
                    {parseFloat(stGtokenBalance).toFixed(2)} stGT
                  </span>
                </div>

                {/* stGToken Action Links */}
                {parseFloat(stGtokenBalance) > 0 && (
                  <div
                    className="stgtoken-actions"
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #0ea5e9",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 0.75rem 0",
                        color: "#0c4a6e",
                        fontWeight: "600",
                      }}
                    >
                      💡 Use your staked GToken:
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <a
                        href="/get-sbt"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.5rem 1rem",
                          backgroundColor: "#0ea5e9",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#0284c7")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#0ea5e9")
                        }
                      >
                        🎫 Mint your MySBT
                      </a>
                      <a
                        href="/register-community"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.5rem 1rem",
                          backgroundColor: "#10b981",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#059669")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#10b981")
                        }
                      >
                        🏛️ Register a Community
                      </a>
                      <a
                        href="/operator/wizard"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.5rem 1rem",
                          backgroundColor: "#8b5cf6",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#7c3aed")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#8b5cf6")
                        }
                      >
                        🚀 Launch a Paymaster
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Pending Unstake Information */}
              {pendingUnstakeInfo && (
                <div
                  className="pending-unstake-info"
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fbbf24",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 0.75rem 0",
                      color: "#92400e",
                      fontWeight: "600",
                    }}
                  >
                    ⏰ Pending Unstake Request
                  </h4>
                  <p style={{ margin: "0 0 0.5rem 0", color: "#78350f" }}>
                    <strong>Requested at:</strong>{" "}
                    {new Date(
                      pendingUnstakeInfo.timestamp * 1000,
                    ).toLocaleString()}
                  </p>
                  <p style={{ margin: "0 0 1rem 0", color: "#78350f" }}>
                    <strong>Status:</strong>{" "}
                    {pendingUnstakeInfo.canComplete
                      ? "✅ Ready to complete"
                      : "⏳ 7-day cooldown in progress"}
                  </p>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                  >
                    {pendingUnstakeInfo.canComplete && (
                      <button
                        onClick={handleCompleteUnstake}
                        disabled={isStaking}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#059669",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                          fontWeight: "500",
                          cursor: isStaking ? "not-allowed" : "pointer",
                          opacity: isStaking ? 0.6 : 1,
                        }}
                      >
                        {isStaking ? "Completing..." : "✅ Complete Unstake"}
                      </button>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "0.75rem 0 0 0",
                      fontSize: "0.8rem",
                      color: "#92400e",
                    }}
                  >
                    💡 Unstake requests cannot be cancelled.{" "}
                    {pendingUnstakeInfo.canComplete
                      ? "You can complete the unstake now."
                      : "You must wait the full 7-day cooldown period before completing."}
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
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 0.75rem 0",
                        fontSize: "0.9rem",
                        color: "#374151",
                        fontWeight: "600",
                      }}
                    >
                      GToken Stake Requirements by Use Case
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>Mint MySBT:</span>
                        <span style={{ fontWeight: "500", color: "#111827" }}>
                          0.4 GT{" "}
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#9ca3af",
                              fontWeight: "normal",
                            }}
                          >
                            (0.3 lock + 0.1 burn)
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>
                          Register Community:
                        </span>
                        <span style={{ fontWeight: "500", color: "#111827" }}>
                          30 GT{" "}
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#9ca3af",
                              fontWeight: "normal",
                            }}
                          >
                            (lock)
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>
                          Deploy Paymaster (AOA):
                        </span>
                        <span style={{ fontWeight: "500", color: "#111827" }}>
                          30 GT{" "}
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#9ca3af",
                              fontWeight: "normal",
                            }}
                          >
                            (lock for reputation)
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>
                          Use SuperPaymaster (AOA+):
                        </span>
                        <span style={{ fontWeight: "500", color: "#111827" }}>
                          50 GT
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>More service:</span>
                        <span style={{ fontWeight: "500", color: "#111827" }}>
                          on building
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStake}
                  disabled={
                    isStaking ||
                    !stakeAmount ||
                    parseFloat(stakeAmount) <= 0 ||
                    pendingUnstakeInfo !== null
                  }
                  className="action-button primary stake-button"
                  title={
                    pendingUnstakeInfo
                      ? "Please resolve pending unstake first"
                      : ""
                  }
                >
                  {pendingUnstakeInfo
                    ? "⏳ Pending Unstake - Cannot Stake"
                    : isStaking
                      ? "Staking..."
                      : `Stake ${stakeAmount || "0"} GToken`}
                </button>

                {error && (
                  <div
                    className="error-message"
                    style={{
                      whiteSpace: "pre-wrap",
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "#fee",
                      border: "1px solid #fcc",
                      borderRadius: "4px",
                      color: "#c33",
                    }}
                  >
                    {error}
                  </div>
                )}

                {txHash && (
                  <div className="tx-success">
                    <p>✅ Staking successful!</p>
                    <a
                      href={`${EXPLORER_URL}/tx/${txHash}`}
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
                  <li>
                    Stake GToken to receive stGToken (staked GToken) at 1:1
                    ratio
                  </li>
                  <li>
                    stGToken represents your staked position in the protocol
                  </li>
                  <li>
                    You can unstake at any time (with a 7-day cooldown period)
                  </li>
                  <li>
                    stGToken is required for various protocol operations (MySBT
                    minting, community registration)
                  </li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* What is GToken Section */}
        <section className="info-section">
          <h2>💎 What is GToken? Why Stake?</h2>
          <p>
            GToken is the governance token of the SuperPaymaster ecosystem, used
            for:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Staking Requirements</strong>: Stake GToken to become a
              qualified Paymaster operator
            </li>
            <li>
              <strong>Reputation Building</strong>: Higher GToken stake
              increases your reputation score
            </li>
            <li>
              <strong>Governance Participation</strong>: Vote on protocol
              upgrades and parameter changes
            </li>
            <li>
              <strong>Fee Discounts</strong>: Get lower protocol fees with
              higher stake
            </li>
            <li>
              <strong>Anti-sybil</strong>: Stake is a way to anti-sybil attack
              to the protocol
            </li>
            <li>
              <a
                href="https://www.mushroom.box/docs/#/tokenomics-en"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#667eea", textDecoration: "none" }}
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
              <span className="value">{network.name}</span>
            </div>
            <div className="info-row">
              <span className="label">Contract Address:</span>
              <span className="value mono">
                {GTOKEN_ADDRESS}
                <a
                  href={`${EXPLORER_URL}/address/${GTOKEN_ADDRESS}`}
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

        {/* All Deployed Contracts */}
        <section className="info-section">
          <h2>📋 All Deployed Contracts (v0.2.26)</h2>
          <div className="contracts-grid">
            {getAllV2Contracts().map((contract) => (
              <div key={contract.address} className="contract-card">
                <div className="contract-header">
                  <h4>{contract.name}</h4>
                  <span className="version-badge">v{contract.version}</span>
                </div>
                <div className="contract-details">
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span className="value mono">
                      {contract.address.slice(0, 6)}...
                      {contract.address.slice(-4)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Version Code:</span>
                    <span className="value">{contract.versionCode}</span>
                  </div>
                  {contract.features && contract.features.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Features:</span>
                      <span className="value">
                        {contract.features.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <a
                  href={`${EXPLORER_URL}/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Explorer →
                </a>
              </div>
            ))}
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
                <a
                  href="https://sepoliafaucet.com/"
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
                <a
                  href="https://app.uniswap.org/"
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
                  href="https://app.uniswap.org/"
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
                  href="https://app.uniswap.org/"
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
                      address: GTOKEN_ADDRESS,
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
                  <strong>Token Address:</strong> {GTOKEN_ADDRESS}
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
              <strong>30 GToken</strong>.
              However, staking more GToken will increase your reputation score
              and allow you to handle larger transaction volumes.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I unstake my GToken later?</summary>
            <p>
              Yes, you can unstake your GToken at any time. However, there is a
              7-day cooldown period before you can withdraw your tokens to
              prevent rapid changes in operator status.
            </p>
          </details>

          <details className="faq-item">
            <summary>Do I earn rewards for staking GToken?</summary>
            <p>
              No! As a Paymaster operator, you earn service fees from sponsored
              transactions. The more transactions you process, the more revenue
              you earn. Higher GToken stake only qualifies you for additional
              opportunity to be choosed.
            </p>
          </details>

          <details className="faq-item">
            <summary>Is testnet GToken the same as mainnet GToken?</summary>
            <p>
              No, testnet GToken has no real value and is only for testing
              purposes. Mainnet GToken is the real token with actual value.
              Never transfer testnet tokens to mainnet or vice versa.
            </p>
          </details>

          <details className="faq-item">
            <summary>
              What happens to my staked GToken when I burn MySBT?
            </summary>
            <p>
              When you burn (destroy) your MySBT, the locked portion of your
              staked GToken (0.3 GT) is automatically refunded back to your
              wallet. The burned portion (0.1 GT) is permanently destroyed and
              cannot be recovered. This allows you to reclaim most of your stake
              if you no longer need the MySBT.
            </p>
          </details>

          <details className="faq-item">
            <summary>Can I get a refund for my staked GToken?</summary>
            <p>Yes! You can get a refund through these methods:</p>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
              <li>
                <strong>Burn MySBT:</strong> Returns 0.3 GT (locked portion).
                The 0.1 GT burn fee is non-refundable.
              </li>
              <li>
                <strong>Unstake from other services:</strong> Most protocol
                operations allow unstaking with a 7-day cooldown period.
              </li>
              <li>
                <strong>Community deregistration:</strong> Returns locked GToken
                after cooldown (varies by service).
              </li>
            </ul>
            <p style={{ marginTop: "0.5rem" }}>
              Note: Refund mechanisms and cooldown periods are enforced by the
              GTokenStaking smart contract to prevent system abuse.
            </p>
          </details>
        </section>

        {/* Action Buttons */}
        <div className="action-footer">
          <button onClick={handleGoBack} className="action-button secondary">
            ← Back to Deployment
          </button>
          <a
            href={`${EXPLORER_URL}/address/${GTOKEN_ADDRESS}`}
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
