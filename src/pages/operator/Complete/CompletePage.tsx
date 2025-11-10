/**
 * Independent Complete Page
 *
 * Standalone completion page that queries real data from:
 * - Connected wallet's community registry
 * - EntryPoint balance for paymaster
 * - Contract deployment status via shared-config
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import {
  getCurrentNetworkConfig,
  getExplorerLink,
} from "../../../config/networkConfig";
import {
  RegistryABI,
  ENTRY_POINT_ABI,
  PaymasterV4ABI,
} from "../../../config/abis";

// Community profile interface from Registry
interface CommunityProfile {
  name: string;
  ensName: string;
  xPNTsToken: string;
  supportedSBTs: string[];
  nodeType: number;
  paymasterAddress: string;
  community: string;
  registeredAt: number;
  lastUpdatedAt: number;
  isActive: boolean;
  allowPermissionlessMint: boolean;
}

export function CompletePage() {
  const navigate = useNavigate();
  const networkConfig = getCurrentNetworkConfig();

  // State for real data
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [communityProfile, setCommunityProfile] =
    useState<CommunityProfile | null>(null);
  const [entryPointDeposit, setEntryPointDeposit] = useState<string>("0");
  const [paymasterBalance, setPaymasterBalance] = useState<string>("0");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");
  const [ethBalance, setEthBalance] = useState<string>("0");

  // Get current wallet address
  const getWalletAddress = async () => {
    try {
      if (!window.ethereum) return null;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return signer.address;
    } catch (error) {
      console.error("Failed to get wallet address:", error);
      return null;
    }
  };

  // Query community profile from Registry
  const queryCommunityProfile = async (address: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registryAddress = networkConfig.contracts.registry;
      const registry = new ethers.Contract(
        registryAddress,
        RegistryABI,
        provider,
      );

      const profile = await registry.getCommunityProfile(address);

      // Convert tuple to object
      const communityData: CommunityProfile = {
        name: String(profile.name || profile[0] || ""),
        ensName: String(profile.ensName || profile[1] || ""),
        xPNTsToken: String(
          profile.xPNTsToken || profile[2] || ethers.ZeroAddress,
        ),
        supportedSBTs: Array.isArray(profile.supportedSBTs)
          ? [...profile.supportedSBTs]
          : Array.isArray(profile[3])
            ? [...profile[3]]
            : [],
        nodeType: Number(profile.nodeType ?? profile[4] ?? 0),
        paymasterAddress: String(
          profile.paymasterAddress || profile[5] || ethers.ZeroAddress,
        ),
        community: String(
          profile.community || profile[6] || ethers.ZeroAddress,
        ),
        registeredAt: Number(profile.registeredAt ?? profile[7] ?? 0),
        lastUpdatedAt: Number(profile.lastUpdatedAt ?? profile[8] ?? 0),
        isActive: Boolean(profile.isActive ?? profile[9] ?? true),
        allowPermissionlessMint: Boolean(
          profile.allowPermissionlessMint ?? profile[10] ?? false,
        ),
      };

      setCommunityProfile(communityData);
      console.log("✅ Community profile loaded:", communityData);

      // Query additional data if paymaster exists
      if (
        communityData.paymasterAddress &&
        communityData.paymasterAddress !== ethers.ZeroAddress
      ) {
        await queryPaymasterData(communityData.paymasterAddress);
      }
    } catch (error) {
      console.error("Failed to query community profile:", error);
    }
  };

  // Query EntryPoint deposit balance for paymaster
  const queryEntryPointDeposit = async (paymasterAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const entryPointAddress = networkConfig.contracts.entryPointV07;

      const entryPoint = new ethers.Contract(
        entryPointAddress,
        ENTRY_POINT_ABI,
        provider,
      );

      const balance = await entryPoint.balanceOf(paymasterAddress);
      const balanceEth = ethers.formatEther(balance);

      setEntryPointDeposit(balanceEth);
      console.log("💰 EntryPoint deposit:", balanceEth, "ETH");
    } catch (error) {
      console.error("Failed to query EntryPoint deposit:", error);
      setEntryPointDeposit("0");
    }
  };

  // Query paymaster ETH balance
  const queryPaymasterBalance = async (paymasterAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(paymasterAddress);
      const balanceEth = ethers.formatEther(balance);

      setPaymasterBalance(balanceEth);
      console.log("💰 Paymaster balance:", balanceEth, "ETH");
    } catch (error) {
      console.error("Failed to query paymaster balance:", error);
      setPaymasterBalance("0");
    }
  };

  // Query GToken balance
  const queryGTokenBalance = async (address: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const gTokenAddress = networkConfig.contracts.gToken;

      const erc20ABI = [
        "function balanceOf(address) external view returns (uint256)",
      ];
      const gToken = new ethers.Contract(gTokenAddress, erc20ABI, provider);

      const balance = await gToken.balanceOf(address);
      const balanceGToken = ethers.formatEther(balance);

      setGTokenBalance(balanceGToken);
      console.log("💰 GToken balance:", balanceGToken, "GT");
    } catch (error) {
      console.error("Failed to query GToken balance:", error);
      setGTokenBalance("0");
    }
  };

  // Query wallet ETH balance
  const queryEthBalance = async (address: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balance);

      setEthBalance(balanceEth);
      console.log("💰 ETH balance:", balanceEth, "ETH");
    } catch (error) {
      console.error("Failed to query ETH balance:", error);
      setEthBalance("0");
    }
  };

  // Query all paymaster related data
  const queryPaymasterData = async (paymasterAddress: string) => {
    await Promise.all([
      queryEntryPointDeposit(paymasterAddress),
      queryPaymasterBalance(paymasterAddress),
    ]);
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);

      const address = await getWalletAddress();
      if (!address) {
        setLoading(false);
        return;
      }

      setWalletAddress(address);

      await Promise.all([
        queryCommunityProfile(address),
        queryGTokenBalance(address),
        queryEthBalance(address),
      ]);

      setLoading(false);
    };

    initializeData();
  }, []);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleRestart = () => {
    window.location.href = "/operator/wizard";
  };

  if (loading) {
    return (
      <div className="complete-page">
        <div className="loading-container">
          <div className="spinner">🔄</div>
          <p>Loading deployment status...</p>
        </div>
      </div>
    );
  }

  if (!communityProfile || !walletAddress) {
    return (
      <div className="complete-page">
        <div className="error-container">
          <h2>⚠️ No Community Found</h2>
          <p>No registered community found for the connected wallet.</p>
          <button className="btn-primary" onClick={handleRestart}>
            🚀 Register New Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="complete-page">
      {/* Header */}
      <div className="page-header">
        <button className="back-button" onClick={handleGoBack}>
          ← Back
        </button>
        <h3>🎉 AOA Deployment Complete!</h3>
        <p className="subtitle">
          Your Account-Only-Account (AOA) Paymaster has been successfully
          deployed and configured
        </p>
        <div className="wallet-info">
          <span className="wallet-address">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
      </div>

      {/* Deployment Summary */}
      <div className="deployment-summary">
        <h2>📊 Deployment Summary</h2>
        <div className="summary-grid">
          {/* Community */}
          <div className="summary-card">
            <div className="card-icon">🏛️</div>
            <div className="card-content">
              <h4>Community</h4>
              <p className="card-value">{communityProfile.name}</p>
              <p className="card-detail">
                Registered:{" "}
                {new Date(
                  communityProfile.registeredAt * 1000,
                ).toLocaleDateString()}
              </p>
              <p className="card-detail">
                Status:{" "}
                {communityProfile.isActive ? "✅ Active" : "❌ Inactive"}
              </p>
            </div>
          </div>

          {/* xPNTs Token */}
          <div className="summary-card">
            <div className="card-icon">💎</div>
            <div className="card-content">
              <h4>xPNTs Token</h4>
              <p className="card-value mono">
                {communityProfile.xPNTsToken.slice(0, 10)}...
              </p>
              <a
                href={getExplorerLink(communityProfile.xPNTsToken)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Explorer →
              </a>
            </div>
          </div>

          {/* Paymaster */}
          <div className="summary-card highlight">
            <div className="card-icon">🚀</div>
            <div className="card-content">
              <h4>Paymaster</h4>
              <p className="card-value mono">
                {communityProfile.paymasterAddress.slice(0, 10)}...
              </p>
              <p className="card-detail">
                SBTs: {communityProfile.supportedSBTs.length} supported
              </p>
              <a
                href={getExplorerLink(communityProfile.paymasterAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                View on Explorer →
              </a>
            </div>
          </div>

          {/* Balances */}
          <div className="summary-card">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <h4>Account Balances</h4>
              <p className="card-detail">GToken: {gTokenBalance} GT</p>
              <p className="card-detail">
                EntryPoint Deposit:{" "}
                <span
                  style={{
                    color:
                      parseFloat(entryPointDeposit) > 0 ? "#10b981" : "#ef4444",
                    fontWeight: parseFloat(entryPointDeposit) > 0 ? 600 : 400,
                  }}
                >
                  {parseFloat(entryPointDeposit) > 0 ? "✅" : "⚠️"}{" "}
                  {parseFloat(entryPointDeposit).toFixed(4)} ETH
                </span>
              </p>
              <p className="card-detail">
                Paymaster ETH: {paymasterBalance} ETH
              </p>
              <p className="card-detail">Wallet ETH: {ethBalance} ETH</p>
              {parseFloat(entryPointDeposit) === 0 && (
                <a
                  href={`/operator/manage?address=${communityProfile.paymasterAddress}#entrypoint`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                  style={{ marginTop: "0.5rem", display: "inline-block" }}
                >
                  Add Deposit to EntryPoint →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Community Resources */}
      <div className="community-resources">
        <div className="resource-section">
          <h2>👥 For Community Members</h2>
          <div className="resource-grid">
            <div className="resource-card">
              <h3>🏆 Mint MySBT as a protocol credential</h3>
              <p>
                Need 0.4 GToken to mint your MySBT and become a recognized
                community member
              </p>
              <a href="/get-sbt" className="action-button primary">
                Mint MySBT →
              </a>
            </div>
            <div className="resource-card">
              <h3>🎯 Get xPNTs from Community Task Square</h3>
              <p>
                Complete community tasks and earn xPNTs for gas fee discounts
              </p>
              <a
                href="https://tasks.aastar.io"
                target="_blank"
                rel="noopener noreferrer"
                className="action-button secondary"
              >
                Go to Task Square →
              </a>
            </div>
          </div>
        </div>

        <div className="resource-section">
          <h2>⚡ For DApps or Developers</h2>
          <div className="resource-grid">
            <div className="resource-card">
              <h3>Support standard ERC-4337 Transaction</h3>
              <p>PaymasterAndData = Paymaster address:xPNTs address</p>
              <div className="code-block" style={{ color: "#00C851" }}>
                Paymaster address: {communityProfile.paymasterAddress}
                <br />
                :xPNTs address: {communityProfile.xPNTsToken}
              </div>
            </div>
            <div className="resource-card">
              <h3>⚠️ Important User Notifications</h3>
              <ul>
                <li>Get a MySBT credential</li>
                <li>Get about 100 xPNTs</li>
              </ul>
              <a
                href={`http://localhost:5173/operator/manage?address=${communityProfile.paymasterAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button info"
              >
                Paymaster Config →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendation */}
      <div className="security-recommendation">
        <div className="recommendation-header">
          <span className="icon">🔐</span>
          <h3>Security Recommendation: Transfer to Multisig Account</h3>
        </div>
        <div className="recommendation-content">
          <p>
            For production use, we strongly recommend transferring community
            ownership to a<strong> Gnosis Safe multisig wallet</strong> instead
            of using a single EOA account.
          </p>
          <div className="recommendation-benefits">
            <div className="benefit-item">
              <span className="check">✅</span>
              <span>Enhanced security with multiple signers</span>
            </div>
            <div className="benefit-item">
              <span className="check">✅</span>
              <span>Prevents single point of failure</span>
            </div>
            <div className="benefit-item">
              <span className="check">✅</span>
              <span>Professional governance structure</span>
            </div>
            <div className="benefit-item">
              <span className="check">✅</span>
              <span>Access control for critical operations</span>
            </div>
          </div>
          <div className="recommendation-actions">
            <a
              href="https://app.safe.global/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-create-safe"
            >
              🛡️ Create Gnosis Safe Multisig ↗
            </a>
            <a
              href={`/explorer/community/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-transfer"
            >
              🏛️ View Community ↗
            </a>
          </div>
          <div className="recommendation-note">
            <strong>Note:</strong> After creating a Safe multisig wallet:
            <ol
              style={{
                marginTop: "0.5rem",
                marginBottom: 0,
                paddingLeft: "1.5rem",
              }}
            >
              <li>
                Click "Manage Community" to open your community management page
              </li>
              <li>Connect your current wallet (owner account)</li>
              <li>
                Use the "Edit" button on "Owner Address" to transfer ownership
                to your Safe wallet address
              </li>
              <li>The page supports both MetaMask and Safe App modes</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="page-actions">
        <button className="btn-secondary" onClick={handleRestart}>
          🔄 Start New Deployment
        </button>
        <button className="btn-primary" onClick={() => navigate("/")}>
          🏠 Go Home
        </button>
      </div>
    </div>
  );
}
