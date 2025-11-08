/**
 * Wallet Checker Utility
 *
 * Checks wallet balances and contract deployment status
 * Used in Step 2 to verify user has required resources
 */

import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { getRpcUrl, getPublicRpcUrls } from "../../../../config/rpc";
import { ERC20_ABI, RegistryABI, xPNTsFactoryABI } from "../../../../config/abis";

export interface WalletStatus {
  // Connection status
  isConnected: boolean;
  address: string;

  // Balance checks
  ethBalance: string; // in ETH
  gTokenBalance: string; // in GToken
  aPNTsBalance: string; // in aPNT (for AOA+ mode only)

  // Contract checks
  hasGasTokenContract: boolean;
  gasTokenAddress?: string;

  // Community registration status
  isCommunityRegistered: boolean;
  communityName?: string;

  // Resource sufficiency
  hasEnoughETH: boolean; // >= 0.05 ETH (deploy + gas)
  hasEnoughGToken: boolean; // >= minimum stake requirement
  hasEnoughAPNTs: boolean; // >= minimum aPNTs requirement (AOA+ mode only)

  // Requirements
  requiredETH: string;
  requiredGToken: string;
  requiredAPNTs: string; // 0 for AOA mode, 1000 for AOA+ (Super) mode
}

export interface CheckOptions {
  requiredETH?: string; // Default: "0.05"
  requiredGToken?: string; // Default: "330" (or 300 if community registered)
  requiredAPNTs?: string; // Default: "0" for AOA, "1000" for AOA+ (Super Mode)
  gTokenAddress?: string; // GToken contract address
  aPNTAddress?: string; // aPNT token contract address (AOA+ mode only)
}

// ABIs imported from shared-config via config/abis.ts

/**
 * Get RPC provider with fallback support
 */
async function getRpcProvider(): Promise<ethers.JsonRpcProvider> {
  // In development, use direct public RPCs since proxy may not be available
  // In production, use the configured RPC proxy
  const rpcUrls = import.meta.env.MODE === "development" 
    ? [
        "https://eth-sepolia.g.alchemy.com/v2/demo", // Public demo key
        "https://rpc.sepolia.org",
        "https://ethereum-sepolia.publicnode.com",
        ...getPublicRpcUrls()
      ]
    : [getRpcUrl(), ...getPublicRpcUrls()];

  let lastError: Error | null = null;

  for (const rpcUrl of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Test the connection with a simple call
      await provider.getNetwork();
      console.log(`✅ RPC connected: ${rpcUrl.replace(/\/v2\/.*$/, '/v2/***')}`);
      return provider;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      console.warn(`⚠️ RPC failed: ${rpcUrl}`, lastError.message);
    }
  }

  // All RPCs failed, throw the last error
  throw lastError || new Error("All RPC endpoints failed");
}

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
    // Try direct public RPC first for development
    const rpcUrl = import.meta.env.MODE === "development" 
      ? "https://rpc.sepolia.org" 
      : getRpcUrl();
    
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await rpcProvider.getBalance(address);
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
    // Try direct public RPC first for development
    const rpcUrl = import.meta.env.MODE === "development" 
      ? "https://rpc.sepolia.org" 
      : getRpcUrl();
    
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);

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
    // Try direct public RPC first for development
    const rpcUrl = import.meta.env.MODE === "development" 
      ? "https://rpc.sepolia.org" 
      : getRpcUrl();
    
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    const code = await rpcProvider.getCode(address);
    return code !== "0x";
  } catch (error) {
    console.error("Failed to check contract deployment:", error);
    return false;
  }
}

/**
 * Check if community is already registered
 */
export async function checkCommunityRegistration(
  address: string
): Promise<{ isRegistered: boolean; communityName?: string }> {
  const networkConfig = getCurrentNetworkConfig();
  const registryAddress = networkConfig.contracts.registryV2_1;

  // Helper function to check with a specific provider
  async function checkWithProvider(provider: ethers.Provider): Promise<{ isRegistered: boolean; communityName?: string }> {
    try {
      const registry = new ethers.Contract(registryAddress, RegistryABI, provider);
      
      // First use isRegisteredCommunity - this returns bool and won't revert
      const isRegistered = await registry.isRegisteredCommunity(address);
      
      if (!isRegistered) {
        return { isRegistered: false };
      }

      // If registered, get the community details
      try {
        const community = await registry.communities(address);
        const communityName = community.name;
        return { isRegistered: true, communityName };
      } catch (detailError) {
        console.warn("Community registered but failed to get details:", detailError);
        return { isRegistered: true, communityName: "Unknown Community" };
      }
    } catch (error) {
      console.error("Failed to check community registration:", error);
      throw error;
    }
  }

  try {
    // Try direct public RPC first for development
    const rpcUrl = import.meta.env.MODE === "development" 
      ? "https://rpc.sepolia.org" 
      : getRpcUrl();
    
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    return await checkWithProvider(rpcProvider);
  } catch (error) {
    console.error("Failed to check community registration:", error);
    return { isRegistered: false };
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
    requiredGToken, // Will be calculated based on registration status
    requiredAPNTs = "0", // 0 for AOA, 1000 for AOA+ (Super)
    gTokenAddress,
    aPNTAddress,
  } = options;

  // Initialize default status
  const status: WalletStatus = {
    isConnected: false,
    address: "",
    ethBalance: "0",
    gTokenBalance: "0",
    aPNTsBalance: "0",
    hasGasTokenContract: false,
    isCommunityRegistered: false,
    hasEnoughETH: false,
    hasEnoughGToken: false,
    hasEnoughAPNTs: false,
    requiredETH,
    requiredGToken: requiredGToken || "330", // Will be updated after checking registration
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

    // Check community registration status
    const { isRegistered, communityName } = await checkCommunityRegistration(address);
    status.isCommunityRegistered = isRegistered;
    status.communityName = communityName;

    // Calculate required GToken based on registration status
    // If not registered: 30 (register community) + 300 (register paymaster) = 330 GToken
    // If registered: 300 (register paymaster only)
    const calculatedRequiredGToken = isRegistered ? "300" : "330";
    status.requiredGToken = requiredGToken || calculatedRequiredGToken;

    // Check ETH balance
    status.ethBalance = await checkETHBalance(address);
    status.hasEnoughETH =
      parseFloat(status.ethBalance) >= parseFloat(requiredETH);

    // Check GToken balance (if address provided)
    if (gTokenAddress) {
      status.gTokenBalance = await checkTokenBalance(gTokenAddress, address);
      status.hasEnoughGToken =
        parseFloat(status.gTokenBalance) >= parseFloat(status.requiredGToken);
    }

    // Check aPNT balance (if address provided - for AOA+ / Super Mode only)
    if (aPNTAddress) {
      status.aPNTsBalance = await checkTokenBalance(aPNTAddress, address);
      status.hasEnoughAPNTs =
        parseFloat(status.aPNTsBalance) >= parseFloat(requiredAPNTs);
    }

    // Check for existing xPNTs (GasToken) contract via xPNTsFactory
    try {
      const networkConfig = getCurrentNetworkConfig();
      const gasTokenFactoryAddress = networkConfig.contracts.xPNTsFactory;
      
      // Try direct public RPC first for development
      const rpcUrl = import.meta.env.MODE === "development" 
        ? "https://rpc.sepolia.org" 
        : getRpcUrl();
      
      const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
      const factory = new ethers.Contract(gasTokenFactoryAddress, xPNTsFactoryABI, rpcProvider);
      
      // hasToken() should return boolean, not revert
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
    if (!window.ethereum) {
      console.error("MetaMask not available for network switch");
      return false;
    }
    
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
