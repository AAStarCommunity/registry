/**
 * Wallet Checker Utility
 *
 * Checks wallet balances and contract deployment status
 * Used in Step 2 to verify user has required resources
 */

import { ethers } from "ethers";

export interface WalletStatus {
  // Connection status
  isConnected: boolean;
  address: string;

  // Balance checks
  ethBalance: string; // in ETH
  gTokenBalance: string; // in GToken
  pntsBalance: string; // in PNT
  aPNTsBalance: string; // in aPNT (for Super Mode)

  // Contract checks
  hasSBTContract: boolean;
  sbtContractAddress?: string;
  hasGasTokenContract: boolean;
  gasTokenAddress?: string;

  // Resource sufficiency
  hasEnoughETH: boolean; // >= 0.05 ETH (deploy + gas)
  hasEnoughGToken: boolean; // >= minimum stake requirement
  hasEnoughPNTs: boolean; // >= minimum deposit requirement
  hasEnoughAPNTs: boolean; // >= minimum aPNTs requirement (Super Mode)

  // Requirements
  requiredETH: string;
  requiredGToken: string;
  requiredPNTs: string;
  requiredAPNTs: string;
}

export interface CheckOptions {
  requiredETH?: string; // Default: "0.05"
  requiredGToken?: string; // Default: "100"
  requiredPNTs?: string; // Default: "1000"
  requiredAPNTs?: string; // Default: "1000" (for Super Mode)
  gTokenAddress?: string; // GToken contract address
  pntAddress?: string; // PNT token contract address
  aPNTAddress?: string; // aPNT token contract address (Super Mode)
}

// Standard ERC-20 ABI for balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

/**
 * Connect to MetaMask and get user address
 */
export async function connectWallet(): Promise<string> {
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask is not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }

    return accounts[0];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check ETH balance
 */
export async function checkETHBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to check ETH balance:", error);
    return "0";
  }
}

/**
 * Check ERC-20 token balance
 */
export async function checkTokenBalance(
  tokenAddress: string,
  userAddress: string
): Promise<string> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    console.warn("Invalid token address:", tokenAddress);
    return "0";
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();

    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error(`Failed to check token balance for ${tokenAddress}:`, error);
    return "0";
  }
}

/**
 * Check if a contract is deployed at the given address
 */
export async function isContractDeployed(address: string): Promise<boolean> {
  if (!address || !ethers.isAddress(address)) {
    return false;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const code = await provider.getCode(address);
    return code !== "0x";
  } catch (error) {
    console.error("Failed to check contract deployment:", error);
    return false;
  }
}

/**
 * Main function to check wallet status
 */
