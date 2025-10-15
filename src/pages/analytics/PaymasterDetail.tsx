import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useGasAnalytics } from "../../hooks/useGasAnalytics";
import {
  getEtherscanAddressUrl,
  getEtherscanTxUrl,
} from "../../utils/etherscan";
import { formatCacheAge } from "../../utils/cache";

/**
 * Paymaster Detail Page
 *
 * Displays comprehensive information about a specific Paymaster:
 * - Basic info (name, address, fee rate)
 * - Registration status (stake amount, reputation)
 * - Performance metrics (success rate, total operations)
 * - Recent transactions
 * - User statistics
 */
export function PaymasterDetail() {
  const { address } = useParams<{ address: string }>();
  const { analytics, isLoading, error, refresh } = useGasAnalytics({
    enableBackgroundRefresh: false,
  });

  const [registryInfo, setRegistryInfo] = useState<any>(null);
  const [loadingRegistry, setLoadingRegistry] = useState(true);

  // Fetch Paymaster info from Registry contract
  useEffect(() => {
    if (!address) return;

    const fetchRegistryInfo = async () => {
      try {
        setLoadingRegistry(true);
        const provider = new ethers.JsonRpcProvider(
          import.meta.env.VITE_SEPOLIA_RPC_URL,
        );

        const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS;
        const registryAbi = [
          "function getPaymasterFullInfo(address) view returns (tuple(address paymasterAddress, string name, uint256 feeRate, uint256 stakedAmount, uint256 reputation, bool isActive, uint256 successCount, uint256 totalAttempts, uint256 registeredAt, uint256 lastActiveAt))",
        ];

        const registry = new ethers.Contract(
          registryAddress,
          registryAbi,
          provider,
        );

        const info = await registry.getPaymasterFullInfo(address);
        setRegistryInfo({
          paymasterAddress: info.paymasterAddress,
          name: info.name,
          feeRate: info.feeRate,
          stakedAmount: info.stakedAmount,
          reputation: info.reputation,
          isActive: info.isActive,
          successCount: info.successCount,
          totalAttempts: info.totalAttempts,
          registeredAt: info.registeredAt,
          lastActiveAt: info.lastActiveAt,
        });
      } catch (err) {
        console.error("Failed to fetch registry info:", err);
      } finally {
        setLoadingRegistry(false);
      }
    };

    fetchRegistryInfo();
  }, [address]);

  // Get Paymaster stats from analytics
  const paymasterStats = analytics?.paymasterStats.find(
    (pm) => pm.address.toLowerCase() === address?.toLowerCase(),
  );

  // Get transactions for this Paymaster
  const paymasterTxs =
    analytics?.recentTransactions.filter(
      (tx) => tx.paymasterAddress?.toLowerCase() === address?.toLowerCase(),
    ) || [];

  // Calculate success rate
  const successRate =
    registryInfo?.totalAttempts > 0
      ? (
          (Number(registryInfo.successCount) /
            Number(registryInfo.totalAttempts)) *
          100
        ).toFixed(2)
      : "N/A";

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatEther = (value: bigint) => {
    return ethers.formatEther(value);
  };

  const formatPntValue = (wei: string) => {
    try {
      const value = parseFloat(ethers.formatEther(wei));
      return value.toFixed(4);
    } catch {
      return "0.0000";
    }
  };

  const formatGasValue = (wei: string) => {
    try {
      const value = parseFloat(ethers.formatEther(wei));
      return value.toFixed(6);
    } catch {
      return "0.000000";
    }
  };

  if (isLoading || loadingRegistry) {
    return (
      <div className="paymaster-detail-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading Paymaster information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paymaster-detail-page">
        <div className="error-state">
          <h2>⚠️ Error</h2>
          <p>{error.message}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  // Check if Paymaster has any analytics data (even if not registered)
  const hasAnalyticsData = paymasterStats && paymasterStats.operations > 0;

  // Allow display if either registered in Registry OR has analytics data
  if (
    !hasAnalyticsData &&
    (!registryInfo || registryInfo.paymasterAddress === ethers.ZeroAddress)
  ) {
    return (
      <div className="paymaster-detail-page">
        <div className="error-state">
          <h2>❌ Paymaster Not Found</h2>
          <p>Address: {address}</p>
          <p>
            This Paymaster is not registered in the SuperPaymaster Registry and
            has no transaction history.
          </p>
          <Link to="/analytics" className="back-link">
            ← Back to Analytics
          </Link>
        </div>
      </div>
    );
  }

  // Determine if Paymaster is registered
  const isRegistered =
    registryInfo && registryInfo.paymasterAddress !== ethers.ZeroAddress;

  return (
    <div className="paymaster-detail-page">
      <div className="page-header">
        <Link to="/analytics" className="back-link">
          ← Back to Analytics
        </Link>
        <h1>Paymaster Information</h1>
        {!isRegistered && (
          <div className="warning-banner">
            ⚠️ This Paymaster is not registered in the SuperPaymaster Registry.
            Only analytics data is available.
          </div>
        )}
        {analytics?.lastUpdated && (
          <p className="cache-age">
            Last updated: {formatCacheAge(analytics.lastUpdated)}
          </p>
        )}
      </div>

      {/* Basic Information Card */}
      <div className="info-card">
        <h2>📋 Basic Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Name:</label>
            <span className="name">
              {isRegistered
                ? registryInfo.name || "Unnamed Paymaster"
                : "Unregistered Paymaster"}
            </span>
          </div>
          <div className="info-item">
            <label>Address:</label>
            <a
              href={getEtherscanAddressUrl(address!)}
              target="_blank"
              rel="noopener noreferrer"
              className="address-link"
            >
              {address}
            </a>
          </div>
          <div className="info-item">
            <label>Registry Status:</label>
            <span
              className={`status ${isRegistered ? (registryInfo.isActive ? "active" : "inactive") : "unregistered"}`}
            >
              {isRegistered
                ? registryInfo.isActive
                  ? "🟢 Active"
                  : "🔴 Inactive"
                : "⚪ Not Registered"}
            </span>
          </div>
          {isRegistered && (
            <div className="info-item">
              <label>Fee Rate:</label>
              <span>{Number(registryInfo.feeRate) / 100}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Stake & Reputation Card - Only show if registered */}
      {isRegistered && (
        <div className="info-card">
          <h2>💰 Stake & Reputation</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Staked Amount:</label>
              <span className="value">
                {formatEther(registryInfo.stakedAmount)} ETH/PNT
              </span>
            </div>
            <div className="info-item">
              <label>Reputation Score:</label>
              <span className="value">
                {registryInfo.reputation.toString()}
              </span>
            </div>
            <div className="info-item">
              <label>Success Rate:</label>
              <span className="value">{successRate}%</span>
            </div>
            <div className="info-item">
              <label>Total Attempts:</label>
              <span className="value">
                {registryInfo.totalAttempts.toString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics Card */}
      {paymasterStats && (
        <div className="info-card">
          <h2>📊 Performance Metrics</h2>
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-label">Total Operations</div>
              <div className="metric-value">
                {paymasterStats.operations.toLocaleString()}
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Total Gas Sponsored</div>
              <div className="metric-value">
                {formatGasValue(paymasterStats.totalGas)} ETH
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Total PNT Collected</div>
              <div className="metric-value">
                {formatPntValue(paymasterStats.totalPnt)} PNT
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Unique Users Served</div>
              <div className="metric-value">
                {paymasterStats.uniqueUsers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Card - Only show if registered */}
      {isRegistered && (
        <div className="info-card">
          <h2>⏰ Timeline</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Registered At:</label>
              <span>{formatTimestamp(Number(registryInfo.registeredAt))}</span>
            </div>
            <div className="info-item">
              <label>Last Active:</label>
              <span>{formatTimestamp(Number(registryInfo.lastActiveAt))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions Card */}
      <div className="info-card">
        <h2>📝 Recent Transactions ({paymasterTxs.length})</h2>
        {paymasterTxs.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Gas Token</th>
                  <th>Gas Cost</th>
                  <th>PNT Amount</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {paymasterTxs.slice(0, 20).map((tx, index) => (
                  <tr key={`${tx.transactionHash}-${index}`}>
                    <td>{formatTimestamp(tx.timestamp)}</td>
                    <td className="address">
                      <a
                        href={getEtherscanAddressUrl(tx.user)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                      </a>
                    </td>
                    <td className="address">
                      <a
                        href={getEtherscanAddressUrl(tx.gasToken)}
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
                        href={getEtherscanTxUrl(tx.transactionHash)}
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
          </div>
        ) : (
          <p className="empty-state">
            No transactions found for this Paymaster
          </p>
        )}
      </div>

      <style>{`
        .paymaster-detail-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-block;
          color: #667eea;
          text-decoration: none;
          margin-bottom: 1rem;
          font-weight: 500;
          transition: color 0.3s;
        }

        .back-link:hover {
          color: #764ba2;
        }

        .page-header h1 {
          font-size: 2rem;
          color: #2d3748;
          margin: 0.5rem 0;
        }

        .warning-banner {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          color: #856404;
          font-weight: 500;
        }

        .cache-age {
          color: #718096;
          font-size: 0.875rem;
        }

        .info-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .info-card h2 {
          font-size: 1.25rem;
          color: #2d3748;
          margin: 0 0 1rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-item label {
          font-size: 0.875rem;
          color: #718096;
          font-weight: 600;
        }

        .info-item span,
        .info-item a {
          font-size: 1rem;
          color: #2d3748;
        }

        .name {
          font-weight: 600;
          font-size: 1.125rem;
          color: #667eea;
        }

        .address-link {
          color: #667eea;
          text-decoration: none;
          word-break: break-all;
          transition: color 0.3s;
        }

        .address-link:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        .status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .status.active {
          background: #c6f6d5;
          color: #22543d;
        }

        .status.inactive {
          background: #fed7d7;
          color: #742a2a;
        }

        .status.unregistered {
          background: #e2e8f0;
          color: #4a5568;
        }

        .value {
          font-weight: 600;
          color: #667eea;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .metric-item {
          text-align: center;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          color: white;
        }

        .metric-label {
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .table-container {
          overflow-x: auto;
          margin-top: 1rem;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .data-table th {
          background: #f7fafc;
          color: #4a5568;
          font-weight: 600;
          padding: 0.75rem;
          text-align: left;
          border-bottom: 2px solid #e2e8f0;
        }

        .data-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          color: #2d3748;
        }

        .data-table tr:hover {
          background: #f7fafc;
        }

        .data-table .address a {
          color: #667eea;
          text-decoration: none;
        }

        .data-table .address a:hover {
          color: #764ba2;
          text-decoration: underline;
        }

        .empty-state {
          text-align: center;
          color: #718096;
          padding: 2rem;
          font-style: italic;
        }

        .loading,
        .error-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          margin: 0 auto 1rem;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-state h2 {
          color: #e53e3e;
          margin-bottom: 1rem;
        }

        .error-state button {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .error-state button:hover {
          background: #764ba2;
        }

        @media (max-width: 768px) {
          .paymaster-detail-page {
            padding: 1rem;
          }

          .info-grid,
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
