import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useRegistry } from '../../hooks/useRegistry';
import { parseEther, formatEther, type Hex } from 'viem';
import type { RoleConfigDetailed } from '@aastar/core';
import './ProtocolAdminPage.css';

/**
 * Protocol Admin Page - REAL Implementation
 * 
 * 功能:
 * - 查询真实的Role配置（minStake, entryBurn, exitFee）
 * - 修改Role参数（需要Protocol Admin权限）
 * - 转移Registry所有权到DAO
 */
export const ProtocolAdminPage: React.FC = () => {
  const { address, isConnected, chainId, network } = useWallet();
  const registry = useRegistry();
  
  // 协议参数状态
  const [protocolParams, setProtocolParams] = useState<{
    superPaymaster: string;
    treasury: string;
    entryPoint: string;
  } | null>(null);
  
  // Role配置状态
  const [roleConfigs, setRoleConfigs] = useState<Record<string, RoleConfigDetailed>>({});
  
  const [roleIds, setRoleIds] = useState<Record<string, Hex>>({});
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 表单状态
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('ROLE_PAYMASTER_SUPER');
  const [formData, setFormData] = useState({
    minStake: '',
    entryBurn: '',
    exitFeePercent: '',
    minExitFee: '',
  });
  const [daoAddress, setDaoAddress] = useState('');

  // 加载协议数据和Role配置
  useEffect(() => {
    if (!isConnected || !network) {
      setProtocolParams(null);
      setRoleConfigs({});
      setLoading(false);
      return;
    }

    const loadProtocolData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 获取合约地址
        const contracts = await registry.getContractAddresses();
        setProtocolParams({
          superPaymaster: contracts.core.superPaymaster,
          treasury: contracts.core.registry,
          entryPoint: contracts.official.entryPoint,
        });

        // 获取Role IDs
        const ids = await registry.getRoleIds();
        setRoleIds(ids);

        // 并行查询所有Role配置
        const keys = Object.keys(ids);
        const configs = await Promise.all(
          keys.map(key => registry.getRoleConfig(ids[key as keyof typeof ids]))
        );

        const newRoleConfigs: Record<string, RoleConfigDetailed> = {};
        keys.forEach((key, index) => {
          newRoleConfigs[key] = configs[index];
        });

        setRoleConfigs(newRoleConfigs);

        // 初始化表单 (默认选中 ROLE_PAYMASTER_SUPER)
        if (newRoleConfigs['ROLE_PAYMASTER_SUPER']) {
            const config = newRoleConfigs['ROLE_PAYMASTER_SUPER'];
            setFormData({
                minStake: formatEther(config.minStake),
                entryBurn: formatEther(config.entryBurn),
                exitFeePercent: config.exitFeePercent.toString(),
                minExitFee: formatEther(config.minExitFee),
            });
        }
      } catch (err) {
        console.error('Failed to load protocol data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadProtocolData();
  }, [isConnected, network]);

  // 当切换Role时更新表单
  useEffect(() => {
    const config = roleConfigs[selectedRoleKey];
    if (config) {
      setFormData({
        minStake: formatEther(config.minStake),
        entryBurn: formatEther(config.entryBurn),
        exitFeePercent: config.exitFeePercent.toString(),
        minExitFee: formatEther(config.minExitFee),
      });
    }
  }, [selectedRoleKey, roleConfigs]);

  // 处理Role配置更新
  const handleUpdateRoleConfig = async () => {
    if (!roleIds[selectedRoleKey]) {
      setError('Role ID not loaded');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setTxHash(null);

      const txHash = await registry.adminConfigureRole({
        roleId: roleIds[selectedRoleKey]!,
        minStake: parseEther(formData.minStake),
        entryBurn: parseEther(formData.entryBurn),
        exitFeePercent: BigInt(formData.exitFeePercent),
        minExitFee: parseEther(formData.minExitFee),
      });

      setTxHash(txHash);
      setSuccess(`Role configuration updated! TX: ${txHash.slice(0, 10)}...`);

      // Re-fetch config for just this role to be efficient (or reload all)
      const newConfig = await registry.getRoleConfig(roleIds[selectedRoleKey]!);
      setRoleConfigs(prev => ({
          ...prev,
          [selectedRoleKey]: newConfig
      }));
    } catch (err) {
      console.error('Failed to update role config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  // 处理DAO转移
  const handleTransferToDAO = async () => {
    if (!daoAddress || daoAddress.length !== 42) {
      setError('Invalid DAO address');
      return;
    }

    if (!confirm('⚠️ WARNING: This will transfer Registry ownership to the DAO. This action is IRREVERSIBLE. Continue?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setTxHash(null);

      const txHash = await registry.transferOwnership(daoAddress as `0x${string}`);
      setTxHash(txHash);
      setSuccess(`Ownership transferred to DAO! TX: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      console.error('Failed to transfer ownership:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer');
    }
  };

  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://etherscan.io';

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
        {loading && <p className="loading">Loading contract data...</p>}
        {error && <p className="error">❌ {error}</p>}
        {success && <p className="success">✅ {success}</p>}
        {txHash && (
          <p className="tx-link">
            <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
              View Transaction ↗
            </a>
          </p>
        )}
        
        {!loading && protocolParams && (
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

            {/* Role Configs Display */}
            <div className="role-config-display">
                <h3>Current Role Configurations</h3>
                <div className="role-cards">
                    {Object.entries(roleConfigs).map(([key, config]) => (
                        <div className="role-card" key={key}>
                            <h4>{key}</h4>
                            <div className="role-details">
                                <div><span>Min Stake:</span> {formatEther(config.minStake)} GToken</div>
                                <div><span>Entry Burn:</span> {formatEther(config.entryBurn)} GToken</div>
                                <div><span>Exit Fee:</span> {config.exitFeePercent}%</div>
                                <div><span>Min Exit Fee:</span> {formatEther(config.minExitFee)} GToken</div>
                                <div><span>Active:</span> {config.isActive ? '✅ Yes' : '❌ No'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </>
        )}
      </section>

      {/* Role Configuration */}
      <section className="admin-section">
        <h2>🎭 Role Configuration</h2>
        <p>Configure staking requirements for different roles. <strong>Admin permission required.</strong></p>
        
        <div className="config-form">
          <div className="form-group">
            <label>Role</label>
            <select 
              value={selectedRoleKey} 
              onChange={(e) => setSelectedRoleKey(e.target.value)}
              disabled={loading}
            >
                {Object.keys(roleIds).map(key => (
                    <option key={key} value={key}>{key}</option>
                ))}
            </select>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Min Stake (GToken)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.minStake}
                onChange={(e) => setFormData({...formData, minStake: e.target.value})}
                placeholder="50"
                disabled={registry.loading}
              />
            </div>
            
            <div className="form-group">
              <label>Entry Burn (GToken)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.entryBurn}
                onChange={(e) => setFormData({...formData, entryBurn: e.target.value})}
                placeholder="1"
                disabled={registry.loading}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Exit Fee Percent (%)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={formData.exitFeePercent}
                onChange={(e) => setFormData({...formData, exitFeePercent: e.target.value})}
                placeholder="5"
                disabled={registry.loading}
              />
            </div>
            
            <div className="form-group">
              <label>Min Exit Fee (GToken)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.minExitFee}
                onChange={(e) => setFormData({...formData, minExitFee: e.target.value})}
                placeholder="0.1"
                disabled={registry.loading}
              />
            </div>
          </div>
          
          <button 
            className="btn-primary" 
            onClick={handleUpdateRoleConfig}
            disabled={registry.loading || !formData.minStake || !formData.entryBurn}
          >
            {registry.loading ? 'Updating...' : 'Update Role Config'}
          </button>
        </div>
      </section>

      {/* DAO Transfer */}
      <section className="admin-section danger-zone">
        <h2>⚠️ DAO Transfer</h2>
        <p><strong>DANGER ZONE:</strong> Transfer protocol ownership to a DAO (Multisig/Timelock). This action is <strong>IRREVERSIBLE</strong>.</p>
        <div className="form-group">
          <label>DAO Address</label>
          <input 
            type="text" 
            value={daoAddress}
            onChange={(e) => setDaoAddress(e.target.value)}
            placeholder="0x..." 
            disabled={registry.loading}
          />
          <small>⚠️ Double-check this address. Ownership transfer cannot be undone.</small>
        </div>
        <button 
          className="btn-danger" 
          onClick={handleTransferToDAO}
          disabled={registry.loading || !daoAddress}
        >
          {registry.loading ? 'Transferring...' : 'Transfer to DAO'}
        </button>
      </section>
    </div>
  );
};
