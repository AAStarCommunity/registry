import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useSearchParams } from 'react-router-dom';
import { getCurrentNetworkConfig } from '../../config/networkConfig';
import { getProvider } from '../../utils/rpc-provider';
import './ManagePaymasterFull.css';

/**
 * ManagePaymasterFull - Complete Paymaster Management Dashboard
 *
 * Phase 2.1.6 Implementation:
 * - Display all PaymasterV4 configuration parameters
 * - Show EntryPoint balance and stake status
 * - Show Registry stake information
 * - Provide UI to modify all parameters
 * - Support SBT and GasToken management
 * - Pause/unpause functionality
 */

// Contract addresses - read from env with fallback
const ENTRY_POINT_V07 =
  import.meta.env.VITE_ENTRY_POINT_V07 ||
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032"; // Official v0.7 EntryPoint
const REGISTRY_V1_2 =
  import.meta.env.VITE_REGISTRY_ADDRESS ||
  "0x838da93c815a6E45Aa50429529da9106C0621eF0";
const REGISTRY_V2 =
  import.meta.env.VITE_REGISTRY_V2_ADDRESS ||
  "0x3ff7f71725285dB207442f51F6809e9C671E5dEb";
const GTOKEN_STAKING =
  import.meta.env.VITE_GTOKEN_STAKING_ADDRESS ||
  "0x199402b3F213A233e89585957F86A07ED1e1cD67";

// ABIs
// PaymasterV4 ABI - Removed gasToUSDRate/pntPriceUSD (not in V4, uses Chainlink)
const PAYMASTER_V4_ABI = [
  "function owner() view returns (address)",
  "function treasury() view returns (address)",
  "function serviceFeeRate() view returns (uint256)",
  "function maxGasCostCap() view returns (uint256)",
  "function paused() view returns (bool)",
  "function entryPoint() view returns (address)",
  "function registry() view returns (address)",
  "function isRegistrySet() view returns (bool)",
  "function supportedSBTs(uint256) view returns (address)",
  "function supportedGasTokens(uint256) view returns (address)",
  "function getSupportedSBTs() view returns (address[])",
  "function getSupportedGasTokens() view returns (address[])",
  "function isSBTSupported(address) view returns (bool)",
  "function isGasTokenSupported(address) view returns (bool)",
  "function transferOwnership(address newOwner)",
  "function setTreasury(address newTreasury)",
  "function setServiceFeeRate(uint256 rate)",
  "function setMaxGasCostCap(uint256 cap)",
  "function setRegistry(address registry)",
  "function addSBT(address sbtToken)",
  "function removeSBT(address sbtToken)",
  "function addGasToken(address gasToken)",
  "function removeGasToken(address gasToken)",
  "function pause()",
  "function unpause()",
];

const ENTRY_POINT_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function getDepositInfo(address account) view returns (tuple(uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime))",
  "function addDeposit(address account) payable",
];

const REGISTRY_ABI = [
  "function getPaymasterInfo(address paymaster) view returns (uint256 feeRate, bool isActive, uint256 successCount, uint256 totalAttempts, string memory name)",
];

const GTOKEN_STAKING_ABI = [
  "function getStakeInfo(address user) view returns (tuple(uint256 amount, uint256 sGTokenShares, uint256 stakedAt, uint256 unstakeRequestedAt))",
  "function availableBalance(address user) view returns (uint256)",
  "function stake(uint256 amount) returns (uint256 shares)",
];

// PaymasterV4 uses Chainlink for price feeds (no manual gasToUSDRate/pntPriceUSD)
interface PaymasterConfig {
  owner: string;
  treasury: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  paused: boolean;
  entryPointAddress: string;
  registryAddress: string;
  isRegistrySet: boolean;
  gasToUSDRate: string;
  pntPriceUSD: string;
  minTokenBalance: string;
}

interface EntryPointInfo {
  balance: string;
  deposit: string;
  staked: boolean;
  stake: string;
  unstakeDelaySec: number;
  withdrawTime: number;
}

