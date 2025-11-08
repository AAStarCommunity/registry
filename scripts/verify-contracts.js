/**
 * Test script to verify contract addresses from shared-config
 */

import { getCoreContracts } from '@aastar/shared-config';
import { getCurrentNetworkConfig } from './src/config/networkConfig.js';

console.log('=== Contract Address Verification ===');

// Check shared-config directly
console.log('\n--- From shared-config ---');
const sepoliaCore = getCoreContracts('sepolia');
console.log('Sepolia GToken:', sepoliaCore.gToken);
console.log('Sepolia GTokenStaking:', sepoliaCore.gTokenStaking);

// Check from our network config
console.log('\n--- From networkConfig ---');
const config = getCurrentNetworkConfig();
console.log('Current Network:', config.chainName);
console.log('GToken from config:', config.contracts.gToken);
console.log('GTokenStaking from config:', config.contracts.gTokenStaking);

// Verify they match
console.log('\n--- Verification ---');
console.log('Addresses match:', sepoliaCore.gToken === config.contracts.gToken ? '✅' : '❌');