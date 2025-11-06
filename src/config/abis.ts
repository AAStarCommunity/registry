/**
 * Contract ABIs imported from @aastar/shared-config
 *
 * Centralized ABI management - all contract ABIs should be imported from shared-config
 * to ensure consistency across the AAstar ecosystem.
 */

import {
  RegistryABI,
  GTokenABI,
  GTokenStakingABI,
  SuperPaymasterV2ABI,
  PaymasterFactoryABI,
  PaymasterV4ABI,
  xPNTsTokenABI,
  xPNTsFactoryABI,
  MySBTABI,
} from '@aastar/shared-config';

// Standard ERC-20 ABI for token balance checking
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// EntryPoint v0.7 ABI for deposit operations
export const ENTRY_POINT_ABI = [
  "function depositTo(address account) external payable",
  "function balanceOf(address account) external view returns (uint256)",
  "function getDepositInfo(address account) external view returns (uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)",
];

// Legacy Registry ABIs for backward compatibility in RegistryExplorer
export const RegistryV1ABI = [
  "function getActivePaymasters() external view returns (address[])",
  "function getPaymasterCount() external view returns (uint256)",
  "function getPaymasterInfo(address paymaster) view returns (uint256 feeRate, bool isActive, uint256 successCount, uint256 totalAttempts, string memory name)",
  "function isPaymasterActive(address paymaster) view returns (bool)",
];

export const RegistryV2_1ABI = [
  "function getCommunityCount() view returns (uint256)",
  "function getCommunities(uint256 offset, uint256 limit) view returns (address[])",
  "function getCommunityProfile(address communityAddress) view returns (tuple(string name, string ensName, string description, string website, string logoURI, string twitterHandle, string githubOrg, string telegramGroup, address xPNTsToken, address[] supportedSBTs, uint8 mode, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, uint256 memberCount))",
];

export const RegistryV2_1_4ABI = [
  "function getCommunityCount() view returns (uint256)",
  "function getCommunities(uint256 offset, uint256 limit) view returns (address[])",
  {
    type: "function",
    name: "communities",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "ensName", type: "string", internalType: "string" },
      { name: "xPNTsToken", type: "address", internalType: "address" },
      { name: "nodeType", type: "uint8", internalType: "enum Registry.NodeType" },
      { name: "paymasterAddress", type: "address", internalType: "address" },
      { name: "community", type: "address", internalType: "address" },
      { name: "registeredAt", type: "uint256", internalType: "uint256" },
      { name: "lastUpdatedAt", type: "uint256", internalType: "uint256" },
      { name: "isActive", type: "bool", internalType: "bool" },
      { name: "allowPermissionlessMint", type: "bool", internalType: "bool" }
    ],
    stateMutability: "view"
  },
  "function nodeTypeConfigs(uint8) view returns (tuple(uint256 minStake, uint256 lockPeriod, bool isActive))",
  "function registerCommunity(tuple(string name, string ensName, address xPNTsToken, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint), uint256 stakeAmount) external",
];

// Export ABIs from shared-config
export {
  RegistryABI,
  GTokenABI,
  GTokenStakingABI,
  SuperPaymasterV2ABI,
  PaymasterFactoryABI,
  PaymasterV4ABI,
  xPNTsTokenABI,
  xPNTsFactoryABI,
  MySBTABI,
};
