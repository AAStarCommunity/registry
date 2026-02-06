import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import './ProtocolAdminPage.css';

/**
 * Protocol Admin Page
 * 
 * SDK APIs used:
 * - @aastar/admin → ProtocolGovernance
 *   - getProtocolParams()
 *   - setSuperPaymaster()
 *   - setStaking()
 *   - configureRole()
 *   - transferToDAO()
 */
export const ProtocolAdminPage: React.FC = () => {
  const { address, isConnected, chainId, network } = useWallet();
  const [protocolParams, setProtocolParams] = useState<{
    superPaymaster: string;
    treasury: string;
    entryPoint: string;
    minStake: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load protocol params from Registry using SDK
  useEffect(() => {
    if (!isConnected || !network) {
      setProtocolParams(null);
      setLoading(false);
      return;
    }

    const loadProtocolData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Import SDK contracts module
        const { getContracts } = await import('@aastar/core');
        
        // Get contracts for current network
        const contracts = getContracts(network as 'sepolia');
        
        // For demo: display contract addresses from SDK
        // TODO: Use ProtocolClient to query actual on-chain state
        setProtocolParams({
          superPaymaster: contracts.core.superPaymaster,
          treasury: contracts.core.registry, // Registry acts as treasury in current setup
          entryPoint: contracts.official.entryPoint,
          minStake: '50', // TODO: Query from Registry contract
        });
      } catch (err) {
        console.error('Failed to load protocol data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadProtocolData();
  }, [isConnected, network]);

  if (!isConnected) {
    return (
      <div className="protocol-admin">
        <div className="connect-prompt">
          <h2>🔌 Connect Wallet</h2>
          <p>Please connect your wallet to access Protocol Admin functions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="protocol-admin">
      <h1>⚙️ Protocol Admin Dashboard</h1>
      <p className="page-description">
        Manage global protocol parameters, role configurations, and governance.
      </p>

      {/* Protocol Status */}
      <section className="admin-section">
        <h2>📊 Protocol Status</h2>
        {loading && <p className="loading">Loading contract addresses...</p>}
        {error && <p className="error">❌ Error: {error}</p>}
        {!loading && !error && protocolParams && (
          <>
            <p className="network-info">Network: <strong>{network}</strong> (Chain ID: {chainId})</p>
            <div className="status-grid">
              <div className="status-item">
                <label>SuperPaymaster</label>
                <span className="value monospace">{protocolParams.superPaymaster}</span>
              </div>
              <div className="status-item">
                <label>Treasury (Registry)</label>
                <span className="value monospace">{protocolParams.treasury}</span>
              </div>
              <div className="status-item">
                <label>EntryPoint</label>
                <span className="value monospace">{protocolParams.entryPoint}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Role Configuration */}
      <section className="admin-section">
        <h2>🎭 Role Configuration</h2>
        <p>Configure staking requirements for different roles.</p>
        <div className="config-form">
          <div className="form-group">
            <label>Role</label>
            <select>
              <option value="ROLE_PAYMASTER_SUPER">ROLE_PAYMASTER_SUPER</option>
              <option value="ROLE_COMMUNITY">ROLE_COMMUNITY</option>
            </select>
          </div>
          <div className="form-group">
            <label>Min Stake (GToken)</label>
            <input type="number" placeholder="50" />
          </div>
          <div className="form-group">
            <label>Entry Burn (GToken)</label>
            <input type="number" placeholder="1" />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Role Config'}
          </button>
        </div>
      </section>

      {/* DAO Transfer */}
      <section className="admin-section danger-zone">
        <h2>⚠️ DAO Transfer</h2>
        <p>Transfer protocol ownership to a DAO (Multisig/Timelock). This action is irreversible.</p>
        <div className="form-group">
          <label>DAO Address</label>
          <input type="text" placeholder="0x..." />
        </div>
        <button className="btn-danger">Transfer to DAO</button>
      </section>
    </div>
  );
};
