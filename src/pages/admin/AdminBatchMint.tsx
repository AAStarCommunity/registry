import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOperatorPermissions } from '../../hooks/useOperatorPermissions';
import { ContractSelector } from '../../components/admin/ContractSelector';
import { BatchAddressInput } from '../../components/admin/BatchAddressInput';
import { DynamicParameters } from '../../components/admin/ParameterInput';
import { GasEstimator } from '../../components/admin/GasEstimator';
import '../../components/admin/ContractSelector.css';
import '../../components/admin/BatchAddressInput.css';
import '../../components/admin/ParameterInput.css';
import '../../components/admin/GasEstimator.css';
import { contractConfigManager } from '../../services/ContractConfigManager';
import type { ContractConfig, BatchMethod, AddressValidationResult, GasEstimate } from '../../types/contracts';
import type { BatchExecutionProgress, BatchMintResult } from '../../services/BatchContractService';
import { BatchContractService } from '../../services/BatchContractService';
import { BatchExecutionProgressModal } from '../../components/admin/BatchExecutionProgress';
import { BatchResultModal } from '../../components/admin/BatchResultModal';
import { MultiConfirmModal } from '../../components/admin/MultiConfirmModal';
import { operationLogService } from '../../services/OperationLogService';
import './AdminBatchMint.css';

