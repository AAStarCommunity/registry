import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import { xPNTsFactoryABI, RegistryABI, ERC20_ABI } from "../../config/abis";
import "./GetXPNTs.css";

export function GetXPNTs() {
  const navigate = useNavigate();

  // Get addresses from config
  const networkConfig = getCurrentNetworkConfig();
  const XPNTS_FACTORY_ADDRESS = networkConfig.contracts.xPNTsFactory;
  const REGISTRY_ADDRESS = networkConfig.contracts.registry;
  const RPC_URL = getRpcUrl();

  // Wallet state
  const [account, setAccount] = useState<string>("");

  // xPNTs state
  const [existingToken, setExistingToken] = useState<string>("");
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenTotalSupply, setTokenTotalSupply] = useState<string>("");
  const [tokenCreatedAt, setTokenCreatedAt] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");
  const [communityENS, setCommunityENS] = useState<string>("");
  const [paymasterMode, setPaymasterMode] = useState<"AOA+" | "AOA">("AOA+");
  const [paymasterAddress, setPaymasterAddress] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("1");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Registry state
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [communityXPNTsToken, setCommunityXPNTsToken] = useState<string>("");
  const [isTokenBound, setIsTokenBound] = useState<boolean>(false);

  // Registry update state
  const [isUpdatingRegistry, setIsUpdatingRegistry] = useState(false);
  const [registryUpdateStatus, setRegistryUpdateStatus] = useState<string>("");
  const [registryTxHash, setRegistryTxHash] = useState<string>("");

  // Check if user is registered in Registry and load community info
  const checkRegistryInfo = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        RegistryABI,
        rpcProvider
      );

      const isReg = await registry.isRegisteredCommunity(address);
      setIsRegistered(isReg);

      if (isReg) {
        // Load community profile from Registry
        const profile = await registry.getCommunityProfile(address);
        setCommunityName(profile.name || "");
        setCommunityENS(profile.ensName || "");

        // Check if xPNTsToken is already bound
        const boundToken = profile.xPNTsToken || "";
        setCommunityXPNTsToken(boundToken);
        setIsTokenBound(boundToken !== "" && boundToken !== ethers.ZeroAddress);

        console.log("Loaded community info from Registry:", {
          name: profile.name,
          ensName: profile.ensName,
          xPNTsToken: boundToken,
          isTokenBound: boundToken !== "" && boundToken !== ethers.ZeroAddress
        });
      }
    } catch (err) {
      console.error("Failed to check Registry:", err);
    }
  };

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
      await checkRegistryInfo(accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  // Check if user already deployed xPNTs token
  const checkExistingToken = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        xPNTsFactoryABI,
        rpcProvider
      );

      const hasToken = await factory.hasToken(address);
      if (hasToken) {
        const tokenAddress = await factory.getTokenAddress(address);
        setExistingToken(tokenAddress);

        // Get token details from ERC20 contract
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);

        try {
          const [name, symbol, decimals, totalSupply] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.totalSupply()
          ]);

          setTokenName(name);
          setTokenSymbol(symbol);
          setTokenDecimals(Number(decimals));
          setTokenTotalSupply(ethers.formatUnits(totalSupply, decimals));

          console.log("Token details loaded:", {
            address: tokenAddress,
            name,
            symbol,
            decimals: Number(decimals),
            totalSupply: ethers.formatUnits(totalSupply, decimals)
          });
        } catch (tokenErr) {
          console.error("Failed to fetch token details:", tokenErr);
        }

        // Try to get creation timestamp from xPNTsFactory events
        try {
          const createdFilter = factory.filters.TokenCreated(address);
          const events = await factory.queryFilter(createdFilter, 0, 'latest');

          if (events.length > 0) {
            const block = await rpcProvider.getBlock(events[0].blockNumber);
            if (block) {
              const createdDate = new Date(block.timestamp * 1000);
              setTokenCreatedAt(createdDate.toISOString());
              console.log("Token created at:", createdDate.toISOString());
            }
          }
        } catch (eventErr) {
          console.error("Failed to fetch creation timestamp:", eventErr);
        }
      }
    } catch (err) {
      console.error("Failed to check existing token:", err);
    }
  };

  // Update Registry with deployed xPNTs token address
  const updateRegistryWithToken = async (tokenAddress: string) => {
    setIsUpdatingRegistry(true);
    setRegistryUpdateStatus("");
    setRegistryTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, signer);

      // Check if community is registered
      const isRegistered = await registry.isRegisteredCommunity(account);

      if (!isRegistered) {
        setRegistryUpdateStatus("未注册社区");
        console.log("Community not registered - skipping Registry update");
        return false;
      }

      console.log("Updating Registry with xPNTs token:", tokenAddress);
      setRegistryUpdateStatus("正在更新 Registry...");

      // Get current community profile
      const currentProfile = await registry.getCommunityProfile(account);

      // Update profile with new xPNTs token address
      const updatedProfile = {
        name: currentProfile.name,
        ensName: currentProfile.ensName,
        xPNTsToken: tokenAddress,  // Update with new token address
        supportedSBTs: [...currentProfile.supportedSBTs], // Create new array to avoid read-only error
        nodeType: currentProfile.nodeType,
        paymasterAddress: currentProfile.paymasterAddress,
        community: currentProfile.community,
        registeredAt: currentProfile.registeredAt,
        lastUpdatedAt: currentProfile.lastUpdatedAt,
        isActive: currentProfile.isActive,
        allowPermissionlessMint: currentProfile.allowPermissionlessMint,
      };

      const tx = await registry.updateCommunityProfile(updatedProfile);
      setRegistryTxHash(tx.hash);
      setRegistryUpdateStatus("等待确认...");

      console.log("Waiting for Registry update confirmation...");
      await tx.wait();

      console.log("Registry update successful!");
      setRegistryUpdateStatus("Registry 更新成功!");
      return true;
    } catch (err) {
      console.error("Registry update failed:", err);
      setRegistryUpdateStatus(`更新失败: ${err instanceof Error ? err.message : "Unknown error"}`);
      return false;
    } finally {
      setIsUpdatingRegistry(false);
    }
  };

  // Bind existing token to community
  const handleBindToken = async () => {
    if (!existingToken) {
      setError("No token found to bind");
      return;
    }

    const success = await updateRegistryWithToken(existingToken);

    if (success) {
      // Refresh community info to show updated binding
      await checkRegistryInfo(account);
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

      if (paymasterMode === "AOA" && paymasterAddress && !ethers.isAddress(paymasterAddress)) {
        throw new Error("Invalid paymaster address");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        xPNTsFactoryABI,
        signer
      );

      // Calculate exchangeRate in wei (1 = 1e18)
      const exchangeRateWei = ethers.parseEther(exchangeRate || "1");

      // Determine paymaster address based on mode
      const paymasterAddr = paymasterMode === "AOA+"
        ? ethers.ZeroAddress
        : (paymasterAddress || ethers.ZeroAddress);

      console.log("Deploying xPNTs token...");
      console.log("Mode:", paymasterMode);
      console.log("Paymaster:", paymasterAddr);
      console.log("Exchange Rate:", exchangeRate, "->", exchangeRateWei.toString());

      // Deploy xPNTs token with community info from Registry (or manual input if not registered)
      const tx = await factory.deployxPNTsToken(
        tokenName,
        tokenSymbol,
        communityName || tokenName,  // Use Registry community name or fallback to token name
        communityENS || "",          // Use Registry ENS or empty
        exchangeRateWei,
        paymasterAddr
      );
      setDeployTxHash(tx.hash);

      console.log("Waiting for confirmation...");
      await tx.wait();

      console.log("Deployment successful!");

      // Get the deployed token address
      const factoryReader = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        xPNTsFactoryABI,
        new ethers.JsonRpcProvider(RPC_URL)
      );
      const deployedTokenAddress = await factoryReader.getTokenAddress(account);
      console.log("Deployed xPNTs token address:", deployedTokenAddress);

      // Reload to get new token info
      await checkExistingToken(account);

      // Auto-update Registry if community is registered
      console.log("Attempting to update Registry...");
      const registryUpdated = await updateRegistryWithToken(deployedTokenAddress);

      if (registryUpdated) {
        console.log("Registry updated successfully with xPNTs token");
      } else if (registryUpdateStatus === "未注册社区") {
        console.log("Community not registered - user can register later at /register-community");
      }
    } catch (err) {
      console.error("Deployment failed:", err);
      setError(err instanceof Error ? err.message : "Failed to deploy xPNTs token");
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
          checkRegistryInfo(accounts[0]);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="get-xpnts-page">
      <div className="get-xpnts-container">
        {/* Header */}
        <div className="get-xpnts-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="header-content">
            <div>
              <h1>Get xPNTs Token</h1>
              <p className="subtitle">
                Deploy your community points token with auto-approval
              </p>
            </div>
            <a href="/operator/wizard" className="wizard-link">
              🚀 Launch Wizard
            </a>
          </div>
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

                  {/* Token Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div className="info-row">
                      <span className="label">Token Name:</span>
                      <span className="value">{tokenName || "Loading..."}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Symbol:</span>
                      <span className="value">{tokenSymbol || "Loading..."}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Contract Address:</span>
                      <span className="value mono" style={{ fontSize: "0.9rem" }}>{existingToken}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Decimals:</span>
                      <span className="value">{tokenDecimals}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Total Supply:</span>
                      <span className="value">{tokenTotalSupply ? `${tokenTotalSupply} ${tokenSymbol}` : "Loading..."}</span>
                    </div>
                    {tokenCreatedAt && (
                      <div className="info-row">
                        <span className="label">Deployed:</span>
                        <span className="value">{new Date(tokenCreatedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Community Binding Status */}
                  {isRegistered && (
                    <div style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      backgroundColor: isTokenBound ? "#d4edda" : "#fff3cd",
                      border: `2px solid ${isTokenBound ? "#28a745" : "#ffc107"}`,
                      marginBottom: "1rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>{isTokenBound ? "✅" : "⚠️"}</span>
                        <strong>{isTokenBound ? "Token Bound to Community" : "Token Not Bound"}</strong>
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#666" }}>
                        <div>Community: {communityName}</div>
                        {isTokenBound && communityXPNTsToken && (
                          <div className="mono" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                            Bound Address: {communityXPNTsToken.slice(0, 10)}...{communityXPNTsToken.slice(-8)}
                          </div>
                        )}
                        {!isTokenBound && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <button
                              className="action-button primary"
                              onClick={handleBindToken}
                              disabled={isUpdatingRegistry}
                              style={{ width: "100%", padding: "0.5rem" }}
                            >
                              {isUpdatingRegistry ? "Binding..." : "Bind Token to Community"}
                            </button>
                            {registryUpdateStatus && (
                              <div style={{
                                marginTop: "0.5rem",
                                fontSize: "0.85rem",
                                color: registryUpdateStatus.includes("成功") ? "#28a745" : "#dc3545"
                              }}>
                                {registryUpdateStatus}
                                {registryTxHash && (
                                  <a
                                    href={`https://sepolia.etherscan.io/tx/${registryTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "block", marginTop: "0.25rem" }}
                                  >
                                    View TX →
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isRegistered && (
                    <div style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      backgroundColor: "#f8f9fa",
                      border: "2px solid #dee2e6",
                      marginBottom: "1rem",
                      fontSize: "0.9rem",
                      color: "#666"
                    }}>
                      ℹ️ Register as a community to bind this token
                    </div>
                  )}

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

                    {/* Community Name - Read-only if registered */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Community Name {isRegistered && <span style={{ color: "#10b981" }}>(从 Registry 自动读取)</span>}
                      </label>
                      <input
                        type="text"
                        value={communityName}
                        onChange={(e) => setCommunityName(e.target.value)}
                        placeholder={isRegistered ? "" : "e.g., My Community"}
                        disabled={isRegistered}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: isRegistered ? "2px solid #10b981" : "2px solid #e5e7eb",
                          fontSize: "1rem",
                          background: isRegistered ? "#f0fdf4" : "#ffffff",
                          color: isRegistered ? "#065f46" : "#000000",
                          cursor: isRegistered ? "not-allowed" : "text",
                        }}
                      />
                      {!isRegistered && (
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#f59e0b" }}>
                          💡 建议先到 <a href="/register-community" style={{ color: "#f59e0b", textDecoration: "underline" }}>注册社区页面</a> 注册，可自动填充此字段
                        </p>
                      )}
                    </div>

                    {/* Community ENS - Read-only if registered */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Community ENS (可选) {isRegistered && <span style={{ color: "#10b981" }}>(从 Registry 自动读取)</span>}
                      </label>
                      <input
                        type="text"
                        value={communityENS}
                        onChange={(e) => setCommunityENS(e.target.value)}
                        placeholder={isRegistered ? "" : "e.g., mycommunity.aastar.eth"}
                        disabled={isRegistered}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          border: isRegistered ? "2px solid #10b981" : "2px solid #e5e7eb",
                          fontSize: "1rem",
                          background: isRegistered ? "#f0fdf4" : "#ffffff",
                          color: isRegistered ? "#065f46" : "#000000",
                          cursor: isRegistered ? "not-allowed" : "text",
                        }}
                      />
                      {!isRegistered && (
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                          留空将使用社区名称自动分配（如：{communityName || tokenName}.aastar.eth）
                        </p>
                      )}
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                        Paymaster Mode
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
                          : "可选：使用自己的PaymasterV4合约，留空使用零地址"}
                      </p>
                    </div>

                    {paymasterMode === "AOA" && (
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#374151" }}>
                          Paymaster Address (可选)
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
                          输入你已部署的PaymasterV4合约地址，留空将使用零地址
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
                      !tokenSymbol
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

                  {/* Registry Update Status */}
                  {registryUpdateStatus && (
                    <div style={{
                      padding: '12px',
                      marginTop: '12px',
                      borderRadius: '8px',
                      background: registryUpdateStatus.includes('成功') ? '#d1fae5' :
                                 registryUpdateStatus.includes('失败') ? '#fee2e2' :
                                 registryUpdateStatus === '未注册社区' ? '#fef3c7' : '#e0e7ff',
                      border: `1px solid ${
                        registryUpdateStatus.includes('成功') ? '#10b981' :
                        registryUpdateStatus.includes('失败') ? '#ef4444' :
                        registryUpdateStatus === '未注册社区' ? '#f59e0b' : '#6366f1'
                      }`,
                      color: registryUpdateStatus.includes('成功') ? '#065f46' :
                             registryUpdateStatus.includes('失败') ? '#7f1d1d' :
                             registryUpdateStatus === '未注册社区' ? '#78350f' : '#3730a3'
                    }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9em' }}>
                        {registryUpdateStatus.includes('成功') && '✅ '}
                        {registryUpdateStatus.includes('失败') && '❌ '}
                        {registryUpdateStatus === '未注册社区' && '⚠️ '}
                        Registry 更新: {registryUpdateStatus}
                      </p>
                      {registryUpdateStatus === '未注册社区' && (
                        <p style={{ margin: '8px 0 0', fontSize: '0.85em' }}>
                          💡 您可以稍后在 <a href="/register-community" style={{ color: '#f59e0b', textDecoration: 'underline' }}>注册社区页面</a> 注册后自动绑定 xPNTs Token
                        </p>
                      )}
                      {registryTxHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${registryTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            color: 'inherit',
                            textDecoration: 'underline',
                            fontSize: '0.85em'
                          }}
                        >
                          View Registry Update TX →
                        </a>
                      )}
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
            Bind MySBT Token
          </a>
          <button className="action-button secondary" onClick={() => navigate(-1)}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
