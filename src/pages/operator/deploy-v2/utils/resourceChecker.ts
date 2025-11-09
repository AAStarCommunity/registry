/**
 * Resource Checker Utility
 *
 * Checks deployment status of community resources:
 * - Community registration (Registry v2.1)
 * - xPNTs token deployment (xPNTsFactory)
 * - Paymaster deployment (PaymasterFactory)
 * - MySBT binding (Paymaster configuration)
 * - GToken and aPNTs balances
 */

import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { getRpcUrl } from "../../../../config/rpc";
import { loadFromCache, saveToCache } from "../../../../utils/cache";
import {
  ERC20_ABI,
  RegistryABI,
  xPNTsFactoryABI,
  xPNTsTokenABI,
  PaymasterFactoryABI,
  PaymasterV4ABI,
} from "../../../../config/abis";

// Cache configuration
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes (matches walletChecker)
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
// Types
// ====================================

export interface ResourceStatus {
  // Community registration
  isCommunityRegistered: boolean;
  communityName?: string;
  communityRegisteredAt?: number;

  // xPNTs deployment
  hasXPNTs: boolean;
  xPNTsAddress?: string;
  xPNTsExchangeRate?: string;

  // Paymaster deployment (AOA mode)
  hasPaymaster: boolean;
  paymasterAddress?: string;

  // AOA Paymaster conflict check (AOA+ mode only)
  hasAOAPaymaster: boolean;

  // MySBT binding (only check if hasPaymaster=true)
  hasSBTBinding: boolean;
  supportedSBTs?: string[];

  // GToken balance
  gTokenBalance: string;
  requiredGToken: string;
  hasEnoughGToken: boolean;

  // aPNTs balance (AOA+ mode only)
  aPNTsBalance: string;
  requiredAPNTs: string;
  hasEnoughAPNTs: boolean;

  // ETH balance
  ethBalance: string;
  requiredETH: string;
  hasEnoughETH: boolean;
}

export type StakeMode = "aoa" | "aoa+";

// ABIs imported from shared-config via config/abis.ts

// ====================================
// Helper Functions
// ====================================

/**
 * Check community registration status
 */
async function checkCommunityRegistration(
  provider: ethers.Provider,
  address: string
): Promise<{
  isRegistered: boolean;
  communityName?: string;
  registeredAt?: number;
}> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const registryAddress = networkConfig.contracts.registry;

    const registry = new ethers.Contract(registryAddress, RegistryABI, provider);
    const community = await registry.communities(address);

    // Check if registeredAt is not 0 (means community is registered)
    const isRegistered = community.registeredAt !== 0n;

    return {
      isRegistered,
      communityName: isRegistered ? community.name : undefined,
      registeredAt: isRegistered ? Number(community.registeredAt) : undefined,
    };
  } catch (error) {
    console.error("Failed to check community registration:", error);
    return { isRegistered: false };
  }
}

/**
 * Check xPNTs token deployment
 */
async function checkXPNTsDeployment(
  provider: ethers.Provider,
  address: string
): Promise<{
  hasToken: boolean;
  tokenAddress?: string;
  exchangeRate?: string;
}> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const factoryAddress = networkConfig.contracts.xPNTsFactory;

    const factory = new ethers.Contract(factoryAddress, xPNTsFactoryABI, provider);

    const hasToken = await factory.hasToken(address);
    if (!hasToken) {
      return { hasToken: false };
    }

    const tokenAddress = await factory.getTokenAddress(address);

    // Get exchange rate
    const token = new ethers.Contract(tokenAddress, xPNTsTokenABI, provider);
    const rate = await token.exchangeRate();
    const exchangeRate = ethers.formatEther(rate);

    return {
      hasToken: true,
      tokenAddress,
      exchangeRate,
    };
  } catch (error) {
    console.error("Failed to check xPNTs deployment:", error);
    return { hasToken: false };
  }
}

