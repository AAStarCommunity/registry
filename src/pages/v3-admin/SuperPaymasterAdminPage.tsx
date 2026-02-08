import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import { useRegistry } from '../../hooks/useRegistry';
import { parseEther, formatEther, type Address, type Hex } from 'viem';
import './SuperPaymasterAdminPage.css';

type Tab = 'manage' | 'exit';

/**
 * SuperPaymaster Admin Page - REAL Implementation
 * 
 * 功能:
 * - Tab 1: 注册成为 Operator（质押 GToken + registerRoleSelf）
 * - Tab 2: 管理 Operator 配置（修改 aPNTs 余额限制）
 * - Tab 3: 退出 Operator（unstake + 扣除 exit fee）
 */
export const SuperPaymasterAdminPage: React.FC = () => {
  const { address, isConnected, chainId, network } = useWallet();
  const registry = useRegistry();
  
  
  const [activeTab, setActiveTab] = useState<Tab>('manage');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  // Operator 状态
  const [isOperator, setIsOperator] = useState(false);
  const [roleConfig, setRoleConfig] = useState<any>(null);
  
  // Register Tab 状态
  const [stakeAmount, setStakeAmount] = useState('50');
  
  // Manage Tab 状态
  const [operatorAddress, setOperatorAddress] = useState('');
  const [newBalance, setNewBalance] = useState('');
  
  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://etherscan.io';

  // 检查用户是否已是 Operator
  useEffect(() => {
    if (!isConnected || !address || !network) return;

    const checkOperatorStatus = async () => {
      try {
        const ids = await registry.getRoleIds();
        const hasRole = await registry.hasRole(ids.ROLE_PAYMASTER_SUPER, address as Address);
        setIsOperator(hasRole);
        
        if (hasRole) {
          const config = await registry.getRoleConfig(ids.ROLE_PAYMASTER_SUPER);
          setRoleConfig(config);
        }
      } catch (err) {
        console.error('Failed to check operator status:', err);
      }
    };

    checkOperatorStatus();
  }, [isConnected, address, network]);

  // 退出 Operator
  const handleExit = async () => {
    if (!address) return;

    if (!confirm('⚠️ WARNING: Exiting will unstake your GToken and burn your Operator role. An exit fee will be deducted. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);

      // TODO: SDK类型兼容性问题待解决
      setError('Operator exit coming soon. SDK type compatibility needs to be resolved.');
      

    } catch (err) {
      console.error('Failed to exit:', err);
      setError(err instanceof Error ? err.message : 'Exit failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="superpaymaster-admin">
        <div className="connect-prompt">
          <h2>🔌 Connect Wallet</h2>
          <p>Please connect your wallet to access SuperPaymaster Admin functions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superpaymaster-admin">
      <h1>⚡ SuperPaymaster Admin</h1>
      <p className="page-description">
        Manage your Operator lifecycle: Register, configure, and exit.
      </p>

      {/* Status Banner */}
      <div className={`status-banner ${isOperator ? 'active' : 'inactive'}`}>
        {isOperator ? (
          <>
            <span className="status-icon">✅</span>
            <div>
              <strong>Operator Status: Active</strong>
              <p>You are registered as ROLE_PAYMASTER_SUPER</p>
            </div>
          </>
        ) : (
          <div className="launchpad-redirect">
             <div className="info-box" style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💎</div>
                <h2>Not Registered as Operator</h2>
                <p style={{ marginBottom: '2rem' }}>
                  You are not a SuperPaymaster Operator yet. <br/>
                  Visit the Launchpad to get started.
                </p>
                <Link to="/v3-admin/launch" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Go to Launchpad
                </Link>
              </div>
          </div>
        )}
      </div>

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

      {/* Tab Navigation */}
      {isOperator && (
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            ⚙️ Manage
          </button>
          <button
            className={`tab ${activeTab === 'exit' ? 'active' : ''}`}
            onClick={() => setActiveTab('exit')}
          >
            🚪 Exit
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">


        {activeTab === 'manage' && (
          <section className="admin-section">
            <h2>⚙️ Manage Operator Configuration</h2>
            <p><em>Coming soon: Manage aPNTs balance limits, oracle settings, etc.</em></p>
            
            <div className="info-box">
              <p>💡 This feature will allow you to modify your Operator configuration in SuperPaymaster contract.</p>
              <p>Available actions:</p>
              <ul>
                <li>Update aPNTs balance limits</li>
                <li>Configure price oracle</li>
                <li>Modify operator parameters</li>
              </ul>
            </div>
          </section>
        )}

        {activeTab === 'exit' && (
          <section className="admin-section danger-zone">
            <h2>🚪 Exit Operator Role</h2>
            <p><strong>DANGER ZONE:</strong> Exiting will unstake your GToken and burn your Operator role SBT.</p>
            
            {roleConfig && (
              <div className="warning-box">
                <h3>⚠️ Exit Consequences</h3>
                <ul>
                  <li><strong>Exit Fee:</strong> {roleConfig.exitFeePercent}% will be deducted from your stake</li>
                  <li><strong>Min Exit Fee:</strong> At least {formatEther(roleConfig.minExitFee)} GToken</li>
                  <li><strong>Role SBT:</strong> Will be burned (irreversible)</li>
                  <li><strong>Lock Period:</strong> May apply (check roleLockDuration)</li>
                </ul>
              </div>
            )}

            <button
              className="btn-danger"
              onClick={handleExit}
              disabled={loading || !isOperator}
            >
              {loading ? 'Exiting...' : 'Exit Operator Role'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
