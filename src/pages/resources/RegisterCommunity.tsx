import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import "./RegisterCommunity.css";

// Registry ABI (CommunityProfile struct fields)
const REGISTRY_ABI = [
  "function registerCommunity(tuple(string name, string ensName, string description, string website, string logoURI, string twitterHandle, string githubOrg, string telegramGroup, address xPNTsToken, address[] supportedSBTs, uint8 mode, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, uint256 memberCount, bool allowPermissionlessMint) profile, uint256 stGTokenAmount) external",
  "function communities(address) external view returns (tuple(string name, string ensName, string description, string website, string logoURI, string twitterHandle, string githubOrg, string telegramGroup, address xPNTsToken, address[] supportedSBTs, uint8 mode, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, uint256 memberCount, bool allowPermissionlessMint))",
  "function nodeTypeConfigs(uint8) external view returns (uint256 minStake, uint256 slashThreshold, uint256 slashBase, uint256 slashIncrement, uint256 slashMax)",
];

// GTokenStaking ABI
const GTOKEN_STAKING_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

export function RegisterCommunity() {
  const navigate = useNavigate();

  // Get addresses from config with env overrides
  const networkConfig = getCurrentNetworkConfig();
  const REGISTRY_ADDRESS =
    import.meta.env.VITE_REGISTRY_ADDRESS ||
    networkConfig.contracts.registryV2_1; // Registry v2.1
  const GTOKEN_STAKING_ADDRESS =
    import.meta.env.VITE_GTOKEN_STAKING_ADDRESS ||
    networkConfig.contracts.gTokenStaking;
  const RPC_URL = getRpcUrl();

  // Wallet state
  const [account, setAccount] = useState<string>("");

  // Registration form state
  const [communityName, setCommunityName] = useState<string>("");
  const [ensName, setEnsName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [logoURI, setLogoURI] = useState<string>("");
  const [twitterHandle, setTwitterHandle] = useState<string>("");
  const [githubOrg, setGithubOrg] = useState<string>("");
  const [telegramGroup, setTelegramGroup] = useState<string>("");
  const [xPNTsToken, setXPNTsToken] = useState<string>("");
  const [paymasterAddress, setPaymasterAddress] = useState<string>("");
  const [mode, setMode] = useState<"AOA" | "SUPER">("AOA");
  const [stakeAmount, setStakeAmount] = useState<string>("0");
  const [allowPermissionlessMint, setAllowPermissionlessMint] = useState<boolean>(true);

  // UI state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerTxHash, setRegisterTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [minStake, setMinStake] = useState<string>("0");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");
  const [existingCommunity, setExistingCommunity] = useState<boolean>(false);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("请安装 MetaMask 来使用此功能");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      await checkExistingCommunity(accounts[0]);
      await loadMinStake();
      await loadGTokenBalance(accounts[0]);
    } catch (err: any) {
      console.error("钱包连接失败:", err);
      setError(err?.message || "连接钱包失败");
    }
  };

  // Check if community already registered
  const checkExistingCommunity = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        rpcProvider
      );

      const community = await registry.communities(address);
      if (community.registeredAt !== 0n) {
        setExistingCommunity(true);
        setError("该地址已注册社区");
      }
    } catch (err) {
      console.error("检查现有社区失败:", err);
    }
  };

  // Load minimum stake requirement for AOA mode
  const loadMinStake = async () => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        rpcProvider
      );

      // NodeType.PAYMASTER_AOA = 0
      const config = await registry.nodeTypeConfigs(0);
      setMinStake(ethers.formatEther(config.minStake));
    } catch (err) {
      console.error("加载最小质押要求失败:", err);
    }
  };

  // Load user's GToken balance
  const loadGTokenBalance = async (address: string) => {
    try {
      if (!GTOKEN_STAKING_ADDRESS || GTOKEN_STAKING_ADDRESS === "0x0") {
        return;
      }

      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const staking = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTOKEN_STAKING_ABI,
        rpcProvider
      );

      const balance = await staking.balanceOf(address);
      setGTokenBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("加载 GToken 余额失败:", err);
    }
  };

  // Register community
  const handleRegisterCommunity = async () => {
    setIsRegistering(true);
    setError("");
    setRegisterTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask 未安装");
      }

      if (!communityName) {
        throw new Error("请输入社区名称");
      }

      // Paymaster address is now optional for AOA mode

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Prepare CommunityProfile
      const profile = {
        name: communityName,
        ensName: ensName || "",
        description: description || "",
        website: website || "",
        logoURI: logoURI || "",
        twitterHandle: twitterHandle || "",
        githubOrg: githubOrg || "",
        telegramGroup: telegramGroup || "",
        xPNTsToken: xPNTsToken || ethers.ZeroAddress,
        supportedSBTs: [], // Empty for now
        mode: mode === "AOA" ? 0 : 1, // PaymasterMode: INDEPENDENT=0, SUPER=1
        nodeType: mode === "AOA" ? 0 : 1, // NodeType: PAYMASTER_AOA=0, PAYMASTER_SUPER=1
        paymasterAddress: paymasterAddress || ethers.ZeroAddress,
        community: account,
        registeredAt: 0,
        lastUpdatedAt: 0,
        isActive: true,
        memberCount: 0,
        allowPermissionlessMint: allowPermissionlessMint,
      };

      const gTokenAmount = ethers.parseEther(stakeAmount || "0");

      // Approve GToken if needed
      if (gTokenAmount > 0n && GTOKEN_STAKING_ADDRESS !== "0x0") {
        const staking = new ethers.Contract(
          GTOKEN_STAKING_ADDRESS,
          GTOKEN_STAKING_ABI,
          signer
        );
        const approveTx = await staking.approve(REGISTRY_ADDRESS, gTokenAmount);
        await approveTx.wait();
      }

      // Register community
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        REGISTRY_ABI,
        signer
      );

      const tx = await registry.registerCommunity(profile, gTokenAmount);
      setRegisterTxHash(tx.hash);

      const receipt = await tx.wait();
      console.log("社区注册成功:", receipt);

      // Success - show confirmation
      alert("社区注册成功！");
      navigate("/explorer");
    } catch (err: any) {
      console.error("社区注册失败:", err);
      setError(err?.message || "注册失败");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="register-community-page">
      <div className="hero-section">
        <h1>注册社区</h1>
        <p className="subtitle">
          在 SuperPaymaster Registry 上注册您的社区，获得去中心化身份和服务
        </p>
      </div>

      <div className="form-container">
        {!account ? (
          <div className="connect-section">
            <button className="connect-btn" onClick={connectWallet}>
              连接钱包
            </button>
          </div>
        ) : existingCommunity ? (
          <div className="error-box">
            <p>该地址已注册社区，无法重复注册。</p>
            <button onClick={() => navigate("/explorer")}>查看社区列表</button>
          </div>
        ) : (
          <div className="registration-form">
            <div className="wallet-info">
              <p>
                <strong>已连接:</strong> {account.slice(0, 6)}...{account.slice(-4)}
              </p>
              {GTOKEN_STAKING_ADDRESS !== "0x0" && (
                <p>
                  <strong>GToken 余额:</strong> {parseFloat(gTokenBalance).toFixed(2)} GToken
                </p>
              )}
            </div>

            <div className="form-section">
              <h2>基本信息</h2>

              <div className="form-group">
                <label>
                  社区名称 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: AAStar"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>ENS 域名</label>
                <input
                  type="text"
                  placeholder="例如: aastar.eth"
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label>社区描述</label>
                <textarea
                  placeholder="简要描述您的社区..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label>官网</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label>Logo URI</label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoURI}
                  onChange={(e) => setLogoURI(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="form-section">
              <h2>社交链接</h2>

              <div className="form-group">
                <label>Twitter</label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label>GitHub 组织</label>
                <input
                  type="text"
                  placeholder="organization-name"
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label>Telegram 群组</label>
                <input
                  type="text"
                  placeholder="https://t.me/group"
                  value={telegramGroup}
                  onChange={(e) => setTelegramGroup(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="form-section">
              <h2>Token 配置</h2>

              <div className="form-group">
                <label>xPNTs Token 地址</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={xPNTsToken}
                  onChange={(e) => setXPNTsToken(e.target.value)}
                />
                <small>可选，如果已部署社区 xPNTs token</small>
              </div>
            </div>

            <div className="form-section">
              <h2>节点配置</h2>

              <div className="form-group">
                <label>Paymaster 模式</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="AOA"
                      checked={mode === "AOA"}
                      onChange={(e) => setMode(e.target.value as "AOA" | "SUPER")}
                    />
                    <span>AOA (独立 Paymaster)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="SUPER"
                      checked={mode === "SUPER"}
                      onChange={(e) => setMode(e.target.value as "AOA" | "SUPER")}
                    />
                    <span>SUPER (共享 SuperPaymaster V2)</span>
                  </label>
                </div>
              </div>

              {mode === "AOA" && (
                <div className="form-group">
                  <label>Paymaster 地址</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={paymasterAddress}
                    onChange={(e) => setPaymasterAddress(e.target.value)}
                  />
                  <small>可选，您的独立 Paymaster 合约地址</small>
                </div>
              )}

              <div className="form-group">
                <label>质押数量 (GToken)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                {mode === "AOA" && (
                  <small className="required">
                    AOA 模式最低质押: {minStake} GToken
                  </small>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2>MySBT 配置</h2>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowPermissionlessMint}
                    onChange={(e) => setAllowPermissionlessMint(e.target.checked)}
                  />
                  <span>允许用户无许可铸造 MySBT</span>
                </label>
                <small>启用后，用户无需邀请即可铸造社区 MySBT</small>
                {!allowPermissionlessMint && (
                  <div className="warning-box" style={{ marginTop: '8px', padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
                    <strong>⚠️ 警告:</strong> 每个社区成员都需要你邀请、沟通并人工mint
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="error-box">
                <p>{error}</p>
              </div>
            )}

            {registerTxHash && (
              <div className="success-box">
                <p>交易已提交!</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看交易
                </a>
              </div>
            )}

            <div className="action-buttons">
              <button
                className="register-btn"
                onClick={handleRegisterCommunity}
                disabled={isRegistering || !communityName}
              >
                {isRegistering ? "注册中..." : "注册社区"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
