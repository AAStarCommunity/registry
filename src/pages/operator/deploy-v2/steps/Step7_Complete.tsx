import React from "react";
import type { DeployedResources } from "./Step4_DeployResources";
import "./Step7_Complete.css";

export interface Step7Props {
  paymasterAddress: string;
  communityName: string;
  owner: string;
  entryPointTxHash?: string;
  registryTxHash?: string;
  deployedResources?: DeployedResources;
}

export function Step7_Complete({
  paymasterAddress,
  communityName,
  owner,
  entryPointTxHash,
  registryTxHash,
  deployedResources,
}: Step7Props) {
  const handleViewOnExplorer = () => {
    window.open(`/paymaster/${paymasterAddress}`, "_blank");
  };

  const handleManage = () => {
    window.location.href = `/operator/manage?address=${paymasterAddress}`;
  };

  const handleViewOnEtherscan = () => {
    window.open(
      `https://sepolia.etherscan.io/address/${paymasterAddress}`,
      "_blank"
    );
  };

  const handleBackToHome = () => {
    window.location.href = "/operator";
  };

  return (
    <div className="step7-complete">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-icon">🎉</div>
        <h2>Paymaster Deployed Successfully!</h2>
        <p className="success-message">
          Your community Paymaster is now live and registered on the
          SuperPaymaster Registry.
        </p>
      </div>

      {/* Paymaster Summary */}
      <div className="paymaster-summary">
        <div className="summary-title">📋 Deployment Summary</div>
        <div className="summary-content">
          <div className="summary-item">
            <span className="label">Community Name:</span>
            <span className="value">{communityName}</span>
          </div>
          <div className="summary-item">
            <span className="label">Paymaster Address:</span>
            <span className="value address">{paymasterAddress}</span>
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(paymasterAddress);
                alert("Address copied to clipboard!");
              }}
              title="Copy address"
            >
              📋
            </button>
          </div>
          <div className="summary-item">
            <span className="label">Owner:</span>
            <span className="value address">{owner}</span>
          </div>
          {deployedResources?.sbtAddress && (
            <div className="summary-item">
              <span className="label">SBT Contract:</span>
              <span className="value address">{deployedResources.sbtAddress}</span>
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(deployedResources.sbtAddress);
                  alert("SBT address copied to clipboard!");
                }}
                title="Copy SBT address"
              >
                📋
              </button>
            </div>
          )}
          <div className="summary-item">
            <span className="label">MySBT Binding:</span>
            <span className="value">
              {deployedResources?.sbtAddress ? "✅ Bound" : "⏸️ Not Configured"}
            </span>
          </div>
          {deployedResources?.xPNTsAddress && (
            <div className="summary-item">
              <span className="label">xPNTs Token:</span>
              <span className="value address">{deployedResources.xPNTsAddress}</span>
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(deployedResources.xPNTsAddress);
                  alert("xPNTs address copied to clipboard!");
                }}
                title="Copy xPNTs address"
              >
                📋
              </button>
            </div>
          )}
          {deployedResources?.sGTokenAmount && (
            <div className="summary-item">
              <span className="label">Staked GToken:</span>
              <span className="value">{deployedResources.sGTokenAmount} sGToken</span>
            </div>
          )}
          {entryPointTxHash && (
            <div className="summary-item">
              <span className="label">EntryPoint Deposit TX:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${entryPointTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="value link"
              >
                {entryPointTxHash.slice(0, 10)}...{entryPointTxHash.slice(-8)}
              </a>
            </div>
          )}
          {registryTxHash && (
            <div className="summary-item">
              <span className="label">Registry Registration TX:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${registryTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="value link"
              >
                {registryTxHash.slice(0, 10)}...{registryTxHash.slice(-8)}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="actions-title">🚀 Quick Actions</div>
        <div className="actions-grid">
          <a
            href={`/operator/manage?address=${paymasterAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="action-card primary"
          >
            <div className="card-icon">⚙️</div>
            <div className="card-content">
              <div className="card-title">Manage Paymaster</div>
              <div className="card-description">
                Configure parameters, monitor balances, and manage your
                Paymaster
              </div>
            </div>
          </a>

          <a
            href={`/paymaster/${paymasterAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="action-card secondary"
          >
            <div className="card-icon">🔍</div>
            <div className="card-content">
              <div className="card-title">View in Registry</div>
              <div className="card-description">
                See your Paymaster listed in the public registry
              </div>
            </div>
          </a>

          {deployedResources?.sbtAddress && (
            <a
              href="/get-sbt"
              target="_blank"
              rel="noopener noreferrer"
              className="action-card secondary"
            >
              <div className="card-icon">🎫</div>
              <div className="card-content">
                <div className="card-title">MySBT Management</div>
                <div className="card-description">
                  Manage MySBT and community memberships
                </div>
              </div>
            </a>
          )}

          <a
            href={`https://sepolia.etherscan.io/address/${paymasterAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="action-card secondary"
          >
            <div className="card-icon">📊</div>
            <div className="card-content">
              <div className="card-title">View on Etherscan</div>
              <div className="card-description">
                Explore contract details and transactions
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Next Steps */}
      <div className="next-steps">
        <div className="steps-title">📚 Next Steps</div>
        <div className="steps-list">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <div className="step-title">Monitor Your Paymaster</div>
              <div className="step-description">
                Keep an eye on your EntryPoint balance and registry stake. Top
                up when needed.
              </div>
              <a
                href={`/operator/manage?address=${paymasterAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="step-link"
              >
                Manage Paymaster →
              </a>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-title">Integrate with Your DApp</div>
              <div className="step-description">
                Use the AAStar SDK to integrate gas sponsorship into your
                application.
              </div>
              <a
                href="/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="step-link"
              >
                View Integration Guide →
              </a>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <div className="step-title">Adjust Parameters</div>
              <div className="step-description">
                Fine-tune your service fee, gas price, and token requirements
                based on usage.
              </div>
              <a
                href={`/operator/manage?address=${paymasterAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="step-link"
              >
                Manage Paymaster →
              </a>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <div className="step-title">Monitor Treasury</div>
              <div className="step-description">
                Track service fee revenue collected in your treasury address.
              </div>
              <a
                href={`/operator/manage?address=${paymasterAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="step-link"
              >
                Manage Paymaster →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="resources">
        <div className="resources-title">💡 Helpful Resources</div>
        <div className="resources-grid">
          <a
            href="/operator/operate-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
          >
            📚 Operation Guide
          </a>
          <a
            href="/launch-tutorial"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
          >
            📖 Deployment Guide
          </a>
          <a
            href="https://docs.aastar.io/api#/"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
          >
            📋 API Reference
          </a>
          <a
            href="https://demo.aastar.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
          >
            🎮 Try Demo
          </a>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="bottom-actions">
        <button className="btn-secondary" onClick={handleBackToHome}>
          ← Back to Operator Portal
        </button>
        <button className="btn-primary" onClick={handleManage}>
          Manage Paymaster →
        </button>
      </div>
    </div>
  );
}
