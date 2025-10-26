/**
 * StakeOptionCard Component
 *
 * Displays a single Stake option (Standard or Fast) with requirements and benefits
 */

import React from "react";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import type { WalletStatus } from "../utils/walletChecker";
import "./StakeOptionCard.css";

export type StakeOptionType = "aoa" | "super";

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
  showResourceStatus?: boolean; // Whether to show resource check status (✅ ❌)
}

export const StakeOptionCard: React.FC<StakeOptionCardProps> = ({
  option,
  walletStatus,
  selected,
  disabled,
  onSelect,
  showResourceStatus = true, // Default to showing status for backward compatibility
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
          {option.recommended && <span className="badge recommended">Recommended</span>}
          {option.badge && !option.recommended && (
            <span className={`badge ${option.badge === "AOA" ? "badge-aoa" : option.badge === "AOA+" ? "badge-aoa-plus" : ""}`}>
              {option.badge}
            </span>
          )}
        </div>
        <p className="stake-option-subtitle">{option.subtitle}</p>
      </div>

      {/* Requirements Section */}
      <div className="stake-option-section">
        <h4>📋 Resource Requirements</h4>
        <div className="requirements-list">
          {option.requirements.map((req, index) => (
            <div
              key={index}
              className={`requirement-item ${showResourceStatus ? (req.met ? "met" : "not-met") : ""}`}
            >
              {showResourceStatus && (
                <span className="requirement-icon">{req.met ? "✅" : "❌"}</span>
              )}
              <div className="requirement-content">
                <span className="requirement-label">{req.label}</span>
                <span className="requirement-value">{req.value}</span>
              </div>
            </div>
          ))}
        </div>

        {showResourceStatus && !canProceed && (
          <div className="missing-resources-warning">
            <span className="warning-icon">⚠️</span>
            <span>
              Need {missingCount} more resource{missingCount > 1 ? 's' : ''}.{' '}
              {option.type === "aoa" && (
                <a href="/get-gtoken" target="_blank" rel="noopener noreferrer">
                  Get GToken
                </a>
              )}
              {option.type === "super" && (
                <>
                  <a
                    href="/get-gtoken"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get GToken
                  </a>{" "}
                  |{" "}
                  <a href="/get-pnts" target="_blank" rel="noopener noreferrer">
                    Get PNTs
                  </a>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div className="stake-option-section">
        <h4>📝 Deployment Steps</h4>
        <ol className="steps-list">
          {option.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Benefits Section */}
      <div className="stake-option-section">
        <h4>✨ Advantages</h4>
        <ul className="benefits-list">
          {option.benefits.map((benefit, index) => (
            <li key={index}>{benefit}</li>
          ))}
        </ul>
      </div>

      {/* Warnings (if any) */}
      {option.warnings && option.warnings.length > 0 && (
        <div className="stake-option-section warnings">
          <h4>⚠️ Important Notes</h4>
          <ul className="warnings-list">
            {option.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suitable For Section */}
      <div className="stake-option-section">
        <h4>🎯 Best For</h4>
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
          {selected ? "✓ Selected" : disabled ? "Unavailable" : "Select This Option"}
        </button>

        {showResourceStatus && canProceed && (
          <div className="ready-indicator">
            <span className="ready-icon">✓</span>
            <span>Resources ready, proceed with deployment</span>
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
          <span>This option is currently unavailable</span>
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
  config: ReturnType<typeof getCurrentNetworkConfig>,
  showBalances: boolean = true
): StakeOption {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const minEth = parseFloat(config.requirements.minEthStandardFlow);
  const minGToken = parseFloat(config.requirements.minGTokenStake);

  return {
    type: "aoa",
    title: "Enhanced ERC-4337",
    subtitle: "Asset Oriented Abstraction - No off-chain signature server, just Your Gas Token",
    recommended: ethBalance >= minEth && gTokenBalance >= minGToken,
    badge: "AOA",
    requirements: [
      {
        label: "ETH (long-term supply: deployment + stake + ongoing gas)",
        value: showBalances
          ? `Need ≥ ${config.requirements.minEthStandardFlow} ETH (Current: ${walletStatus.ethBalance} ETH)`
          : `Need ≥ ${config.requirements.minEthStandardFlow} ETH`,
        met: ethBalance >= minEth,
      },
      {
        label: "stGToken (governance participation)",
        value: showBalances
          ? `Need ≥ ${config.requirements.minGTokenStake} stGToken (Current: ${walletStatus.gTokenBalance} stGToken)`
          : `Need ≥ ${config.requirements.minGTokenStake} stGToken`,
        met: gTokenBalance >= minGToken,
      },
    ],
    steps: [
      "Deploy PaymasterV4 contract (~0.02 ETH gas)",
      "Stake ETH to EntryPoint (ERC-4337 standard)",
      "Deposit ETH to EntryPoint (for gas sponsorship)",
      "Stake stGToken to Governance Contract",
    ],
    benefits: [
      "Fully ERC-4337 compliant with AOA enhancements",
      "Direct control over EntryPoint ETH deposits",
      "No off-chain signature server needed",
      "Higher protocol compatibility for long-term operation",
    ],
    warnings: [
      "Relies on PaymasterV4.1 enhanced contract",
      "Requires ETH and stGToken resources",
    ],
    suitable: [
      "Have sufficient ETH for long-term operations",
      "Want complete control over gas budgets",
      "Need high protocol compatibility",
      "Plan to run Paymaster long-term",
    ],
  };
}

/**
 * Helper function to create Super Mode option
 */
export function createSuperModeOption(
  walletStatus: WalletStatus,
  config: ReturnType<typeof getCurrentNetworkConfig>,
  showBalances: boolean = true
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
    type: "super",
    title: "Super Mode",
    subtitle: "AOA and more: No Server, No Contract Deployment - Launch in seconds",
    recommended: allResourcesMet,
    badge: "AOA+",
    requirements: [
      {
        label: "ETH (one-time interaction gas only)",
        value: showBalances
          ? `Need ≥ ${config.requirements.minEthDeploy} ETH (Current: ${walletStatus.ethBalance} ETH)`
          : `Need ≥ ${config.requirements.minEthDeploy} ETH`,
        met: ethBalance >= minEth,
      },
      {
        label: "stGToken (governance participation)",
        value: showBalances
          ? `Need ≥ ${config.requirements.minGTokenStake} stGToken (Current: ${walletStatus.gTokenBalance} stGToken)`
          : `Need ≥ ${config.requirements.minGTokenStake} stGToken`,
        met: gTokenBalance >= minGToken,
      },
      {
        label: "aPNTs (long-term supply: gas backing token)",
        value: showBalances
          ? `Need ≥ ${config.requirements.minPntDeposit} aPNT (Current: ${walletStatus.pntsBalance} aPNT)`
          : `Need ≥ ${config.requirements.minPntDeposit} aPNT`,
        met: pntsBalance >= minPnts,
      },
    ],
    steps: [
      "Stake stGToken to Governance Contract",
      "Register to SuperPaymasterV2 (auto-lock stGToken)",
      "Deposit aPNTs to SuperPaymasterV2",
      "Complete! Launch Paymaster in seconds",
    ],
    benefits: [
      "Launch Paymaster in seconds with AOA+",
      "No Paymaster contract deployment needed",
      "No ETH stake to EntryPoint required",
      "No off-chain signature server needed",
      "Protocol handles all cross-chain gas distribution",
    ],
    warnings: [
      "Relies on SuperPaymasterV2 shared contract",
      "Requires stGToken and aPNTs resources",
    ],
    suitable: [
      "Quick community Paymaster launch",
      "Don't want to deploy and maintain contracts",
      "Have sufficient stGToken and aPNTs",
      "Focus on community ops rather than tech",
    ],
  };
}