export const AdminBatchMint: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [account, setAccount] = useState<string>('');
  const operatorPermissions = useOperatorPermissions(account);

  // Contract management state
  const [availableContracts, setAvailableContracts] = useState<ContractConfig[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<ContractConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<BatchMethod | null>(null);

  // Batch operation state
  const [addresses, setAddresses] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<AddressValidationResult[]>([]);
  const [parameters, setParameters] = useState<{ [key: string]: any }>({});
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);

  // Batch execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<BatchExecutionProgress | null>(null);
  const [executionResult, setExecutionResult] = useState<BatchMintResult | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentOperationId, setCurrentOperationId] = useState<string>('');
  const [executionStartTime, setExecutionStartTime] = useState<Date | null>(null);
  const [executionEndTime, setExecutionEndTime] = useState<Date | null>(null);
  const [batchService] = useState(() => new BatchContractService());

  // Load available contracts
  useEffect(() => {
    try {
      const contracts = contractConfigManager.getAllContracts();
      setAvailableContracts(contracts);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  }, []);

  // Handle contract selection
  useEffect(() => {
    if (selectedContractId) {
      const contract = contractConfigManager.getContract(selectedContractId);
      setSelectedContract(contract || null);

      // Reset method and parameters when contract changes
      setSelectedMethod(null);
      setParameters({});
      setGasEstimate(null);
    } else {
      setSelectedContract(null);
      setSelectedMethod(null);
    }
  }, [selectedContractId]);

  // Auto-select first method when contract is selected
  useEffect(() => {
    if (selectedContract && selectedContract.batchMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(selectedContract.batchMethods[0]);

      // Set default parameters
      const defaultParams: { [key: string]: any } = {};
      selectedContract.batchMethods[0].parameters.forEach(param => {
        if (param.defaultValue !== undefined) {
          defaultParams[param.name] = param.defaultValue;
        }
      });
      setParameters(defaultParams);
    }
  }, [selectedContract]);

  // Check wallet connection and permissions
  useEffect(() => {
    const checkWallet = async () => {
      if (!window.ethereum) {
        alert('MetaMask not installed');
        return;
      }

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err) {
        console.error('Failed to connect wallet:', err);
      }
    };

    checkWallet();
  }, []);

  // Redirect if not operator
  useEffect(() => {
    if (!operatorPermissions.isLoading &&
        !operatorPermissions.isOperator &&
        !operatorPermissions.isOwner &&
        account) {
      alert('You do not have operator permissions to access this page');
      navigate('/get-sbt');
    }
  }, [operatorPermissions, account, navigate]);

  // Handle execution with confirmation modal
  const handleExecuteBatch = () => {
    if (!selectedContract || !selectedMethod || addresses.length === 0) {
      alert('请先选择合约、方法和地址');
      return;
    }

    setShowConfirmModal(true);
  };

  // Execute batch operation after confirmation
  const executeConfirmedBatch = async () => {
    if (!selectedContract || !selectedMethod || addresses.length === 0) {
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionStartTime(new Date());

      // Log the operation
      const operationId = operationLogService.logOperation({
        operator: account,
        operation: 'batch_mint',
        status: 'pending',
        contractAddress: selectedContract.address,
        contractName: selectedContract.name,
        method: selectedMethod.name,
        targetAddresses: addresses,
        parameters,
        gasEstimate: gasEstimate ? {
          totalGas: gasEstimate.totalGas,
          totalCost: gasEstimate.estimatedCost.eth,
          gasPrice: gasEstimate.gasPrice.gwei
        } : undefined,
        securityLevel: addresses.length > 50 ? 'high' : addresses.length > 10 ? 'medium' : 'low',
        confirmationSteps: [
          'Verify addresses',
          'Confirm parameters',
          'Accept risks',
          'Manual confirmation',
          'Final signature'
        ]
      });

      setCurrentOperationId(operationId);

      // Connect wallet for signing
      const connected = await batchService.connectWallet();
      if (!connected) {
        throw new Error('Failed to connect wallet');
      }

      // Show progress modal and hide confirmation modal
      setShowConfirmModal(false);
      setShowProgressModal(true);

      // Execute batch operation
      const result = await batchService.executeBatchMint(
        selectedContract,
        selectedMethod,
        addresses,
        parameters,
        (progress) => {
          setExecutionProgress(progress);
        }
      );

      // Update operation log with results
      operationLogService.updateOperation(operationId, {
        status: result.success ? 'completed' : 'failed',
        executionResult: {
          txHash: result.txHash,
          successCount: result.results.filter(r => r.success).length,
          failCount: result.results.filter(r => !r.success).length,
          totalGasUsed: result.totalGasUsed,
          totalCost: result.totalCost,
          errors: result.results.filter(r => !r.success).map(r => r.error || 'Unknown error')
        }
      });

      setExecutionResult(result);
      setExecutionEndTime(new Date());
      setShowProgressModal(false);
      setShowResultModal(true);

    } catch (error: any) {
      console.error('Batch execution failed:', error);

      // Update operation log with failure
      if (currentOperationId) {
        operationLogService.updateOperation(currentOperationId, {
          status: 'failed',
          notes: error.message
        });
      }

      alert(`批量操作失败: ${error.message}`);
      setShowProgressModal(false);
    } finally {
      setIsExecuting(false);
      setCurrentOperationId('');
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedContractId('');
    setSelectedContract(null);
    setSelectedMethod(null);
    setAddresses([]);
    setValidationResults([]);
    setParameters({});
    setGasEstimate(null);
    setExecutionProgress(null);
    setExecutionResult(null);
    setShowProgressModal(false);
    setShowResultModal(false);
  };

  if (operatorPermissions.isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Checking permissions...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="admin-no-wallet">
        <h2>🔐 Connect Wallet Required</h2>
        <p>Please connect your wallet to access the admin panel.</p>
        <button
          className="connect-wallet-btn"
          onClick={async () => {
            try {
              const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
              });
              if (accounts.length > 0) {
                setAccount(accounts[0]);
              }
            } catch (err) {
              console.error('Failed to connect wallet:', err);
            }
          }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="admin-batch-mint-page">
      <div className="admin-header">
        <button className="back-button" onClick={() => navigate('/get-sbt')}>
          ← Back to Get SBT
        </button>
        <h1>🔧 Batch Minting Admin Panel</h1>
        <div className="permission-badge">
          {operatorPermissions.isOwner ? (
            <span className="badge owner">👑 OWNER</span>
          ) : operatorPermissions.isOperator ? (
            <span className="badge operator">⚡ OPERATOR</span>
          ) : (
            <span className="badge no-access">❌ NO ACCESS</span>
          )}
        </div>
      </div>

      <div className="admin-content">
        <div className="welcome-section">
          <h2>Welcome to Batch Minting Admin Panel</h2>
          <p>This is a powerful tool for batch minting tokens and NFTs.</p>

          <div className="permission-info">
            <h3>Your Permissions:</h3>
            <ul>
              <li>✅ Connected as: {account.slice(0, 6)}...{account.slice(-4)}</li>
              <li>{operatorPermissions.isOperator ? '✅' : '❌'} Can batch mint tokens</li>
              <li>{operatorPermissions.isOwner ? '✅' : '❌'} Contract owner privileges</li>
            </ul>
          </div>
        </div>

        {/* Contract Selection Section */}
        <div className="contract-selection-section">
          <h2>🎯 选择合约</h2>
          <p>选择要执行批量操作的智能合约。支持多种代币类型。</p>

          <ContractSelector
            contracts={availableContracts}
            selectedContractId={selectedContractId}
            onContractSelect={setSelectedContractId}
            disabled={!operatorPermissions.isOperator && !operatorPermissions.isOwner}
          />

          {selectedContract && (
            <div className="selected-contract-info">
              <h3>已选择合约信息</h3>
              <div className="contract-details-grid">
                <div className="detail-item">
                  <span className="label">合约名称:</span>
                  <span className="value">{selectedContract.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">合约地址:</span>
                  <span className="value mono">
                    {selectedContract.address}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">合约类型:</span>
                  <span className="value">{selectedContract.type}</span>
                </div>
                <div className="detail-item">
                  <span className="label">可用方法:</span>
                  <span className="value">{selectedContract.batchMethods.length} 个批量方法</span>
                </div>
              </div>

              <div className="contract-methods-list">
                <h4>可用的批量方法:</h4>
                {selectedContract.batchMethods.map(method => (
                  <div key={method.name} className="method-card">
                    <div className="method-header">
                      <span className="method-name">{method.displayName}</span>
                      <span className="method-gas">⛽ ~{method.gasEstimate.toLocaleString()} gas/item</span>
                    </div>
                    <p className="method-description">{method.description}</p>
                    <div className="method-params">
                      <span className="params-title">参数:</span>
                      {method.parameters.map(param => (
                        <span key={param.name} className="param-tag">
                          {param.label} ({param.type})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Method Selection */}
        {selectedContract && (
          <div className="method-selection-section">
            <h3>🔧 选择批量方法</h3>
            <div className="method-options">
              {selectedContract.batchMethods.map((method) => (
                <button
                  key={method.name}
                  className={`method-option ${selectedMethod?.name === method.name ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMethod(method);
                    // Reset parameters when method changes
                    const defaultParams: { [key: string]: any } = {};
                    method.parameters.forEach(param => {
                      if (param.defaultValue !== undefined) {
                        defaultParams[param.name] = param.defaultValue;
                      }
                    });
                    setParameters(defaultParams);
                  }}
                  disabled={!operatorPermissions.isOperator && !operatorPermissions.isOwner}
                >
                  <div className="method-option-header">
                    <span className="method-name">{method.displayName}</span>
                    <span className="method-gas">~{method.gasEstimate.toLocaleString()} gas/item</span>
                  </div>
                  <p className="method-description">{method.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Address Input */}
        {selectedMethod && (
          <BatchAddressInput
            onAddressesChange={(addrs, results) => {
              setAddresses(addrs);
              setValidationResults(results);
            }}
            disabled={!operatorPermissions.isOperator && !operatorPermissions.isOwner}
          />
        )}

        {/* Parameters Configuration */}
        {selectedMethod && addresses.length > 0 && (
          <DynamicParameters
            parameters={selectedMethod.parameters}
            values={parameters}
            onChange={setParameters}
            disabled={!operatorPermissions.isOperator && !operatorPermissions.isOwner}
          />
        )}

        {/* Gas Estimation */}
        {selectedMethod && addresses.length > 0 && (
          <GasEstimator
            contractConfig={selectedContract!}
            selectedMethod={selectedMethod}
            addresses={addresses}
            parameters={parameters}
            onEstimateUpdate={setGasEstimate}
          />
        )}

        {/* Execute Section */}
        {selectedMethod && addresses.length > 0 && gasEstimate && (
          <div className="execute-section">
            <h3>🚀 执行批量操作</h3>

            <div className="execute-summary">
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">合约:</span>
                  <span className="value">{selectedContract?.name || '未选择'}</span>
                </div>
                <div className="summary-item">
                  <span className="label">方法:</span>
                  <span className="value">{selectedMethod?.displayName || '未选择'}</span>
                </div>
                <div className="summary-item">
                  <span className="label">地址数量:</span>
                  <span className="value">{addresses.length}</span>
                </div>
                <div className="summary-item">
                  <span className="label">预估费用:</span>
                  <span className="value highlight">{gasEstimate.estimatedCost.eth} ETH</span>
                </div>
              </div>
            </div>

            <div className="execute-actions">
              <button
                className="execute-button primary"
                disabled={
                  isExecuting ||
                  !operatorPermissions.isOperator && !operatorPermissions.isOwner ||
                  addresses.length === 0
                }
                onClick={handleExecuteBatch}
              >
                {isExecuting ? (
                  <>
                    <span className="spinner"></span>
                    {isExecuting ? '执行中...' : '正在执行批量操作...'}
                  </>
                ) : (
                  <>
                    <span className="button-icon">🚀</span>
                    {selectedMethod?.displayName || '执行批量操作'}
                  </>
                )}
              </button>

              <button
                className="execute-button secondary"
                onClick={() => {
                  // Reset everything
                  resetForm();
                }}
                disabled={isExecuting}
              >
                🔄 重置
              </button>
            </div>

            {!operatorPermissions.isOperator && !operatorPermissions.isOwner && (
              <div className="permission-warning">
                ⚠️ 你没有执行批量操作的权限。请联系管理员获取 Operator 或 Owner 权限。
              </div>
            )}
          </div>
        )}

        {/* Next Steps Section */}
        {!selectedContract && (
          <div className="coming-soon-section">
            <h2>📋 接下来的步骤</h2>
            <p>选择合约后，你将能够:</p>
            <ul>
              <li>🔧 选择批量操作方法</li>
              <li>📋 输入地址列表（CSV/JSON）</li>
              <li>📝 配置批量操作参数</li>
              <li>⛽ 预估 Gas 费用</li>
              <li>🔒 多重确认执行</li>
              <li>📊 查看操作结果</li>
            </ul>
          </div>
        )}

        {operatorPermissions.error && (
          <div className="error-message">
            ⚠️ Permission Error: {operatorPermissions.error}
          </div>
        )}
      </div>

      {/* Progress Modal */}
      {showProgressModal && executionProgress && (
        <div className="modal-overlay">
          <BatchExecutionProgressModal
            progress={executionProgress}
            onComplete={(result: BatchMintResult) => {
              setExecutionResult(result);
              setShowProgressModal(false);
              setShowResultModal(true);
            }}
            onCancel={() => {
              setShowProgressModal(false);
              setIsExecuting(false);
            }}
            isVisible={showProgressModal}
          />
        </div>
      )}

      {/* Multi-Confirmation Modal */}
      {showConfirmModal && selectedContract && selectedMethod && (
        <MultiConfirmModal
          isVisible={showConfirmModal}
          contractConfig={selectedContract}
          selectedMethod={selectedMethod}
          addresses={addresses}
          parameters={parameters}
          gasEstimate={gasEstimate ? {
            totalGas: gasEstimate.totalGas,
            totalCost: gasEstimate.estimatedCost.eth,
            gasPrice: gasEstimate.gasPrice.gwei
          } : undefined}
          onConfirm={executeConfirmedBatch}
          onCancel={() => {
            setShowConfirmModal(false);
          }}
        />
      )}

      {/* Result Modal */}
      {showResultModal && executionResult && (
        <div className="modal-overlay">
          <BatchResultModal
            result={executionResult}
            isVisible={showResultModal}
            startTime={executionStartTime || undefined}
            endTime={executionEndTime || undefined}
            gasEstimate={gasEstimate ? {
              totalGas: gasEstimate.totalGas,
              totalCost: gasEstimate.estimatedCost.eth,
              gasPrice: gasEstimate.gasPrice.gwei
            } : undefined}
            onClose={() => {
              setShowResultModal(false);
            }}
            onConfirm={() => {
              setShowResultModal(false);
              resetForm();
            }}
          />
        </div>
      )}
    </div>
  );
};