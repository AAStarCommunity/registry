import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import "./GetXPNTs.css";

// Contract addresses from env
const XPNTS_FACTORY_ADDRESS =
  import.meta.env.VITE_XPNTS_FACTORY_ADDRESS ||
  "0x356CF363E136b0880C8F48c9224A37171f375595";

const GTOKEN_STAKING_ADDRESS =
  import.meta.env.VITE_GTOKEN_STAKING_ADDRESS ||
  "0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2";

const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

// ABIs
const XPNTS_FACTORY_ABI = [
  "function deployxPNTsToken(string memory name, string memory symbol, string memory communityName, string memory communityENS) external returns (address)",
  "function hasToken(address community) external view returns (bool)",
  "function getTokenAddress(address community) external view returns (address)",
];

const GTOKEN_STAKING_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
];

export function GetXPNTs() {
  const navigate = useNavigate();

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [stGTokenBalance, setStGTokenBalance] = useState<string>("0");

  // xPNTs state
  const [existingToken, setExistingToken] = useState<string>("");
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");
  const [communityENS, setCommunityENS] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this feature");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      await loadBalances(accounts[0]);
      await checkExistingToken(accounts[0]);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err?.message || "Failed to connect wallet");
    }
  };

  // Load balances
  const loadBalances = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const stakingContract = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTOKEN_STAKING_ABI,
        rpcProvider
      );

      const stGTBalance = await stakingContract.balanceOf(address);
      setStGTokenBalance(ethers.formatEther(stGTBalance));
    } catch (err) {
      console.error("Failed to load balances:", err);
    }
  };

  // Check if user already deployed xPNTs token
  const checkExistingToken = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        XPNTS_FACTORY_ABI,
        rpcProvider
      );

      const hasToken = await factory.hasToken(address);
      if (hasToken) {
        const tokenAddress = await factory.getTokenAddress(address);
        setExistingToken(tokenAddress);
      }
    } catch (err) {
      console.error("Failed to check existing token:", err);
    }
  };

  // Deploy new xPNTs token
  const handleDeployToken = async () => {
    setIsDeploying(true);
    setError("");
    setDeployTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      if (!tokenName || !tokenSymbol) {
        throw new Error("Please enter token name and symbol");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        XPNTS_FACTORY_ABI,
        signer
      );

      console.log("Deploying xPNTs token...");
      const tx = await factory.deployxPNTsToken(
        tokenName,
        tokenSymbol,
        communityName || tokenName,
        communityENS || ""
      );
      setDeployTxHash(tx.hash);

      console.log("Waiting for confirmation...");
      const receipt = await tx.wait();

      console.log("Deployment successful!");

      // Reload to get new token info
      await checkExistingToken(account);
    } catch (err: any) {
      console.error("Deployment failed:", err);
      setError(err?.message || "Failed to deploy xPNTs token");
    } finally {
      setIsDeploying(false);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadBalances(accounts[0]);
          checkExistingToken(accounts[0]);
        }
      });
    }
  }, []);

  return (
    <div className="get-sbt-page">
      <div className="get-sbt-container">
        {/* Header */}
        <div className="get-sbt-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Get xPNTs Token</h1>
          <p className="subtitle">
            Deploy your community points token with auto-approval
          </p>
        </div>

        {/* What is xPNTs */}
        <div className="info-section">
          <h2>What is xPNTs?</h2>
          <p>
            xPNTs (Extended Points Token) is a community points token designed for
            gasless operations. It includes:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Auto-Approval System</strong>: Pre-approved for SuperPaymaster
              and factory operations
            </li>
            <li>
              <strong>Gasless Support</strong>: Native integration with Account Abstraction
            </li>
            <li>
              <strong>Community Branding</strong>: Custom name, symbol, and community metadata
            </li>
            <li>
              <strong>Mint & Burn</strong>: Flexible token supply management
            </li>
            <li>
              <strong>Rewards Integration</strong>: Compatible with staking and reward systems
            </li>
          </ul>
        </div>

        {/* Contract Info */}
        <div className="info-section">
          <h2>Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Factory Address</span>
              <span className="value mono">{XPNTS_FACTORY_ADDRESS}</span>
            </div>
            <div className="info-row">
              <span className="label">Network</span>
              <span className="value">Sepolia Testnet</span>
            </div>
            <div className="info-row">
              <span className="label">Deploy Fee</span>
              <span className="value highlight">Free (Gas Only)</span>
            </div>
            <div className="info-row">
              <span className="label">Token Standard</span>
              <span className="value">ERC-20 Extended</span>
            </div>
          </div>
        </div>

        {/* Deploy Section */}
        <div className="info-section deploy-section">
          <h2>Deploy Your xPNTs Token</h2>

          {!account ? (
            <div className="wallet-connect-prompt">
              <p>Connect your wallet to deploy xPNTs token</p>
              <button className="action-button primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="deploy-interface">
              {/* Wallet Info */}
              <div className="wallet-info">
                <p className="connected-account">
                  Connected: <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </p>
              </div>

              {/* Existing Token */}
              {existingToken && (
                <div className="existing-sbt-box">
                  <h4>Your xPNTs Token</h4>
                  <p className="mono">{existingToken}</p>
                  <a
                    href={`https://sepolia.etherscan.io/address/${existingToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on Etherscan →
                  </a>
                </div>
              )}

              {/* Deploy Form */}
              {!existingToken && (
                <div className="deploy-form">
                  <h4>Deploy New xPNTs Token</h4>
                  <p className="hint">
                    Deploy a community points token with auto-approval for SuperPaymaster operations.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Token Name *
                      </label>
                      <input
                        type="text"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        placeholder="e.g., My Community Points"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "2px solid #e5e7eb",
                          fontSize: "1rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Token Symbol *
                      </label>
                      <input
                        type="text"
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g., MCP"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "2px solid #e5e7eb",
                          fontSize: "1rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Community Name (optional)
                      </label>
                      <input
                        type="text"
                        value={communityName}
                        onChange={(e) => setCommunityName(e.target.value)}
                        placeholder="e.g., My Community"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "2px solid #e5e7eb",
                          fontSize: "1rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Community ENS (optional)
                      </label>
                      <input
                        type="text"
                        value={communityENS}
                        onChange={(e) => setCommunityENS(e.target.value)}
                        placeholder="e.g., mycommunity.eth"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "2px solid #e5e7eb",
                          fontSize: "1rem",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    className="action-button primary deploy-button"
                    onClick={handleDeployToken}
                    disabled={isDeploying || !tokenName || !tokenSymbol}
                  >
                    {isDeploying ? "Deploying..." : "Deploy xPNTs Token"}
                  </button>

                  {error && (
                    <div className="error-message">{error}</div>
                  )}

                  {deployTxHash && (
                    <div className="tx-success">
                      <p>Transaction submitted!</p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${deployTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link"
                      >
                        View on Etherscan →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="action-footer">
          <a href="/get-sbt" className="action-button outline">
            Get MySBT Token
          </a>
          <button className="action-button secondary" onClick={() => navigate(-1)}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
