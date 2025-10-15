import { useState } from "react";
import { ethers } from "ethers";
import "./DeployPaymaster.css";

// PaymasterV4_1 bytecode and ABI will be imported from compiled artifacts
// For now, we'll use a placeholder that will be replaced with actual deployment

interface DeployConfig {
  communityName: string;
  treasury: string;
  gasToUSDRate: string; // in ETH, will convert to 18 decimals
  pntPriceUSD: string; // in USD, will convert to 18 decimals
  serviceFeeRate: string; // in percentage (0-10)
  maxGasCostCap: string; // in ETH
  minTokenBalance: string; // in PNT
}

interface DeployPaymasterProps {
  onComplete: (address: string, owner: string) => void;
}

const ENTRY_POINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

export function DeployPaymaster({ onComplete }: DeployPaymasterProps) {
  const [config, setConfig] = useState<DeployConfig>({
    communityName: "",
    treasury: "",
    gasToUSDRate: "4500", // $4500/ETH default
    pntPriceUSD: "0.02", // $0.02/PNT default
    serviceFeeRate: "2", // 2% default
    maxGasCostCap: "0.1", // 0.1 ETH default
    minTokenBalance: "100", // 100 PNT default
  });

  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

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
    } catch (err: any) {
      setError("Failed to connect wallet: " + err.message);
    }
  };

  // Update config
  const updateConfig = (field: keyof DeployConfig, value: string) => {
    setConfig({ ...config, [field]: value });
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!config.communityName.trim()) {
      setError("Please enter community name");
      return false;
    }

    if (!ethers.isAddress(config.treasury)) {
      setError("Invalid treasury address");
      return false;
    }

    const serviceFeeRate = parseFloat(config.serviceFeeRate);
    if (isNaN(serviceFeeRate) || serviceFeeRate < 0 || serviceFeeRate > 10) {
      setError("Service fee rate must be between 0% and 10%");
      return false;
    }

    return true;
  };

  // Deploy Paymaster contract
  const handleDeploy = async () => {
    if (!validateForm()) return;
    if (!connectedAddress) {
      setError("Please connect wallet first");
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Convert values to contract parameters
      const gasToUSDRate = ethers.parseUnits(config.gasToUSDRate, 18);
      const pntPriceUSD = ethers.parseUnits(config.pntPriceUSD, 18);
      const serviceFeeRate = Math.floor(
        parseFloat(config.serviceFeeRate) * 100,
      ); // Convert to basis points
      const maxGasCostCap = ethers.parseEther(config.maxGasCostCap);
      const minTokenBalance = ethers.parseUnits(config.minTokenBalance, 18);

      // TODO: Replace with actual PaymasterV4_1 factory deployment
      // For now, we'll use a placeholder transaction
      console.log("Deploying with params:", {
        entryPoint: ENTRY_POINT_V07,
        owner: connectedAddress,
        treasury: config.treasury,
        gasToUSDRate: gasToUSDRate.toString(),
        pntPriceUSD: pntPriceUSD.toString(),
        serviceFeeRate,
        maxGasCostCap: maxGasCostCap.toString(),
        minTokenBalance: minTokenBalance.toString(),
      });

      // Placeholder: In production, this would deploy the actual contract
      // const factory = new ethers.ContractFactory(ABI, BYTECODE, signer);
      // const paymaster = await factory.deploy(
      //   ENTRY_POINT_V07,
      //   connectedAddress,
      //   config.treasury,
      //   gasToUSDRate,
      //   pntPriceUSD,
      //   serviceFeeRate,
      //   maxGasCostCap,
      //   minTokenBalance
      // );
      // await paymaster.waitForDeployment();
      // const address = await paymaster.getAddress();

      // Temporary simulation for development
      alert(
        "⚠️ Deployment simulation\n\nIn production, this will deploy PaymasterV4_1 contract.\n\nFor now, you can test with an existing Paymaster address.",
      );

      // For testing, allow entering existing Paymaster address
      const existingAddress = prompt(
        "Enter existing PaymasterV4_1 address for testing:",
      );
      if (existingAddress && ethers.isAddress(existingAddress)) {
        onComplete(existingAddress, connectedAddress);
      } else {
        setError("Invalid address provided");
      }
    } catch (err: any) {
      console.error("Deployment error:", err);
      setError("Deployment failed: " + err.message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="deploy-container">
      <h2 className="deploy-title">Step 1: Deploy Paymaster</h2>
      <p className="deploy-subtitle">
        Deploy a new PaymasterV4_1 contract for your community. You will become
        the owner.
      </p>

      {/* Wallet connection */}
      <div className="wallet-section">
        <h3 className="wallet-section-title">Wallet Connection</h3>
        {!connectedAddress ? (
          <button onClick={connectWallet} className="connect-button">
            Connect MetaMask
          </button>
        ) : (
          <div className="wallet-connected">
            <span className="wallet-connected-icon">✓</span>
            <span className="wallet-address">{connectedAddress}</span>
          </div>
        )}
      </div>

      {/* Configuration form */}
      <div className="form-section">
        <FormField
          label="Community Name"
          value={config.communityName}
          onChange={(v) => updateConfig("communityName", v)}
          placeholder="e.g., MyAwesomeDAO"
          required
        />

        <FormField
          label="Treasury Address"
          value={config.treasury}
          onChange={(v) => updateConfig("treasury", v)}
          placeholder="0x..."
          helpText="Recommend using a multi-sig wallet for security"
          required
        />

        <FormField
          label="Gas to USD Rate"
          value={config.gasToUSDRate}
          onChange={(v) => updateConfig("gasToUSDRate", v)}
          placeholder="4500"
          helpText="USD price per ETH (e.g., 4500 = $4500/ETH)"
          type="number"
        />

        <FormField
          label="PNT Price USD"
          value={config.pntPriceUSD}
          onChange={(v) => updateConfig("pntPriceUSD", v)}
          placeholder="0.02"
          helpText="USD price per PNT token (e.g., 0.02 = $0.02/PNT)"
          type="number"
        />

        <FormField
          label="Service Fee Rate (%)"
          value={config.serviceFeeRate}
          onChange={(v) => updateConfig("serviceFeeRate", v)}
          placeholder="2"
          helpText="Fee charged on gas payments (max 10%)"
          type="number"
          min="0"
          max="10"
        />

        <FormField
          label="Max Gas Cost Cap (ETH)"
          value={config.maxGasCostCap}
          onChange={(v) => updateConfig("maxGasCostCap", v)}
          placeholder="0.1"
          helpText="Maximum gas cost per transaction"
          type="number"
        />

        <FormField
          label="Min Token Balance (PNT)"
          value={config.minTokenBalance}
          onChange={(v) => updateConfig("minTokenBalance", v)}
          placeholder="100"
          helpText="Minimum PNT balance required for users"
          type="number"
        />
      </div>

      {/* Error message */}
      {error && <div className="deploy-error">{error}</div>}

      {/* Deploy button */}
      <div className="deploy-buttons">
        <button
          onClick={handleDeploy}
          disabled={!connectedAddress || deploying}
          className={`deploy-button ${!connectedAddress || deploying ? "" : "primary"}`}
        >
          {deploying ? "Deploying..." : "Deploy Paymaster"}
        </button>
      </div>

      {/* Info box */}
      <div className="deploy-info-box">
        <h4 className="deploy-info-title">💡 Deployment Info</h4>
        <ul className="deploy-info-list">
          <li>• Estimated gas cost: ~0.02 ETH</li>
          <li>• You will be the contract owner</li>
          <li>• Treasury address can be changed later</li>
          <li>• All parameters can be adjusted after deployment</li>
        </ul>
      </div>
    </div>
  );
}

// Form field component
function FormField({
  label,
  value,
  onChange,
  placeholder,
  helpText,
  required = false,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        {required && <span className="form-label-required">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="form-input"
      />
      {helpText && <p className="form-help-text">{helpText}</p>}
    </div>
  );
}
