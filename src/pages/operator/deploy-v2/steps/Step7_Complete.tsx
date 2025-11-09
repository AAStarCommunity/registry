import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import type { DeployedResources } from "./Step4_DeployResources";
import { getProvider } from "../../../../utils/rpc-provider";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { RegistryABI } from "../../../../config/abis";
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
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isCheckingRegistry, setIsCheckingRegistry] = useState(true);

  // Check if paymaster is registered in Registry
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const provider = getProvider();
        const networkConfig = getCurrentNetworkConfig();
        const registryAddress = networkConfig.contracts.registry;

        const registry = new ethers.Contract(registryAddress, RegistryABI, provider);

        // Check if owner has a registered community with this paymaster
        const profile = await registry.getCommunityProfile(owner);

        // Check if paymasterAddress matches
        const registered = profile.paymasterAddress &&
          profile.paymasterAddress.toLowerCase() === paymasterAddress.toLowerCase();

        setIsRegistered(registered);
      } catch (err) {
        console.error("Failed to check Registry:", err);
        setIsRegistered(false);
      } finally {
        setIsCheckingRegistry(false);
      }
    };

    checkRegistration();
  }, [owner, paymasterAddress]);

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

  const handleRegisterToRegistry = () => {
    // Navigate to register-community page with pre-filled data
    window.location.href = `/register-community?paymaster=${paymasterAddress}&owner=${owner}`;
  };

  return (
    <div className="step7-complete">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-icon">🎉</div>
        <h2>Paymaster Deployed Successfully!</h2>
        <p className="success-message">
          Your community Paymaster is now live{isRegistered && " and registered on the SuperPaymaster Registry"}.
        </p>
      </div>

      {/* Registry Warning Card - Show if not registered */}
      {!isCheckingRegistry && isRegistered === false && (
        <div style={{
          background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#92400e', fontSize: '1.25rem', fontWeight: 700 }}>
                Registry Registration Required
              </h3>
              <p style={{ margin: 0, marginBottom: '1rem', color: '#b45309', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Your Paymaster has been deployed successfully, but it's <strong>not yet registered in the Registry</strong>.
                To make your Paymaster discoverable and enable full functionality, you need to register your community.
              </p>
              <div style={{
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#78350f'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📋 Benefits of Registry Registration:</div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>Your Paymaster appears in public explorer</li>
                  <li>Users can discover and interact with your community</li>
                  <li>Required for MySBT binding and xPNTs integration</li>
                  <li>Enables reputation tracking and analytics</li>
                </ul>
              </div>
              <button
                onClick={handleRegisterToRegistry}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d97706';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f59e0b';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                🚀 Register to Community Registry Now
              </button>
            </div>
          </div>
        </div>
      )}

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