/**
 * Check Paymaster deployment
 */
async function checkPaymasterDeployment(
  provider: ethers.Provider,
  address: string
): Promise<{
  hasPaymaster: boolean;
  paymasterAddress?: string;
}> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const factoryAddress = networkConfig.contracts.paymasterFactory;

    const factory = new ethers.Contract(factoryAddress, PaymasterFactoryABI, provider);

    const hasPaymaster = await factory.hasPaymaster(address);
    if (!hasPaymaster) {
      return { hasPaymaster: false };
    }

    const paymasterAddress = await factory.paymasterByOperator(address);

    return {
      hasPaymaster: true,
      paymasterAddress,
    };
  } catch (error) {
    console.error("Failed to check paymaster deployment:", error);
    return { hasPaymaster: false };
  }
}

/**
 * Check MySBT binding in Community Registry (NOT Paymaster)
 *
 * MySBT binding is stored in Registry.communities(address).supportedSBTs
 * NOT in Paymaster.getSupportedSBTs()
 */
async function checkSBTBinding(
  provider: ethers.Provider,
  communityAddress: string
): Promise<{
  hasSBTBinding: boolean;
  supportedSBTs?: string[];
}> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const globalMySBT = networkConfig.contracts.mySBT;
    const registryAddress = networkConfig.contracts.registry;

    console.log("=== MySBT Binding Check ===");
    console.log("Community address:", communityAddress);
    console.log("Expected MySBT address (from shared-config):", globalMySBT);
    console.log("Registry address:", registryAddress);

    // Query community profile from Registry using getCommunityProfile (NOT communities mapping)
    // communities(address) mapping does NOT have supportedSBTs field
    // getCommunityProfile(address) function returns complete profile with supportedSBTs
    const registry = new ethers.Contract(registryAddress, RegistryABI, provider);
    const profile = await registry.getCommunityProfile(communityAddress);

    const supportedSBTs = profile.supportedSBTs || [];
    console.log("Supported SBTs from Registry.getCommunityProfile:", supportedSBTs);

    // Check if global MySBT is in supported list
    const hasSBTBinding = supportedSBTs.some(
      (sbt: string) => sbt.toLowerCase() === globalMySBT.toLowerCase()
    );

    console.log("MySBT binding status:", hasSBTBinding);
    console.log("===========================");

    return {
      hasSBTBinding,
      supportedSBTs,
    };
  } catch (error) {
    console.error("Failed to check SBT binding:", error);
    return { hasSBTBinding: false };
  }
}

/**
 * Check token balance
 */
async function checkTokenBalance(
  provider: ethers.Provider,
  tokenAddress: string,
  ownerAddress: string
): Promise<string> {
  try {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await token.balanceOf(ownerAddress);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`Failed to check token balance for ${tokenAddress}:`, error);
    return "0";
  }
}

/**
 * Check ETH balance
 */
async function checkETHBalance(
  provider: ethers.Provider,
  address: string
): Promise<string> {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to check ETH balance:", error);
    return "0";
  }
}

// ====================================
// Main Functions
// ====================================

/**
 * Check resources for AOA mode
 *
 * Requirements:
 * - Community registered: 30 GT
 * - Paymaster not deployed: 30 GT
 * - Total: 60 GT (if not registered), 30 GT (if registered)
 * - ETH: 0.05 ETH (for gas)
 * - aPNTs: Not required for AOA mode
 */
