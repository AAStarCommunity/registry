import React from "react";
import type { WalletStatus as WalletStatusType } from "../utils/walletChecker";
import { formatBalance } from "../utils/walletChecker";
import "./WalletStatus.css";

export interface WalletStatusProps {
  status: WalletStatusType;
  onGetGToken?: () => void;
  onGetPNTs?: () => void;
  onGetETH?: () => void;
}

/**
 * WalletStatus Component
 *
 * Displays wallet balance check results with visual indicators
 * Provides action buttons for acquiring missing resources
 */
export function WalletStatus({
  status,
  onGetGToken,
  onGetPNTs,
  onGetETH,
}: WalletStatusProps) {
  if (!status.isConnected) {
    return (
      <div className="wallet-status disconnected">
        <div className="status-icon">🔌</div>
        <div className="status-message">Wallet not connected</div>
      </div>
    );
  }

  return (
    <div className="wallet-status connected">
      {/* Wallet Address */}
      <div className="wallet-address-section">
        <div className="section-title">Connected Wallet</div>
        <div className="wallet-address">
          <span className="address-icon">👛</span>
          <span className="address-text">
            {status.address.slice(0, 6)}...{status.address.slice(-4)}
          </span>
          <button
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(status.address)}
            title="Copy address"
          >
            📋
          </button>
        </div>
      </div>

      {/* Balance Checks */}
      <div className="balance-checks">
        <div className="section-title">Resource Balance Check</div>

        {/* ETH Balance */}
        <div className={`balance-item ${status.hasEnoughETH ? "sufficient" : "insufficient"}`}>
          <div className="balance-header">
            <div className="balance-name">
              <span className={status.hasEnoughETH ? "icon-success" : "icon-error"}>
                {status.hasEnoughETH ? "✅" : "❌"}
              </span>
              <span>ETH Balance</span>
            </div>
            <div className="balance-value">
              {formatBalance(status.ethBalance)} ETH
            </div>
          </div>
          <div className="balance-details">
            <span className="balance-required">
              Required: {status.requiredETH} ETH
            </span>
            {!status.hasEnoughETH && (
              <div className="balance-action">
                <button
                  className="action-button"
                  onClick={onGetETH}
                  disabled={!onGetETH}
                >
                  Get ETH →
                </button>
              </div>
            )}
          </div>
          {!status.hasEnoughETH && (
            <div className="balance-help">
              You need ETH for contract deployment and gas fees
            </div>
          )}
        </div>

        {/* stGToken Balance */}
        <div className={`balance-item ${status.hasEnoughGToken ? "sufficient" : "insufficient"}`}>
          <div className="balance-header">
            <div className="balance-name">
              <span className={status.hasEnoughGToken ? "icon-success" : "icon-error"}>
                {status.hasEnoughGToken ? "✅" : "❌"}
              </span>
              <span>stGToken Balance</span>
            </div>
            <div className="balance-value">
              {formatBalance(status.gTokenBalance)} stGToken
            </div>
          </div>
          <div className="balance-details">
            <span className="balance-required">
              Required: {status.requiredGToken} stGToken
            </span>
            {!status.hasEnoughGToken && (
              <div className="balance-action">
                <button
                  className="action-button"
                  onClick={onGetGToken}
                  disabled={!onGetGToken}
                >
                  Get stGToken →
                </button>
              </div>
            )}
          </div>
          {!status.hasEnoughGToken && (
            <div className="balance-help">
              Staked GToken credential. Lock 30+ stGToken to join SuperPaymaster (more = higher reputation)
            </div>
          )}
        </div>

        {/* aPNTs Balance */}
        <div className={`balance-item ${status.hasEnoughPNTs ? "sufficient" : "insufficient"}`}>
          <div className="balance-header">
            <div className="balance-name">
              <span className={status.hasEnoughPNTs ? "icon-success" : "icon-error"}>
                {status.hasEnoughPNTs ? "✅" : "❌"}
              </span>
              <span>aPNTs Balance</span>
            </div>
            <div className="balance-value">
              {formatBalance(status.pntsBalance)} aPNT
            </div>
          </div>
          <div className="balance-details">
            <span className="balance-required">
              Required: {status.requiredPNTs} aPNT
            </span>
            {!status.hasEnoughPNTs && (
              <div className="balance-action">
                <button
                  className="action-button"
                  onClick={onGetPNTs}
                  disabled={!onGetPNTs}
                >
                  Get aPNTs →
                </button>
              </div>
            )}
          </div>
          {!status.hasEnoughPNTs && (
            <div className="balance-help">
              Advanced PNTs for SuperPaymaster. 1000+ aPNTs required (purchase from AAStar Community)
            </div>
          )}
        </div>
      </div>

      {/* Contract Deployment Status */}
      <div className="contract-status">
        <div className="section-title">Optional Contracts</div>
        <div className="contract-info">
          These contracts will be deployed in Step 6 (Post-Configuration)
        </div>

        <div className="contract-item">
          <div className="contract-header">
            <span className={status.hasSBTContract ? "icon-success" : "icon-warning"}>
              {status.hasSBTContract ? "✅" : "⚠️"}
            </span>
            <span className="contract-name">SBT Contract</span>
          </div>
          <div className="contract-status-text">
            {status.hasSBTContract ? (
              <>
                <span className="status-deployed">Deployed</span>
                <span className="contract-address">
                  {status.sbtContractAddress?.slice(0, 6)}...
                  {status.sbtContractAddress?.slice(-4)}
                </span>
              </>
            ) : (
              <span className="status-not-deployed">Not deployed yet</span>
            )}
          </div>
          <div className="contract-help">
            SBT (Soulbound Token) for user identity verification
          </div>
        </div>

        <div className="contract-item">
          <div className="contract-header">
            <span className={status.hasGasTokenContract ? "icon-success" : "icon-warning"}>
              {status.hasGasTokenContract ? "✅" : "⚠️"}
            </span>
            <span className="contract-name">GasToken Contract</span>
          </div>
          <div className="contract-status-text">
            {status.hasGasTokenContract ? (
              <>
                <span className="status-deployed">Deployed</span>
                <span className="contract-address">
                  {status.gasTokenAddress?.slice(0, 6)}...
                  {status.gasTokenAddress?.slice(-4)}
                </span>
              </>
            ) : (
              <span className="status-not-deployed">Not deployed yet</span>
            )}
          </div>
          <div className="contract-help">
            Custom gas token for gas payment abstraction
          </div>
        </div>
      </div>

      {/* Overall Status Summary */}
      <div className="status-summary">
        {status.hasEnoughETH && status.hasEnoughGToken ? (
          <div className="summary-success">
            <span className="summary-icon">🎉</span>
            <span className="summary-text">
              All required resources are available! You can proceed to the next step.
            </span>
          </div>
        ) : (
          <div className="summary-warning">
            <span className="summary-icon">⚠️</span>
            <span className="summary-text">
              Some resources are missing. Please acquire them before proceeding.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
