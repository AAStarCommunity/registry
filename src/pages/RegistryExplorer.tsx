import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  registeredAt: bigint;
  lastUpdatedAt: bigint;
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

export function RegistryExplorer() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ExplorerTab>("communities");
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

  // Load registry data
  useEffect(() => {
    loadRegistryData();
  }, []);

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

      // Check cache first
      const cacheKey = `registry_explorer_v2.2_${registryAddress.toLowerCase()}`;
      const cached = loadFromCache<CommunityProfile[]>(cacheKey);

      if (cached) {
        console.log(`📦 Loaded from cache (${formatCacheAge(cached.timestamp)})`);
        setCommunities(cached.data);
        setLastUpdated(cached.timestamp);

        // Load registry info
        await loadRegistryInfo(registryAddress, cached.data.length);
        setLoading(false);
        return;
      }

      // Query blockchain
      console.log("🔍 Querying blockchain...");
      const registry = new ethers.Contract(registryAddress, RegistryABI, provider);

      // Get total count
      const count = await registry.getCommunityCount();
      console.log(`📋 Found ${count} communities`);

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

      for (const communityAddr of communityAddresses) {
        try {
          const profile = await registry.communities(communityAddr);

          communityList.push({
            name: profile.name || "Unnamed",
            ensName: profile.ensName || "",
            xPNTsToken: profile.xPNTsToken || ethers.ZeroAddress,
            supportedSBTs: profile.supportedSBTs || [],
            paymasterAddress: profile.paymasterAddress || ethers.ZeroAddress,
            community: communityAddr,
            nodeType: profile.nodeType,
            registeredAt: profile.registeredAt,
            lastUpdatedAt: profile.lastUpdatedAt,
            isActive: profile.isActive,
            allowPermissionlessMint: profile.allowPermissionlessMint,
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

      // Get total supply
      const totalSupply = await mySBT.totalSupply();
      console.log(`📋 Total MySBT supply: ${totalSupply}`);

      // Query all holders via ownerOf
      const holders: MySBTHolder[] = [];
      for (let tokenId = 0; tokenId < Number(totalSupply); tokenId++) {
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
    if (!searchQuery) return communities;

    return communities.filter((community) =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.community.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.ensName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get paymasters from communities
  const getPaymasters = () => {
    return getFilteredData().filter(
      (c) => c.paymasterAddress && c.paymasterAddress !== ethers.ZeroAddress
    );
  };

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
        return (
          <div className="community-grid">
            {filteredData.length === 0 ? (
              <div className="no-results">
                <p>No communities found.</p>
              </div>
            ) : (
              filteredData.map((community) => (
                <div key={community.community} className="community-card">
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
              paymasters.map((community) => (
                <div key={community.paymasterAddress} className="paymaster-card">
                  <div className="card-header">
                    <h3>{community.name}</h3>
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
                </div>
              ))
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
        <div className="registry-header">
          <h1>🏛️ Registry Explorer</h1>
          {registryInfo && (
            <div className="registry-details">
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Contract Address:</span>
                  <code className="value">{registryInfo.address}</code>
                </div>
                <div className="info-item">
                  <span className="label">Registry Version:</span>
                  <span className="value">{registryInfo.version}</span>
                </div>
                <div className="info-item">
                  <span className="label">Deployed At:</span>
                  <span className="value">{registryInfo.deployedAt}</span>
                </div>
                <div className="info-item">
                  <span className="label">Shared-Config Version:</span>
                  <span className="value">v{registryInfo.sharedConfigVersion}</span>
                </div>
                <div className="info-item">
                  <span className="label">Total Communities:</span>
                  <span className="value">{registryInfo.totalCommunities}</span>
                </div>
              </div>
            </div>
          )}
          {lastUpdated && (
            <p className="cache-status">
              Last updated: {formatCacheAge(lastUpdated)}
              {loading && <span className="refreshing"> (refreshing...)</span>}
            </p>
          )}
        </div>
      </section>

      {/* Tabs */}
      <section className="tabs-section">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "communities" ? "active" : ""}`}
            onClick={() => setActiveTab("communities")}
          >
            🏘️ Communities ({communities.length})
          </button>
          <button
            className={`tab ${activeTab === "paymasters" ? "active" : ""}`}
            onClick={() => setActiveTab("paymasters")}
          >
            💳 Paymasters ({getPaymasters().length})
          </button>
          <button
            className={`tab ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            🎫 Members (MySBT) ({mySBTHolders.length})
          </button>
        </div>

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
