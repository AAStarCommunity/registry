/**
 * Step 2: Resource Check & Guidance
 *
 * Check deployment status and guide users to complete missing resources:
 * - Community registration
 * - xPNTs deployment
 * - MySBT binding (AOA mode only)
 * - Paymaster deployment (AOA mode only)
 * - GToken balance
 * - aPNTs balance (AOA+ mode only)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { checkResources, type ResourceStatus, type StakeMode } from "../utils/resourceChecker";
import { getCurrentNetworkConfig, isTestnet } from "../../../../config/networkConfig";
import "./Step2_ResourceCheck.css";

export interface Step2Props {
  walletAddress: string;
  mode: StakeMode;
  onNext: () => void;
  onBack: () => void;
}

export function Step2_ResourceCheck({ walletAddress, mode, onNext, onBack }: Step2Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const networkConfig = getCurrentNetworkConfig();
  const isTest = isTestnet();
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState<ResourceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check resources on mount
  useEffect(() => {
    checkResourcesStatus();
  }, [walletAddress, mode]);

  const checkResourcesStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await checkResources(walletAddress, mode);
      setResources(status);
    } catch (err: any) {
      console.error("Failed to check resources:", err);
      setError(err?.message || "Failed to check resources");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if all resources are ready
  const areAllResourcesReady = (): boolean => {
    if (!resources) return false;

    if (mode === "aoa") {
      // AOA mode requirements
      return (
        resources.isCommunityRegistered &&
        resources.hasXPNTs &&
        resources.hasPaymaster &&
        resources.hasSBTBinding &&
        resources.hasEnoughGToken &&
        resources.hasEnoughETH
      );
    } else {
      // AOA+ mode requirements
      return (
        resources.isCommunityRegistered &&
        resources.hasXPNTs &&
        resources.hasEnoughGToken &&
        resources.hasEnoughAPNTs &&
        resources.hasEnoughETH
      );
    }
  };

  const handleNavigate = (path: string) => {
    // Navigate with returnUrl to come back to wizard
    navigate(`${path}?returnUrl=/operator/wizard`);
  };

  if (isLoading) {
    return (
      <div className="step2-resource-check">
        <div className="step-header">
          <h2>🔍 {t('step2ResourceCheck.header.checking')}</h2>
          <p className="step-subtitle">{t('step2ResourceCheck.header.checkingSubtitle')}</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('step2ResourceCheck.loading.spinner')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step2-resource-check">
        <div className="step-header">
          <h2>⚠️ {t('step2ResourceCheck.header.failed')}</h2>
          <p className="step-subtitle">{t('step2ResourceCheck.header.failedSubtitle')}</p>
        </div>
        <div className="error-box">
          <p>{error}</p>
          <button className="btn-primary" onClick={checkResourcesStatus}>
            {t('step2ResourceCheck.error.button')}
          </button>
        </div>
        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>
            {t('step2ResourceCheck.actions.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step2-resource-check">
      <div className="step-header">
        <h2>🔍 {t('step2ResourceCheck.header.title')}</h2>
        <p className="step-subtitle">
          {mode === "aoa" ? t('step2ResourceCheck.header.aoaMode') : t('step2ResourceCheck.header.aoaPlusMode')}
        </p>
      </div>

      {/* Resource Status Grid */}
      <div className="resource-grid">
        {/* Community Registration */}
        <div className={`resource-card ${resources?.isCommunityRegistered ? "ready" : "missing"}`}>
          <div className="resource-icon">
            {resources?.isCommunityRegistered ? "✅" : "❌"}
          </div>
          <div className="resource-info">
            <h3>{t('step2ResourceCheck.resources.community.title')}</h3>
            {resources?.isCommunityRegistered ? (
              <p className="status-text success">
                {t('step2ResourceCheck.resources.community.registered')} {resources.communityName}
              </p>
            ) : (
              <>
                <p className="status-text error">{t('step2ResourceCheck.resources.community.notRegistered')}</p>
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/register-community")}
                >
                  {t('step2ResourceCheck.resources.community.action')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* xPNTs Deployment */}
        <div className={`resource-card ${resources?.hasXPNTs ? "ready" : "missing"}`}>
          <div className="resource-icon">
            {resources?.hasXPNTs ? "✅" : "❌"}
          </div>
          <div className="resource-info">
            <h3>{t('step2ResourceCheck.resources.xpnts.title')}</h3>
            {resources?.hasXPNTs ? (
              <>
                <p className="status-text success">{t('step2ResourceCheck.resources.xpnts.deployed')}</p>
                <p className="detail-text">
                  {t('step2ResourceCheck.resources.xpnts.address')} {resources.xPNTsAddress?.slice(0, 10)}...
                </p>
                {resources.xPNTsExchangeRate && (
                  <p className="detail-text">
                    {t('step2ResourceCheck.resources.xpnts.exchangeRate')} {resources.xPNTsExchangeRate} {t('step2ResourceCheck.resources.xpnts.exchangeRateSuffix')}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="status-text error">{t('step2ResourceCheck.resources.xpnts.notDeployed')}</p>
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/get-xpnts")}
                >
                  {t('step2ResourceCheck.resources.xpnts.action')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* AOA Mode: Paymaster & SBT Binding */}
        {mode === "aoa" && (
          <>
            {/* Paymaster Deployment */}
            <div className={`resource-card ${resources?.hasPaymaster ? "ready" : "missing"}`}>
              <div className="resource-icon">
                {resources?.hasPaymaster ? "✅" : "❌"}
              </div>
              <div className="resource-info">
                <h3>{t('step2ResourceCheck.resources.paymaster.title')}</h3>
                {resources?.hasPaymaster ? (
                  <>
                    <p className="status-text success">{t('step2ResourceCheck.resources.paymaster.deployed')}</p>
                    <p className="detail-text">
                      {t('step2ResourceCheck.resources.paymaster.address')} {resources.paymasterAddress?.slice(0, 10)}...
                    </p>
                  </>
                ) : (
                  <>
                    <p className="status-text error">{t('step2ResourceCheck.resources.paymaster.notDeployed')}</p>
                    <button
                      className="action-btn"
                      onClick={() => handleNavigate("/launch-paymaster")}
                    >
                      {t('step2ResourceCheck.resources.paymaster.action')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* MySBT Binding */}
            <div
              className={`resource-card ${
                resources?.hasPaymaster
                  ? resources.hasSBTBinding
                    ? "ready"
                    : "missing"
                  : "disabled"
              }`}
            >
              <div className="resource-icon">
                {!resources?.hasPaymaster
                  ? "⏸️"
                  : resources.hasSBTBinding
                  ? "✅"
                  : "❌"}
              </div>
              <div className="resource-info">
                <h3>{t('step2ResourceCheck.resources.sbt.title')}</h3>
                {!resources?.hasPaymaster ? (
                  <p className="status-text disabled">{t('step2ResourceCheck.resources.sbt.requirePaymaster')}</p>
                ) : resources.hasSBTBinding ? (
                  <p className="status-text success">{t('step2ResourceCheck.resources.sbt.bound')}</p>
                ) : (
                  <>
                    <p className="status-text error">{t('step2ResourceCheck.resources.sbt.notBound')}</p>
                    <button
                      className="action-btn"
                      onClick={() => handleNavigate("/get-sbt")}
                    >
                      {t('step2ResourceCheck.resources.sbt.action')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* GToken Balance */}
        <div className={`resource-card ${resources?.hasEnoughGToken ? "ready" : "missing"}`}>
          <div className="resource-icon">
            {resources?.hasEnoughGToken ? "✅" : "⚠️"}
          </div>
          <div className="resource-info">
            <h3>{t('step2ResourceCheck.resources.gtoken.title')}</h3>
            <p className={`status-text ${resources?.hasEnoughGToken ? "success" : "warning"}`}>
              {t('step2ResourceCheck.resources.gtoken.balance')} {resources?.gTokenBalance} {t('step2ResourceCheck.resources.gtoken.suffix')}
            </p>
            <p className="detail-text">
              {t('step2ResourceCheck.resources.gtoken.required')} {resources?.requiredGToken} {t('step2ResourceCheck.resources.gtoken.suffix')}
            </p>
            {!resources?.hasEnoughGToken && (
              <button
                className="action-btn"
                onClick={() => handleNavigate("/get-gtoken")}
              >
                {t('step2ResourceCheck.resources.gtoken.action')}
              </button>
            )}
          </div>
        </div>

        {/* AOA+ Mode: aPNTs Balance */}
        {mode === "aoa+" && (
          <div className={`resource-card ${resources?.hasEnoughAPNTs ? "ready" : "missing"}`}>
            <div className="resource-icon">
              {resources?.hasEnoughAPNTs ? "✅" : "⚠️"}
            </div>
            <div className="resource-info">
              <h3>{t('step2ResourceCheck.resources.apnts.title')}</h3>
              <p className={`status-text ${resources?.hasEnoughAPNTs ? "success" : "warning"}`}>
                {t('step2ResourceCheck.resources.apnts.balance')} {resources?.aPNTsBalance} {t('step2ResourceCheck.resources.apnts.suffix')}
              </p>
              <p className="detail-text">
                {t('step2ResourceCheck.resources.apnts.required')} {resources?.requiredAPNTs} {t('step2ResourceCheck.resources.apnts.suffix')}
              </p>
              {!resources?.hasEnoughAPNTs && (
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/get-pnts")}
                >
                  {t('step2ResourceCheck.resources.apnts.action')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ETH Balance */}
        <div className={`resource-card ${resources?.hasEnoughETH ? "ready" : "missing"}`}>
          <div className="resource-icon">
            {resources?.hasEnoughETH ? "✅" : "⚠️"}
          </div>
          <div className="resource-info">
            <h3>{t('step2ResourceCheck.resources.eth.title')}</h3>
            <p className={`status-text ${resources?.hasEnoughETH ? "success" : "warning"}`}>
              {t('step2ResourceCheck.resources.eth.balance')} {resources?.ethBalance} {t('step2ResourceCheck.resources.eth.suffix')}
            </p>
            <p className="detail-text">
              {t('step2ResourceCheck.resources.eth.required')} {resources?.requiredETH} {t('step2ResourceCheck.resources.eth.requiredSuffix')}
            </p>
            {!resources?.hasEnoughETH && (
              <div style={{ marginTop: "0.75rem" }}>
                {isTest ? (
                  // Testnet: Show faucet links
                  <>
                    <p className="detail-text" style={{ marginBottom: "0.5rem" }}>
                      Get free testnet ETH from faucets:
                    </p>
                    {networkConfig.resources.ethFaucets.map((faucetUrl, index) => (
                      <a
                        key={index}
                        href={faucetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn"
                        style={{
                          display: "inline-block",
                          marginRight: "0.5rem",
                          marginTop: "0.5rem",
                          padding: "0.5rem 1rem",
                          background: "#7c3aed",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "6px",
                          fontSize: "0.85rem"
                        }}
                      >
                        Faucet #{index + 1} →
                      </a>
                    ))}
                  </>
                ) : (
                  // Mainnet: Show CEX/DEX options
                  <p className="detail-text error">
                    Get ETH from exchanges (CEX) like Binance, Coinbase or decentralized exchanges (DEX) like Uniswap
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary and Actions */}
      <div className="step-summary">
        {areAllResourcesReady() ? (
          <div className="success-message">
            <h3>✅ {t('step2ResourceCheck.summary.allReady')}</h3>
            <p>{t('step2ResourceCheck.summary.allReadyDescription')}</p>
          </div>
        ) : (
          <div className="warning-message">
            <h3>⚠️ {t('step2ResourceCheck.summary.notReady')}</h3>
            <p>{t('step2ResourceCheck.summary.notReadyDescription')}</p>
          </div>
        )}

        <button className="btn-refresh" onClick={checkResourcesStatus}>
          {t('step2ResourceCheck.actions.recheck')}
        </button>
      </div>

      {/* Navigation Actions */}
      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>
          {t('step2ResourceCheck.actions.back')}
        </button>
        <button
          className="btn-primary"
          onClick={onNext}
          disabled={!areAllResourcesReady()}
        >
          {t('step2ResourceCheck.actions.continue')}
        </button>
      </div>
    </div>
  );
}
