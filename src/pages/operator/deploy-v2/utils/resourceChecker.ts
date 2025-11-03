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
import {
  ERC20_ABI,
  RegistryABI,
  xPNTsFactoryABI,
  xPNTsTokenABI,
  PaymasterFactoryABI,
  PaymasterV4ABI,
} from "../../../../config/abis";

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

  // Paymaster deployment
  hasPaymaster: boolean;
  paymasterAddress?: string;

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
    const registryAddress = networkConfig.contracts.registryV2_1;

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
 * Check MySBT binding in Paymaster
 */
async function checkSBTBinding(
  provider: ethers.Provider,
  paymasterAddress: string
): Promise<{
  hasSBTBinding: boolean;
  supportedSBTs?: string[];
}> {
  try {
    const networkConfig = getCurrentNetworkConfig();
    const globalMySBT = networkConfig.contracts.mySBT;

    const paymaster = new ethers.Contract(paymasterAddress, PaymasterV4ABI, provider);
    const supportedSBTs = await paymaster.getSupportedSBTs();

    // Check if global MySBT is in supported list
    const hasSBTBinding = supportedSBTs.some(
      (sbt: string) => sbt.toLowerCase() === globalMySBT.toLowerCase()
    );

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
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const networkConfig = getCurrentNetworkConfig();

    // Check community registration
    const communityCheck = await checkCommunityRegistration(provider, walletAddress);

    // Check xPNTs deployment
    const xpntsCheck = await checkXPNTsDeployment(provider, walletAddress);

    // Check Paymaster deployment
    const paymasterCheck = await checkPaymasterDeployment(provider, walletAddress);

    // Check MySBT binding (only if Paymaster deployed)
    let sbtCheck: { hasSBTBinding: boolean; supportedSBTs?: string[] } = { hasSBTBinding: false, supportedSBTs: [] };
    if (paymasterCheck.hasPaymaster && paymasterCheck.paymasterAddress) {
      sbtCheck = await checkSBTBinding(provider, paymasterCheck.paymasterAddress);
    }

    // Check GToken balance
    const gTokenAddress = networkConfig.contracts.gToken;
    const gTokenBalance = await checkTokenBalance(provider, gTokenAddress, walletAddress);

    // Calculate required GToken
    // If not registered: 30 GT (register community) + 30 GT (register paymaster) = 60 GT
    // If registered: 30 GT (register paymaster only)
    const requiredGToken = communityCheck.isRegistered ? "30" : "60";
    const hasEnoughGToken = parseFloat(gTokenBalance) >= parseFloat(requiredGToken);

    // Check ETH balance
    const ethBalance = await checkETHBalance(provider, walletAddress);
    const requiredETH = "0.05";
    const hasEnoughETH = parseFloat(ethBalance) >= parseFloat(requiredETH);

    return {
      isCommunityRegistered: communityCheck.isRegistered,
      communityName: communityCheck.communityName,
      communityRegisteredAt: communityCheck.registeredAt,

      hasXPNTs: xpntsCheck.hasToken,
      xPNTsAddress: xpntsCheck.tokenAddress,
      xPNTsExchangeRate: xpntsCheck.exchangeRate,

      hasPaymaster: paymasterCheck.hasPaymaster,
      paymasterAddress: paymasterCheck.paymasterAddress,

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
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const networkConfig = getCurrentNetworkConfig();

    // Check community registration
    const communityCheck = await checkCommunityRegistration(provider, walletAddress);

    // Check xPNTs deployment
    const xpntsCheck = await checkXPNTsDeployment(provider, walletAddress);

    // For AOA+ mode, we don't deploy individual Paymaster
    // Instead, we check if operator is registered in SuperPaymaster
    // This will be checked in the SuperPaymaster configuration page

    // Check GToken balance
    const gTokenAddress = networkConfig.contracts.gToken;
    const gTokenBalance = await checkTokenBalance(provider, gTokenAddress, walletAddress);

    // Calculate required GToken
    // If not registered: 30 GT (register community) + 50 GT (register to SuperPaymaster) = 80 GT
    // If registered: 50 GT (register to SuperPaymaster only)
    const requiredGToken = communityCheck.isRegistered ? "50" : "80";
    const hasEnoughGToken = parseFloat(gTokenBalance) >= parseFloat(requiredGToken);

    // Check aPNTs balance
    const aPNTsAddress = networkConfig.contracts.aPNTs;
    const aPNTsBalance = await checkTokenBalance(provider, aPNTsAddress, walletAddress);
    const requiredAPNTs = "1000";
    const hasEnoughAPNTs = parseFloat(aPNTsBalance) >= parseFloat(requiredAPNTs);

    // Check ETH balance
    const ethBalance = await checkETHBalance(provider, walletAddress);
    const requiredETH = "0.05";
    const hasEnoughETH = parseFloat(ethBalance) >= parseFloat(requiredETH);

    return {
      isCommunityRegistered: communityCheck.isRegistered,
      communityName: communityCheck.communityName,
      communityRegisteredAt: communityCheck.registeredAt,

      hasXPNTs: xpntsCheck.hasToken,
      xPNTsAddress: xpntsCheck.tokenAddress,
      xPNTsExchangeRate: xpntsCheck.exchangeRate,

      hasPaymaster: false, // AOA+ doesn't deploy individual Paymaster
      paymasterAddress: undefined,

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
