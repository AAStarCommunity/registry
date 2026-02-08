import React from 'react';
import { Link } from 'react-router-dom';
import './AdminPortal.css';

/**
 * Admin Portal - Entry point for V3 Admin System
 * Three admin roles: Protocol Admin, SuperPaymaster Admin, PaymasterV4 Admin
 */
export const AdminPortal: React.FC = () => {
  return (
    <div className="admin-portal">
      <div className="admin-portal-header">
        <h1>🛡️ Admin Portal</h1>
        <p>Manage SuperPaymaster Protocol</p>
      </div>

      <div className="admin-cards">
        <Link to="/v3-admin/protocol" className="admin-card protocol">
          <div className="admin-card-icon">⚙️</div>
          <h2>Registry Protocol Admin</h2>
          <p>Configure global Registry roles and ownership.</p>
          <ul className="admin-card-features">
            <li>Dynamic Role Config</li>
            <li>Role Management</li>
            <li>DAO Transfer</li>
          </ul>
        </Link>
        
        <Link to="/v3-admin/superpaymaster-protocol" className="admin-card protocol">
          <div className="admin-card-icon">💎</div>
          <h2>SP Protocol Admin</h2>
          <p>Manage SuperPaymaster global settings.</p>
          <ul className="admin-card-features">
            <li>Set Protocol Fee</li>
            <li>Set Treasury</li>
            <li>Emergency Pause</li>
          </ul>
        </Link>
        
        <Link to="/v3-admin/launch" className="admin-card protocol">
          <div className="admin-card-icon">🚀</div>
          <h2>Launchpad</h2>
          <p>Deploy Paymaster V4 or Register as Operator.</p>
          <ul className="admin-card-features">
            <li>Deploy PaymasterV4</li>
            <li>Register Operator</li>
            <li>Get Started</li>
          </ul>
        </Link>
        
         <Link to="/v3-admin/gtoken-market" className="admin-card protocol">
          <div className="admin-card-icon">🛒</div>
          <h2>GToken Market</h2>
          <p>Purchase GToken for protocol participation.</p>
           <ul className="admin-card-features">
            <li>Buy GToken</li>
            <li>Approve Tokens</li>
            <li>Manage Holdings</li>
          </ul>
        </Link>

         <Link to="/v3-admin/faucet" className="admin-card protocol">
          <div className="admin-card-icon">🚰</div>
          <h2>Testnet Faucet</h2>
          <p>Get test assets for development.</p>
           <ul className="admin-card-features">
            <li>Get ETH</li>
            <li>Get aPNTs</li>
            <li>Testnet Only</li>
          </ul>
        </Link>

        <Link to="/v3-admin/superpaymaster" className="admin-card superpaymaster">
          <div className="admin-card-icon">🛠️</div>
          <h2>SuperPaymaster Operator Dashboard</h2>
          <p>Manage your own Operator (Paymaster) lifecycle.</p>
          <ul className="admin-card-features">
            <li>Register as Operator</li>
            <li>Manage Collateral</li>
            <li>Configure Gas Tokens</li>
          </ul>
        </Link>

        <Link to="/v3-admin/paymaster-v4" className="admin-card paymasterv4">
          <div className="admin-card-icon">🚀</div>
          <h2>PaymasterV4 Operator Dashboard</h2>
          <p>Deploy and manage PaymasterV4 contracts.</p>
          <ul className="admin-card-features">
            <li>Deploy New Paymaster</li>
            <li>Manage User Deposits</li>
            <li>View Statistics</li>
          </ul>
        </Link>
      </div>
    </div>
  );
};
