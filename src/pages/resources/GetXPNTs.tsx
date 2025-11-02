import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import "./GetXPNTs.css";

// ABIs
const XPNTS_FACTORY_ABI = [
  "function deployxPNTsToken(string memory name, string memory symbol, string memory communityName, string memory communityENS, uint256 exchangeRate, address paymasterAOA) external returns (address)",
  "function hasToken(address community) external view returns (bool)",
  "function getTokenAddress(address community) external view returns (address)",
];

export function GetXPNTs() {
  const navigate = useNavigate();

  // Get addresses from config with env overrides
  const networkConfig = getCurrentNetworkConfig();
  const XPNTS_FACTORY_ADDRESS =
    import.meta.env.VITE_XPNTS_FACTORY_ADDRESS ||
    networkConfig.contracts.xPNTsFactory;
  const RPC_URL = getRpcUrl();
  const SUPER_PAYMASTER_V2_ADDRESS =
    import.meta.env.VITE_SUPER_PAYMASTER_V2_ADDRESS ||
    networkConfig.contracts.superPaymasterV2;

  // Wallet state
  const [account, setAccount] = useState<string>("");

  // xPNTs state
  const [existingToken, setExistingToken] = useState<string>("");
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");
  const [communityENS, setCommunityENS] = useState<string>("");
  const [paymasterMode, setPaymasterMode] = useState<"AOA+" | "AOA">("AOA+");
  const [paymasterAddress, setPaymasterAddress] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("1");
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
      await checkExistingToken(accounts[0]);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setError(err?.message || "Failed to connect wallet");
    }
  };

  // Check if user already deployed xPNTs token
  const checkExistingToken = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
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

      if (paymasterMode === "AOA" && !paymasterAddress) {
        throw new Error("Please enter paymaster address for AOA mode");
      }

      if (paymasterMode === "AOA" && !ethers.isAddress(paymasterAddress)) {
        throw new Error("Invalid paymaster address");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        XPNTS_FACTORY_ABI,
        signer
      );

      // Calculate exchangeRate in wei (1 = 1e18)
      const exchangeRateWei = ethers.parseEther(exchangeRate || "1");

      // Determine paymaster address based on mode
      const paymasterAddr = paymasterMode === "AOA+"
        ? ethers.ZeroAddress
        : paymasterAddress;

      console.log("Deploying xPNTs token...");
      console.log("Mode:", paymasterMode);
      console.log("Paymaster:", paymasterAddr);
      console.log("Exchange Rate:", exchangeRate, "->", exchangeRateWei.toString());

      const tx = await factory.deployxPNTsToken(
        tokenName,
        tokenSymbol,
        communityName || tokenName,
        communityENS || "",
        exchangeRateWei,
        paymasterAddr
      );
      setDeployTxHash(tx.hash);

      console.log("Waiting for confirmation...");
      await tx.wait();

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

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Paymaster Mode *
                      </label>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="paymasterMode"
                            value="AOA+"
                            checked={paymasterMode === "AOA+"}
                            onChange={(e) => setPaymasterMode(e.target.value as "AOA+" | "AOA")}
                          />
                          <span style={{ fontWeight: 500 }}>
                            AOA+ <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>(共享SuperPaymaster V2)</span>
                          </span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="paymasterMode"
                            value="AOA"
                            checked={paymasterMode === "AOA"}
                            onChange={(e) => setPaymasterMode(e.target.value as "AOA+" | "AOA")}
                          />
                          <span style={{ fontWeight: 500 }}>
                            AOA <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>(自有Paymaster)</span>
                          </span>
                        </label>
                      </div>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                        {paymasterMode === "AOA+"
                          ? "使用共享SuperPaymaster V2，无需部署自己的Paymaster"
                          : "需要先部署自己的PaymasterV4合约"}
                      </p>
                    </div>

                    {paymasterMode === "AOA" && (
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                          Paymaster Address *
                        </label>
                        <input
                          type="text"
                          value={paymasterAddress}
                          onChange={(e) => setPaymasterAddress(e.target.value)}
                          placeholder="0x..."
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            border: "2px solid #e5e7eb",
                            fontSize: "1rem",
                            fontFamily: "Monaco, Courier New, monospace",
                          }}
                        />
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                          输入你已部署的PaymasterV4合约地址
                        </p>
                      </div>
                    )}

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Exchange Rate (optional)
                      </label>
                      <input
                        type="text"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder="1"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: "2px solid #e5e7eb",
                          fontSize: "1rem",
                        }}
                      />
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                        1 aPNTs = {exchangeRate || "1"} xPNTs (默认 1:1)
                      </p>
                    </div>
                  </div>

                  <button
                    className="action-button primary deploy-button"
                    onClick={handleDeployToken}
                    disabled={
                      isDeploying ||
                      !tokenName ||
                      !tokenSymbol ||
                      (paymasterMode === "AOA" && !paymasterAddress)
                    }
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
