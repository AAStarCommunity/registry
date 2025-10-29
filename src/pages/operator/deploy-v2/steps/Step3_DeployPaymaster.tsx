import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
// PaymasterV4.1 - Latest version with Registry support
// All new deployments use V4.1 (updated Oct 29, 2025)
import PaymasterV4_1 from "../../../../contracts/PaymasterV4_1.json";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import "./Step3_DeployPaymaster.css";

// EntryPoint v0.7 addresses
const ENTRYPOINT_ADDRESSES: Record<number, string> = {
  11155111: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Sepolia
  11155420: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // OP Sepolia
  10: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // OP Mainnet
  1: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Ethereum Mainnet
};

// Chainlink ETH/USD Price Feed addresses
const CHAINLINK_ETH_USD_FEED: Record<number, string> = {
  11155111: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia
  11155420: "0x61Ec26aA57019C486B10502285c5A3D4A4750AD7", // OP Sepolia
  10: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",       // OP Mainnet
  1: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",        // Ethereum Mainnet
};

// Registry v2.0/v2.1 ABI for checking existing registration
const REGISTRY_V2_ABI = [
  "function getCommunityProfile(address communityAddress) external view returns (tuple(string name, string ensName, string description, string website, string logoURI, string twitterHandle, string githubOrg, string telegramGroup, address xPNTsToken, address[] supportedSBTs, uint8 mode, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, uint256 memberCount))",
];

export interface DeployConfig {
  communityName: string;
  treasury: string;
  gasToUSDRate: string;
  pntPriceUSD: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  minTokenBalance: string;
}

export interface DeployedResources {
  sbtAddress: string;
  xPNTsAddress: string;
  sGTokenAmount: string;
  gTokenStakeTxHash: string;
}

export interface Step3Props {
  config: DeployConfig;
  chainId: number;
  onNext: (paymasterAddress: string, owner: string) => void;
  onBack: () => void;
  isTestMode?: boolean;
  deployedResources?: DeployedResources;
}