export async function checkAOAResources(
  walletAddress: string
): Promise<ResourceStatus> {
  try {
    console.log("=== Resource Check (AOA Mode) ===");
    console.log("Checking resources for:", walletAddress);

    // Use RPC provider instead of MetaMask to avoid cache issues
    const rpcUrl = getRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const networkConfig = getCurrentNetworkConfig();

    const addr = walletAddress.toLowerCase();

    // Check each resource individually with separate caching
    // Only successful checks are cached, failed checks are always re-fetched
    const [
      communityCheck,
      xpntsCheck,
      paymasterCheck,
      gTokenBalance,
      ethBalance
    ] = await Promise.all([
      getCachedOrFetch(
        `resource_community_${addr}`,
        () => checkCommunityRegistration(provider, walletAddress),
        (result) => result.isRegistered === true
      ),
      getCachedOrFetch(
        `resource_xpnts_${addr}`,
        () => checkXPNTsDeployment(provider, walletAddress),
        (result) => result.hasToken === true
      ),
      getCachedOrFetch(
        `resource_paymaster_${addr}`,
        () => checkPaymasterDeployment(provider, walletAddress),
        (result) => result.hasPaymaster === true
      ),
      getCachedOrFetch(
        `resource_gtoken_${addr}`,
        () => checkTokenBalance(provider, networkConfig.contracts.gToken, walletAddress),
        (result) => parseFloat(result) >= 0 // Always cache balance (even 0)
      ),
      getCachedOrFetch(
        `resource_eth_${addr}`,
        () => checkETHBalance(provider, walletAddress),
        (result) => parseFloat(result) >= 0 // Always cache balance (even 0)
      )
    ]);

    // Check MySBT binding from Registry (only if community is registered)
    let sbtCheck: { hasSBTBinding: boolean; supportedSBTs?: string[] } = {
      hasSBTBinding: false,
      supportedSBTs: []
    };
    if (communityCheck.isRegistered) {
      sbtCheck = await getCachedOrFetch(
        `resource_sbt_binding_${addr}`,
        () => checkSBTBinding(provider, walletAddress),
        (result) => result.hasSBTBinding === true
      );
    }

    // Calculate required GToken
    // If not registered: 30 GT (register community) + 30 GT (register paymaster) = 60 GT
    // If registered: 30 GT (register paymaster only)
    const requiredGToken = communityCheck.isRegistered ? "30" : "60";
    const hasEnoughGToken = parseFloat(gTokenBalance) >= parseFloat(requiredGToken);

    const requiredETH = "0.05";
    const hasEnoughETH = parseFloat(ethBalance) >= parseFloat(requiredETH);

    console.log("=== Resource Check Complete ===");

    return {
      isCommunityRegistered: communityCheck.isRegistered,
      communityName: communityCheck.communityName,
      communityRegisteredAt: communityCheck.registeredAt,

      hasXPNTs: xpntsCheck.hasToken,
      xPNTsAddress: xpntsCheck.tokenAddress,
      xPNTsExchangeRate: xpntsCheck.exchangeRate,

      hasPaymaster: paymasterCheck.hasPaymaster,
      paymasterAddress: paymasterCheck.paymasterAddress,

      hasAOAPaymaster: paymasterCheck.hasPaymaster, // Same as hasPaymaster in AOA mode

      hasSBTBinding: sbtCheck.hasSBTBinding,
      supportedSBTs: sbtCheck.supportedSBTs,

      gTokenBalance,
      requiredGToken,
      hasEnoughGToken,

      aPNTsBalance: "0",
      requiredAPNTs: "0",
      hasEnoughAPNTs: true, // Not required for AOA

      ethBalance,
      requiredETH,
      hasEnoughETH,
    };
  } catch (error) {
    console.error("Failed to check AOA resources:", error);
    throw error;
  }
}

/**
 * Check resources for AOA+ mode (SuperPaymaster)
 *
 * Requirements:
 * - Community registered: 30 GT
 * - SuperPaymaster not registered: 50 GT
 * - Total: 80 GT (if not registered), 50 GT (if registered)
 * - ETH: 0.05 ETH (for gas)
 * - aPNTs: 1000 aPNTs (minimum balance)
 */
