/**
 * Step 3: Deployment Complete
 *
 * Display completion status and next steps
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { type ResourceStatus, type StakeMode } from "../utils/resourceChecker";
import "./Step3_Complete.css";

export interface Step3Props {
  mode: StakeMode;
  resources: ResourceStatus;
  onRestart: () => void;
}

export function Step3_Complete({ mode, resources, onRestart }: Step3Props) {
  const navigate = useNavigate();

  const getExplorerLink = (address: string): string => {
    return `https://sepolia.etherscan.io/address/${address}`;
  };

  return (
    <div className="step3-complete">
      <div className="completion-header">
        <div className="success-icon">🎉</div>
        <h2>部署完成！</h2>
        <p className="subtitle">
          恭喜！您已成功完成{mode === "aoa" ? "AOA 模式" : "AOA+ 模式"}的资源部署
        </p>
      </div>

      {/* Deployment Summary */}
      <div className="deployment-summary">
        <h3>📋 部署摘要</h3>

        <div className="summary-grid">
          {/* Community */}
          <div className="summary-card">
            <div className="card-icon">🏛️</div>
            <div className="card-content">
              <h4>社区信息</h4>
              <p className="card-value">{resources.communityName}</p>
              <p className="card-detail">
                注册时间: {new Date(resources.communityRegisteredAt! * 1000).toLocaleDateString()}
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
                  汇率: 1 xPNT = {resources.xPNTsExchangeRate} aPNTs
                </p>
              )}
              <a
                href={getExplorerLink(resources.xPNTsAddress!)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                在 Etherscan 查看 ↗
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
                  MySBT 已绑定: {resources.hasSBTBinding ? "✅" : "❌"}
                </p>
                <a
                  href={getExplorerLink(resources.paymasterAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  在 Etherscan 查看 ↗
                </a>
              </div>
            </div>
          )}

          {/* Balances */}
          <div className="summary-card">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <h4>余额状态</h4>
              <p className="card-detail">GToken: {resources.gTokenBalance} GT</p>
              {mode === "aoa+" && (
                <p className="card-detail">aPNTs: {resources.aPNTsBalance} aPNTs</p>
              )}
              <p className="card-detail">ETH: {resources.ethBalance} ETH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="next-steps">
        <h3>📝 下一步操作</h3>
        <div className="steps-list">
          {mode === "aoa" ? (
            <>
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>充值 Paymaster</h4>
                  <p>为 Paymaster 充值 ETH 以支付 gas 费用</p>
                  <button
                    className="step-action"
                    onClick={() => navigate(`/operator/manage?address=${resources.paymasterAddress}`)}
                  >
                    前往管理 →
                  </button>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>测试 Gasless 交易</h4>
                  <p>使用 Demo 应用测试您的 Paymaster</p>
                  <a
                    href="https://demo.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    打开 Demo ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>集成到您的 dApp</h4>
                  <p>查看开发者文档，将 Paymaster 集成到您的应用中</p>
                  <button
                    className="step-action"
                    onClick={() => navigate("/developer")}
                  >
                    查看文档 →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>充值 aPNTs</h4>
                  <p>确保 aPNTs 余额充足以支付 gas 费用</p>
                  <button
                    className="step-action"
                    onClick={() => navigate("/get-pnts")}
                  >
                    获取 aPNTs →
                  </button>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>测试 Gasless 交易</h4>
                  <p>使用 Demo 应用测试 SuperPaymaster</p>
                  <a
                    href="https://demo.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="step-action"
                  >
                    打开 Demo ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>监控您的运营</h4>
                  <p>查看交易统计和运营数据</p>
                  <button
                    className="step-action"
                    onClick={() => navigate("/explorer")}
                  >
                    前往 Explorer →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="completion-actions">
        <button className="btn-secondary" onClick={onRestart}>
          🔄 重新开始
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate("/")}
        >
          返回首页 →
        </button>
      </div>
    </div>
  );
}
