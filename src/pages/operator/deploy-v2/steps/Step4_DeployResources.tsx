/**
 * Step4_DeployResources Component
 *
 * Deploy required resources for both AOA and Super modes:
 * 1. Use existing MySBT contract (or deploy new)
 * 2. Deploy xPNTs Token via xPNTsFactory
 * 3. Stake GToken → get sGToken
 */

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import type { WalletStatus } from "../utils/walletChecker";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import "./Step4_DeployResources.css";

export interface Step4Props {
  walletStatus: WalletStatus;
  communityName: string;
  onNext: (resources: DeployedResources) => void;
  onBack: () => void;
}

export interface DeployedResources {
  sbtAddress: string;
  xPNTsAddress: string;
  sGTokenAmount: string;
  gTokenStakeTxHash: string;
}

// Get contract addresses from shared-config via networkConfig
const networkConfig = getCurrentNetworkConfig();
const MYSBT_ADDRESS = networkConfig.contracts.mySBT;
const XPNTS_FACTORY_ADDRESS = networkConfig.contracts.xPNTsFactory;
const GTOKEN_ADDRESS = networkConfig.contracts.gToken;
const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;

// Helper function to get block explorer URL
const getExplorerUrl = (address: string): string => {
  const network = getCurrentNetworkConfig();
  const baseUrl = network.chainId === 11155111
    ? "https://sepolia.etherscan.io"
    : "https://etherscan.io";
  return `${baseUrl}/address/${address}`;
};

// ABIs
const XPNTS_FACTORY_ABI = [
  "function deployxPNTsToken(string memory name, string memory symbol, string memory communityName, string memory communityENS, uint256 exchangeRate, address paymasterAOA) external returns (address)",
  "function hasToken(address community) external view returns (bool)",
  "function getTokenAddress(address community) external view returns (address)",
];

const GTOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

const GTOKEN_STAKING_ABI = [
  "function stake(uint256 amount) external returns (uint256 shares)",
  "function balanceOf(address account) external view returns (uint256)",
  "function getStakeInfo(address user) external view returns (tuple(uint256 amount, uint256 sGTokenShares, uint256 stakedAt, uint256 unstakeRequestedAt))",
];

// Sub-steps
const ResourceStep = {
  SelectSBT: 1,
  DeployXPNTs: 2,
  StakeGToken: 3,
  Complete: 4,
} as const;

type ResourceStepType = typeof ResourceStep[keyof typeof ResourceStep];

