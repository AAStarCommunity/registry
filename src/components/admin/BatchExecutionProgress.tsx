import React, { useState, useEffect } from 'react';
import type { BatchExecutionProgress, BatchMintResult } from '../../services/BatchContractService';
import './BatchExecutionProgress.css';

interface BatchExecutionProgressProps {
  progress: BatchExecutionProgress;
  onComplete: (result: BatchMintResult) => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const BatchExecutionProgressModal: React.FC<BatchExecutionProgressProps> = ({
  progress,
  onComplete,
  onCancel,
  isVisible
}) => {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const getProgressPercentage = () => {
    if (progress.totalItems === 0) return 0;
    return (progress.currentIndex / progress.totalItems) * 100;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'executing':
        return '⚡';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#6c757d';
      case 'executing':
        return '#007bff';
      case 'completed':
        return '#28a745';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="batch-execution-progress">
      <div className="progress-header">
        <h3>🚀 批量操作进行中</h3>
        <div className="progress-stats">
          <span className="current-index">{progress.currentIndex + 1}</span>
          <span className="total-items">/ {progress.totalItems}</span>
          <span className="progress-percentage">{getProgressPercentage().toFixed(1)}%</span>
        </div>
        <button
          className="cancel-button"
          onClick={onCancel}
          title="取消操作"
        >
          ❌ 取消
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        <div className="progress-labels">
          <span className="progress-start">开始</span>
          <span className="progress-end">完成</span>
        </div>
      </div>

      {/* Current Item Status */}
      <div className="current-item-status">
        <div className="status-item">
          <span className="status-icon" style={{ color: getStatusColor(progress.status) }}>
            {getStatusIcon(progress.status)}
          </span>
          <span className="status-text">
            {progress.status === 'pending' && '准备处理'}
            {progress.status === 'executing' && `正在处理 ${progress.currentAddress.slice(0, 8)}...${progress.currentAddress.slice(-6)}`}
            {progress.status === 'completed' && `✅ ${progress.currentAddress.slice(0, 8)}...${progress.currentAddress.slice(-6)}`}
            {progress.status === 'failed' && `❌ ${progress.currentAddress.slice(0, 8)}...${progress.currentAddress.slice(-6)}`}
          </span>
        </div>

        {/* Current Step Details */}
        {progress.currentStep && progress.status === 'executing' && (
          <div className="current-step-details">
            <div className="step-indicator">
              {progress.currentStep === 'checking_gtoken' && (
                <>
                  <span className="step-icon">🔍</span>
                  <span className="step-text">检查 GToken 余额</span>
                </>
              )}
              {progress.currentStep === 'transferring_gtoken' && (
                <>
                  <span className="step-icon">💸</span>
                  <span className="step-text">转账 GToken</span>
                  {progress.gTokenAmount && (
                    <span className="step-amount">({progress.gTokenAmount} GT)</span>
                  )}
                </>
              )}
              {progress.currentStep === 'minting' && (
                <>
                  <span className="step-icon">⚡</span>
                  <span className="step-text">铸造 SBT</span>
                </>
              )}
            </div>
            {progress.currentStepDescription && (
              <div className="step-description">
                {progress.currentStepDescription}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="results-list">
        <div className="results-header">
          <h4>执行结果</h4>
          <div className="results-summary">
            <span className="success-count">
              ✅ {progress.results.filter(r => r.success).length}
            </span>
            <span className="error-count">
              ❌ {progress.results.filter(r => !r.success).length}
            </span>
          </div>
        </div>

        <div className="results-grid">
          {progress.results.map((result, index) => (
            <div
              key={index}
              className={`result-item ${result.success ? 'success' : 'failed'}`}
              onClick={() => setExpandedItem(expandedItem === index ? null : index)}
            >
              <div className="result-header">
                <span className="result-index">{index + 1}</span>
                <span className="result-address">
                  {result.address.slice(0, 8)}...{result.address.slice(-6)}
                </span>
                <span className="result-status">
                  {result.success ? '✅' : '❌'}
                </span>
              </div>

              <div className="result-details">
                {result.success && result.tokenId && (
                  <div className="result-detail">
                    <span className="detail-label">Token ID:</span>
                    <span className="detail-value">#{result.tokenId}</span>
                  </div>
                )}
                {!result.success && result.error && (
                  <div className="result-detail">
                    <span className="detail-label">错误:</span>
                    <span className="detail-value error">{result.error}</span>
                  </div>
                )}
              </div>

              {expandedItem === index && (
                <div className="result-expanded">
                  <div className="expanded-header">
                    <h5>详细信息</h5>
                    <button
                      className="close-button"
                      onClick={() => setExpandedItem(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="expanded-content">
                    <div className="info-item">
                      <span className="info-label">完整地址:</span>
                      <span className="info-value">{result.address}</span>
                    </div>
                    {result.success && result.tokenId && (
                      <div className="info-item">
                        <span className="info-label">Token ID:</span>
                        <span className="info-value">#{result.tokenId}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">状态:</span>
                      <span className="info-value">
                        {result.success ? '成功' : '失败'}
                      </span>
                    </div>
                    {result.error && (
                      <div className="info-item">
                        <span className="info-label">错误详情:</span>
                        <span className="info-value error">{result.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Execution Info */}
      <div className="execution-info">
        <div className="info-item">
          <span className="info-label">当前网络:</span>
          <span className="info-value">Sepolia Testnet</span>
        </div>
        <div className="info-item">
          <span className="info-label">合约:</span>
          <span className="info-value">MySBT</span>
        </div>
        <div className="info-item">
          <span className="info-label">方法:</span>
          <span className="info-value">Batch Mint</span>
        </div>
      </div>
    </div>
  );
};