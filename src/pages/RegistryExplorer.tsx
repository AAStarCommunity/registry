import { useState, useEffect } from "react";
import "./RegistryExplorer.css";

// Mock data for now - will be replaced with contract calls
interface PaymasterInfo {
  address: string;
  name: string;
  description: string;
  category: string;
  verified: boolean;
  totalTransactions: number;
  totalGasSponsored: string;
  supportedTokens: string[];
  serviceFee: string;
  owner: string;
  registeredAt: string;
}

const mockPaymasters: PaymasterInfo[] = [
  {
    address: "0x1234...5678",
    name: "AAStar Community Paymaster",
    description: "Official AAStar community paymaster for gasless transactions",
    category: "Community",
    verified: true,
    totalTransactions: 12450,
    totalGasSponsored: "45.8 ETH",
    supportedTokens: ["SBT", "PNT"],
    serviceFee: "2%",
    owner: "0xabcd...ef01",
    registeredAt: "2024-01-15",
  },
  {
    address: "0x2345...6789",
    name: "DeFi Protocol Paymaster",
    description: "Gasless swaps and liquidity provision",
    category: "DeFi",
    verified: true,
    totalTransactions: 8920,
    totalGasSponsored: "32.4 ETH",
    supportedTokens: ["USDC", "DAI"],
    serviceFee: "1.5%",
    owner: "0xbcde...f012",
    registeredAt: "2024-02-01",
  },
  {
    address: "0x3456...7890",
    name: "GameFi Paymaster",
    description: "Sponsor gas fees for in-game transactions",
    category: "Gaming",
    verified: false,
    totalTransactions: 5670,
    totalGasSponsored: "18.3 ETH",
    supportedTokens: ["GAME", "NFT"],
    serviceFee: "3%",
    owner: "0xcdef...0123",
    registeredAt: "2024-03-10",
  },
  {
    address: "0x4567...8901",
    name: "Social Paymaster",
    description: "Gasless social interactions and content creation",
    category: "Social",
    verified: true,
    totalTransactions: 15320,
    totalGasSponsored: "52.1 ETH",
    supportedTokens: ["SOCIAL", "CREATOR"],
    serviceFee: "2.5%",
    owner: "0xdef0...1234",
    registeredAt: "2024-02-20",
  },
];

