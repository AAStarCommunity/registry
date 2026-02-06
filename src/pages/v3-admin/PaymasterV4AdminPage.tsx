import React, { useState } from 'react';
import './PaymasterV4AdminPage.css';

/**
 * PaymasterV4 Admin Page
 * 
 * SDK APIs used:
 * - @aastar/operator → PaymasterOperatorClient
 *   - deployAndRegisterPaymasterV4()
 *   - setupPaymasterDeposit()
 *   - getTokenPrice()
 */
export const PaymasterV4AdminPage: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deployedPaymasters, setDeployedPaymasters] = useState<string[]>([]);

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
        Deploy and manage your PaymasterV4 contracts.
      </p>

      {/* Deploy New Paymaster */}
      <section className="admin-section">
        <h2>Deploy New Paymaster V4</h2>
        <p>Deploy a new PaymasterV4 contract and register it with the protocol.</p>
        
        <div className="config-form">
          <div className="form-group">
            <label>Stake Amount (GToken)</label>
            <input type="number" placeholder="10" defaultValue="10" />
          </div>
          <div className="form-group">
            <label>Salt (optional, for deterministic address)</label>
            <input type="number" placeholder="1" />
          </div>
          <div className="form-group">
            <label>Price Feed (optional)</label>
            <input type="text" placeholder="0x..." />
          </div>
          <button className="btn-primary">
            🚀 Deploy & Register
          </button>
        </div>
      </section>

      {/* My Paymasters */}
      <section className="admin-section">
        <h2>My Paymasters</h2>
        {deployedPaymasters.length === 0 ? (
          <div className="empty-state">
            <p>No PaymasterV4 contracts deployed yet.</p>
          </div>
        ) : (
          <div className="paymaster-list">
            {deployedPaymasters.map((addr, i) => (
              <div key={i} className="paymaster-item">
                <span className="paymaster-address">{addr}</span>
                <button className="btn-sm">Manage</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Token Price Query */}
      <section className="admin-section">
        <h2>Token Price Query</h2>
        <div className="config-form horizontal">
          <div className="form-group">
            <label>Token Address</label>
            <input type="text" placeholder="0x..." />
          </div>
          <button className="btn-secondary">Query Price</button>
        </div>
        <div className="query-result">
          <label>Price:</label>
          <span>--</span>
        </div>
      </section>
    </div>
  );
};
