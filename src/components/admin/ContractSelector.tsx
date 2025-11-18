import React from 'react';
import type { ContractConfig } from '../../types/contracts';

interface ContractSelectorProps {
  contracts: ContractConfig[];
  selectedContractId?: string;
  onContractSelect: (contractId: string) => void;
  disabled?: boolean;
}

export const ContractSelector: React.FC<ContractSelectorProps> = ({
  contracts,
  selectedContractId,
  onContractSelect,
  disabled = false
}) => {
  const groupedContracts = contracts.reduce((acc, contract) => {
    if (!acc[contract.type]) {
      acc[contract.type] = [];
    }
    acc[contract.type].push(contract);
    return acc;
  }, {} as Record<ContractConfig['type'], ContractConfig[]>);

  const getContractTypeLabel = (type: ContractConfig['type']) => {
    const labels = {
      'SBT': 'Soul Bound Tokens',
      'NFT': 'NFTs (ERC-721)',
      'FT': 'Fungible Tokens (ERC-20)',
      'CUSTOM': 'Custom Contracts'
    };
    return labels[type] || type;
  };

  const getContractTypeIcon = (type: ContractConfig['type']) => {
    const icons = {
      'SBT': '🎫',
      'NFT': '🖼️',
      'FT': '🪙',
      'CUSTOM': '🎯'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="contract-selector">
      <label className="selector-label">
        选择合约类型
      </label>

      <div className="contract-grid">
        {Object.entries(groupedContracts).map(([type, typeContracts]) => (
          <div key={type} className="contract-type-group">
            <div className="type-header">
              <span className="type-icon">{getContractTypeIcon(type as ContractConfig['type'])}</span>
              <span className="type-name">{getContractTypeLabel(type as ContractConfig['type'])}</span>
            </div>

            <div className="contract-list">
              {typeContracts.map(contract => (
                <div
                  key={contract.id}
                  className={`contract-item ${selectedContractId === contract.id ? 'selected' : ''}`}
                  onClick={() => !disabled && onContractSelect(contract.id)}
                >
                  <div className="contract-header">
                    <div className="contract-info">
                      <span className="contract-icon">{contract.icon}</span>
                      <div className="contract-details">
                        <div className="contract-name">{contract.name}</div>
                        <div className="contract-address">
                          {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                        </div>
                      </div>
                    </div>

                    <div className="contract-badges">
                      {contract.permissions.requireOperator && (
                        <span className="badge operator">⚡</span>
                      )}
                      {contract.permissions.requireOwner && (
                        <span className="badge owner">👑</span>
                      )}
                    </div>
                  </div>

                  <div className="contract-description">
                    {contract.description}
                  </div>

                  <div className="contract-methods">
                    <span className="methods-count">
                      {contract.batchMethods.length} 个批量方法
                    </span>
                    <div className="method-list">
                      {contract.batchMethods.slice(0, 2).map(method => (
                        <span key={method.name} className="method-tag">
                          {method.displayName}
                        </span>
                      ))}
                      {contract.batchMethods.length > 2 && (
                        <span className="method-tag more">
                          +{contract.batchMethods.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedContractId && (
        <div className="selected-info">
          <span className="selected-label">已选择:</span>
          <span className="selected-contract">
            {contracts.find(c => c.id === selectedContractId)?.name}
          </span>
        </div>
      )}
    </div>
  );
};