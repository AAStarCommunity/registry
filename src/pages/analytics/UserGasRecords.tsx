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
      alert("Please enter a wallet address");
      return;
    }

    if (!ethers.isAddress(inputAddress)) {
      alert("Invalid wallet address format");
      return;
    }

    setQueryAddress(inputAddress);
  };

  const handleClear = () => {
    setInputAddress("");
    setQueryAddress(undefined);
  };

  // Format userStats (already formatted strings, just add units)
  const formatUserStatsValue = (formattedValue: string, unit: string) => {
    return `${formattedValue} ${unit}`;
  };

  // Format transaction data (BigInt strings, need to convert)
  const formatGasValue = (weiString: string) => {
    return `${ethers.formatEther(weiString)} ETH`;
  };

  const formatPntValue = (pntString: string) => {
    return `${ethers.formatUnits(pntString, 18)} PNT`;
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
        <h1>🔍 Query Gas Usage Records</h1>
        <p>
          Enter a wallet address to view gas sponsorship statistics and
          transaction history
        </p>
      </div>

      {/* Search Form */}
      <div className="search-section">
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            placeholder="Enter wallet address (0x...)"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            className="address-input"
          />
          <button type="submit" disabled={isLoading} className="search-btn">
            {isLoading ? "Querying..." : "🔍 Query"}
          </button>
          {queryAddress && (
            <button type="button" onClick={handleClear} className="clear-btn">
              ✖ Clear
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      {error && (
        <div className="error-message">
          <h3>❌ Query Failed</h3>
          <p>{error.message}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      {queryAddress && !isLoading && !error && (
        <>
          {/* Cache Status */}
          {analytics && (
            <div className="cache-info">
              <span>Last updated: {cacheAge}</span>
              <button onClick={refresh} className="refresh-link">
                🔄 Refresh
              </button>
            </div>
          )}

          {/* User Statistics */}
          {userStats ? (
            <>
              <div className="user-stats-section">
                <h2>📊 User Statistics</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🚀</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {userStats.totalOperations.toLocaleString()}
                      </div>
                      <div className="stat-label">Total Operations</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">⛽</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {formatUserStatsValue(
                          userStats.totalGasSponsored,
                          "ETH",
                        )}
                      </div>
                      <div className="stat-label">Total Gas Sponsored</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {formatUserStatsValue(userStats.totalPntPaid, "PNT")}
                      </div>
                      <div className="stat-label">Total PNT Paid</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <div className="stat-value">
                        {formatUserStatsValue(
                          userStats.averageGasPerOperation,
                          "ETH",
                        )}
                      </div>
                      <div className="stat-label">Avg Gas/Operation</div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="timeline-label">First Transaction:</span>
                    <span className="timeline-value">
                      {formatTimestamp(userStats.firstTransaction)}
                    </span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-label">Latest Transaction:</span>
                    <span className="timeline-value">
                      {formatTimestamp(userStats.lastTransaction)}
                    </span>
                  </div>
                </div>

                {/* Comparison with Global Average */}
                {analytics && analytics.totalOperations > 0 && (
                  <div className="comparison">
                    <h3>📈 Comparison with Global Average</h3>
                    <div className="comparison-grid">
                      <div className="comparison-item">
                        <span className="comparison-label">
                          Avg Gas/Operation:
                        </span>
                        <div className="comparison-values">
                          <span className="user-value">
                            User:{" "}
                            {formatUserStatsValue(
                              userStats.averageGasPerOperation,
                              "ETH",
                            )}
                          </span>
                          <span className="global-value">
                            Global:{" "}
                            {(() => {
                              const totalGasWei = ethers.parseEther(
                                analytics.totalGasSponsored,
                              );
                              const avgGasWei =
                                totalGasWei / BigInt(analytics.totalOperations);
                              return formatUserStatsValue(
                                ethers.formatEther(avgGasWei),
                                "ETH",
                              );
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="comparison-item">
                        <span className="comparison-label">User Share:</span>
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
                <h2>
                  📝 Transaction History (Latest {userTransactions.length})
                </h2>
                {userTransactions.length > 0 ? (
                  <table className="transactions-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Gas Token</th>
                        <th>Actual Gas</th>
                        <th>PNT Paid</th>
                        <th>Gas/PNT Ratio</th>
                        <th>Tx Hash</th>
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
                    No transaction records for this user (may not be in latest
                    20)
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="no-data">
              <h3>📭 No Data Found</h3>
              <p>
                This address has not used SuperPaymaster for gas sponsorship
              </p>
              <p className="hint">
                💡 Ensure the address is correct and has made at least one
                sponsored transaction
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {!queryAddress && !isLoading && (
        <div className="initial-state">
          <div className="initial-icon">🔍</div>
          <h3>Start Query</h3>
          <p>Enter a wallet address above to view gas usage statistics</p>
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
