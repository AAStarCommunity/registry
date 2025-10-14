import React, { useState } from "react";
import { useGasAnalytics } from "../../hooks/useGasAnalytics";
import { ethers } from "ethers";
import { formatCacheAge } from "../../utils/cache";

const ETHERSCAN_BASE_URL =
  import.meta.env.VITE_ETHERSCAN_BASE_URL || "${ETHERSCAN_BASE_URL}";

/**
 * User Gas Records Page
 *
 * Features:
 * - Input wallet address to query
 * - Display user-specific statistics
 * - Show transaction history
 * - Compare with global average
 * - Manual refresh
 */
export function UserGasRecords() {
  const [inputAddress, setInputAddress] = useState("");
  const [queryAddress, setQueryAddress] = useState<string | undefined>(
    undefined,
  );

  const { analytics, userStats, isLoading, error, refresh } = useGasAnalytics({
    userAddress: queryAddress,
    enableBackgroundRefresh: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate address
    if (!inputAddress) {
      alert("请输入钱包地址");
      return;
    }

    if (!ethers.isAddress(inputAddress)) {
      alert("无效的钱包地址格式");
      return;
    }

    setQueryAddress(inputAddress);
  };

  const handleClear = () => {
    setInputAddress("");
    setQueryAddress(undefined);
  };

  const formatGasValue = (wei: string) => {
    return `${ethers.formatEther(wei)} ETH`;
  };

  const formatPntValue = (pnt: string) => {
    return `${ethers.formatUnits(pnt, 18)} PNT`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString("zh-CN");
  };

  // Filter user transactions from recent transactions
  const userTransactions =
    queryAddress && analytics
      ? analytics.recentTransactions.filter(
          (tx) => tx.user.toLowerCase() === queryAddress.toLowerCase(),
        )
      : [];

  const cacheAge = analytics ? formatCacheAge(analytics.lastUpdated) : "";

  return (
    <div className="user-gas-records">
      {/* Header */}
      <div className="page-header">
        <h1>🔍 查询 Gas 使用记录</h1>
        <p>输入钱包地址查看该用户的 Gas 赞助统计和交易历史</p>
      </div>

      {/* Search Form */}
      <div className="search-section">
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            placeholder="输入钱包地址 (0x...)"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            className="address-input"
          />
          <button type="submit" disabled={isLoading} className="search-btn">
            {isLoading ? "查询中..." : "🔍 查询"}
          </button>
          {queryAddress && (
            <button type="button" onClick={handleClear} className="clear-btn">
              ✖ 清除
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      {error && (
        <div className="error-message">
          <h3>❌ 查询失败</h3>
          <p>{error.message}</p>
          <button onClick={refresh}>重试</button>
        </div>
      )}

      {queryAddress && !isLoading && !error && (
        <>
          {/* Cache Status */}
          {analytics && (
            <div className="cache-info">
              <span>数据更新于: {cacheAge}</span>
              <button onClick={refresh} className="refresh-link">
                🔄 刷新
              </button>
            </div>
          )}

          {/* User Statistics */}
          {userStats ? (
            <>
              <div className="user-stats-section">
                <h2>📊 用户统计</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🚀</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {userStats.totalOperations.toLocaleString()}
                      </div>
                      <div className="stat-label">总交易数</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">⛽</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {formatGasValue(userStats.totalGasSponsored)}
                      </div>
                      <div className="stat-label">总赞助 Gas</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {formatPntValue(userStats.totalPntPaid)}
                      </div>
                      <div className="stat-label">总支付 PNT</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {formatGasValue(userStats.averageGasPerOperation)}
                      </div>
                      <div className="stat-label">平均 Gas/交易</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="timeline-label">首次交易:</span>
                    <span className="timeline-value">
                      {formatTimestamp(userStats.firstTransaction)}
                    </span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-label">最近交易:</span>
                    <span className="timeline-value">
                      {formatTimestamp(userStats.lastTransaction)}
                    </span>
                  </div>
                </div>

                {/* Comparison with Global Average */}
                {analytics && analytics.totalOperations > 0 && (
                  <div className="comparison">
                    <h3>📈 与全局平均对比</h3>
                    <div className="comparison-grid">
                      <div className="comparison-item">
                        <span className="comparison-label">平均 Gas/交易:</span>
                        <div className="comparison-values">
                          <span className="user-value">
                            用户:{" "}
                            {formatGasValue(userStats.averageGasPerOperation)}
                          </span>
                          <span className="global-value">
                            全局:{" "}
                            {formatGasValue(
                              (
                                BigInt(analytics.totalGasSponsored) /
                                BigInt(analytics.totalOperations)
                              ).toString(),
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="comparison-item">
                        <span className="comparison-label">用户占比:</span>
                        <span className="percentage">
                          {(
                            (userStats.totalOperations /
                              analytics.totalOperations) *
                            100
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction History */}
              <div className="transactions-section">
                <h2>📝 交易历史 (最近 {userTransactions.length} 条)</h2>
                {userTransactions.length > 0 ? (
                  <table className="transactions-table">
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>Gas Token</th>
                        <th>实际 Gas</th>
                        <th>PNT 支付</th>
                        <th>Gas/PNT 比率</th>
                        <th>交易哈希</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTransactions.map((tx, index) => {
                        const ratio =
                          BigInt(tx.actualGasCost) > 0
                            ? (BigInt(tx.pntAmount) * BigInt(10000)) /
                              BigInt(tx.actualGasCost) /
                              BigInt(100)
                            : BigInt(0);

                        return (
                          <tr key={`${tx.transactionHash}-${index}`}>
                            <td>{formatTimestamp(tx.timestamp)}</td>
                            <td className="address">
                              <a
                                href={`${ETHERSCAN_BASE_URL}/address/${tx.gasToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {tx.gasToken.slice(0, 6)}...
                                {tx.gasToken.slice(-4)}
                              </a>
                            </td>
                            <td>{formatGasValue(tx.actualGasCost)}</td>
                            <td>{formatPntValue(tx.pntAmount)}</td>
                            <td>{ratio.toString()}%</td>
                            <td className="address">
                              <a
                                href={`${ETHERSCAN_BASE_URL}/tx/${tx.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {tx.transactionHash.slice(0, 10)}...
                                {tx.transactionHash.slice(-8)}
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty-state">
                    该用户暂无交易记录 (可能不在最近20条内)
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="no-data">
              <h3>📭 未找到数据</h3>
              <p>该地址尚未使用 SuperPaymaster 进行 Gas 赞助</p>
              <p className="hint">
                💡 确保地址正确且已经发起过至少一次赞助交易
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {!queryAddress && !isLoading && (
        <div className="initial-state">
          <div className="initial-icon">🔍</div>
          <h3>开始查询</h3>
          <p>在上方输入框中输入钱包地址,查看该用户的 Gas 使用统计</p>
        </div>
      )}

      <style jsx>{`
        .user-gas-records {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .page-header p {
          color: #666;
          margin: 0;
        }

        .search-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .search-form {
          display: flex;
          gap: 1rem;
        }

        .address-input {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: monospace;
          transition: border-color 0.2s;
        }

        .address-input:focus {
          outline: none;
          border-color: #0066cc;
        }

        .search-btn {
          padding: 0.75rem 1.5rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .search-btn:hover:not(:disabled) {
          background: #0052a3;
          transform: translateY(-2px);
        }

        .search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .clear-btn {
          padding: 0.75rem 1.5rem;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: #c82333;
        }

        .cache-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #666;
        }

        .refresh-link {
          background: none;
          border: none;
          color: #0066cc;
          cursor: pointer;
          font-size: 0.9rem;
          text-decoration: underline;
        }

        .user-stats-section,
        .transactions-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .user-stats-section h2,
        .transactions-section h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .timeline {
          display: flex;
          gap: 2rem;
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .timeline-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .timeline-label {
          font-size: 0.85rem;
          color: #666;
        }

        .timeline-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #333;
        }

        .comparison {
          padding: 1rem;
          background: #f0f8ff;
          border-radius: 8px;
          border-left: 4px solid #0066cc;
        }

        .comparison h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
        }

        .comparison-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .comparison-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .comparison-label {
          font-weight: 600;
          color: #333;
        }

        .comparison-values {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
        }

        .user-value {
          color: #0066cc;
          font-weight: 600;
        }

        .global-value {
          color: #666;
        }

        .percentage {
          font-size: 1.1rem;
          font-weight: bold;
          color: #0066cc;
        }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
        }

        .transactions-table th {
          background: #f5f5f5;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }

        .transactions-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #eee;
        }

        .transactions-table tbody tr:hover {
          background: #f9f9f9;
        }

        .address a {
          color: #0066cc;
          text-decoration: none;
          font-family: monospace;
        }

        .address a:hover {
          text-decoration: underline;
        }

        .error-message,
        .no-data,
        .initial-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .error-message h3,
        .no-data h3,
        .initial-state h3 {
          margin: 0 0 1rem 0;
        }

        .error-message button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #cc0000;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .hint {
          color: #666;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .initial-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 2rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
