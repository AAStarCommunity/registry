/**
 * Step 3: Stake Option Selection
 *
 * Allows users to choose between Standard and Fast Stake flows
 * based on their wallet resources
 */

import React, { useState, useEffect } from "react";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import type { WalletStatus } from "../utils/walletChecker";
import {
  StakeOptionCard,
  createStandardFlowOption,
  createFastFlowOption,
  type StakeOptionType,
  type StakeOption,
} from "../components/StakeOptionCard";
import "./Step3_StakeOption.css";

interface Step3Props {
  walletStatus: WalletStatus;
  onNext: (selectedOption: StakeOptionType) => void;
  onBack: () => void;
}

export const Step3_StakeOption: React.FC<Step3Props> = ({
  walletStatus,
  onNext,
  onBack,
}) => {
  const config = getCurrentNetworkConfig();
  const [selectedOption, setSelectedOption] = useState<StakeOptionType | null>(
    null
  );
  const [recommendation, setRecommendation] = useState<{
    option: StakeOptionType;
    reason: string;
    score: number;
  } | null>(null);

  // Create options based on wallet status
  const standardOption = createStandardFlowOption(walletStatus, config);
  const fastOption = createFastFlowOption(walletStatus, config);

  // Calculate recommendation
  useEffect(() => {
    const rec = calculateRecommendation(
      walletStatus,
      standardOption,
      fastOption
    );
    setRecommendation(rec);

    // Auto-select if only one option is viable
    const standardViable = standardOption.requirements.every((r) => r.met);
    const fastViable = fastOption.requirements.every((r) => r.met);

    if (standardViable && !fastViable) {
      setSelectedOption("standard");
    } else if (fastViable && !standardViable) {
      setSelectedOption("fast");
    } else if (rec) {
      // Auto-select recommended option
      setSelectedOption(rec.option);
    }
  }, [walletStatus]);

  const handleSelectOption = (option: StakeOptionType) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (selectedOption) {
      onNext(selectedOption);
    }
  };

  // Check if user can proceed
  const selectedOptData =
    selectedOption === "standard" ? standardOption : fastOption;
  const canProceed =
    selectedOption &&
    selectedOptData &&
    selectedOptData.requirements.every((r) => r.met);

  return (
    <div className="step3-stake-option">
      {/* Header */}
      <div className="step3-header">
        <h2>选择 Stake 方案</h2>
        <p className="step3-description">
          根据您的钱包资源，选择最适合的 Stake 流程。我们会根据您当前的余额提供智能推荐。
        </p>
      </div>

      {/* Wallet Summary */}
      <div className="wallet-summary">
        <h3>💼 当前钱包状态</h3>
        <div className="wallet-summary-grid">
          <div className="wallet-item">
            <span className="wallet-label">ETH:</span>
            <span
              className={`wallet-value ${
                parseFloat(walletStatus.ethBalance) >=
                parseFloat(config.requirements.minEthDeploy)
                  ? "sufficient"
                  : "insufficient"
              }`}
            >
              {walletStatus.ethBalance} ETH
            </span>
          </div>
          <div className="wallet-item">
            <span className="wallet-label">GToken:</span>
            <span
              className={`wallet-value ${
                parseFloat(walletStatus.gTokenBalance) >=
                parseFloat(config.requirements.minGTokenStake)
                  ? "sufficient"
                  : "insufficient"
              }`}
            >
              {walletStatus.gTokenBalance} GToken
            </span>
          </div>
          <div className="wallet-item">
            <span className="wallet-label">PNTs:</span>
            <span
              className={`wallet-value ${
                parseFloat(walletStatus.pntsBalance) >=
                parseFloat(config.requirements.minPntDeposit)
                  ? "sufficient"
                  : "insufficient"
              }`}
            >
              {walletStatus.pntsBalance} PNT
            </span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="recommendation-box">
          <div className="recommendation-header">
            <span className="recommendation-icon">💡</span>
            <h3>智能推荐</h3>
          </div>
          <p className="recommendation-text">
            <strong>
              推荐方案:{" "}
              {recommendation.option === "standard"
                ? "Standard ERC-4337 Flow"
                : "Fast Stake Flow"}
            </strong>
          </p>
          <p className="recommendation-reason">{recommendation.reason}</p>
          <div className="recommendation-score">
            <span className="score-label">匹配度:</span>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{ width: `${recommendation.score}%` }}
              />
            </div>
            <span className="score-value">{recommendation.score}%</span>
          </div>
        </div>
      )}

      {/* Option Cards */}
      <div className="stake-options-grid">
        <StakeOptionCard
          option={standardOption}
          walletStatus={walletStatus}
          selected={selectedOption === "standard"}
          disabled={false}
          onSelect={() => handleSelectOption("standard")}
        />

        <StakeOptionCard
          option={fastOption}
          walletStatus={walletStatus}
          selected={selectedOption === "fast"}
          disabled={false}
          onSelect={() => handleSelectOption("fast")}
        />
      </div>

      {/* Selected Option Details */}
      {selectedOption && selectedOptData && (
        <div className="selected-option-details">
          <h3>📋 准备清单预览</h3>
          <p>
            您选择了 <strong>{selectedOptData.title}</strong>。
            {canProceed
              ? "所有资源已就绪，可以开始部署！"
              : "请先准备好所需资源。"}
          </p>

          {!canProceed && (
            <div className="preparation-needed">
              <h4>需要准备的资源:</h4>
              <ul>
                {selectedOptData.requirements
                  .filter((r) => !r.met)
                  .map((req, index) => (
                    <li key={index}>
                      {req.label}: {req.value}
                    </li>
                  ))}
              </ul>
              <div className="preparation-links">
                {selectedOption === "standard" && (
                  <a
                    href="/get-gtoken"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="prep-link"
                  >
                    获取 GToken →
                  </a>
                )}
                {selectedOption === "fast" && (
                  <>
                    <a
                      href="/get-gtoken"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="prep-link"
                    >
                      获取 GToken →
                    </a>
                    <a
                      href="/get-pnts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="prep-link"
                    >
                      获取 PNTs →
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="step3-navigation">
        <button onClick={onBack} className="nav-button back">
          ← 上一步
        </button>

        <button
          onClick={handleNext}
          className="nav-button next"
          disabled={!selectedOption || !canProceed}
        >
          {canProceed ? "继续 →" : "请先准备资源"}
        </button>
      </div>

      {/* Help Section */}
      <details className="help-section">
        <summary>💬 需要帮助？</summary>
        <div className="help-content">
          <h4>如何选择合适的方案？</h4>
          <p>
            <strong>选择 Standard Flow</strong> 如果您:
          </p>
          <ul>
            <li>拥有充足的 ETH (≥ 0.1 ETH)</li>
            <li>想要完全符合 ERC-4337 标准</li>
            <li>需要直接控制 EntryPoint 中的 ETH</li>
          </ul>

          <p>
            <strong>选择 Fast Flow</strong> 如果您:
          </p>
          <ul>
            <li>ETH 不多但有 GToken 和 PNTs</li>
            <li>希望简化操作流程</li>
            <li>快速测试 Paymaster 功能</li>
          </ul>

          <p>
            <strong>还有疑问？</strong>
            查看{" "}
            <a
              href="/launch-guide"
              target="_blank"
              rel="noopener noreferrer"
            >
              完整教程
            </a>
            。
          </p>
        </div>
      </details>
    </div>
  );
};

/**
 * Calculate recommendation based on wallet status
 */
function calculateRecommendation(
  walletStatus: WalletStatus,
  standardOption: StakeOption,
  fastOption: StakeOption
): { option: StakeOptionType; reason: string; score: number } | null {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const pntsBalance = parseFloat(walletStatus.pntsBalance);

  // Check if requirements are met
  const standardMet = standardOption.requirements.every((r) => r.met);
  const fastMet = fastOption.requirements.every((r) => r.met);

  // Both met: recommend based on which is "more met"
  if (standardMet && fastMet) {
    // Calculate "excess" for each option
    const standardExcess = ethBalance / 0.1; // relative to 0.1 ETH requirement
    const fastExcess =
      (gTokenBalance / 100 + pntsBalance / 1000 + ethBalance / 0.02) / 3;

    if (standardExcess > fastExcess * 1.5) {
      return {
        option: "standard",
        reason:
          "您有充足的 ETH，建议使用 Standard Flow 以获得更好的协议兼容性和控制力。",
        score: Math.min(95, Math.round(standardExcess * 30)),
      };
    } else {
      return {
        option: "fast",
        reason:
          "您的 GToken 和 PNTs 充足，使用 Fast Flow 可以简化流程并节省 ETH。",
        score: Math.min(95, Math.round(fastExcess * 30)),
      };
    }
  }

  // Only one met
  if (standardMet) {
    return {
      option: "standard",
      reason: "您当前只满足 Standard Flow 的资源要求。",
      score: 85,
    };
  }

  if (fastMet) {
    return {
      option: "fast",
      reason: "您当前只满足 Fast Flow 的资源要求。",
      score: 85,
    };
  }

  // Neither met: recommend based on closest
  const standardMissing = standardOption.requirements.filter(
    (r) => !r.met
  ).length;
  const fastMissing = fastOption.requirements.filter((r) => !r.met).length;

  if (standardMissing < fastMissing) {
    return {
      option: "standard",
      reason: `您距离 Standard Flow 的要求更近（还需 ${standardMissing} 项资源）。`,
      score: Math.max(30, 70 - standardMissing * 15),
    };
  } else {
    return {
      option: "fast",
      reason: `您距离 Fast Flow 的要求更近（还需 ${fastMissing} 项资源）。`,
      score: Math.max(30, 70 - fastMissing * 15),
    };
  }
}