export function Step4_DeployResources({
  walletStatus,
  communityName,
  onNext,
  onBack,
}: Step4Props) {
  const [currentStep, setCurrentStep] = useState<ResourceStepType>(ResourceStep.SelectSBT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resource state
  const [sbtAddress, setSbtAddress] = useState<string>(MYSBT_ADDRESS);
  const [xPNTsAddress, setXPNTsAddress] = useState<string>("");
  const [gTokenStakeAmount, setGTokenStakeAmount] = useState<string>("50");
  const [xPNTsSymbol, setXPNTsSymbol] = useState<string>("");
  const [communityENS, setCommunityENS] = useState<string>("");
  const [stakeTxHash, setStakeTxHash] = useState<string>("");
  const [hasExistingStake, setHasExistingStake] = useState(false);
  const [existingStakeAmount, setExistingStakeAmount] = useState<string>("0");

  // Auto-generate symbol from community name
  const autoGenerateSymbol = () => {
    if (!xPNTsSymbol && communityName) {
      const symbol = "x" + communityName.replace(/\s+/g, "").slice(0, 8).toUpperCase();
      setXPNTsSymbol(symbol);
    }
  };

  // Check for existing xPNTs when entering DeployXPNTs step
  const checkExistingXPNTs = async () => {
    try {
      const networkConfig = getCurrentNetworkConfig();
      // Use BrowserProvider for relative URLs (like /api/rpc-proxy)
      const provider = networkConfig.rpcUrl.startsWith('/')
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const userAddress = walletStatus.address;

      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        XPNTS_FACTORY_ABI,
        provider
      );

      const alreadyDeployed = await factory.hasToken(userAddress);

      if (alreadyDeployed) {
        const existingToken = await factory.getTokenAddress(userAddress);
        console.log("ℹ️ Found existing xPNTs token:", existingToken);
        setXPNTsAddress(existingToken);
        setError(
          `You already have an xPNTs token at ${existingToken.slice(0, 10)}...${existingToken.slice(-8)}. ` +
          `Click "Use This Token →" to continue, or deploy a new one (not recommended).`
        );
      }
    } catch (err) {
      console.log("Failed to check existing xPNTs:", err);
    }
  };

  // Check for existing GToken stake when entering StakeGToken step
  const checkExistingStake = async () => {
    try {
      const networkConfig = getCurrentNetworkConfig();
      // Use BrowserProvider for relative URLs (like /api/rpc-proxy)
      const provider = networkConfig.rpcUrl.startsWith('/')
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const userAddress = walletStatus.address;

      const gtokenStaking = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTOKEN_STAKING_ABI,
        provider
      );

      const existingStake = await gtokenStaking.getStakeInfo(userAddress);
      const stakedAmount = existingStake[0]; // amount is first element in tuple

      if (stakedAmount > 0n) {
        const formattedAmount = ethers.formatEther(stakedAmount);
        setHasExistingStake(true);
        setExistingStakeAmount(formattedAmount);
        console.log("ℹ️ Found existing GToken stake:", formattedAmount);
        setError(
          `You already have ${formattedAmount} GToken staked. ` +
          `Click "Use Existing Stake" below to continue with your current stake.`
        );
      }
    } catch (err) {
      console.log("Failed to check existing stake:", err);
    }
  };

  // Auto-check when entering respective steps
  useEffect(() => {
    if (currentStep === ResourceStep.DeployXPNTs && !xPNTsAddress) {
      checkExistingXPNTs();
    } else if (currentStep === ResourceStep.StakeGToken && !hasExistingStake) {
      checkExistingStake();
    }
  }, [currentStep]);

  const handleSelectSBT = () => {
    // For now, use existing MySBT
    console.log("Using existing MySBT:", sbtAddress);
    setCurrentStep(ResourceStep.DeployXPNTs);
  };

  const handleDeployXPNTs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const factory = new ethers.Contract(
        XPNTS_FACTORY_ADDRESS,
        XPNTS_FACTORY_ABI,
        signer
      );

      // Check if user already deployed xPNTs token
      console.log("Checking if xPNTs token already deployed...");
      const alreadyDeployed = await factory.hasToken(userAddress);

      if (alreadyDeployed) {
        const existingToken = await factory.getTokenAddress(userAddress);
        console.log("⚠️ xPNTs token already deployed at:", existingToken);
        setXPNTsAddress(existingToken);
        setError(
          `You already deployed an xPNTs token at ${existingToken.slice(0, 10)}...${existingToken.slice(-8)}. ` +
          `Using existing token. Click "Use This Token →" to continue.`
        );
        setIsLoading(false);
        return;
      }

      console.log("Deploying xPNTs token via factory...");

      const tokenName = `${communityName} Points`;
      const tokenSymbol = xPNTsSymbol || `x${communityName.slice(0, 8).toUpperCase()}`;
      const ens = communityENS || `${communityName.toLowerCase().replace(/\s+/g, "")}.eth`;

      const tx = await factory.deployxPNTsToken(
        tokenName,
        tokenSymbol,
        communityName,
        ens,
        ethers.parseEther("1"),  // exchangeRate: 1:1 default (1 aPNTs = 1 xPNTs)
        ethers.ZeroAddress       // paymasterAOA: use SuperPaymaster V2 (AOA+ mode)
      );

      console.log("Deployment tx:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ xPNTs deployed!");

      // Extract xPNTs address from event logs
      // The factory emits an event with the new token address
      const deployedAddress = receipt.logs[0]?.address || "";

      if (!deployedAddress) {
        throw new Error("Failed to get xPNTs address from deployment");
      }

      console.log("xPNTs Token Address:", deployedAddress);
      setXPNTsAddress(deployedAddress);

      setCurrentStep(ResourceStep.StakeGToken);
    } catch (err: any) {
      console.error("xPNTs deployment failed:", err);
      setError(err?.message || "Failed to deploy xPNTs token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStakeGToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log("🔍 GToken Staking Info:");
      console.log("GToken contract:", GTOKEN_ADDRESS);
      console.log("GTokenStaking contract:", GTOKEN_STAKING_ADDRESS);
      console.log("User address:", userAddress);
      console.log("Amount to stake:", gTokenStakeAmount, "GT");

      const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTOKEN_ABI, signer);
      const gtokenStaking = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTOKEN_STAKING_ABI,
        signer
      );

      const stakeAmount = ethers.parseEther(gTokenStakeAmount);

      // Pre-flight checks
      console.log("🔍 Running pre-flight checks...");

      // Check 1: GToken balance
      const gTokenBalance = await gToken.balanceOf(userAddress);
      console.log("GToken balance:", ethers.formatEther(gTokenBalance), "GT");

      if (gTokenBalance < stakeAmount) {
        throw new Error(
          `Insufficient GToken balance.\n\nYou have: ${ethers.formatEther(gTokenBalance)} GT\nRequired: ${gTokenStakeAmount} GT\n\nPlease get more GToken from the faucet or reduce the stake amount.`
        );
      }
      console.log("✅ Sufficient GToken balance");

      // Check 2: Existing stake
      const existingStake = await gtokenStaking.getStakeInfo(userAddress);
      const stakedAmount = existingStake[0]; // amount
      const unstakeRequestedAt = existingStake[3]; // unstakeRequestedAt

      if (stakedAmount > 0n) {
        const formattedAmount = ethers.formatEther(stakedAmount);
        setHasExistingStake(true);
        setExistingStakeAmount(formattedAmount);
        setError(
          `You have already staked ${formattedAmount} GToken. ` +
          `Click "Use Existing Stake" below to continue with your current stake.`
        );
        setIsLoading(false);
        return;
      }

      // Check 3: Pending unstake request
      if (unstakeRequestedAt > 0n) {
        throw new Error(
          `You have a pending unstake request.\n\nRequested at: ${new Date(Number(unstakeRequestedAt) * 1000).toLocaleString()}\n\nPlease complete or cancel the unstake before staking again.`
        );
      }
      console.log("✅ No existing stake or pending unstake");

      console.log("Step 1/2: Approving GToken for staking...");

      // 1. Approve GTokenStaking to spend GToken
      const approveTx = await gToken.approve(GTOKEN_STAKING_ADDRESS, stakeAmount);
      console.log("Approval tx:", approveTx.hash);
      await approveTx.wait();
      console.log("✅ GToken approved");

      console.log("Step 2/2: Staking GToken...");

      // 2. Stake GToken to get sGToken
      const stakeTx = await gtokenStaking.stake(stakeAmount);
      console.log("Stake tx:", stakeTx.hash);
      setStakeTxHash(stakeTx.hash);
      await stakeTx.wait();

      // 3. Verify sGToken balance
      const sGTokenBalance = await gtokenStaking.balanceOf(await signer.getAddress());
      console.log("✅ Staked! sGToken balance:", ethers.formatEther(sGTokenBalance));

      setCurrentStep(ResourceStep.Complete);

      // Auto-proceed to next step
      setTimeout(() => {
        onNext({
          sbtAddress,
          xPNTsAddress,
          sGTokenAmount: gTokenStakeAmount,
          gTokenStakeTxHash: stakeTx.hash,
        });
      }, 1000);
    } catch (err: any) {
      console.error("GToken staking failed:", err);

      // Parse custom error
      let errorMessage = "Failed to stake GToken";
      if (err?.data?.includes("0x0c45c8ec")) {
        errorMessage = "You have already staked GToken. The contract doesn't support additional stakes yet. Please unstake first or use your existing stake.";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExistingStake = () => {
    setCurrentStep(ResourceStep.Complete);

    // Auto-proceed to next step
    setTimeout(() => {
      onNext({
        sbtAddress,
        xPNTsAddress,
        sGTokenAmount: existingStakeAmount,
        gTokenStakeTxHash: "existing", // Mark as using existing stake
      });
    }, 1000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case ResourceStep.SelectSBT:
        return (
          <div className="step-content">
            <h3>Step 1: Config SBT Contract</h3>
            <p>
              SBTs (Soul-Bound Tokens) act as the credentials for protocol membership and for permissioned access to its applications.
              <br />
              We use the default protocol MySBT 2.3 contract.
            </p>

            <div className="form-group">
              <label>SBT Contract Address</label>
              <input
                type="text"
                value={sbtAddress}
                onChange={(e) => setSbtAddress(e.target.value)}
                placeholder="0x..."
                disabled={true}
                style={{
                  backgroundColor: "#f5f5f5",
                  color: "#666",
                  cursor: "not-allowed"
                }}
              />
              <div className="form-hint">
                Default: {MYSBT_ADDRESS} (
                <a
                  href={getExplorerUrl(MYSBT_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#667eea", textDecoration: "underline" }}
                >
                  View on Etherscan
                </a>
                ) (recommended)
              </div>
              <div className="form-hint" style={{ marginTop: "0.5rem" }}>
                <a
                  href="/my-sbt"
                  target="_blank"
                  style={{ color: "#667eea", textDecoration: "underline" }}
                >
                  Config Community SBT (only Protocol Operator or Community Multisig Safe Contract) or Get your own SBT →
                </a>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleSelectSBT}
              disabled={isLoading || !ethers.isAddress(sbtAddress)}
            >
              Use Default SBT Config
            </button>
          </div>
        );

      case ResourceStep.DeployXPNTs:
        return (
          <div className="step-content">
            <h3>Step 2: Deploy xPNTs Token</h3>
            <p>
              xPNTs (Community Points) is your community's gas token.
              <br />
              Users will use xPNTs for gas-free transactions.
            </p>

            <div className="form-group">
              <label>Token Symbol</label>
              <input
                type="text"
                value={xPNTsSymbol}
                onChange={(e) => setXPNTsSymbol(e.target.value.toUpperCase())}
                onBlur={autoGenerateSymbol}
                placeholder={`x${communityName.slice(0, 8).toUpperCase()}`}
                maxLength={12}
                disabled={isLoading}
              />
              <div className="form-hint">
                Token name will be: "{communityName} Points"
              </div>
            </div>

            <div className="form-group">
              <label>Community ENS (Optional)</label>
              <input
                type="text"
                value={communityENS}
                onChange={(e) => setCommunityENS(e.target.value)}
                placeholder={`${communityName.toLowerCase().replace(/\s+/g, "")}.eth`}
                disabled={isLoading}
              />
            </div>

            {!xPNTsAddress && (
              <button
                className="btn-primary"
                onClick={handleDeployXPNTs}
                disabled={isLoading}
              >
                {isLoading ? "Deploying..." : "Deploy xPNTs Token →"}
              </button>
            )}

            {xPNTsAddress && (
              <>
                <div className="success-message">
                  ✅ xPNTs token: {xPNTsAddress.slice(0, 10)}...
                  {xPNTsAddress.slice(-8)}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setCurrentStep(ResourceStep.StakeGToken)}
                  style={{ marginTop: "1rem" }}
                >
                  Use This Token →
                </button>
              </>
            )}
          </div>
        );

      case ResourceStep.StakeGToken:
        return (
          <div className="step-content">
            <h3>Step 3: Stake GToken</h3>
            <p>
              Stake GToken to receive sGToken (staked governance token).
              <br />
              Minimum: 30 GToken, Recommended: 50-100 GToken
            </p>

            <div className="form-group">
              <label>GToken Stake Amount</label>
              <input
                type="number"
                value={gTokenStakeAmount}
                onChange={(e) => setGTokenStakeAmount(e.target.value)}
                placeholder="50"
                min="30"
                step="10"
                disabled={isLoading}
              />
              <div className="form-hint">
                Your GToken balance: {walletStatus.gTokenBalance} GToken
              </div>
            </div>

            {parseFloat(walletStatus.gTokenBalance) < parseFloat(gTokenStakeAmount) && (
              <div className="warning-banner">
                ⚠️ Insufficient GToken balance
              </div>
            )}

            <button
              className="btn-primary"
              onClick={handleStakeGToken}
              disabled={
                isLoading ||
                parseFloat(gTokenStakeAmount) < 30 ||
                parseFloat(walletStatus.gTokenBalance) < parseFloat(gTokenStakeAmount)
              }
            >
              {isLoading ? "Staking..." : "Stake GToken →"}
            </button>

            {hasExistingStake && (
              <button
                className="btn-secondary"
                onClick={handleUseExistingStake}
                style={{ marginTop: "1rem" }}
              >
                ✅ Use Existing Stake ({existingStakeAmount} GToken) →
              </button>
            )}
          </div>
        );

      case ResourceStep.Complete:
        return (
          <div className="step-content success">
            <div className="success-icon">✅</div>
            <h3>Resources Deployed Successfully!</h3>
            <p>All required resources have been deployed and configured.</p>

            <div className="info-card">
              <div className="info-row">
                <span>SBT Contract:</span>
                <span className="monospace">{sbtAddress.slice(0, 10)}...{sbtAddress.slice(-8)}</span>
              </div>
              <div className="info-row">
                <span>xPNTs Token:</span>
                <span className="monospace">{xPNTsAddress.slice(0, 10)}...{xPNTsAddress.slice(-8)}</span>
              </div>
              <div className="info-row">
                <span>GToken Staked:</span>
                <span>{gTokenStakeAmount} GToken</span>
              </div>
              {stakeTxHash && (
                <div className="info-row">
                  <span>Stake Transaction:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${stakeTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {stakeTxHash.slice(0, 10)}...{stakeTxHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>

            <p className="next-step-hint">
              Proceeding to next step automatically...
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="step4-deploy-resources">
      <div className="step-header">
        <h2>Deploy Resources</h2>
        <p className="step-description">
          Deploy required resources for your Paymaster: SBT, xPNTs, and stake GToken
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="progress-steps">
        {[
          { step: ResourceStep.SelectSBT, label: "Select SBT" },
          { step: ResourceStep.DeployXPNTs, label: "Deploy xPNTs" },
          { step: ResourceStep.StakeGToken, label: "Stake GToken" },
          { step: ResourceStep.Complete, label: "Complete" },
        ].map((item) => (
          <div
            key={item.step}
            className={`progress-step ${
              currentStep === item.step
                ? "active"
                : currentStep > item.step
                ? "completed"
                : "pending"
            }`}
          >
            <div className="step-number">{item.step}</div>
            <div className="step-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">❌</span>
          <div className="error-content">{error}</div>
        </div>
      )}

      {/* Current Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      {currentStep !== ResourceStep.Complete && (
        <div className="step-actions">
          <button className="btn-back" onClick={onBack} disabled={isLoading}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
