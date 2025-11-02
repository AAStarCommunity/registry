import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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

  // Log contract addresses on mount
  useEffect(() => {
    console.log('=== Contract Addresses ===');
    console.log('Registry:', REGISTRY_ADDRESS);
    console.log('GToken:', GTOKEN_ADDRESS);
    console.log('GTokenStaking:', GTOKEN_STAKING_ADDRESS);
    console.log('Network:', networkConfig.chainName);
    console.log('========================');
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError(t('registerCommunity.errors.walletNotConnected'));
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
      console.error(t('registerCommunity.errors.walletNotConnected'), err);
      setError(err?.message || t('registerCommunity.errors.walletNotConnected'));
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
        setError(t('registerCommunity.errors.alreadyRegistered', { name: community.name }));
      }
    } catch (err) {
      console.error(t('registerCommunity.console.checking'), err);
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
      console.error(t('registerCommunity.errors.stakeAmountRequired'), err);
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
      console.error(t('common.loading'), err);
    }
  };

  // Register community
  const handleRegisterCommunity = async () => {
    setIsRegistering(true);
    setError("");
    setRegisterTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error(t('registerCommunity.errors.walletNotConnected'));
      }

      if (!communityName) {
        throw new Error(t('registerCommunity.errors.communityNameRequired'));
      }

      // Validate stake amount (minimum 30 GToken for both modes)
      const stakeAmountNum = parseFloat(stakeAmount || "0");
      if (stakeAmountNum < 30) {
        throw new Error(t('registerCommunity.form.stakeAmountHint') + ': 30 GToken');
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

        console.log(t('registerCommunity.console.currentBalance'), userBalanceNum);

        if (userBalanceNum < stakeAmountNum) {
          throw new Error(t('registerCommunity.errors.insufficientBalance', { required: stakeAmountNum, current: userBalanceNum.toFixed(2) }));
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
        console.log(t('registerCommunity.balance.gtoken') + ':', ethers.formatEther(userGTokenBalance));

        // Check if user has enough AVAILABLE (unlocked) staked balance
        const availableBalance = await staking.availableBalance(account);
        const needToStake = gTokenAmount > availableBalance ? gTokenAmount - availableBalance : 0n;

        console.log(t('registerCommunity.console.checkingStaking'),
          t('registerCommunity.console.stakeStatus'), ethers.formatEther(gTokenAmount),
          t('registerCommunity.console.available'), ethers.formatEther(availableBalance),
          t('registerCommunity.console.needToStake'), ethers.formatEther(needToStake));

        if (needToStake > 0n) {
          // Check if user has enough GToken to stake
          if (userGTokenBalance < needToStake) {
            throw new Error(t('registerCommunity.errors.insufficientToStake', { need: ethers.formatEther(needToStake), current: ethers.formatEther(userGTokenBalance) }));
          }

          // Check and approve GToken if needed
          const currentAllowance = await gToken.allowance(account, GTOKEN_STAKING_ADDRESS);
          if (currentAllowance < needToStake) {
            console.log(t('registerCommunity.console.approving'), ethers.formatEther(needToStake), 'GToken...');
            const approveTx = await gToken.approve(GTOKEN_STAKING_ADDRESS, needToStake);
            await approveTx.wait();
            console.log(t('registerCommunity.console.approved'));
          }

          // Stake GToken
          console.log(t('registerCommunity.console.staking'), ethers.formatEther(needToStake), 'GToken...');
          const stakeTx = await staking.stake(needToStake);
          await stakeTx.wait();
          console.log(t('registerCommunity.console.staked'));

          // Verify available balance after staking
          const newAvailableBalance = await staking.availableBalance(account);
          console.log(t('registerCommunity.console.availableAfterStake'), ethers.formatEther(newAvailableBalance));
          if (newAvailableBalance < gTokenAmount) {
            throw new Error(t('registerCommunity.errors.insufficientAfterStake', { expected: ethers.formatEther(gTokenAmount), actual: ethers.formatEther(newAvailableBalance) }));
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
      console.log(t('registerCommunity.console.registered'), receipt.hash);

      // Success - show confirmation
      alert(t('registerCommunity.button.register') + ' ' + t('registerCommunity.success.title'));
      navigate("/explorer");
    } catch (err: any) {
      console.error(t('registerCommunity.errors.registrationFailed'), err);
      setError(err?.message || t('registerCommunity.errors.registrationFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="register-community-page">
      <div className="register-community-container">
        <div className="register-community-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← {t('common.back')}
          </button>
          <div className="header-content">
            <div>
              <h1>{t('registerCommunity.title')}</h1>
              <p className="subtitle">
                {t('registerCommunity.subtitle')}
              </p>
            </div>
            <a href="/operator/wizard" className="wizard-link">
              {t('header.launchPaymaster')}
            </a>
          </div>
        </div>

        <div className="form-container">
        {!account ? (
          <div className="connect-section">
            <button className="connect-btn" onClick={connectWallet}>
              {t('registerCommunity.connectWallet')}
            </button>
          </div>
        ) : existingCommunity ? (
          <div className="error-box">
            <p>{error}</p>
            <button onClick={() => navigate("/explorer")}>{t('header.explorer')}</button>
          </div>
        ) : (
          <div className="registration-form">
            <div className="wallet-info">
              <p>
                <strong>{t('step1.substep3.walletConnected')}:</strong> {account.slice(0, 6)}...{account.slice(-4)}
              </p>
              {GTOKEN_ADDRESS && GTOKEN_ADDRESS !== "0x0" && (
                <>
                  <p>
                    <strong>GToken Contract:</strong>{' '}
                    <a
                      href={`${networkConfig.explorerUrl}/address/${GTOKEN_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196f3', textDecoration: 'underline', fontFamily: 'monospace', fontSize: '0.9em' }}
                    >
                      {GTOKEN_ADDRESS}
                    </a>
                  </p>
                  <p>
                    <strong>{t('registerCommunity.balance.gtoken')}:</strong> {parseFloat(gTokenBalance).toFixed(2)} GToken
                  </p>
                </>
              )}
            </div>

            <div className="form-section">
              <h2>{t('step2ResourceCheck.summary.title')}</h2>

              <div className="warning-box" style={{ marginBottom: '16px', padding: '12px', background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '4px' }}>
                <strong>ℹ️ Registry v2.1.4</strong>
              </div>

              <div className="form-group">
                <label>
                  {t('registerCommunity.form.communityName')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('registerCommunity.form.communityNamePlaceholder')}
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>ENS</label>
                <input
                  type="text"
                  placeholder="aastar.eth"
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="form-section">
              <h2>Token</h2>

              <div className="form-group">
                <label>xPNTs Token</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={xPNTsToken}
                  onChange={(e) => setXPNTsToken(e.target.value)}
                />
                <small>{t('step2ResourceCheck.resources.xpnts.notDeployed')}</small>
              </div>
            </div>

            <div className="form-section">
              <h2>Paymaster</h2>

              <div className="form-group">
                <label>Paymaster</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="AOA"
                      checked={mode === "AOA"}
                      onChange={(e) => setMode(e.target.value as "AOA" | "SUPER")}
                    />
                    <span>AOA</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="SUPER"
                      checked={mode === "SUPER"}
                      onChange={(e) => setMode(e.target.value as "AOA" | "SUPER")}
                    />
                    <span>SUPER (SuperPaymaster V2)</span>
                  </label>
                </div>
              </div>


              <div className="form-group">
                <label>
                  {t('registerCommunity.form.stakeAmount')}
                  {mode === "AOA" && <span className="required">*</span>}
                </label>
                <input
                  type="number"
                  placeholder={t('registerCommunity.form.stakeAmountPlaceholder')}
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="30"
                  step="0.01"
                />
                {mode === "AOA" && (
                  <small className="required">
                    {t('registerCommunity.form.stakeAmountHint')}: 30 GToken
                  </small>
                )}
                {mode === "SUPER" && (
                  <small className="helper-text">
                    {t('registerCommunity.form.stakeAmountHint')}: 30 GToken
                  </small>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2>MySBT</h2>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowPermissionlessMint}
                    onChange={(e) => setAllowPermissionlessMint(e.target.checked)}
                  />
                  <span>{t('registerCommunity.form.allowPermissionlessMint')}</span>
                </label>
                <small>{t('registerCommunity.form.allowPermissionlessMintHint')}</small>
                {!allowPermissionlessMint && (
                  <div className="warning-box" style={{ marginTop: '8px', padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
                    {t('registerCommunity.form.permissionlessMintWarning')}
                  </div>
                )}
              </div>
            </div>

            {/* Balance check warning */}
            {parseFloat(gTokenBalance) < parseFloat(stakeAmount || "30") && (
              <div className="error-box" style={{ marginTop: '16px' }}>
                <p><strong>{t('registerCommunity.insufficientBalance.title')}</strong></p>
                <p>{t('registerCommunity.insufficientBalance.required')} {stakeAmount || "30"} GToken</p>
                <p>{t('registerCommunity.insufficientBalance.current')} {parseFloat(gTokenBalance).toFixed(2)} GToken</p>
                <p style={{ marginTop: '8px' }}>
                  {t('registerCommunity.insufficientBalance.message')}
                  <br />
                  <Link to="/get-gtoken" style={{ color: '#2196f3', textDecoration: 'underline' }}>
                    {t('registerCommunity.insufficientBalance.linkText')}
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
                <p>{t('registerCommunity.success.title')}</p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${registerTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('registerCommunity.success.viewTx')}
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
                {isRegistering ? t('registerCommunity.button.registering') : t('registerCommunity.button.register')}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
