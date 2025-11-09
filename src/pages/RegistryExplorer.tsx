import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../config/networkConfig";
import { getProvider } from "../utils/rpc-provider";
import { loadFromCache, saveToCache, formatCacheAge } from "../utils/cache";
import { RegistryABI, MySBTABI } from "../config/abis";
import packageJson from "../../package.json";
import "./RegistryExplorer.css";

type ExplorerTab = "communities" | "paymasters" | "members";

interface CommunityProfile {
  // 11 fields from Registry v2.2.0
  name: string;
  ensName: string;
  xPNTsToken: string;
  supportedSBTs: string[];
  paymasterAddress: string;
  community: string;
  nodeType: number; // 0: AOA, 1: Super
  registeredAt: string; // Store as string to avoid BigInt serialization issues
  lastUpdatedAt: string;
  isActive: boolean;
  allowPermissionlessMint: boolean;
}

interface RegistryInfo {
  address: string;
  version: string;
  deployedAt: string;
  sharedConfigVersion: string;
  totalCommunities: number;
}

interface MySBTHolder {
  tokenId: number;
  owner: string;
}

interface RegistryExplorerProps {
  initialTab?: ExplorerTab;
}

export function RegistryExplorer({ initialTab = "communities" }: RegistryExplorerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ExplorerTab>(initialTab);
  const [communities, setCommunities] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [registryInfo, setRegistryInfo] = useState<RegistryInfo | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // MySBT members state
  const [mySBTHolders, setMySBTHolders] = useState<MySBTHolder[]>([]);
  const [mySBTLoading, setMySBTLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const MEMBERS_PER_PAGE = 8; // 2 rows x 4 columns

  // Communities pagination state
  const [communityPage, setCommunityPage] = useState(0);
  const COMMUNITIES_PER_PAGE = 6; // 2 rows x 3 columns

  // Load registry data
  useEffect(() => {
    loadRegistryData();
  }, []);

  // Sync activeTab with initialTab prop
  useEffect(() => {
    setActiveTab(initialTab);

    // Trigger data loading for the initial tab
    if (initialTab === "members" && mySBTHolders.length === 0) {
      loadMySBTHolders();
    }
  }, [initialTab]);

  // Load MySBT holders when switching to members tab
  useEffect(() => {
    if (activeTab === "members" && mySBTHolders.length === 0) {
      loadMySBTHolders();
    }
  }, [activeTab]);

  const loadRegistryData = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = getProvider();
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;

      console.log("=== Registry Explorer ===");
      console.log("Registry address:", registryAddress);
      console.log("========================");

      // Query blockchain for count first
      console.log("🔍 Checking community count...");
      const registry = new ethers.Contract(registryAddress, RegistryABI, provider);
      const count = await registry.getCommunityCount();
      console.log(`📋 Found ${count} communities on-chain`);

      // Check cache (with version suffix to invalidate old caches with duplicates)
      const cacheKey = `registry_explorer_v2.2.1_${registryAddress.toLowerCase()}`;
      const cached = loadFromCache<CommunityProfile[]>(cacheKey);

      // Use cache only if count matches (ensures fresh data when new communities are registered)
      if (cached && cached.data.length === Number(count)) {
        console.log(`📦 Loaded from cache (${formatCacheAge(cached.timestamp)}), count matches`);

        // Deduplicate cached data (in case old cache has duplicates)
        const uniqueCached = Array.from(
          new Map(cached.data.map(c => [c.community.toLowerCase(), c])).values()
        );

        setCommunities(uniqueCached);
        setLastUpdated(cached.timestamp);

        // Load registry info
        await loadRegistryInfo(registryAddress, uniqueCached.length);
        setLoading(false);
        return;
      }

      if (cached && cached.data.length !== Number(count)) {
        console.log(`⚠️ Cache outdated: cached ${cached.data.length}, on-chain ${count}. Re-fetching...`);
      }

      // Query blockchain for all communities
      console.log("🔍 Querying all communities...");

      // Get registry info
      await loadRegistryInfo(registryAddress, Number(count));

      // If no communities, return empty
      if (count === 0n) {
        setCommunities([]);
        setLoading(false);
        return;
      }

      // Get all communities
      const communityAddresses = await registry.getCommunities(0, count);
      const communityList: CommunityProfile[] = [];
      const seenAddresses = new Set<string>(); // Track seen addresses to avoid duplicates

      for (const communityAddr of communityAddresses) {
        try {
          // Skip if already processed (Registry may have duplicate entries)
          const addrLower = communityAddr.toLowerCase();
          if (seenAddresses.has(addrLower)) {
            console.log(`⚠️ Skipping duplicate community: ${communityAddr}`);
            continue;
          }
          seenAddresses.add(addrLower);

          // Use getCommunityProfile instead of communities mapping
          // communities(address) mapping does NOT have supportedSBTs field
          const profile = await registry.getCommunityProfile(communityAddr);

          // Explicitly convert all values to avoid BigInt serialization issues
          communityList.push({
            name: String(profile.name || "Unnamed"),
            ensName: String(profile.ensName || ""),
            xPNTsToken: String(profile.xPNTsToken || ethers.ZeroAddress),
            supportedSBTs: (profile.supportedSBTs || []).map((sbt: any) => String(sbt)),
            paymasterAddress: String(profile.paymasterAddress || ethers.ZeroAddress),
            community: String(communityAddr),
            nodeType: Number(profile.nodeType),
            registeredAt: profile.registeredAt.toString(),
            lastUpdatedAt: profile.lastUpdatedAt.toString(),
            isActive: Boolean(profile.isActive),
            allowPermissionlessMint: Boolean(profile.allowPermissionlessMint),
          });
        } catch (err) {
          console.warn(`Failed to load profile for ${communityAddr}:`, err);
        }
      }

      // Save to cache (24 hours TTL)
      saveToCache(cacheKey, communityList, 86400);
      setLastUpdated(Date.now());
      console.log(`💾 Saved to cache`);

      setCommunities(communityList);
    } catch (err: any) {
      console.error("Failed to load registry data:", err);
      setError(err.message || "Failed to load registry data");
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistryInfo = async (address: string, totalCount: number) => {
    try {
      const provider = getProvider();

      // Get deployment timestamp from creation event or block
      let deployedAt = "Unknown";
      try {
        const code = await provider.getCode(address);
        if (code !== "0x") {
          // Try to get creation block (this is approximate, real deployment time needs event query)
          deployedAt = "2024-11-08"; // TODO: Query from deployment event
        }
      } catch (err) {
        console.warn("Failed to get deployment time:", err);
      }

      setRegistryInfo({
        address,
        version: "v2.2.0", // Registry version from shared-config
        deployedAt,
        sharedConfigVersion: packageJson.dependencies["@aastar/shared-config"].replace("^", ""),
        totalCommunities: totalCount,
      });
    } catch (err) {
      console.error("Failed to load registry info:", err);
    }
  };

  const loadMySBTHolders = async () => {
    setMySBTLoading(true);

    try {
      const provider = getProvider();
      const networkConfig = getCurrentNetworkConfig();
      const mySBTAddress = networkConfig.contracts.mySBT;

      console.log("🎫 Loading MySBT holders from:", mySBTAddress);

      // Check cache first
      const cacheKey = `mysbt_holders_${mySBTAddress.toLowerCase()}`;
      const cached = loadFromCache<MySBTHolder[]>(cacheKey);

      if (cached) {
        console.log(`📦 Loaded MySBT holders from cache (${formatCacheAge(cached.timestamp)})`);
        setMySBTHolders(cached.data);
        setMySBTLoading(false);
        return;
      }

      // Query MySBT contract
      const mySBT = new ethers.Contract(mySBTAddress, MySBTABI, provider);

      // Get next token ID (MySBT uses incremental token IDs starting from 1)
      const nextTokenId = await mySBT.nextTokenId();
      console.log(`📋 Total MySBT tokens: ${nextTokenId}`);

      // Query all holders via ownerOf (MySBT uses 1-based tokenId)
      const holders: MySBTHolder[] = [];
      for (let tokenId = 1; tokenId < Number(nextTokenId); tokenId++) {
        try {
          const owner = await mySBT.ownerOf(tokenId);
          holders.push({ tokenId, owner });
        } catch (err) {
          console.warn(`Failed to get owner for token ${tokenId}:`, err);
        }
      }

      // Save to cache (24 hours TTL)
      saveToCache(cacheKey, holders, 86400);
      console.log(`💾 Saved ${holders.length} MySBT holders to cache`);

      setMySBTHolders(holders);
    } catch (err: any) {
      console.error("Failed to load MySBT holders:", err);
      setMySBTHolders([]);
    } finally {
      setMySBTLoading(false);
    }
  };

  // Filter communities/paymasters based on search
  const getFilteredData = () => {
    // First, deduplicate communities by address (in case cache has duplicates)
    const uniqueCommunities = Array.from(
      new Map(communities.map(c => [c.community.toLowerCase(), c])).values()
    );

    if (!searchQuery) return uniqueCommunities;

    return uniqueCommunities.filter((community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.community.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.ensName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get paymasters from communities
  const getPaymasters = () => {
    const networkConfig = getCurrentNetworkConfig();
    const superPaymasterAddress = networkConfig.contracts.superPaymasterV2;

    return getFilteredData()
      .filter((c) => {
        // Include communities that have a paymaster address set
        if (c.paymasterAddress && c.paymasterAddress !== ethers.ZeroAddress) {
          return true;
        }
        // For AOA+ (Super) mode communities, use SuperPaymaster address
        if (c.nodeType === 1) {
          return true;
        }
        return false;
      })
      .map((c) => {
        // For AOA+ communities without paymaster set, use SuperPaymaster address
        if (c.nodeType === 1 && (!c.paymasterAddress || c.paymasterAddress === ethers.ZeroAddress)) {
          return { ...c, paymasterAddress: superPaymasterAddress };
        }
        return c;
      });
  };

  // Get paginated communities
  const getPaginatedCommunities = () => {
    const filtered = getFilteredData();
    const start = communityPage * COMMUNITIES_PER_PAGE;
    const end = start + COMMUNITIES_PER_PAGE;
    return filtered.slice(start, end);
  };

  const totalCommunityPages = Math.ceil(getFilteredData().length / COMMUNITIES_PER_PAGE);

  // Get paginated MySBT holders
  const getPaginatedHolders = () => {
    const start = currentPage * MEMBERS_PER_PAGE;
    const end = start + MEMBERS_PER_PAGE;
    return mySBTHolders.slice(start, end);
  };

  const totalPages = Math.ceil(mySBTHolders.length / MEMBERS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleCommunityPreviousPage = () => {
    setCommunityPage((prev) => Math.max(0, prev - 1));
  };

  const handleCommunityNextPage = () => {
    setCommunityPage((prev) => Math.min(totalCommunityPages - 1, prev + 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  const renderTabContent = () => {
    const filteredData = getFilteredData();

    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <p>Loading registry data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={loadRegistryData} className="retry-btn">
            Retry
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case "communities":
        const filteredCommunities = getFilteredData();
        const paginatedCommunities = getPaginatedCommunities();

        return (
          <>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Total: <span style={{ fontWeight: 600, color: '#111827' }}>{filteredCommunities.length}</span> communities
                {searchQuery && ` (filtered from ${communities.length})`}
              </div>
              {totalCommunityPages > 1 && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Page {communityPage + 1} of {totalCommunityPages}
                </div>
              )}
            </div>
            <div className="community-grid">
              {paginatedCommunities.length === 0 ? (
                <div className="no-results">
                  <p>No communities found.</p>
                </div>
              ) : (
                paginatedCommunities.map((community) => (
                <div
                  key={community.community}
                  className="community-card clickable"
                  onClick={() => navigate(`/explorer/community/${community.community}`)}
                >
                  <div className="card-header">
                    <h3>{community.name}</h3>
                    <div className="badges">
                      {community.isActive && (
                        <span className="badge active">Active</span>
                      )}
                      <span className={`badge node-type ${community.nodeType === 0 ? 'aoa' : 'super'}`}>
                        {community.nodeType === 0 ? "AOA" : "Super"}
                      </span>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">Community Address:</span>
                      <code className="value">{community.community.slice(0, 10)}...{community.community.slice(-8)}</code>
                    </div>

                    {community.ensName && (
                      <div className="info-row">
                        <span className="label">ENS Name:</span>
                        <span className="value">{community.ensName}</span>
                      </div>
                    )}

                    <div className="info-row">
                      <span className="label">Node Type:</span>
                      <span className="value">{community.nodeType === 0 ? "AOA (Independent)" : "Super (Managed)"}</span>
                    </div>

                    <div className="info-row">
                      <span className="label">Paymaster:</span>
                      {community.paymasterAddress && community.paymasterAddress !== ethers.ZeroAddress ? (
                        <code className="value">
                          {community.paymasterAddress.slice(0, 10)}...{community.paymasterAddress.slice(-8)}
                        </code>
                      ) : (
                        <span className="value text-muted">Not deployed</span>
                      )}
                    </div>

                    <div className="info-row">
                      <span className="label">xPNTs Token:</span>
                      {community.xPNTsToken && community.xPNTsToken !== ethers.ZeroAddress ? (
                        <code className="value">
                          {community.xPNTsToken.slice(0, 10)}...{community.xPNTsToken.slice(-8)}
                        </code>
                      ) : (
                        <span className="value text-muted">Not deployed</span>
                      )}
                    </div>

                    <div className="info-row">
                      <span className="label">Supported SBTs:</span>
                      <div className="sbt-list">
                        {community.supportedSBTs.length > 0 ? (
                          community.supportedSBTs.map((sbt, idx) => (
                            <code key={idx} className="sbt-badge">
                              {sbt.slice(0, 6)}...{sbt.slice(-4)}
                            </code>
                          ))
                        ) : (
                          <span className="value text-muted">None</span>
                        )}
                      </div>
                    </div>

                    <div className="info-row">
                      <span className="label">Permissionless Mint:</span>
                      <span className="value">
                        {community.allowPermissionlessMint ? "✅ Enabled" : "❌ Disabled"}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="label">Registered At:</span>
                      <span className="value">
                        {new Date(Number(community.registeredAt) * 1000).toLocaleString()}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="label">Last Updated:</span>
                      <span className="value">
                        {new Date(Number(community.lastUpdatedAt) * 1000).toLocaleString()}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className="value">
                        {community.isActive ? (
                          <span className="status-active">🟢 Active</span>
                        ) : (
                          <span className="status-inactive">🔴 Inactive</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination controls */}
          {totalCommunityPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '2rem',
              padding: '1rem'
            }}>
              <button
                onClick={handleCommunityPreviousPage}
                disabled={communityPage === 0}
                style={{
                  padding: '0.5rem 1rem',
                  background: communityPage === 0 ? '#e5e7eb' : '#3b82f6',
                  color: communityPage === 0 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: communityPage === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                ← Previous
              </button>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Page {communityPage + 1} of {totalCommunityPages}
              </span>
              <button
                onClick={handleCommunityNextPage}
                disabled={communityPage === totalCommunityPages - 1}
                style={{
                  padding: '0.5rem 1rem',
                  background: communityPage === totalCommunityPages - 1 ? '#e5e7eb' : '#3b82f6',
                  color: communityPage === totalCommunityPages - 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: communityPage === totalCommunityPages - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
        );

      case "paymasters":
        const paymasters = getPaymasters();
        return (
          <div className="paymaster-grid">
            {paymasters.length === 0 ? (
              <div className="no-results">
                <p>No paymasters found.</p>
              </div>
            ) : (
              paymasters.map((community) => {
                const manageUrl = community.nodeType === 0
                  ? `/operator/manage?address=${community.paymasterAddress}`
                  : `/operator/superpaymaster?operator=${community.community}`;

                const description = community.nodeType === 0
                  ? `Paymaster running by ${community.name}`
                  : `SuperPaymaster running by ${community.name}`;

                return (
                  <a
                    key={community.paymasterAddress}
                    href={manageUrl}
                    className="paymaster-card"
                    style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    <div className="card-header">
                      <h3>{description}</h3>
                      <span className={`badge node-type ${community.nodeType === 0 ? 'aoa' : 'super'}`}>
                        {community.nodeType === 0 ? "AOA" : "Super"}
                      </span>
                    </div>

                    <div className="card-body">
                      <div className="info-row">
                        <span className="label">Paymaster Address:</span>
                        <code className="value">{community.paymasterAddress}</code>
                      </div>

                      <div className="info-row">
                        <span className="label">Owner (Community):</span>
                        <code className="value">{community.community}</code>
                      </div>

                      <div className="info-row">
                        <span className="label">Registered:</span>
                        <span className="value">
                          {new Date(Number(community.registeredAt) * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        );

      case "members":
        if (mySBTLoading) {
          return (
            <div className="loading-state">
              <div className="spinner">⏳</div>
              <p>Loading MySBT holders...</p>
            </div>
          );
        }

        const paginatedHolders = getPaginatedHolders();
        const networkConfig = getCurrentNetworkConfig();

        return (
          <div className="members-section">
            {/* MySBT Contract Info */}
            <div className="mysbt-info-card">
              <div className="card-header">
                <h3>🎫 MySBT Contract</h3>
              </div>
              <div className="card-body">
                <div className="info-row">
                  <span className="label">Contract Address:</span>
                  <code className="value">{networkConfig.contracts.mySBT}</code>
                </div>
                <div className="info-row">
                  <span className="label">Total Members:</span>
                  <span className="value">{mySBTHolders.length}</span>
                </div>
              </div>
            </div>

            {/* Members Grid (2 rows x 4 columns = 8 per page) */}
            {mySBTHolders.length === 0 ? (
              <div className="no-results">
                <p>No MySBT holders found.</p>
              </div>
            ) : (
              <>
                <div className="members-grid">
                  {paginatedHolders.map((holder) => (
                    <div key={holder.tokenId} className="member-card">
                      <div className="card-header">
                        <h3>Token #{holder.tokenId}</h3>
                      </div>
                      <div className="card-body">
                        <div className="info-row">
                          <span className="label">Owner:</span>
                          <code className="value">
                            {holder.owner.slice(0, 6)}...{holder.owner.slice(-4)}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                      className="page-btn"
                    >
                      ← Previous
                    </button>
                    <span className="page-info">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      className="page-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="registry-explorer">
      {/* Registry Info Section */}
      <section className="registry-info-section">
        <div className="registry-header-row">
          <div className="section-title">
            <h2>
              {activeTab === "communities" && "🏘️ Community Registry"}
              {activeTab === "members" && "👥 Community Users Registry"}
              {activeTab === "paymasters" && "💳 Paymaster Registry"}
            </h2>
          </div>

          {registryInfo && (
            <div className="registry-info-card">
              <div className="info-row">
                <span className="label">Registry v{registryInfo.version}</span>
                <span className="separator">•</span>
                <code className="address-short">{registryInfo.address.slice(0, 10)}...{registryInfo.address.slice(-8)}</code>
              </div>
              <div className="info-row">
                <span className="label">Deployed: {registryInfo.deployedAt}</span>
                <span className="separator">•</span>
                <span className="label">Config: v{registryInfo.sharedConfigVersion}</span>
                <span className="separator">•</span>
                <span className="label">Total: {registryInfo.totalCommunities}</span>
              </div>
              {lastUpdated && (
                <div className="cache-info">
                  Updated {formatCacheAge(lastUpdated)} ago
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Search and Refresh */}
      <section className="tabs-section">
        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, address, or ENS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        {/* Refresh Button */}
        <button onClick={loadRegistryData} className="refresh-btn" disabled={loading}>
          {loading ? "⏳" : "🔄"} Refresh
        </button>
      </section>

      {/* Content */}
      <section className="content-section">
        {renderTabContent()}
      </section>
    </div>
  );
}
