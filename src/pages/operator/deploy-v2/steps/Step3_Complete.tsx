/**
 * Step 3: Deployment Complete
 *
 * Display completion status and next steps
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type ResourceStatus, type StakeMode } from "../utils/resourceChecker";
import "./Step3_Complete.css";

export interface Step3Props {
  mode: StakeMode;
  resources: ResourceStatus;
  onRestart: () => void;
}

export function Step3_Complete({ mode, resources, onRestart }: Step3Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getExplorerLink = (address: string): string => {
    return `https://sepolia.etherscan.io/address/${address}`;
  };

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
        </div>
      </div>

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
                  <button
                    className="step-action"
                    onClick={() => navigate(`/resources/register-community?returnUrl=/operator/wizard`)}
                  >
                    去更新 Registry →
                  </button>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoa.step1.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoa.step1.description')}</p>
                  <button
                    className="step-action"
                    onClick={() => navigate(`/operator/manage?address=${resources.paymasterAddress}`)}
                  >
                    {t('step3Complete.nextSteps.aoa.step1.action')}
                  </button>
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
                    {t('step3Complete.nextSteps.aoa.step2.action')}
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoa.step3.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoa.step3.description')}</p>
                  <button
                    className="step-action"
                    onClick={() => navigate("/developer")}
                  >
                    {t('step3Complete.nextSteps.aoa.step3.action')}
                  </button>
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
                  <button
                    className="step-action"
                    onClick={() => navigate("/get-pnts")}
                  >
                    {t('step3Complete.nextSteps.aoaPlus.step1.action')}
                  </button>
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
                    {t('step3Complete.nextSteps.aoaPlus.step2.action')}
                  </a>
                </div>
              </div>

              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>{t('step3Complete.nextSteps.aoaPlus.step3.title')}</h4>
                  <p>{t('step3Complete.nextSteps.aoaPlus.step3.description')}</p>
                  <button
                    className="step-action"
                    onClick={() => navigate("/explorer")}
                  >
                    {t('step3Complete.nextSteps.aoaPlus.step3.action')}
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
