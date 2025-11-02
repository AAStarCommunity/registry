import React from "react";
import type { WalletStatus as WalletStatusType } from "../utils/walletChecker";
import { formatBalance } from "../utils/walletChecker";
import { getExplorerLink } from "../../../../config/networkConfig";
import "./WalletStatus.css";

export interface WalletStatusProps {
  status: WalletStatusType;
  gTokenAddress?: string;
  onGetGToken?: () => void;
  onGetPNTs?: () => void;
  onGetETH?: () => void;
  onRefresh?: () => void;
}

/**
 * WalletStatus Component
 *
 * Displays wallet balance check results with visual indicators
 * Provides action buttons for acquiring missing resources
 */
export function WalletStatus({
  status,
  gTokenAddress,
  onGetGToken,
  onGetPNTs,
  onGetETH,
  onRefresh,
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
        <div className="section-title-row">
          <div className="section-title">Resource Balance Check</div>
          {onRefresh && (
            <button className="refresh-button-inline" onClick={onRefresh} title="Refresh balances">
              🔄 Refresh
            </button>
          )}
        </div>

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

        {/* GToken Balance */}
        <div className={`balance-item ${status.hasEnoughGToken ? "sufficient" : "insufficient"}`}>
          <div className="balance-header">
            <div className="balance-name">
              <span className={status.hasEnoughGToken ? "icon-success" : "icon-error"}>
                {status.hasEnoughGToken ? "✅" : "❌"}
              </span>
              <span>GToken Balance</span>
            </div>
            <div className="balance-value">
              {formatBalance(status.gTokenBalance)} GToken
            </div>
          </div>
          {gTokenAddress && (
            <div className="contract-address-row" style={{
              fontSize: '0.8rem',
              color: '#666',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>Contract:</span>
              <a
                href={getExplorerLink(gTokenAddress, 'address')}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'Monaco, Courier New, monospace',
                  color: '#667eea',
                  textDecoration: 'none',
                }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {gTokenAddress.slice(0, 6)}...{gTokenAddress.slice(-4)} ↗
              </a>
            </div>
          )}
          <div className="balance-details">
            <span className="balance-required">
              Required: {status.requiredGToken} GToken
            </span>
            {!status.hasEnoughGToken && (
              <div className="balance-action">
                <button
                  className="action-button"
                  onClick={onGetGToken}
                  disabled={!onGetGToken}
                >
                  Get GToken →
                </button>
              </div>
            )}
          </div>
          {!status.hasEnoughGToken && (
            <div className="balance-help">
              {status.isCommunityRegistered
                ? `Governance token required: 300 GToken to stake and lock for Paymaster registration.`
                : `Governance token required: 30 GToken (register community) + 300 GToken (register Paymaster) = 330 GToken to stake and lock.`}
            </div>
          )}
        </div>

        {/* aPNTs Balance */}
        <div className={`balance-item ${
          parseFloat(status.requiredAPNTs) === 0
            ? "optional"
            : status.hasEnoughAPNTs ? "sufficient" : "insufficient"
        }`}>
          <div className="balance-header">
            <div className="balance-name">
              <span className={
                parseFloat(status.requiredAPNTs) === 0
                  ? "icon-info"
                  : status.hasEnoughAPNTs ? "icon-success" : "icon-error"
              }>
                {parseFloat(status.requiredAPNTs) === 0
                  ? "ℹ️"
                  : status.hasEnoughAPNTs ? "✅" : "❌"}
              </span>
              <span>aPNTs Balance</span>
            </div>
            <div className="balance-value">
              {formatBalance(status.aPNTsBalance)} aPNT
            </div>
          </div>
          <div className="balance-details">
            <span className="balance-required">
              {parseFloat(status.requiredAPNTs) === 0
                ? "Not required for AOA mode"
                : `Required: ${status.requiredAPNTs} aPNT`}
            </span>
            {!status.hasEnoughAPNTs && parseFloat(status.requiredAPNTs) > 0 && (
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
          {parseFloat(status.requiredAPNTs) === 0 ? (
            <div className="balance-help">
              aPNTs only required for AOA+ (Super Mode). Not needed for AOA mode.
            </div>
          ) : !status.hasEnoughAPNTs && (
            <div className="balance-help">
              Advanced PNTs for SuperPaymaster (1000+ aPNTs required)
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
            <span className={status.hasGasTokenContract ? "icon-success" : "icon-info"}>
              {status.hasGasTokenContract ? "✅" : "ℹ️"}
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
