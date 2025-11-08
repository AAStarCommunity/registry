/**
 * Community Detail Page
 *
 * Displays comprehensive information about a specific Community registered in Registry
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import { getProvider } from "../../utils/rpc-provider";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getEtherscanAddressUrl } from "../../utils/etherscan";
import { RegistryV2_1_4ABI } from "../../config/abis";
import "./CommunityDetail.css";

interface CommunityProfile {
  name: string;
  ensName: string;
  isActive: boolean;
  registeredAt: bigint;
  nodeType: number;
  xPNTsToken: string;
  paymasterAddress: string;
  allowPermissionlessMint: boolean;
}

export function CommunityDetail() {
  const { address } = useParams<{ address: string }>();
  const [community, setCommunity] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  // Version info state
  const [registryVersion, setRegistryVersion] = useState<string>("");
  const [sharedConfigVersion, setSharedConfigVersion] = useState<string>("");
  const [registryAddress, setRegistryAddress] = useState<string>("");

  useEffect(() => {
    if (!address) return;
    fetchCommunityData();
    fetchVersionInfo();
  }, [address]);

  const fetchVersionInfo = async () => {
    try {
      // Get shared-config version from package.json
      const sharedConfigVersion = "@aastar/shared-config@0.3.1"; // From package.json
      setSharedConfigVersion(sharedConfigVersion);

      // Get Registry version and address from network config
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;
      setRegistryAddress(registryAddress);

      // Get Registry version from contract
      if (registryAddress && registryAddress !== "0x0") {
        const provider = getProvider();
        const registryContract = new ethers.Contract(
          registryAddress,
          ["function VERSION() view returns (string)", "function VERSION_CODE() view returns (uint256)"],
          provider
        );

        try {
          const version = await registryContract.VERSION();
          const versionCode = await registryContract.VERSION_CODE();
          setRegistryVersion(`${version} (${versionCode.toString()})`);
        } catch (err) {
          console.error('Failed to fetch Registry version:', err);
          setRegistryVersion("Unknown");
        }
      }

      console.log('=== Version Information ===');
      console.log('Shared Config:', sharedConfigVersion);
      console.log('Registry:', registryVersion || "Loading...");
      console.log('Registry Address:', registryAddress);
      console.log('========================');
    } catch (error) {
      console.error('Error fetching version info:', error);
      setRegistryVersion("Error");
      setSharedConfigVersion("Error");
    }
  };

  const fetchCommunityData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError("");

      const provider = getProvider();
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry; // Use latest Registry v2.1

      const registry = new ethers.Contract(
        registryAddress,
        RegistryV2_1_4ABI,
        provider
      );

      // Fetch community profile from Registry using communities mapping
      const profile = await registry.communities(address);

      // Check if community is registered
      if (!profile.isActive && profile.registeredAt === 0n) {
        setError("Community not found in Registry");
        setLoading(false);
        return;
      }

      setCommunity({
        name: profile.name,
        ensName: profile.ensName,
        isActive: profile.isActive,
        registeredAt: profile.registeredAt,
        nodeType: Number(profile.nodeType),
        xPNTsToken: profile.xPNTsToken,
        paymasterAddress: profile.paymasterAddress,
        allowPermissionlessMint: profile.allowPermissionlessMint,
      });

      setLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch community data:", err);
      setError(err.message || "Failed to load community data");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="community-detail">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading community data...</p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="community-detail">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error || "Community not found"}</p>
          <Link to="/explorer" className="back-link">
            ← Back to Explorer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="community-detail">
      {/* Registry Info Banner */}
      <div className="registry-info-banner">
        <div className="info-icon">ℹ️</div>
        <div className="info-content">
          <div style={{ marginBottom: '8px' }}>
            <strong>Registry Contract:</strong>{' '}
            <a
              href={getEtherscanAddressUrl(registryAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="registry-link"
            >
              {registryAddress}
            </a>
            <span className="network-badge">{getCurrentNetworkConfig().chainName}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <strong>Registry Version:</strong>{' '}
              <span className="version-badge">{registryVersion || "Loading..."}</span>
            </div>
            <div>
              <strong>Shared Config:</strong>{' '}
              <span className="version-badge">{sharedConfigVersion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="detail-header">
        <Link to="/explorer" className="back-link">
          ← Back to Explorer
        </Link>
        <div className="header-content">
          <h1>{community.name}</h1>
          <div className="header-badges">
            <span className={`status-badge ${community.isActive ? 'active' : 'inactive'}`}>
              {community.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="node-type-badge">
              {community.nodeType === 0 ? 'AOA' : 'AOA+'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="info-grid">
        {/* Basic Information */}
        <div className="info-card">
          <h3>Basic Information</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Community Name:</span>
              <span className="value">{community.name}</span>
            </div>
            <div className="info-row">
              <span className="label">ENS Name:</span>
              <span className="value">{community.ensName || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="label">Community Address:</span>
              <a
                href={getEtherscanAddressUrl(address!)}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
              >
                {address?.slice(0, 10)}...{address?.slice(-8)}
              </a>
            </div>
            <div className="info-row">
              <span className="label">Node Type:</span>
              <span className="value">
                {community.nodeType === 0 ? 'AOA (Account Abstraction)' : 'AOA+ (Super Paymaster)'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Registered At:</span>
              <span className="value">
                {new Date(Number(community.registeredAt) * 1000).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Token Information */}
        <div className="info-card">
          <h3>Token Information</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">xPNTs Token:</span>
              {community.xPNTsToken && community.xPNTsToken !== ethers.ZeroAddress ? (
                <a
                  href={getEtherscanAddressUrl(community.xPNTsToken)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {community.xPNTsToken.slice(0, 10)}...{community.xPNTsToken.slice(-8)}
                </a>
              ) : (
                <span className="value empty">Not deployed</span>
              )}
            </div>
          </div>
        </div>

        {/* Paymaster Information */}
        <div className="info-card">
          <h3>Paymaster Information</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Paymaster Address:</span>
              {community.paymasterAddress && community.paymasterAddress !== ethers.ZeroAddress ? (
                <a
                  href={getEtherscanAddressUrl(community.paymasterAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {community.paymasterAddress.slice(0, 10)}...{community.paymasterAddress.slice(-8)}
                </a>
              ) : (
                <span className="value empty">Not deployed</span>
              )}
            </div>
          </div>
        </div>

        {/* MySBT Information */}
        <div className="info-card">
          <h3>MySBT Information</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">MySBT Address:</span>
              <a
                href={getEtherscanAddressUrl(getCurrentNetworkConfig().contracts.mySBT)}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
                title="AAstar White-label SBT"
              >
                {getCurrentNetworkConfig().contracts.mySBT.slice(0, 10)}...{getCurrentNetworkConfig().contracts.mySBT.slice(-8)}
              </a>
            </div>
          </div>
        </div>

        {/* Permissionless Mint Configuration */}
        <div className="info-card">
          <h3>Mint Configuration</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Permissionless Mint:</span>
              <span className="value">
                {community.allowPermissionlessMint ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-actions">
        {community.paymasterAddress && community.paymasterAddress !== ethers.ZeroAddress && (
          <Link
            to={`/operator/manage?address=${community.paymasterAddress}`}
            className="action-button secondary"
          >
            Manage Paymaster
          </Link>
        )}
      </div>
    </div>
  );
}
