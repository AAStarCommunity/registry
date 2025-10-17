/**
 * StakeOptionCard Component
 *
 * Displays a single Stake option (Standard or Fast) with requirements and benefits
 */

import React from "react";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import type { WalletStatus } from "../utils/walletChecker";
import "./StakeOptionCard.css";

export type StakeOptionType = "standard" | "fast";

export interface StakeOption {
  type: StakeOptionType;
  title: string;
  subtitle: string;
  recommended?: boolean;
  badge?: string;
  requirements: {
    label: string;
    value: string;
    met: boolean;
  }[];
  steps: string[];
  benefits: string[];
  warnings?: string[];
  suitable: string[];
}

interface StakeOptionCardProps {
  option: StakeOption;
  walletStatus: WalletStatus;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export const StakeOptionCard: React.FC<StakeOptionCardProps> = ({
  option,
  walletStatus,
  selected,
  disabled,
  onSelect,
}) => {
  const config = getCurrentNetworkConfig();

  // Calculate if user can proceed with this option
  const canProceed = option.requirements.every((req) => req.met);
  const missingCount = option.requirements.filter((req) => !req.met).length;

  return (
    <div
      className={`stake-option-card ${selected ? "selected" : ""} ${
        disabled ? "disabled" : ""
      } ${option.recommended ? "recommended" : ""}`}
      onClick={!disabled ? onSelect : undefined}
    >
      {/* Header */}
      <div className="stake-option-header">
        <div className="stake-option-title-section">
          <h3>{option.title}</h3>
          {option.recommended && <span className="badge recommended">推荐</span>}
          {option.badge && !option.recommended && (
            <span className="badge">{option.badge}</span>
          )}
        </div>
        <p className="stake-option-subtitle">{option.subtitle}</p>
      </div>

      {/* Requirements Section */}
      <div className="stake-option-section">
        <h4>📋 资源要求</h4>
        <div className="requirements-list">
          {option.requirements.map((req, index) => (
            <div
              key={index}
              className={`requirement-item ${req.met ? "met" : "not-met"}`}
            >
              <span className="requirement-icon">{req.met ? "✅" : "❌"}</span>
              <div className="requirement-content">
                <span className="requirement-label">{req.label}</span>
                <span className="requirement-value">{req.value}</span>
              </div>
            </div>
          ))}
        </div>

        {!canProceed && (
          <div className="missing-resources-warning">
            <span className="warning-icon">⚠️</span>
            <span>
              还需 {missingCount} 项资源。
              {option.type === "standard" && (
                <a href="/get-gtoken" target="_blank" rel="noopener noreferrer">
                  获取 GToken
                </a>
              )}
              {option.type === "fast" && (
                <>
                  <a
                    href="/get-gtoken"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    获取 GToken
                  </a>{" "}
                  |{" "}
                  <a href="/get-pnts" target="_blank" rel="noopener noreferrer">
                    获取 PNTs
                  </a>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div className="stake-option-section">
        <h4>📝 部署步骤</h4>
        <ol className="steps-list">
          {option.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Benefits Section */}
      <div className="stake-option-section">
        <h4>✨ 优势</h4>
        <ul className="benefits-list">
          {option.benefits.map((benefit, index) => (
            <li key={index}>{benefit}</li>
          ))}
        </ul>
      </div>

      {/* Warnings (if any) */}
      {option.warnings && option.warnings.length > 0 && (
        <div className="stake-option-section warnings">
          <h4>⚠️ 注意事项</h4>
          <ul className="warnings-list">
            {option.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suitable For Section */}
      <div className="stake-option-section">
        <h4>🎯 适合场景</h4>
        <ul className="suitable-list">
          {option.suitable.map((scenario, index) => (
            <li key={index}>{scenario}</li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="stake-option-footer">
        <button
          className={`select-button ${selected ? "selected" : ""} ${
            disabled ? "disabled" : ""
          }`}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onSelect();
          }}
        >
          {selected ? "✓ 已选择" : disabled ? "不可用" : "选择此方案"}
        </button>

        {canProceed && (
          <div className="ready-indicator">
            <span className="ready-icon">✓</span>
            <span>资源充足，可以开始部署</span>
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="selection-indicator">
          <span className="checkmark">✓</span>
        </div>
      )}

      {/* Disabled Overlay */}
      {disabled && (
        <div className="disabled-overlay">
          <span>此方案暂不可用</span>
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to create Standard Flow option
 */
export function createStandardFlowOption(
  walletStatus: WalletStatus,
  config: ReturnType<typeof getCurrentNetworkConfig>
): StakeOption {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const minEth = parseFloat(config.requirements.minEthStandardFlow);
  const minGToken = parseFloat(config.requirements.minGTokenStake);

  return {
    type: "standard",
    title: "Standard ERC-4337 Flow",
    subtitle: "完全符合 ERC-4337 标准的部署流程",
    recommended: ethBalance >= minEth && gTokenBalance >= minGToken,
    badge: "标准",
    requirements: [
      {
        label: "ETH (部署 + Stake + Deposit)",
        value: `需要 ≥ ${config.requirements.minEthStandardFlow} ETH (当前: ${walletStatus.ethBalance} ETH)`,
        met: ethBalance >= minEth,
      },
      {
        label: "GToken (治理 Stake)",
        value: `需要 ≥ ${config.requirements.minGTokenStake} GToken (当前: ${walletStatus.gTokenBalance} GToken)`,
        met: gTokenBalance >= minGToken,
      },
    ],
    steps: [
      "部署 PaymasterV4 合约 (~0.02 ETH gas)",
      "Stake ETH 到 EntryPoint (ERC-4337)",
      "Deposit ETH 到 EntryPoint (gas sponsorship)",
      "Stake GToken 到 Governance Contract",
    ],
    benefits: [
      "完全符合 ERC-4337 标准规范",
      "直接控制 EntryPoint 中的 ETH",
      "更高的协议兼容性",
      "适合长期运营的 Operator",
    ],
    suitable: [
      "已有充足的 ETH 资金",
      "想要完全控制 gas 预算",
      "需要高度的协议兼容性",
      "计划长期运营 Paymaster",
    ],
  };
}

/**
 * Helper function to create Fast Flow option
 */
export function createFastFlowOption(
  walletStatus: WalletStatus,
  config: ReturnType<typeof getCurrentNetworkConfig>
): StakeOption {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const pntsBalance = parseFloat(walletStatus.pntsBalance);
  const minEth = parseFloat(config.requirements.minEthDeploy);
  const minGToken = parseFloat(config.requirements.minGTokenStake);
  const minPnts = parseFloat(config.requirements.minPntDeposit);

  const allResourcesMet =
    ethBalance >= minEth &&
    gTokenBalance >= minGToken &&
    pntsBalance >= minPnts;

  return {
    type: "fast",
    title: "Fast Stake Flow",
    subtitle: "使用 GToken 和 PNTs 的快速部署流程",
    recommended: allResourcesMet,
    badge: "快速",
    requirements: [
      {
        label: "ETH (仅部署 gas)",
        value: `需要 ≥ ${config.requirements.minEthDeploy} ETH (当前: ${walletStatus.ethBalance} ETH)`,
        met: ethBalance >= minEth,
      },
      {
        label: "GToken (治理 Stake)",
        value: `需要 ≥ ${config.requirements.minGTokenStake} GToken (当前: ${walletStatus.gTokenBalance} GToken)`,
        met: gTokenBalance >= minGToken,
      },
      {
        label: "PNTs (Deposit)",
        value: `需要 ≥ ${config.requirements.minPntDeposit} PNT (当前: ${walletStatus.pntsBalance} PNT)`,
        met: pntsBalance >= minPnts,
      },
    ],
    steps: [
      "部署 PaymasterV4 合约 (~0.02 ETH gas)",
      "Stake GToken 到 Governance Contract",
      "Deposit PNTs (协议自动将 GToken→ETH)",
    ],
    benefits: [
      "更简单的流程（少 1-2 步）",
      "不需要持有大量 ETH",
      "协议自动处理 EntryPoint 要求",
      "快速启动，适合测试",
    ],
    warnings: [
      "依赖协议的 GToken→ETH 转换",
      "需要同时准备 GToken 和 PNTs",
    ],
    suitable: [
      "GToken 和 PNTs 充足，ETH 较少",
      "希望简化操作流程",
      "快速测试 Paymaster 功能",
      "不需要直接控制 EntryPoint ETH",
    ],
  };
}
