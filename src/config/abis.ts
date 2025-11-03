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
