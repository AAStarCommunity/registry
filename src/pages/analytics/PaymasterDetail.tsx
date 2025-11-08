import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import { useGasAnalytics } from "../../hooks/useGasAnalytics";
import {
  getEtherscanAddressUrl,
  getEtherscanTxUrl,
} from "../../utils/etherscan";
import { formatCacheAge } from "../../utils/cache";
import { getProvider } from "../../utils/rpc-provider";
import { getCurrentNetworkConfig } from "../../config/networkConfig";

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
  const [isRefreshing, setIsRefreshing] = useState(false);



  // LocalStorage cache key for this Paymaster
  const CACHE_KEY = `paymaster_registry_${address?.toLowerCase()}`;
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  // Load cached data first, then optionally fetch fresh data
  useEffect(() => {
    if (!address) return;

    // Try to load from cache first
    const loadCachedData = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < CACHE_EXPIRY) {
            console.log(
              `✅ Using cached registry data (age: ${Math.floor(age / 1000)}s)`,
            );
            setRegistryInfo(data);
            setLoadingRegistry(false);
            return true;
          }
        }
      } catch (err) {
        console.error("Failed to load cache:", err);
      }
      return false;
    };

    // Load cache first
    const hasCache = loadCachedData();

    // If no cache, fetch from RPC
    if (!hasCache) {
      fetchRegistryInfo();
    }
  }, [address]);

  // Fetch Paymaster info from PaymasterFactory and Registry
  const fetchRegistryInfo = async () => {
    if (!address) return;

    try {
      setLoadingRegistry(true);
      const provider = getProvider();

      const networkConfig = getCurrentNetworkConfig();
      // Use PaymasterFactory to check if paymaster was deployed
      const factoryAddress = networkConfig.contracts.paymasterFactory;
      const factoryAbi = [
        "function getPaymasterInfo(address paymaster) view returns (address operator, bool isValid)",
      ];

      const factory = new ethers.Contract(
        factoryAddress,
        factoryAbi,
        provider,
      );

      // Check if paymaster exists in factory
      const factoryInfo = await factory.getPaymasterInfo(address);
      const isDeployed = factoryInfo.isValid;

      let registryData = null;
      // Check if actually registered (deployed and has operator)
      if (isDeployed && factoryInfo.operator && factoryInfo.operator !== ethers.ZeroAddress) {
        const operatorAddress = factoryInfo.operator;

        // Fetch stake amount from GTokenStaking contract
        let stakedAmount = "0";
        try {
          const gTokenStakingAddress = networkConfig.contracts.gTokenStaking;
          const gTokenStakingAbi = [
            "function balanceOf(address account) view returns (uint256)",
            "function stakes(address account) view returns (uint256 amount, uint256 timestamp)"
          ];
          const gTokenStaking = new ethers.Contract(
            gTokenStakingAddress,
            gTokenStakingAbi,
            provider
          );

          // Try to get staked balance
          try {
            const balance = await gTokenStaking.balanceOf(operatorAddress);
            stakedAmount = balance.toString();
          } catch (e) {
            // If balanceOf fails, try stakes mapping
            try {
              const stake = await gTokenStaking.stakes(operatorAddress);
              stakedAmount = stake.amount ? stake.amount.toString() : stake[0] ? stake[0].toString() : "0";
            } catch (err) {
              console.log("Could not read stake from GTokenStaking:", err);
            }
          }
        } catch (err) {
          console.error("Failed to fetch stake amount:", err);
        }

        // Calculate reputation based on success rate
        // For now, use a simplified reputation calculation
        // In a real implementation, this would come from the Registry contract
        const reputation = 100; // Default reputation

        // Paymaster was deployed via factory - this means it's registered
        registryData = {
          paymasterAddress: address,
          name: `Paymaster (${address.slice(0, 6)}...${address.slice(-4)})`,
          description: "",
          version: "v4.1",
          timestamp: new Date().toLocaleString(),
          feeRate: 0,
          stakedAmount: stakedAmount,
          reputation: reputation.toString(),
          isActive: true,
          successCount: 0,
          totalAttempts: 0,
          registeredAt: "0",
          lastActiveAt: "0",
        };
      }

      setRegistryInfo(registryData);

      // Cache the result (now safe to stringify)
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: registryData,
            timestamp: Date.now(),
          }),
        );
        console.log("✅ Registry data cached");
      } catch (err) {
        console.error("Failed to cache data:", err);
      }
    } catch (err) {
      console.error("Failed to fetch registry info:", err);
    } finally {
      setLoadingRegistry(false);
    }
  };



  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh both registry info and analytics
      await Promise.all([
        fetchRegistryInfo(),
        refresh()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const formatEther = (value: bigint | string | number) => {
    if (typeof value === "string") {
      return ethers.formatEther(value);
    }
    if (typeof value === "number") {
      return value.toString();
    }
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

  // Check if Paymaster has any analytics data
  const hasAnalyticsData = paymasterStats && paymasterStats.operations > 0;

  // Show error only if completely not found anywhere
  if (!hasAnalyticsData && !registryInfo) {
    return (
      <div className="paymaster-detail-page">
        <div className="error-state">
          <h2>❌ Paymaster Not Found</h2>
          <p>Address: {address}</p>
          <p>
            This Paymaster has no data on the network yet.
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
    registryInfo &&
    registryInfo.paymasterAddress &&
    registryInfo.name &&
    registryInfo.name.length > 0;

  return (
    <div className="paymaster-detail-page">
      <div className="page-header">
        <Link to="/analytics" className="back-link">
          ← Back to Analytics
        </Link>
        <div className="title-row">
          <h1>Paymaster Information</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="refresh-button"
          >
            {isRefreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
        {!isRegistered && (
          <div className="warning-banner">
            <div style={{ marginBottom: '0.75rem' }}>
              ⚠️ This Paymaster is not registered in the SuperPaymaster Registry.
            </div>
            <Link to="/launch-paymaster" className="action-link">
              ✅ Register This Paymaster →
            </Link>
          </div>
        )}
        {analytics?.lastUpdated && (
          <p className="cache-age">
            Last updated: {formatCacheAge(analytics.lastUpdated)}
            {" • "}
            <span className="cache-hint">
              Click refresh to update from blockchain
            </span>
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
          {isRegistered && registryInfo.description && (
            <div className="info-item">
              <label>Description:</label>
              <span className="value">{registryInfo.description}</span>
            </div>
          )}
          {isRegistered && registryInfo.version && (
            <div className="info-item">
              <label>Version:</label>
              <span className="value">{registryInfo.version}</span>
            </div>
          )}
          {isRegistered && registryInfo.timestamp && (
            <div className="info-item">
              <label>Registered At:</label>
              <span className="value">{registryInfo.timestamp}</span>
            </div>
          )}
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

        .title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .page-header h1 {
          font-size: 2rem;
          color: #2d3748;
          margin: 0.5rem 0;
          flex: 1;
        }

        .refresh-button {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .refresh-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .action-link {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }

        .action-link:hover {
          background: #764ba2;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .cache-age {
          color: #718096;
          font-size: 0.875rem;
        }

        .cache-hint {
          color: #a0aec0;
          font-style: italic;
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
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
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

        .gtoken-info ul {
          list-style-type: none;
          padding-left: 0;
        }

        .gtoken-info li {
          margin-bottom: 0.75rem;
          padding-left: 1.5rem;
          position: relative;
        }

        .gtoken-info li::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #667eea;
          font-weight: bold;
        }

        .requirements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .requirement-item {
          padding: 1.25rem;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          transition: all 0.3s;
        }

        .requirement-item.met {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .requirement-item.unmet {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .requirement-item.info {
          background: #f0f9ff;
          border-color: #bae6fd;
        }

        .requirement-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .requirement-details {
          flex: 1;
        }

        .requirement-details h3 {
          font-size: 1rem;
          color: #2d3748;
          margin: 0 0 0.5rem 0;
          font-weight: 600;
        }

        .requirement-details p {
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }

        .status-success {
          color: #15803d;
          font-weight: 500;
        }

        .status-error {
          color: #dc2626;
          font-weight: 500;
        }

        .status-warning {
          color: #ea580c;
          font-weight: 500;
        }

        .action-link-small {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.375rem 0.75rem;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .action-link-small:hover {
          background: #764ba2;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        }

        .connect-wallet-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 768px) {
          .paymaster-detail-page {
            padding: 1rem;
          }

          .info-grid,
          .metrics-grid,
          .requirements-grid {
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
