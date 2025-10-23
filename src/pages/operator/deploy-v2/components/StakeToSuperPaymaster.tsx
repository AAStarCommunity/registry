/**
 * StakeToSuperPaymaster Component
 *
 * Super Mode registration flow:
 * 1. Stake GToken → get sGToken
 * 2. Register to SuperPaymasterV2 (auto-lock sGToken)
 * 3. Deposit aPNTs
 * 4. Deploy xPNTs Token (optional)
 * 5. Complete - 3 seconds to launch!
 */

import React, { useState } from "react";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import "./StakeToSuperPaymaster.css";

export interface StakeToSuperPaymasterProps {
  walletStatus: WalletStatus;
  onNext: (operatorAddress: string) => void;
  onBack: () => void;
}

// Contract addresses (TODO: move to config)
const SUPER_PAYMASTER_V2 = "0x..."; // Replace with actual address
const GTOKEN_ADDRESS = "0x..."; // Replace with actual address
const APNTS_ADDRESS = "0x..."; // Replace with actual address

// Simplified ABIs
const GTOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

const SUPER_PAYMASTER_ABI = [
  "function registerOperator(address treasury, address xPNTsToken, uint256 exchangeRate, address[] memory supportedSBTs) external",
  "function depositAPNTs(uint256 amount) external",
  "function getOperatorAccount(address operator) external view returns (tuple(uint256 sGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused))",
];

enum RegistrationStep {
  STAKE_GTOKEN = 1,
  REGISTER_OPERATOR = 2,
  DEPOSIT_APNTS = 3,
  DEPLOY_XPNTS = 4,
  COMPLETE = 5,
}