export function RegistryExplorer() {
  const [paymasters] = useState<PaymasterInfo[]>(mockPaymasters);
  const [filteredPaymasters, setFilteredPaymasters] =
    useState<PaymasterInfo[]>(mockPaymasters);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("transactions");
  const [selectedPaymaster, setSelectedPaymaster] =
    useState<PaymasterInfo | null>(null);

  const categories = ["All", "Community", "DeFi", "Gaming", "Social"];

  // Filter and sort
  useEffect(() => {
    let filtered = paymasters;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (pm) =>
          pm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pm.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pm.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((pm) => pm.category === selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "transactions") {
        return b.totalTransactions - a.totalTransactions;
      } else if (sortBy === "gas") {
        return (
          parseFloat(b.totalGasSponsored) - parseFloat(a.totalGasSponsored)
        );
      } else if (sortBy === "recent") {
        return (
          new Date(b.registeredAt).getTime() -
          new Date(a.registeredAt).getTime()
        );
      }
      return 0;
    });

    setFilteredPaymasters(filtered);
  }, [searchQuery, selectedCategory, sortBy, paymasters]);

  return (
    <div className="registry-explorer">
      {/* Stats Bar */}
      <section className="stats-section">
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{paymasters.length}</div>
            <div className="stat-label">Active Paymasters</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {paymasters
                .reduce((sum, pm) => sum + pm.totalTransactions, 0)
                .toLocaleString()}
            </div>
            <div className="stat-label">Total Transactions</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">148.6 ETH</div>
            <div className="stat-label">Total Gas Sponsored</div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="search-section">
        <div className="search-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by name, address, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="filter-controls">
            <div className="category-filter">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="sort-control">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="transactions">Most Transactions</option>
                <option value="gas">Most Gas Sponsored</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Paymaster Grid */}
      <section className="paymaster-grid">
        {filteredPaymasters.length === 0 ? (
          <div className="no-results">
            <p>No paymasters found matching your search criteria.</p>
          </div>
        ) : (
          filteredPaymasters.map((pm) => (
            <div
              key={pm.address}
              className="paymaster-card"
              onClick={() => setSelectedPaymaster(pm)}
            >
              <div className="card-header">
                <div className="paymaster-name">
                  <h3>{pm.name}</h3>
                  {pm.verified && (
                    <span className="verified-badge">✓ Verified</span>
                  )}
                </div>
                <span className={`category-badge ${pm.category.toLowerCase()}`}>
                  {pm.category}
                </span>
              </div>

              <p className="paymaster-description">{pm.description}</p>

              <div className="paymaster-stats">
                <div className="stat">
                  <span className="stat-label">Transactions</span>
                  <span className="stat-value">
                    {pm.totalTransactions.toLocaleString()}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Gas Sponsored</span>
                  <span className="stat-value">{pm.totalGasSponsored}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Service Fee</span>
                  <span className="stat-value">{pm.serviceFee}</span>
                </div>
              </div>

              <div className="supported-tokens">
                <span className="tokens-label">Supported Tokens:</span>
                <div className="token-list">
                  {pm.supportedTokens.map((token) => (
                    <span key={token} className="token-badge">
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card-footer">
                <span className="address">{pm.address}</span>
                <button className="view-details-btn">View Details →</button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Detail Modal */}
      {selectedPaymaster && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPaymaster(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-modal"
              onClick={() => setSelectedPaymaster(null)}
            >
              ✕
            </button>

            <div className="modal-header">
              <div>
                <h2>{selectedPaymaster.name}</h2>
                {selectedPaymaster.verified && (
                  <span className="verified-badge">✓ Verified</span>
                )}
              </div>
              <span
                className={`category-badge ${selectedPaymaster.category.toLowerCase()}`}
              >
                {selectedPaymaster.category}
              </span>
            </div>

            <div className="modal-body">
              <section className="detail-section">
                <h3>Description</h3>
                <p>{selectedPaymaster.description}</p>
              </section>

              <section className="detail-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="detail-stat">
                    <span className="stat-label">Total Transactions</span>
                    <span className="stat-value">
                      {selectedPaymaster.totalTransactions.toLocaleString()}
                    </span>
                  </div>
                  <div className="detail-stat">
                    <span className="stat-label">Total Gas Sponsored</span>
                    <span className="stat-value">
                      {selectedPaymaster.totalGasSponsored}
                    </span>
                  </div>
                  <div className="detail-stat">
                    <span className="stat-label">Service Fee</span>
                    <span className="stat-value">
                      {selectedPaymaster.serviceFee}
                    </span>
                  </div>
                  <div className="detail-stat">
                    <span className="stat-label">Registered</span>
                    <span className="stat-value">
                      {selectedPaymaster.registeredAt}
                    </span>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h3>Supported Tokens</h3>
                <div className="token-list large">
                  {selectedPaymaster.supportedTokens.map((token) => (
                    <span key={token} className="token-badge large">
                      {token}
                    </span>
                  ))}
                </div>
              </section>

              <section className="detail-section">
                <h3>Contract Information</h3>
                <div className="info-table">
                  <div className="info-row">
                    <span className="info-label">Paymaster Address:</span>
                    <span className="info-value">
                      <code>{selectedPaymaster.address}</code>
                      <button className="copy-btn" title="Copy address">
                        📋
                      </button>
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Owner Address:</span>
                    <span className="info-value">
                      <code>{selectedPaymaster.owner}</code>
                      <button className="copy-btn" title="Copy address">
                        📋
                      </button>
                    </span>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h3>Integration</h3>
                <div className="code-block">
                  <pre>
                    <code>{`// Use this paymaster in your dApp
const paymasterAddress = "${selectedPaymaster.address}";

const userOp = await buildUserOperation({
  sender: accountAddress,
  callData: encodedCallData,
  paymasterAndData: paymasterAddress
});`}</code>
                  </pre>
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedPaymaster(null)}
              >
                Close
              </button>
              <button className="btn-primary">Integrate This Paymaster</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
