import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import "./RegisterCommunity.css";

// Registry ABI (CommunityProfile struct fields) - Registry v2.1.4 (11 fields with allowPermissionlessMint)
const REGISTRY_ABI = [
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint) profile, uint256 stGTokenAmount) external",
  "function communities(address) external view returns (tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint))",
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
  const GTOKEN_ADDRESS =
    import.meta.env.VITE_GTOKEN_ADDRESS ||
    networkConfig.contracts.gToken;
  const GTOKEN_STAKING_ADDRESS =
    import.meta.env.VITE_GTOKEN_STAKING_ADDRESS ||
    networkConfig.contracts.gTokenStaking;
  const RPC_URL = getRpcUrl();

  // Wallet state
  const [account, setAccount] = useState<string>("");

  // Registration form state (Registry v2.1.4 - 11 fields only)
  const [communityName, setCommunityName] = useState<string>("");
  const [ensName, setEnsName] = useState<string>("");
  const [xPNTsToken, setXPNTsToken] = useState<string>("");
  const [mode, setMode] = useState<"AOA" | "SUPER">("AOA");
  const [stakeAmount, setStakeAmount] = useState<string>("30");
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
      if (!GTOKEN_ADDRESS || GTOKEN_ADDRESS === "0x0") {
        return;
      }

      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const gToken = new ethers.Contract(
        GTOKEN_ADDRESS,
        ["function balanceOf(address account) external view returns (uint256)"],
        rpcProvider
      );

      const balance = await gToken.balanceOf(address);
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

      // Validate stake amount (minimum 30 GToken for both modes)
      const stakeAmountNum = parseFloat(stakeAmount || "0");
      if (stakeAmountNum < 30) {
        throw new Error("最低质押: 30 GToken");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check user's GToken balance BEFORE starting any transactions
      if (GTOKEN_ADDRESS && GTOKEN_ADDRESS !== "0x0") {
        const gToken = new ethers.Contract(
          GTOKEN_ADDRESS,
          ["function balanceOf(address) external view returns (uint256)"],
          provider
        );
        const userBalance = await gToken.balanceOf(account);
        const userBalanceNum = parseFloat(ethers.formatEther(userBalance));

        console.log(`当前 GToken 余额: ${userBalanceNum}`);

        if (userBalanceNum < stakeAmountNum) {
          throw new Error(`GToken 余额不足！\n需要: ${stakeAmountNum} GToken\n当前余额: ${userBalanceNum.toFixed(2)} GToken\n\n请先获取足够的 GToken 再注册社区。`);
        }
      }

      // Prepare CommunityProfile (Registry v2.1.4 format - 11 fields with allowPermissionlessMint)
      const profile = {
        name: communityName,
        ensName: ensName || "",
        xPNTsToken: xPNTsToken || ethers.ZeroAddress,
        supportedSBTs: [], // Empty for now
        nodeType: mode === "AOA" ? 0 : 1, // NodeType: PAYMASTER_AOA=0, PAYMASTER_SUPER=1
        paymasterAddress: ethers.ZeroAddress, // Paymaster address is optional, use ZeroAddress
        community: account,
        registeredAt: 0,
        lastUpdatedAt: 0,
        isActive: true,
        allowPermissionlessMint: allowPermissionlessMint, // User can set this
      };

      const gTokenAmount = ethers.parseEther(stakeAmount || "0");

      // Step 1: Approve GToken to GTokenStaking and stake
      if (gTokenAmount > 0n && GTOKEN_ADDRESS && GTOKEN_ADDRESS !== "0x0" && GTOKEN_STAKING_ADDRESS && GTOKEN_STAKING_ADDRESS !== "0x0") {
        const gToken = new ethers.Contract(
          GTOKEN_ADDRESS,
          ["function approve(address spender, uint256 amount) external returns (bool)", "function allowance(address owner, address spender) external view returns (uint256)", "function balanceOf(address) external view returns (uint256)"],
          signer
        );

        const staking = new ethers.Contract(
          GTOKEN_STAKING_ADDRESS,
          ["function stake(uint256 amount) external returns (uint256)", "function availableBalance(address user) external view returns (uint256)"],
          signer
        );

        // Check user's GToken balance first
        const userGTokenBalance = await gToken.balanceOf(account);
        console.log(`GToken 余额: ${ethers.formatEther(userGTokenBalance)}`);

        // Check if user has enough AVAILABLE (unlocked) staked balance
        const availableBalance = await staking.availableBalance(account);
        const needToStake = gTokenAmount > availableBalance ? gTokenAmount - availableBalance : 0n;

        console.log(`质押状态 - 需要: ${ethers.formatEther(gTokenAmount)}, 可用: ${ethers.formatEther(availableBalance)}, 需补充: ${ethers.formatEther(needToStake)}`);

        if (needToStake > 0n) {
          // Check if user has enough GToken to stake
          if (userGTokenBalance < needToStake) {
            throw new Error(`GToken 余额不足！需要质押 ${ethers.formatEther(needToStake)} GToken，但你只有 ${ethers.formatEther(userGTokenBalance)} GToken`);
          }

          // Check and approve GToken if needed
          const currentAllowance = await gToken.allowance(account, GTOKEN_STAKING_ADDRESS);
          if (currentAllowance < needToStake) {
            console.log(`授权 ${ethers.formatEther(needToStake)} GToken...`);
            const approveTx = await gToken.approve(GTOKEN_STAKING_ADDRESS, needToStake);
            await approveTx.wait();
            console.log("✅ 授权完成");
          }

          // Stake GToken
          console.log(`质押 ${ethers.formatEther(needToStake)} GToken...`);
          const stakeTx = await staking.stake(needToStake);
          await stakeTx.wait();
          console.log("✅ 质押完成");

          // Verify available balance after staking
          const newAvailableBalance = await staking.availableBalance(account);
          console.log(`质押后可用余额: ${ethers.formatEther(newAvailableBalance)}`);
          if (newAvailableBalance < gTokenAmount) {
            throw new Error(`质押后可用余额不足！期望 ${ethers.formatEther(gTokenAmount)} GToken，实际只有 ${ethers.formatEther(newAvailableBalance)} GToken`);
          }
        }
      }

      // Step 3: Register community (Registry will call GTokenStaking.lockStake internally)
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
      <div className="register-community-container">
        <div className="register-community-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="header-content">
            <div>
              <h1>注册社区</h1>
              <p className="subtitle">
                在 SuperPaymaster Registry 上注册您的社区，获得去中心化身份和服务
              </p>
            </div>
            <a href="/operator/wizard" className="wizard-link">
              🚀 Launch Wizard
            </a>
          </div>
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
              {GTOKEN_ADDRESS && GTOKEN_ADDRESS !== "0x0" && (
                <p>
                  <strong>GToken 余额:</strong> {parseFloat(gTokenBalance).toFixed(2)} GToken
                </p>
              )}
            </div>

            <div className="form-section">
              <h2>基本信息</h2>

              <div className="warning-box" style={{ marginBottom: '16px', padding: '12px', background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '4px' }}>
                <strong>ℹ️ Registry v2.1.4 优化说明:</strong> 为减小合约大小，description、website、logo、社交链接等字段已从链上移除，仅存储核心字段（name、ensName、xPNTs token）。
              </div>

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


              <div className="form-group">
                <label>
                  质押数量 (GToken)
                  {mode === "AOA" && <span className="required">*</span>}
                </label>
                <input
                  type="number"
                  placeholder="30"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="30"
                  step="0.01"
                />
                {mode === "AOA" && (
                  <small className="required">
                    最低质押: 30 GToken（可增加，不可低于 30）
                  </small>
                )}
                {mode === "SUPER" && (
                  <small className="helper-text">
                    最低质押: 30 GToken（可增加，不可低于 30）
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

            {/* Balance check warning */}
            {parseFloat(gTokenBalance) < parseFloat(stakeAmount || "30") && (
              <div className="error-box" style={{ marginTop: '16px' }}>
                <p><strong>❌ GToken 余额不足</strong></p>
                <p>需要质押: {stakeAmount || "30"} GToken</p>
                <p>当前余额: {parseFloat(gTokenBalance).toFixed(2)} GToken</p>
                <p style={{ marginTop: '8px' }}>
                  请先获取足够的 GToken 再注册社区。
                  <br />
                  <Link to="/get-gtoken" style={{ color: '#2196f3', textDecoration: 'underline' }}>
                    前往获取 GToken →
                  </Link>
                </p>
              </div>
            )}

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
                disabled={
                  isRegistering ||
                  !communityName ||
                  parseFloat(gTokenBalance) < parseFloat(stakeAmount || "30")
                }
              >
                {isRegistering ? "注册中..." : "注册社区"}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
