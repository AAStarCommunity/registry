import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { parseEther, type Address, type Hash } from 'viem';
import { SepoliaFaucetAPI, GTOKEN_ADDRESS, REGISTRY_ADDRESS } from '@aastar/sdk';

export const useFaucet = () => {
  const { getSigner, address } = useWallet();

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
      const signer = await getSigner();
      
      console.log(`🚰 Minting ${amount} GTokens to ${address}...`);
      
      // Note: SepoliaFaucetAPI expects viem clients, but we have ethers signer
      // This is a temporary shim until SDK fully supports ethers
      const success = await SepoliaFaucetAPI.mintTestTokens(
        signer as any,
        signer as any, // Use signer as both wallet and public client (SDK will adapt)
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
  }, [getSigner, address]);

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
      const signer = await getSigner();
      
      console.log(`🚀 QuickStart: Setting up test account ${address}...`);

      const result = await SepoliaFaucetAPI.prepareTestAccount(
        signer as any,
        signer as any,
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
  }, [getSigner, address]);

  return {
    mintGTokens,
    quickStart,
    isLoading,
    error,
    lastTxHash,
  };
};
