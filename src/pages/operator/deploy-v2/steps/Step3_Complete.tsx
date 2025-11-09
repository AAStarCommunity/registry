/**
 * Step 3: Deployment Complete
 *
 * Display completion status and next steps
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import { type ResourceStatus, type StakeMode } from "../utils/resourceChecker";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import "./Step3_Complete.css";

export interface Step3Props {
  mode: StakeMode;
  resources: ResourceStatus;
  onRestart: () => void;
}

export function Step3_Complete({ mode, resources, onRestart }: Step3Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const networkConfig = getCurrentNetworkConfig();
  const mySBTAddress = networkConfig.contracts.mySBT;
  const [communityAddress, setCommunityAddress] = useState<string>("");

  // AOA+ SuperPaymaster registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationError, setRegistrationError] = useState<string>("");
  const [superPaymasterInfo, setSuperPaymasterInfo] = useState<{
    stGTokenLocked: string;
    aPNTsBalance: string;
    reputationLevel: number;
    treasury: string;
  } | null>(null);

  // Registry Paymaster registration state
  const [isRegistryPaymasterSet, setIsRegistryPaymasterSet] = useState(false);
  const [isRegisteringPaymaster, setIsRegisteringPaymaster] = useState(false);
  const [paymasterRegError, setPaymasterRegError] = useState<string>("");

  // Get current wallet address (community owner)
  useEffect(() => {
    const getAddress = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts && accounts.length > 0) {
            setCommunityAddress(accounts[0]);
          }
        } catch (err) {
          console.error("Failed to get wallet address:", err);
        }
      }
    };
    getAddress();
  }, []);

  const getExplorerLink = (address: string): string => {
    return `https://sepolia.etherscan.io/address/${address}`;
  };

  // Check if already registered in SuperPaymaster (AOA+ mode)
  const checkSuperPaymasterRegistration = async (address: string) => {
    if (mode !== "aoa+") return false;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const superPaymasterAddress = networkConfig.contracts.superPaymasterV2;

      // Use minimal ABI to avoid decoding errors with unregistered accounts
      // We only need stakedAt to check if registered
      const abi = [
        "function accounts(address) external view returns (uint256, uint256 stakedAt)"
      ];

      const superPaymaster = new ethers.Contract(superPaymasterAddress, abi, provider);

      try {
        const [, stakedAt] = await superPaymaster.accounts(address);

        // stakedAt > 0 means registered
        if (stakedAt > 0n) {
          // Get full account info with complete ABI (returns OperatorAccount struct/tuple)
          const fullABI = [
            "function accounts(address) external view returns (tuple(uint256 stGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused))"
          ];
          const fullContract = new ethers.Contract(superPaymasterAddress, fullABI, provider);
          const account = await fullContract.accounts(address);

          setIsRegistered(true);
          setSuperPaymasterInfo({
            stGTokenLocked: ethers.formatEther(account.stGTokenLocked || account[0]),
            aPNTsBalance: ethers.formatEther(account.aPNTsBalance || account[2]),
            reputationLevel: Number(account.reputationLevel || account[13]),
            treasury: account.treasury || account[8],
          });
          return true;
        }

        // Not registered (stakedAt == 0)
        setIsRegistered(false);
        setSuperPaymasterInfo(null);
        return false;
      } catch (decodeError) {
        // Decode error likely means not registered (returns default values)
        console.log("Account not registered in SuperPaymaster (decode error)");
        setIsRegistered(false);
        setSuperPaymasterInfo(null);
        return false;
      }
    } catch (err) {
      console.error("Failed to check SuperPaymaster registration:", err);
      setIsRegistered(false);
      setSuperPaymasterInfo(null);
      return false;
    }
  };

  // Register to SuperPaymaster (AOA+ mode)
  const registerToSuperPaymaster = async () => {
    if (!communityAddress || mode !== "aoa+") return;

    setIsRegistering(true);
    setRegistrationError("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const superPaymasterAddress = networkConfig.contracts.superPaymasterV2;
      const gTokenStakingAddress = networkConfig.contracts.gTokenStaking;
      const aPNTsAddress = networkConfig.contracts.aPNTs;

      // ABIs
      const superPaymasterABI = [
        "function registerOperator(uint256 stGTokenAmount, address[] memory supportedSBTs, address xPNTsToken, address treasury) external",
        "function depositAPNTs(uint256 amount) external"
      ];
      const erc20ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const stakingABI = ["function stake(uint256 amount) external returns (uint256 shares)"];

      const superPaymaster = new ethers.Contract(superPaymasterAddress, superPaymasterABI, signer);
      const gToken = new ethers.Contract(networkConfig.contracts.gToken, erc20ABI, signer);
      const gTokenStaking = new ethers.Contract(gTokenStakingAddress, stakingABI, signer);
      const aPNTs = new ethers.Contract(aPNTsAddress, erc20ABI, signer);

      // Parameters
      const stakeAmount = ethers.parseEther("50"); // 50 GT
      const initialAPNTs = ethers.parseEther("1000"); // 1000 aPNTs
      const supportedSBTs = [mySBTAddress];
      const xPNTsToken = resources.xPNTsAddress || ethers.ZeroAddress;
      const treasury = communityAddress;

      console.log("=== Starting SuperPaymaster Registration ===");

      // Step 0: Stake GT to get stGToken shares (CRITICAL STEP!)
      console.log("Step 0: Approving GT for staking...");
      const approveGTokenTx = await gToken.approve(gTokenStakingAddress, stakeAmount);
      await approveGTokenTx.wait();
      console.log("✅ GT approved for staking");

      console.log("Step 0: Staking", ethers.formatEther(stakeAmount), "GT to receive stGToken...");
      const stakeTx = await gTokenStaking.stake(stakeAmount);
      await stakeTx.wait();
      console.log("✅ Staked", ethers.formatEther(stakeAmount), "GT, received stGToken shares");

      // Step 1: Register Operator (will lock stGToken shares internally)
      console.log("Step 1: Registering operator...");
      const registerTx = await superPaymaster.registerOperator(
        stakeAmount,
        supportedSBTs,
        xPNTsToken,
        treasury
      );
      await registerTx.wait();
      console.log("✅ Operator registered");

      // Step 2: Approve aPNTs
      console.log("Step 2: Approving aPNTs...");
      const approveTx2 = await aPNTs.approve(superPaymasterAddress, initialAPNTs);
      await approveTx2.wait();
      console.log("✅ aPNTs approved");

      // Step 3: Deposit aPNTs
      console.log("Step 3: Depositing aPNTs...");
      const depositTx = await superPaymaster.depositAPNTs(initialAPNTs);
      await depositTx.wait();
      console.log("✅ aPNTs deposited");

      console.log("=== Registration Complete ===");

      // Refresh SuperPaymaster info
      await checkSuperPaymasterRegistration(communityAddress);
      setIsRegistering(false);
    } catch (err: any) {
      console.error("Failed to register to SuperPaymaster:", err);

      // Handle specific errors
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setRegistrationError("Transaction cancelled by user. Please try again when ready.");
      } else if (err.data?.startsWith("0x45ed80e9") || err.message?.includes("AlreadyRegistered")) {
        // Already registered - this is actually success!
        console.log("Already registered in SuperPaymaster");
        setIsRegistered(true);
        setRegistrationError("");
        setIsRegistering(false);
        // Refresh to get account info
        await checkSuperPaymasterRegistration(communityAddress);
        return; // Early return, don't set error
      } else if (err.data === "0xc52a9bd3" || err.message?.includes("InvalidConfiguration")) {
        setRegistrationError(
          "SuperPaymaster contract not configured. The aPNTs token address needs to be set by the contract owner. Please contact support."
        );
      } else if (err.message?.includes("insufficient funds")) {
        setRegistrationError("Insufficient balance. Please ensure you have enough GT and aPNTs.");
      } else if (err.data === "0xadb9e043" || err.message?.includes("InsufficientAvailableBalance")) {
        setRegistrationError("Insufficient stGToken balance. Please ensure you have staked enough GT first.");
      } else {
        setRegistrationError(err.message || "Registration failed. Please try again.");
      }

      setIsRegistering(false);
    }
  };

  // Check if Paymaster is registered in Registry
  const checkRegistryPaymaster = async (address: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registryAddress = networkConfig.contracts.registry;

      // Correct ABI: getCommunityProfile returns a tuple (CommunityProfile struct)
      const registryABI = [
        "function getCommunityProfile(address) external view returns (tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint))"
      ];

      const registry = new ethers.Contract(registryAddress, registryABI, provider);

      try {
        const profile = await registry.getCommunityProfile(address);
        // profile is now a tuple/struct with named properties
        const paymasterAddress = profile.paymasterAddress || profile[5];

        // Check if paymaster is set (not zero address)
        const isSet = paymasterAddress !== ethers.ZeroAddress;
        setIsRegistryPaymasterSet(isSet);

        return isSet;
      } catch (error) {
        // Community not registered in Registry
        console.log("Community not registered in Registry:", error);
        setIsRegistryPaymasterSet(false);
        return false;
      }
    } catch (err) {
      console.error("Failed to check Registry paymaster:", err);
      setIsRegistryPaymasterSet(false);
      return false;
    }
  };

  // Register Paymaster to Registry
  const registerPaymasterToRegistry = async () => {
    if (!communityAddress) return;

    setIsRegisteringPaymaster(true);
    setPaymasterRegError("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registryAddress = networkConfig.contracts.registry;

      // Get current community profile first (returns a tuple/struct)
      const registryReadABI = [
        "function getCommunityProfile(address) external view returns (tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint))"
      ];
      const registryRead = new ethers.Contract(registryAddress, registryReadABI, provider);
      const currentProfile = await registryRead.getCommunityProfile(communityAddress);

      // Determine paymaster address based on mode
      let paymasterAddress: string;
      if (mode === "aoa") {
        // AOA mode: Use deployed Paymaster address
        paymasterAddress = resources.paymasterAddress || ethers.ZeroAddress;
      } else {
        // AOA+ mode: Use SuperPaymaster contract address
        paymasterAddress = networkConfig.contracts.superPaymasterV2;
      }

      if (paymasterAddress === ethers.ZeroAddress) {
        setPaymasterRegError("Paymaster not deployed yet. Please deploy first.");
        setIsRegisteringPaymaster(false);
        return;
      }

      // Update profile with new paymaster address
      const registryWriteABI = [
        "function updateCommunityProfile(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint) profile) external"
      ];
      const registryWrite = new ethers.Contract(registryAddress, registryWriteABI, signer);

      // Construct updated profile (keep existing data, only update paymasterAddress)
      // Access fields by name (preferred) or by index (fallback)
      const updatedProfile = {
        name: currentProfile.name || currentProfile[0],
        ensName: currentProfile.ensName || currentProfile[1],
        xPNTsToken: currentProfile.xPNTsToken || currentProfile[2],
        supportedSBTs: currentProfile.supportedSBTs || currentProfile[3],
        nodeType: currentProfile.nodeType ?? currentProfile[4],
        paymasterAddress: paymasterAddress, // Update this field
        community: currentProfile.community || currentProfile[6],
        registeredAt: currentProfile.registeredAt || currentProfile[7],
        lastUpdatedAt: currentProfile.lastUpdatedAt || currentProfile[8],
        isActive: currentProfile.isActive ?? currentProfile[9],
        allowPermissionlessMint: currentProfile.allowPermissionlessMint ?? currentProfile[10]
      };

      console.log("Registering Paymaster to Registry:", paymasterAddress);
      const tx = await registryWrite.updateCommunityProfile(updatedProfile);
      await tx.wait();

      console.log("Paymaster registered to Registry successfully!");
      setIsRegistryPaymasterSet(true);
      setIsRegisteringPaymaster(false);
    } catch (err: any) {
      console.error("Failed to register Paymaster to Registry:", err);

      if (err.message?.includes("CommunityNotRegistered")) {
        setPaymasterRegError("Community not registered in Registry. Please register your community first at /operator/register");
      } else {
        setPaymasterRegError(err.message || "Registration failed. Please try again.");
      }

      setIsRegisteringPaymaster(false);
    }
  };

  // Check SuperPaymaster registration on mount (AOA+ mode only)
  useEffect(() => {
    if (mode === "aoa+" && communityAddress) {
      // Only check registration status, do NOT auto-register
      // User will manually click the register button if needed
      checkSuperPaymasterRegistration(communityAddress);
      checkRegistryPaymaster(communityAddress);
    }
  }, [mode, communityAddress]);

  // Check Registry paymaster registration for both modes
  useEffect(() => {
    if (communityAddress) {
      checkRegistryPaymaster(communityAddress);
    }
  }, [communityAddress]);

  return (
    <div className="step3-complete">
      <div className="completion-header">
        <div className="success-icon">🎉</div>
        <h2>{t('step3Complete.header.title')}</h2>
        <p className="subtitle">
          {t('step3Complete.header.subtitle')} {mode === "aoa" ? t('step3Complete.header.aoaMode') : t('step3Complete.header.aoaPlusMode')}
        </p>
      </div>

      {/* Deployment Summary */}
      <div className="deployment-summary">
        <h3>{t('step3Complete.summary.title')}</h3>

        <div className="summary-grid">
          {/* Community */}
          <div className="summary-card">
            <div className="card-icon">🏛️</div>
            <div className="card-content">
              <h4>{t('step3Complete.summary.community.title')}</h4>
              <p className="card-value">{resources.communityName}</p>
              <p className="card-detail">
                {t('step3Complete.summary.community.registered')} {new Date(resources.communityRegisteredAt! * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* xPNTs Token */}
          <div className="summary-card">
            <div className="card-icon">💎</div>
            <div className="card-content">
              <h4>xPNTs Token</h4>
              <p className="card-value mono">{resources.xPNTsAddress?.slice(0, 10)}...</p>
              {resources.xPNTsExchangeRate && (
                <p className="card-detail">
                  {t('step3Complete.summary.xpnts.rate')} {resources.xPNTsExchangeRate} {t('step3Complete.summary.xpnts.rateSuffix')}
                </p>
              )}
              <a
                href={getExplorerLink(resources.xPNTsAddress!)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                {t('step3Complete.summary.xpnts.viewExplorer')}
              </a>
            </div>
          </div>

          {/* Paymaster (AOA mode only) */}
          {mode === "aoa" && resources.paymasterAddress && (
            <div className="summary-card highlight">
              <div className="card-icon">🚀</div>
              <div className="card-content">
                <h4>Paymaster</h4>
                <p className="card-value mono">{resources.paymasterAddress.slice(0, 10)}...</p>
                <p className="card-detail">
                  {t('step3Complete.summary.paymaster.sbtBound')} {resources.hasSBTBinding ? "✅" : "❌"}
                </p>
                <a
                  href={getExplorerLink(resources.paymasterAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  {t('step3Complete.summary.paymaster.viewExplorer')}
                </a>
              </div>
            </div>
          )}

          {/* MySBT (AOA mode only) */}
          {mode === "aoa" && (
            <div className="summary-card">
              <div className="card-icon">🎫</div>
              <div className="card-content">
                <h4>MySBT Contract</h4>
                <p className="card-value mono">{mySBTAddress.slice(0, 10)}...</p>
                <p className="card-detail">
                  Binding Status: {resources.hasSBTBinding ? "✅ Bound" : "❌ Not Bound"}
                </p>
                <a
                  href={getExplorerLink(mySBTAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View on Etherscan
                </a>
              </div>
            </div>
          )}

          {/* Balances */}
          <div className="summary-card">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <h4>{t('step3Complete.summary.balances.title')}</h4>
              <p className="card-detail">{t('step3Complete.summary.balances.gtoken')} {resources.gTokenBalance} GT</p>
              {mode === "aoa+" && (
                <p className="card-detail">{t('step3Complete.summary.balances.apnts')} {resources.aPNTsBalance} aPNTs</p>
              )}
              <p className="card-detail">{t('step3Complete.summary.balances.eth')} {resources.ethBalance} ETH</p>
            </div>
          </div>

          {/* SuperPaymaster Deployment & Registration (AOA+ mode) */}
          {mode === "aoa+" && (
            <div className="summary-card highlight">
              <div className="card-icon">🌟</div>
              <div className="card-content">
                <h4>SuperPaymaster Management</h4>

                {/* Deployment Status */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p className="card-detail" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {isRegistered ? "✅" : "⏸️"} Deployment Status: {isRegistered ? "Deployed" : "Not Deployed"}
                  </p>
                  {isRegistered && superPaymasterInfo ? (
                    <>
                      <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Staked: {superPaymasterInfo.stGTokenLocked} stGToken
                      </p>
                      <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        aPNTs Balance: {superPaymasterInfo.aPNTsBalance}
                      </p>
                      <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Reputation: Level {superPaymasterInfo.reputationLevel}/12
                      </p>
                    </>
                  ) : (
                    <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Operator not registered in SuperPaymaster contract
                    </p>
                  )}
                </div>

                {/* Registry Status */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <p className="card-detail" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    {isRegistryPaymasterSet ? "✅" : "⏸️"} Registry Status: {isRegistryPaymasterSet ? "Registered" : "Not Registered"}
                  </p>
                  <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {isRegistryPaymasterSet
                      ? "SuperPaymaster linked to your community in Registry"
                      : "SuperPaymaster not linked to Registry yet"}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ marginTop: '1rem' }}>
                  {/* Deploy to SuperPaymaster */}
                  {!isRegistered && (
                    <>
                      {isRegistering ? (
                        <p className="card-detail">⏳ Deploying to SuperPaymaster...</p>
                      ) : registrationError ? (
                        <>
                          <p className="card-detail error" style={{ marginBottom: '0.5rem' }}>❌ Deployment failed: {registrationError}</p>
                          <button
                            onClick={registerToSuperPaymaster}
                            className="retry-btn"
                            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Retry Deployment
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={registerToSuperPaymaster}
                          className="register-btn"
                          disabled={isRegistering}
                          style={{
                            padding: '0.75rem 1.25rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isRegistering ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '1rem',
                            opacity: isRegistering ? 0.6 : 1,
                            width: '100%'
                          }}
                        >
                          {isRegistering ? '⏳ Deploying...' : '🚀 Deploy to SuperPaymaster'}
                        </button>
                      )}
                    </>
                  )}

                  {/* Register to Registry */}
                  {isRegistered && !isRegistryPaymasterSet && (
                    <>
                      {isRegisteringPaymaster ? (
                        <p className="card-detail">⏳ Registering to Registry...</p>
                      ) : paymasterRegError ? (
                        <>
                          <p className="card-detail error" style={{ marginBottom: '0.5rem' }}>❌ Registration failed: {paymasterRegError}</p>
                          {!paymasterRegError.includes("Community not registered") ? (
                            <button
                              onClick={registerPaymasterToRegistry}
                              className="retry-btn"
                              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Retry Registration
                            </button>
                          ) : (
                            <a
                              href="/operator/register?returnUrl=/operator/wizard"
                              style={{ display: 'inline-block', padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
                            >
                              Go Register Community
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={registerPaymasterToRegistry}
                          className="register-btn"
                          disabled={isRegisteringPaymaster}
                          style={{
                            padding: '0.75rem 1.25rem',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isRegisteringPaymaster ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '1rem',
                            opacity: isRegisteringPaymaster ? 0.6 : 1,
                            width: '100%'
                          }}
                        >
                          {isRegisteringPaymaster ? '⏳ Registering...' : '📝 Register to Registry'}
                        </button>
                      )}
                    </>
                  )}

                  {/* All Complete - Show Links */}
                  {isRegistered && isRegistryPaymasterSet && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p className="card-detail" style={{ color: '#10b981', fontWeight: 600, fontSize: '1rem' }}>
                        ✅ All Setup Complete!
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <a
                          href={getExplorerLink(networkConfig.contracts.superPaymasterV2)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: '1',
                            minWidth: '140px',
                            padding: '0.75rem 1rem',
                            background: '#f3f4f6',
                            color: '#1f2937',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            textAlign: 'center',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          📜 View Contract
                        </a>
                        <a
                          href="/operator/superpaymaster"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: '1',
                            minWidth: '140px',
                            padding: '0.75rem 1rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}
                        >
                          🎛️ Manage Account
                        </a>
                        <a
                          href={`/explorer/community/${communityAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: '1',
                            minWidth: '140px',
                            padding: '0.75rem 1rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}
                        >
                          🏛️ View Community
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Registry Paymaster Registration (AOA mode only) */}
          {mode === "aoa" && (
            <div className="summary-card highlight">
              <div className="card-icon">📝</div>
              <div className="card-content">
                <h4>Registry Paymaster Registration</h4>
                {isRegisteringPaymaster ? (
                  <p className="card-detail">⏳ Registering Paymaster to Registry...</p>
                ) : paymasterRegError ? (
                  <>
                    <p className="card-detail error">❌ Registration failed</p>
                    <p className="card-detail">{paymasterRegError}</p>
                    {!paymasterRegError.includes("Community not registered") && (
                      <button
                        onClick={registerPaymasterToRegistry}
                        className="retry-btn"
                        style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Retry Registration
                      </button>
                    )}
                    {paymasterRegError.includes("Community not registered") && (
                      <a
                        href="/operator/register?returnUrl=/operator/wizard"
                        style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Go Register Community
                      </a>
                    )}
                  </>
                ) : isRegistryPaymasterSet ? (
                  <>
                    <p className="card-detail">
                      ✅ Paymaster registered in Registry
                    </p>
                    <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Your AOA Paymaster is now linked to your community in the Registry.
                    </p>
                    <a
                      href={`/explorer/community/${communityAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="explorer-link"
                      style={{ marginTop: '0.5rem', display: 'inline-block', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      🏛️ View Community Profile
                    </a>
                  </>
                ) : (
                  <>
                    <p className="card-detail">⏸️ Paymaster not registered to Registry yet</p>
                    <p className="card-detail" style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Register your deployed AOA Paymaster to your community profile in Registry.
                    </p>
                    {!resources.paymasterAddress && (
                      <p className="card-detail" style={{ fontSize: '0.875rem', color: '#f59e0b', marginBottom: '0.5rem' }}>
                        ⚠️ Please deploy AOA Paymaster first.
                      </p>
                    )}
                    {resources.paymasterAddress && (
                      <button
                        onClick={registerPaymasterToRegistry}
                        className="register-btn"
                        disabled={isRegisteringPaymaster}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isRegisteringPaymaster ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          opacity: isRegisteringPaymaster ? 0.6 : 1
                        }}
                      >
                        {isRegisteringPaymaster ? '⏳ Registering...' : '📝 Register Paymaster to Registry'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Recommendation */}
      {mode === "aoa" && (
        <div className="security-recommendation">
          <div className="recommendation-header">
            <span className="icon">🔐</span>
            <h3>Security Recommendation: Transfer to Multisig Account</h3>
          </div>
          <div className="recommendation-content">
            <p>
              For production use, we strongly recommend transferring community ownership to a
              <strong> Gnosis Safe multisig wallet</strong> instead of using a single EOA account.
            </p>
            <div className="recommendation-benefits">
              <div className="benefit-item">
                <span className="check">✅</span>
                <span>Prevent single point of failure (lost private key)</span>
              </div>
              <div className="benefit-item">
                <span className="check">✅</span>
                <span>Require multiple approvals for critical operations</span>
              </div>
              <div className="benefit-item">
                <span className="check">✅</span>
                <span>Enable team-based governance</span>
              </div>
            </div>
            <div className="recommendation-actions">
              <a
                href="https://app.safe.global/new-safe/create"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-safe"
              >
                🛡️ Create Gnosis Safe Multisig ↗
              </a>
              <a
                href={communityAddress ? `/explorer/community/${communityAddress}` : "/explorer"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-transfer"
              >
                🔄 Manage Community (Transfer Ownership) ↗
              </a>
            </div>
            <div className="recommendation-note">
              <strong>Note:</strong> After creating a Safe multisig wallet:
              <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                <li>Click "Manage Community" to open your community management page</li>
                <li>Connect your current wallet (owner account)</li>
                <li>Use the "Edit" button on "Owner Address" to transfer ownership to your Safe wallet address</li>
                <li>The page supports both MetaMask and Safe App modes</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Security Recommendation (AOA+ Mode) */}
      {mode === "aoa+" && (
        <div className="security-recommendation">
          <div className="recommendation-header">
            <span className="icon">🔐</span>
            <h3>Security Recommendation: Create Community Multisig Vault</h3>
          </div>
          <div className="recommendation-content">
            <p>
              For production use, we recommend creating a <strong>Gnosis Safe multisig wallet</strong> to manage your community resources securely.
            </p>
            <div className="recommendation-benefits">
              <div className="benefit-item">
                <span className="check">✅</span>
                <span>Prevent single point of failure (lost private key)</span>
              </div>
              <div className="benefit-item">
                <span className="check">✅</span>
                <span>Require multiple approvals for critical operations</span>
              </div>
              <div className="benefit-item">
                <span className="check">✅</span>
                <span>Enable team-based governance</span>
              </div>
            </div>
            <div className="recommendation-actions">
              <a
                href="https://app.safe.global/new-safe/create"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-safe"
              >
                🛡️ Create Gnosis Safe Multisig ↗
              </a>
              <a
                href={communityAddress ? `/explorer/community/${communityAddress}` : "/explorer"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-transfer"
              >
                🔄 Manage Community (Transfer Ownership) ↗
              </a>
            </div>
            <div className="recommendation-note">
              <strong>Note:</strong> After creating a Safe multisig wallet:
              <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                <li>Click "Manage Community" to open your community management page</li>
                <li>Connect your current wallet (owner account)</li>
                <li>Use the "Edit" button on "Owner Address" to transfer ownership to your Safe wallet address</li>
                <li>The page supports both MetaMask and Safe App modes</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="next-steps">
        <h3>{t('step3Complete.nextSteps.title')}</h3>
        <div className="steps-list">
          {mode === "aoa" ? (
            <>
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>更新 Registry 社区信息</h4>
                  <p>将新部署的 Paymaster 地址更新到 Registry，确保社区信息完整</p>
                  <a
                    href="/register-community?returnUrl=/operator/wizard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    去更新 Registry ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoa.step1.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoa.step1.description')}</p>
                  <a
                    href={`/operator/manage?address=${resources.paymasterAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    {t('step3Complete.nextSteps.aoa.step1.action')} ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoa.step2.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoa.step2.description')}</p>
                  <a
                    href="https://demo.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    {t('step3Complete.nextSteps.aoa.step2.action')} ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoa.step3.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoa.step3.description')}</p>
                  <a
                    href="/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    {t('step3Complete.nextSteps.aoa.step3.action')} ↗
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoaPlus.step1.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoaPlus.step1.description')}</p>
                  <a
                    href="/get-pnts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    {t('step3Complete.nextSteps.aoaPlus.step1.action')} ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoaPlus.step2.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoaPlus.step2.description')}</p>
                  <a
                    href="https://demo.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    {t('step3Complete.nextSteps.aoaPlus.step2.action')} ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoaPlus.step3.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoaPlus.step3.description')}</p>
                  <a
                    href="/explorer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    {t('step3Complete.nextSteps.aoaPlus.step3.action')} ↗
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="completion-actions">
        <button className="btn-secondary" onClick={onRestart}>
          {t('step3Complete.actions.restart')}
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate("/")}
        >
          {t('step3Complete.actions.goHome')}
        </button>
      </div>
    </div>
  );
}
