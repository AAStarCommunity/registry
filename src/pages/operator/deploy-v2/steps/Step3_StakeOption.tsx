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
  createSuperModeOption,
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
  } | null>(null);

  // Create options based on wallet status
  const standardOption = createStandardFlowOption(walletStatus, config);
  const superOption = createSuperModeOption(walletStatus, config);

  // Calculate recommendation (but don't auto-select)
  useEffect(() => {
    const rec = calculateRecommendation(
      walletStatus,
      standardOption,
      superOption
    );
    setRecommendation(rec);

    // Don't auto-select - let user choose freely
    // Only show recommendation as a suggestion
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
    selectedOption === "standard" ? standardOption : superOption;
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
            <h3>Suggestion (You can choose freely)</h3>
          </div>
          <p className="recommendation-text">
            <strong>
              We recommend:{" "}
              {recommendation.option === "standard"
                ? "Standard ERC-4337 Flow"
                : "GToken Super Mode"}
            </strong>
          </p>
          <p className="recommendation-reason">{recommendation.reason}</p>
          <p className="recommendation-note">
            💬 This is just a suggestion based on your current wallet resources.
            You are free to choose either option at any time.
          </p>
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
          option={superOption}
          walletStatus={walletStatus}
          selected={selectedOption === "super"}
          disabled={false}
          onSelect={() => handleSelectOption("super")}
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
                {selectedOption === "super" && (
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
            <strong>选择 Super Mode</strong> 如果您:
          </p>
          <ul>
            <li>ETH 不多但有 GToken 和 aPNTs</li>
            <li>希望三秒钟快速启动 Paymaster</li>
            <li>不想部署和维护合约</li>
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
  superOption: StakeOption
): { option: StakeOptionType; reason: string } | null {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const pntsBalance = parseFloat(walletStatus.pntsBalance);

  // Check if requirements are met
  const standardMet = standardOption.requirements.every((r) => r.met);
  const superMet = superOption.requirements.every((r) => r.met);

  // Both met: recommend based on which is "more met"
  if (standardMet && superMet) {
    // Calculate "excess" for each option
    const standardExcess = ethBalance / 0.1; // relative to 0.1 ETH requirement
    const superExcess =
      (gTokenBalance / 100 + pntsBalance / 1000 + ethBalance / 0.02) / 3;

    if (standardExcess > superExcess * 1.5) {
      return {
        option: "standard",
        reason:
          "You have abundant ETH. Standard Flow provides better protocol compatibility and full control over EntryPoint deposits.",
      };
    } else {
      return {
        option: "super",
        reason:
          "Your GToken and aPNTs are abundant. Super Mode launches in 3 seconds and saves ETH by sharing a paymaster contract.",
      };
    }
  }

  // Only one met
  if (standardMet) {
    return {
      option: "standard",
      reason: "You currently meet the requirements for Standard Flow. Super Mode requires additional GToken and aPNTs.",
    };
  }

  if (superMet) {
    return {
      option: "super",
      reason: "You currently meet the requirements for Super Mode. Standard Flow requires more ETH for EntryPoint deposit.",
    };
  }

  // Neither met: recommend based on closest
  const standardMissing = standardOption.requirements.filter(
    (r) => !r.met
  ).length;
  const superMissing = superOption.requirements.filter((r) => !r.met).length;

  if (standardMissing < superMissing) {
    return {
      option: "standard",
      reason: `You're closer to Standard Flow requirements (${standardMissing} resource${standardMissing > 1 ? 's' : ''} needed). Good for long-term operation with full control.`,
    };
  } else {
    return {
      option: "super",
      reason: `You're closer to Super Mode requirements (${superMissing} resource${superMissing > 1 ? 's' : ''} needed). Great for quick launch without contract deployment.`,
    };
  }
}
