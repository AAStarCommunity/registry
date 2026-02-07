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
 * Reverted to original industrial style to match /v3-admin
 */
export const PaymasterV4AdminPage: React.FC = () => {
  const { address, isConnected, network } = useWallet();
  const v4 = usePaymasterV4();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [stakeAmount, setStakeAmount] = useState('30');
  const [ownedPaymaster, setOwnedPaymaster] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  
  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://opsepolia.explorer.alchemy.com';

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
      setSuccess(`Paymaster deployed at ${result.paymasterAddress}!`);
      setOwnedPaymaster(result.paymasterAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      setLoading(true);
      setError(null);
      const tx = await v4.deposit(depositAmount);
      setTxHash(tx.hash);
      setSuccess(`Deposit successful: ${tx.hash}`);
      setDepositAmount('');
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
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
        <div style={{ marginBottom: '40px' }}>
          <OnboardingWizard />
        </div>
      )}

      {/* Faucet - Always available for testnet */}
      <div style={{ marginBottom: '40px' }}>
        <FaucetCard />
      </div>

      {/* Manual Deploy Section */}
      {!ownedPaymaster && (
        <section className="admin-section">
          <h2>🛠️ Manual Deployment</h2>
          <p>Configure and deploy a standalone Paymaster V4 instance.</p>
          
          <div className="info-box">
            <h3>What is PaymasterV4?</h3>
            <p>PaymasterV4 is a standalone contract that allows you to:</p>
            <ul>
              <li>Sponsor gasless transactions for your users</li>
              <li>Accept ERC-20 tokens for gas payment</li>
              <li>Maintain full control over your budget and policies</li>
            </ul>
          </div>

          <div className="config-form">
            <div className="form-group">
              <label>Stake Amount (sGT)</label>
              <input
                type="number"
                step="1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="30"
                disabled={loading}
              />
              <small>Minimum stake required: 30 sGT for AOA Status.</small>
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
            <p>💡 No PaymasterV4 contracts found. Deploy yours above!</p>
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
              
              {/* Deposit Section */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Deposit ETH for Gas</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="number" 
                      placeholder="ETH Amount" 
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button 
                      className="btn-primary btn-sm"
                      onClick={handleDeposit}
                      disabled={loading || !depositAmount}
                    >
                      {loading ? '...' : 'Deposit'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn-sm btn-outline" onClick={() => window.open(`${explorerUrl}/address/${ownedPaymaster}`, '_blank')}>
                  View Info ↗
                </button>
                <button 
                  className="btn-sm btn-outline"
                  onClick={() => alert('Settings configuration coming soon!')}
                >
                  Settings ⚙️
                </button>
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
            <p>Learn how to integrate PaymasterV4 into your dApp.</p>
            <a href="https://docs.aastar.io" target="_blank" rel="noopener noreferrer" className="btn-link">
              View Docs →
            </a>
          </div>
          
          <div className="action-card">
            <h3>🧪 Simulator</h3>
            <p>Test your paymaster in a sandbox environment.</p>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Coming Soon</span>
          </div>
        </div>
      </section>
    </div>
  );
};
