import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./StakeEntryPoint.css";

interface StakeEntryPointProps {
  paymasterAddress: string;
  onComplete: () => void;
  onBack: () => void;
}

const ENTRY_POINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

const ENTRY_POINT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function depositTo(address) payable",
  "function getDepositInfo(address) view returns (uint256 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)",
  "function addStake(uint32) payable",
];

export function StakeEntryPoint({
  paymasterAddress,
  onComplete,
  onBack,
}: StakeEntryPointProps) {
  const [depositAmount, setDepositAmount] = useState("0.1");
  const [stakeAmount, setStakeAmount] = useState("0.05");
  const [unstakeDelay, setUnstakeDelay] = useState("86400"); // 1 day in seconds

  const [currentDeposit, setCurrentDeposit] = useState("0");
  const [currentStake, setCurrentStake] = useState("0");
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
          provider,
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
        console.error("Failed to load deposit info:", err);
      }
    }

    loadDepositInfo();
  }, [paymasterAddress]);

  // Deposit ETH to EntryPoint
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount");
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
        signer,
      );

      console.log(
        `Depositing ${depositAmount} ETH to EntryPoint for Paymaster`,
      );
      const tx = await entryPoint.depositTo(paymasterAddress, {
        value: ethers.parseEther(depositAmount),
      });

      await tx.wait();
      console.log("Deposit successful");

      // Reload balance
      const info = await entryPoint.getDepositInfo(paymasterAddress);
      setCurrentDeposit(ethers.formatEther(info.deposit));
      setDepositDone(true);

      alert(`✅ Deposited ${depositAmount} ETH successfully!`);
    } catch (err: any) {
      console.error("Deposit failed:", err);
      setError("Deposit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stake ETH to EntryPoint
  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid stake amount");
      return;
    }

    const delay = parseInt(unstakeDelay);
    if (isNaN(delay) || delay < 0) {
      setError("Please enter a valid unstake delay");
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
        signer,
      );

      console.log(`Staking ${stakeAmount} ETH with ${unstakeDelay}s delay`);
      const tx = await entryPoint.addStake(delay, {
        value: ethers.parseEther(stakeAmount),
      });

      await tx.wait();
      console.log("Stake successful");

      // Reload balance
      const info = await entryPoint.getDepositInfo(paymasterAddress);
      setCurrentStake(ethers.formatEther(info.stake));
      setIsStaked(info.staked);

      alert(`✅ Staked ${stakeAmount} ETH successfully!`);
    } catch (err: any) {
      console.error("Stake failed:", err);
      setError("Stake failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Skip stake and continue
  const handleSkipStake = () => {
    if (!depositDone) {
      setError("You must deposit ETH before continuing");
      return;
    }
    onComplete();
  };

  return (
    <div className="stake-container">
      <h2 className="stake-title">Step 3: Stake to EntryPoint</h2>
      <p className="stake-description">
        Deposit and optionally stake ETH to EntryPoint v0.7 for gas sponsorship.
      </p>

      {/* Current balance display */}
      <div className="balance-container">
        <h3 className="balance-title">Current EntryPoint Balance</h3>
        <div className="balance-grid">
          <div>
            <div className="balance-item-label">Deposit (Available)</div>
            <div className="balance-amount deposit">{currentDeposit} ETH</div>
          </div>
          <div>
            <div className="balance-item-label">Stake (Locked)</div>
            <div className="balance-amount stake">
              {currentStake} ETH {isStaked && "🔒"}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit section */}
      <div className="section-card">
        <h3 className="section-title">3.1 Deposit ETH (Required)</h3>
        <p className="section-description">
          Deposit ETH to EntryPoint so your Paymaster can sponsor gas fees.
        </p>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Amount (ETH)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              step="0.01"
              min="0"
              className="form-input"
              placeholder="0.1"
            />
            <p className="form-hint">Recommended: ≥ 0.1 ETH</p>
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Depositing..." : "Deposit"}
          </button>
        </div>

        {depositDone && (
          <div className="success-message">✅ Deposit complete</div>
        )}
      </div>

      {/* Stake section */}
      <div className="section-card">
        <h3 className="section-title">3.2 Stake ETH (Optional)</h3>
        <p className="section-description">
          Staking increases your Paymaster's reputation and trustworthiness.
          This is optional but recommended.
        </p>

        <div className="form-fields-group">
          <div>
            <label className="form-label">Stake Amount (ETH)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              step="0.01"
              min="0"
              className="form-input"
              placeholder="0.05"
            />
            <p className="form-hint">Recommended: ≥ 0.05 ETH</p>
          </div>

          <div>
            <label className="form-label">Unstake Delay (seconds)</label>
            <input
              type="number"
              value={unstakeDelay}
              onChange={(e) => setUnstakeDelay(e.target.value)}
              step="1"
              min="0"
              className="form-input"
              placeholder="86400"
            />
            <p className="form-hint">
              86400 = 1 day, 604800 = 1 week. Longer delay = higher reputation.
            </p>
          </div>

          <button
            onClick={handleStake}
            disabled={loading}
            className="btn btn-success btn-full"
          >
            {loading ? "Staking..." : "Add Stake"}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="info-box">
        <h4 className="info-title">💡 Deposit vs Stake</h4>
        <ul className="info-list">
          <li>
            • <strong>Deposit</strong>: Available balance for paying gas. Can be
            withdrawn anytime.
          </li>
          <li>
            • <strong>Stake</strong>: Locked balance to prove commitment.
            Increases reputation.
          </li>
          <li>• You MUST deposit, but staking is optional.</li>
          <li>• Higher stake = higher trust from users and EntryPoint.</li>
        </ul>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Navigation buttons */}
      <div className="nav-buttons">
        <button
          onClick={onBack}
          className="btn btn-secondary btn-large"
          disabled={loading}
        >
          Back
        </button>
        <button
          onClick={handleSkipStake}
          disabled={loading || !depositDone}
          className="btn btn-primary btn-large btn-flex"
        >
          {depositDone ? "Continue to Register" : "Deposit ETH first"}
        </button>
      </div>
    </div>
  );
}
