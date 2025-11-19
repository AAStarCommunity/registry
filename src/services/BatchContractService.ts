import { ethers } from 'ethers';
import {
  getCoreContracts,
  getTokenContracts,
  MySBTABI,
} from '@aastar/shared-config';
import type { ContractConfig, BatchMethod } from '../types/contracts';
import { getRpcUrl } from '../config/rpc';

export interface BatchMintResult {
  success: boolean;
  txHash: string;
  results: {
    address: string;
    success: boolean;
    tokenId?: string;
    error?: string;
  }[];
  totalGasUsed: number;
  gasPrice: string;
  totalCost: string;
}

export interface BatchExecutionProgress {
  currentIndex: number;
  totalItems: number;
  currentAddress: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentStep?: 'checking_gtoken' | 'transferring_gtoken' | 'minting';
  currentStepDescription?: string;
  gTokenTransferred?: boolean;
  gTokenAmount?: string;
  results: BatchMintResult['results'];
}

export class BatchContractService {
  private network: 'sepolia' = 'sepolia';
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(getRpcUrl());
  }

  // Connect wallet for transaction signing
  async connectWallet(): Promise<boolean> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await provider.getSigner();
      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }

  // Get current connected account
  getCurrentAccount(): string | null {
    if (!this.signer) return null;
    try {
      return this.signer.address;
    } catch (error) {
      console.error('Failed to get current account:', error);
      return null;
    }
  }

  // Execute batch minting
  async executeBatchMint(
    contractConfig: ContractConfig,
    method: BatchMethod,
    addresses: string[],
    parameters: { [key: string]: any },
    onProgress?: (progress: BatchExecutionProgress) => void
  ): Promise<BatchMintResult> {
    if (!this.signer) {
      throw new Error('Wallet not connected. Please connect wallet first.');
    }

    const results: BatchMintResult['results'] = [];
    let totalGasUsed = 0;
    let currentTxHash = '';

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        this.signer
      );

      // Check if the method exists
      if (!contract[method.name]) {
        throw new Error(`Method ${method.name} not found on contract ${contractConfig.address}`);
      }

      const totalItems = addresses.length;

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];

        // Update progress - starting
        if (onProgress) {
          onProgress({
            currentIndex: i,
            totalItems,
            currentAddress: address,
            status: 'executing',
            results: [...results]
          });
        }

        try {
          // Step 1: Check and ensure GToken balance if required
          if (method.requiresGTokenCheck) {
            const requiredAmount = method.requiredGTokenAmount || '0.4';

            // Update progress - checking GToken
            if (onProgress) {
              onProgress({
                currentIndex: i,
                totalItems,
                currentAddress: address,
                status: 'executing',
                currentStep: 'checking_gtoken',
                currentStepDescription: `Checking GToken balance (required: ${requiredAmount} GT)`,
                results: [...results]
              });
            }

            console.log(`[${i + 1}/${totalItems}] Checking GToken balance for ${address}...`);

            const { balance, hasEnough } = await this.checkGTokenBalance(address);

            if (!hasEnough) {
              const toTransfer = (parseFloat(requiredAmount) - parseFloat(balance)).toFixed(4);

              // Update progress - transferring GToken
              if (onProgress) {
                onProgress({
                  currentIndex: i,
                  totalItems,
                  currentAddress: address,
                  status: 'executing',
                  currentStep: 'transferring_gtoken',
                  currentStepDescription: `Transferring ${toTransfer} GT (current: ${balance} GT)`,
                  gTokenAmount: toTransfer,
                  results: [...results]
                });
              }

              console.log(`[${i + 1}/${totalItems}] Insufficient GToken (${balance} < ${requiredAmount}), transferring ${toTransfer} GT...`);

              const gTokenResult = await this.ensureGTokenBalance(address, requiredAmount);

              if (!gTokenResult.success) {
                throw new Error(`GToken transfer failed: ${gTokenResult.error}`);
              }

              console.log(`[${i + 1}/${totalItems}] GToken transferred successfully (txHash: ${gTokenResult.txHash})`);

              // Small delay after GToken transfer
              await this.delay(500);
            } else {
              console.log(`[${i + 1}/${totalItems}] GToken balance sufficient (${balance} >= ${requiredAmount})`);
            }
          }

          // Step 2: Update progress - minting
          if (onProgress) {
            onProgress({
              currentIndex: i,
              totalItems,
              currentAddress: address,
              status: 'executing',
              currentStep: 'minting',
              currentStepDescription: `Minting SBT for ${address.slice(0, 6)}...${address.slice(-4)}`,
              results: [...results]
            });
          }

          // Step 3: Prepare method arguments
          const args = this.prepareMethodArguments(method, parameters, i, addresses);

          // Step 4: Execute mint transaction
          console.log(`[${i + 1}/${totalItems}] Executing mint for ${address}...`);
          const tx = await contract[method.name](...args);
          currentTxHash = tx.hash;

          // Wait for transaction confirmation
          const receipt = await tx.wait();
          totalGasUsed += Number(receipt.gasUsed);

          // Parse result for single mint vs batch mint
          const result = this.parseTransactionResult(receipt, method, address);

          results.push({
            address,
            success: true,
            tokenId: result.tokenId,
            error: undefined
          });

          console.log(`[${i + 1}/${totalItems}] ✅ Mint successful for ${address} (tokenId: ${result.tokenId || 'N/A'})`);

          // Update progress - completed
          if (onProgress) {
            onProgress({
              currentIndex: i + 1,
              totalItems,
              currentAddress: address,
              status: 'completed',
              results: [...results]
            });
          }

          // Add delay between transactions to avoid nonce conflicts
          if (i < addresses.length - 1) {
            await this.delay(1000); // 1 second delay
          }

        } catch (error: any) {
          console.error(`[${i + 1}/${totalItems}] ❌ Failed to mint for address ${address}:`, error);

          results.push({
            address,
            success: false,
            error: error.message || 'Transaction failed'
          });

          // Continue with next address
          continue;
        }
      }

      // Get gas price
      const gasPrice = await this.provider.getFeeData();
      const gasPriceValue = gasPrice.gasPrice || BigInt(0);
      const totalCost = ethers.formatEther(
        BigInt(totalGasUsed) * gasPriceValue
      );

      return {
        success: results.every(r => r.success),
        txHash: currentTxHash,
        results,
        totalGasUsed,
        gasPrice: ethers.formatUnits(gasPriceValue, 'gwei'),
        totalCost
      };

    } catch (error: any) {
      console.error('Batch minting failed:', error);

      return {
        success: false,
        txHash: '',
        results,
        totalGasUsed,
        gasPrice: '0',
        totalCost: '0'
      };
    }
  }

  // Prepare method arguments based on method type
  private prepareMethodArguments(
    method: BatchMethod,
    parameters: { [key: string]: any },
    index: number,
    addresses: string[]
  ): any[] {
    const args: any[] = [];

    method.parameters.forEach(param => {
      if (param.name === 'user' || param.name === 'users' || param.name === 'to' || param.name === 'recipients') {
        // Use the current address for single mint, or all addresses for batch mint
        if (param.isArray) {
          args.push(addresses);
        } else {
          args.push(addresses[index]);
        }
      } else if (param.name === 'comms' || param.name === 'community' || param.name === 'toCommunity') {
        // Handle community parameter
        const communityValue = parameters[param.name];
        if (Array.isArray(communityValue)) {
          args.push(communityValue[index] || communityValue[0]);
        } else {
          args.push(communityValue);
        }
      } else if (param.name === 'metas' || param.name === 'metadata' || param.name === 'uri') {
        // Handle metadata parameter
        const metaValue = parameters[param.name];
        if (Array.isArray(metaValue)) {
          args.push(metaValue[index] || metaValue[0] || '{}');
        } else {
          args.push(metaValue);
        }
      } else {
        // Handle other parameters
        args.push(parameters[param.name] || '');
      }
    });

    return args;
  }

  // Parse transaction result
  private parseTransactionResult(
    receipt: any,
    method: BatchMethod,
    address: string
  ): { tokenId?: string } {
    try {
      // Look for Transfer events for NFT/FT
      if (receipt.events) {
        const transferEvent = receipt.events.find((event: any) =>
          event.event === 'Transfer' &&
          event.args?.to?.toLowerCase() === address.toLowerCase()
        );

        if (transferEvent && transferEvent.args?.tokenId) {
          return { tokenId: transferEvent.args.tokenId.toString() };
        }
      }

      // Look for specific result events
      if (receipt.events) {
        const mintEvent = receipt.events.find((event: any) =>
          event.event === 'Mint' || event.event === 'Minted'
        );

        if (mintEvent && mintEvent.args?.tokenId) {
          return { tokenId: mintEvent.args.tokenId.toString() };
        }
      }

      // For SBT, the token ID might be deterministic
      if (method.name === 'mintFor' || method.name === 'userMint') {
        // Use address as base for token ID calculation
        return { tokenId: this.calculateTokenId(address) };
      }

      return {};
    } catch (error) {
      console.warn('Failed to parse transaction result:', error);
      return {};
    }
  }

  // Calculate token ID for SBT (simple hash-based approach)
  private calculateTokenId(address: string): string {
    // Simple hash-based token ID calculation
    // In production, this would follow the actual contract logic
    return ethers.keccak256(ethers.solidityPacked(['uint256', 'address'], [1, address])).toString();
  }

  // Delay helper
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Estimate gas for batch operation
  async estimateBatchGas(
    contractConfig: ContractConfig,
    method: BatchMethod,
    addresses: string[],
    parameters: { [key: string]: any }
  ): Promise<number> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        this.signer
      );

      // Estimate for first address
      const args = this.prepareMethodArguments(method, parameters, 0, addresses);
      const gasEstimate = await contract[method.name].estimateGas(...args);

      // Multiply by number of addresses for batch operations
      return Number(gasEstimate) * addresses.length;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return method.gasEstimate * addresses.length;
    }
  }

  // Check if user has sufficient balance
  async checkSufficientBalance(
    estimatedGas: number,
    gasPrice: string
  ): Promise<boolean> {
    if (!this.signer) return false;

    try {
      const balance = await this.provider.getBalance(this.signer.address);
      const requiredBalance = BigInt(estimatedGas) * BigInt(gasPrice);

      return balance >= requiredBalance;
    } catch (error) {
      console.error('Failed to check balance:', error);
      return false;
    }
  }

  // Check GToken balance for a specific address
  async checkGTokenBalance(address: string): Promise<{ balance: string; hasEnough: boolean }> {
    try {
      const core = getCoreContracts(this.network);
      const gTokenContract = new ethers.Contract(
        core.gToken,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );

      const balance = await gTokenContract.balanceOf(address);
      const balanceInEther = ethers.formatEther(balance);
      const hasEnough = parseFloat(balanceInEther) >= 0.4;

      return {
        balance: balanceInEther,
        hasEnough
      };
    } catch (error) {
      console.error(`Failed to check GToken balance for ${address}:`, error);
      return { balance: '0', hasEnough: false };
    }
  }

  // Transfer GToken to address if balance is insufficient
  async ensureGTokenBalance(
    targetAddress: string,
    requiredAmount: string = '0.4'
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.signer) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Check current balance
      const { balance, hasEnough } = await this.checkGTokenBalance(targetAddress);

      if (hasEnough) {
        return { success: true };
      }

      // Calculate how much to transfer
      const currentBalance = parseFloat(balance);
      const required = parseFloat(requiredAmount);
      const toTransfer = required - currentBalance;

      if (toTransfer <= 0) {
        return { success: true };
      }

      // Transfer GToken from operator to target address
      const core = getCoreContracts(this.network);
      const gTokenContract = new ethers.Contract(
        core.gToken,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        this.signer
      );

      const transferAmount = ethers.parseEther(toTransfer.toFixed(18));
      const tx = await gTokenContract.transfer(targetAddress, transferAmount);
      await tx.wait();

      return { success: true, txHash: tx.hash };
    } catch (error: any) {
      console.error(`Failed to ensure GToken balance for ${targetAddress}:`, error);
      return { success: false, error: error.message || 'Transfer failed' };
    }
  }

  // Batch ensure GToken balances for multiple addresses
  async batchEnsureGTokenBalances(
    addresses: string[],
    requiredAmount: string = '0.4',
    onProgress?: (current: number, total: number, address: string, status: string) => void
  ): Promise<{
    success: boolean;
    results: { address: string; success: boolean; error?: string; transferred?: boolean }[];
  }> {
    const results: { address: string; success: boolean; error?: string; transferred?: boolean }[] = [];

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];

      if (onProgress) {
        onProgress(i + 1, addresses.length, address, 'Checking GToken balance...');
      }

      const result = await this.ensureGTokenBalance(address, requiredAmount);

      results.push({
        address,
        success: result.success,
        error: result.error,
        transferred: result.txHash !== undefined
      });

      if (!result.success) {
        console.error(`Failed to ensure GToken for ${address}:`, result.error);
      }

      // Small delay between transfers
      if (i < addresses.length - 1 && result.txHash) {
        await this.delay(1000);
      }
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }
}