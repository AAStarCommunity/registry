import React from 'react';
import type { BatchMintResult } from '../../services/BatchContractService';
import { ResultStatistics } from './ResultStatistics';
import './BatchResultModal.css';

interface BatchResultModalProps {
  result: BatchMintResult;
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  startTime?: Date;
  endTime?: Date;
  gasEstimate?: {
    totalGas: number;
    totalCost: string;
    gasPrice: string;
  };
}

export const BatchResultModal: React.FC<BatchResultModalProps> = ({
  result,
  isVisible,
  onClose,
  onConfirm,
  startTime,
  endTime,
  gasEstimate
}) => {
  if (!isVisible) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCopyTxHash = () => {
    if (result.txHash) {
      navigator.clipboard.writeText(result.txHash);
      alert('交易哈希已复制到剪贴板: ' + result.txHash);
    }
  };

  const getStatusDisplay = () => {
    const successCount = result.results.filter(r => r.success).length;
    const errorCount = result.results.filter(r => !r.success).length;

    if (result.success) {
      return {
        title: '✅ 批量操作完成',
        message: `成功为 ${successCount} 个地址铸造了 SBT！`,
        color: 'success',
        success: { count: successCount },
        error: { count: errorCount },
        totalGasUsed: result.totalGasUsed,
        totalCost: result.totalCost,
        errors: []
      };
    } else {
      return {
        title: '❌ 操作失败',
        message: `${errorCount} 个地址失败`,
        color: 'error',
        success: { count: successCount },
        error: { count: errorCount },
        totalGasUsed: result.totalGasUsed,
        totalCost: result.totalCost,
        errors: result.results.filter(r => !r.success).map(r => r.error || '未知错误')
      };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="batch-result-modal" style={{ maxWidth: '800px' }}>
      <div className="result-header">
        <h2>{display.title}</h2>
        <button
          className="close-button"
          onClick={handleConfirm}
        >
          ✕
        </button>
      </div>

      {/* New Enhanced Statistics */}
      <ResultStatistics
        result={result}
        startTime={startTime}
        endTime={endTime}
        gasEstimate={gasEstimate}
      />

      {/* Legacy Summary Section */}
      <div className="result-summary">
        <p className="summary-text">{display.message}</p>
        {display.errors.length > 0 && (
          <div className="error-details">
            <h4>错误详情:</h4>
            <ul>
              {display.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="result-actions">
          <button
            className="result-button primary"
            onClick={handleConfirm}
          >
            {result.success ? '确认完成' : '确认关闭'}
          </button>

          {result.txHash && (
            <button
              className="result-button secondary"
              onClick={handleCopyTxHash}
            >
              📋 复制交易哈希
            </button>
          )}

          <button
            className="result-button outline"
            onClick={() => {
              // Open detailed view in new tab or modal
              window.open(`https://sepolia.etherscan.io/tx/${result.txHash}`, '_blank');
            }}
          >
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
};