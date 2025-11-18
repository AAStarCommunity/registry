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

        // Update progress
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
          // Prepare method arguments
          const args = this.prepareMethodArguments(method, parameters, i, addresses);

          // Execute transaction
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

          // Update progress
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
          console.error(`Failed to mint for address ${address}:`, error);

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
      if (param.name === 'users' || param.name === 'to' || param.name === 'recipients') {
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
}