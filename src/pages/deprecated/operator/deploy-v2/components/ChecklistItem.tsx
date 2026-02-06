/**
 * ChecklistItem Component
 *
 * Displays a single resource requirement item with status and actions
 */

import React from "react";
import "./ChecklistItem.css";

export type CheckStatus = "pending" | "checking" | "complete" | "insufficient";

export interface ChecklistItemData {
  id: string;
  label: string;
  required: string;
  current: string;
  status: CheckStatus;
  met: boolean;
  actionLink?: string;
  actionLabel?: string;
  description?: string;
}

interface ChecklistItemProps {
  item: ChecklistItemData;
  onRefresh?: (itemId: string) => void;
  onAction?: (itemId: string) => void;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  onRefresh,
  onAction,
}) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case "complete":
        return "✅";
      case "insufficient":
        return "❌";
      case "checking":
        return "🔄";
      case "pending":
      default:
        return "⏳";
    }
  };

  const getStatusClass = () => {
    switch (item.status) {
      case "complete":
        return "complete";
      case "insufficient":
        return "insufficient";
      case "checking":
        return "checking";
      case "pending":
      default:
        return "pending";
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case "complete":
        return "✓ 已满足";
      case "insufficient":
        return "✗ 不足";
      case "checking":
        return "检查中...";
      case "pending":
      default:
        return "待检查";
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (item.actionLink) {
      window.open(item.actionLink, "_blank", "noopener,noreferrer");
    }
    if (onAction) {
      onAction(item.id);
    }
  };

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh(item.id);
    }
  };

  return (
    <div className={`checklist-item ${getStatusClass()}`}>
      {/* Status Icon */}
      <div className="checklist-icon">
        <span className="status-icon">{getStatusIcon()}</span>
      </div>

      {/* Content */}
      <div className="checklist-content">
        <div className="checklist-header">
          <h4 className="checklist-label">{item.label}</h4>
          <span className={`status-badge ${getStatusClass()}`}>
            {getStatusText()}
          </span>
        </div>

        {item.description && (
          <p className="checklist-description">{item.description}</p>
        )}

        <div className="checklist-details">
          <div className="detail-row">
            <span className="detail-label">要求:</span>
            <span className="detail-value required">{item.required}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">当前:</span>
            <span
              className={`detail-value current ${item.met ? "met" : "not-met"}`}
            >
              {item.current}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="checklist-actions">
        {/* Refresh Button */}
        {item.status !== "checking" && (
          <button
            className="action-button refresh"
            onClick={handleRefreshClick}
            title="刷新状态"
          >
            <span className="action-icon">🔄</span>
            <span className="action-text">刷新</span>
          </button>
        )}

        {/* Action Button (Get Resource) */}
        {!item.met && item.actionLink && (
          <button
            className="action-button primary"
            onClick={handleActionClick}
            title={item.actionLabel || "获取资源"}
          >
            <span className="action-text">
              {item.actionLabel || "获取 →"}
            </span>
          </button>
        )}
      </div>

      {/* Progress Bar (for visual feedback) */}
      {item.status === "checking" && (
        <div className="checking-progress">
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to create checklist items from wallet status
 */
import type { WalletStatus } from "../utils/walletChecker";
import type { NetworkConfig } from "../../../../config/networkConfig";

export function createChecklistItems(
  walletStatus: WalletStatus,
  config: NetworkConfig,
  selectedOption: "standard" | "fast"
): ChecklistItemData[] {
  const ethBalance = parseFloat(walletStatus.ethBalance);
  const gTokenBalance = parseFloat(walletStatus.gTokenBalance);
  const aPNTsBalance = parseFloat(walletStatus.aPNTsBalance);

  const items: ChecklistItemData[] = [];

  // ETH requirement (depends on flow)
  const requiredEth =
    selectedOption === "standard"
      ? parseFloat(config.requirements.minEthStandardFlow)
      : parseFloat(config.requirements.minEthDeploy);

  items.push({
    id: "eth",
    label: "ETH (以太币)",
    required:
      selectedOption === "standard"
        ? `≥ ${config.requirements.minEthStandardFlow} ETH (部署 + Stake + Deposit)`
        : `≥ ${config.requirements.minEthDeploy} ETH (仅部署 gas)`,
    current: `${walletStatus.ethBalance} ETH`,
    status: "pending",
    met: ethBalance >= requiredEth,
    actionLink: config.resources.ethFaucets?.[0],
    actionLabel: "获取 ETH",
    description:
      selectedOption === "standard"
        ? "Standard Flow 需要更多 ETH 用于 EntryPoint Stake 和 Deposit"
        : "Fast Flow 只需少量 ETH 用于支付合约部署的 gas 费用",
  });

  // GToken requirement
  const requiredGToken = parseFloat(config.requirements.minGTokenStake);
  items.push({
    id: "gtoken",
    label: "GToken (治理代币)",
    required: `≥ ${config.requirements.minGTokenStake} GToken`,
    current: `${walletStatus.gTokenBalance} GToken`,
    status: "pending",
    met: gTokenBalance >= requiredGToken,
    actionLink: "/get-gtoken",
    actionLabel: "获取 GToken",
    description: "用于在治理合约中进行 Stake，获得 Paymaster 运营资格",
  });

  // aPNTs requirement (only for Fast Flow)
  if (selectedOption === "fast") {
    const requiredAPNTs = parseFloat(config.requirements.minPntDeposit);
    items.push({
      id: "apnts",
      label: "aPNTs (AAStar 积分)",
      required: `≥ ${config.requirements.minPntDeposit} aPNT`,
      current: `${walletStatus.aPNTsBalance} aPNT`,
      status: "pending",
      met: aPNTsBalance >= requiredAPNTs,
      actionLink: "/get-pnts",
      actionLabel: "获取 aPNTs",
      description:
        "Fast Flow 使用 aPNTs 进行 Deposit，协议会自动将 GToken 转换为 ETH",
    });
  }

  return items;
}
