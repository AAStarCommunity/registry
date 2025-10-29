/**
 * Step 6: Register to Registry v2.1
 *
 * Pure metadata registration - NO staking required
 * (stGToken was already staked in Step 4)
 */

import React, { useState } from "react";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import "./Step6_RegisterRegistry.css";

export interface Step6Props {
  paymasterAddress: string;
  xPNTsAddress: string;
  sbtAddress: string;
  walletStatus: WalletStatus;
  communityName: string;
  serviceFeeRate: string;
  sGTokenAmount: string; // Staked GToken amount from Step 2
  onNext: (registryTxHash: string) => void;
  onBack: () => void;
}

// Registry v2.1 ABI - registerCommunity with stGTokenAmount parameter (backward compatible with v2.0)
const REGISTRY_V2_1_ABI = [
  `function registerCommunity(
    tuple(
      string name,
      string ensName,
      string description,
      string website,
      string logoURI,
      string twitterHandle,
      string githubOrg,
      string telegramGroup,
      address xPNTsToken,
      address[] supportedSBTs,
      uint8 mode,
      address paymasterAddress,
      address community,
      uint256 registeredAt,
      uint256 lastUpdatedAt,
      bool isActive,
      uint256 memberCount
    ) profile,
    uint256 stGTokenAmount
  ) external`,
  "function getCommunityProfile(address communityAddress) external view returns (tuple(string name, string ensName, string description, string website, string logoURI, string twitterHandle, string githubOrg, string telegramGroup, address xPNTsToken, address[] supportedSBTs, uint8 mode, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, uint256 memberCount))",
];

// GTokenStaking ABI for balance check
const GTOKEN_STAKING_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
];

enum PaymasterMode {
  INDEPENDENT = 0, // AOA mode
  SUPER = 1,       // Super mode
}

