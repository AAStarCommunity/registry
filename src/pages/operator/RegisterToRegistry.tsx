import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface RegisterToRegistryProps {
  paymasterAddress: string;
  onComplete: () => void;
  onBack: () => void;
}

const GTOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address, uint256) external returns (bool)',
  'function allowance(address, address) view returns (uint256)',
];

const REGISTRY_ABI = [
  'function registerPaymaster(address, uint256, string) external',
  'function isPaymasterActive(address) view returns (bool)',
  'function paymasters(address) view returns (address, string, uint256, uint256, uint256, bool, uint256, uint256, uint256, uint256)',
];

export function RegisterToRegistry({ paymasterAddress, onComplete, onBack }: RegisterToRegistryProps) {
  const [gTokenBalance, setGTokenBalance] = useState('0');
  const [stakeAmount, setStakeAmount] = useState('10');
  const [metadata, setMetadata] = useState('');
  const [approved, setApproved] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gTokenAddress = import.meta.env.VITE_GTOKEN_ADDRESS || '';
  const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS || '';

  // Load GToken balance and registration status
  useEffect(() => {
    async function loadBalances() {
      if (!window.ethereum || !gTokenAddress || !registryAddress) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        // Check GToken balance
        const gToken = new ethers.Contract(gTokenAddress, GTOKEN_ABI, provider);
        const balance = await gToken.balanceOf(userAddress);
        setGTokenBalance(ethers.formatUnits(balance, 18));

        // Check if already registered
        const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);
        const isActive = await registry.isPaymasterActive(paymasterAddress);
        setRegistered(isActive);

      } catch (err) {
        console.error('Failed to load balances:', err);
      }
    }

    loadBalances();
  }, [paymasterAddress, gTokenAddress, registryAddress]);

  // Approve GToken
  const handleApprove = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount < 10) {
      setError('Minimum stake is 10 GToken');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const gToken = new ethers.Contract(gTokenAddress, GTOKEN_ABI, signer);

      console.log(`Approving ${stakeAmount} GToken to Registry`);
      const tx = await gToken.approve(
        registryAddress,
        ethers.parseUnits(stakeAmount, 18)
      );
      await tx.wait();
      console.log('Approval successful');

      setApproved(true);
      alert(`✅ Approved ${stakeAmount} GToken`);

    } catch (err: any) {
      console.error('Approval failed:', err);
      setError('Approval failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Register to Registry
  const handleRegister = async () => {
    if (!approved) {
      setError('Please approve GToken first');
      return;
    }

    if (!metadata.trim()) {
      setError('Please enter metadata (community description)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, signer);

      console.log('Registering Paymaster:', {
        paymaster: paymasterAddress,
        stake: stakeAmount,
        metadata,
      });

      const tx = await registry.registerPaymaster(
        paymasterAddress,
        ethers.parseUnits(stakeAmount, 18),
        metadata
      );
      await tx.wait();
      console.log('Registration successful');

      setRegistered(true);
      alert('🎉 Registration successful!\n\nYour Paymaster is now live in the SuperPaymaster Registry!');
      onComplete();

    } catch (err: any) {
      console.error('Registration failed:', err);
      setError('Registration failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Step 4: Register to Registry</h2>
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-green-700 mb-2">Already Registered!</h3>
          <p className="text-gray-700 mb-4">
            This Paymaster is already active in the Registry.
          </p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Continue to Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 4: Register to Registry</h2>
      <p className="text-gray-600 mb-6">
        Stake GToken and register your Paymaster to the SuperPaymaster Registry.
      </p>

      {/* GToken balance */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Your GToken Balance</h3>
        <div className="text-3xl font-bold text-blue-600">{gTokenBalance} GToken</div>
        {parseFloat(gTokenBalance) < 10 && (
          <div className="mt-2 text-sm text-red-600">
            ⚠️ Insufficient balance. Minimum: 10 GToken
          </div>
        )}
      </div>

      {/* Get GToken section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">4.1 Get GToken</h3>
        <p className="text-sm text-gray-600 mb-3">
          You need GToken to stake and register your Paymaster.
        </p>

        <div className="flex gap-4">
          <button className="flex-1 p-3 border rounded-lg hover:bg-gray-50">
            <div className="font-semibold">🚰 Testnet Faucet</div>
            <div className="text-xs text-gray-600">Get 20 GToken for testing</div>
          </button>
          <button className="flex-1 p-3 border rounded-lg hover:bg-gray-50">
            <div className="font-semibold">💱 Buy on Uniswap</div>
            <div className="text-xs text-gray-600">For mainnet deployment</div>
          </button>
        </div>
      </div>

      {/* Approve section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">4.2 Approve GToken</h3>
        <p className="text-sm text-gray-600 mb-3">
          Approve Registry contract to use your GToken for staking.
        </p>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1">Stake Amount (GToken)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min="10"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="10"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum: 10 GToken</p>
          </div>

          <button
            onClick={handleApprove}
            disabled={loading || approved}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            {approved ? '✓ Approved' : loading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>

      {/* Register section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">4.3 Register Paymaster</h3>
        <p className="text-sm text-gray-600 mb-3">
          Provide metadata and complete registration.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Community Description / Metadata</label>
          <textarea
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="e.g., MyDAO Paymaster - Serving 1000+ members with PNT-based gas payments"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={loading || !approved}
          className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 font-semibold"
        >
          {loading ? 'Registering...' : '🎉 Register to Registry'}
        </button>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">📋 Registration Process</h4>
        <ol className="text-sm text-gray-700 space-y-1">
          <li>1. Approve GToken (ERC20 approval)</li>
          <li>2. Registry pulls GToken from your wallet (stake)</li>
          <li>3. Your Paymaster is marked as Active</li>
          <li>4. Users can now discover and use your Paymaster!</li>
        </ol>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400"
          disabled={loading}
        >
          Back
        </button>
      </div>
    </div>
  );
}
