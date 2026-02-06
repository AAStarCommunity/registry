import React, { useState } from 'react';
import './SuperPaymasterAdminPage.css';

/**
 * SuperPaymaster Admin Page
 * 
 * SDK APIs used:
 * - @aastar/operator → PaymasterOperatorClient
 *   - registerAsSuperPaymasterOperator()
 *   - configureOperator()
 *   - depositCollateral()
 *   - withdrawCollateral()
 *   - addGasToken()
 *   - getOperatorDetails()
 * - @aastar/operator → OperatorLifecycle
 *   - checkReadiness()
 *   - initiateExit()
 *   - withdrawAllFunds()
 */
export const SuperPaymasterAdminPage: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'register' | 'manage' | 'exit'>('register');

  if (!isConnected) {
    return (
      <div className="sp-admin">
        <div className="connect-prompt">
          <h2>🔌 Connect Wallet</h2>
          <p>Please connect your wallet to access SuperPaymaster Admin functions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-admin">
      <h1>💎 SuperPaymaster Admin</h1>
      <p className="page-description">
        Register, manage, and operate your SuperPaymaster node.
      </p>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button 
          className={activeTab === 'register' ? 'active' : ''} 
          onClick={() => setActiveTab('register')}
        >
          📝 Register
        </button>
        <button 
          className={activeTab === 'manage' ? 'active' : ''} 
          onClick={() => setActiveTab('manage')}
        >
          ⚙️ Manage
        </button>
        <button 
          className={activeTab === 'exit' ? 'active' : ''} 
          onClick={() => setActiveTab('exit')}
        >
          🚪 Exit
        </button>
      </div>

      {/* Register Tab */}
      {activeTab === 'register' && (
        <section className="admin-section">
          <h2>Register as SuperPaymaster Operator</h2>
          <p>Stake GToken and register to become a SuperPaymaster node operator.</p>
          
          <div className="config-form">
            <div className="form-group">
              <label>Stake Amount (GToken)</label>
              <input type="number" placeholder="50" defaultValue="50" />
              <span className="hint">Minimum required: 50 GToken</span>
            </div>
            <div className="form-group">
              <label>Initial Deposit (aPNTs, optional)</label>
              <input type="number" placeholder="0" />
            </div>
            <button className="btn-primary">
              Register as Operator
            </button>
          </div>
        </section>
      )}

      {/* Manage Tab */}
      {activeTab === 'manage' && (
        <>
          <section className="admin-section">
            <h2>Operator Status</h2>
            <div className="status-grid">
              <div className="status-item">
                <label>Status</label>
                <span className="value status-active">Active</span>
              </div>
              <div className="status-item">
                <label>Collateral Balance</label>
                <span className="value">0 aPNTs</span>
              </div>
              <div className="status-item">
                <label>xPNTs Token</label>
                <span className="value">Not Configured</span>
              </div>
            </div>
          </section>

          <section className="admin-section">
            <h2>Collateral Management</h2>
            <div className="config-form horizontal">
              <div className="form-group">
                <label>Amount</label>
                <input type="number" placeholder="100" />
              </div>
              <button className="btn-primary">Deposit</button>
              <button className="btn-secondary">Withdraw</button>
            </div>
          </section>

          <section className="admin-section">
            <h2>Gas Token Configuration</h2>
            <p>Add tokens that users can use to pay for gas.</p>
            <div className="config-form">
              <div className="form-group">
                <label>Token Address</label>
                <input type="text" placeholder="0x..." />
              </div>
              <div className="form-group">
                <label>Price (USD)</label>
                <input type="number" placeholder="1" />
              </div>
              <button className="btn-primary">Add Gas Token</button>
            </div>
          </section>
        </>
      )}

      {/* Exit Tab */}
      {activeTab === 'exit' && (
        <section className="admin-section danger-zone">
          <h2>⚠️ Exit Operator</h2>
          <p>Initiate the exit process to unstake and withdraw all funds.</p>
          
          <div className="exit-steps">
            <div className="step">
              <span className="step-num">1</span>
              <div className="step-content">
                <h3>Initiate Exit</h3>
                <p>Start the cooldown period</p>
                <button className="btn-danger">Initiate Exit</button>
              </div>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <div className="step-content">
                <h3>Wait Cooldown</h3>
                <p>Remaining: -- days</p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <div className="step-content">
                <h3>Withdraw All</h3>
                <p>Claim collateral and rewards</p>
                <button className="btn-secondary" disabled>Withdraw All</button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
