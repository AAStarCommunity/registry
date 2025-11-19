import React, { useState, useEffect } from 'react';
import type { ContractConfig } from '../../types/contracts';
import { PreMintCheckService, type PreMintCheckResults, type CheckResult } from '../../services/PreMintCheckService';
import './PreMintCheckModal.css';

export interface PreMintCheckModalProps {
  isVisible: boolean;
  operatorAddress: string;
  addresses: string[];
  contractConfig: ContractConfig;
  onProceed: () => void;
  onCancel: () => void;
}

export const PreMintCheckModal: React.FC<PreMintCheckModalProps> = ({
  isVisible,
  operatorAddress,
  addresses,
  contractConfig,
  onProceed,
  onCancel
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [checkResults, setCheckResults] = useState<PreMintCheckResults | null>(null);

  useEffect(() => {
    if (isVisible) {
      runChecks();
    }
  }, [isVisible, operatorAddress, addresses]);

  const runChecks = async () => {
    setIsChecking(true);
    try {
      const checkService = new PreMintCheckService();
      const results = await checkService.runPreMintChecks(
        operatorAddress,
        addresses,
        contractConfig.address,
        contractConfig.abi
      );
      setCheckResults(results);
    } catch (error) {
      console.error('Pre-mint checks failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getCheckIcon = (check: CheckResult) => {
    if (check.passed) return '✅';
    if (check.severity === 'critical') return '❌';
    if (check.severity === 'warning') return '⚠️';
    return 'ℹ️';
  };

  const getCheckClass = (check: CheckResult) => {
    if (check.passed) return 'check-passed';
    if (check.severity === 'critical') return 'check-critical';
    if (check.severity === 'warning') return 'check-warning';
    return 'check-info';
  };

  if (!isVisible) return null;

  return (
    <div className="pre-check-modal">
      <div className="modal-container">
        <div className="modal-header">
          <h2>
            <span className="header-icon">🔍</span>
            批量铸造预检查
          </h2>
          <div className="check-badge">
            {isChecking ? (
              <span className="badge checking">检查中...</span>
            ) : checkResults?.allPassed ? (
              <span className="badge success">全部通过</span>
            ) : (
              <span className="badge failed">发现问题</span>
            )}
          </div>
        </div>

        <div className="modal-body">
          {isChecking ? (
            <div className="checking-state">
              <div className="loading-spinner"></div>
              <p className="checking-text">正在执行预检查...</p>
              <div className="checking-steps">
                <div className="step">🔐 验证社区注册</div>
                <div className="step">💰 检查 GToken 余额</div>
                <div className="step">🎫 检查 SBT 状态</div>
                <div className="step">✓ 验证所有要求</div>
              </div>
            </div>
          ) : checkResults ? (
            <>
              {/* Summary */}
              <div className="check-summary">
                <div className="summary-stats">
                  <div className="stat-item passed">
                    <span className="stat-icon">✅</span>
                    <span className="stat-value">{checkResults.summary.passed}</span>
                    <span className="stat-label">通过</span>
                  </div>
                  {checkResults.summary.critical > 0 && (
                    <div className="stat-item critical">
                      <span className="stat-icon">❌</span>
                      <span className="stat-value">{checkResults.summary.critical}</span>
                      <span className="stat-label">严重</span>
                    </div>
                  )}
                  {checkResults.summary.warnings > 0 && (
                    <div className="stat-item warning">
                      <span className="stat-icon">⚠️</span>
                      <span className="stat-value">{checkResults.summary.warnings}</span>
                      <span className="stat-label">警告</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Check Results */}
              <div className="check-results">
                {checkResults.checks.map((check, index) => (
                  <div key={index} className={`check-card ${getCheckClass(check)}`}>
                    <div className="check-header">
                      <span className="check-icon">{getCheckIcon(check)}</span>
                      <h3 className="check-title">{check.title}</h3>
                    </div>
                    <p className="check-description">{check.description}</p>
                    {check.details && (
                      <div className="check-details">
                        <details>
                          <summary>查看详情</summary>
                          <pre className="details-content">{check.details}</pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {!checkResults.allPassed && (
                <div className="recommendations">
                  <h3>📋 建议操作</h3>
                  <ul>
                    {checkResults.checks
                      .filter(c => !c.passed && c.severity === 'critical')
                      .map((check, index) => (
                        <li key={index}>
                          <strong>{check.title}:</strong> {check.details || check.description}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              className="action-button secondary"
              onClick={onCancel}
              disabled={isChecking}
            >
              取消操作
            </button>

            {checkResults && (
              <>
                {!checkResults.allPassed && (
                  <button
                    className="action-button retry"
                    onClick={runChecks}
                    disabled={isChecking}
                  >
                    🔄 重新检查
                  </button>
                )}

                <button
                  className="action-button primary"
                  onClick={onProceed}
                  disabled={isChecking || !checkResults.allPassed}
                >
                  {checkResults.allPassed ? (
                    <>
                      <span className="button-icon">✅</span>
                      继续执行
                    </>
                  ) : (
                    <>
                      <span className="button-icon">⚠️</span>
                      强制继续 (不推荐)
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {checkResults && !checkResults.allPassed && (
            <div className="footer-warning">
              ⚠️ 存在 {checkResults.summary.critical} 个严重问题，强制继续可能导致交易失败
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
