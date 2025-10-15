import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./RegisterToRegistry.css";

interface RegisterToRegistryProps {
  paymasterAddress: string;
  onComplete: () => void;
  onBack: () => void;
}

const GTOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) external returns (bool)",
  "function allowance(address, address) view returns (uint256)",
];

const REGISTRY_ABI = [
  "function registerPaymaster(address, uint256, string) external",
  "function isPaymasterActive(address) view returns (bool)",
  "function paymasters(address) view returns (address, string, uint256, uint256, uint256, bool, uint256, uint256, uint256, uint256)",
];

export function RegisterToRegistry({
  paymasterAddress,
  onComplete,
  onBack,
}: RegisterToRegistryProps) {
  const [gTokenBalance, setGTokenBalance] = useState("0");
  const [stakeAmount, setStakeAmount] = useState("10");
  const [metadata, setMetadata] = useState("");
  const [approved, setApproved] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gTokenAddress = import.meta.env.VITE_GTOKEN_ADDRESS || "";
  const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS || "";

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
        const registry = new ethers.Contract(
          registryAddress,
          REGISTRY_ABI,
          provider,
        );
        const isActive = await registry.isPaymasterActive(paymasterAddress);
        setRegistered(isActive);
      } catch (err) {
        console.error("Failed to load balances:", err);
      }
    }

    loadBalances();
  }, [paymasterAddress, gTokenAddress, registryAddress]);

  // Approve GToken
  const handleApprove = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount < 10) {
      setError("Minimum stake is 10 GToken");
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
        ethers.parseUnits(stakeAmount, 18),
      );
      await tx.wait();
      console.log("Approval successful");

      setApproved(true);
      alert(`✅ Approved ${stakeAmount} GToken`);
    } catch (err: any) {
      console.error("Approval failed:", err);
      setError("Approval failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Register to Registry
  const handleRegister = async () => {
    if (!approved) {
      setError("Please approve GToken first");
      return;
    }

    if (!metadata.trim()) {
      setError("Please enter metadata (community description)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(
        registryAddress,
        REGISTRY_ABI,
        signer,
      );

      console.log("Registering Paymaster:", {
        paymaster: paymasterAddress,
        stake: stakeAmount,
        metadata,
      });

      const tx = await registry.registerPaymaster(
        paymasterAddress,
        ethers.parseUnits(stakeAmount, 18),
        metadata,
      );
      await tx.wait();
      console.log("Registration successful");

      setRegistered(true);
      alert(
        "🎉 Registration successful!\n\nYour Paymaster is now live in the SuperPaymaster Registry!",
      );
      onComplete();
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError("Registration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="register-container">
        <h2 className="register-title">Step 4: Register to Registry</h2>
        <div className="success-container">
          <div className="success-emoji">🎉</div>
          <h3 className="success-title">Already Registered!</h3>
          <p className="success-text">
            This Paymaster is already active in the Registry.
          </p>
          <button onClick={onComplete} className="success-button">
            Continue to Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <h2 className="register-title">Step 4: Register to Registry</h2>
      <p className="register-subtitle">
        Stake GToken and register your Paymaster to the SuperPaymaster Registry.
      </p>

      {/* GToken balance */}
      <div className="balance-container">
        <h3 className="balance-title">Your GToken Balance</h3>
        <div className="balance-amount">{gTokenBalance} GToken</div>
        {parseFloat(gTokenBalance) < 10 && (
          <div className="balance-warning">
            ⚠️ Insufficient balance. Minimum: 10 GToken
          </div>
        )}
      </div>

      {/* Get GToken section */}
      <div className="section-container">
        <h3 className="section-title">4.1 Get GToken</h3>
        <p className="section-description">
          You need GToken to stake and register your Paymaster.
        </p>

        <div className="gtoken-buttons">
          <button className="gtoken-button">
            <div className="gtoken-button-title">🚰 Testnet Faucet</div>
            <div className="gtoken-button-subtitle">
              Get 20 GToken for testing
            </div>
          </button>
          <button className="gtoken-button">
            <div className="gtoken-button-title">💱 Buy on Uniswap</div>
            <div className="gtoken-button-subtitle">For mainnet deployment</div>
          </button>
        </div>
      </div>

      {/* Approve section */}
      <div className="section-container">
        <h3 className="section-title">4.2 Approve GToken</h3>
        <p className="section-description">
          Approve Registry contract to use your GToken for staking.
        </p>

        <div className="approve-controls">
          <div className="approve-input-group">
            <label className="input-label">Stake Amount (GToken)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min="10"
              step="1"
              className="stake-input"
              placeholder="10"
            />
            <p className="input-hint">Minimum: 10 GToken</p>
          </div>

          <button
            onClick={handleApprove}
            disabled={loading || approved}
            className="approve-button"
          >
            {approved ? "✓ Approved" : loading ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>

      {/* Register section */}
      <div className="section-container">
        <h3 className="section-title">4.3 Register Paymaster</h3>
        <p className="section-description">
          Provide metadata and complete registration.
        </p>

        <div className="metadata-group">
          <label className="input-label">
            Community Description / Metadata
          </label>
          <textarea
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            rows={3}
            className="metadata-textarea"
            placeholder="e.g., MyDAO Paymaster - Serving 1000+ members with PNT-based gas payments"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={loading || !approved}
          className="register-button"
        >
          {loading ? "Registering..." : "🎉 Register to Registry"}
        </button>
      </div>

      {/* Info box */}
      <div className="info-box">
        <h4 className="info-box-title">📋 Registration Process</h4>
        <ol className="info-box-list">
          <li>1. Approve GToken (ERC20 approval)</li>
          <li>2. Registry pulls GToken from your wallet (stake)</li>
          <li>3. Your Paymaster is marked as Active</li>
          <li>4. Users can now discover and use your Paymaster!</li>
        </ol>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Navigation buttons */}
      <div className="navigation-buttons">
        <button onClick={onBack} className="back-button" disabled={loading}>
          Back
        </button>
      </div>
    </div>
  );
}
