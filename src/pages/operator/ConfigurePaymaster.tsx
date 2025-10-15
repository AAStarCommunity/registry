import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./ConfigurePaymaster.css";

interface ConfigurePaymasterProps {
  paymasterAddress: string;
  onComplete: (sbtAddress: string, gasTokenAddress: string) => void;
  onBack: () => void;
}

const PAYMASTER_V4_ABI = [
  "function owner() view returns (address)",
  "function addSBT(address) external",
  "function addGasToken(address) external",
  "function sbtList(uint256) view returns (address)",
  "function gasTokenList(uint256) view returns (address)",
];

export function ConfigurePaymaster({
  paymasterAddress,
  onComplete,
  onBack,
}: ConfigurePaymasterProps) {
  const [sbtMode, setSbtMode] = useState<"existing" | "deploy">("existing");
  const [sbtAddress, setSbtAddress] = useState("");
  const [gasTokenMode, setGasTokenMode] = useState<"existing" | "deploy">(
    "existing",
  );
  const [gasTokenAddress, setGasTokenAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [step, setStep] = useState<"sbt" | "gastoken" | "link">("sbt");

  // Check ownership
  useEffect(() => {
    async function checkOwnership() {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        const paymaster = new ethers.Contract(
          paymasterAddress,
          PAYMASTER_V4_ABI,
          provider,
        );

        const owner = await paymaster.owner();
        setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());
      } catch (err) {
        console.error("Failed to check ownership:", err);
      }
    }

    checkOwnership();
  }, [paymasterAddress]);

  // Handle SBT setup
  const handleSBTSetup = async () => {
    if (sbtMode === "existing") {
      if (!ethers.isAddress(sbtAddress)) {
        setError("Invalid SBT address");
        return;
      }
      setStep("gastoken");
    } else {
      // Deploy new SBT
      setLoading(true);
      setError(null);

      try {
        // TODO: Implement SBT factory deployment
        alert(
          "⚠️ SBT Factory deployment not yet implemented\n\nPlease use an existing SBT contract for now.",
        );
        setError('Please select "Use Existing SBT"');
      } catch (err: any) {
        setError("SBT deployment failed: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle GasToken setup
  const handleGasTokenSetup = async () => {
    if (gasTokenMode === "existing") {
      if (!ethers.isAddress(gasTokenAddress)) {
        setError("Invalid GasToken address");
        return;
      }
      setStep("link");
    } else {
      // Deploy new GasToken
      setLoading(true);
      setError(null);

      try {
        // TODO: Implement GasTokenFactoryV2 deployment
        alert(
          "⚠️ GasToken Factory deployment not yet implemented\n\nPlease use an existing GasToken contract for now.",
        );
        setError('Please select "Use Existing GasToken"');
      } catch (err: any) {
        setError("GasToken deployment failed: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Link SBT and GasToken to Paymaster
  const handleLinkToPaymaster = async () => {
    if (!isOwner) {
      setError("You are not the owner of this Paymaster");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(
        paymasterAddress,
        PAYMASTER_V4_ABI,
        signer,
      );

      // Add SBT
      console.log("Adding SBT:", sbtAddress);
      const sbtTx = await paymaster.addSBT(sbtAddress);
      await sbtTx.wait();
      console.log("SBT added successfully");

      // Add GasToken
      console.log("Adding GasToken:", gasTokenAddress);
      const tokenTx = await paymaster.addGasToken(gasTokenAddress);
      await tokenTx.wait();
      console.log("GasToken added successfully");

      alert(
        "✅ Configuration complete!\n\nSBT and GasToken have been linked to your Paymaster.",
      );
      onComplete(sbtAddress, gasTokenAddress);
    } catch (err: any) {
      console.error("Link failed:", err);
      setError("Failed to link contracts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner && window.ethereum) {
    return (
      <div>
        <h2 className="configure-title">Step 2: Configure Paymaster</h2>
        <div className="error-box-red">
          ⚠️ You are not the owner of this Paymaster contract.
        </div>
        <button
          onClick={onBack}
          className="configure-button secondary"
          style={{ marginTop: "1rem" }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="configure-title">Step 2: Configure Paymaster</h2>
      <p className="configure-subtitle">
        Set up SBT (membership verification) and GasToken (payment token) for
        your Paymaster.
      </p>

      {/* Progress sub-steps */}
      <div className="progress-steps">
        <SubStep
          label="SBT"
          active={step === "sbt"}
          completed={step !== "sbt"}
        />
        <div className="progress-line"></div>
        <SubStep
          label="GasToken"
          active={step === "gastoken"}
          completed={step === "link"}
        />
        <div className="progress-line"></div>
        <SubStep label="Link" active={step === "link"} completed={false} />
      </div>

      {/* Step: SBT */}
      {step === "sbt" && (
        <div>
          <h3 className="section-title-lg">2.1 Set up SBT Contract</h3>
          <p className="configure-subtitle">
            SBT (Soulbound Token) is used to verify community membership.
          </p>

          <div className="radio-options">
            <label className="radio-option">
              <input
                type="radio"
                checked={sbtMode === "existing"}
                onChange={() => setSbtMode("existing")}
              />
              <div>
                <div className="radio-option-title">
                  Use Existing SBT Contract
                </div>
                <div className="radio-option-desc">
                  Enter an existing SBT contract address
                </div>
              </div>
            </label>

            {sbtMode === "existing" && (
              <input
                type="text"
                value={sbtAddress}
                onChange={(e) => setSbtAddress(e.target.value)}
                placeholder="0x..."
                className="address-input"
              />
            )}

            <label className="radio-option">
              <input
                type="radio"
                checked={sbtMode === "deploy"}
                onChange={() => setSbtMode("deploy")}
              />
              <div>
                <div className="radio-option-title">Deploy New SBT</div>
                <div className="radio-option-desc">
                  Use factory contract to deploy (not yet implemented)
                </div>
              </div>
            </label>
          </div>

          <button
            onClick={handleSBTSetup}
            disabled={loading || (sbtMode === "existing" && !sbtAddress)}
            className="configure-button primary"
            style={{ marginTop: "1.5rem" }}
          >
            Next: Configure GasToken
          </button>
        </div>
      )}

      {/* Step: GasToken */}
      {step === "gastoken" && (
        <div>
          <h3 className="section-title-lg">2.2 Set up GasToken (PNT)</h3>
          <p className="configure-subtitle">
            GasToken is the ERC20 token users will use to pay for gas.
          </p>

          <div className="radio-options">
            <label className="radio-option">
              <input
                type="radio"
                checked={gasTokenMode === "existing"}
                onChange={() => setGasTokenMode("existing")}
              />
              <div>
                <div className="radio-option-title">
                  Use Existing GasToken Contract
                </div>
                <div className="radio-option-desc">
                  Enter an existing GasToken address
                </div>
              </div>
            </label>

            {gasTokenMode === "existing" && (
              <input
                type="text"
                value={gasTokenAddress}
                onChange={(e) => setGasTokenAddress(e.target.value)}
                placeholder="0x..."
                className="address-input"
              />
            )}

            <label className="radio-option">
              <input
                type="radio"
                checked={gasTokenMode === "deploy"}
                onChange={() => setGasTokenMode("deploy")}
              />
              <div>
                <div className="radio-option-title">Deploy New GasToken</div>
                <div className="radio-option-desc">
                  Use GasTokenFactoryV2 (not yet implemented)
                </div>
              </div>
            </label>
          </div>

          <div className="configure-buttons">
            <button
              onClick={() => setStep("sbt")}
              className="configure-button secondary"
            >
              Back
            </button>
            <button
              onClick={handleGasTokenSetup}
              disabled={
                loading || (gasTokenMode === "existing" && !gasTokenAddress)
              }
              className="configure-button primary"
            >
              Next: Link to Paymaster
            </button>
          </div>
        </div>
      )}

      {/* Step: Link */}
      {step === "link" && (
        <div>
          <h3 className="section-title-lg">2.3 Link to Paymaster</h3>
          <p className="configure-subtitle">
            Connect the SBT and GasToken contracts to your Paymaster.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <div className="info-box-gray-sm">
              <div className="info-box-label">SBT Address:</div>
              <div className="info-box-value">{sbtAddress}</div>
            </div>
            <div className="info-box-gray-sm">
              <div className="info-box-label">GasToken Address:</div>
              <div className="info-box-value">{gasTokenAddress}</div>
            </div>
            <div className="info-box-gray-sm">
              <div className="info-box-label">Paymaster Address:</div>
              <div className="info-box-value">{paymasterAddress}</div>
            </div>
          </div>

          <div className="info-box-blue-lg">
            <h4 className="info-box-title-sm">📋 Actions to be performed:</h4>
            <ol className="info-box-list">
              <li>1. Call paymaster.addSBT({sbtAddress.slice(0, 10)}...)</li>
              <li>
                2. Call paymaster.addGasToken({gasTokenAddress.slice(0, 10)}...)
              </li>
            </ol>
          </div>

          {error && <div className="configure-error">{error}</div>}

          <div className="configure-buttons">
            <button
              onClick={() => setStep("gastoken")}
              className="configure-button secondary"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleLinkToPaymaster}
              disabled={loading}
              className="configure-button success"
            >
              {loading ? "Linking..." : "Link to Paymaster"}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && step !== "link" && (
        <div className="configure-error">{error}</div>
      )}
    </div>
  );
}

// Sub-step indicator
function SubStep({
  label,
  active,
  completed,
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  const getClassName = () => {
    if (completed) return "sub-step completed";
    if (active) return "sub-step active";
    return "sub-step inactive";
  };

  return (
    <div className={getClassName()}>
      {completed ? "✓ " : ""}
      {label}
    </div>
  );
}
