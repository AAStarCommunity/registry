import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import { RegistryV2_1_4ABI, xPNTsFactoryABI, PaymasterFactoryABI } from "../../config/abis";
import "./RegisterCommunity.css";

export function RegisterCommunity() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get addresses from shared-config
  const networkConfig = getCurrentNetworkConfig();
  const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1; // Registry v2.1.4
  const GTOKEN_ADDRESS = networkConfig.contracts.gToken;
  const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;
  const XPNTS_FACTORY_ADDRESS = networkConfig.contracts.xPNTsFactory;
  const MYSBT_ADDRESS = networkConfig.contracts.mySBT; // MySBT white-label SBT
  const PAYMASTER_FACTORY_ADDRESS = networkConfig.contracts.paymasterFactory;
  const RPC_URL = getRpcUrl();

  // Wallet state
  const [account, setAccount] = useState<string>("");

  // Registration form state (Registry v2.1.4 - 11 fields only)
  const [communityName, setCommunityName] = useState<string>("");
  const [ensName, setEnsName] = useState<string>("");
  const [xPNTsToken, setXPNTsToken] = useState<string>("");
  const [hasXPNTs, setHasXPNTs] = useState<boolean | null>(null); // null = not checked yet
  const [paymasterAddress, setPaymasterAddress] = useState<string>("");
  const [hasPaymaster, setHasPaymaster] = useState<boolean | null>(null); // null = not checked yet
  const [mode, setMode] = useState<"AOA" | "SUPER">("AOA");
  const [stakeAmount, setStakeAmount] = useState<string>("30");
  const [allowPermissionlessMint, setAllowPermissionlessMint] = useState<boolean>(true);

  // UI state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerTxHash, setRegisterTxHash] = useState<string>("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState<string>("");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");
  const [existingCommunity, setExistingCommunity] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Community list state
  const [communities, setCommunities] = useState<Array<{
    address: string;
    name: string;
    ensName: string;
    xPNTsToken: string;
    nodeType: number;
    paymasterAddress: string;
    registeredAt: number;
    isActive: boolean;
    allowPermissionlessMint: boolean;
  }>>([]);
  const [totalCommunities, setTotalCommunities] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loadingCommunities, setLoadingCommunities] = useState<boolean>(false);
  const communitiesPerPage = 4;

  // Copy address to clipboard
  const copyAddressToClipboard = async () => {
    if (account) {
      try {
        await navigator.clipboard.writeText(account);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000); // Reset after 2 seconds
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Log contract addresses on mount
  useEffect(() => {
    console.log('=== Contract Addresses ===');
    console.log('Registry:', REGISTRY_ADDRESS);
    console.log('GToken:', GTOKEN_ADDRESS);
    console.log('GTokenStaking:', GTOKEN_STAKING_ADDRESS);
    console.log('Network:', networkConfig.chainName);
    console.log('========================');
  }, []);

  // Fetch communities on mount
  useEffect(() => {
    fetchCommunities();
  }, []);

  // Fetch communities from registry
  const fetchCommunities = async () => {
    if (!window.ethereum) return;
    
    try {
      setLoadingCommunities(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registryContract = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_1_4ABI, provider);
      
      // Get total community count
      const count = await registryContract.getCommunityCount();
      setTotalCommunities(Number(count));
      
      // Fetch first 4 communities
      const communityAddresses = await registryContract.getCommunities(0, communitiesPerPage);
      
      // Fetch detailed community information for each address
      const communityData = await Promise.all(
        communityAddresses.map(async (address: string) => {
          try {
            const communityInfo = await registryContract.communities(address);
            return {
              address,
              name: communityInfo.name || 'Community ' + address.slice(0, 6) + '...' + address.slice(-4),
              ensName: communityInfo.ensName || '',
              xPNTsToken: communityInfo.xPNTsToken || '0x0000000000000000000000000000000000000000',
              nodeType: Number(communityInfo.nodeType),
              paymasterAddress: communityInfo.paymasterAddress || '0x0000000000000000000000000000000000000000',
              registeredAt: Number(communityInfo.registeredAt),
              isActive: communityInfo.isActive,
              allowPermissionlessMint: communityInfo.allowPermissionlessMint
            };
          } catch (err) {
            console.error(`Error fetching community ${address}:`, err);
            return {
              address,
              name: 'Community ' + address.slice(0, 6) + '...' + address.slice(-4),
              ensName: '',
              xPNTsToken: '0x0000000000000000000000000000000000000000',
              nodeType: 0,
              paymasterAddress: '0x0000000000000000000000000000000000000000',
              registeredAt: Date.now() / 1000,
              isActive: true,
              allowPermissionlessMint: false
            };
          }
        })
      );
      
      setCommunities(communityData);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoadingCommunities(false);
    }
  };

  // Load more communities
  const loadMoreCommunities = async () => {
    if (!window.ethereum) return;
    
    try {
      setLoadingCommunities(true);
      const nextPage = currentPage + 1;
      const offset = nextPage * communitiesPerPage;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registryContract = new ethers.Contract(REGISTRY_ADDRESS, RegistryV2_1_4ABI, provider);
      
      const communityAddresses = await registryContract.getCommunities(offset, communitiesPerPage);
      
      // Fetch detailed community information for each address
      const communityData = await Promise.all(
        communityAddresses.map(async (address: string) => {
          try {
            const communityInfo = await registryContract.communities(address);
            return {
              address,
              name: communityInfo.name || 'Community ' + address.slice(0, 6) + '...' + address.slice(-4),
              ensName: communityInfo.ensName || '',
              xPNTsToken: communityInfo.xPNTsToken || '0x0000000000000000000000000000000000000000',
              nodeType: Number(communityInfo.nodeType),
              paymasterAddress: communityInfo.paymasterAddress || '0x0000000000000000000000000000000000000000',
              registeredAt: Number(communityInfo.registeredAt),
              isActive: communityInfo.isActive,
              allowPermissionlessMint: communityInfo.allowPermissionlessMint
            };
          } catch (err) {
            console.error(`Error fetching community ${address}:`, err);
            return {
              address,
              name: 'Community ' + address.slice(0, 6) + '...' + address.slice(-4),
              ensName: '',
              xPNTsToken: '0x0000000000000000000000000000000000000000',
              nodeType: 0,
              paymasterAddress: '0x0000000000000000000000000000000000000000',
              registeredAt: Date.now() / 1000,
              isActive: true,
              allowPermissionlessMint: false
            };
          }
        })
      );
      
      setCommunities(prev => [...prev, ...communityData]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more communities:', error);
    } finally {
      setLoadingCommunities(false);
    }
  };

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
      await checkXPNTsStatus(accounts[0]);
      await checkPaymasterStatus(accounts[0]);
      await loadGTokenBalance(accounts[0]);
    } catch (err: unknown) {
      console.error(t('registerCommunity.errors.walletNotConnected'), err);
      setError(err instanceof Error ? err.message : t('registerCommunity.errors.walletNotConnected'));
    }
  };

  // Check if community already registered
  const checkExistingCommunity = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        RegistryV2_1_4ABI,
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

  // Check if user has deployed xPNTs token
  const checkXPNTsStatus = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        xPNTsFactoryABI,
        rpcProvider
      );

      const hasToken = await factory.hasToken(address);
      setHasXPNTs(hasToken);

      if (hasToken) {
        const tokenAddress = await factory.getTokenAddress(address);
        setXPNTsToken(tokenAddress);
        console.log('Detected xPNTs token:', tokenAddress);
      } else {
        console.log('No xPNTs token detected for this address');
      }
    } catch (err) {
      console.error('Failed to check xPNTs status:', err);
      setHasXPNTs(false);
    }
  };

  // Check if user has deployed Paymaster
  const checkPaymasterStatus = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const factory = new ethers.Contract(
        PAYMASTER_FACTORY_ADDRESS,
        PaymasterFactoryABI,
        rpcProvider
      );

      const hasPaymaster = await factory.hasPaymaster(address);
      setHasPaymaster(hasPaymaster);

      if (hasPaymaster) {
        const paymasterAddr = await factory.getPaymasterByOperator(address);
        setPaymasterAddress(paymasterAddr);
        console.log('Detected Paymaster:', paymasterAddr);
      } else {
        console.log('No Paymaster detected for this address');
      }
    } catch (err) {
      console.error('Failed to check Paymaster status:', err);
      setHasPaymaster(false);
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

      // Prepare CommunityProfile (Registry v2.1.4 format - 11 fields with supportedSBTs)
      const profile = {
        name: communityName,
        ensName: ensName || "",
        xPNTsToken: xPNTsToken || ethers.ZeroAddress,
        supportedSBTs: [MYSBT_ADDRESS], // Automatically use AAstar MySBT white-label SBT
        nodeType: mode === "AOA" ? 0 : 1, // NodeType: PAYMASTER_AOA=0, PAYMASTER_SUPER=1
        paymasterAddress: paymasterAddress || ethers.ZeroAddress, // Use detected Paymaster or ZeroAddress
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

      // IMPORTANT: Wait for blockchain state to sync before calling Registry
      // Re-verify available balance right before registerCommunity to ensure state is synced
      console.log(t('registerCommunity.console.verifyingBalanceBeforeRegister'));
      const finalAvailableBalance = await staking.availableBalance(account);
      console.log(t('registerCommunity.console.finalAvailableBalance'), ethers.formatEther(finalAvailableBalance));

      if (finalAvailableBalance < gTokenAmount) {
        throw new Error(
          t('registerCommunity.errors.stateNotSynced', {
            expected: ethers.formatEther(gTokenAmount),
            actual: ethers.formatEther(finalAvailableBalance)
          }) + ' Please wait a moment and try again.'
        );
      }

      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        RegistryV2_1_4ABI,
        signer
      );

      // Use manual gasLimit to skip estimateGas which might see stale state
      // This prevents the "InsufficientStake" error during gas estimation
      const tx = await registry.registerCommunity(profile, gTokenAmount, {
        gasLimit: 500000 // Manual gas limit to bypass estimateGas
      });
      setRegisterTxHash(tx.hash);

      const receipt = await tx.wait();
      console.log(t('registerCommunity.console.registered'), receipt.hash);

      // Success - show success UI with links
      setRegistrationSuccess(true);
    } catch (err: unknown) {
      console.error(t('registerCommunity.errors.registrationFailed'), err);
      setError(err instanceof Error ? err.message : t('registerCommunity.errors.registrationFailed'));
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

        {/* Registry Info Banner */}
        <div className="registry-info-banner">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <strong>Registry Contract:</strong>{' '}
            <a
              href={`${networkConfig.explorerUrl}/address/${REGISTRY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="registry-link"
            >
              {REGISTRY_ADDRESS}
            </a>
            <span className="network-badge">{networkConfig.chainName}</span>
          </div>
        </div>

        <div className="form-container">
        {!account ? (
          <div className="connect-section">
            <button className="connect-btn" onClick={connectWallet}>
              {t('registerCommunity.connectWallet')}
            </button>
          </div>
        ) : registrationSuccess ? (
          <div className="success-box">
            <div className="success-header">
              <h2>🎉 {t('registerCommunity.success.title')}</h2>
              <p>{t('registerCommunity.success.message')}</p>
              {registerTxHash && (
                <p className="tx-hash">
                  <strong>{t('registerCommunity.success.txHash')}:</strong>{' '}
                  <a
                    href={`${networkConfig.explorerUrl}/tx/${registerTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {registerTxHash.slice(0, 10)}...{registerTxHash.slice(-8)}
                  </a>
                </p>
              )}
            </div>

            <div className="success-actions">
              <button
                className="primary-btn"
                onClick={() => navigate(`/explorer/community/${account}`)}
              >
                🔍 {t('registerCommunity.success.viewInExplorer')}
              </button>

              <button
                className="secondary-btn"
                onClick={() => navigate('/operator/wizard')}
              >
                ← {t('registerCommunity.success.backToWizard')}
              </button>
            </div>
          </div>
        ) : existingCommunity ? (
          <div className="error-box">
            <p>{error}</p>
            <button onClick={() => navigate(`/explorer/community/${account}`)}>{t('header.explorer')}</button>
          </div>
        ) : (
          <div className="registration-form">
            <div className="wallet-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <strong>{t('step1.substep3.walletConnected')}:</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '0.9em', color: '#666' }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <button
                  onClick={copyAddressToClipboard}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    transition: 'all 0.2s ease'
                  }}
                  title={copiedAddress ? "Copied!" : "Copy address"}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {copiedAddress ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
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
              <h2>{t('registerCommunity.form.basicInfo')}</h2>

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
                <small style={{ color: '#6b7280', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                  {t('registerCommunity.form.ensHint', { communityName })}
                </small>
              </div>
            </div>

            <div className="form-section">
              <h2>{t('registerCommunity.form.tokenSection')}</h2>

              <div className="form-group">
                <label>xPNTs Token</label>
                {hasXPNTs === null ? (
                  // Checking status
                  <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '4px' }}>
                    <p style={{ margin: 0, color: '#6b7280' }}>{t('registerCommunity.form.detectingXPNTs')}</p>
                  </div>
                ) : hasXPNTs === false ? (
                  // No xPNTs detected - show link to deploy
                  <div className="info-box" style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', marginBottom: '8px' }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#92400e' }}>{t('registerCommunity.form.noXPNTsDetected')}</p>
                    <p style={{ margin: '0 0 12px', fontSize: '0.9em', color: '#78350f' }}>
                      {t('registerCommunity.form.deployXPNTsBenefit')}
                    </p>
                    <Link
                      to="/get-xpnts"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.9em'
                      }}
                    >
                      {t('registerCommunity.form.deployXPNTs')}
                    </Link>
                    <p style={{ margin: '12px 0 0', fontSize: '0.85em', color: '#78350f' }}>
                      {t('registerCommunity.form.skipDeployXPNTs')}
                    </p>
                  </div>
                ) : (
                  // xPNTs detected - show address (read-only)
                  <>
                    <input
                      type="text"
                      value={xPNTsToken}
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '2px solid #10b981',
                        background: '#f0fdf4',
                        color: '#065f46',
                        fontFamily: 'Monaco, Courier New, monospace',
                        fontSize: '0.9em',
                        cursor: 'not-allowed'
                      }}
                    />
                    <small style={{ color: '#10b981', fontWeight: 600 }}>
                      {t('registerCommunity.form.xpNTsDetected')}
                    </small>
                  </>
                )}
              </div>
            </div>

            <div className="form-section">
              <h2>{t('registerCommunity.form.paymasterSection')}</h2>

              <div className="form-group">
                <label>Paymaster Address</label>
                {hasPaymaster === null ? (
                  // Checking status
                  <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: '4px' }}>
                    <p style={{ margin: 0, color: '#6b7280' }}>{t('registerCommunity.form.detectingPaymaster')}</p>
                  </div>
                ) : hasPaymaster === false ? (
                  // No Paymaster detected - show link to deploy
                  <div className="info-box" style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', marginBottom: '8px' }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#92400e' }}>{t('registerCommunity.form.noPaymasterDetected')}</p>
                    <p style={{ margin: '0 0 12px', fontSize: '0.9em', color: '#78350f' }}>
                      {t('registerCommunity.form.deployPaymasterBenefit')}
                    </p>
                    <Link
                      to="/operator/wizard"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.9em'
                      }}
                    >
                      {t('registerCommunity.form.deployPaymaster')}
                    </Link>
                    <p style={{ margin: '12px 0 0', fontSize: '0.85em', color: '#78350f' }}>
                      {t('registerCommunity.form.skipDeployPaymaster')}
                    </p>
                  </div>
                ) : (
                  // Paymaster detected - show address (read-only)
                  <>
                    <input
                      type="text"
                      value={paymasterAddress}
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '2px solid #10b981',
                        background: '#f0fdf4',
                        color: '#065f46',
                        fontFamily: 'Monaco, Courier New, monospace',
                        fontSize: '0.9em',
                        cursor: 'not-allowed',
                        marginBottom: '8px'
                      }}
                    />
                    <small style={{ color: '#10b981', fontWeight: 600 }}>
                      {t('registerCommunity.form.paymasterDetected')}
                    </small>
                  </>
                )}
              </div>

              <div className="form-group">
                <label>Paymaster Type</label>
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

            {/* MySBT Section */}
            <div className="form-section">
              <h2>{t('registerCommunity.form.sbtSection')}</h2>

              {/* MySBT White-label SBT (Auto-configured) */}
              <div className="form-group">
                <label>MySBT Address (AAstar White-label SBT)</label>
                <input
                  type="text"
                  value={MYSBT_ADDRESS}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '2px solid #3b82f6',
                    background: '#eff6ff',
                    color: '#1e40af',
                    fontFamily: 'Monaco, Courier New, monospace',
                    fontSize: '0.9em',
                    cursor: 'not-allowed',
                    marginBottom: '8px'
                  }}
                />
                <small style={{ color: '#3b82f6', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {t('registerCommunity.form.unifiedMySBT')}
                </small>
                <small style={{ color: '#6b7280', fontSize: '0.85em' }}>
                  {t('registerCommunity.form.autoConfigSBT')}
                </small>
              </div>

              {/* SBT Configuration */}
              <div className="form-group">
                <label>Permissionless Mint Configuration</label>
                <div className="checkbox-group">
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

        {/* Registered Communities Section */}
        <div className="registered-communities-section" style={{ marginTop: '40px' }}>
          <div className="section-header">
            <h2>Registered Communities</h2>
            <div className="community-count">
              Total: {totalCommunities} communities
            </div>
          </div>

          {loadingCommunities && communities.length === 0 ? (
            <div className="loading-communities">
              <div className="spinner"></div>
              <p>Loading communities...</p>
            </div>
          ) : (
            <>
              <div className="communities-grid">
                {communities.map((community) => (
                  <div
                    key={community.address}
                    className="community-card"
                  >
                    <div className="community-header">
                      <h3>{community.name}</h3>
                      <span className={`status-badge ${community.isActive ? 'active' : 'inactive'}`}>
                        {community.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="community-info">
                      <div className="info-item">
                        <span className="label">ENS:</span>
                        <span className="value">{community.ensName || 'N/A'}</span>
                      </div>

                      <div className="info-item">
                        <span className="label">Node Type:</span>
                        <span className="value">{community.nodeType === 0 ? 'AOA' : 'SUPER'}</span>
                      </div>

                      <div className="info-item">
                        <span className="label">xPNTs Token:</span>
                        <span className="value mono">
                          {community.xPNTsToken.slice(0, 6)}...{community.xPNTsToken.slice(-4)}
                        </span>
                      </div>

                      <div className="info-item">
                        <span className="label">Paymaster:</span>
                        <span className="value mono">
                          {community.paymasterAddress.slice(0, 6)}...{community.paymasterAddress.slice(-4)}
                        </span>
                      </div>

                      <div className="info-item">
                        <span className="label">Permissionless Mint:</span>
                        <span className="value">{community.allowPermissionlessMint ? 'Enabled' : 'Disabled'}</span>
                      </div>

                      <div className="info-item">
                        <span className="label">Registered:</span>
                        <span className="value">
                          {new Date(community.registeredAt * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="community-actions">
                      <Link
                        to={`/explorer/community/${community.address}`}
                        className="explorer-link"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {communities.length < totalCommunities && (
                <div className="load-more-container">
                  <button
                    className="load-more-btn"
                    onClick={loadMoreCommunities}
                    disabled={loadingCommunities}
                  >
                    {loadingCommunities ? 'Loading...' : 'Next →'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
