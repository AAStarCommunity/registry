/**
 * StakeToSuperPaymaster Component
 *
 * Super Mode registration flow (v2.1.0 - Auto-Stake):
 * 1. Register with auto-stake (approve GT + registerOperatorWithAutoStake)
 *    - Combines: approve GT → stakeFor → lockStake → register → optional aPNTs deposit
 *    - Reduces from 6+ signatures to 2 signatures!
 * 2. Deploy xPNTs Token (optional)
 * 3. Complete - Fast and simple!
 */

import React, { useState } from "react";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { GTokenABI, GTokenStakingABI, SuperPaymasterV2ABI } from "../../../../config/abis";
import "./StakeToSuperPaymaster.css";

export interface StakeToSuperPaymasterProps {
  walletStatus: WalletStatus;
  onNext: (operatorAddress: string) => void;
  onBack: () => void;
}

// Get network configuration
const networkConfig = getCurrentNetworkConfig();

// Contract addresses from shared-config
const SUPER_PAYMASTER_V2 = networkConfig.contracts.superPaymasterV2;
const GTOKEN_ADDRESS = networkConfig.contracts.gToken;
const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;
const APNTS_ADDRESS = networkConfig.contracts.aPNTs;

// ABIs imported from shared-config via config/abis.ts

// Registration steps (v2.1.0 - simplified with auto-stake)
const RegistrationStep = {
  REGISTER_WITH_AUTO_STAKE: 1,  // Combines: approve GT + auto-stake + register + optional aPNTs
  DEPLOY_XPNTS: 2,               // Optional: deploy xPNTs token
  COMPLETE: 3,                   // Done!
} as const;

type RegistrationStepType = typeof RegistrationStep[keyof typeof RegistrationStep];

export function StakeToSuperPaymaster({
  walletStatus,
  onNext,
  onBack,
}: StakeToSuperPaymasterProps) {
  const [currentStep, setCurrentStep] = useState<RegistrationStepType>(
    RegistrationStep.REGISTER_WITH_AUTO_STAKE
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

  const handleRegisterWithAutoStake = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTokenABI, signer);
      const superPaymaster = new ethers.Contract(
        SUPER_PAYMASTER_V2,
        SuperPaymasterV2ABI,
        signer
      );

      const gtAmount = ethers.parseEther(gTokenAmount);
      const apntsAmount = ethers.parseEther(aPNTsAmount);

      // Step 1: Approve GToken to SuperPaymaster for auto-stake
      console.log("Step 1/3: Approving GToken to SuperPaymaster for auto-stake...");
      const approveGTTx = await gToken.approve(SUPER_PAYMASTER_V2, gtAmount);
      console.log("GToken approval tx:", approveGTTx.hash);
      await approveGTTx.wait();
      console.log("✅ GToken approved to SuperPaymaster");

      // Step 2: Approve aPNTs to SuperPaymaster (if depositing)
      if (apntsAmount > 0n) {
        console.log("Step 2/3: Approving aPNTs to SuperPaymaster...");
        const aPNTs = new ethers.Contract(APNTS_ADDRESS, GTokenABI, signer);
        const approveAPNTsTx = await aPNTs.approve(SUPER_PAYMASTER_V2, apntsAmount);
        console.log("aPNTs approval tx:", approveAPNTsTx.hash);
        await approveAPNTsTx.wait();
        console.log("✅ aPNTs approved to SuperPaymaster");
      }

      // Step 3: Register operator with auto-stake (v2.1.0)
      // function registerOperatorWithAutoStake(
      //   uint256 stGTokenAmount,
      //   uint256 aPNTsAmount,
      //   address[] memory supportedSBTs,
      //   address xPNTsToken,
      //   address treasury
      // )
      console.log("Step 3/3: Calling registerOperatorWithAutoStake...");
      console.log("  GT Amount:", ethers.formatEther(gtAmount));
      console.log("  aPNTs Amount:", ethers.formatEther(apntsAmount));
      console.log("  Treasury:", treasuryAddress);

      const tx = await superPaymaster.registerOperatorWithAutoStake(
        gtAmount,                          // GT to stake
        apntsAmount,                       // aPNTs to deposit (can be 0)
        [],                                // supportedSBTs - empty for now
        xPNTsTokenAddress || ethers.ZeroAddress,  // xPNTsToken
        treasuryAddress,                   // treasury
        {
          gasLimit: 800000  // Increased gas limit for auto-stake transaction
        }
      );

      setTxHash(tx.hash);
      console.log("Registration tx:", tx.hash);

      await tx.wait();
      console.log("✅ Operator registered with auto-stake!");
      console.log("   - GT staked and locked:", ethers.formatEther(gtAmount));
      console.log("   - aPNTs deposited:", ethers.formatEther(apntsAmount));

      setCurrentStep(RegistrationStep.DEPLOY_XPNTS);
    } catch (err: any) {
      console.error("Auto-stake registration failed:", err);
      setError(err?.message || "Failed to register with auto-stake");
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
      case RegistrationStep.REGISTER_WITH_AUTO_STAKE:
        return (
          <div className="step-content">
            <h3>Step 1: Register with Auto-Stake (v2.1.0)</h3>
            <p className="info-text">
              ⚡ <strong>One-step registration!</strong> This combines approve GT → stakeFor → lockStake → register → deposit aPNTs.
              <br />
              <span style={{color: '#10b981'}}>✓ Reduces from 6+ signatures to 2-3 signatures!</span>
            </p>

            <div className="form-group">
              <label>GToken Amount to Stake</label>
              <input
                type="number"
                value={gTokenAmount}
                onChange={(e) => setGTokenAmount(e.target.value)}
                placeholder="30"
                min="30"
                disabled={isLoading}
              />
              <div className="form-hint">
                Minimum: 30 GT | Available: {walletStatus.gTokenBalance} GToken
              </div>
            </div>

            <div className="form-group">
              <label>aPNTs Initial Deposit (Optional)</label>
              <input
                type="number"
                value={aPNTsAmount}
                onChange={(e) => setAPNTsAmount(e.target.value)}
                placeholder="1000"
                min="0"
                disabled={isLoading}
              />
              <div className="form-hint">
                Available: {walletStatus.aPNTsBalance} aPNTs | Can deposit 0 and add later
              </div>
            </div>

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

            <button
              className="btn-primary"
              onClick={handleRegisterWithAutoStake}
              disabled={isLoading || parseFloat(gTokenAmount) < 30 || !ethers.isAddress(treasuryAddress)}
            >
              {isLoading ? "Registering with Auto-Stake..." : "Register Operator (Auto-Stake) →"}
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
        <h2>⚡ Super Mode Registration (v2.1.0 - Auto-Stake)</h2>
        <p className="step-description">
          Fastest registration ever! Just 2-3 signatures to launch your Paymaster - no contract deployment needed!
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="progress-steps">
        {[
          { step: RegistrationStep.REGISTER_WITH_AUTO_STAKE, label: "Auto-Stake Register" },
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
