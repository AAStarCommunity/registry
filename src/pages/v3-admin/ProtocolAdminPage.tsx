import React, { useState, useEffect } from 'react';
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
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [protocolParams, setProtocolParams] = useState<{
    superPaymaster: string;
    treasury: string;
    entryPoint: string;
    minStake: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // TODO: Implement with SDK
  // useEffect(() => {
  //   const loadParams = async () => {
  //     const governance = new ProtocolGovernance({ registryAddress, entryPointAddress, signer });
  //     const params = await governance.getProtocolParams();
  //     setProtocolParams(params);
  //   };
  //   loadParams();
  // }, []);

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
        <div className="status-grid">
          <div className="status-item">
            <label>SuperPaymaster</label>
            <span className="value">{protocolParams?.superPaymaster || 'Loading...'}</span>
          </div>
          <div className="status-item">
            <label>Treasury</label>
            <span className="value">{protocolParams?.treasury || 'Loading...'}</span>
          </div>
          <div className="status-item">
            <label>EntryPoint</label>
            <span className="value">{protocolParams?.entryPoint || 'Loading...'}</span>
          </div>
        </div>
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
