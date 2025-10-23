import React, { useState } from "react";
import { ethers } from "ethers";
import PaymasterV4_1 from "../../../../contracts/PaymasterV4_1.json";
import "./Step3_DeployPaymaster.css";

// EntryPoint v0.7 addresses
const ENTRYPOINT_ADDRESSES: Record<number, string> = {
  11155111: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Sepolia
  11155420: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // OP Sepolia
  10: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // OP Mainnet
  1: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Ethereum Mainnet
};

export interface DeployConfig {
  communityName: string;
  treasury: string;
  gasToUSDRate: string;
  pntPriceUSD: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  minTokenBalance: string;
}

export interface Step3Props {
  config: DeployConfig;
  chainId: number;
  onNext: (paymasterAddress: string, owner: string) => void;
  onBack: () => void;
  isTestMode?: boolean;
}

export function Step3_DeployPaymaster({
  config,
  chainId,
  onNext,
  onBack,
  isTestMode = false,
}: Step3Props) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setError(null);

    try {
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

      // Parse constructor parameters
      const gasToUSDRate = ethers.parseUnits(config.gasToUSDRate, 18);
      const pntPriceUSD = ethers.parseUnits(config.pntPriceUSD, 18);
      const serviceFeeRate = parseInt(config.serviceFeeRate) * 100; // Convert % to basis points
      const maxGasCostCap = ethers.parseEther(config.maxGasCostCap);
      const minTokenBalance = ethers.parseUnits(config.minTokenBalance, 18);

      console.log("🚀 Deploying PaymasterV4_1 with parameters:");
      console.log("  EntryPoint:", entryPoint);
      console.log("  Owner:", ownerAddress);
      console.log("  Treasury:", config.treasury);
      console.log("  Gas to USD Rate:", gasToUSDRate.toString());
      console.log("  PNT Price USD:", pntPriceUSD.toString());
      console.log("  Service Fee Rate (bp):", serviceFeeRate);
      console.log("  Max Gas Cost Cap:", maxGasCostCap.toString());
      console.log("  Min Token Balance:", minTokenBalance.toString());

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
        gasToUSDRate,
        pntPriceUSD,
        serviceFeeRate,
        maxGasCostCap,
        minTokenBalance
      ).then((tx) => provider.estimateGas(tx));

      setEstimatedGas(ethers.formatEther(gasEstimate));

      // Deploy contract
      const contract = await factory.deploy(
        entryPoint,
        ownerAddress,
        config.treasury,
        gasToUSDRate,
        pntPriceUSD,
        serviceFeeRate,
        maxGasCostCap,
        minTokenBalance
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
      const mockAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
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
          onClick={isTestMode ? handleTestDeploy : handleDeploy}
          disabled={isDeploying}
        >
          {isDeploying ? "Deploying..." : "Deploy Paymaster Contract 🚀"}
        </button>
      </div>
    </div>
  );
}
