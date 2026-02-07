import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { parseEther, type Address, type Hash } from 'viem';
import { SepoliaFaucetAPI, GTOKEN_ADDRESS, REGISTRY_ADDRESS } from '@aastar/sdk';
import { useRegistry } from './useRegistry';

export const useFaucet = () => {
  const { address } = useWallet();
  const { getPublicClient, getWalletClient } = useRegistry();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<Hash | null>(null);

  /**
   * Mint Test GTokens for the current account
   */
  const mintGTokens = useCallback(async (amount: string = '1000') => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = getPublicClient();
      const walletClient = await getWalletClient();
      
      console.log(`🚰 Minting ${amount} GTokens to ${address}...`);
      
      const success = await SepoliaFaucetAPI.mintTestTokens(
        walletClient,
        publicClient as any, // viem version mismatch between registry and SDK
        GTOKEN_ADDRESS,
        address as Address,
        parseEther(amount)
      );

      if (success) {
        console.log('✅ GTokens minted successfully');
      } else {
        console.log('ℹ️ GToken balance already adequate');
      }
    } catch (err: any) {
      console.error('❌ Faucet Error (Mint):', err);
      setError(err.message || 'Failed to mint tokens');
    } finally {
      setIsLoading(false);
    }
  }, [address, getPublicClient, getWalletClient]);

  /**
   * Orchestrates complete test account setup (ETH, Role, GTokens)
   * Uses SepoliaFaucetAPI.prepareTestAccount
   */
  const quickStart = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = getPublicClient();
      const walletClient = await getWalletClient();
      
      console.log(`🚀 QuickStart: Setting up test account ${address}...`);

      const result = await SepoliaFaucetAPI.prepareTestAccount(
        walletClient,
        publicClient as any, // viem version mismatch between registry and SDK
        {
          targetAA: address as Address,
          token: GTOKEN_ADDRESS,
          registry: REGISTRY_ADDRESS,
          ethAmount: parseEther('0.1'),
          tokenAmount: parseEther('1000')
        }
      );

      console.log('✅ QuickStart Complete:', result);
    } catch (err: any) {
      console.error('❌ QuickStart Error:', err);
      setError(err.message || 'QuickStart failed');
    } finally {
      setIsLoading(false);
    }
  }, [address, getPublicClient, getWalletClient]);

  return {
    mintGTokens,
    quickStart,
    isLoading,
    error,
    lastTxHash,
  };
};
