import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import { StakeToSuperPaymaster } from "../components/StakeToSuperPaymaster";
import "./Step5_Stake.css";

export interface Step5Props {
  paymasterAddress: string;
  walletStatus: WalletStatus;
  selectedOption: "standard" | "super";
  onNext: (txHash: string) => void;
  onBack: () => void;
}

/**
 * Step5_Stake Router Component
 *
 * Routes to different staking flows based on selectedOption:
 * - Standard: Deposit ETH to EntryPoint (traditional ERC-4337)
 * - Super: Register to SuperPaymasterV2 (Super Mode)
 */
export function Step5_Stake(props: Step5Props) {
  const { selectedOption } = props;

  // Route based on stake option
  if (selectedOption === "super") {
    // Super Mode: Register to SuperPaymasterV2
    return (
      <StakeToSuperPaymaster
        walletStatus={props.walletStatus}
        onNext={props.onNext}
        onBack={props.onBack}
      />
    );
  }

  // Standard Flow: Deposit to EntryPoint
  return <Step5_StandardFlow {...props} />;
}

/**
 * Standard Flow Component - EntryPoint Deposit
 */
function Step5_StandardFlow({
  paymasterAddress,
  walletStatus,
  onNext,
  onBack,
}: Step5Props) {

// EntryPoint v0.7 address on Sepolia
const ENTRY_POINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

// Simple EntryPoint ABI for depositTo
const ENTRY_POINT_ABI = [
  "function depositTo(address account) external payable",
  "function balanceOf(address account) external view returns (uint256)",
  "function getDepositInfo(address account) external view returns (uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)",
];

  const [depositAmount, setDepositAmount] = useState<string>("0.1");
  const [currentBalance, setCurrentBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current EntryPoint balance
  useEffect(() => {
    loadEntryPointBalance();
  }, [paymasterAddress]);

  const loadEntryPointBalance = async () => {
    setLoadingBalance(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const entryPoint = new ethers.Contract(
        ENTRY_POINT_V07,
        ENTRY_POINT_ABI,
        provider
      );

      const balance = await entryPoint.balanceOf(paymasterAddress);
      setCurrentBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("Failed to load EntryPoint balance:", err);
      setCurrentBalance("0");
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    // Check if user has enough ETH
    const requiredETH = parseFloat(depositAmount);
    const userETH = parseFloat(walletStatus.ethBalance);
    if (userETH < requiredETH) {
      setError(`Insufficient ETH. You have ${walletStatus.ethBalance} ETH but need ${depositAmount} ETH`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const entryPoint = new ethers.Contract(
        ENTRY_POINT_V07,
        ENTRY_POINT_ABI,
        signer
      );

      // Call depositTo with ETH value
      const tx = await entryPoint.depositTo(paymasterAddress, {
        value: ethers.parseEther(depositAmount),
      });

      console.log("Deposit transaction sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Deposit confirmed:", receipt);

      // Reload balance
      await loadEntryPointBalance();

      // Proceed to next step
      onNext(tx.hash);
    } catch (err: any) {
      console.error("Deposit failed:", err);
      setError(
        err?.message || "Failed to deposit to EntryPoint. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendedAmount = () => {
    return "0.1 ETH (recommended for Standard Flow)";
  };

  return (
    <div className="step5-stake">
      <div className="step-header">
        <h2>Step 5: Deposit to EntryPoint</h2>
        <p className="step-description">
          Deposit ETH to the EntryPoint contract to fund gas sponsorship for
          your Paymaster. This ETH will be used to pay for user operations.
        </p>
      </div>

      {/* Flow Info */}
      <div className="flow-info">
        <div className="info-badge">🐢 Standard Flow</div>
        <div className="info-text">
          <p>
            Standard Flow requires more ETH upfront for EntryPoint deposit and
            direct gas payments.
          </p>
        </div>
      </div>

      {/* Current Balance */}
      <div className="balance-card">
        <div className="balance-label">Current EntryPoint Balance</div>
        {loadingBalance ? (
          <div className="balance-loading">Loading...</div>
        ) : (
          <div className="balance-value">{currentBalance} ETH</div>
        )}
        <div className="balance-address">
          EntryPoint: {ENTRY_POINT_V07.slice(0, 10)}...{ENTRY_POINT_V07.slice(-8)}
        </div>
      </div>

      {/* Deposit Form */}
      <div className="deposit-form">
        <div className="form-group">
          <label htmlFor="deposit-amount">Deposit Amount (ETH)</label>
          <input
            id="deposit-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.1"
            disabled={isLoading}
          />
          <div className="form-hint">
            Recommended: {getRecommendedAmount()}
          </div>
        </div>

        {/* User Balance */}
        <div className="user-balance">
          <span className="balance-label">Your ETH Balance:</span>
          <span className="balance-value">{walletStatus.ethBalance} ETH</span>
        </div>

        {/* Warning for low balance */}
        {parseFloat(walletStatus.ethBalance) < parseFloat(depositAmount) && (
          <div className="warning-banner">
            ⚠️ Insufficient ETH balance. Please acquire more ETH before
            depositing.
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <div className="error-content">{error}</div>
        </div>
      )}

      {/* Info Section */}
      <div className="info-section">
        <div className="info-title">💡 Why Deposit to EntryPoint?</div>
        <div className="info-content">
          <p>
            The EntryPoint contract manages all gas payments for ERC-4337 Account
            Abstraction. Your Paymaster must maintain a balance in the EntryPoint
            to sponsor user operations.
          </p>
          <ul>
            <li>
              <strong>Gas Sponsorship:</strong> ETH in EntryPoint is used to pay
              gas for user operations.
            </li>
            <li>
              <strong>Automatic Deduction:</strong> Gas costs are automatically
              deducted from your EntryPoint balance.
            </li>
            <li>
              <strong>Top-up Anytime:</strong> You can deposit more ETH at any time
              to increase your balance.
            </li>
            <li>
              <strong>Withdraw Later:</strong> Unused ETH can be withdrawn back to
              your wallet.
            </li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="step-actions">
        <button className="btn-back" onClick={onBack} disabled={isLoading}>
          ← Back to Resources
        </button>
        <button
          className="btn-next"
          onClick={handleDeposit}
          disabled={
            isLoading ||
            !depositAmount ||
            parseFloat(depositAmount) <= 0 ||
            parseFloat(walletStatus.ethBalance) < parseFloat(depositAmount)
          }
        >
          {isLoading ? (
            <>
              <span className="spinner">⏳</span> Depositing...
            </>
          ) : (
            <>Deposit {depositAmount} ETH →</>
          )}
        </button>
      </div>
    </div>
  );
}
