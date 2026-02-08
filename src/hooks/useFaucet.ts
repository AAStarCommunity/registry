import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { type Hash } from 'viem';

export const useFaucet = () => {
  const { address } = useWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<Hash | null>(null);

  /**
   * Basic Asset Funding (Zero-Gas Background Process)
   * Fetches ETH and Gas Tokens from the backend supplier.
   */
  const fundAssets = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🚰 Requesting test assets for ${address}...`);
      
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: address,
          // No ownerKey sent to backend - backend only handles supplier-funded assets
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Faucet request failed');
      }

      console.log('✅ Asset funding successful:', result);
      if (result.hash) setLastTxHash(result.hash);
      
    } catch (err: any) {
      console.error('❌ Faucet Error:', err);
      setError(err.message || 'Failed to fund assets');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Alias for backward compatibility or specific token minting needs
  const mintGTokens = fundAssets;
  const quickStart = fundAssets;

  return {
    fundAssets,
    mintGTokens,
    quickStart,
    isLoading,
    error,
    lastTxHash,
  };
};
