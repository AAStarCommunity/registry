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
          <h2>Protocol Admin</h2>
          <p>Configure global protocol parameters, roles, and DAO transfer.</p>
          <ul className="admin-card-features">
            <li>Set Treasury & Staking</li>
            <li>Configure Role Parameters</li>
            <li>Transfer to DAO</li>
          </ul>
        </Link>

        <Link to="/v3-admin/superpaymaster" className="admin-card superpaymaster">
          <div className="admin-card-icon">💎</div>
          <h2>SuperPaymaster Admin</h2>
          <p>Manage SuperPaymaster operator lifecycle.</p>
          <ul className="admin-card-features">
            <li>Register as Operator</li>
            <li>Manage Collateral</li>
            <li>Configure Gas Tokens</li>
          </ul>
        </Link>

        <Link to="/v3-admin/paymaster-v4" className="admin-card paymasterv4">
          <div className="admin-card-icon">🚀</div>
          <h2>PaymasterV4 Admin</h2>
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
