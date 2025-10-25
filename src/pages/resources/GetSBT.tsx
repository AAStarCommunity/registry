import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import "./GetSBT.css";

// Contract addresses from env
const MYSBT_FACTORY_ADDRESS =
  import.meta.env.VITE_MYSBT_FACTORY_ADDRESS ||
  "0x7ffd4B7db8A60015fAD77530892505bD69c6b8Ec";

const GTOKEN_STAKING_ADDRESS =
  import.meta.env.VITE_GTOKEN_STAKING_ADDRESS ||
  "0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2";

const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

// ABIs
const MYSBT_FACTORY_ABI = [
  "function deployMySBT() external returns (address sbtAddress, uint256 sbtId)",
  "function hasSBT(address community) external view returns (bool)",
  "function getSBTAddress(address community) external view returns (address)",
  "function isProtocolDerived(address sbt) external view returns (bool)",
  "function sbtToId(address sbt) external view returns (uint256)",
];

const GTOKEN_STAKING_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
];

export function GetSBT() {
  const navigate = useNavigate();

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [stGTokenBalance, setStGTokenBalance] = useState<string>("0");

  // SBT state
  const [existingSBT, setExistingSBT] = useState<string>("");
  const [sbtId, setSbtId] = useState<string>("");
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
      await checkExistingSBT(accounts[0]);
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

  // Check if user already deployed SBT
  const checkExistingSBT = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      const factory = new ethers.Contract(
        MYSBT_FACTORY_ADDRESS,
        MYSBT_FACTORY_ABI,
        rpcProvider
      );

      const hasSBT = await factory.hasSBT(address);
      if (hasSBT) {
        const sbtAddress = await factory.getSBTAddress(address);
        const id = await factory.sbtToId(sbtAddress);
        setExistingSBT(sbtAddress);
        setSbtId(id.toString());
      }
    } catch (err) {
      console.error("Failed to check existing SBT:", err);
    }
  };

  // Deploy new SBT
  const handleDeploySBT = async () => {
    setIsDeploying(true);
    setError("");
    setDeployTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        MYSBT_FACTORY_ADDRESS,
        MYSBT_FACTORY_ABI,
        signer
      );

      console.log("Deploying MySBT...");
      const tx = await factory.deployMySBT();
      setDeployTxHash(tx.hash);

      console.log("Waiting for confirmation...");
      await tx.wait();

      console.log("Deployment successful!");

      // Reload to get new SBT info
      await checkExistingSBT(account);
    } catch (err: any) {
      console.error("Deployment failed:", err);
      setError(err?.message || "Failed to deploy MySBT");
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
          checkExistingSBT(accounts[0]);
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
          <h1>Get MySBT</h1>
          <p className="subtitle">
            Deploy your Soul Bound Token with NFT binding support
          </p>
        </div>

        {/* What is MySBT */}
        <div className="info-section">
          <h2>What is MySBT?</h2>
          <p>
            MySBT (Soul Bound Token) is a non-transferable NFT that represents your
            community identity. It includes:
          </p>
          <ul className="feature-list">
            <li>
              <strong>Protocol-Derived Marking</strong>: Authenticity verification
              from factory deployment
            </li>
            <li>
              <strong>NFT Binding Support</strong>: Bind external NFTs to your SBT
              (Custodial & Non-Custodial modes)
            </li>
            <li>
              <strong>stGToken Lock</strong>: 0.3 stGT lock required for minting
            </li>
            <li>
              <strong>Binding Limits</strong>: First 10 NFT bindings free, then 1 stGT
              per additional binding
            </li>
            <li>
              <strong>7-Day Cooldown</strong>: Unbinding protection period
            </li>
          </ul>
        </div>

        {/* Contract Info */}
        <div className="info-section">
          <h2>Contract Information</h2>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">Factory Address</span>
              <span className="value mono">{MYSBT_FACTORY_ADDRESS}</span>
            </div>
            <div className="info-row">
              <span className="label">Network</span>
              <span className="value">Sepolia Testnet</span>
            </div>
            <div className="info-row">
              <span className="label">Lock Required</span>
              <span className="value highlight">0.3 stGT</span>
            </div>
            <div className="info-row">
              <span className="label">Mint Fee</span>
              <span className="value">0.1 GT (burned)</span>
            </div>
          </div>
        </div>

        {/* Deploy Section */}
        <div className="info-section deploy-section">
          <h2>Deploy Your MySBT</h2>

          {!account ? (
            <div className="wallet-connect-prompt">
              <p>Connect your wallet to deploy MySBT</p>
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

              {/* Balance Display */}
              <div className="balance-display">
                <div className="balance-item">
                  <span className="label">Your stGToken Balance</span>
                  <span className="value">{parseFloat(stGTokenBalance).toFixed(2)} stGT</span>
                </div>
                <div className="balance-item">
                  <span className="label">Lock Required</span>
                  <span className="value">0.3 stGT</span>
                </div>
              </div>

              {/* Existing SBT */}
              {existingSBT && (
                <div className="existing-sbt-box">
                  <h4>Your MySBT (ID #{sbtId})</h4>
                  <p className="mono">{existingSBT}</p>
                  <a
                    href={`https://sepolia.etherscan.io/address/${existingSBT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    View on Etherscan →
                  </a>
                </div>
              )}

              {/* Deploy Form */}
              {!existingSBT && (
                <div className="deploy-form">
                  <h4>Deploy New MySBT</h4>
                  <p className="hint">
                    This will deploy a MySBTWithNFTBinding contract for your community.
                    You need at least 0.3 stGT locked.
                  </p>

                  {parseFloat(stGTokenBalance) < 0.3 && (
                    <div className="warning-banner">
                      Insufficient stGToken balance. You need at least 0.3 stGT.
                      <a href="/get-gtoken" className="link">Get stGToken →</a>
                    </div>
                  )}

                  <button
                    className="action-button primary deploy-button"
                    onClick={handleDeploySBT}
                    disabled={isDeploying || parseFloat(stGTokenBalance) < 0.3}
                  >
                    {isDeploying ? "Deploying..." : "Deploy MySBT"}
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
          <a href="/get-gtoken" className="action-button outline">
            Get stGToken First
          </a>
          <button className="action-button secondary" onClick={() => navigate(-1)}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
