import React, { useState, useEffect } from 'react';
import type { ContractConfig, BatchMethod } from '../../types/contracts';
import type { BatchMintResult } from '../../services/BatchContractService';
import './MultiConfirmModal.css';

export interface ConfirmationStep {
  id: string;
  title: string;
  description: string;
  type: 'check' | 'input' | 'signature';
  completed: boolean;
  active: boolean;
  requiredValue?: string;
  userValue?: string;
  error?: string;
}

export interface MultiConfirmModalProps {
  isVisible: boolean;
  contractConfig: ContractConfig;
  selectedMethod: BatchMethod;
  addresses: string[];
  parameters: { [key: string]: any };
  gasEstimate?: {
    totalGas: number;
    totalCost: string;
    gasPrice: string;
  };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const MultiConfirmModal: React.FC<MultiConfirmModalProps> = ({
  isVisible,
  contractConfig,
  selectedMethod,
  addresses,
  parameters,
  gasEstimate,
  onConfirm,
  onCancel
}) => {
  const [steps, setSteps] = useState<ConfirmationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [acceptRisks, setAcceptRisks] = useState(false);
  const [signTransaction, setSignTransaction] = useState(false);

  // Initialize confirmation steps
  useEffect(() => {
    if (isVisible) {
      const initialSteps: ConfirmationStep[] = [
        {
          id: 'verify-addresses',
          title: '📍 验证地址列表',
          description: `确认将要为 ${addresses.length} 个地址进行批量操作`,
          type: 'check',
          completed: false,
          active: true
        },
        {
          id: 'verify-parameters',
          title: '⚙️ 验证操作参数',
          description: '确认合约方法和执行参数正确无误',
          type: 'check',
          completed: false,
          active: false
        },
        {
          id: 'confirm-costs',
          title: '💰 确认费用预算',
          description: gasEstimate ? `预计消耗 ${gasEstimate.totalCost} ETH Gas 费用` : '确认操作费用',
          type: 'check',
          completed: false,
          active: false
        },
        {
          id: 'manual-confirmation',
          title: '🔒 手动确认',
          description: '输入确认短语以验证操作意图',
          type: 'input',
          requiredValue: `CONFIRM BATCH MINT ${addresses.length} ADDRESSES`,
          completed: false,
          active: false
        },
        {
          id: 'accept-risks',
          title: '⚠️ 风险确认',
          description: '理解并接受批量操作的风险',
          type: 'check',
          completed: false,
          active: false
        },
        {
          id: 'final-signature',
          title: '✍️ 最终签名',
          description: '签名并提交交易到区块链',
          type: 'signature',
          completed: false,
          active: false
        }
      ];

      setSteps(initialSteps);
      setCurrentStepIndex(0);
      setConfirmationText('');
      setAcceptRisks(false);
      setSignTransaction(false);
    }
  }, [isVisible, addresses.length, gasEstimate]);

  const updateStep = (stepId: string, updates: Partial<ConfirmationStep>) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const completeCurrentStep = () => {
    if (currentStepIndex < steps.length - 1) {
      updateStep(steps[currentStepIndex].id, { completed: true, active: false });
      setCurrentStepIndex(currentStepIndex + 1);
      updateStep(steps[currentStepIndex + 1].id, { active: true });
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Confirmation failed:', error);
      setIsConfirming(false);
    }
  };

  const canProceed = () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return false;

    switch (currentStep.type) {
      case 'check':
        return true;
      case 'input':
        return confirmationText === currentStep.requiredValue;
      case 'signature':
        return acceptRisks && signTransaction;
      default:
        return false;
    }
  };

  const getStepIcon = (step: ConfirmationStep) => {
    if (step.completed) return '✅';
    if (step.active) return '⚡';
    return '⏳';
  };

