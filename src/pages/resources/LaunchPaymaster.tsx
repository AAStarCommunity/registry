/**
 * LaunchPaymaster Page
 *
 * Deploy Paymaster using PaymasterFactory
 * Automatically fetches community info from Registry
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import {
  PaymasterFactoryABI,
  RegistryABI,
  xPNTsFactoryABI,
  xPNTsTokenABI,
  MySBTABI,
} from "../../config/abis";
import "./LaunchPaymaster.css";

// Get contract addresses from config
const networkConfig = getCurrentNetworkConfig();
const PAYMASTER_FACTORY_ADDRESS = networkConfig.contracts.paymasterFactory;
const PAYMASTER_V4_1I_IMPLEMENTATION = "0x3E1C6a741f4b3f8bE24f324342539982324a6f8a"; // From shared-config
const ENTRY_POINT_ADDRESS = networkConfig.contracts.entryPointV07;
const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
const XPNTS_FACTORY_ADDRESS = networkConfig.contracts.xPNTsFactory;
const ETH_USD_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Chainlink Sepolia ETH/USD

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
  xPNTsExchangeRate: string; // Exchange rate between aPNTs and xPNTs
  isRegistered: boolean;
}

export function LaunchPaymaster() {
  const navigate = useNavigate();

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);

  // Community state
  const [communityInfo, setCommunityInfo] = useState<CommunityInfo | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Form state
  const [treasury, setTreasury] = useState<string>("");
  const [serviceFeeRate, setServiceFeeRate] = useState<string>("200"); // 200 basis points = 2%
  const [maxGasCostCap, setMaxGasCostCap] = useState<string>("0.1");
  const [minTokenBalance, setMinTokenBalance] = useState<string>("100");

  // Optional contracts
  const [initialSBT, setInitialSBT] = useState<string>("");
  const [initialGasToken, setInitialGasToken] = useState<string>("");

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState<string>("");
  const [deployedAddress, setDeployedAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [existingPaymaster, setExistingPaymaster] = useState<string>("");

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this feature");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      setIsConnected(true);
      setTreasury(accounts[0]); // Default treasury to connected account
      await checkExistingPaymaster(accounts[0]);
      await loadCommunityInfo(accounts[0]);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err?.message || "Failed to connect wallet");
    }
  };

  // Load community info from Registry
  const loadCommunityInfo = async (address: string) => {
    setLoadingCommunity(true);
    try {
      const rpcUrl = getRpcUrl();
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        RegistryABI,
        provider
      );

      const community = await registry.communities(address);

      if (community.registeredAt !== 0n) {
        let exchangeRate = "1"; // Default 1:1 if no xPNTs token

        // Auto-load xPNTs token if exists and get exchange rate
        if (community.xPNTsToken !== ethers.ZeroAddress) {
          setInitialGasToken(community.xPNTsToken);

          try {
            const xPNTsToken = new ethers.Contract(
              community.xPNTsToken,
              xPNTsTokenABI,
              provider
            );
            const rate = await xPNTsToken.exchangeRate();
            exchangeRate = ethers.formatEther(rate); // Convert from wei to decimal
            console.log("xPNTs Exchange Rate:", exchangeRate);
          } catch (err) {
            console.warn("Failed to get xPNTs exchange rate, using default 1:1");
          }
        }

        setCommunityInfo({
          name: community.name,
          ensName: community.ensName,
          xPNTsToken: community.xPNTsToken,
          xPNTsExchangeRate: exchangeRate,
          isRegistered: true,
        });

        // Calculate minTokenBalance based on exchange rate
        // exchangeRate represents: 1 xPNT = exchangeRate aPNTs
        // So to get 100 aPNTs equivalent: minTokenBalance = 100 / exchangeRate (in xPNTs)
        const rate = parseFloat(exchangeRate);
        const calculatedMinBalance = rate > 0 ? (100 / rate).toFixed(2) : "100";
        setMinTokenBalance(calculatedMinBalance);
        console.log("xPNTs Exchange Rate:", exchangeRate, "→ 1 xPNT =", exchangeRate, "aPNTs");
        console.log("Calculated minTokenBalance:", calculatedMinBalance, "xPNTs (= 100 aPNTs equivalent)");

        // Check for SBT
        const mySBTFactory = networkConfig.contracts.mySBT;
        const sbtFactory = new ethers.Contract(
          mySBTFactory,
          MySBTABI,
          provider
        );
        const hasSBT = await sbtFactory.hasSBT(address);
        if (hasSBT) {
          const sbtAddress = await sbtFactory.getSBTAddress(address);
          setInitialSBT(sbtAddress);
        }
      } else {
        setError("Community not registered. Please register your community first at /register-community");
        setCommunityInfo(null);
      }
    } catch (err) {
      console.error("Failed to load community info:", err);
      setError("Failed to load community info");
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Check if user already deployed a paymaster via factory
  const checkExistingPaymaster = async (address: string) => {
    try {
      const rpcUrl = getRpcUrl();
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const factory = new ethers.Contract(
        PAYMASTER_FACTORY_ADDRESS,
        PaymasterFactoryABI,
        provider
      );

      const hasPaymaster = await factory.hasPaymaster(address);
      if (hasPaymaster) {
        const paymasterAddr = await factory.paymasterByOperator(address);
        setExistingPaymaster(paymasterAddr);
        setError(`You already deployed a Paymaster at ${paymasterAddr}`);
      }
    } catch (err) {
      console.error("Failed to check existing paymaster:", err);
    }
  };

  // Deploy paymaster
  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);
    setDeployTxHash("");
    setDeployedAddress("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      if (!communityInfo || !communityInfo.isRegistered) {
        throw new Error("Community not registered");
      }

      if (!ethers.isAddress(treasury)) {
        throw new Error("Invalid treasury address");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        PAYMASTER_FACTORY_ADDRESS,
        PaymasterFactoryABI,
        signer
      );

      console.log("📝 Preparing Paymaster deployment with config:");
      const config = {
        entryPoint: ENTRY_POINT_ADDRESS,
        owner: account,
        treasury,
        ethUsdPriceFeed: ETH_USD_PRICE_FEED,
        serviceFeeRate,
        maxGasCostCap: ethers.parseEther(maxGasCostCap).toString(),
        minTokenBalance: ethers.parseEther(minTokenBalance).toString(),
        xpntsFactory: XPNTS_FACTORY_ADDRESS,
        initialSBT: initialSBT || ethers.ZeroAddress,
        initialGasToken: initialGasToken || ethers.ZeroAddress,
        registry: REGISTRY_ADDRESS,
      };
      console.log(config);

      // Encode initialize call data
      const paymasterInterface = new ethers.Interface([
        "function initialize(address _entryPoint, address _owner, address _treasury, address _ethUsdPriceFeed, uint256 _serviceFeeRate, uint256 _maxGasCostCap, uint256 _minTokenBalance, address _xpntsFactory, address _initialSBT, address _initialGasToken, address _registry) external",
      ]);

      const initData = paymasterInterface.encodeFunctionData("initialize", [
        ENTRY_POINT_ADDRESS,
        account,
        treasury,
        ETH_USD_PRICE_FEED,
        serviceFeeRate,
        ethers.parseEther(maxGasCostCap),
        ethers.parseEther(minTokenBalance),
        XPNTS_FACTORY_ADDRESS,
        initialSBT || ethers.ZeroAddress,
        initialGasToken || ethers.ZeroAddress,
        REGISTRY_ADDRESS,
      ]);

      console.log("⏳ Deploying Paymaster via Factory...");
      const tx = await factory.deployPaymaster("v4.1i", initData);
      setDeployTxHash(tx.hash);
      console.log("⏳ Waiting for deployment confirmation...");

      const receipt = await tx.wait();
      console.log("✅ Deployment successful!");

      // Get deployed address from factory
      const deployedAddr = await factory.paymasterByOperator(account);
      setDeployedAddress(deployedAddr);
      setExistingPaymaster(deployedAddr);

      alert(`Paymaster deployed successfully at ${deployedAddr}!`);
    } catch (err: any) {
      console.error("❌ Deployment failed:", err);
      setError(err?.message || "Failed to deploy paymaster");
    } finally {
      setIsDeploying(false);
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
          checkExistingPaymaster(accounts[0]);
          loadCommunityInfo(accounts[0]);
        }
      });
    }
  }, []);

  return (
    <div className="launch-paymaster-page">
      <div className="launch-paymaster-container">
        {/* Header */}
        <div className="launch-paymaster-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>🚀 Launch Paymaster</h1>
          <p className="subtitle">
            Deploy your Paymaster using PaymasterFactory
          </p>
        </div>

        {/* What is PaymasterFactory */}
        <div className="info-section">
          <h2>What is PaymasterFactory?</h2>
          <p>
            PaymasterFactory is a factory contract that deploys PaymasterV4_1i instances
            with standardized configuration. Benefits include:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Protocol-Verified Deployment</strong>: Factory-deployed paymasters
              are marked as authentic
            </li>
            <li>
              <strong>Standardized Configuration</strong>: Consistent parameters across
              all deployments
            </li>
            <li>
              <strong>One-Click Deployment</strong>: No need to manually deploy contracts
            </li>
            <li>
              <strong>Gas Optimization</strong>: Optimized deployment process using EIP-1167 minimal proxy
            </li>
          </ul>
        </div>

        {/* Contract Info */}
        <div className="info-section">
          <h2>Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Factory Address</span>
              <a
                href={getExplorerLink(PAYMASTER_FACTORY_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="value mono"
              >
                {PAYMASTER_FACTORY_ADDRESS.slice(0, 10)}...{PAYMASTER_FACTORY_ADDRESS.slice(-8)} ↗
              </a>
            </div>
            <div className="info-row">
              <span className="label">Implementation</span>
              <a
                href={getExplorerLink(PAYMASTER_V4_1I_IMPLEMENTATION)}
                target="_blank"
                rel="noopener noreferrer"
                className="value mono"
              >
                {PAYMASTER_V4_1I_IMPLEMENTATION.slice(0, 10)}...{PAYMASTER_V4_1I_IMPLEMENTATION.slice(-8)} ↗
              </a>
            </div>
            <div className="info-row">
              <span className="label">EntryPoint</span>
              <a
                href={getExplorerLink(ENTRY_POINT_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="value mono"
              >
                {ENTRY_POINT_ADDRESS.slice(0, 10)}...{ENTRY_POINT_ADDRESS.slice(-8)} ↗
              </a>
            </div>
            <div className="info-row">
              <span className="label">ETH/USD Price Feed</span>
              <a
                href={getExplorerLink(ETH_USD_PRICE_FEED)}
                target="_blank"
                rel="noopener noreferrer"
                className="value mono"
              >
                Chainlink Sepolia ↗
              </a>
            </div>
            <div className="info-row">
              <span className="label">Network</span>
              <span className="value">Sepolia Testnet</span>
            </div>
          </div>
        </div>

        {/* Deploy Section */}
        <div className="info-section deploy-section">
          <h2>Deploy Your Paymaster</h2>

          {!isConnected ? (
            <div className="wallet-connect-prompt">
              <p>Connect your wallet to deploy a Paymaster</p>
              <button className="action-button primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="deploy-interface">
              {/* Wallet Info */}
              <div className="wallet-info">
                <p className="connected-account">
                  Connected: <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </p>
              </div>

              {/* Community Info */}
              {loadingCommunity ? (
                <div className="loading-box">Loading community information...</div>
              ) : communityInfo && communityInfo.isRegistered ? (
                <div className="community-info-box">
                  <h4>✅ Community Registered</h4>
                  <div className="info-row">
                    <span className="label">Community Name:</span>
                    <span className="value">{communityInfo.name}</span>
                  </div>
                  {communityInfo.ensName && (
                    <div className="info-row">
                      <span className="label">ENS:</span>
                      <span className="value mono">{communityInfo.ensName}</span>
                    </div>
                  )}
                  {initialGasToken && (
                    <>
                      <div className="info-row">
                        <span className="label">xPNTs Token:</span>
                        <a
                          href={getExplorerLink(initialGasToken)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="value mono"
                        >
                          {initialGasToken.slice(0, 6)}...{initialGasToken.slice(-4)} ↗
                        </a>
                      </div>
                      <div className="info-row">
                        <span className="label">Exchange Rate:</span>
                        <span className="value">
                          1 xPNT = {communityInfo.xPNTsExchangeRate} aPNTs
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Min Balance Required:</span>
                        <span className="value">
                          {minTokenBalance} xPNTs (≈ 100 aPNTs)
                        </span>
                      </div>
                    </>
                  )}
                  {initialSBT && (
                    <div className="info-row">
                      <span className="label">MySBT:</span>
                      <a
                        href={getExplorerLink(initialSBT)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="value mono"
                      >
                        {initialSBT.slice(0, 6)}...{initialSBT.slice(-4)} ↗
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="error-box">
                  <h4>❌ Community Not Registered</h4>
                  <p>You need to register your community before deploying a Paymaster.</p>
                  <a href="/register-community" className="action-button outline">
                    Register Community →
                  </a>
                </div>
              )}

              {/* Existing Paymaster */}
              {existingPaymaster && (
                <div className="existing-paymaster-box">
                  <h4>Your Deployed Paymaster</h4>
                  <p className="mono">{existingPaymaster}</p>
                  <a
                    href={getExplorerLink(existingPaymaster)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on Etherscan →
                  </a>
                </div>
              )}

              {/* Deploy Form */}
              {!existingPaymaster && communityInfo && communityInfo.isRegistered && (
                <div className="deploy-form">
                  <h4>Configuration</h4>

                  <div className="form-group">
                    <label>Treasury Address *</label>
                    <input
                      type="text"
                      value={treasury}
                      onChange={(e) => setTreasury(e.target.value)}
                      placeholder="0x..."
                      className="mono-input"
                    />
                    <small>Address to receive service fees</small>
                  </div>

                  <div className="form-group">
                    <label>Service Fee Rate (Basis Points)</label>
                    <input
                      type="number"
                      value={serviceFeeRate}
                      onChange={(e) => setServiceFeeRate(e.target.value)}
                      placeholder="200"
                      min="0"
                      max="1000"
                    />
                    <small>200 basis points = 2%, max 1000 (10%)</small>
                  </div>

                  <div className="form-group">
                    <label>Max Gas Cost Cap (ETH)</label>
                    <input
                      type="number"
                      value={maxGasCostCap}
                      onChange={(e) => setMaxGasCostCap(e.target.value)}
                      placeholder="0.1"
                      step="0.01"
                    />
                    <small>Maximum gas cost per transaction</small>
                  </div>

                  <div className="form-group">
                    <label>Min Token Balance</label>
                    <input
                      type="number"
                      value={minTokenBalance}
                      onChange={(e) => setMinTokenBalance(e.target.value)}
                      placeholder="100"
                      step="10"
                    />
                    <small>Minimum token balance required for users (compatibility parameter)</small>
                  </div>

                  <button
                    className="action-button primary deploy-button"
                    onClick={handleDeploy}
                    disabled={isDeploying || !communityInfo || !ethers.isAddress(treasury)}
                  >
                    {isDeploying ? "Deploying..." : "🚀 Deploy Paymaster"}
                  </button>

                  {error && (
                    <div className="error-message">{error}</div>
                  )}

                  {deployTxHash && (
                    <div className="tx-success">
                      <p>Transaction submitted!</p>
                      <a
                        href={getExplorerLink(deployTxHash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View on Etherscan →
                      </a>
                    </div>
                  )}

                  {deployedAddress && (
                    <div className="success-box">
                      <h4>🎉 Deployment Successful!</h4>
                      <p className="deployed-address">
                        <strong>Paymaster Address:</strong>
                        <br />
                        <span className="mono">{deployedAddress}</span>
                      </p>
                      <a
                        href={getExplorerLink(deployedAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View on Etherscan →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="action-footer">
          <a href="/operator" className="action-button outline">
            ← Back to Operators Portal
          </a>
          {deployedAddress && (
            <button
              className="action-button primary"
              onClick={() => navigate(`/operator/manage?address=${deployedAddress}`)}
            >
              Manage Paymaster →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
