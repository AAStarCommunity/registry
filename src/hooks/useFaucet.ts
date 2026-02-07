import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { type Hash } from 'viem';

export const useFaucet = () => {
  const { address } = useWallet();

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
      console.log(`🚰 Requesting airdrop for ${address}...`);
      
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Faucet request failed');
      }

      console.log('✅ Airdrop successful:', result);
      // Optional: you could set the lastTxHash if the API returns one
      if (result.hash) setLastTxHash(result.hash);
      
    } catch (err: any) {
      console.error('❌ Faucet Error:', err);
      setError(err.message || 'Failed to request tokens');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  /**
   * Orchestrates complete test account setup (ETH, Role, GTokens)
   */
  const quickStart = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🚀 QuickStart: Setting up test account ${address}...`);

      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: address,
          // If we had the ownerKey (e.g. from local storage or generated), we would pass it here
          // For MetaMask users, we usually only fund the target
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'QuickStart failed');
      }

      console.log('✅ QuickStart Complete:', result);
    } catch (err: any) {
      console.error('❌ QuickStart Error:', err);
      setError(err.message || 'QuickStart failed');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  return {
    mintGTokens,
    quickStart,
    isLoading,
    error,
    lastTxHash,
  };
};
