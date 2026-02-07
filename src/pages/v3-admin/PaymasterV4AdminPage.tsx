import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { usePaymasterV4 } from '../../hooks/usePaymasterV4';
import { OnboardingWizard } from '../../components/v3-admin/OnboardingWizard';
import { FaucetCard } from '../../components/v3-admin/FaucetCard';
import { parseEther } from 'viem';
import './PaymasterV4AdminPage.css';

/**
 * PaymasterV4 Admin Page
 * 
 * 功能:
 * - 部署 PaymasterV4 合约（通过 OperatorLifecycle/PaymasterOperatorClient）
 * - 查询已部署的 Paymaster 列表
 * - 基础管理功能（充值、查询状态）
 */
export const PaymasterV4AdminPage: React.FC = () => {
  const { address, isConnected, network } = useWallet();
  const v4 = usePaymasterV4();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [stakeAmount, setStakeAmount] = useState('30'); // Default for AOA is 30
  const [ownedPaymaster, setOwnedPaymaster] = useState<string | null>(null);
  
  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://opsepolia.explorer.alchemy.com'; // Adjust for OP Sepolia

  // Load owned paymaster on mount
  useEffect(() => {
    if (isConnected && address) {
      loadOwnedPaymaster();
    }
  }, [isConnected, address]);

  const loadOwnedPaymaster = async () => {
    try {
      const addr = await v4.getOwnedPaymaster();
      setOwnedPaymaster(addr);
    } catch (err) {
      console.error('Failed to load paymaster', err);
    }
  };

  // 部署 PaymasterV4
  const handleDeploy = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);

      const result = await v4.deployPaymaster({
        stakeAmount: parseEther(stakeAmount)
      });
      
      setTxHash(result.deployHash);
      setSuccess(`Paymaster deployed at ${result.paymasterAddress}! Role registration: ${result.registerHash}`);
      setOwnedPaymaster(result.paymasterAddress);

    } catch (err) {
      console.error('Deployment failed:', err);
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="v4-admin">
        <div className="connect-prompt">
          <h2>🔌 Connect Wallet</h2>
          <p>Please connect your wallet to access PaymasterV4 Admin functions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v4-admin">
      <h1>🚀 PaymasterV4 Admin</h1>
      <p className="page-description">
        Deploy and manage your PaymasterV4 contracts for gasless transactions.
      </p>

      {/* Messages */}
      {error && <p className="error">❌ {error}</p>}
      {success && <p className="success">✅ {success}</p>}
      {txHash && (
        <p className="tx-link">
          <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View Transaction ↗
          </a>
        </p>
      )}

      {/* Onboarding Wizard - Show if not deployed */}
      {!ownedPaymaster && (
        <div className="mb-10">
          <OnboardingWizard />
        </div>
      )}

      {/* Faucet - Show for testnet users */}
      <div className="mb-10">
        <FaucetCard />
      </div>

      {/* Manual Deploy Section - Optional/Advanced */}
      {!ownedPaymaster && (
        <section className="admin-section">
          <h2>🛠️ Advanced: Manual Deployment</h2>
          <p>If you prefer to manually configure your Paymaster V4 instance.</p>
          
          <div className="info-box">
            <h3>What is PaymasterV4?</h3>
            <p>PaymasterV4 is a standalone paymaster contract that allows you to:</p>
            <ul>
              <li>Sponsor gasless transactions for your users</li>
              <li>Accept ERC-20 tokens for gas payment</li>
              <li>Configure custom pricing oracles</li>
              <li>Full control over your paymaster's budget and policies</li>
            </ul>
          </div>

          <div className="config-form">
            <div className="form-group">
              <label>Stake Amount (GToken)</label>
              <input
                type="number"
                step="0.01"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="30"
                disabled={loading}
              />
              <small>Minimum stake required: 30 GToken for AOA Status</small>
            </div>

            <button
              className="btn-primary"
              onClick={handleDeploy}
              disabled={loading || !stakeAmount}
            >
              {loading ? 'Deploying...' : '🚀 Deploy PaymasterV4'}
            </button>
          </div>
        </section>
      )}

      {/* My Paymasters */}
      <section className="admin-section">
        <h2>📋 My PaymasterV4 Contracts</h2>
        
        {!ownedPaymaster ? (
          <div className="empty-state">
            <p>💡 No PaymasterV4 contracts found. Deploy your first one above!</p>
            <small>Note: After deployment, contracts will appear here automatically.</small>
          </div>
        ) : (
          <div className="paymaster-list">
            <div className="paymaster-card">
              <div className="card-header">
                <span className="address monospace">{ownedPaymaster}</span>
                <span className="status active">✅ Active</span>
              </div>
              <div className="card-body">
                <div className="stat">
                  <label>Role:</label>
                  <span>ROLE_PAYMASTER_AOA</span>
                </div>
                <div className="stat">
                  <label>Type:</label>
                  <span>Standalone Paymaster V4</span>
                </div>
              </div>
              <div className="card-actions">
                <button className="btn-sm btn-outline">Deposit ETH</button>
                <button className="btn-sm btn-outline" onClick={() => window.open(`${explorerUrl}/address/${ownedPaymaster}`, '_blank')}>
                  View Info ↗
                </button>
                <button className="btn-sm btn-outline">Settings</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="admin-section">
        <h2>⚡ Quick Actions</h2>
        <div className="quick-actions">
          <div className="action-card">
            <h3>📖 Documentation</h3>
            <p>Learn how to integrate PaymasterV4 into your dApp</p>
            <a href="https://docs.aastar.io" target="_blank" rel="noopener noreferrer" className="btn-link">
              View Docs →
            </a>
          </div>
          
          <div className="action-card">
            <h3>🧪 Test Gasless Tx</h3>
            <p>Test your paymaster with a sample gasless transaction</p>
            <button className="btn-link" disabled>Coming Soon</button>
          </div>
        </div>
      </section>
    </div>
  );
};
