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

      // Simplified ABI for accounts function
      const abi = [
        "function accounts(address) external view returns (uint256 stGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused)"
      ];

      const superPaymaster = new ethers.Contract(superPaymasterAddress, abi, provider);
      const account = await superPaymaster.accounts(address);

      // stakedAt > 0 means registered
      if (account.stakedAt > 0n) {
        setIsRegistered(true);
        setSuperPaymasterInfo({
          stGTokenLocked: ethers.formatEther(account.stGTokenLocked),
          aPNTsBalance: ethers.formatEther(account.aPNTsBalance),
          reputationLevel: Number(account.reputationLevel),
          treasury: account.treasury,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to check SuperPaymaster registration:", err);
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

      const superPaymaster = new ethers.Contract(superPaymasterAddress, superPaymasterABI, signer);
      const stGToken = new ethers.Contract(networkConfig.contracts.gToken, erc20ABI, signer);
      const aPNTs = new ethers.Contract(aPNTsAddress, erc20ABI, signer);

      // Parameters
      const stakeAmount = ethers.parseEther("50"); // 50 GT
      const initialAPNTs = ethers.parseEther("1000"); // 1000 aPNTs
      const supportedSBTs = [mySBTAddress];
      const xPNTsToken = resources.xPNTsAddress || ethers.ZeroAddress;
      const treasury = communityAddress;

      console.log("=== Starting SuperPaymaster Registration ===");

      // Step 1: Approve stGToken
      console.log("Step 1: Approving stGToken...");
      const approveTx1 = await stGToken.approve(gTokenStakingAddress, stakeAmount);
      await approveTx1.wait();
      console.log("✅ stGToken approved");

      // Step 2: Register Operator
      console.log("Step 2: Registering operator...");
      const registerTx = await superPaymaster.registerOperator(
        stakeAmount,
        supportedSBTs,
        xPNTsToken,
        treasury
      );
      await registerTx.wait();
      console.log("✅ Operator registered");

      // Step 3: Approve aPNTs
      console.log("Step 3: Approving aPNTs...");
      const approveTx2 = await aPNTs.approve(superPaymasterAddress, initialAPNTs);
      await approveTx2.wait();
      console.log("✅ aPNTs approved");

      // Step 4: Deposit aPNTs
      console.log("Step 4: Depositing aPNTs...");
      const depositTx = await superPaymaster.depositAPNTs(initialAPNTs);
      await depositTx.wait();
      console.log("✅ aPNTs deposited");

      console.log("=== Registration Complete ===");

      // Refresh SuperPaymaster info
      await checkSuperPaymasterRegistration(communityAddress);
      setIsRegistering(false);
    } catch (err: any) {
      console.error("Failed to register to SuperPaymaster:", err);
      setRegistrationError(err.message || "Registration failed");
      setIsRegistering(false);
    }
  };

  // Check SuperPaymaster registration on mount (AOA+ mode only)
  useEffect(() => {
    if (mode === "aoa+" && communityAddress) {
      checkSuperPaymasterRegistration(communityAddress).then((registered) => {
        if (!registered && !isRegistering) {
          // Auto-start registration
          registerToSuperPaymaster();
        }
      });
    }
  }, [mode, communityAddress]);

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

          {/* SuperPaymaster Registration (AOA+ mode) */}
          {mode === "aoa+" && (
            <div className="summary-card highlight">
              <div className="card-icon">🌟</div>
              <div className="card-content">
                <h4>SuperPaymaster Registration</h4>
                {isRegistering ? (
                  <p className="card-detail">⏳ Registering to SuperPaymaster...</p>
                ) : registrationError ? (
                  <>
                    <p className="card-detail error">❌ Registration failed</p>
                    <p className="card-detail">{registrationError}</p>
                    <button
                      onClick={registerToSuperPaymaster}
                      className="retry-btn"
                      style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Retry Registration
                    </button>
                  </>
                ) : isRegistered && superPaymasterInfo ? (
                  <>
                    <p className="card-detail">
                      ✅ Registered
                    </p>
                    <p className="card-detail">
                      Staked: {superPaymasterInfo.stGTokenLocked} stGToken
                    </p>
                    <p className="card-detail">
                      aPNTs Balance: {superPaymasterInfo.aPNTsBalance}
                    </p>
                    <p className="card-detail">
                      Reputation Level: {superPaymasterInfo.reputationLevel}/12
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <a
                        href={getExplorerLink(networkConfig.contracts.superPaymasterV2)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View Contract ↗
                      </a>
                      <a
                        href="/operator/superpaymaster"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
                      >
                        🎛️ Manage Account
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="card-detail">⏸️ Checking registration status...</p>
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
