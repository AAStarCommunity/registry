import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import "./MySBT.css";

// Contract addresses from env
const MYSBT_V2_3_ADDRESS =
  import.meta.env.VITE_MYSBT_V2_3_ADDRESS ||
  "0xc1085841307d85d4a8dC973321Df2dF7c01cE5C8";

const GTOKEN_ADDRESS =
  import.meta.env.VITE_GTOKEN_ADDRESS ||
  "0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35";

const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

// MySBT v2.3 ABI (essential functions)
const MYSBT_ABI = [
  // ERC721 basics
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",

  // Core functions
  "function mintOrAddMembership(address user, string metadata) external returns (uint256 tokenId, bool isNewMint)",
  "function getCommunityReputation(address user, address community) external view returns (uint256 score)",
  "function getCommunityMembership(uint256 tokenId, address community) external view returns (tuple(bool isActive, string metadata, uint256 joinedAt, address nftContract, uint256 nftTokenId) membership)",
  "function bindCommunityNFT(address community, address nftContract, uint256 nftTokenId) external",
  "function recordActivity(address user) external",

  // View functions
  "function VERSION() external view returns (string)",
  "function VERSION_CODE() external view returns (uint256)",
  "function mintFee() external view returns (uint256)",
  "function paused() external view returns (bool)",
];

const GTOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export function MySBT() {
  const navigate = useNavigate();

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [gtokenBalance, setGtokenBalance] = useState<string>("0");

  // SBT state
  const [myTokenId, setMyTokenId] = useState<string>("");
  const [mintFeeAmount, setMintFeeAmount] = useState<string>("0");
  const [version, setVersion] = useState<string>("");

  // Mint state
  const [newCommunityAddress, setNewCommunityAddress] = useState<string>("");
  const [metadata, setMetadata] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Query state
  const [queryAddress, setQueryAddress] = useState<string>("");
  const [queryReputation, setQueryReputation] = useState<string>("");

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
      await loadData(accounts[0]);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err?.message || "Failed to connect wallet");
    }
  };

  // Load all data
  const loadData = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

      // Load MySBT contract info
      const sbtContract = new ethers.Contract(
        MYSBT_V2_3_ADDRESS,
        MYSBT_ABI,
        rpcProvider
      );

      // Get user's token ID (balance should be 1 if they have an SBT)
      const balance = await sbtContract.balanceOf(address);
      console.log("SBT Balance:", balance.toString());

      // For now, assume tokenId 1 if they have balance
      // TODO: Add proper tokenId enumeration
      if (balance > 0n) {
        setMyTokenId("1"); // Placeholder
      }

      // Get contract version and mint fee
      const ver = await sbtContract.VERSION();
      const fee = await sbtContract.mintFee();
      setVersion(ver);
      setMintFeeAmount(ethers.formatEther(fee));

      // Load GToken balance
      const gtokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        GTOKEN_ABI,
        rpcProvider
      );
      const gtBalance = await gtokenContract.balanceOf(address);
      setGtokenBalance(ethers.formatEther(gtBalance));

    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  // Query reputation for a specific community
  const handleQueryReputation = async () => {
    if (!queryAddress || !account) return;

    try {
      const rpcProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const sbtContract = new ethers.Contract(
        MYSBT_V2_3_ADDRESS,
        MYSBT_ABI,
        rpcProvider
      );

      const reputation = await sbtContract.getCommunityReputation(account, queryAddress);
      setQueryReputation(reputation.toString());
    } catch (err: any) {
      console.error("Failed to query reputation:", err);
      setError(err?.message || "Failed to query reputation");
    }
  };

  // Mint or add membership (permissionless)
  const handleMint = async () => {
    if (!newCommunityAddress) {
      setError("Please enter a community address");
      return;
    }

    if (!metadata) {
      setError("Please enter metadata (IPFS URI or JSON)");
      return;
    }

    setIsMinting(true);
    setError("");
    setMintTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check and approve GToken if needed
      const gtokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        GTOKEN_ABI,
        signer
      );

      const allowance = await gtokenContract.allowance(account, MYSBT_V2_3_ADDRESS);
      const feeAmount = ethers.parseEther(mintFeeAmount);

      if (allowance < feeAmount) {
        console.log("Approving GToken...");
        const approveTx = await gtokenContract.approve(
          MYSBT_V2_3_ADDRESS,
          ethers.parseEther("1000") // Approve more for multiple mints
        );
        await approveTx.wait();
        console.log("GToken approved!");
      }

      // Mint or add membership
      const sbtContract = new ethers.Contract(
        MYSBT_V2_3_ADDRESS,
        MYSBT_ABI,
        signer
      );

      console.log("Minting/Adding membership...");
      console.log("Community:", newCommunityAddress);
      console.log("Metadata:", metadata);

      const tx = await sbtContract.mintOrAddMembership(account, metadata);
      setMintTxHash(tx.hash);

      console.log("Waiting for confirmation...");
      const receipt = await tx.wait();

      console.log("Mint successful!", receipt);

      // Reload data
      await loadData(account);

      // Clear form
      setNewCommunityAddress("");
      setMetadata("");

    } catch (err: any) {
      console.error("Mint failed:", err);
      setError(err?.message || "Failed to mint/add membership");
    } finally {
      setIsMinting(false);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            loadData(accounts[0]);
          }
        });
    }
  }, []);

  return (
    <div className="mysbt-page">
      <div className="mysbt-container">
        {/* Header */}
        <div className="mysbt-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>My SBT (Soul Bound Token)</h1>
          <p className="subtitle">
            MySBT v2.3 - Security Enhanced with Permissionless Community Membership
          </p>
        </div>

        {/* What is MySBT v2.3 */}
        <div className="info-section">
          <h2>What is MySBT v2.3?</h2>
          <p>
            MySBT (Soul Bound Token) v2.3 is a security-enhanced, non-transferable NFT
            representing your multi-community identity. Join any community permissionlessly!
          </p>
          <ul className="feature-list">
            <li>
              <strong>Permissionless Access</strong>: Join any community without approval -
              true decentralization
            </li>
            <li>
              <strong>Multi-Community Support</strong>: One SBT for all your communities,
              track reputation across each
            </li>
            <li>
              <strong>Security Enhanced</strong>: Rate limiting (5min), real-time NFT verification,
              Pausable mechanism
            </li>
            <li>
              <strong>NFT Binding</strong>: Bind community NFTs to boost reputation
              (Custodial & Non-Custodial modes)
            </li>
            <li>
              <strong>Activity Tracking</strong>: Build reputation through on-chain activities
              with automatic scoring
            </li>
            <li>
              <strong>Gas Optimized</strong>: 40% gas reduction vs v2.1 (39k vs 65k per activity)
            </li>
          </ul>
        </div>

        {/* Contract Info */}
        <div className="info-section">
          <h2>Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Contract Address</span>
              <span className="value mono">{MYSBT_V2_3_ADDRESS}</span>
            </div>
            <div className="info-row">
              <span className="label">Version</span>
              <span className="value">{version || "v2.3.0"}</span>
            </div>
            <div className="info-row">
              <span className="label">Network</span>
              <span className="value">Sepolia Testnet</span>
            </div>
            <div className="info-row">
              <span className="label">Mint Fee</span>
              <span className="value highlight">{mintFeeAmount} GT (burned)</span>
            </div>
            <div className="info-row">
              <span className="label">Rate Limit</span>
              <span className="value">5 minutes between activities</span>
            </div>
            <div className="info-row">
              <span className="label">Subgraph</span>
              <span className="value">
                <a
                  href="https://thegraph.com/studio/subgraph/mysbt-v-2-3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  View on The Graph Studio →
                </a>
              </span>
            </div>
          </div>
        </div>

        {!account ? (
          <div className="wallet-connect-section">
            <div className="connect-prompt">
              <h2>Connect Wallet to Get Started</h2>
              <p>View your SBT status and join communities permissionlessly</p>
              <button className="action-button primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="mysbt-content">
            {/* User Info */}
            <div className="info-section user-section">
              <h2>Your Status</h2>
              <div className="user-info-grid">
                <div className="info-card">
                  <span className="label">Wallet</span>
                  <span className="value mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
                <div className="info-card">
                  <span className="label">GToken Balance</span>
                  <span className="value">{parseFloat(gtokenBalance).toFixed(2)} GT</span>
                </div>
                <div className="info-card">
                  <span className="label">SBT Token ID</span>
                  <span className="value">{myTokenId || "No SBT yet"}</span>
                </div>
              </div>
            </div>

            {/* Permissionless Mint Section */}
            <div className="info-section mint-section">
              <h2>🚀 Join Community (Permissionless)</h2>
              <p className="section-description">
                Join any community by minting/adding membership. No permission needed!
              </p>

              <div className="mint-form">
                <div className="form-group">
                  <label>Community Address</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="0x..."
                    value={newCommunityAddress}
                    onChange={(e) => setNewCommunityAddress(e.target.value)}
                  />
                  <span className="form-hint">
                    The community you want to join (can be any address)
                  </span>
                </div>

                <div className="form-group">
                  <label>Metadata</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder='ipfs://... or {"name":"My Name"}'
                    value={metadata}
                    onChange={(e) => setMetadata(e.target.value)}
                  />
                  <span className="form-hint">
                    IPFS URI (recommended) or JSON string with your profile info
                  </span>
                </div>

                {parseFloat(gtokenBalance) < parseFloat(mintFeeAmount) && (
                  <div className="warning-banner">
                    Insufficient GToken balance. You need {mintFeeAmount} GT to mint.
                    <a href="/get-gtoken" className="link">Get GToken →</a>
                  </div>
                )}

                <button
                  className="action-button primary mint-button"
                  onClick={handleMint}
                  disabled={isMinting || parseFloat(gtokenBalance) < parseFloat(mintFeeAmount)}
                >
                  {isMinting ? "Minting..." : "Join Community"}
                </button>

                {error && <div className="error-message">{error}</div>}

                {mintTxHash && (
                  <div className="tx-success">
                    <p>✅ Transaction submitted!</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${mintTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      View on Etherscan →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Query Reputation Section */}
            <div className="info-section query-section">
              <h2>🔍 Check Community Reputation</h2>
              <div className="query-form">
                <div className="form-group">
                  <label>Community Address</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="0x..."
                    value={queryAddress}
                    onChange={(e) => setQueryAddress(e.target.value)}
                  />
                </div>
                <button
                  className="action-button secondary"
                  onClick={handleQueryReputation}
                  disabled={!queryAddress}
                >
                  Query Reputation
                </button>

                {queryReputation && (
                  <div className="reputation-result">
                    <h4>Reputation Score</h4>
                    <div className="score-display">{queryReputation}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Help Section */}
            <div className="info-section help-section">
              <h3>💡 How It Works</h3>
              <ul className="help-list">
                <li>
                  <strong>Permissionless</strong>: Anyone can join any community without approval
                </li>
                <li>
                  <strong>First Mint</strong>: Creates your SBT token (costs {mintFeeAmount} GT)
                </li>
                <li>
                  <strong>Add Membership</strong>: Subsequent joins add new community memberships
                </li>
                <li>
                  <strong>Reputation</strong>: Build reputation through activity and NFT binding
                </li>
                <li>
                  <strong>Rate Limit</strong>: 5 minute interval between activities
                </li>
              </ul>
            </div>

            {/* Action Footer */}
            <div className="action-footer">
              <a href="/get-gtoken" className="action-button outline">
                Get GToken First
              </a>
              <a
                href="https://thegraph.com/studio/subgraph/mysbt-v-2-3"
                target="_blank"
                rel="noopener noreferrer"
                className="action-button outline"
              >
                View Subgraph →
              </a>
              <button className="action-button secondary" onClick={() => navigate(-1)}>
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
