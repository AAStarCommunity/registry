import React from "react";
import { useGasAnalytics } from "../../hooks/useGasAnalytics";
import { ethers } from "ethers";
import { formatCacheAge } from "../../utils/cache";

const ETHERSCAN_BASE_URL =
  import.meta.env.VITE_ETHERSCAN_BASE_URL || "${ETHERSCAN_BASE_URL}";

/**
 * Admin Dashboard for PaymasterV4 Gas Analytics
 *
 * Features:
 * - Global statistics overview
 * - Top users by operations
 * - Daily trends chart
 * - Recent transactions list
 * - Manual refresh button
 * - Cache status display
 */
export function AnalyticsDashboard() {
  const { analytics, isLoading, error, refresh } = useGasAnalytics({
    enableBackgroundRefresh: true,
  });

  // Use default values for safe rendering (will be updated after cache loads)
  const safeAnalytics = analytics || {
    totalOperations: 0,
    totalGasSponsored: "0",
    totalPntPaid: "0",
    uniqueUsers: 0,
    activePaymasters: 0,
    paymasterStats: [],
    topUsers: [],
    recentTransactions: [],
    dailyTrends: [],
  };

  // Debug: log render state
  console.log("🎨 Dashboard render:", {
    isLoading,
    hasError: !!error,
    hasAnalytics: !!analytics,
    totalOps: safeAnalytics.totalOperations,
  });

  // Show error
  if (error) {
    return (
      <div className="analytics-dashboard error">
        <h2>❌ Loading Failed</h2>
        <p>{error.message}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  // Values from analytics are already formatted strings, just add units
  const formatGasValue = (formattedEth: string) => {
    return `${formattedEth} ETH`;
  };

  const formatPntValue = (formattedPnt: string) => {
    return `${formattedPnt} PNT`;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleString("zh-CN");
  };

  // Safe access to lastUpdated with fallback
  const cacheAge = analytics?.lastUpdated
    ? formatCacheAge(analytics.lastUpdated)
    : "Unknown";

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>📊 SuperPaymaster Gas Analytics</h1>
          <p className="cache-status">
            Last updated: {cacheAge}
            {isLoading && <span className="refreshing"> (refreshing...)</span>}
          </p>
        </div>
        <button onClick={refresh} disabled={isLoading} className="refresh-btn">
          🔄 Refresh Data
        </button>
      </div>

      {/* Overview Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-value">
              {safeAnalytics.totalOperations.toLocaleString()}
            </div>
            <div className="stat-label">Total Operations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⛽</div>
          <div className="stat-content">
            <div className="stat-value">
              {formatGasValue(safeAnalytics.totalGasSponsored)}
            </div>
            <div className="stat-label">Total Gas Sponsored</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">
              {formatPntValue(safeAnalytics.totalPntPaid)}
            </div>
            <div className="stat-label">Total PNT Paid</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">
              {safeAnalytics.uniqueUsers.toLocaleString()}
            </div>
            <div className="stat-label">Unique Users</div>
          </div>
        </div>
      </div>

      {/* Daily Trends Chart */}
      <div className="section">
        <h2>📈 Daily Trends (Last 30 Days)</h2>
        <div className="daily-trends">
          {safeAnalytics.dailyTrends.length > 0 ? (
            <div className="trends-chart">
              {(() => {
                const maxOps = Math.max(
                  ...safeAnalytics.dailyTrends.map((t) => t.operations),
                );
                return safeAnalytics.dailyTrends.map((trend) => {
                  const height = (trend.operations / maxOps) * 100;
                  return (
                    <div key={trend.date} className="trend-bar-container">
                      <div
                        className="trend-bar"
                        style={{ height: `${height}%` }}
                        title={`${trend.date}\nOperations: ${trend.operations}\nGas: ${formatGasValue(trend.gasSponsored)}\nPNT: ${formatPntValue(trend.pntPaid)}`}
                      >
                        <span className="bar-value">{trend.operations}</span>
                      </div>
                      <div className="trend-date">{trend.date.slice(5)}</div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <p className="empty-state">No daily data available</p>
          )}
        </div>
      </div>

      {/* Paymaster Statistics */}
      <div className="section">
        <h2>💳 Active Paymasters ({safeAnalytics.activePaymasters})</h2>
        <div className="paymasters-list">
          {safeAnalytics.paymasterStats.length > 0 ? (
            <table className="paymasters-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Paymaster Address</th>
                  <th>Operations</th>
                  <th>Total Gas Sponsored</th>
                  <th>Total PNT Collected</th>
                  <th>Unique Users</th>
                </tr>
              </thead>
              <tbody>
                {safeAnalytics.paymasterStats.map((pm, index) => (
                  <tr key={pm.address}>
                    <td className="rank">#{index + 1}</td>
                    <td className="address">
                      <a
                        href={`${ETHERSCAN_BASE_URL}/address/${pm.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={pm.address}
                      >
                        {pm.address.slice(0, 8)}...{pm.address.slice(-6)}
                      </a>
                    </td>
                    <td>{pm.operations.toLocaleString()}</td>
                    <td>{formatGasValue(pm.totalGas)}</td>
                    <td>{formatPntValue(pm.totalPnt)}</td>
                    <td>{pm.uniqueUsers.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No active Paymasters found</p>
          )}
        </div>
      </div>

      {/* Top Users */}
      <div className="section">
        <h2>🏆 Top 10 Users</h2>
        <div className="top-users">
          {safeAnalytics.topUsers.length > 0 ? (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Operations</th>
                  <th>Total Gas</th>
                  <th>Total PNT</th>
                  <th>Avg Gas</th>
                  <th>Last Tx</th>
                </tr>
              </thead>
              <tbody>
                {safeAnalytics.topUsers.map((user, index) => (
                  <tr key={user.address}>
                    <td className="rank">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `#${index + 1}`}
                    </td>
                    <td className="address">
                      <a
                        href={`${ETHERSCAN_BASE_URL}/address/${user.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {user.address.slice(0, 6)}...
                        {user.address.slice(-4)}
                      </a>
                    </td>
                    <td>{user.operations.toLocaleString()}</td>
                    <td>{formatGasValue(user.totalGas)}</td>
                    <td>{formatPntValue(user.totalPnt)}</td>
                    <td>{formatGasValue(user.avgGasPerOp)}</td>
                    <td>{formatTimestamp(user.lastTxTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No user data available</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="section">
        <h2>🕐 Recent Transactions (Last 20)</h2>
        <div className="recent-transactions">
          {safeAnalytics.recentTransactions.length > 0 ? (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Gas Token</th>
                  <th>Actual Gas</th>
                  <th>PNT Paid</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {safeAnalytics.recentTransactions
                  .slice(0, 20)
                  .map((tx, index) => (
                    <tr key={`${tx.transactionHash}-${index}`}>
                      <td>{formatTimestamp(tx.timestamp)}</td>
                      <td className="address">
                        <a
                          href={`${ETHERSCAN_BASE_URL}/address/${tx.user}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                        </a>
                      </td>
                      <td className="address">
                        <a
                          href={`${ETHERSCAN_BASE_URL}/address/${tx.gasToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {tx.gasToken.slice(0, 6)}...{tx.gasToken.slice(-4)}
                        </a>
                      </td>
                      <td>{formatGasValue(tx.actualGasCost)}</td>
                      <td>{formatPntValue(tx.pntAmount)}</td>
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
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No transaction records</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .analytics-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .cache-status {
          color: #666;
          font-size: 0.9rem;
        }

        .refreshing {
          color: #0066cc;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .refresh-btn {
          padding: 0.75rem 1.5rem;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #0052a3;
          transform: translateY(-2px);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: transform 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          font-size: 2.5rem;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: bold;
          color: #333;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .section h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }

        .daily-trends {
          min-height: 300px;
        }

        .trends-chart {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 250px;
          padding: 1rem 0;
        }

        .trend-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .trend-bar {
          width: 100%;
          background: linear-gradient(to top, #0066cc, #00aaff);
          border-radius: 4px 4px 0 0;
          min-height: 20px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 4px;
        }

        .trend-bar:hover {
          background: linear-gradient(to top, #0052a3, #0088cc);
        }

        .bar-value {
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .trend-date {
          font-size: 0.7rem;
          color: #666;
          transform: rotate(-45deg);
          white-space: nowrap;
        }

        .paymasters-table,
        .users-table,
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
        }

        .paymasters-table th,
        .users-table th,
        .transactions-table th {
          background: #f5f5f5;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }

        .paymasters-table td,
        .users-table td,
        .transactions-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #eee;
        }

        .paymasters-table tbody tr:hover,
        .users-table tbody tr:hover,
        .transactions-table tbody tr:hover {
          background: #f9f9f9;
        }

        .rank {
          font-size: 1.2rem;
          text-align: center;
        }

        .address a {
          color: #0066cc;
          text-decoration: none;
          font-family: monospace;
        }

        .address a:hover {
          text-decoration: underline;
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 2rem;
          font-style: italic;
        }

        .loading,
        .error,
        .empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0066cc;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .error button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #cc0000;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        }

        .error button:hover {
          background: #a30000;
        }
      `}</style>
    </div>
  );
}
