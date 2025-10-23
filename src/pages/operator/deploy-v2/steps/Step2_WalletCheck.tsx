import React, { useState, useEffect } from "react";
import { WalletStatus } from "../components/WalletStatus";
import { checkWalletStatus, getCurrentNetwork } from "../utils/walletChecker";
import type { WalletStatus as WalletStatusType } from "../utils/walletChecker";
import type { DeployConfig } from "./Step1_ConfigForm";
import "./Step2_WalletCheck.css";

export interface Step2Props {
  paymasterAddress: string;
  onNext: (walletStatus: WalletStatusType) => void;
  onBack: () => void;
  isTestMode?: boolean;
}

export function Step2_WalletCheck({ paymasterAddress, onNext, onBack, isTestMode = false }: Step2Props) {
  const [walletStatus, setWalletStatus] = useState<WalletStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{
    chainId: number;
    chainName: string;
  } | null>(null);

  // Check wallet on mount
  useEffect(() => {
    // In test mode, use mock wallet data and auto-proceed
    if (isTestMode) {
      const mockWalletStatus: WalletStatusType = {
        isConnected: true,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        ethBalance: '1.5',
        gTokenBalance: '1200',
        pntsBalance: '800',
        aPNTsBalance: '600',
        hasSBTContract: false,
        hasGasTokenContract: false,
        hasEnoughETH: true,
        hasEnoughGToken: true,
        hasEnoughPNTs: true,
        hasEnoughAPNTs: true,
        requiredETH: '0.1',
        requiredGToken: '100',
        requiredPNTs: '1000',
        requiredAPNTs: '1000',
      };
      setWalletStatus(mockWalletStatus);
      console.log('🧪 Test Mode: Using mock wallet data');
      return;
    }

    handleCheckWallet();
    loadNetworkInfo();
  }, [isTestMode]);

  const loadNetworkInfo = async () => {
    try {
      const info = await getCurrentNetwork();
      setNetworkInfo(info);
    } catch (err) {
      console.error("Failed to get network info:", err);
    }
  };

  const handleCheckWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Get actual token addresses from config or environment
      const status = await checkWalletStatus({
        requiredETH: "0.05",
        requiredGToken: "100",
        requiredPNTs: "1000",
        // gTokenAddress: "0x...", // Add from environment
        // pntAddress: "0x...",    // Add from environment
      });

      setWalletStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check wallet";
      setError(errorMessage);
      console.error("Wallet check error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetGToken = () => {
    // TODO: Navigate to /get-gtoken page
    window.open("/get-gtoken", "_blank");
  };

  const handleGetPNTs = () => {
    // TODO: Navigate to /get-pnts page
    window.open("/get-pnts", "_blank");
  };

  const handleGetETH = () => {
    // Open faucet or guide based on network
    if (networkInfo?.chainId === 11155111) {
      // Sepolia
      window.open("https://sepoliafaucet.com", "_blank");
    } else {
      alert("Please acquire ETH from your preferred exchange or faucet");
    }
  };

  const canProceed = () => {
    if (!walletStatus) return false;
    return walletStatus.hasEnoughETH && walletStatus.hasEnoughGToken;
  };

  return (
    <div className="step2-wallet-check">
      <div className="step-header">
        <h2>Step 2: Check Wallet Resources</h2>
        <p className="step-description">
          We'll verify that your wallet has the necessary resources to deploy and
          operate a Paymaster. Missing resources can be acquired from the provided
          links.
        </p>
      </div>

      {/* Paymaster Info */}
      <div className="config-summary">
        <div className="summary-title">📋 Paymaster Configuration</div>
        <div className="summary-content">
          <div className="summary-item">
            <span className="summary-label">Planned Address:</span>
            <span className="summary-value address">
              {paymasterAddress.slice(0, 6)}...{paymasterAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {/* Network Info */}
      {networkInfo && (
        <div className="network-info">
          <span className="network-icon">🌐</span>
          <span className="network-name">{networkInfo.chainName}</span>
          <span className="network-chain-id">Chain ID: {networkInfo.chainId}</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-content">
            <div className="error-title">Connection Error</div>
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={handleCheckWallet}>
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Checking wallet resources...</div>
        </div>
      )}

      {/* Wallet Status Display */}
      {!isLoading && walletStatus && (
        <>
          <WalletStatus
            status={walletStatus}
            onGetGToken={handleGetGToken}
            onGetPNTs={handleGetPNTs}
            onGetETH={handleGetETH}
          />

          {/* Refresh Button */}
          <div className="refresh-section">
            <button className="refresh-button" onClick={handleCheckWallet}>
              🔄 Refresh Balances
            </button>
            <span className="refresh-help">
              Click to re-check your wallet balances after acquiring resources
            </span>
          </div>
        </>
      )}

      {/* Help Section */}
      <div className="help-section">
        <div className="help-title">💡 Need Help?</div>
        <div className="help-content">
          <div className="help-item">
            <strong>ETH:</strong> Required for deploying contracts and paying gas
            fees. Get test ETH from faucets (Sepolia) or exchanges (Mainnet).
          </div>
          <div className="help-item">
            <strong>GToken:</strong> Governance token required for protocol
            participation. Visit the GToken page to learn how to acquire it.
          </div>
          <div className="help-item">
            <strong>PNTs:</strong> Points token for fast stake flow (optional). If
            you don't have PNTs, you can use the standard stake flow instead.
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="step-actions">
        <button className="btn-back" onClick={onBack}>
          ← Back to Configuration
        </button>
        <button
          className="btn-next"
          onClick={() => walletStatus && onNext(walletStatus)}
          disabled={!canProceed()}
          title={
            !canProceed()
              ? "Please ensure you have enough ETH and GToken"
              : "Proceed to stake option selection"
          }
        >
          {canProceed() ? (
            <>Next: Choose Stake Option →</>
          ) : (
            <>Acquire Resources First</>
          )}
        </button>
      </div>
    </div>
  );
}