interface RegistryInfo {
  registryAddress: string;
  stakedGToken: string; // Amount of GToken staked in GTokenStaking contract
  availableToLock: string; // Staked but not yet locked for paymaster
}

export default function ManagePaymasterAOA() {
  const [searchParams] = useSearchParams();
  const paymasterAddress = searchParams.get('address') || '';

  const [config, setConfig] = useState<PaymasterConfig | null>(null);
  const [entryPointInfo, setEntryPointInfo] = useState<EntryPointInfo | null>(null);
  const [registryInfo, setRegistryInfo] = useState<RegistryInfo | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'config' | 'entrypoint' | 'registry' | 'tokens'>('config');

  // Edit states
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [txPending, setTxPending] = useState(false);

  // Token management states
  const [sbtAddress, setSbtAddress] = useState('');
  const [gasTokenAddress, setGasTokenAddress] = useState('');
  const [checkingSBT, setCheckingSBT] = useState(false);
  const [checkingGasToken, setCheckingGasToken] = useState(false);
  const [sbtStatus, setSbtStatus] = useState<boolean | null>(null);
  const [gasTokenStatus, setGasTokenStatus] = useState<boolean | null>(null);

  // Lists of currently supported tokens (read from contract)
  const [supportedSBTs, setSupportedSBTs] = useState<string[]>([]);
  const [supportedGasTokens, setSupportedGasTokens] = useState<string[]>([]);

  // EntryPoint deposit state
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Helper: Get read-only provider (Alchemy or BrowserProvider fallback)
  const getReadProvider = () => {
    const networkConfig = getCurrentNetworkConfig();
    // Use BrowserProvider for relative URLs (like /api/rpc-proxy)
    if (networkConfig.rpcUrl.startsWith('/')) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    // Use JsonRpcProvider for full URLs (Alchemy)
    return new ethers.JsonRpcProvider(networkConfig.rpcUrl);
  };

  useEffect(() => {
    if (paymasterAddress) {
      loadPaymasterData();
    }
  }, [paymasterAddress]);

  const loadPaymasterData = async () => {
    setLoading(true);
    setError('');

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Use MetaMask for user address
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const userAddr = await signer.getAddress();
      setUserAddress(userAddr);

      // Use independent RPC provider for read-only queries
      // getProvider() handles /api/rpc-proxy and public RPC fallbacks
      const provider = getProvider();

      // Load Paymaster config
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, provider);

      // Fetch basic config (PaymasterV4 uses Chainlink, no manual rates)
      const [
        owner,
        treasury,
        serviceFeeRate,
        maxGasCostCap,
        paused,
        entryPointAddress,
      ] = await Promise.all([
        paymaster.owner(),
        paymaster.treasury(),
        paymaster.serviceFeeRate(),
        paymaster.maxGasCostCap(),
        paymaster.paused(),
        paymaster.entryPoint(),
      ]);

      // Try fetching registry (v4.1 only) - optional
      let registryAddress = ethers.ZeroAddress;
      let isRegistrySet = false;
      try {
        registryAddress = await paymaster.registry();
        isRegistrySet = await paymaster.isRegistrySet();
      } catch (e) {
        // PaymasterV4 (old version, deployed before Oct 26, 2025) doesn't have registry functions
        // All new deployments use PaymasterV4.1 with Registry support
        console.log("Note: This is an older Paymaster (v4.0) without Registry support");
      }

      setConfig({
        owner,
        treasury,
        serviceFeeRate: serviceFeeRate.toString(),
        maxGasCostCap: ethers.formatEther(maxGasCostCap),
        paused,
        entryPointAddress,
        registryAddress,
        isRegistrySet,
        // PaymasterV4 uses Chainlink for price feeds, these are not fetched from contract
        gasToUSDRate: 'N/A (Chainlink)',
        pntPriceUSD: 'N/A (Chainlink)',
        minTokenBalance: 'N/A',
      });

      setIsOwner(userAddr.toLowerCase() === owner.toLowerCase());

      // Load EntryPoint info
      const entryPoint = new ethers.Contract(ENTRY_POINT_V07, ENTRY_POINT_ABI, provider);
      const balance = await entryPoint.balanceOf(paymasterAddress);
      const depositInfo = await entryPoint.getDepositInfo(paymasterAddress);

      setEntryPointInfo({
        balance: ethers.formatEther(balance),
        deposit: ethers.formatUnits(depositInfo.deposit, 'wei'),
        staked: depositInfo.staked,
        stake: ethers.formatUnits(depositInfo.stake, 'wei'),
        unstakeDelaySec: Number(depositInfo.unstakeDelaySec),
        withdrawTime: Number(depositInfo.withdrawTime),
      });

      // Load GTokenStaking info
      const gtokenStaking = new ethers.Contract(GTOKEN_STAKING, GTOKEN_STAKING_ABI, provider);
      const stakeInfo = await gtokenStaking.getStakeInfo(userAddr);
      const availableBalance = await gtokenStaking.availableBalance(userAddr);

      console.log('📊 GToken Stake Info:', {
        staked: ethers.formatEther(stakeInfo.amount),
        available: ethers.formatEther(availableBalance),
      });

      setRegistryInfo({
        registryAddress: REGISTRY_V2,
        stakedGToken: ethers.formatEther(stakeInfo.amount),
        availableToLock: ethers.formatEther(availableBalance),
      });

      // Load supported tokens from contract
      try {
        const supportedSBTsList = await paymaster.getSupportedSBTs();
        const supportedGasTokensList = await paymaster.getSupportedGasTokens();
        console.log('✅ Supported SBTs:', supportedSBTsList);
        console.log('✅ Supported Gas Tokens:', supportedGasTokensList);
        setSupportedSBTs(supportedSBTsList);
        setSupportedGasTokens(supportedGasTokensList);
      } catch (tokenErr) {
        console.error('Failed to load supported tokens:', tokenErr);
        // Don't fail the whole load if tokens fail
        setSupportedSBTs([]);
        setSupportedGasTokens([]);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load paymaster data:', err);
      setError(err.message || 'Failed to load paymaster data');
      setLoading(false);
    }
  };

  const handleEditParam = (paramName: string, currentValue: string) => {
    setEditingParam(paramName);
    setEditValue(currentValue);
  };

  const handleCancelEdit = () => {
    setEditingParam(null);
    setEditValue('');
  };

  const handleSaveParam = async (paramName: string) => {
    if (!isOwner) {
      alert('Only the owner can modify parameters');
      return;
    }

    setTxPending(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, signer);

      let tx;

      switch (paramName) {
        case 'owner':
          tx = await paymaster.transferOwnership(editValue);
          break;
        case 'treasury':
          tx = await paymaster.setTreasury(editValue);
          break;
        case 'gasToUSDRate':
          tx = await paymaster.setGasToUSDRate(ethers.parseUnits(editValue, 18));
          break;
        case 'pntPriceUSD':
          tx = await paymaster.setPntPriceUSD(ethers.parseUnits(editValue, 18));
          break;
        case 'serviceFeeRate':
          tx = await paymaster.setServiceFeeRate(editValue);
          break;
        case 'maxGasCostCap':
          tx = await paymaster.setMaxGasCostCap(ethers.parseEther(editValue));
          break;
        case 'minTokenBalance':
          tx = await paymaster.setMinTokenBalance(ethers.parseEther(editValue));
          break;
        case 'registry':
          tx = await paymaster.setRegistry(editValue);
          break;
        default:
          throw new Error('Unknown parameter');
      }

      await tx.wait();

      alert('Parameter updated successfully!');
      setEditingParam(null);
      setEditValue('');
      await loadPaymasterData();
    } catch (err: any) {
      console.error('Failed to update parameter:', err);
      setError(err.message || 'Failed to update parameter');
    } finally {
      setTxPending(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!isOwner) {
      alert('Only the owner can pause/unpause');
      return;
    }

    setTxPending(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, signer);

      const tx = config?.paused ? await paymaster.unpause() : await paymaster.pause();
      await tx.wait();

      alert(config?.paused ? 'Paymaster unpaused!' : 'Paymaster paused!');
      await loadPaymasterData();
    } catch (err: any) {
      console.error('Failed to toggle pause state:', err);
      setError(err.message || 'Failed to toggle pause state');
    } finally {
      setTxPending(false);
    }
  };

  const checkSBTStatus = async () => {
    if (!sbtAddress) return;

    setCheckingSBT(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, provider);
      const isSupported = await paymaster.supportedSBTs(sbtAddress);
      setSbtStatus(isSupported);
    } catch (err) {
      console.error('Failed to check SBT status:', err);
      setSbtStatus(null);
    } finally {
      setCheckingSBT(false);
    }
  };

  const checkGasTokenStatus = async () => {
    if (!gasTokenAddress) return;

    setCheckingGasToken(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, provider);
      const isSupported = await paymaster.supportedGasTokens(gasTokenAddress);
      setGasTokenStatus(isSupported);
    } catch (err) {
      console.error('Failed to check GasToken status:', err);
      setGasTokenStatus(null);
    } finally {
      setCheckingGasToken(false);
    }
  };

  const handleAddSBT = async () => {
    if (!isOwner || !sbtAddress) return;

    setTxPending(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, signer);

      const tx = await paymaster.addSBT(sbtAddress);
      await tx.wait();

      alert('SBT added successfully!');
      setSbtAddress('');
      setSbtStatus(null);
    } catch (err: any) {
      console.error('Failed to add SBT:', err);
      setError(err.message || 'Failed to add SBT');
    } finally {
      setTxPending(false);
    }
  };

  const handleRemoveSBT = async () => {
    if (!isOwner || !sbtAddress) return;

    setTxPending(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, signer);

      const tx = await paymaster.removeSBT(sbtAddress);
      await tx.wait();

      alert('SBT removed successfully!');
      setSbtAddress('');
      setSbtStatus(null);
    } catch (err: any) {
      console.error('Failed to remove SBT:', err);
      setError(err.message || 'Failed to remove SBT');
    } finally {
      setTxPending(false);
    }
  };

  const handleAddGasToken = async () => {
    if (!isOwner || !gasTokenAddress) return;

    setTxPending(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, signer);

      const tx = await paymaster.addGasToken(gasTokenAddress);
      await tx.wait();

      alert('GasToken added successfully!');
      setGasTokenAddress('');
      setGasTokenStatus(null);
    } catch (err: any) {
      console.error('Failed to add GasToken:', err);
      setError(err.message || 'Failed to add GasToken');
    } finally {
      setTxPending(false);
    }
  };

  const handleRemoveGasToken = async () => {
    if (!isOwner || !gasTokenAddress) return;

    setTxPending(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_V4_ABI, signer);

      const tx = await paymaster.removeGasToken(gasTokenAddress);
      await tx.wait();

      alert('GasToken removed successfully!');
      setGasTokenAddress('');
      setGasTokenStatus(null);
    } catch (err: any) {
      console.error('Failed to remove GasToken:', err);
      setError(err.message || 'Failed to remove GasToken');
    } finally {
      setTxPending(false);
    }
  };

  const handleAddDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }

    setTxPending(true);
    setError('');

    try {
      // Use Alchemy for estimation, MetaMask for signing
      const readProvider = getReadProvider();
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();

      // Create contract with read provider for gas estimation
      const entryPointRead = new ethers.Contract(ENTRY_POINT_V07, ENTRY_POINT_ABI, readProvider);

      console.log('💰 Adding deposit to EntryPoint...');
      console.log('Amount:', depositAmount, 'ETH');
      console.log('Paymaster:', paymasterAddress);

      // Estimate gas using Alchemy (more reliable)
      const gasLimit = await entryPointRead.addDeposit.estimateGas(paymasterAddress, {
        value: ethers.parseEther(depositAmount),
        from: await signer.getAddress(),
      });
      console.log('⛽ Estimated gas:', gasLimit.toString());

      // Send transaction with MetaMask
      const entryPointWrite = new ethers.Contract(ENTRY_POINT_V07, ENTRY_POINT_ABI, signer);
      const tx = await entryPointWrite.addDeposit(paymasterAddress, {
        value: ethers.parseEther(depositAmount),
        gasLimit: gasLimit * 120n / 100n, // Add 20% buffer
      });

      console.log('📤 Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Deposit confirmed!');

      alert(`Successfully deposited ${depositAmount} ETH to EntryPoint!`);
      setDepositAmount('');
      await loadPaymasterData(); // Reload to show updated balance
    } catch (err: any) {
      console.error('Failed to add deposit:', err);
      setError(err.message || 'Failed to add deposit to EntryPoint');
      alert(`Failed to deposit: ${err.message || 'Unknown error'}`);
    } finally {
      setTxPending(false);
    }
  };

  if (!paymasterAddress) {
    return (
      <div className="manage-paymaster-full">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>No Paymaster Address Provided</h3>
          <p>Please provide a paymaster address in the URL parameter: ?address=0x...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="manage-paymaster-full">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading paymaster data...</p>
        </div>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="manage-paymaster-full">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Paymaster</h3>
          <p>{error}</p>
          <button onClick={loadPaymasterData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-paymaster-full">
      <div className="manage-header">
        <div className="header-top">
          <div className="header-title">
            <h1>Manage Paymaster</h1>
            <a
              href="/operator/operate-guide"
              className="operate-guide-link"
              title="Learn how to operate your Paymaster"
            >
              📚 Operation Guide
            </a>
          </div>
        </div>
        <p className="paymaster-address">
          <strong>Address:</strong> <code>{paymasterAddress}</code>
        </p>
        <p className="user-address">
          <strong>Your Address:</strong> <code>{userAddress}</code>
        </p>
        {isOwner && (
          <div className="owner-badge">
            <span className="badge-icon">👑</span> Owner
          </div>
        )}
        {!isOwner && (
          <div className="viewer-badge">
            <span className="badge-icon">👁️</span> Viewer (Read-only)
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {config?.paused && (
        <div className="paused-banner">
          <span className="paused-icon">⏸️</span>
          <strong>Paymaster is currently PAUSED</strong>
          {isOwner && (
            <button
              onClick={handlePauseToggle}
              disabled={txPending}
              className="unpause-button"
            >
              {txPending ? 'Processing...' : 'Unpause'}
            </button>
          )}
        </div>
      )}

      <div className="manage-tabs">
        <button
          className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
        <button
          className={`tab-button ${activeTab === 'entrypoint' ? 'active' : ''}`}
          onClick={() => setActiveTab('entrypoint')}
        >
          EntryPoint
        </button>
        <button
          className={`tab-button ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          Registry
        </button>
        <button
          className={`tab-button ${activeTab === 'tokens' ? 'active' : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          Token Management
        </button>
      </div>

      <div className="manage-content">
        {activeTab === 'config' && config && (
          <div className="config-section">
            <h2>Configuration Parameters</h2>
            <div className="config-table">
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Current Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <ConfigRow
                    label="Owner"
                    value={config.owner}
                    paramName="owner"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="address"
                  />
                  <ConfigRow
                    label="Treasury"
                    value={config.treasury}
                    paramName="treasury"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="address"
                  />
                  <ConfigRow
                    label="Gas to USD Rate"
                    value={config.gasToUSDRate}
                    paramName="gasToUSDRate"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="number"
                    placeholder="e.g., 4500"
                  />
                  <ConfigRow
                    label="PNT Price (USD)"
                    value={`$${config.pntPriceUSD}`}
                    paramName="pntPriceUSD"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="number"
                    placeholder="e.g., 0.02"
                  />
                  <ConfigRow
                    label="Service Fee Rate"
                    value={`${config.serviceFeeRate} basis points (${(Number(config.serviceFeeRate) / 100).toFixed(2)}%)`}
                    paramName="serviceFeeRate"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="number"
                    placeholder="0-1000 basis points"
                  />
                  <ConfigRow
                    label="Max Gas Cost Cap"
                    value={`${config.maxGasCostCap} ETH`}
                    paramName="maxGasCostCap"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="number"
                    placeholder="e.g., 0.1"
                  />
                  <ConfigRow
                    label="Min Token Balance"
                    value={`${config.minTokenBalance} tokens`}
                    paramName="minTokenBalance"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="number"
                    placeholder="e.g., 100"
                  />
                  <tr>
                    <td><strong>EntryPoint Address</strong></td>
                    <td><code>{config.entryPointAddress}</code></td>
                    <td><em style={{color: '#999'}}>Read-only</em></td>
                  </tr>
                  <ConfigRow
                    label="Registry Address"
                    value={config.registryAddress}
                    paramName="registry"
                    editingParam={editingParam}
                    editValue={editValue}
                    isOwner={isOwner}
                    txPending={txPending}
                    onEdit={handleEditParam}
                    onSave={handleSaveParam}
                    onCancel={handleCancelEdit}
                    onEditValueChange={setEditValue}
                    inputType="address"
                  />
                  <tr>
                    <td><strong>Registry Set Status</strong></td>
                    <td>
                      <span style={{color: config.isRegistrySet ? '#28a745' : '#dc3545', fontWeight: 600}}>
                        {config.isRegistrySet ? '✓ Set' : '✗ Not Set'}
                      </span>
                    </td>
                    <td><em style={{color: '#999'}}>Read-only</em></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {isOwner && (
              <div className="pause-control">
                <h3>Pause Control</h3>
                <p>
                  {config.paused
                    ? 'The Paymaster is currently paused. No transactions will be sponsored.'
                    : 'The Paymaster is currently active and sponsoring transactions.'}
                </p>
                <button
                  onClick={handlePauseToggle}
                  disabled={txPending}
                  className={config.paused ? 'unpause-button' : 'pause-button'}
                >
                  {txPending ? 'Processing...' : config.paused ? 'Unpause Paymaster' : 'Pause Paymaster'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'entrypoint' && entryPointInfo && (
          <div className="entrypoint-section">
            <h2>EntryPoint v0.7 Status</h2>
            <div className="info-card">
              <div className="info-item">
                <span className="info-label">Balance:</span>
                <span className="info-value">{entryPointInfo.balance} ETH</span>
              </div>
              <div className="info-item">
                <span className="info-label">Deposit:</span>
                <span className="info-value">{ethers.formatEther(entryPointInfo.deposit)} ETH</span>
              </div>
              <div className="info-item">
                <span className="info-label">Staked:</span>
                <span className={`info-value ${entryPointInfo.staked ? 'staked' : 'not-staked'}`}>
                  {entryPointInfo.staked ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Stake Amount:</span>
                <span className="info-value">{ethers.formatEther(entryPointInfo.stake)} ETH</span>
              </div>
              <div className="info-item">
                <span className="info-label">Unstake Delay:</span>
                <span className="info-value">{entryPointInfo.unstakeDelaySec} seconds</span>
              </div>
              <div className="info-item">
                <span className="info-label">Withdraw Time:</span>
                <span className="info-value">
                  {entryPointInfo.withdrawTime === 0
                    ? 'N/A'
                    : new Date(entryPointInfo.withdrawTime * 1000).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="entrypoint-note">
              <p>
                <strong>Note:</strong> EntryPoint balance is used to sponsor user operations. Make sure to maintain
                sufficient balance to cover gas costs.
              </p>
            </div>

            {/* Add Deposit Card */}
            <div className="deposit-card">
              <h3>💰 Add Deposit to EntryPoint</h3>
              <p>Deposit ETH to the EntryPoint contract for your Paymaster to sponsor gas fees.</p>

              <div className="deposit-input-group">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount in ETH (e.g., 0.1)"
                  className="deposit-input"
                  disabled={txPending}
                />
                <button
                  onClick={handleAddDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0 || txPending}
                  className="deposit-button"
                >
                  {txPending ? 'Processing...' : 'Add Deposit'}
                </button>
              </div>

              {parseFloat(entryPointInfo.balance) < 0.01 && (
                <div className="low-balance-warning">
                  ⚠️ Low balance! Your EntryPoint balance is below 0.01 ETH. Consider adding more funds.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'registry' && registryInfo && (
          <div className="registry-section">
            <h2>Registry v2.0 & GToken Staking Status</h2>

            <div className="info-card">
              <div className="info-item">
                <span className="info-label">Registry v2 Address:</span>
                <span className="info-value">
                  <code>{registryInfo.registryAddress}</code>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Your Staked GToken:</span>
                <span className={`info-value ${parseFloat(registryInfo.stakedGToken) > 0 ? 'staked' : 'not-staked'}`}>
                  {registryInfo.stakedGToken} GToken
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Available to Lock:</span>
                <span className="info-value">
                  {registryInfo.availableToLock} GToken
                </span>
              </div>
            </div>

            <div className="registry-note">
              <p>
                <strong>About Registry v2.0:</strong> Registry v2 stores community metadata only.
                Your stGToken (staked GToken) is managed by the GTokenStaking contract and can be locked
                for your Paymaster operations. Higher stGToken lock = higher reputation and priority.
              </p>
            </div>

            {parseFloat(registryInfo.stakedGToken) === 0 && (
              <div className="warning-banner">
                <span className="warning-icon">⚠️</span>
                <div className="warning-content">
                  <strong>No GToken Staked</strong>
                  <p>You need to stake GToken first to operate your Paymaster. Minimum required: 10 GToken.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="tokens-section">
            <h2>Token Management</h2>

            <div className="token-management-card">
              <h3>Supported SBT (Soul-Bound Tokens)</h3>
              <p>Add or remove SBT tokens that users must hold to use this Paymaster.</p>

              {/* Display currently supported SBTs */}
              {supportedSBTs.length > 0 && (
                <div className="supported-tokens-list">
                  <strong>Currently Supported SBTs:</strong>
                  <ul>
                    {supportedSBTs.map((sbt, index) => (
                      <li key={index}>
                        <code>{sbt}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {supportedSBTs.length === 0 && (
                <div className="no-tokens-message">
                  ℹ️ No SBT contracts configured yet
                </div>
              )}

              <div className="token-input-group">
                <input
                  type="text"
                  value={sbtAddress}
                  onChange={(e) => setSbtAddress(e.target.value)}
                  placeholder="SBT Contract Address (0x...)"
                  className="token-input"
                  disabled={txPending}
                />
                <button
                  onClick={checkSBTStatus}
                  disabled={!sbtAddress || checkingSBT || txPending}
                  className="check-button"
                >
                  {checkingSBT ? 'Checking...' : 'Check Status'}
                </button>
              </div>

              {sbtStatus !== null && (
                <div className={`status-message ${sbtStatus ? 'supported' : 'not-supported'}`}>
                  {sbtStatus ? '✓ This SBT is currently supported' : '✗ This SBT is not supported'}
                </div>
              )}

              {isOwner && (
                <div className="token-actions">
                  <button
                    onClick={handleAddSBT}
                    disabled={!sbtAddress || txPending || sbtStatus === true}
                    className="add-button"
                  >
                    {txPending ? 'Processing...' : 'Add SBT'}
                  </button>
                  <button
                    onClick={handleRemoveSBT}
                    disabled={!sbtAddress || txPending || sbtStatus === false}
                    className="remove-button"
                  >
                    {txPending ? 'Processing...' : 'Remove SBT'}
                  </button>
                </div>
              )}
            </div>

            <div className="token-management-card">
              <h3>Supported Gas Tokens</h3>
              <p>Add or remove ERC20 tokens that can be used to pay for gas.</p>

              {/* Display currently supported Gas Tokens */}
              {supportedGasTokens.length > 0 && (
                <div className="supported-tokens-list">
                  <strong>Currently Supported Gas Tokens:</strong>
                  <ul>
                    {supportedGasTokens.map((token, index) => (
                      <li key={index}>
                        <code>{token}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {supportedGasTokens.length === 0 && (
                <div className="no-tokens-message">
                  ℹ️ No gas tokens configured yet
                </div>
              )}

              <div className="token-input-group">
                <input
                  type="text"
                  value={gasTokenAddress}
                  onChange={(e) => setGasTokenAddress(e.target.value)}
                  placeholder="Gas Token Contract Address (0x...)"
                  className="token-input"
                  disabled={txPending}
                />
                <button
                  onClick={checkGasTokenStatus}
                  disabled={!gasTokenAddress || checkingGasToken || txPending}
                  className="check-button"
                >
                  {checkingGasToken ? 'Checking...' : 'Check Status'}
                </button>
              </div>

              {gasTokenStatus !== null && (
                <div className={`status-message ${gasTokenStatus ? 'supported' : 'not-supported'}`}>
                  {gasTokenStatus ? '✓ This Gas Token is currently supported' : '✗ This Gas Token is not supported'}
                </div>
              )}

              {isOwner && (
                <div className="token-actions">
                  <button
                    onClick={handleAddGasToken}
                    disabled={!gasTokenAddress || txPending || gasTokenStatus === true}
                    className="add-button"
                  >
                    {txPending ? 'Processing...' : 'Add Gas Token'}
                  </button>
                  <button
                    onClick={handleRemoveGasToken}
                    disabled={!gasTokenAddress || txPending || gasTokenStatus === false}
                    className="remove-button"
                  >
                    {txPending ? 'Processing...' : 'Remove Gas Token'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="manage-footer">
        <button onClick={loadPaymasterData} className="refresh-button" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
}

// ConfigRow component
interface ConfigRowProps {
  label: string;
  value: string;
  paramName: string;
  editingParam: string | null;
  editValue: string;
  isOwner: boolean;
  txPending: boolean;
  onEdit: (paramName: string, currentValue: string) => void;
  onSave: (paramName: string) => void;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
  inputType?: 'address' | 'number';
  placeholder?: string;
}

function ConfigRow({
  label,
  value,
  paramName,
  editingParam,
  editValue,
  isOwner,
  txPending,
  onEdit,
  onSave,
  onCancel,
  onEditValueChange,
  inputType = 'address',
  placeholder,
}: ConfigRowProps) {
  // Extract raw value for editing
  const rawValue = paramName === 'owner' || paramName === 'treasury'
    ? value
    : paramName === 'pntPriceUSD'
    ? value.replace('$', '')
    : paramName === 'serviceFeeRate'
    ? value.split(' ')[0]
    : paramName === 'maxGasCostCap'
    ? value.replace(' ETH', '')
    : paramName === 'minTokenBalance'
    ? value.replace(' tokens', '')
    : value;

  return (
    <tr>
      <td><strong>{label}</strong></td>
      <td>
        {editingParam === paramName ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            placeholder={placeholder}
            className="edit-input"
          />
        ) : (
          inputType === 'address' ? <code>{value}</code> : <span>{value}</span>
        )}
      </td>
      <td>
        {editingParam === paramName ? (
          <div className="edit-actions">
            <button
              onClick={() => onSave(paramName)}
              disabled={txPending}
              className="save-button"
            >
              {txPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              disabled={txPending}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => onEdit(paramName, rawValue)}
            disabled={!isOwner || txPending}
            className="edit-button"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}
