import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./FindPaymaster.css";

interface FindPaymasterProps {
  onComplete: (address: string) => void;
  onBack: () => void;
}

const REGISTRY_ABI = [
  "function getActivePaymasters() external view returns (address[])",
  "function getPaymasterInfo(address paymaster) view returns (uint256 feeRate, bool isActive, uint256 successCount, uint256 totalAttempts, string memory name)",
];

const PAYMASTER_ABI = [
  "function owner() view returns (address)",
];

interface PaymasterInfo {
  address: string;
  name: string;
  isOwner: boolean;
  feeRate: number;
  successCount: number;
  totalAttempts: number;
}

export function FindPaymaster({ onComplete, onBack }: FindPaymasterProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymasters, setPaymasters] = useState<PaymasterInfo[]>([]);
  const [manualAddress, setManualAddress] = useState("");

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setConnectedAddress(accounts[0]);
      setError(null);

      // Auto-query after connecting
      await queryPaymasters(accounts[0]);
    } catch (err: any) {
      setError("Failed to connect wallet: " + err.message);
    }
  };

  // Query all paymasters from Registry and check ownership
  const queryPaymasters = async (userAddress: string) => {
    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS;

      if (!registryAddress) {
        throw new Error("Registry address not configured");
      }

      const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);

      // Get all active paymasters
      const addresses = await registry.getActivePaymasters();
      console.log(`Found ${addresses.length} active Paymasters`);

      // Check each paymaster for ownership and get info
      const results: PaymasterInfo[] = [];

      for (const address of addresses) {
        try {
          // Get paymaster info from registry
          const info = await registry.getPaymasterInfo(address);

          // Check ownership
          const paymaster = new ethers.Contract(address, PAYMASTER_ABI, provider);
          const owner = await paymaster.owner();
          const isOwner = owner.toLowerCase() === userAddress.toLowerCase();

          results.push({
            address,
            name: info.name || "Unnamed Paymaster",
            isOwner,
            feeRate: Number(info.feeRate) / 100,
            successCount: Number(info.successCount),
            totalAttempts: Number(info.totalAttempts),
          });
        } catch (err) {
          console.error(`Failed to query ${address}:`, err);
        }
      }

      // Sort: owned paymasters first
      results.sort((a, b) => {
        if (a.isOwner && !b.isOwner) return -1;
        if (!a.isOwner && b.isOwner) return 1;
        return 0;
      });

      setPaymasters(results);

      if (results.filter(pm => pm.isOwner).length === 0) {
        setError("No Paymasters found owned by your wallet. You can enter a Paymaster address manually or deploy a new one.");
      }
    } catch (err: any) {
      console.error("Failed to query Registry:", err);
      setError("Failed to query Registry: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual address input
  const handleManualSubmit = () => {
    if (!manualAddress.trim()) {
      setError("Please enter a Paymaster address");
      return;
    }

    if (!ethers.isAddress(manualAddress)) {
      setError("Invalid address format");
      return;
    }

    onComplete(manualAddress.trim());
  };

  // Auto-connect on mount if already connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const address = accounts[0].address;
            setConnectedAddress(address);
            await queryPaymasters(address);
          }
        } catch (err) {
          console.log("Auto-connect failed:", err);
        }
      }
    };

    autoConnect();
  }, []);

  return (
    <div className="find-paymaster-container">
      <h2 className="find-title">Find Your Paymaster</h2>
      <p className="find-subtitle">
        Connect your wallet to find Paymasters you own, or enter a Paymaster address manually.
      </p>

      {/* Wallet connection */}
      <div className="wallet-section">
        <h3 className="section-title">Wallet Connection</h3>
        {!connectedAddress ? (
          <button onClick={connectWallet} className="connect-button">
            Connect MetaMask
          </button>
        ) : (
          <div className="wallet-connected">
            <span className="wallet-icon">✓</span>
            <span className="wallet-address">{connectedAddress}</span>
            <button
              onClick={() => queryPaymasters(connectedAddress)}
              disabled={loading}
              className="refresh-button"
            >
              {loading ? "🔄 Querying..." : "🔄 Refresh"}
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Querying Registry for your Paymasters...</p>
        </div>
      )}

      {/* Paymasters list */}
      {!loading && paymasters.length > 0 && (
        <div className="paymasters-section">
          <h3 className="section-title">
            Found {paymasters.filter(pm => pm.isOwner).length} Paymaster(s) You Own
          </h3>
          <div className="paymasters-list">
            {paymasters.map((pm) => (
              <div
                key={pm.address}
                className={`paymaster-card ${pm.isOwner ? 'owned' : 'not-owned'}`}
              >
                <div className="paymaster-header">
                  <h4 className="paymaster-name">
                    {pm.isOwner && <span className="owner-badge">👤 Owner</span>}
                    {pm.name}
                  </h4>
                  {pm.isOwner && (
                    <button
                      onClick={() => onComplete(pm.address)}
                      className="select-button"
                    >
                      Select
                    </button>
                  )}
                </div>
                <div className="paymaster-info">
                  <div className="info-row">
                    <span className="info-label">Address:</span>
                    <span className="info-value address">{pm.address}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Fee Rate:</span>
                    <span className="info-value">{pm.feeRate}%</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Transactions:</span>
                    <span className="info-value">
                      {pm.successCount} / {pm.totalAttempts}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual input section */}
      <div className="manual-section">
        <h3 className="section-title">Or Enter Address Manually</h3>
        <div className="manual-input-group">
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="0x..."
            className="manual-input"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualAddress.trim()}
            className="submit-button"
          >
            Continue
          </button>
        </div>
        <p className="manual-hint">
          💡 You can manage any Paymaster address, but you'll need to be the owner to perform administrative actions.
        </p>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Back button */}
      <div className="back-button-container">
        <button onClick={onBack} className="back-button">
          ← Back to Start
        </button>
      </div>
    </div>
  );
}
