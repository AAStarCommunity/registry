import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { parseEther, formatEther, type Address } from 'viem';
import './PaymasterV4AdminPage.css';

/**
 * PaymasterV4 Admin Page - Simplified Implementation
 * 
 * 功能:
 * - 部署 PaymasterV4 合约（通过 OperatorLifecycle）
 * - 查询已部署的 Paymaster 列表
 * - 基础管理功能（充值、查询状态）
 */
export const PaymasterV4AdminPage: React.FC = () => {
  const { address, isConnected, chainId, network } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [stakeAmount, setStakeAmount] = useState('10');
  const [deployedPaymasters, setDeployedPaymasters] = useState<string[]>([]);
  
  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://etherscan.io';

  // 部署 PaymasterV4
  const handleDeploy = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);

      const { OperatorLifecycle } = await import('@aastar/sdk');
      const { createPublicClient, createWalletClient, custom, http } = await import('viem');
      const { sepolia } = await import('viem/chains');
      const { getContracts } = await import('@aastar/core');

      const contracts = getContracts('sepolia');
      
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http('https://rpc.sepolia.org'),
      });
      
      const walletClient = createWalletClient({
        account: address as Address,
        chain: sepolia,
        transport: custom(window.ethereum!),
      });

      // Create OperatorLifecycle instance
      const operator = new OperatorLifecycle({
        client: walletClient,
        publicClient,
        superPaymasterAddress: contracts.core.superPaymaster,
        gTokenAddress: contracts.core.gtoken,
        gTokenStakingAddress: contracts.core.gTokenStaking,
        registryAddress: contracts.core.registry,
        entryPointAddress: contracts.official.entryPoint,
        paymasterFactoryAddress: contracts.core.paymasterFactory,
        ethUsdPriceFeedAddress: contracts.core.ethUsdPriceFeed,
        xpntsFactoryAddress: contracts.core.xPNTsFactory,
      });

      console.log('Deploying PaymasterV4...');
      const hashes = await operator.setupNode({
        type: 'V4',
        stakeAmount: parseEther(stakeAmount),
      });

      setTxHash(hashes[0]);
      setSuccess(`PaymasterV4 deployed successfully! ${hashes.length} transactions.`);
      
      // TODO: 从事件中提取新部署的PaymasterV4地址
      console.log('Deployment hashes:', hashes);

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

      {/* Deploy New Paymaster */}
      <section className="admin-section">
        <h2>🆕 Deploy New PaymasterV4</h2>
        <p>Deploy a new PaymasterV4 contract. This will create an independent paymaster instance for your operations.</p>
        
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
              placeholder="10"
              disabled={loading}
            />
            <small>Minimum stake required for V4 registration</small>
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

      {/* My Paymasters */}
      <section className="admin-section">
        <h2>📋 My PaymasterV4 Contracts</h2>
        <p><em>Coming soon: Query and display your deployed PaymasterV4 contracts.</em></p>
        
        {deployedPaymasters.length === 0 ? (
          <div className="empty-state">
            <p>💡 No PaymasterV4 contracts found. Deploy your first one above!</p>
            <small>Note: After deployment, contracts will appear here automatically.</small>
          </div>
        ) : (
          <div className="paymaster-list">
            {deployedPaymasters.map((addr, i) => (
              <div key={i} className="paymaster-card">
                <div className="card-header">
                  <span className="address">{addr}</span>
                  <span className="status active">✅ Active</span>
                </div>
                <div className="card-body">
                  <div className="stat">
                    <label>Deposit:</label>
                    <span>-- ETH</span>
                  </div>
                  <div className="stat">
                    <label>Configured Tokens:</label>
                    <span>--</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm">Deposit</button>
                  <button className="btn-sm">Configure</button>
                  <button className="btn-sm">Withdraw</button>
                </div>
              </div>
            ))}
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