export function Step6_RegisterRegistry_v2({
  paymasterAddress,
  xPNTsAddress,
  sbtAddress,
  walletStatus,
  communityName,
  serviceFeeRate,
  sGTokenAmount,
  onNext,
  onBack,
}: Step6Props) {
  const config = getCurrentNetworkConfig();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional metadata fields
  const [description, setDescription] = useState(
    `Community Paymaster for ${communityName} - Gas sponsorship for our community members`
  );
  const [website, setWebsite] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log("🔍 Pre-registration checks...");
      console.log("User address:", userAddress);
      console.log("Registry v2.1:", config.contracts.registryV2_1);
      console.log("Paymaster:", paymasterAddress);
      console.log("xPNTs:", xPNTsAddress);
      console.log("SBT:", sbtAddress);
      console.log("stGToken amount:", sGTokenAmount, "GT");

      // Check if contracts exist
      const paymasterCode = await provider.getCode(paymasterAddress);
      if (paymasterCode === "0x") {
        throw new Error(`Paymaster contract not found at ${paymasterAddress}`);
      }
      console.log("✅ Paymaster contract exists");

      const xPNTsCode = await provider.getCode(xPNTsAddress);
      if (xPNTsCode === "0x") {
        throw new Error(`xPNTs contract not found at ${xPNTsAddress}`);
      }
      console.log("✅ xPNTs contract exists");

      const sbtCode = await provider.getCode(sbtAddress);
      if (sbtCode === "0x") {
        throw new Error(`SBT contract not found at ${sbtAddress}`);
      }
      console.log("✅ SBT contract exists");

      // Check stGToken balance
      if (sGTokenAmount && parseFloat(sGTokenAmount) > 0) {
        const stGTokenAmountWei = ethers.parseEther(sGTokenAmount);
        const gTokenStaking = new ethers.Contract(
          config.contracts.gTokenStaking,
          GTOKEN_STAKING_ABI,
          provider
        );

        const userBalance = await gTokenStaking.balanceOf(userAddress);
        console.log("User stGToken balance:", ethers.formatEther(userBalance), "stGT");
        console.log("Required stGToken:", sGTokenAmount, "stGT");

        if (userBalance < stGTokenAmountWei) {
          throw new Error(
            `Insufficient stGToken balance. You have ${ethers.formatEther(userBalance)} stGT but need ${sGTokenAmount} stGT. Please stake more GToken in Step 4.`
          );
        }
        console.log("✅ Sufficient stGToken balance");
      }

      const registry = new ethers.Contract(
        config.contracts.registryV2_1,
        REGISTRY_V2_1_ABI,
        signer
      );

      // Check if already registered
      try {
        const existingProfile = await registry.getCommunityProfile(userAddress);
        if (existingProfile.paymasterAddress && existingProfile.paymasterAddress !== ethers.ZeroAddress) {
          console.warn("⚠️ User already has a registered paymaster:", existingProfile.paymasterAddress);
          // Don't throw error, allow re-registration
        }
      } catch (e) {
        console.log("ℹ️ No existing registration (first-time registration)");
      }

      console.log("📝 Registering community to Registry v2.1...");

      // Build community profile
      const profile = {
        name: communityName,
        ensName: "", // Optional
        description: description,
        website: website,
        logoURI: "", // Optional
        twitterHandle: twitterHandle,
        githubOrg: "", // Optional
        telegramGroup: "", // Optional
        xPNTsToken: xPNTsAddress,
        supportedSBTs: [sbtAddress], // Array of SBT addresses
        mode: PaymasterMode.INDEPENDENT, // AOA mode
        paymasterAddress: paymasterAddress,
        community: walletStatus.address, // Will be overwritten by contract
        registeredAt: 0, // Will be set by contract
        lastUpdatedAt: 0, // Will be set by contract
        isActive: true, // Will be set by contract
        memberCount: 0,
      };

      console.log("Community profile:", profile);

      // Register to Registry v2.1 - pass the staked GToken amount from Step 2
      // Convert from decimal string to wei (18 decimals)
      const stGTokenAmountWei = ethers.parseEther(sGTokenAmount || "0");
      console.log("📊 Staked GToken amount:", sGTokenAmount, "GT (", stGTokenAmountWei.toString(), "wei)");

      console.log("🚀 Calling registerCommunity() with profile:", profile);

      try {
        const tx = await registry.registerCommunity(profile, stGTokenAmountWei);
        console.log("📤 Registration tx sent:", tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log("✅ Registration confirmed:", receipt);

        // Proceed to next step
        onNext(tx.hash);
      } catch (regError: any) {
        console.error("❌ registerCommunity() call failed:", regError);

        // Try to get more detailed error info
        let errorMessage = "Failed to register to Registry v2.1.";

        if (regError.message) {
          errorMessage = regError.message;
        }

        if (regError.data) {
          console.error("Error data:", regError.data);
          errorMessage += `\nError data: ${JSON.stringify(regError.data)}`;
        }

        if (regError.reason) {
          console.error("Error reason:", regError.reason);
          errorMessage = regError.reason;
        }

        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("❌ Registration failed:", err);
      setError(
        err?.message || "Failed to register to Registry. Please try again."
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="step6-register-registry">
      <div className="step-header">
        <h2>Step 6: Register to Registry v2.0</h2>
        <p className="step-description">
          Register your community Paymaster to the Registry. This makes it
          discoverable by users and enables reputation tracking.
        </p>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="info-icon">ℹ️</div>
        <div className="info-content">
          <div className="info-title">Metadata-Only Registration</div>
          <div className="info-text">
            Registry v2.0 only stores community metadata. Your stGToken was
            already staked in Step 4 and will be automatically locked when needed
            during operations.
          </div>
        </div>
      </div>

      {/* Paymaster Summary */}
      <div className="paymaster-summary">
        <h3>📋 Registration Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Community Name:</span>
            <span className="value">{communityName}</span>
          </div>
          <div className="summary-item">
            <span className="label">Paymaster Address:</span>
            <span className="value address">
              {paymasterAddress.slice(0, 10)}...{paymasterAddress.slice(-8)}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">xPNTs Token:</span>
            <span className="value address">
              {xPNTsAddress.slice(0, 10)}...{xPNTsAddress.slice(-8)}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">SBT Contract:</span>
            <span className="value address">
              {sbtAddress.slice(0, 10)}...{sbtAddress.slice(-8)}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Owner:</span>
            <span className="value address">
              {walletStatus.address.slice(0, 10)}...{walletStatus.address.slice(-8)}
            </span>
          </div>
        </div>
      </div>

      {/* Optional Metadata Form */}
      <div className="metadata-form">
        <h3>🎨 Community Metadata (Optional)</h3>
        <p className="form-hint">
          Add additional information to make your community more discoverable
        </p>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your community..."
            rows={3}
            disabled={isRegistering}
          />
        </div>

        <div className="form-group">
          <label htmlFor="website">Website (Optional)</label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://your-community.com"
            disabled={isRegistering}
          />
        </div>

        <div className="form-group">
          <label htmlFor="twitter">Twitter Handle (Optional)</label>
          <input
            id="twitter"
            type="text"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            placeholder="@YourCommunity"
            disabled={isRegistering}
          />
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
        <div className="info-title">💡 What happens after registration?</div>
        <ul className="info-list">
          <li>
            ✅ Your Paymaster becomes discoverable in the public registry
          </li>
          <li>
            ✅ Users can find and use your Paymaster for gas sponsorship
          </li>
          <li>
            ✅ Your stGToken from Step 4 enables governance participation
          </li>
          <li>
            ℹ️ Lock mechanisms will be triggered automatically during operations
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="step-actions">
        <button
          className="btn-back"
          onClick={onBack}
          disabled={isRegistering}
        >
          ← Back
        </button>
        <button
          className="btn-primary"
          onClick={handleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <>
              <span className="spinner">⏳</span> Registering...
            </>
          ) : (
            "Register to Registry →"
          )}
        </button>
      </div>
    </div>
  );
}
