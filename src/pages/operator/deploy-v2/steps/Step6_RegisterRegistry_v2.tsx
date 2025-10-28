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
      const registry = new ethers.Contract(
        config.contracts.registryV2_1,
        REGISTRY_V2_1_ABI,
        signer
      );

      console.log("📝 Registering community to Registry v2.1...");
      console.log("Registry v2.1:", config.contracts.registryV2_1);
      console.log("Paymaster:", paymasterAddress);
      console.log("xPNTs:", xPNTsAddress);

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

      // Register to Registry v2 - must pass stGTokenAmount (0 if already staked)
      // AOA mode: typically pass 30-50 GT here
      // Super mode: pass 0 if already locked via SuperPaymaster
      const stGTokenAmount = 0; // Assume already locked in previous step
      const tx = await registry.registerCommunity(profile, stGTokenAmount);
      console.log("📤 Registration tx sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Registration confirmed:", receipt);

      // Proceed to next step
      onNext(tx.hash);
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
