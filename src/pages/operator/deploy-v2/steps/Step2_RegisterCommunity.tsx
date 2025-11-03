/**
 * Step2_RegisterCommunity Component
 *
 * Register your community on the Registry:
 * Substep 1: Lock GToken & Register Community
 *   - User must have GToken balance in wallet
 *   - Approve GToken spending to Registry contract
 *   - Call registerCommunity() to lock tokens and create community entry
 *
 * Substep 2: Bind MySBT Contract
 *   - After community registration, bind the global MySBT contract
 *   - This allows members to mint community SBTs
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { getRpcUrl } from "../../../../config/rpc";
import { RegistryV2_1ABI, ERC20_ABI } from "../../../../config/abis";
import "./Step2_RegisterCommunity.css";

export interface Step2Props {
  walletStatus: WalletStatus;
  communityName: string;
  onNext: (registeredCommunity: RegisteredCommunity) => void;
  onBack: () => void;
}

export interface RegisteredCommunity {
  communityAddress: string;
  registryTxHash: string;
  mySBTBound: boolean;
  mySBTBindTxHash?: string;
}

// Get contract addresses from shared-config
const networkConfig = getCurrentNetworkConfig();
const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
const MYSBT_ADDRESS = networkConfig.contracts.mySBT;
const GTOKEN_ADDRESS = networkConfig.contracts.gToken;
const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;

// ABIs imported from config/abis.ts

// Sub-steps
enum RegistrationStep {
  LockAndRegister = 1,
  BindMySBT = 2,
  Complete = 3,
}

// Helper function to get explorer link
const getExplorerLink = (address: string, type: 'address' | 'tx' = 'address'): string => {
  const network = getCurrentNetworkConfig();
  const baseUrl = network.chainId === 11155111
    ? "https://sepolia.etherscan.io"
    : "https://etherscan.io";
  return `${baseUrl}/${type}/${address}`;
};

export function Step2_RegisterCommunity({
  walletStatus,
  communityName,
  onNext,
  onBack,
}: Step2Props) {
  const { t } = useTranslation();
  const [currentSubstep, setCurrentSubstep] = useState<RegistrationStep>(RegistrationStep.LockAndRegister);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration state
  const [lockAmount, setLockAmount] = useState<string>("10"); // Default 10 GToken
  const [registryTxHash, setRegistryTxHash] = useState<string>("");
  const [communityAddress, setCommunityAddress] = useState<string>("");
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [mySBTBound, setMySBTBound] = useState(false);
  const [mySBTBindTxHash, setMySBTBindTxHash] = useState<string>("");

  // Check if community is already registered
  useEffect(() => {
    if (currentSubstep === RegistrationStep.LockAndRegister) {
      checkExistingCommunity();
    }
  }, [currentSubstep, walletStatus.address]);

  const checkExistingCommunity = async () => {
    try {
      const rpcUrl = getRpcUrl();
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_1ABI, provider);

      const community = await registry.communities(walletStatus.address);

      if (community.registeredAt !== 0n) {
        setIsAlreadyRegistered(true);
        setCommunityAddress(walletStatus.address);
        setError(`Community already registered: ${community.name}`);
      }
    } catch (err) {
      console.error("Failed to check existing community:", err);
    }
  };

  // Substep 1: Lock GToken & Register Community
  const handleRegisterCommunity = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      if (!communityName.trim()) {
        throw new Error("Please enter a community name");
      }

      const lockAmountWei = ethers.parseEther(lockAmount);
      if (lockAmountWei <= 0n) {
        throw new Error("Lock amount must be greater than 0");
      }

      // Check GToken balance
      const gTokenBalance = ethers.parseEther(walletStatus.gTokenBalance);
      if (gTokenBalance < lockAmountWei) {
        throw new Error(`Insufficient GToken balance. You have ${walletStatus.gTokenBalance} GToken, need ${lockAmount} GToken`);
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Step 1: Approve stGToken spending
      console.log("📝 Approving stGToken spending...");
      const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, ERC20_ABI, signer);

      const currentAllowance = await staking.allowance(walletStatus.address, REGISTRY_ADDRESS);
      if (currentAllowance < lockAmountWei) {
        const approveTx = await staking.approve(REGISTRY_ADDRESS, lockAmountWei);
        console.log("⏳ Waiting for approval confirmation...");
        await approveTx.wait();
        console.log("✅ Approval confirmed");
      }

      // Step 2: Register community
      console.log("📝 Registering community...");
      const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_1ABI, signer);

      const profile = {
        name: communityName.trim(),
        ensName: "",
        description: "",
        website: "",
        logoURI: "",
        twitterHandle: "",
        githubOrg: "",
        telegramGroup: "",
        xPNTsToken: ethers.ZeroAddress, // Will be set later in Step 4
        supportedSBTs: [],
        mode: 0, // Will be updated based on final selection
        nodeType: 0, // Will be updated based on final selection
        paymasterAddress: ethers.ZeroAddress, // Will be set later
        community: walletStatus.address,
        registeredAt: 0,
        lastUpdatedAt: 0,
        isActive: true,
        memberCount: 0,
        allowPermissionlessMint: true,
      };

      const tx = await registry.registerCommunity(profile, lockAmountWei);
      setRegistryTxHash(tx.hash);
      console.log("⏳ Waiting for registration confirmation...");

      await tx.wait();
      console.log("✅ Community registered successfully!");

      setCommunityAddress(walletStatus.address);
      setIsAlreadyRegistered(true);

      // Auto-advance to next substep
      setCurrentSubstep(RegistrationStep.BindMySBT);
    } catch (err: any) {
      console.error("❌ Registration failed:", err);
      setError(err?.message || "Failed to register community");
    } finally {
      setIsLoading(false);
    }
  };

  // Substep 2: Bind MySBT Contract
  const handleBindMySBT = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      if (!isAlreadyRegistered) {
        throw new Error("Please register your community first");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_1ABI, signer);

      console.log("📝 Binding MySBT contract...");
      const tx = await registry.bindSBTToCommunity(MYSBT_ADDRESS);
      setMySBTBindTxHash(tx.hash);
      console.log("⏳ Waiting for binding confirmation...");

      await tx.wait();
      console.log("✅ MySBT bound successfully!");

      setMySBTBound(true);
      setCurrentSubstep(RegistrationStep.Complete);
    } catch (err: any) {
      console.error("❌ MySBT binding failed:", err);
      setError(err?.message || "Failed to bind MySBT contract");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete and proceed
  const handleComplete = () => {
    if (!isAlreadyRegistered || !mySBTBound) {
      setError("Please complete both substeps before proceeding");
      return;
    }

    onNext({
      communityAddress,
      registryTxHash,
      mySBTBound,
      mySBTBindTxHash,
    });
  };

  return (
    <div className="step2-register-community">
      {/* Header */}
      <div className="step-header">
        <h2>{t('wizard.step2.title', 'Register Your Community')}</h2>
        <p className="subtitle">
          {t('wizard.step2.subtitle', 'Lock GToken and register your community, then bind MySBT contract')}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="substep-progress">
        <div className={`substep-item ${currentSubstep === RegistrationStep.LockAndRegister ? 'active' : currentSubstep > RegistrationStep.LockAndRegister ? 'completed' : ''}`}>
          <div className="substep-number">1</div>
          <div className="substep-label">Lock & Register</div>
        </div>
        <div className="substep-line"></div>
        <div className={`substep-item ${currentSubstep === RegistrationStep.BindMySBT ? 'active' : currentSubstep > RegistrationStep.BindMySBT ? 'completed' : ''}`}>
          <div className="substep-number">2</div>
          <div className="substep-label">Bind MySBT</div>
        </div>
        <div className="substep-line"></div>
        <div className={`substep-item ${currentSubstep === RegistrationStep.Complete ? 'active' : ''}`}>
          <div className="substep-number">✓</div>
          <div className="substep-label">Complete</div>
        </div>
      </div>

      {/* Substep Content */}
      <div className="substep-content">
        {/* Substep 1: Lock & Register */}
        {currentSubstep === RegistrationStep.LockAndRegister && (
          <div className="substep-panel">
            <h3>📝 Lock GToken & Register Community</h3>
            <p className="description">
              Lock GToken to the Registry contract to register your community. Locked tokens serve as
              community credentials and can be unstaked later.
            </p>

            <div className="form-section">
              <div className="info-card">
                <div className="info-row">
                  <span className="label">Your Wallet:</span>
                  <span className="value mono">{walletStatus.address.slice(0, 10)}...{walletStatus.address.slice(-8)}</span>
                </div>
                <div className="info-row">
                  <span className="label">GToken Balance:</span>
                  <span className="value">{parseFloat(walletStatus.gTokenBalance).toFixed(2)} GToken</span>
                </div>
                <div className="info-row">
                  <span className="label">Community Name:</span>
                  <span className="value">{communityName || "(Not set)"}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Lock Amount (GToken) *</label>
                <input
                  type="number"
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                  placeholder="10"
                  min="1"
                  step="1"
                  disabled={isAlreadyRegistered}
                />
                <small>Minimum 10 GToken recommended for community registration</small>
              </div>

              {isAlreadyRegistered ? (
                <div className="success-box">
                  <p>✅ Community already registered!</p>
                  {registryTxHash && (
                    <a href={getExplorerLink(registryTxHash, 'tx')} target="_blank" rel="noopener noreferrer">
                      View Transaction →
                    </a>
                  )}
                </div>
              ) : (
                <button
                  className="action-button primary"
                  onClick={handleRegisterCommunity}
                  disabled={isLoading || !communityName}
                >
                  {isLoading ? "Registering..." : "Lock & Register Community"}
                </button>
              )}

              {registryTxHash && (
                <div className="tx-info">
                  <span>Transaction:</span>
                  <a href={getExplorerLink(registryTxHash, 'tx')} target="_blank" rel="noopener noreferrer">
                    {registryTxHash.slice(0, 10)}...{registryTxHash.slice(-8)} ↗
                  </a>
                </div>
              )}

              {isAlreadyRegistered && (
                <button
                  className="action-button secondary"
                  onClick={() => setCurrentSubstep(RegistrationStep.BindMySBT)}
                >
                  Continue to Bind MySBT →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Substep 2: Bind MySBT */}
        {currentSubstep === RegistrationStep.BindMySBT && (
          <div className="substep-panel">
            <h3>🔗 Bind MySBT Contract</h3>
            <p className="description">
              Bind the global MySBT contract to your community. This allows community members to mint
              and manage their Soul Bound Tokens.
            </p>

            <div className="form-section">
              <div className="info-card">
                <div className="info-row">
                  <span className="label">Community Address:</span>
                  <span className="value mono">{communityAddress.slice(0, 10)}...{communityAddress.slice(-8)}</span>
                </div>
                <div className="info-row">
                  <span className="label">MySBT Contract:</span>
                  <a href={getExplorerLink(MYSBT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="value mono">
                    {MYSBT_ADDRESS.slice(0, 10)}...{MYSBT_ADDRESS.slice(-8)} ↗
                  </a>
                </div>
              </div>

              {mySBTBound ? (
                <div className="success-box">
                  <p>✅ MySBT contract bound successfully!</p>
                  {mySBTBindTxHash && (
                    <a href={getExplorerLink(mySBTBindTxHash, 'tx')} target="_blank" rel="noopener noreferrer">
                      View Transaction →
                    </a>
                  )}
                </div>
              ) : (
                <button
                  className="action-button primary"
                  onClick={handleBindMySBT}
                  disabled={isLoading}
                >
                  {isLoading ? "Binding..." : "Bind MySBT Contract"}
                </button>
              )}

              {mySBTBindTxHash && (
                <div className="tx-info">
                  <span>Transaction:</span>
                  <a href={getExplorerLink(mySBTBindTxHash, 'tx')} target="_blank" rel="noopener noreferrer">
                    {mySBTBindTxHash.slice(0, 10)}...{mySBTBindTxHash.slice(-8)} ↗
                  </a>
                </div>
              )}

              {mySBTBound && (
                <button
                  className="action-button secondary"
                  onClick={() => setCurrentSubstep(RegistrationStep.Complete)}
                >
                  Continue to Summary →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Substep 3: Complete */}
        {currentSubstep === RegistrationStep.Complete && (
          <div className="substep-panel">
            <h3>✅ Registration Complete</h3>
            <p className="description">
              Your community has been successfully registered and MySBT contract is bound!
            </p>

            <div className="form-section">
              <div className="success-summary">
                <div className="summary-item">
                  <span className="icon">📝</span>
                  <div className="content">
                    <strong>Community Registered</strong>
                    <p>{communityName}</p>
                    {registryTxHash && (
                      <a href={getExplorerLink(registryTxHash, 'tx')} target="_blank" rel="noopener noreferrer">
                        View Transaction ↗
                      </a>
                    )}
                  </div>
                </div>

                <div className="summary-item">
                  <span className="icon">🔗</span>
                  <div className="content">
                    <strong>MySBT Bound</strong>
                    <p>{MYSBT_ADDRESS.slice(0, 10)}...{MYSBT_ADDRESS.slice(-8)}</p>
                    {mySBTBindTxHash && (
                      <a href={getExplorerLink(mySBTBindTxHash, 'tx')} target="_blank" rel="noopener noreferrer">
                        View Transaction ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="action-button primary"
                onClick={handleComplete}
              >
                Continue to Next Step →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="step-actions">
        <button
          className="action-button outline"
          onClick={onBack}
          disabled={isLoading}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
