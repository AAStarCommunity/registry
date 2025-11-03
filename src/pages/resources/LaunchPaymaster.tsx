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

interface DeployedPaymasterInfo {
  address: string;
  owner: string;
  treasury: string;
  serviceFeeRate: string;
  xPNTsToken?: string;
  xPNTsSymbol?: string;
  xPNTsName?: string;
  mySBT?: string;
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
  const [deployedPaymasterInfo, setDeployedPaymasterInfo] = useState<DeployedPaymasterInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingPaymaster, setExistingPaymaster] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeployForm, setShowDeployForm] = useState(false);

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
    setError(null);
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
        // Community not registered - this is normal, don't show as error
        setCommunityInfo(null);
      }
    } catch (err: any) {
      console.error("Failed to load community info:", err);
      // Only show error if it's a network/RPC issue, not a "not registered" issue
      if (err?.message?.includes("network") || err?.message?.includes("RPC")) {
        setError("Unable to connect to blockchain. Please check your RPC provider and try again.");
      }
      // If it's just a "not registered" case, don't show error - let the UI handle it
      setCommunityInfo(null);
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
        // Don't show as error - this is normal state
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

      // Fetch detailed info about deployed paymaster
      setDeployedPaymasterInfo({
        address: deployedAddr,
        owner: account,
        treasury,
        serviceFeeRate: `${serviceFeeRate} bp (${(Number(serviceFeeRate) / 100).toFixed(2)}%)`,
        xPNTsToken: initialGasToken || undefined,
        mySBT: initialSBT || undefined,
      });

      // Show success modal instead of alert
      setShowSuccessModal(true);

      // Refresh existing paymaster info and close deploy form after a delay
      setTimeout(() => {
        checkExistingPaymaster(account);
        setShowDeployForm(false);
      }, 3000);
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
      {/* Success Modal */}
      {showSuccessModal && deployedPaymasterInfo && (
        <div className="success-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={() => setShowSuccessModal(false)}>
              ✕
            </button>
            <div className="modal-header">
              <h2>🎉 Paymaster Deployed Successfully!</h2>
            </div>
            <div className="modal-body">
              <div className="deployment-details">
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="mono address-value">{deployedPaymasterInfo.address}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Owner:</span>
                  <span className="mono">{deployedPaymasterInfo.owner.slice(0, 6)}...{deployedPaymasterInfo.owner.slice(-4)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Treasury:</span>
                  <span className="mono">{deployedPaymasterInfo.treasury.slice(0, 6)}...{deployedPaymasterInfo.treasury.slice(-4)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Service Fee Rate:</span>
                  <span className="highlight">{deployedPaymasterInfo.serviceFeeRate}</span>
                </div>
                {deployedPaymasterInfo.xPNTsToken && (
                  <div className="detail-row">
                    <span className="detail-label">xPNTs Token:</span>
                    <a
                      href={getExplorerLink(deployedPaymasterInfo.xPNTsToken)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono link"
                    >
                      {deployedPaymasterInfo.xPNTsToken.slice(0, 6)}...{deployedPaymasterInfo.xPNTsToken.slice(-4)} ↗
                    </a>
                  </div>
                )}
                {deployedPaymasterInfo.mySBT && (
                  <div className="detail-row">
                    <span className="detail-label">MySBT:</span>
                    <a
                      href={getExplorerLink(deployedPaymasterInfo.mySBT)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono link"
                    >
                      {deployedPaymasterInfo.mySBT.slice(0, 6)}...{deployedPaymasterInfo.mySBT.slice(-4)} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <a
                href={getExplorerLink(deployedPaymasterInfo.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button outline"
              >
                View on Etherscan ↗
              </a>
              <a
                href={`/operator/explore?address=${deployedPaymasterInfo.address}`}
                className="action-button primary"
              >
                View in Explorer →
              </a>
              <button className="action-button outline" onClick={() => setShowSuccessModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

        {/* Existing Paymaster Banner */}
        {isConnected && (
          <>
            {existingPaymaster ? (
              <div className="existing-paymaster-banner">
                <div className="banner-icon">✅</div>
                <div className="banner-content">
                  <div className="banner-title">You have a Paymaster deployed</div>
                  <div className="banner-address mono">{existingPaymaster.slice(0, 10)}...{existingPaymaster.slice(-8)}</div>
                </div>
                <div className="banner-actions">
                  <a
                    href={`/operator/explore?address=${existingPaymaster}`}
                    className="action-button primary"
                  >
                    View Paymaster Details →
                  </a>
                </div>
              </div>
            ) : loadingCommunity ? null : (
              <div className="ready-to-deploy-banner">
                <div className="banner-icon">🚀</div>
                <div className="banner-content">
                  <div className="banner-title">Ready to deploy your Paymaster</div>
                  <div className="banner-message">Connect your wallet and follow the steps below to deploy</div>
                </div>
              </div>
            )}
          </>
        )}

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
              <span className="label">
                Implementation
                <span title="This is the PaymasterV4.1i implementation contract used by the factory to deploy new instances via EIP-1167 minimal proxy (saves ~95% gas)" style={{marginLeft: '4px', cursor: 'help'}}>
                  ℹ️
                </span>
              </span>
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

              {/* Existing Paymaster Details */}
              {existingPaymaster && communityInfo && (
                <div className="existing-paymaster-details">
                  <h4>📊 Community & Paymaster Information</h4>

                  <div className="info-cards">
                    <div className="info-card community-card">
                      <div className="card-title">Community</div>
                      <div className="card-content">
                        <div className="info-item">
                          <span className="item-label">Name:</span>
                          <span className="item-value">{communityInfo.name}</span>
                        </div>
                        {communityInfo.ensName && (
                          <div className="info-item">
                            <span className="item-label">ENS:</span>
                            <span className="item-value mono">{communityInfo.ensName}</span>
                          </div>
                        )}
                        {initialGasToken && (
                          <>
                            <div className="info-item">
                              <span className="item-label">xPNTs Token:</span>
                              <a
                                href={getExplorerLink(initialGasToken)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="item-value mono link"
                              >
                                {initialGasToken.slice(0, 6)}...{initialGasToken.slice(-4)} ↗
                              </a>
                            </div>
                            <div className="info-item">
                              <span className="item-label">Exchange Rate:</span>
                              <span className="item-value">1 xPNT = {communityInfo.xPNTsExchangeRate} aPNTs</span>
                            </div>
                          </>
                        )}
                        {initialSBT && (
                          <div className="info-item">
                            <span className="item-label">MySBT:</span>
                            <a
                              href={getExplorerLink(initialSBT)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="item-value mono link"
                            >
                              {initialSBT.slice(0, 6)}...{initialSBT.slice(-4)} ↗
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="info-card paymaster-card">
                      <div className="card-title">Paymaster</div>
                      <div className="card-content">
                        <div className="info-item">
                          <span className="item-label">Address:</span>
                          <a
                            href={getExplorerLink(existingPaymaster)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="item-value mono link"
                          >
                            {existingPaymaster.slice(0, 6)}...{existingPaymaster.slice(-4)} ↗
                          </a>
                        </div>
                        <div className="info-item">
                          <span className="item-label">Owner:</span>
                          <span className="item-value mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                        </div>
                        {treasury && (
                          <div className="info-item">
                            <span className="item-label">Treasury:</span>
                            <a
                              href={getExplorerLink(treasury)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="item-value mono link"
                            >
                              {treasury.slice(0, 6)}...{treasury.slice(-4)} ↗
                            </a>
                          </div>
                        )}
                        {serviceFeeRate && (
                          <div className="info-item">
                            <span className="item-label">Service Fee:</span>
                            <span className="item-value">{serviceFeeRate} bp ({(Number(serviceFeeRate) / 100).toFixed(2)}%)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="paymaster-actions">
                    <a
                      href={`/operator/explore?address=${existingPaymaster}`}
                      className="action-button primary"
                    >
                      View Details in Explorer →
                    </a>
                    <a
                      href={getExplorerLink(existingPaymaster)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-button outline"
                    >
                      View on Etherscan ↗
                    </a>
                    <a
                      href={`/operator/manage?address=${existingPaymaster}`}
                      className="action-button outline"
                    >
                      Manage Paymaster →
                    </a>
                  </div>
                </div>
              )}

              {/* Deploy Form */}
              {communityInfo && communityInfo.isRegistered && (
                <>
                  {existingPaymaster && !showDeployForm && (
                    <div className="deploy-another-prompt">
                      <p>Want to deploy a new Paymaster with different configuration?</p>
                      <button
                        className="action-button primary"
                        onClick={() => {
                          setShowDeployForm(true);
                          setError(null);
                          setDeployTxHash("");
                          setDeployedAddress("");
                        }}
                      >
                        🚀 Deploy Another Paymaster
                      </button>
                    </div>
                  )}

                  {(!existingPaymaster || showDeployForm) && (
                    <div className="deploy-form">
                      {showDeployForm && existingPaymaster && (
                        <div className="warning-banner">
                          <span className="warning-icon">⚠️</span>
                          <div className="warning-content">
                            <div className="warning-title">Deploying New Paymaster</div>
                            <div className="warning-message">
                              You already have a Paymaster deployed. Deploying a new one will replace the existing one in your operator profile.
                            </div>
                          </div>
                        </div>
                      )}

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

                  {deployedAddress && deployedPaymasterInfo && (
                    <div className="success-box">
                      <h4>🎉 Deployment Successful!</h4>
                      <div className="deployment-details">
                        <div className="detail-row">
                          <span className="detail-label">Paymaster Address:</span>
                          <span className="mono">{deployedAddress}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Owner:</span>
                          <span className="mono">{deployedPaymasterInfo.owner.slice(0, 6)}...{deployedPaymasterInfo.owner.slice(-4)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Treasury:</span>
                          <span className="mono">{deployedPaymasterInfo.treasury.slice(0, 6)}...{deployedPaymasterInfo.treasury.slice(-4)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Service Fee Rate:</span>
                          <span>{deployedPaymasterInfo.serviceFeeRate}</span>
                        </div>
                        {deployedPaymasterInfo.xPNTsToken && (
                          <div className="detail-row">
                            <span className="detail-label">xPNTs Token:</span>
                            <a href={getExplorerLink(deployedPaymasterInfo.xPNTsToken)} target="_blank" rel="noopener noreferrer" className="mono link">
                              {deployedPaymasterInfo.xPNTsToken.slice(0, 6)}...{deployedPaymasterInfo.xPNTsToken.slice(-4)} ↗
                            </a>
                          </div>
                        )}
                        {deployedPaymasterInfo.mySBT && (
                          <div className="detail-row">
                            <span className="detail-label">MySBT:</span>
                            <a href={getExplorerLink(deployedPaymasterInfo.mySBT)} target="_blank" rel="noopener noreferrer" className="mono link">
                              {deployedPaymasterInfo.mySBT.slice(0, 6)}...{deployedPaymasterInfo.mySBT.slice(-4)} ↗
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="success-actions">
                        <a
                          href={getExplorerLink(deployedAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button outline"
                        >
                          View on Etherscan →
                        </a>
                        <a
                          href={`/operator/explore?address=${deployedAddress}`}
                          className="action-button primary"
                        >
                          View in Explorer →
                        </a>
                      </div>
                    </div>
                  )}
                    </div>
                  )}
                </>
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
