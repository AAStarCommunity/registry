import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { RegistryV1ABI, ERC20_ABI } from "../../../../config/abis";
import "./Step6_RegisterRegistry.css";

export interface Step6Props {
  paymasterAddress: string;
  walletStatus: WalletStatus;
  communityName: string;
  serviceFeeRate: string;  // Fee rate percentage (e.g., "2" for 2%)
  onNext: (registryTxHash: string) => void;
  onBack: () => void;
}


export function Step6_RegisterRegistry({
  paymasterAddress,
  walletStatus,
  communityName,
  serviceFeeRate,
  onNext,
  onBack,
}: Step6Props) {
  // Get addresses from config
  const networkConfig = getCurrentNetworkConfig();
  const REGISTRY_V1_2 = networkConfig.contracts.registry; // v1.2 (legacy)
  const GTOKEN_ADDRESS = networkConfig.contracts.gToken;

  const [gTokenAmount, setGTokenAmount] = useState<string>("30");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");
  const [allowance, setAllowance] = useState<string>("0");
  const [isApproving, setIsApproving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(true);

  // Load GToken balance and allowance
  useEffect(() => {
    loadGTokenInfo();
  }, [walletStatus.address]);

  const loadGTokenInfo = async () => {
    setIsLoadingBalances(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const gToken = new ethers.Contract(GTOKEN_ADDRESS, ERC20_ABI, provider);

      const [balance, currentAllowance] = await Promise.all([
        gToken.balanceOf(walletStatus.address),
        gToken.allowance(walletStatus.address, REGISTRY_V1_2),
      ]);

      const balanceFormatted = ethers.formatEther(balance);
      const allowanceFormatted = ethers.formatEther(currentAllowance);

      setGTokenBalance(balanceFormatted);
      setAllowance(allowanceFormatted);

      // Check if needs approval
      setNeedsApproval(
        parseFloat(allowanceFormatted) < parseFloat(gTokenAmount)
      );
    } catch (err) {
      console.error("Failed to load GToken info:", err);
      setGTokenBalance("0");
      setAllowance("0");
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const handleApprove = async () => {
    if (!gTokenAmount || parseFloat(gTokenAmount) <= 0) {
      setError("Please enter a valid GToken amount");
      return;
    }

    if (parseFloat(gTokenBalance) < parseFloat(gTokenAmount)) {
      setError(`Insufficient GToken. You have ${gTokenBalance} but need ${gTokenAmount}`);
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const gToken = new ethers.Contract(GTOKEN_ADDRESS, ERC20_ABI, signer);

      // Approve Registry to spend GToken
      const tx = await gToken.approve(
        REGISTRY_V1_2,
        ethers.parseEther(gTokenAmount)
      );

      console.log("Approval transaction sent:", tx.hash);

      // Wait for confirmation
      await tx.wait();
      console.log("Approval confirmed");

      // Reload allowance
      await loadGTokenInfo();
    } catch (err: any) {
      console.error("Approval failed:", err);
      setError(
        err?.message || "Failed to approve GToken. Please try again."
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleRegister = async () => {
    if (needsApproval) {
      setError("Please approve GToken first");
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(REGISTRY_V1_2, RegistryV1ABI, signer);

      // Create metadata JSON
      const metadata = JSON.stringify({
        name: communityName,
        description: `Community Paymaster for ${communityName}`,
        version: "v4",
        timestamp: Date.now(),
      });

      // Calculate feeRate in basis points (e.g., "2" -> 200 basis points = 2%)
      const feeRateInBasisPoints = Math.round(parseFloat(serviceFeeRate) * 100);

      console.log('Registering Paymaster:', {
        paymasterAddress,
        feeRateInBasisPoints,
        metadata: JSON.parse(metadata)
      });

      // Register Paymaster
      const tx = await registry.registerPaymaster(
        paymasterAddress,
        feeRateInBasisPoints,  // ✅ Use feeRate (basis points) instead of gTokenAmount
        metadata
      );

      console.log("Registration transaction sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Registration confirmed:", receipt);

      // Proceed to next step
      onNext(tx.hash);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(
        err?.message || "Failed to register Paymaster. Please try again."
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const canApprove = () => {
    return (
      !isApproving &&
      !isLoadingBalances &&
      gTokenAmount &&
      parseFloat(gTokenAmount) > 0 &&
      parseFloat(gTokenBalance) >= parseFloat(gTokenAmount)
    );
  };

  const canRegister = () => {
    return !isRegistering && !needsApproval;
  };

  return (
    <div className="step6-register-registry">
      <div className="step-header">
        <h2>Step 6: Register to Registry</h2>
        <p className="step-description">
          Register your Paymaster to the SuperPaymaster Registry by staking
          GToken. This makes your Paymaster discoverable and enables users to
          find and use it.
        </p>
      </div>

      {/* Paymaster Info */}
      <div className="paymaster-card">
        <div className="card-header">
          <h3>{communityName}</h3>
          <div className="card-status">Ready to Register</div>
        </div>
        <div className="card-body">
          <div className="info-row">
            <span className="label">Paymaster Address:</span>
            <span className="value address">
              {paymasterAddress.slice(0, 10)}...{paymasterAddress.slice(-8)}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Owner:</span>
            <span className="value address">
              {walletStatus.address.slice(0, 10)}...{walletStatus.address.slice(-8)}
            </span>
          </div>
        </div>
      </div>

      {/* GToken Balance */}
      <div className="balance-section">
        <h3>GToken Balance</h3>
        {isLoadingBalances ? (
          <div className="loading">Loading balances...</div>
        ) : (
          <>
            <div className="balance-card">
              <div className="balance-item">
                <span className="label">Your GToken Balance:</span>
                <span className="value">{gTokenBalance} GToken</span>
              </div>
              <div className="balance-item">
                <span className="label">Current Allowance:</span>
                <span className="value">{allowance} GToken</span>
              </div>
            </div>

            {parseFloat(gTokenBalance) < parseFloat(gTokenAmount) && (
              <div className="warning-banner">
                ⚠️ Insufficient GToken balance. You need at least{" "}
                {gTokenAmount} GToken to register.
                <a
                  href="/get-gtoken"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="get-token-link"
                >
                  Get GToken →
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stake Form */}
      <div className="stake-form">
        <h3>Stake GToken</h3>
        <div className="form-group">
          <label htmlFor="gtoken-amount">GToken Stake Amount</label>
          <input
            id="gtoken-amount"
            type="number"
            step="1"
            min="30"
            value={gTokenAmount}
            onChange={(e) => {
              setGTokenAmount(e.target.value);
              // Check if needs approval with new amount
              setNeedsApproval(
                parseFloat(allowance) < parseFloat(e.target.value)
              );
            }}
            placeholder="30"
            disabled={isApproving || isRegistering}
          />
          <div className="form-hint">
            Minimum: 30 GToken. Higher stake improves your Paymaster's
            reputation.
          </div>
        </div>

        {/* Approval Status */}
        <div className="approval-status">
          {needsApproval ? (
            <div className="status-pending">
              ⏳ Approval Required: You need to approve Registry to spend{" "}
              {gTokenAmount} GToken
            </div>
          ) : (
            <div className="status-approved">
              ✅ Approved: Registry can spend up to {allowance} GToken
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          {needsApproval && (
            <button
              className="btn-approve"
              onClick={handleApprove}
              disabled={!canApprove()}
            >
              {isApproving ? (
                <>
                  <span className="spinner">⏳</span> Approving...
                </>
              ) : (
                <>Approve GToken</>
              )}
            </button>
          )}

          <button
            className="btn-register"
            onClick={handleRegister}
            disabled={!canRegister()}
          >
            {isRegistering ? (
              <>
                <span className="spinner">⏳</span> Registering...
              </>
            ) : (
              <>Register Paymaster</>
            )}
          </button>
        </div>
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
        <div className="info-title">💡 Why Register to Registry?</div>
        <div className="info-content">
          <p>
            The SuperPaymaster Registry is a decentralized marketplace where
            users can discover and select the best Paymaster for their needs.
          </p>
          <ul>
            <li>
              <strong>Discoverability:</strong> Users can find your Paymaster
              in the public registry.
            </li>
            <li>
              <strong>Reputation:</strong> GToken stake demonstrates your
              commitment and builds trust.
            </li>
            <li>
              <strong>Competitive Advantage:</strong> Higher stake can improve
              your ranking in the registry.
            </li>
            <li>
              <strong>Revenue:</strong> Registered Paymasters can earn service
              fees from sponsored transactions.
            </li>
          </ul>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="step-actions">
        <button
          className="btn-back"
          onClick={onBack}
          disabled={isApproving || isRegistering}
        >
          ← Back to EntryPoint
        </button>
        {/* Note: Register button is in the form above */}
      </div>
    </div>
  );
}
