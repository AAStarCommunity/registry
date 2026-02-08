import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../../contexts/WalletContext';
import { usePaymasterV4 } from '../../hooks/usePaymasterV4';
import { useRegistry } from '../../hooks/useRegistry';
import { parseEther, formatEther, type Address } from 'viem';
import { OnboardingWizard } from '../../components/v3-admin/OnboardingWizard';
import './PaymasterLaunchPage.css';

/**
 * Paymaster Launch Page
 * Centralized launchpad for deploying PaymasterV4 and registering as SuperPaymaster Operator.
 */
export const PaymasterLaunchPage: React.FC = () => {
  const { address, isConnected, network } = useWallet();
  const v4 = usePaymasterV4();
  const registry = useRegistry();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  // States for deployment/registration
  const [stakeAmountV4, setStakeAmountV4] = useState('30');
  const [stakeAmountSuper, setStakeAmountSuper] = useState('50');
  const [ownedPaymaster, setOwnedPaymaster] = useState<string | null>(null);
  const [isSuperOperator, setIsSuperOperator] = useState(false);
  const [roleConfig, setRoleConfig] = useState<any>(null);

  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : network === 'op-sepolia' 
      ? 'https://opsepolia.explorer.alchemy.com'
      : 'https://etherscan.io';

  const isTestnet = network === 'sepolia' || network === 'op-sepolia';

  useEffect(() => {
    if (isConnected && address) {
      checkStatus();
    }
  }, [isConnected, address]);

  const checkStatus = async () => {
    try {
      // Check PaymasterV4 status
      const addr = await v4.getOwnedPaymaster();
      setOwnedPaymaster(addr);

      // Check SuperPaymaster status
      const ids = await registry.getRoleIds();
      const hasRole = await registry.hasRole(ids.ROLE_PAYMASTER_SUPER, address as Address);
      setIsSuperOperator(hasRole);
      
      if (!hasRole) {
        const config = await registry.getRoleConfig(ids.ROLE_PAYMASTER_SUPER);
        setRoleConfig(config);
      }
    } catch (err) {
      console.error('Failed to check status', err);
    }
  };

  const handleDeployV4 = async () => {
    if (!address) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);
      const result = await v4.deployPaymaster({
        stakeAmount: parseEther(stakeAmountV4)
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

  const handleRegisterSuper = async () => {
    if (!address) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);

      setError('Operator registration coming soon. SDK type compatibility needs to be resolved.');
      // Actual implementation would go here similar to SuperPaymasterAdminPage logic
      
    } catch (err) {
      console.error('Failed to register:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="paymaster-launch">
        <div className="connect-prompt">
          <h2>🔌 Connect Wallet</h2>
          <p>Please connect your wallet to access the Launchpad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="paymaster-launch">
      <h1>🚀 Paymaster Launchpad</h1>
      <p className="page-description">
        Deploy your infrastructure. Choose your path: Standalone PaymasterV4 or SuperPaymaster Operator.
      </p>

      {/* Messages */}
      {error && <p className="error-msg">❌ {error}</p>}
      {success && <p className="success-msg">✅ {success}</p>}
      {txHash && (
        <p className="tx-link">
          <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View Transaction ↗
          </a>
        </p>
      )}

      <div className="launch-columns">
        {/* PaymasterV4 Column */}
        <div className="launch-card v4-card">
          <h2>🚀 PaymasterV4</h2>
          <p className="launch-description">
            Deploy a standalone Paymaster contract. Calculate gas for your own users and manage your own policies.
          </p>
          
          {ownedPaymaster ? (
             <div className="status-active">
               <p>✅ <strong>Deployed</strong></p>
               <p className="monospace">{ownedPaymaster}</p>
               <Link to="/v3-admin/paymaster-v4" className="btn-launch" style={{ textAlign: 'center', marginTop: '1rem', display: 'block', textDecoration: 'none' }}>
                 Go to Dashboard
               </Link>
             </div>
          ) : (
            <>
              <div className="launch-steps">
                <h3>Features:</h3>
                <ul>
                  <li>Sponsor gasless transactions</li>
                  <li>Accept ERC-20 tokens</li>
                  <li>Full budget control</li>
                </ul>
              </div>
              
              <div className="launch-action">
                <OnboardingWizard />
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Initial Stake (sGT)</label>
                  <input
                    type="number"
                    value={stakeAmountV4}
                    onChange={(e) => setStakeAmountV4(e.target.value)}
                    placeholder="30"
                    disabled={loading}
                  />
                  <small>Min: 30 sGT</small>
                </div>
                <button 
                  className="btn-launch"
                  onClick={handleDeployV4}
                  disabled={loading || !stakeAmountV4}
                >
                  {loading ? 'Deploying...' : 'Deploy PaymasterV4'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* SuperPaymaster Column */}
        <div className="launch-card super-card">
          <h2>💎 SuperPaymaster Operator</h2>
          <p className="launch-description">
            Join the SuperPaymaster network as an Operator. Earn fees by processing transactions for the protocol.
          </p>

          {isSuperOperator ? (
            <div className="status-active">
              <p>✅ <strong>Registered</strong></p>
              <p>Role: ROLE_PAYMASTER_SUPER</p>
              <Link to="/v3-admin/superpaymaster" className="btn-launch" style={{ textAlign: 'center', marginTop: '1rem', display: 'block', textDecoration: 'none' }}>
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <div className="launch-steps">
                <h3>Requirements:</h3>
                <ul>
                  <li>Stake GToken collateral</li>
                  <li>Maintain uptime</li>
                  <li>Earn protocol fees</li>
                </ul>
              </div>

              <div className="launch-action">
                <div className="form-group">
                  <label>Stake Amount (GToken)</label>
                  <input
                    type="number"
                    value={stakeAmountSuper}
                    onChange={(e) => setStakeAmountSuper(e.target.value)}
                    placeholder="50"
                    disabled={loading}
                  />
                  <small>
                    {roleConfig 
                      ? `Min: ${formatEther(roleConfig.minStake)} GToken` 
                      : 'Loading requirements...'}
                  </small>
                </div>
                <button 
                  className="btn-launch"
                  onClick={handleRegisterSuper}
                  disabled={loading || !stakeAmountSuper}
                >
                  {loading ? 'Registering...' : 'Register as Operator'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Faucet / Token Link Section */}
      <div className="faucet-section">
        <h3>Need GToken?</h3>
        {isTestnet ? (
          <>
            <p>You can get testnet GToken from our Faucet.</p>
            <Link to="/v3-admin/faucet" className="faucet-link">
              🚰 Go to Faucet
            </Link>
          </>
        ) : (
          <>
            <p>Purchase GToken from the market.</p>
            <Link to="/v3-admin/gtoken-market" className="faucet-link">
              🛒 Go to GToken Market
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