export function Step3_DeployPaymaster({
  config,
  chainId,
  onNext,
  onBack,
  isTestMode = false,
  deployedResources,
}: Step3Props) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [existingPaymaster, setExistingPaymaster] = useState<string | null>(null);
  const [isCheckingRegistry, setIsCheckingRegistry] = useState(true);

  // Log testMode status on mount
  console.log(`🔍 Step3_DeployPaymaster mounted - isTestMode: ${isTestMode}`);

  // Check if user already has a registered paymaster
  useEffect(() => {
    // Prevent double execution in React Strict Mode
    let cancelled = false;

    const checkExistingPaymaster = async () => {
      if (isTestMode || cancelled) {
        setIsCheckingRegistry(false);
        return;
      }

      try {
        if (!window.ethereum) {
          setIsCheckingRegistry(false);
          return;
        }

        // Get user address from MetaMask
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const signer = await browserProvider.getSigner();
        const userAddress = await signer.getAddress();

        if (cancelled) return;

        // Use independent RPC provider for read-only queries (best practice)
        const networkConfig = getCurrentNetworkConfig();
        const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
        const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);

        const registry = new ethers.Contract(
          networkConfig.contracts.registryV2_1,
          REGISTRY_V2_ABI,
          rpcProvider // Use independent provider, not MetaMask
        );

        console.log("🔍 Checking if user has existing paymaster in Registry v2.1...");
        const profile = await registry.getCommunityProfile(userAddress);

        if (cancelled) return;

        // Check if paymaster address is not zero address
        if (profile.paymasterAddress && profile.paymasterAddress !== ethers.ZeroAddress) {
          console.log("✅ Found existing paymaster:", profile.paymasterAddress);
          setExistingPaymaster(profile.paymasterAddress);
        } else {
          console.log("ℹ️ No existing paymaster found");
        }
      } catch (err) {
        if (!cancelled) {
          console.log("ℹ️ No existing registration found (first-time deployment)");
        }
        // Ignore errors - user probably doesn't have a registration yet
      } finally {
        if (!cancelled) {
          setIsCheckingRegistry(false);
        }
      }
    };

    checkExistingPaymaster();

    // Cleanup function to prevent state updates after unmount
    return () => {
      cancelled = true;
    };
  }, [isTestMode]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);

    try {
      // In test mode, use mock deployment
      if (isTestMode) {
        console.log("🧪 Test Mode: Using mock deployment");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate deployment delay

        const mockPaymasterAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
        const mockOwner = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

        console.log("🧪 Test Mode: Mock deployment complete, calling onNext");
        setIsDeploying(false);
        onNext(mockPaymasterAddress, mockOwner);
        return;
      }

      // Get provider and signer
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to deploy the contract");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const ownerAddress = await signer.getAddress();

      // Get EntryPoint address for current chain
      const entryPoint = ENTRYPOINT_ADDRESSES[chainId];
      if (!entryPoint) {
        throw new Error(`EntryPoint not configured for chain ID ${chainId}`);
      }

      // Get Chainlink ETH/USD price feed for current chain
      const ethUsdPriceFeed = CHAINLINK_ETH_USD_FEED[chainId];
      if (!ethUsdPriceFeed) {
        throw new Error(`Chainlink ETH/USD price feed not configured for chain ID ${chainId}`);
      }

      // Get Registry v2.1 address
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registryV2_1 || ethers.ZeroAddress;

      // Parse constructor parameters
      const serviceFeeRate = parseInt(config.serviceFeeRate) * 100; // Convert % to basis points
      const maxGasCostCap = ethers.parseEther(config.maxGasCostCap);
      const minTokenBalance = ethers.parseUnits(config.minTokenBalance, 18);

      console.log("🚀 Deploying PaymasterV4_1 with parameters:");
      console.log("  EntryPoint:", entryPoint);
      console.log("  Owner:", ownerAddress);
      console.log("  Treasury:", config.treasury);
      console.log("  ETH/USD Price Feed:", ethUsdPriceFeed);
      console.log("  Service Fee Rate (bp):", serviceFeeRate);
      console.log("  Max Gas Cost Cap:", maxGasCostCap.toString());
      console.log("  Min Token Balance:", minTokenBalance.toString());
      console.log("  Registry v2.1:", registryAddress);

      // Create ContractFactory
      const factory = new ethers.ContractFactory(
        PaymasterV4_1.abi,
        PaymasterV4_1.bytecode.object,
        signer
      );

      // Estimate gas
      const gasEstimate = await factory.getDeployTransaction(
        entryPoint,
        ownerAddress,
        config.treasury,
        ethUsdPriceFeed,
        serviceFeeRate,
        maxGasCostCap,
        minTokenBalance,
        deployedResources?.sbtAddress || ethers.ZeroAddress,
        deployedResources?.xPNTsAddress || ethers.ZeroAddress,
        registryAddress
      ).then((tx) => provider.estimateGas(tx));

      setEstimatedGas(ethers.formatEther(gasEstimate));

      // Deploy contract
      const contract = await factory.deploy(
        entryPoint,
        ownerAddress,
        config.treasury,
        ethUsdPriceFeed,
        serviceFeeRate,
        maxGasCostCap,
        minTokenBalance,
        deployedResources?.sbtAddress || ethers.ZeroAddress,
        deployedResources?.xPNTsAddress || ethers.ZeroAddress,
        registryAddress
      );

      setDeployTxHash(contract.deploymentTransaction()?.hash || null);

      // Wait for deployment
      await contract.waitForDeployment();

      const paymasterAddress = await contract.getAddress();
      console.log("✅ Paymaster deployed at:", paymasterAddress);

      // Proceed to next step
      onNext(paymasterAddress, ownerAddress);
    } catch (err) {
      console.error("Deployment error:", err);
      setError(err instanceof Error ? err.message : "Deployment failed");
      setIsDeploying(false);
    }
  };

  // In test mode, simulate deployment
  const handleTestDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      const mockAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
      onNext(mockAddress, mockAddress);
    }, 2000);
  };

  return (
    <div className="step3-deploy-paymaster">
      <div className="step-header">
        <h2>Step 3: Deploy Paymaster Contract</h2>
        <p className="step-description">
          Deploy your PaymasterV4_1 contract to the blockchain. This will create
          your community's Paymaster with the configuration you specified.
        </p>
      </div>

      {/* Loading state while checking registry */}
      {isCheckingRegistry && (
        <div className="info-box">
          <div className="status-icon">🔍</div>
          <div className="status-text">Checking for existing Paymaster registration...</div>
        </div>
      )}

      {/* Existing Paymaster Warning */}
      {!isCheckingRegistry && existingPaymaster && (
        <div className="warning-banner">
          <span className="warning-icon">ℹ️</span>
          <div className="warning-content">
            <div className="warning-title">Existing Paymaster Found</div>
            <div className="warning-message">
              You already have a registered Paymaster at{" "}
              <code className="paymaster-address">
                {existingPaymaster.slice(0, 10)}...{existingPaymaster.slice(-8)}
              </code>
              <br />
              <br />
              You can manage your existing Paymaster or continue to deploy a new one below.
            </div>
            <div className="warning-actions">
              <a
                href={`/manage-paymaster?address=${existingPaymaster}`}
                className="btn-manage"
                target="_blank"
                rel="noopener noreferrer"
              >
                🔧 Manage Existing Paymaster
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="config-summary">
        <div className="summary-title">📋 Deployment Configuration</div>
        <div className="summary-content">
          <div className="summary-item">
            <span className="summary-label">Community Name:</span>
            <span className="summary-value">{config.communityName}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Treasury:</span>
            <span className="summary-value address">
              {config.treasury.slice(0, 6)}...{config.treasury.slice(-4)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Service Fee:</span>
            <span className="summary-value">{config.serviceFeeRate}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Chain ID:</span>
            <span className="summary-value">{chainId}</span>
          </div>
          {estimatedGas && (
            <div className="summary-item">
              <span className="summary-label">Estimated Gas:</span>
              <span className="summary-value">{estimatedGas} ETH</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-content">
            <div className="error-title">Deployment Error</div>
            <div className="error-message">{error}</div>
          </div>
        </div>
      )}

      {/* Deployment Status */}
      {isDeploying && (
        <div className="deployment-status">
          <div className="status-icon">⏳</div>
          <div className="status-text">
            <div className="status-title">Deploying Contract...</div>
            <div className="status-message">
              Please confirm the transaction in your wallet and wait for deployment to complete.
            </div>
            {deployTxHash && (
              <div className="tx-hash">
                Transaction: {deployTxHash.slice(0, 10)}...{deployTxHash.slice(-8)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="info-box">
        <div className="info-title">💡 What happens next?</div>
        <ul>
          <li>Your wallet will prompt you to confirm the deployment transaction</li>
          <li>The Paymaster contract will be deployed with your configuration</li>
          <li>Once deployed, you'll proceed to configure stake options</li>
          <li>You can transfer ownership to a multisig wallet after completion</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="step-actions">
        <button className="btn-back" onClick={onBack} disabled={isDeploying}>
          ← Back to Configuration
        </button>
        <button
          className="btn-deploy"
          onClick={handleDeploy}
          disabled={isDeploying}
        >
          {isDeploying ? "Deploying..." : "Deploy Paymaster Contract 🚀"}
        </button>
      </div>
    </div>
  );
}
