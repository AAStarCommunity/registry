import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface StakeEntryPointProps {
  paymasterAddress: string;
  onComplete: () => void;
  onBack: () => void;
}

const ENTRY_POINT_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

const ENTRY_POINT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function depositTo(address) payable',
  'function getDepositInfo(address) view returns (uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)',
  'function addStake(uint32) payable',
];

export function StakeEntryPoint({ paymasterAddress, onComplete, onBack }: StakeEntryPointProps) {
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [stakeAmount, setStakeAmount] = useState('0.05');
  const [unstakeDelay, setUnstakeDelay] = useState('86400'); // 1 day in seconds

  const [currentDeposit, setCurrentDeposit] = useState('0');
  const [currentStake, setCurrentStake] = useState('0');
  const [isStaked, setIsStaked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depositDone, setDepositDone] = useState(false);

  // Load current deposit and stake info
  useEffect(() => {
    async function loadDepositInfo() {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const entryPoint = new ethers.Contract(
          ENTRY_POINT_V07,
          ENTRY_POINT_ABI,
          provider
        );

        const info = await entryPoint.getDepositInfo(paymasterAddress);
        setCurrentDeposit(ethers.formatEther(info.deposit));
        setCurrentStake(ethers.formatEther(info.stake));
        setIsStaked(info.staked);

        // If already has deposit, mark as done
        if (info.deposit > 0n) {
          setDepositDone(true);
        }
      } catch (err) {
        console.error('Failed to load deposit info:', err);
      }
    }

    loadDepositInfo();
  }, [paymasterAddress]);

  // Deposit ETH to EntryPoint
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const entryPoint = new ethers.Contract(
        ENTRY_POINT_V07,
        ENTRY_POINT_ABI,
        signer
      );

      console.log(`Depositing ${depositAmount} ETH to EntryPoint for Paymaster`);
      const tx = await entryPoint.depositTo(paymasterAddress, {
        value: ethers.parseEther(depositAmount),
      });

      await tx.wait();
      console.log('Deposit successful');

      // Reload balance
      const info = await entryPoint.getDepositInfo(paymasterAddress);
      setCurrentDeposit(ethers.formatEther(info.deposit));
      setDepositDone(true);

      alert(`✅ Deposited ${depositAmount} ETH successfully!`);
    } catch (err: any) {
      console.error('Deposit failed:', err);
      setError('Deposit failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stake ETH to EntryPoint
  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    const delay = parseInt(unstakeDelay);
    if (isNaN(delay) || delay < 0) {
      setError('Please enter a valid unstake delay');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const entryPoint = new ethers.Contract(
        ENTRY_POINT_V07,
        ENTRY_POINT_ABI,
        signer
      );

      console.log(`Staking ${stakeAmount} ETH with ${unstakeDelay}s delay`);
      const tx = await entryPoint.addStake(delay, {
        value: ethers.parseEther(stakeAmount),
      });

      await tx.wait();
      console.log('Stake successful');

      // Reload balance
      const info = await entryPoint.getDepositInfo(paymasterAddress);
      setCurrentStake(ethers.formatEther(info.stake));
      setIsStaked(info.staked);

      alert(`✅ Staked ${stakeAmount} ETH successfully!`);
    } catch (err: any) {
      console.error('Stake failed:', err);
      setError('Stake failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Skip stake and continue
  const handleSkipStake = () => {
    if (!depositDone) {
      setError('You must deposit ETH before continuing');
      return;
    }
    onComplete();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 3: Stake to EntryPoint</h2>
      <p className="text-gray-600 mb-6">
        Deposit and optionally stake ETH to EntryPoint v0.7 for gas sponsorship.
      </p>

      {/* Current balance display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Current EntryPoint Balance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Deposit (Available)</div>
            <div className="text-2xl font-bold text-blue-600">{currentDeposit} ETH</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Stake (Locked)</div>
            <div className="text-2xl font-bold text-green-600">
              {currentStake} ETH {isStaked && '🔒'}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-xl font-semibold mb-2">3.1 Deposit ETH (Required)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Deposit ETH to EntryPoint so your Paymaster can sponsor gas fees.
        </p>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1">Amount (ETH)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0.1"
            />
            <p className="mt-1 text-xs text-gray-500">Recommended: ≥ 0.1 ETH</p>
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Depositing...' : 'Deposit'}
          </button>
        </div>

        {depositDone && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            ✅ Deposit complete
          </div>
        )}
      </div>

      {/* Stake section */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-xl font-semibold mb-2">3.2 Stake ETH (Optional)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Staking increases your Paymaster's reputation and trustworthiness. This is optional but recommended.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Stake Amount (ETH)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0.05"
            />
            <p className="mt-1 text-xs text-gray-500">Recommended: ≥ 0.05 ETH</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Unstake Delay (seconds)</label>
            <input
              type="number"
              value={unstakeDelay}
              onChange={(e) => setUnstakeDelay(e.target.value)}
              step="1"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="86400"
            />
            <p className="mt-1 text-xs text-gray-500">
              86400 = 1 day, 604800 = 1 week. Longer delay = higher reputation.
            </p>
          </div>

          <button
            onClick={handleStake}
            disabled={loading}
            className="w-full px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading ? 'Staking...' : 'Add Stake'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">💡 Deposit vs Stake</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Deposit</strong>: Available balance for paying gas. Can be withdrawn anytime.</li>
          <li>• <strong>Stake</strong>: Locked balance to prove commitment. Increases reputation.</li>
          <li>• You MUST deposit, but staking is optional.</li>
          <li>• Higher stake = higher trust from users and EntryPoint.</li>
        </ul>
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
        <button
          onClick={handleSkipStake}
          disabled={loading || !depositDone}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          {depositDone ? 'Continue to Register' : 'Deposit ETH first'}
        </button>
      </div>
    </div>
  );
}
