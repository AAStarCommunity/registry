/**
 * Step 4: Resource Preparation
 *
 * Displays checklist of required resources with real-time checking
 * and auto-refresh functionality
 */

import React, { useState, useEffect, useCallback } from "react";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import type { WalletStatus } from "../utils/walletChecker";
import {
  ChecklistItem,
  createChecklistItems,
  type ChecklistItemData,
  type CheckStatus,
} from "../components/ChecklistItem";
import "./Step4_ResourcePrep.css";

interface Step4Props {
  walletStatus: WalletStatus;
  selectedOption: "standard" | "super";
  onNext: () => void;
  onBack: () => void;
  onRefreshWallet: () => Promise<void>;
}

export const Step4_ResourcePrep: React.FC<Step4Props> = ({
  walletStatus,
  selectedOption,
  onNext,
  onBack,
  onRefreshWallet,
}) => {
  const config = getCurrentNetworkConfig();

  // Checklist items state
  const [items, setItems] = useState<ChecklistItemData[]>([]);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Last check time
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // Initialize checklist items
  useEffect(() => {
    const initialItems = createChecklistItems(
      walletStatus,
      config,
      selectedOption
    );
    setItems(initialItems);
    setLastCheckTime(new Date());
  }, [walletStatus, selectedOption, config]);

  // Auto-refresh countdown
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefreshAll();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Refresh all items
  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);

    // Set all items to checking state
    setItems((prevItems) =>
      prevItems.map((item) => ({ ...item, status: "checking" as CheckStatus }))
    );

    try {
      // Refresh wallet data from blockchain
      await onRefreshWallet();

      // Update items after a brief delay for visual feedback
      setTimeout(() => {
        const updatedItems = createChecklistItems(
          walletStatus,
          config,
          selectedOption
        );

        setItems(
          updatedItems.map((item) => ({
            ...item,
            status: item.met
              ? ("complete" as CheckStatus)
              : ("insufficient" as CheckStatus),
          }))
        );

        setLastCheckTime(new Date());
        setIsRefreshing(false);
        setCountdown(10);
      }, 800);
    } catch (error) {
      console.error("Failed to refresh wallet status:", error);
      setIsRefreshing(false);

      // Reset to previous state on error
      setItems((prevItems) =>
        prevItems.map((item) => ({
          ...item,
          status: item.met
            ? ("complete" as CheckStatus)
            : ("insufficient" as CheckStatus),
        }))
      );
    }
  }, [walletStatus, config, selectedOption, onRefreshWallet]);

  // Refresh single item
  const handleRefreshItem = useCallback(
    async (itemId: string) => {
      // Set specific item to checking
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, status: "checking" as CheckStatus }
            : item
        )
      );

      try {
        // Refresh wallet data
        await onRefreshWallet();

        // Update the specific item
        setTimeout(() => {
          setItems((prevItems) => {
            const updatedItems = createChecklistItems(
              walletStatus,
              config,
              selectedOption
            );
            return prevItems.map((item) => {
              if (item.id === itemId) {
                const updated = updatedItems.find((u) => u.id === itemId);
                if (updated) {
                  return {
                    ...updated,
                    status: updated.met
                      ? ("complete" as CheckStatus)
                      : ("insufficient" as CheckStatus),
                  };
                }
              }
              return item;
            });
          });
          setLastCheckTime(new Date());
        }, 600);
      } catch (error) {
        console.error(`Failed to refresh item ${itemId}:`, error);
        // Reset item status on error
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: item.met
                    ? ("complete" as CheckStatus)
                    : ("insufficient" as CheckStatus),
                }
              : item
          )
        );
      }
    },
    [walletStatus, config, selectedOption, onRefreshWallet]
  );

  // Check if all resources are ready
  const allReady = items.every((item) => item.met);
  const readyCount = items.filter((item) => item.met).length;
  const totalCount = items.length;
  const progressPercent = Math.round((readyCount / totalCount) * 100);

  // Format last check time
  const formatLastCheck = () => {
    if (!lastCheckTime) return "Not checked";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastCheckTime.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastCheckTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="step4-resource-prep">
      {/* Header */}
      <div className="step4-header">
        <h2>Prepare Resources</h2>
        <p className="step4-description">
          Ensure your wallet has the following resources. We'll check your balance in real-time to meet{" "}
          <strong>
            {selectedOption === "standard"
              ? "Standard ERC-4337 Flow"
              : "Super Mode"}
          </strong>{" "}
          requirements.
        </p>
      </div>

      {/* Progress Summary */}
      <div className="progress-summary">
        <div className="progress-header">
          <div className="progress-title">
            <span className="progress-icon">
              {allReady ? "✅" : "⏳"}
            </span>
            <h3>
              {allReady ? "所有资源已就绪！" : `准备进度: ${readyCount}/${totalCount}`}
            </h3>
          </div>
          <span className="progress-percent">{progressPercent}%</span>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {allReady && (
          <p className="progress-message success">
            🎉 太好了！您已经准备好所有必需的资源，可以继续部署流程了。
          </p>
        )}

        {!allReady && (
          <p className="progress-message pending">
            还需要准备 {totalCount - readyCount}{" "}
            项资源。点击下方的"获取"按钮查看如何获取这些资源。
          </p>
        )}
      </div>

      {/* Refresh Controls */}
      <div className="refresh-controls">
        <div className="refresh-info">
          <span className="refresh-label">上次检查:</span>
          <span className="refresh-time">{formatLastCheck()}</span>
        </div>

        <div className="refresh-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="toggle-label">
              自动刷新
              {autoRefresh && ` (${countdown}s)`}
            </span>
          </label>

          <button
            className="refresh-button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <span className="button-icon">🔄</span>
            <span className="button-text">
              {isRefreshing ? "检查中..." : "立即刷新"}
            </span>
          </button>
        </div>
      </div>

      {/* Checklist */}
      <div className="resource-checklist">
        <h3 className="checklist-title">📋 资源清单</h3>
        <div className="checklist-items">
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onRefresh={handleRefreshItem}
            />
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="help-tip">
        <div className="help-icon">💡</div>
        <div className="help-content">
          <h4>提示</h4>
          <p>
            如果您的资源不足，请点击各项旁边的"获取"按钮查看详细指南。获取资源后，点击"刷新"按钮更新状态，或开启"自动刷新"功能让系统每
            10 秒自动检查一次。
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="step4-navigation">
        <button onClick={onBack} className="nav-button back">
          ← 上一步
        </button>

        <button
          onClick={onNext}
          className="nav-button next"
          disabled={!allReady}
        >
          {allReady ? "继续部署 →" : "资源未就绪"}
        </button>
      </div>

      {/* Additional Info */}
      <details className="additional-info">
        <summary>❓ 为什么需要这些资源？</summary>
        <div className="info-content">
          <h4>资源说明</h4>

          <div className="info-section">
            <h5>ETH (以太币)</h5>
            <p>
              {selectedOption === "standard"
                ? "Standard Flow 需要较多 ETH：用于支付合约部署 gas 费用、向 EntryPoint 进行 Stake、以及为 gas sponsorship 进行 Deposit。"
                : "Fast Flow 只需少量 ETH，仅用于支付合约部署的 gas 费用（约 0.02 ETH）。"}
            </p>
          </div>

          <div className="info-section">
            <h5>GToken (治理代币)</h5>
            <p>
              GToken 是 SuperPaymaster
              协议的治理代币。所有 Operator 都必须 Stake 至少 {config.requirements.minGTokenStake}{" "}
              GToken 到治理合约中，才能获得运营 Paymaster 的资格。
            </p>
          </div>

          {selectedOption === "fast" && (
            <div className="info-section">
              <h5>PNTs (协议积分)</h5>
              <p>
                PNTs 用于 Fast Flow 的 Deposit 操作。当您 Deposit PNTs
                时，协议会自动将您的 GToken 转换为 ETH 并 Stake 到
                EntryPoint，简化了操作流程。
              </p>
            </div>
          )}

          <div className="info-section">
            <h5>获取资源</h5>
            <ul>
              <li>
                <strong>ETH:</strong> 可通过{" "}
                {config.chainId === 11155111 ? "测试网 Faucet" : "交易所购买"}{" "}
                获取
              </li>
              <li>
                <strong>GToken:</strong> 查看{" "}
                <a href="/get-gtoken" target="_blank" rel="noopener noreferrer">
                  GToken 获取指南
                </a>
              </li>
              {selectedOption === "fast" && (
                <li>
                  <strong>PNTs:</strong> 查看{" "}
                  <a href="/get-pnts" target="_blank" rel="noopener noreferrer">
                    PNTs 获取指南
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
};