  const renderStepContent = (step: ConfirmationStep) => {
    switch (step.id) {
      case 'verify-addresses':
        return (
          <div className="step-content">
            <div className="step-title">
              {getStepIcon(step)} 地址验证
            </div>
            <div className="step-description">
              批量操作将影响以下地址:
            </div>
            <div className="address-preview">
              {addresses.slice(0, 3).map((addr, idx) => (
                <div key={idx} className="address-item">
                  <code>{addr.slice(0, 8)}...{addr.slice(-6)}</code>
                </div>
              ))}
              {addresses.length > 3 && (
                <div className="address-more">
                  ... 还有 {addresses.length - 3} 个地址
                </div>
              )}
            </div>
          </div>
        );

      case 'verify-parameters':
        return (
          <div className="step-content">
            <div className="step-title">
              {getStepIcon(step)} 参数验证
            </div>
            <div className="step-description">
              合约: <strong>{contractConfig.name}</strong><br/>
              方法: <strong>{selectedMethod.displayName}</strong><br/>
              网络: <strong>Sepolia Testnet</strong>
            </div>
            {Object.entries(parameters).map(([key, value]) => (
              <div key={key} className="param-item">
                <span className="param-label">{key}:</span>
                <span className="param-value">{JSON.stringify(value)}</span>
              </div>
            ))}
          </div>
        );

      case 'confirm-costs':
        return (
          <div className="step-content">
            <div className="step-title">
              {getStepIcon(step)} 费用预算
            </div>
            <div className="step-description">
              预计 Gas 消耗和费用明细:
            </div>
            {gasEstimate && (
              <div className="cost-breakdown">
                <div className="cost-item">
                  <span>总 Gas 预估:</span>
                  <strong>{gasEstimate.totalGas.toLocaleString()}</strong>
                </div>
                <div className="cost-item">
                  <span>Gas 价格:</span>
                  <strong>{gasEstimate.gasPrice} Gwei</strong>
                </div>
                <div className="cost-item">
                  <span>预计总费用:</span>
                  <strong className="highlight">{gasEstimate.totalCost} ETH</strong>
                </div>
              </div>
            )}
          </div>
        );

      case 'manual-confirmation':
        return (
          <div className="step-content">
            <div className="step-title">
              {getStepIcon(step)} 手动确认
            </div>
            <div className="step-description">
              为防止误操作，请输入以下确认短语:
            </div>
            <div className="confirmation-input">
              <div className="input-label">确认短语:</div>
              <div className="input-wrapper">
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="输入确认短语..."
                  className={`confirmation-text ${step.error ? 'error' : ''}`}
                />
              </div>
              <div className="input-hint">
                请输入: <code>{step.requiredValue}</code>
              </div>
              {step.error && (
                <div className="error-message">
                  ⚠️ {step.error}
                </div>
              )}
            </div>
          </div>
        );

      case 'accept-risks':
        return (
          <div className="step-content">
            <div className="step-title">
              {getStepIcon(step)} 风险确认
            </div>
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                id="accept-risks"
                checked={acceptRisks}
                onChange={(e) => setAcceptRisks(e.target.checked)}
                className="checkbox-input"
              />
              <label htmlFor="accept-risks" className="checkbox-label">
                我理解批量操作不可逆，可能消耗大量 Gas 费用，并承担所有操作风险
              </label>
            </div>
            <div className="security-notice">
              <div className="notice-title">🛡️ 安全提醒</div>
              <div className="notice-text">
                • 批量操作一旦提交无法撤销<br/>
                • 请确保所有地址和参数正确无误<br/>
                • 建议先进行小批量测试
              </div>
            </div>
          </div>
        );

      case 'final-signature':
        return (
          <div className="step-content">
            <div className="step-title">
              {getStepIcon(step)} 最终签名
            </div>
            <div className="step-description">
              准备签名交易到区块链网络
            </div>
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                id="sign-transaction"
                checked={signTransaction}
                onChange={(e) => setSignTransaction(e.target.checked)}
                className="checkbox-input"
              />
              <label htmlFor="sign-transaction" className="checkbox-label">
                我确认已仔细检查所有信息，准备签名提交交易
              </label>
            </div>
            <div className="final-summary">
              <div className="summary-item">
                <span className="summary-label">操作类型:</span>
                <span className="summary-value">批量铸造</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">目标地址:</span>
                <span className="summary-value">{addresses.length} 个</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">预计费用:</span>
                <span className="summary-value highlight">
                  {gasEstimate?.totalCost || '计算中...'} ETH
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isVisible) return null;

  const currentStep = steps[currentStepIndex];
  const allStepsCompleted = steps.every(step => step.completed);

  return (
    <div className="multi-confirm-modal">
      <div className="modal-container">
        <div className="modal-header">
          <h2>
            <span className="warning-icon">⚠️</span>
            批量操作多重确认
          </h2>
          <div className="security-badge">
            🔒 安全验证
          </div>
        </div>

        <div className="modal-body">
          <div className="confirmation-steps">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`step-item ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
              >
                <div className="step-number">
                  {step.completed ? '✓' : index + 1}
                </div>
                <div className="step-content">
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">{step.description}</div>
                  {step.active && renderStepContent(step)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              className="action-button secondary"
              onClick={onCancel}
              disabled={isConfirming}
            >
              ❌ 取消操作
            </button>

            {currentStepIndex < steps.length - 1 ? (
              <button
                className="action-button primary"
                onClick={completeCurrentStep}
                disabled={!canProceed() || isConfirming}
              >
                下一步 →
              </button>
            ) : (
              <button
                className="action-button danger"
                onClick={handleConfirm}
                disabled={!canProceed() || isConfirming}
              >
                {isConfirming ? (
                  <>
                    <div className="loading-spinner"></div>
                    执行中...
                  </>
                ) : (
                  <>
                    🚀 确认并执行
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};