export function StakeToSuperPaymaster({
  walletStatus,
  onNext,
  onBack,
}: StakeToSuperPaymasterProps) {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(
    RegistrationStep.STAKE_GTOKEN
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Form state
  const [gTokenAmount, setGTokenAmount] = useState("100");
  const [aPNTsAmount, setAPNTsAmount] = useState("1000");
  const [treasuryAddress, setTreasuryAddress] = useState(walletStatus.address);
  const [xPNTsTokenAddress, setXPNTsTokenAddress] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.0");

  const handleStakeGToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // TODO: Implement GToken staking logic
      // This should interact with GToken contract to stake and receive sGToken

      console.log("Staking GToken...", gTokenAmount);

      // Placeholder: simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      setCurrentStep(RegistrationStep.REGISTER_OPERATOR);
    } catch (err: any) {
      console.error("GToken staking failed:", err);
      setError(err?.message || "Failed to stake GToken");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOperator = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const superPaymaster = new ethers.Contract(
        SUPER_PAYMASTER_V2,
        SUPER_PAYMASTER_ABI,
        signer
      );

      console.log("Registering operator to SuperPaymasterV2...");

      // Call registerOperator
      const tx = await superPaymaster.registerOperator(
        treasuryAddress,
        xPNTsTokenAddress || ethers.ZeroAddress,
        ethers.parseUnits(exchangeRate, 18),
        [] // supportedSBTs - empty for now
      );

      setTxHash(tx.hash);
      console.log("Registration tx:", tx.hash);

      await tx.wait();
      console.log("Operator registered!");

      setCurrentStep(RegistrationStep.DEPOSIT_APNTS);
    } catch (err: any) {
      console.error("Operator registration failed:", err);
      setError(err?.message || "Failed to register operator");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositAPNTs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Approve aPNTs
      const aPNTsContract = new ethers.Contract(APNTS_ADDRESS, GTOKEN_ABI, signer);
      const approvalAmount = ethers.parseUnits(aPNTsAmount, 18);

      console.log("Approving aPNTs...");
      const approveTx = await aPNTsContract.approve(SUPER_PAYMASTER_V2, approvalAmount);
      await approveTx.wait();

      // 2. Deposit aPNTs
      const superPaymaster = new ethers.Contract(
        SUPER_PAYMASTER_V2,
        SUPER_PAYMASTER_ABI,
        signer
      );

      console.log("Depositing aPNTs...");
      const depositTx = await superPaymaster.depositAPNTs(approvalAmount);
      setTxHash(depositTx.hash);
      await depositTx.wait();

      console.log("aPNTs deposited!");
      setCurrentStep(RegistrationStep.DEPLOY_XPNTS);
    } catch (err: any) {
      console.error("aPNTs deposit failed:", err);
      setError(err?.message || "Failed to deposit aPNTs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployXPNTs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement xPNTs token deployment
      // For now, skip this step
      console.log("Deploying xPNTs token (optional)...");

      await new Promise(resolve => setTimeout(resolve, 1000));

      setCurrentStep(RegistrationStep.COMPLETE);
      onNext(walletStatus.address); // Pass operator address
    } catch (err: any) {
      console.error("xPNTs deployment failed:", err);
      setError(err?.message || "Failed to deploy xPNTs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipXPNTs = () => {
    setCurrentStep(RegistrationStep.COMPLETE);
    onNext(walletStatus.address);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case RegistrationStep.STAKE_GTOKEN:
        return (
          <div className="step-content">
            <h3>Step 1: Stake GToken</h3>
            <p>Stake GToken to receive sGToken (staked governance token).</p>

            <div className="form-group">
              <label>GToken Amount</label>
              <input
                type="number"
                value={gTokenAmount}
                onChange={(e) => setGTokenAmount(e.target.value)}
                placeholder="100"
                min="100"
                disabled={isLoading}
              />
              <div className="form-hint">
                Available: {walletStatus.gTokenBalance} GToken
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleStakeGToken}
              disabled={isLoading || parseFloat(gTokenAmount) < 100}
            >
              {isLoading ? "Staking..." : "Stake GToken →"}
            </button>
          </div>
        );

      case RegistrationStep.REGISTER_OPERATOR:
        return (
          <div className="step-content">
            <h3>Step 2: Register Operator</h3>
            <p>Register to SuperPaymasterV2 (auto-locks sGToken).</p>

            <div className="form-group">
              <label>Treasury Address</label>
              <input
                type="text"
                value={treasuryAddress}
                onChange={(e) => setTreasuryAddress(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
              <div className="form-hint">
                Address to receive user payments (xPNTs)
              </div>
            </div>

            <div className="form-group">
              <label>Exchange Rate (xPNTs:aPNTs)</label>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="1.0"
                step="0.1"
                disabled={isLoading}
              />
              <div className="form-hint">
                1.0 means 1 xPNT = 1 aPNT
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleRegisterOperator}
              disabled={isLoading || !ethers.isAddress(treasuryAddress)}
            >
              {isLoading ? "Registering..." : "Register Operator →"}
            </button>
          </div>
        );

      case RegistrationStep.DEPOSIT_APNTS:
        return (
          <div className="step-content">
            <h3>Step 3: Deposit aPNTs</h3>
            <p>Deposit aPNTs to back your gas sponsorship.</p>

            <div className="form-group">
              <label>aPNTs Amount</label>
              <input
                type="number"
                value={aPNTsAmount}
                onChange={(e) => setAPNTsAmount(e.target.value)}
                placeholder="1000"
                min="1000"
                disabled={isLoading}
              />
              <div className="form-hint">
                Available: {walletStatus.aPNTsBalance} aPNTs
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleDepositAPNTs}
              disabled={isLoading || parseFloat(aPNTsAmount) < 1000}
            >
              {isLoading ? "Depositing..." : "Deposit aPNTs →"}
            </button>
          </div>
        );

      case RegistrationStep.DEPLOY_XPNTS:
        return (
          <div className="step-content">
            <h3>Step 4: Deploy xPNTs Token (Optional)</h3>
            <p>Deploy a custom xPNTs token for your community, or skip to use the default.</p>

            <div className="form-group">
              <label>xPNTs Token Address (Optional)</label>
              <input
                type="text"
                value={xPNTsTokenAddress}
                onChange={(e) => setXPNTsTokenAddress(e.target.value)}
                placeholder="0x... (leave empty to use default)"
                disabled={isLoading}
              />
            </div>

            <div className="button-group">
              <button
                className="btn-secondary"
                onClick={handleSkipXPNTs}
                disabled={isLoading}
              >
                Skip (Use Default)
              </button>
              <button
                className="btn-primary"
                onClick={handleDeployXPNTs}
                disabled={isLoading}
              >
                {isLoading ? "Deploying..." : "Deploy xPNTs →"}
              </button>
            </div>
          </div>
        );

      case RegistrationStep.COMPLETE:
        return (
          <div className="step-content success">
            <div className="success-icon">✅</div>
            <h3>Super Mode Registration Complete!</h3>
            <p>
              You've successfully registered to SuperPaymasterV2.
              <br />
              Your Paymaster is now ready to sponsor user operations!
            </p>

            <div className="info-card">
              <div className="info-row">
                <span>Operator Address:</span>
                <span className="monospace">{walletStatus.address}</span>
              </div>
              <div className="info-row">
                <span>GToken Staked:</span>
                <span>{gTokenAmount} GToken</span>
              </div>
              <div className="info-row">
                <span>aPNTs Deposited:</span>
                <span>{aPNTsAmount} aPNTs</span>
              </div>
              {txHash && (
                <div className="info-row">
                  <span>Last Transaction:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="stake-to-super-paymaster">
      <div className="step-header">
        <h2>⚡ Super Mode Registration</h2>
        <p className="step-description">
          Three seconds to launch your Paymaster - no contract deployment needed!
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="progress-steps">
        {[
          { step: RegistrationStep.STAKE_GTOKEN, label: "Stake GToken" },
          { step: RegistrationStep.REGISTER_OPERATOR, label: "Register" },
          { step: RegistrationStep.DEPOSIT_APNTS, label: "Deposit aPNTs" },
          { step: RegistrationStep.DEPLOY_XPNTS, label: "Deploy xPNTs" },
          { step: RegistrationStep.COMPLETE, label: "Complete" },
        ].map((item) => (
          <div
            key={item.step}
            className={`progress-step ${
              currentStep === item.step
                ? "active"
                : currentStep > item.step
                ? "completed"
                : "pending"
            }`}
          >
            <div className="step-number">{item.step}</div>
            <div className="step-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <div className="error-content">{error}</div>
        </div>
      )}

      {/* Current Step Content */}
      {renderCurrentStep()}

      {/* Navigation */}
      {currentStep !== RegistrationStep.COMPLETE && (
        <div className="step-actions">
          <button
            className="btn-back"
            onClick={onBack}
            disabled={isLoading}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
