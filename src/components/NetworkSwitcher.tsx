import React from 'react';
import { useWallet, SUPPORTED_NETWORKS } from '../contexts/WalletContext';
import './NetworkSwitcher.css';

/**
 * Network Switcher Component
 * Allows users to switch between supported networks
 */
export const NetworkSwitcher: React.FC = () => {
  const { chainId, network, switchNetwork, isSafeApp } = useWallet();

  const handleNetworkChange = async (targetChainId: number) => {
    try {
      await switchNetwork(targetChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert(`Failed to switch network. ${isSafeApp ? 'Please switch in Safe UI.' : ''}`);
    }
  };

  return (
    <div className="network-switcher">
      <label>Network:</label>
      <select 
        value={chainId || ''} 
        onChange={(e) => handleNetworkChange(parseInt(e.target.value))}
        disabled={isSafeApp}
      >
        {Object.entries(SUPPORTED_NETWORKS).map(([key, config]) => (
          <option key={key} value={config.chainId}>
            {config.name} {chainId === config.chainId && '✓'}
          </option>
        ))}
      </select>
      {isSafeApp && <span className="safe-hint">Switch network in Safe UI</span>}
    </div>
  );
};
