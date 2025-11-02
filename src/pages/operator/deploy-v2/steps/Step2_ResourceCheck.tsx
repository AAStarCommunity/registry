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
import { checkResources, type ResourceStatus, type StakeMode } from "../utils/resourceChecker";
import "./Step2_ResourceCheck.css";

export interface Step2Props {
  walletAddress: string;
  mode: StakeMode;
  onNext: () => void;
  onBack: () => void;
}

export function Step2_ResourceCheck({ walletAddress, mode, onNext, onBack }: Step2Props) {
  const navigate = useNavigate();
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
          <h2>🔍 检查资源状态</h2>
          <p className="step-subtitle">正在检测已部署的资源...</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step2-resource-check">
        <div className="step-header">
          <h2>⚠️ 检测失败</h2>
          <p className="step-subtitle">无法检测资源状态</p>
        </div>
        <div className="error-box">
          <p>{error}</p>
          <button className="btn-primary" onClick={checkResourcesStatus}>
            重新检测
          </button>
        </div>
        <div className="step-actions">
          <button className="btn-secondary" onClick={onBack}>
            ← 返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step2-resource-check">
      <div className="step-header">
        <h2>🔍 资源检测</h2>
        <p className="step-subtitle">
          {mode === "aoa" ? "AOA 模式 - 独立 Paymaster" : "AOA+ 模式 - SuperPaymaster"}
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
            <h3>社区注册</h3>
            {resources?.isCommunityRegistered ? (
              <p className="status-text success">
                已注册: {resources.communityName}
              </p>
            ) : (
              <>
                <p className="status-text error">未注册</p>
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/register-community")}
                >
                  立即注册 →
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
            <h3>xPNTs Token</h3>
            {resources?.hasXPNTs ? (
              <>
                <p className="status-text success">已部署</p>
                <p className="detail-text">
                  地址: {resources.xPNTsAddress?.slice(0, 10)}...
                </p>
                {resources.xPNTsExchangeRate && (
                  <p className="detail-text">
                    汇率: 1 xPNT = {resources.xPNTsExchangeRate} aPNTs
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="status-text error">未部署</p>
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/get-xpnts")}
                >
                  立即部署 →
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
                <h3>Paymaster 部署</h3>
                {resources?.hasPaymaster ? (
                  <>
                    <p className="status-text success">已部署</p>
                    <p className="detail-text">
                      地址: {resources.paymasterAddress?.slice(0, 10)}...
                    </p>
                  </>
                ) : (
                  <>
                    <p className="status-text error">未部署</p>
                    <button
                      className="action-btn"
                      onClick={() => handleNavigate("/launch-paymaster")}
                    >
                      立即部署 →
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
                <h3>MySBT 绑定</h3>
                {!resources?.hasPaymaster ? (
                  <p className="status-text disabled">需先部署 Paymaster</p>
                ) : resources.hasSBTBinding ? (
                  <p className="status-text success">已绑定</p>
                ) : (
                  <>
                    <p className="status-text error">未绑定</p>
                    <button
                      className="action-btn"
                      onClick={() => handleNavigate("/bind-sbt")}
                    >
                      立即绑定 →
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
            <h3>GToken 余额</h3>
            <p className={`status-text ${resources?.hasEnoughGToken ? "success" : "warning"}`}>
              余额: {resources?.gTokenBalance} GT
            </p>
            <p className="detail-text">
              需要: {resources?.requiredGToken} GT
            </p>
            {!resources?.hasEnoughGToken && (
              <button
                className="action-btn"
                onClick={() => handleNavigate("/get-gtoken")}
              >
                获取 GToken →
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
              <h3>aPNTs 余额</h3>
              <p className={`status-text ${resources?.hasEnoughAPNTs ? "success" : "warning"}`}>
                余额: {resources?.aPNTsBalance} aPNTs
              </p>
              <p className="detail-text">
                需要: {resources?.requiredAPNTs} aPNTs
              </p>
              {!resources?.hasEnoughAPNTs && (
                <button
                  className="action-btn"
                  onClick={() => handleNavigate("/get-pnts")}
                >
                  获取 aPNTs →
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
            <h3>ETH 余额</h3>
            <p className={`status-text ${resources?.hasEnoughETH ? "success" : "warning"}`}>
              余额: {resources?.ethBalance} ETH
            </p>
            <p className="detail-text">
              需要: {resources?.requiredETH} ETH (用于 gas)
            </p>
            {!resources?.hasEnoughETH && (
              <p className="detail-text error">
                请从水龙头获取 Sepolia ETH
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary and Actions */}
      <div className="step-summary">
        {areAllResourcesReady() ? (
          <div className="success-message">
            <h3>✅ 所有资源已就绪！</h3>
            <p>您可以继续下一步完成部署流程。</p>
          </div>
        ) : (
          <div className="warning-message">
            <h3>⚠️ 还有资源未准备好</h3>
            <p>请完成上述缺失的资源部署，然后点击"重新检测"。</p>
          </div>
        )}

        <button className="btn-refresh" onClick={checkResourcesStatus}>
          🔄 重新检测
        </button>
      </div>

      {/* Navigation Actions */}
      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>
          ← 返回
        </button>
        <button
          className="btn-primary"
          onClick={onNext}
          disabled={!areAllResourcesReady()}
        >
          继续 →
        </button>
      </div>
    </div>
  );
}
