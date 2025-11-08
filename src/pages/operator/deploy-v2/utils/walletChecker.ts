/**
 * Wallet Checker Utility
 *
 * Checks wallet balances and contract deployment status
 * Used in Step 1 to verify user has required resources
 *
 * Granular caching: Only cache successful resources, refresh only re-queries failed resources
 */

import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { getRpcUrl } from "../../../../config/rpc";
import { ERC20_ABI, RegistryABI, xPNTsFactoryABI } from "../../../../config/abis";
import { loadFromCache, saveToCache } from "../../../../utils/cache";

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

// Cache configuration
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes
const CACHE_TTL_SECONDS = 3600; // 60 minutes in seconds for saveToCache

/**
 * Helper to get cached value or execute function
 * Only caches successful results (non-null, non-zero, non-empty)
 */
async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  isSuccess: (value: T) => boolean
): Promise<T> {
  // Try cache first
  const cached = loadFromCache<T>(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return cached.data;
  }

  console.log(`🔄 Cache miss: ${cacheKey}, fetching...`);

  // Fetch new data
  const result = await fetchFn();

  // Only cache successful results
  if (isSuccess(result)) {
    saveToCache(cacheKey, result, CACHE_TTL_SECONDS);
    console.log(`💾 Cached: ${cacheKey}`);
  } else {
    console.log(`⚠️ Not caching (failed): ${cacheKey}`);
  }

  return result;
}

// ====================================
// Helper Functions
// ====================================

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
async function checkETHBalance(address: string): Promise<string> {
  try {
    const rpcProvider = new ethers.JsonRpcProvider(getRpcUrl());
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
async function checkTokenBalance(
  tokenAddress: string,
  userAddress: string
): Promise<string> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    console.warn("Invalid token address:", tokenAddress);
    return "0";
  }

  try {
    console.log(`🔍 Checking token balance:`, { tokenAddress, userAddress });
    const rpcProvider = new ethers.JsonRpcProvider(getRpcUrl());
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);

    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();
    const formattedBalance = ethers.formatUnits(balance, decimals);

    console.log(`💰 Token balance result:`, {
      tokenAddress: tokenAddress.slice(0, 10) + '...',
      userAddress: userAddress.slice(0, 10) + '...',
      rawBalance: balance.toString(),
      decimals,
      formattedBalance
    });

    return formattedBalance;
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
    const rpcProvider = new ethers.JsonRpcProvider(getRpcUrl());
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
async function checkCommunityRegistration(
  address: string
): Promise<{ isRegistered: boolean; communityName?: string }> {
  const networkConfig = getCurrentNetworkConfig();
  const registryAddress = networkConfig.contracts.registry;

  try {
    const rpcProvider = new ethers.JsonRpcProvider(getRpcUrl());
    const registry = new ethers.Contract(registryAddress, RegistryABI, rpcProvider);

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
    return { isRegistered: false };
  }
}

/**
 * Check xPNTs token deployment
 */
async function checkXPNTsDeployment(
  address: string
): Promise<{ hasToken: boolean; tokenAddress?: string }> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const gasTokenFactoryAddress = networkConfig.contracts.xPNTsFactory;
    const rpcProvider = new ethers.JsonRpcProvider(getRpcUrl());
    const factory = new ethers.Contract(gasTokenFactoryAddress, xPNTsFactoryABI, rpcProvider);

    const hasToken = await factory.hasToken(address);

    if (hasToken) {
      const tokenAddress = await factory.getTokenAddress(address);
      console.log("✅ Found existing xPNTs contract:", tokenAddress);
      return { hasToken: true, tokenAddress };
    } else {
      console.log("ℹ️ No xPNTs contract found for this address");
      return { hasToken: false };
    }
  } catch (error) {
    console.log("Failed to check xPNTs factory:", error);
    return { hasToken: false };
  }
}

// ====================================
// Main Function
// ====================================

/**
 * Main function to check wallet status (with granular caching)
 * Only caches successful resources, refresh only re-queries failed resources
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

    const addr = address.toLowerCase();

    console.log("🔍 Fetching wallet status with granular caching...");
    console.log("📋 Check options:", {
      requiredAPNTs,
      aPNTAddress: aPNTAddress ? aPNTAddress.slice(0, 10) + '...' : 'NOT PROVIDED',
    });

    // Parallel RPC calls with individual caching per resource
    const networkConfig = getCurrentNetworkConfig();

    const [
      communityResult,
      ethBalance,
      gTokenBalance,
      aPNTsBalance,
      xPNTsResult
    ] = await Promise.all([
      // 1. Check community registration (only cache if registered)
      getCachedOrFetch(
        `wallet_community_${addr}`,
        () => checkCommunityRegistration(address),
        (result) => result.isRegistered === true
      ),

      // 2. Check ETH balance (always cache, even if 0)
      getCachedOrFetch(
        `wallet_eth_${addr}`,
        () => checkETHBalance(address),
        (result) => parseFloat(result) >= 0
      ),

      // 3. Check GToken balance (always cache, even if 0)
      gTokenAddress
        ? getCachedOrFetch(
            `wallet_gtoken_${addr}`,
            () => checkTokenBalance(gTokenAddress, address),
            (result) => parseFloat(result) >= 0
          )
        : Promise.resolve("0"),

      // 4. Check aPNTs balance (only cache if balance > 0, to avoid caching 0 from AOA mode)
      aPNTAddress
        ? getCachedOrFetch(
            `wallet_apnts_v2_${addr}`, // v2: force refresh old 0-balance caches
            () => checkTokenBalance(aPNTAddress, address),
            (result) => parseFloat(result) > 0 // ✅ Only cache non-zero balance
          )
        : Promise.resolve("0"),

      // 5. Check xPNTs deployment (only cache if hasToken)
      getCachedOrFetch(
        `wallet_xpnts_${addr}`,
        () => checkXPNTsDeployment(address),
        (result) => result.hasToken === true
      )
    ]);

    // Process results
    status.isCommunityRegistered = communityResult.isRegistered;
    status.communityName = communityResult.communityName;

    // Calculate required GToken based on registration status
    const calculatedRequiredGToken = communityResult.isRegistered ? "300" : "330";
    status.requiredGToken = requiredGToken || calculatedRequiredGToken;

    status.ethBalance = ethBalance;
    status.hasEnoughETH = parseFloat(ethBalance) >= parseFloat(requiredETH);

    status.gTokenBalance = gTokenBalance;
    status.hasEnoughGToken = parseFloat(gTokenBalance) >= parseFloat(status.requiredGToken);

    status.aPNTsBalance = aPNTsBalance;
    status.hasEnoughAPNTs = parseFloat(aPNTsBalance) >= parseFloat(requiredAPNTs);

    status.hasGasTokenContract = xPNTsResult.hasToken;
    status.gasTokenAddress = xPNTsResult.tokenAddress;

    console.log("✅ Wallet status fetched with granular caching");

    return status;
  } catch (error) {
    console.error("Failed to check wallet status:", error);
    return status;
  }
}

// ====================================
// Utility Functions
// ====================================

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
