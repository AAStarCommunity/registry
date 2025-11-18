import React from 'react';
import type { BatchMintResult } from '../../services/BatchContractService';
import './ResultStatistics.css';

export interface ResultStatisticsProps {
  result: BatchMintResult;
  startTime?: Date;
  endTime?: Date;
  gasEstimate?: {
    totalGas: number;
    totalCost: string;
    gasPrice: string;
  };
}

export const ResultStatistics: React.FC<ResultStatisticsProps> = ({
  result,
  startTime,
  endTime,
  gasEstimate
}) => {
  const successCount = result.results.filter(r => r.success).length;
  const failureCount = result.results.filter(r => !r.success).length;
  const successRate = (successCount / result.results.length) * 100;

  const duration = startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationSeconds = (duration / 1000).toFixed(1);

  const gasEfficiency = gasEstimate ?
    ((gasEstimate.totalGas - result.totalGasUsed) / gasEstimate.totalGas * 100) : 0;

  const successfulResults = result.results.filter(r => r.success);
  const failedResults = result.results.filter(r => !r.success);

  const exportToCSV = () => {
    const headers = ['Address', 'Status', 'Token ID', 'Error'];
    const rows = result.results.map(r => [
      r.address,
      r.success ? 'Success' : 'Failed',
      r.tokenId || '',
      r.error || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch-mint-results-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch-mint-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="result-statistics">
      <div className="statistics-header">
        <h3>📊 操作结果统计</h3>
        <div className="export-actions">
          <button className="export-button" onClick={exportToCSV}>
            📊 导出 CSV
          </button>
          <button className="export-button" onClick={exportToJSON}>
            📄 导出 JSON
          </button>
        </div>
      </div>

      <div className="statistics-grid">
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{successCount}</div>
          <div className="stat-label">成功操作</div>
          <div className="stat-trend trend-up">
            ↑ {successRate.toFixed(1)}% 成功率
          </div>
        </div>

        <div className="stat-card error">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{failureCount}</div>
          <div className="stat-label">失败操作</div>
          <div className="stat-trend trend-down">
            ↓ {((100 - successRate)).toFixed(1)}% 失败率
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">⛽</div>
          <div className="stat-value">{result.totalGasUsed.toLocaleString()}</div>
          <div className="stat-label">Gas 消耗总量</div>
          {gasEstimate && (
            <div className="stat-trend">
              {gasEfficiency > 0 ? '↓' : '↑'} {Math.abs(gasEfficiency).toFixed(1)}%
              {gasEfficiency > 0 ? ' 节省' : ' 超出'}
            </div>
          )}
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{result.totalCost}</div>
          <div className="stat-label">总费用 (ETH)</div>
          <div className="stat-trend">
            ≈ {(parseFloat(result.totalCost) * 2000).toFixed(2)} USD
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="detailed-stats">
        <h4>🎯 总体进度</h4>
        <div className="progress-indicator">
          <div
            className="progress-fill"
            style={{ width: `${successRate}%` }}
          />
        </div>
        <div className="time-breakdown">
          {startTime && (
            <div className="time-item">
              <div className="time-value">{durationSeconds}s</div>
              <div className="time-label">总耗时</div>
            </div>
          )}
          <div className="time-item">
            <div className="time-value">{result.results.length}</div>
            <div className="time-label">总地址数</div>
          </div>
          <div className="time-item">
            <div className="time-value">
              {(result.totalGasUsed / result.results.length).toFixed(0)}
            </div>
            <div className="time-label">平均 Gas/地址</div>
          </div>
          <div className="time-item">
            <div className="time-value">
              {result.gasPrice}
            </div>
            <div className="time-label">Gas 价格 (Gwei)</div>
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      {gasEstimate && (
        <div className="detailed-stats">
          <h4>💰 费用分析</h4>
          <div className="cost-analysis">
            <div className="cost-grid">
              <div className="cost-item">
                <div className="cost-label">预估费用</div>
                <div className="cost-value">{gasEstimate.totalCost} ETH</div>
              </div>
              <div className="cost-item">
                <div className="cost-label">实际费用</div>
                <div className="cost-value">{result.totalCost} ETH</div>
              </div>
              <div className="cost-item">
                <div className="cost-label">费用差异</div>
                <div className="cost-value">
                  {(parseFloat(result.totalCost) - parseFloat(gasEstimate.totalCost)).toFixed(6)} ETH
                </div>
              </div>
              <div className="cost-item">
                <div className="cost-label">费用准确性</div>
                <div className="cost-value">
                  {((1 - Math.abs(parseFloat(result.totalCost) - parseFloat(gasEstimate.totalCost)) / parseFloat(gasEstimate.totalCost)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Successful Operations */}
      {successfulResults.length > 0 && (
        <div className="detailed-stats">
          <h4>✅ 成功操作详情</h4>
          <div className="success-summary">
            <div className="success-list">
              {successfulResults.slice(0, 10).map((item, index) => (
                <div key={index} className="success-item">
                  <span>✅</span>
                  <span className="success-address">
                    {item.address.slice(0, 8)}...{item.address.slice(-6)}
                  </span>
                  {item.tokenId && (
                    <span className="success-token">#{item.tokenId}</span>
                  )}
                </div>
              ))}
              {successfulResults.length > 10 && (
                <div className="success-item">
                  <span>📋</span>
                  <span>... 还有 {successfulResults.length - 10} 个成功操作</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Failed Operations */}
      {failedResults.length > 0 && (
        <div className="detailed-stats">
          <h4>❌ 失败操作详情</h4>
          <div className="error-summary">
            <div className="error-list">
              {failedResults.slice(0, 10).map((item, index) => (
                <div key={index} className="error-item">
                  <strong>{item.address.slice(0, 8)}...{item.address.slice(-6)}</strong>
                  <br />
                  {item.error}
                </div>
              ))}
              {failedResults.length > 10 && (
                <div className="error-item">
                  <strong>... 还有 {failedResults.length - 10} 个失败操作</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Hash */}
      {result.txHash && (
        <div className="detailed-stats">
          <h4>🔗 交易信息</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {result.txHash}
            </span>
            <button
              className="export-button"
              onClick={() => {
                navigator.clipboard.writeText(result.txHash);
                alert('交易哈希已复制到剪贴板');
              }}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              📋 复制
            </button>
            <a
              href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="export-button"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              🌐 Etherscan
            </a>
          </div>
        </div>
      )}
    </div>
  );
};