export async function checkWalletStatus(
  options: CheckOptions = {}
): Promise<WalletStatus> {
  const {
    requiredETH = "0.05",
    requiredGToken = "100",
    requiredPNTs = "1000",
    requiredAPNTs = "1000",
    gTokenAddress,
    pntAddress,
    aPNTAddress,
  } = options;

  // Initialize default status
  const status: WalletStatus = {
    isConnected: false,
    address: "",
    ethBalance: "0",
    gTokenBalance: "0",
    pntsBalance: "0",
    aPNTsBalance: "0",
    hasSBTContract: false,
    hasGasTokenContract: false,
    hasEnoughETH: false,
    hasEnoughGToken: false,
    hasEnoughPNTs: false,
    hasEnoughAPNTs: false,
    requiredETH,
    requiredGToken,
    requiredPNTs,
    requiredAPNTs,
  };

  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    // Connect wallet
    const address = await connectWallet();
    status.isConnected = true;
    status.address = address;

    // Check ETH balance
    status.ethBalance = await checkETHBalance(address);
    status.hasEnoughETH =
      parseFloat(status.ethBalance) >= parseFloat(requiredETH);

    // Check GToken balance (if address provided)
    if (gTokenAddress) {
      status.gTokenBalance = await checkTokenBalance(gTokenAddress, address);
      status.hasEnoughGToken =
        parseFloat(status.gTokenBalance) >= parseFloat(requiredGToken);
    }

    // Check PNT balance (if address provided)
    if (pntAddress) {
      status.pntsBalance = await checkTokenBalance(pntAddress, address);
      status.hasEnoughPNTs =
        parseFloat(status.pntsBalance) >= parseFloat(requiredPNTs);
    }

    // Check aPNT balance (if address provided - for Super Mode)
    if (aPNTAddress) {
      status.aPNTsBalance = await checkTokenBalance(aPNTAddress, address);
      status.hasEnoughAPNTs =
        parseFloat(status.aPNTsBalance) >= parseFloat(requiredAPNTs);
    }

    // Check for existing xPNTs (GasToken) contract via xPNTsFactory
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const xPNTsFactoryAddress = import.meta.env.VITE_XPNTS_FACTORY_ADDRESS || "0x356CF363E136b0880C8F48c9224A37171f375595";
      const xPNTsFactoryABI = [
        "function hasToken(address community) view returns (bool)",
        "function getTokenAddress(address community) view returns (address)",
      ];

      const factory = new ethers.Contract(xPNTsFactoryAddress, xPNTsFactoryABI, provider);
      const hasToken = await factory.hasToken(address);

      if (hasToken) {
        const tokenAddress = await factory.getTokenAddress(address);
        status.hasGasTokenContract = true;
        status.gasTokenAddress = tokenAddress;
        console.log("✅ Found existing xPNTs contract:", tokenAddress);
      } else {
        status.hasGasTokenContract = false;
        console.log("ℹ️ No xPNTs contract found for this address");
      }
    } catch (error) {
      console.log("Failed to check xPNTs factory:", error);
      status.hasGasTokenContract = false;
    }

    // SBT: Check if using official MySBT contract (shared template)
    try {
      const mySBTAddress = import.meta.env.VITE_MYSBT_ADDRESS || "0xB330a8A396Da67A1b50903E734750AAC81B0C711";
      const mySBTABI = [
        "function balanceOf(address owner) view returns (uint256)",
      ];

      const provider = new ethers.BrowserProvider(window.ethereum);
      const mySBT = new ethers.Contract(mySBTAddress, mySBTABI, provider);

      // Check if user has SBT tokens (meaning they're using the official MySBT)
      const balance = await mySBT.balanceOf(address);

      if (balance > 0n) {
        status.hasSBTContract = true;
        status.sbtContractAddress = mySBTAddress;
        console.log("✅ Using official MySBT contract:", mySBTAddress);
      } else {
        // User can still use MySBT even without tokens, it's the default
        status.hasSBTContract = true;
        status.sbtContractAddress = mySBTAddress;
        console.log("ℹ️ Will use official MySBT contract (no tokens yet):", mySBTAddress);
      }
    } catch (error) {
      console.log("Failed to check MySBT:", error);
      // Default to true since MySBT is the official shared contract
      const mySBTAddress = import.meta.env.VITE_MYSBT_ADDRESS || "0xB330a8A396Da67A1b50903E734750AAC81B0C711";
      status.hasSBTContract = true;
      status.sbtContractAddress = mySBTAddress;
      console.log("ℹ️ Using default MySBT address:", mySBTAddress);
    }

    return status;
  } catch (error) {
    console.error("Failed to check wallet status:", error);
    return status;
  }
}

/**
 * Get current network information
 */
export async function getCurrentNetwork(): Promise<{
  chainId: number;
  chainName: string;
}> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    const chainNames: Record<number, string> = {
      1: "Ethereum Mainnet",
      11155111: "Sepolia Testnet",
      5: "Goerli Testnet",
      137: "Polygon Mainnet",
      80001: "Polygon Mumbai",
    };

    return {
      chainId: Number(network.chainId),
      chainName: chainNames[Number(network.chainId)] || `Chain ${network.chainId}`,
    };
  } catch (error) {
    console.error("Failed to get network info:", error);
    return { chainId: 0, chainName: "Unknown" };
  }
}

/**
 * Request network switch (if needed)
 */
export async function switchNetwork(chainId: number): Promise<boolean> {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error) {
    console.error("Failed to switch network:", error);
    return false;
  }
}

/**
 * Format balance for display
 */
export function formatBalance(balance: string, decimals: number = 4): string {
  const num = parseFloat(balance);
  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  return num.toFixed(decimals);
}

/**
 * Check if wallet has sufficient resources for a specific stake option
 */
export function checkStakeOptionRequirements(
  status: WalletStatus,
  option: "aoa" | "super"
): {
  canProceed: boolean;
  missingResources: string[];
} {
  const missing: string[] = [];

  if (option === "aoa") {
    // AOA flow needs: ETH for deploy + stake + deposit, GToken for governance stake
    if (!status.hasEnoughETH) {
      missing.push(`ETH (need ${status.requiredETH}, have ${status.ethBalance})`);
    }
    if (!status.hasEnoughGToken) {
      missing.push(
        `GToken (need ${status.requiredGToken}, have ${status.gTokenBalance})`
      );
    }
  } else if (option === "super") {
    // Super Mode needs: ETH for gas only, GToken and aPNTs
    const gasOnlyETH = "0.1";
    if (parseFloat(status.ethBalance) < parseFloat(gasOnlyETH)) {
      missing.push(`ETH for gas (need ${gasOnlyETH}, have ${status.ethBalance})`);
    }
    if (!status.hasEnoughGToken) {
      missing.push(
        `GToken (need ${status.requiredGToken}, have ${status.gTokenBalance})`
      );
    }
    if (!status.hasEnoughAPNTs) {
      missing.push(
        `aPNTs (need ${status.requiredAPNTs}, have ${status.aPNTsBalance})`
      );
    }
  }

  return {
    canProceed: missing.length === 0,
    missingResources: missing,
  };
}