export async function checkAOAPlusResources(
  walletAddress: string
): Promise<ResourceStatus> {
  try {
    console.log("=== Resource Check (AOA+ Mode) ===");
    console.log("Checking resources for:", walletAddress);

    // Use RPC provider instead of MetaMask to avoid cache issues
    const rpcUrl = getRpcUrl();
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const networkConfig = getCurrentNetworkConfig();

    const addr = walletAddress.toLowerCase();

    // Check each resource individually with separate caching
    const [
      communityCheck,
      xpntsCheck,
      aoaPaymasterCheck,
      gTokenBalance,
      aPNTsBalance,
      ethBalance
    ] = await Promise.all([
      getCachedOrFetch(
        `resource_community_${addr}`,
        () => checkCommunityRegistration(provider, walletAddress),
        (result) => result.isRegistered === true
      ),
      getCachedOrFetch(
        `resource_xpnts_${addr}`,
        () => checkXPNTsDeployment(provider, walletAddress),
        (result) => result.hasToken === true
      ),
      // Check if account has deployed AOA Paymaster (conflict with AOA+ mode)
      getCachedOrFetch(
        `resource_aoa_paymaster_${addr}`,
        () => checkPaymasterDeployment(provider, walletAddress),
        (result) => result.hasPaymaster === false // Only cache if no conflict
      ),
      getCachedOrFetch(
        `resource_gtoken_${addr}`,
        () => checkTokenBalance(provider, networkConfig.contracts.gToken, walletAddress),
        (result) => parseFloat(result) >= 0
      ),
      getCachedOrFetch(
        `resource_apnts_${addr}`,
        () => checkTokenBalance(provider, networkConfig.contracts.aPNTs, walletAddress),
        (result) => parseFloat(result) >= 0
      ),
      getCachedOrFetch(
        `resource_eth_${addr}`,
        () => checkETHBalance(provider, walletAddress),
        (result) => parseFloat(result) >= 0
      )
    ]);

    // Calculate required GToken
    // If not registered: 30 GT (register community) + 50 GT (register to SuperPaymaster) = 80 GT
    // If registered: 50 GT (register to SuperPaymaster only)
    const requiredGToken = communityCheck.isRegistered ? "50" : "80";
    const hasEnoughGToken = parseFloat(gTokenBalance) >= parseFloat(requiredGToken);

    const requiredAPNTs = "1000";
    const hasEnoughAPNTs = parseFloat(aPNTsBalance) >= parseFloat(requiredAPNTs);

    const requiredETH = "0.05";
    const hasEnoughETH = parseFloat(ethBalance) >= parseFloat(requiredETH);

    console.log("=== Resource Check Complete ===");

    return {
      isCommunityRegistered: communityCheck.isRegistered,
      communityName: communityCheck.communityName,
      communityRegisteredAt: communityCheck.registeredAt,

      hasXPNTs: xpntsCheck.hasToken,
      xPNTsAddress: xpntsCheck.tokenAddress,
      xPNTsExchangeRate: xpntsCheck.exchangeRate,

      hasPaymaster: false, // AOA+ doesn't deploy individual Paymaster
      paymasterAddress: undefined,

      hasAOAPaymaster: aoaPaymasterCheck.hasPaymaster, // Check for AOA Paymaster conflict

      hasSBTBinding: false, // Will be configured in SuperPaymaster
      supportedSBTs: [],

      gTokenBalance,
      requiredGToken,
      hasEnoughGToken,

      aPNTsBalance,
      requiredAPNTs,
      hasEnoughAPNTs,

      ethBalance,
      requiredETH,
      hasEnoughETH,
    };
  } catch (error) {
    console.error("Failed to check AOA+ resources:", error);
    throw error;
  }
}

/**
 * Check resources based on mode
 */
export async function checkResources(
  walletAddress: string,
  mode: StakeMode
): Promise<ResourceStatus> {
  if (mode === "aoa") {
    return checkAOAResources(walletAddress);
  } else {
    return checkAOAPlusResources(walletAddress);
  }
}
