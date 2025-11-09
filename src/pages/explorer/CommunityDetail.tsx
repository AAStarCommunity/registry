/**
 * Community Detail Page with Editing Support
 *
 * Displays and allows editing of Community information from Registry v2.2.0
 * Supports both EOA and Safe multisig accounts
 */

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import { getProvider } from "../../utils/rpc-provider";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getEtherscanAddressUrl } from "../../utils/etherscan";
import { RegistryABI } from "../../config/abis";
import { useSafeApp } from "../../hooks/useSafeApp";
import "./CommunityDetail.css";

interface CommunityProfile {
  name: string;
  ensName: string;
  xPNTsToken: string;
  supportedSBTs: string[];
  paymasterAddress: string;
  community: string; // owner address
  nodeType: number;
  registeredAt: string;
  lastUpdatedAt: string;
  isActive: boolean;
  allowPermissionlessMint: boolean;
}

interface BaseTransaction {
  to: string;
  value: string;
  data: string;
}

export function CommunityDetail() {
  const { address } = useParams<{ address: string }>();
  const [community, setCommunity] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Wallet connection state
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);

  // Safe integration
  const { sdk, safe, isLoading: safeLoading, isSafeApp } = useSafeApp();

  // Edit state
  const [editMode, setEditMode] = useState<{
    ownerAddress: boolean;
    permissionlessMint: boolean;
  }>({
    ownerAddress: false,
    permissionlessMint: false,
  });

  // Edit values
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>("");
  const [newPermissionlessMint, setNewPermissionlessMint] = useState<boolean>(false);

  // Batch edit mode
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    ownerAddress?: string;
    permissionlessMint?: boolean;
  }>({});

  // Version info state
  const [registryVersion, setRegistryVersion] = useState<string>("");
  const [registryAddress, setRegistryAddress] = useState<string>("");

  useEffect(() => {
    if (!address) return;
    fetchCommunityData();
    fetchVersionInfo();
  }, [address]);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (community && userAddress) {
      // Check if connected wallet is the community owner
      const ownerMatch = community.community.toLowerCase() === userAddress.toLowerCase();

      // Check if Safe wallet is the owner
      const safeOwnerMatch = safe ? community.community.toLowerCase() === safe.safeAddress.toLowerCase() : false;

      setIsOwner(ownerMatch || safeOwnerMatch);
    }
  }, [community, userAddress, safe]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum === "undefined") {
      console.log("MetaMask not installed");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);

      if (accounts && accounts.length > 0) {
        setIsConnected(true);
        setUserAddress(accounts[0]);
      }
    } catch (err) {
      console.error("Failed to check wallet connection:", err);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask to edit community settings");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts && accounts.length > 0) {
        setIsConnected(true);
        setUserAddress(accounts[0]);
      }
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      alert(`Failed to connect wallet: ${err.message}`);
    }
  };

  const fetchVersionInfo = async () => {
    try {
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;
      setRegistryAddress(registryAddress);

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
          setRegistryVersion("v2.2.0");
        }
      }
    } catch (error) {
      console.error('Error fetching version info:', error);
      setRegistryVersion("Error");
    }
  };

  const fetchCommunityData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError("");

      const provider = getProvider();
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;

      const registry = new ethers.Contract(
        registryAddress,
        RegistryABI,
        provider
      );

      // Use getCommunityProfile to get all 11 fields including supportedSBTs
      const profile = await registry.getCommunityProfile(address);

      // Check if community is registered
      if (profile.registeredAt === 0n) {
        setError("Community not found in Registry");
        setLoading(false);
        return;
      }

      setCommunity({
        name: String(profile.name || "Unnamed"),
        ensName: String(profile.ensName || ""),
        xPNTsToken: String(profile.xPNTsToken || ethers.ZeroAddress),
        supportedSBTs: (profile.supportedSBTs || []).map((sbt: any) => String(sbt)),
        paymasterAddress: String(profile.paymasterAddress || ethers.ZeroAddress),
        community: String(profile.community),
        nodeType: Number(profile.nodeType),
        registeredAt: profile.registeredAt.toString(),
        lastUpdatedAt: profile.lastUpdatedAt.toString(),
        isActive: Boolean(profile.isActive),
        allowPermissionlessMint: Boolean(profile.allowPermissionlessMint),
      });

      // Initialize edit values
      setNewPermissionlessMint(Boolean(profile.allowPermissionlessMint));

      setLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch community data:", err);
      setError(err.message || "Failed to load community data");
      setLoading(false);
    }
  };

  // ========================================
  // Edit Handlers
  // ========================================

  const handleEditOwner = () => {
    if (batchEditMode) {
      // In batch mode, just add to pending changes
      setPendingChanges({ ...pendingChanges, ownerAddress: community!.community });
      setNewOwnerAddress(community!.community);
    } else {
      setEditMode({ ...editMode, ownerAddress: true });
      setNewOwnerAddress(community!.community);
    }
  };

  const handleCancelOwnerEdit = () => {
    setEditMode({ ...editMode, ownerAddress: false });
    setNewOwnerAddress("");

    if (batchEditMode) {
      const { ownerAddress, ...rest } = pendingChanges;
      setPendingChanges(rest);
    }
  };

  const handleSaveOwner = async () => {
    if (!newOwnerAddress || !ethers.isAddress(newOwnerAddress)) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    if (batchEditMode) {
      // Add to batch
      setPendingChanges({ ...pendingChanges, ownerAddress: newOwnerAddress });
      setEditMode({ ...editMode, ownerAddress: false });
      return;
    }

    // Single edit mode - execute immediately
    await executeTransferOwnership(newOwnerAddress);
  };

  const handleEditPermissionlessMint = () => {
    if (batchEditMode) {
      setPendingChanges({ ...pendingChanges, permissionlessMint: !community!.allowPermissionlessMint });
      setNewPermissionlessMint(!community!.allowPermissionlessMint);
    } else {
      setEditMode({ ...editMode, permissionlessMint: true });
    }
  };

  const handleCancelPermissionlessMintEdit = () => {
    setEditMode({ ...editMode, permissionlessMint: false });
    setNewPermissionlessMint(community!.allowPermissionlessMint);

    if (batchEditMode) {
      const { permissionlessMint, ...rest } = pendingChanges;
      setPendingChanges(rest);
    }
  };

  const handleSavePermissionlessMint = async () => {
    if (batchEditMode) {
      // Add to batch
      setPendingChanges({ ...pendingChanges, permissionlessMint: newPermissionlessMint });
      setEditMode({ ...editMode, permissionlessMint: false });
      return;
    }

    // Single edit mode - execute immediately
    await executeUpdateProfile({ allowPermissionlessMint: newPermissionlessMint });
  };

  // ========================================
  // Transaction Execution
  // ========================================

  const executeTransferOwnership = async (newOwner: string) => {
    if (!community || !address) return;

    try {
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;
      const registryInterface = new ethers.Interface(RegistryABI);

      const txData = registryInterface.encodeFunctionData("transferCommunityOwnership", [newOwner]);

      const transaction: BaseTransaction = {
        to: registryAddress,
        value: "0",
        data: txData,
      };

      if (isSafeApp && sdk && safe) {
        // Safe transaction
        console.log("Proposing ownership transfer to Safe...");
        const safeTxResult = await sdk.txs.send({ txs: [transaction] });
        console.log("Safe transaction proposed:", safeTxResult.safeTxHash);

        alert(`Transaction proposed to Safe!\n\nPlease approve it in the Safe interface.\n\nTransaction Hash: ${safeTxResult.safeTxHash}`);
      } else {
        // MetaMask transaction
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const tx = await signer.sendTransaction({
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
        });

        console.log("Transaction sent:", tx.hash);
        alert(`Transaction submitted!\n\nPlease wait for confirmation.\n\nTx Hash: ${tx.hash}`);

        await tx.wait();
        alert("Transaction confirmed! Refreshing...");
      }

      // Refresh data
      await fetchCommunityData();
      setEditMode({ ...editMode, ownerAddress: false });
      setNewOwnerAddress("");
    } catch (err: any) {
      console.error("Failed to transfer ownership:", err);
      alert(`Failed to transfer ownership: ${err.message}`);
    }
  };

  const executeUpdateProfile = async (updates: { allowPermissionlessMint?: boolean }) => {
    if (!community || !address) return;

    try {
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;
      const registryInterface = new ethers.Interface(RegistryABI);

      // Build updated profile tuple
      const updatedProfile = {
        name: community.name,
        ensName: community.ensName,
        xPNTsToken: community.xPNTsToken,
        supportedSBTs: community.supportedSBTs,
        paymasterAddress: community.paymasterAddress,
        community: community.community,
        nodeType: community.nodeType,
        registeredAt: community.registeredAt,
        lastUpdatedAt: community.lastUpdatedAt,
        isActive: community.isActive,
        allowPermissionlessMint: updates.allowPermissionlessMint !== undefined
          ? updates.allowPermissionlessMint
          : community.allowPermissionlessMint,
      };

      const txData = registryInterface.encodeFunctionData("updateCommunityProfile", [updatedProfile]);

      const transaction: BaseTransaction = {
        to: registryAddress,
        value: "0",
        data: txData,
      };

      if (isSafeApp && sdk && safe) {
        // Safe transaction
        console.log("Proposing profile update to Safe...");
        const safeTxResult = await sdk.txs.send({ txs: [transaction] });
        console.log("Safe transaction proposed:", safeTxResult.safeTxHash);

        alert(`Transaction proposed to Safe!\n\nPlease approve it in the Safe interface.\n\nTransaction Hash: ${safeTxResult.safeTxHash}`);
      } else {
        // MetaMask transaction
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const tx = await signer.sendTransaction({
          to: transaction.to,
          data: transaction.data,
          value: transaction.value,
        });

        console.log("Transaction sent:", tx.hash);
        alert(`Transaction submitted!\n\nPlease wait for confirmation.\n\nTx Hash: ${tx.hash}`);

        await tx.wait();
        alert("Transaction confirmed! Refreshing...");
      }

      // Refresh data
      await fetchCommunityData();
      setEditMode({ ...editMode, permissionlessMint: false });
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      alert(`Failed to update profile: ${err.message}`);
    }
  };

  const executeBatchUpdate = async () => {
    if (!community || !address) return;
    if (Object.keys(pendingChanges).length === 0) {
      alert("No changes to submit");
      return;
    }

    try {
      const networkConfig = getCurrentNetworkConfig();
      const registryAddress = networkConfig.contracts.registry;
      const registryInterface = new ethers.Interface(RegistryABI);

      const transactions: BaseTransaction[] = [];

      // Transfer ownership if changed
      if (pendingChanges.ownerAddress && pendingChanges.ownerAddress !== community.community) {
        const txData = registryInterface.encodeFunctionData("transferCommunityOwnership", [
          pendingChanges.ownerAddress,
        ]);
        transactions.push({
          to: registryAddress,
          value: "0",
          data: txData,
        });
      }

      // Update profile if permissionlessMint changed
      if (pendingChanges.permissionlessMint !== undefined &&
          pendingChanges.permissionlessMint !== community.allowPermissionlessMint) {
        const updatedProfile = {
          name: community.name,
          ensName: community.ensName,
          xPNTsToken: community.xPNTsToken,
          supportedSBTs: community.supportedSBTs,
          paymasterAddress: community.paymasterAddress,
          community: pendingChanges.ownerAddress || community.community, // Use new owner if changing
          nodeType: community.nodeType,
          registeredAt: community.registeredAt,
          lastUpdatedAt: community.lastUpdatedAt,
          isActive: community.isActive,
          allowPermissionlessMint: pendingChanges.permissionlessMint,
        };

        const txData = registryInterface.encodeFunctionData("updateCommunityProfile", [updatedProfile]);
        transactions.push({
          to: registryAddress,
          value: "0",
          data: txData,
        });
      }

      if (transactions.length === 0) {
        alert("No changes to submit");
        return;
      }

      if (isSafeApp && sdk && safe) {
        // Safe batch transaction
        console.log(`Proposing ${transactions.length} transaction(s) to Safe...`);
        const safeTxResult = await sdk.txs.send({ txs: transactions });
        console.log("Safe batch transaction proposed:", safeTxResult.safeTxHash);

        alert(
          `Batch transaction proposed to Safe!\n\n` +
          `Transactions: ${transactions.length}\n` +
          `Please approve in the Safe interface.\n\n` +
          `Transaction Hash: ${safeTxResult.safeTxHash}`
        );
      } else {
        // MetaMask - execute sequentially
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        for (let i = 0; i < transactions.length; i++) {
          const tx = await signer.sendTransaction({
            to: transactions[i].to,
            data: transactions[i].data,
            value: transactions[i].value,
          });

          console.log(`Transaction ${i + 1}/${transactions.length} sent:`, tx.hash);
          alert(`Transaction ${i + 1}/${transactions.length} submitted!\n\nTx Hash: ${tx.hash}`);

          await tx.wait();
          alert(`Transaction ${i + 1}/${transactions.length} confirmed!`);
        }

        alert("All transactions confirmed! Refreshing...");
      }

      // Clear batch mode and refresh
      setBatchEditMode(false);
      setPendingChanges({});
      await fetchCommunityData();
    } catch (err: any) {
      console.error("Failed to execute batch update:", err);
      alert(`Failed to execute batch update: ${err.message}`);
    }
  };

  // ========================================
  // Render
  // ========================================

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
            {isSafeApp && safe && (
              <div>
                <strong>Safe Wallet:</strong>{' '}
                <code className="version-badge">{safe.safeAddress.slice(0, 10)}...{safe.safeAddress.slice(-8)}</code>
              </div>
            )}
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

        {/* Wallet Connection */}
        <div className="wallet-section">
          {!isConnected && !isSafeApp ? (
            <button onClick={connectWallet} className="connect-wallet-btn">
              🔗 Connect Wallet to Edit
            </button>
          ) : (
            <>
              <div className="wallet-info">
                <span className="wallet-label">Connected:</span>
                <code className="wallet-address">
                  {isSafeApp && safe
                    ? `${safe.safeAddress.slice(0, 6)}...${safe.safeAddress.slice(-4)} (Safe ${safe.threshold}/${safe.owners.length})`
                    : `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
                  }
                </code>
                {isOwner && <span className="owner-badge">✅ Owner</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Mode Controls */}
      {isOwner && (
        <div className="edit-controls">
          <button
            onClick={() => setBatchEditMode(!batchEditMode)}
            className={`batch-mode-btn ${batchEditMode ? 'active' : ''}`}
          >
            {batchEditMode ? '📦 Batch Edit Mode: ON' : '📝 Enable Batch Edit'}
          </button>

          {batchEditMode && Object.keys(pendingChanges).length > 0 && (
            <div className="batch-summary">
              <span className="batch-count">
                {Object.keys(pendingChanges).length} change(s) pending
              </span>
              <button onClick={executeBatchUpdate} className="batch-submit-btn">
                🚀 Submit All Changes
              </button>
              <button
                onClick={() => {
                  setPendingChanges({});
                  setBatchEditMode(false);
                }}
                className="batch-cancel-btn"
              >
                ❌ Cancel All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Info Grid */}
      <div className="info-grid">
        {/* Basic Information - Read-only */}
        <div className="info-card">
          <h3>📋 Basic Information</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Community Name:</span>
              <span className="value">{community.name}</span>
              <span className="readonly-badge">Read-only</span>
            </div>
            <div className="info-row">
              <span className="label">ENS Name:</span>
              <span className="value">{community.ensName || 'Not set'}</span>
              <span className="readonly-badge">Read-only</span>
            </div>
            <div className="info-row">
              <span className="label">Node Type:</span>
              <span className="value">
                {community.nodeType === 0 ? 'AOA (Independent)' : 'Super (Managed)'}
              </span>
              <span className="readonly-badge">Read-only</span>
            </div>
            <div className="info-row">
              <span className="label">Registered At:</span>
              <span className="value">
                {new Date(Number(community.registeredAt) * 1000).toLocaleString()}
              </span>
              <span className="readonly-badge">Read-only</span>
            </div>
          </div>
        </div>

        {/* Community Owner - Editable */}
        <div className={`info-card editable ${editMode.ownerAddress || pendingChanges.ownerAddress ? 'editing' : ''}`}>
          <h3>👤 Community Owner</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Owner Address:</span>
              {editMode.ownerAddress || (batchEditMode && pendingChanges.ownerAddress) ? (
                <div className="edit-controls-inline">
                  <input
                    type="text"
                    value={newOwnerAddress}
                    onChange={(e) => setNewOwnerAddress(e.target.value)}
                    placeholder="0x..."
                    className="address-input"
                  />
                  <button onClick={handleSaveOwner} className="save-btn">
                    ✅
                  </button>
                  <button onClick={handleCancelOwnerEdit} className="cancel-btn">
                    ❌
                  </button>
                </div>
              ) : (
                <>
                  <a
                    href={getEtherscanAddressUrl(community.community)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="address-link"
                  >
                    {community.community.slice(0, 10)}...{community.community.slice(-8)}
                  </a>
                  {isOwner && (
                    <button onClick={handleEditOwner} className="edit-btn">
                      ✏️ Edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Token Information - Read-only */}
        <div className="info-card">
          <h3>💎 Token Information</h3>
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
              <span className="readonly-badge">Read-only</span>
            </div>
          </div>
        </div>

        {/* Paymaster Information - Read-only */}
        <div className="info-card">
          <h3>🚀 Paymaster Information</h3>
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
              <span className="readonly-badge">Read-only</span>
            </div>
          </div>
        </div>

        {/* MySBT Information - Read-only */}
        <div className="info-card">
          <h3>🎫 MySBT Information</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Supported SBTs:</span>
              <div className="sbt-list">
                {community.supportedSBTs.length > 0 ? (
                  community.supportedSBTs.map((sbt, idx) => (
                    <a
                      key={idx}
                      href={getEtherscanAddressUrl(sbt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sbt-badge-link"
                    >
                      {sbt.slice(0, 6)}...{sbt.slice(-4)}
                    </a>
                  ))
                ) : (
                  <span className="value empty">None</span>
                )}
              </div>
              <span className="readonly-badge">Read-only</span>
            </div>
          </div>
        </div>

        {/* Permissionless Mint - Editable */}
        <div className={`info-card editable ${editMode.permissionlessMint || pendingChanges.permissionlessMint !== undefined ? 'editing' : ''}`}>
          <h3>⚙️ MySBT Register Configuration</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Permissionless MySBT Register:</span>
              {editMode.permissionlessMint || (batchEditMode && pendingChanges.permissionlessMint !== undefined) ? (
                <div className="edit-controls-inline">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={newPermissionlessMint}
                      onChange={(e) => setNewPermissionlessMint(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className="toggle-label">
                    {newPermissionlessMint ? 'Enabled' : 'Disabled'}
                  </span>
                  <button onClick={handleSavePermissionlessMint} className="save-btn">
                    ✅
                  </button>
                  <button onClick={handleCancelPermissionlessMintEdit} className="cancel-btn">
                    ❌
                  </button>
                </div>
              ) : (
                <>
                  <span className={`value ${community.allowPermissionlessMint ? 'enabled' : 'disabled'}`}>
                    {community.allowPermissionlessMint ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                  {isOwner && (
                    <button onClick={handleEditPermissionlessMint} className="edit-btn">
                      ✏️ Edit
                    </button>
                  )}
                </>
              )}
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
