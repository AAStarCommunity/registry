/**
 * Configure SuperPaymaster Page (AOA+ Mode)
 *
 * Register operator to SuperPaymaster V2 for AOA+ mode
 * - Lock stGToken (minimum 50 GT)
 * - Configure supported SBTs
 * - Set xPNTs token address
 * - Set treasury address
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import "./ConfigureSuperPaymaster.css";

// Get contract addresses from config
const networkConfig = getCurrentNetworkConfig();
const SUPERPAYMASTER_ADDRESS = networkConfig.contracts.superPaymasterV2;
const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;

// ABIs
const SUPERPAYMASTER_ABI = [
  "function registerOperator(uint256 stGTokenAmount, address[] memory supportedSBTs, address xPNTsToken, address treasury) external",
  "function accounts(address) external view returns (tuple(uint256 stGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused))",
];

const REGISTRY_ABI = [
  "function communities(address) external view returns (tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint))",
];

const GTOKEN_STAKING_ABI = [
  "function userStakes(address) external view returns (uint256 staked, uint256 locked, uint256 lastStakeTime)",
  "function approve(address spender, uint256 amount) external",
];

// Helper function to get explorer link
const getExplorerLink = (address: string, type: 'address' | 'tx' = 'address'): string => {
  const network = getCurrentNetworkConfig();
  const baseUrl = network.chainId === 11155111
    ? "https://sepolia.etherscan.io"
    : "https://etherscan.io";
  return `${baseUrl}/${type}/${address}`;
};

interface CommunityInfo {
  name: string;
  ensName: string;
  xPNTsToken: string;
  isRegistered: boolean;
}

export function ConfigureSuperPaymaster() {
  const navigate = useNavigate();

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);

  // Community state
  const [communityInfo, setCommunityInfo] = useState<CommunityInfo | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Form state
  const [stGTokenAmount, setStGTokenAmount] = useState<string>("50"); // Minimum 50 GT
  const [treasury, setTreasury] = useState<string>("");

  // Configuration state
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configTxHash, setConfigTxHash] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // GToken stake info
  const [gTokenStaked, setGTokenStaked] = useState<string>("0");
  const [gTokenLocked, setGTokenLocked] = useState<string>("0");

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this feature");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts.length > 0) {
        const addr = accounts[0];
        setAccount(addr);
        setIsConnected(true);
        setTreasury(addr);
        await checkOperatorRegistration(addr);
        await loadCommunityInfo(addr);
        await loadGTokenStake(addr);
      }
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setError(err?.message || "Failed to connect wallet");
    }
  };

  // Load community info from Registry
  const loadCommunityInfo = async (address: string) => {
    setLoadingCommunity(true);
    setError(null);

    try {
      const rpcUrl = getRpcUrl();
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

      const community = await registry.communities(address);

      if (community.registeredAt === 0n) {
        setError("Community not registered. Please register your community first at /register-community");
        setCommunityInfo(null);
        return;
      }

      setCommunityInfo({
        name: community.name,
        ensName: community.ensName,
        xPNTsToken: community.xPNTsToken,
        isRegistered: true,
      });
    } catch (err) {
      console.error("Failed to load community info:", err);
      setError("Failed to load community info");
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Load GToken stake info
  const loadGTokenStake = async (address: string) => {
    try {
      const rpcUrl = getRpcUrl();
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, GTOKEN_STAKING_ABI, provider);

      const userStake = await staking.userStakes(address);
      setGTokenStaked(ethers.formatEther(userStake.staked));
      setGTokenLocked(ethers.formatEther(userStake.locked));
    } catch (err) {
      console.error("Failed to load GToken stake info:", err);
    }
  };

  // Check if operator is already registered
  const checkOperatorRegistration = async (address: string) => {
    try {
      const rpcUrl = getRpcUrl();
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const superPaymaster = new ethers.Contract(
        SUPERPAYMASTER_ADDRESS,
        SUPERPAYMASTER_ABI,
        provider
      );

      const account = await superPaymaster.accounts(address);
      const isRegistered = account.stakedAt !== 0n;

      setIsRegistered(isRegistered);

      if (isRegistered) {
        setError(`You are already registered to SuperPaymaster. Staked: ${ethers.formatEther(account.stGTokenLocked)} stGT`);
      }
    } catch (err) {
      console.error("Failed to check operator registration:", err);
    }
  };

  // Register to SuperPaymaster
  const handleRegister = async () => {
    setIsConfiguring(true);
    setError(null);
    setConfigTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      if (!communityInfo || !communityInfo.isRegistered) {
        throw new Error("Community not registered");
      }

      if (!communityInfo.xPNTsToken || communityInfo.xPNTsToken === ethers.ZeroAddress) {
        throw new Error("xPNTs token not deployed. Please deploy xPNTs first at /get-xpnts");
      }

      if (!ethers.isAddress(treasury)) {
        throw new Error("Invalid treasury address");
      }

      const stGTokenAmountWei = ethers.parseEther(stGTokenAmount);
      if (stGTokenAmountWei < ethers.parseEther("50")) {
        throw new Error("Minimum stGToken amount is 50 GT");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Global MySBT address
      const globalMySBT = networkConfig.contracts.mySBT;

      console.log("📝 Preparing SuperPaymaster registration with config:");
      const config = {
        stGTokenAmount,
        supportedSBTs: [globalMySBT],
        xPNTsToken: communityInfo.xPNTsToken,
        treasury,
      };
      console.log(config);

      const superPaymaster = new ethers.Contract(
        SUPERPAYMASTER_ADDRESS,
        SUPERPAYMASTER_ABI,
        signer
      );

      console.log("⏳ Registering operator to SuperPaymaster...");
      const tx = await superPaymaster.registerOperator(
        stGTokenAmountWei,
        [globalMySBT],
        communityInfo.xPNTsToken,
        treasury
      );
      setConfigTxHash(tx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Registration successful!");

      setIsRegistered(true);
      alert(`Successfully registered to SuperPaymaster!`);
    } catch (err: any) {
      console.error("❌ Registration failed:", err);
      setError(err?.message || "Failed to register to SuperPaymaster");
    } finally {
      setIsConfiguring(false);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          setTreasury(accounts[0]);
          checkOperatorRegistration(accounts[0]);
          loadCommunityInfo(accounts[0]);
          loadGTokenStake(accounts[0]);
        }
      });
    }
  }, []);

  return (
    <div className="configure-superpaymaster-page">
      <div className="configure-superpaymaster-container">
        {/* Header */}
        <div className="configure-superpaymaster-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>⚡ Configure SuperPaymaster (AOA+ Mode)</h1>
          <p className="subtitle">
            Register your operator to SuperPaymaster V2
          </p>
        </div>

        {/* What is SuperPaymaster AOA+ Mode */}
        <div className="info-section">
          <h2>What is AOA+ Mode?</h2>
          <p>
            AOA+ mode allows you to use the shared SuperPaymaster V2 infrastructure
            instead of deploying your own paymaster. Benefits include:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Shared Infrastructure</strong>: No need to deploy and maintain
              individual paymaster contracts
            </li>
            <li>
              <strong>Lower Entry Barrier</strong>: Minimum 50 GT stake (vs 30 GT for
              individual paymaster deployment)
            </li>
            <li>
              <strong>Automatic Updates</strong>: Benefit from protocol upgrades without
              redeployment
            </li>
            <li>
              <strong>aPNTs Balance Management</strong>: Centralized balance tracking
              and refill mechanisms
            </li>
          </ul>
        </div>

        {/* Requirements */}
        <div className="info-section">
          <h2>📋 Requirements</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Minimum stGToken</span>
              <span className="value">50 GT</span>
            </div>
            <div className="info-row">
              <span className="label">Minimum aPNTs Balance</span>
              <span className="value">1000 aPNTs</span>
            </div>
            <div className="info-row">
              <span className="label">Community Registration</span>
              <span className="value">Required</span>
            </div>
            <div className="info-row">
              <span className="label">xPNTs Deployment</span>
              <span className="value">Required</span>
            </div>
          </div>
        </div>

        {/* Deploy Section */}
        <div className="info-section deploy-section">
          <h2>🚀 Register Operator</h2>

          {!isConnected ? (
            <div className="wallet-connect-prompt">
              <p>Connect your wallet to register to SuperPaymaster</p>
              <button className="action-button primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {loadingCommunity && (
                <div className="loading-box">Loading community info...</div>
              )}

              {communityInfo && communityInfo.isRegistered && (
                <div className="community-info-box">
                  <h4>✅ Community Information</h4>
                  <div className="info-row">
                    <span className="label">Community Name</span>
                    <span className="value">{communityInfo.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">ENS Name</span>
                    <span className="value">{communityInfo.ensName || "Not set"}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">xPNTs Token</span>
                    <span className="value mono">
                      {communityInfo.xPNTsToken === ethers.ZeroAddress
                        ? "Not deployed"
                        : communityInfo.xPNTsToken}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="error-box">
                  <h4>⚠️ Error</h4>
                  <p>{error}</p>
                </div>
              )}

              {!isRegistered && communityInfo && communityInfo.isRegistered && (
                <>
                  <div className="wallet-info">
                    <p className="connected-account">
                      Connected: <span className="mono">{account}</span>
                    </p>
                    <p className="connected-account">
                      GToken Staked: <span className="mono">{gTokenStaked} GT</span>
                      {" | "}
                      Locked: <span className="mono">{gTokenLocked} GT</span>
                    </p>
                  </div>

                  <div className="deploy-form">
                    <div className="form-group">
                      <label>stGToken Amount (GT)</label>
                      <input
                        type="number"
                        value={stGTokenAmount}
                        onChange={(e) => setStGTokenAmount(e.target.value)}
                        placeholder="50"
                        min="50"
                      />
                      <small>Minimum 50 GT. This will be locked from your staked GToken.</small>
                    </div>

                    <div className="form-group">
                      <label>Treasury Address</label>
                      <input
                        type="text"
                        value={treasury}
                        onChange={(e) => setTreasury(e.target.value)}
                        placeholder="0x..."
                        className="mono-input"
                      />
                      <small>Address to receive service fees</small>
                    </div>

                    <button
                      className="action-button primary deploy-button"
                      onClick={handleRegister}
                      disabled={isConfiguring || !communityInfo.xPNTsToken || communityInfo.xPNTsToken === ethers.ZeroAddress}
                    >
                      {isConfiguring ? "⏳ Registering..." : "Register to SuperPaymaster"}
                    </button>

                    {configTxHash && (
                      <div className="tx-success">
                        <p>✅ Transaction submitted!</p>
                        <a
                          href={getExplorerLink(configTxHash, 'tx')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="explorer-link"
                        >
                          View on Explorer ↗
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isRegistered && (
                <div className="success-box">
                  <h4>✅ Already Registered</h4>
                  <p>
                    You are already registered to SuperPaymaster. You can now start
                    processing gasless transactions in AOA+ mode.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="action-footer">
          <a href="/operator/wizard" className="action-button outline">
            ← Back to Wizard
          </a>
          <a href="/operator/manage" className="action-button primary">
            Manage SuperPaymaster →
          </a>
        </div>
      </div>
    </div>
  );
}
