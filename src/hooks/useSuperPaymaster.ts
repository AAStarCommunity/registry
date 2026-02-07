/**
 * useSuperPaymaster Hook
 * 
 * Encapsulates SuperPaymaster SDK calls and contract interactions
 * Focuses on Protocol Admin functions (Fees, Treasury, Pause)
 */

import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { createPublicClient, createWalletClient, custom, http, type Address, type Hash } from 'viem';
import { sepolia, optimismSepolia } from 'viem/chains';
import { useRegistry } from './useRegistry'; // Recycle getContractAddresses logic

export function useSuperPaymaster() {
  const { address, isConnected, network, chainId } = useWallet();
  const { getContractAddresses } = useRegistry();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Get Public Client
  const getPublicClient = useCallback(() => {
    const targetChain = network === 'op-sepolia' ? optimismSepolia : sepolia;
    const rpcBase = process.env.SEPOLIA_RPC_URL || '/api/rpc-proxy';
    const rpcUrl = rpcBase.includes('rpc-proxy') 
      ? `${rpcBase}?chainId=${targetChain.id}`
      : rpcBase;

    return createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl, { timeout: 30_000 }),
    });
  }, [network]);

  // Helper: Get Wallet Client
  const getWalletClient = useCallback(async () => {
    if (!window.ethereum || !address) throw new Error('No wallet connected');
    const targetChain = network === 'op-sepolia' ? optimismSepolia : sepolia;
    return createWalletClient({
      account: address as Address,
      chain: targetChain,
      transport: custom(window.ethereum),
    });
  }, [address, network]);

  /**
   * Get Protocol Fee Basis Points
   */
  const getProtocolFee = useCallback(async (): Promise<bigint> => {
    try {
      setLoading(true);
      const contracts = await getContractAddresses();
      const publicClient = getPublicClient();
      
      // Use raw readContract if SDK doesn't expose clean getter yet, or use SDK if available.
      // Assuming SDK layout. If not, fallback to direct ABI call could be needed, 
      // but let's try to import from @aastar/core first.
      const { superPaymasterActions } = await import('@aastar/core');
      
      // Note: If superPaymasterActions doesn't have getters, we might need direct read.
      // Checking ABI, 'protocolFee' is a public variable.
      // SDK Actions typically cover write. For read, we might need standard viem readContract
      // if SDK actions don't cover it. 
      // Let's assume for now we can read public vars via viem direct if needed, 
      // but let's try to use the pattern:
      
      // Dynamic import ABI if needed
      const { SuperPaymasterABI } = await import('@aastar/core'); 
      
      const fee = await publicClient.readContract({
        address: contracts.core.superPaymaster as Address,
        abi: SuperPaymasterABI,
        functionName: 'protocolFeeBPS',
        args: [],
      });
      
      return fee as bigint;
    } catch (err) {
      console.error('Error fetching protocol fee', err);
      // Fallback or rethrow?
      return 0n;
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getPublicClient]);

  /**
   * Get Treasury Address
   */
  const getTreasury = useCallback(async (): Promise<Address> => {
    try {
      setLoading(true);
      const contracts = await getContractAddresses();
      const publicClient = getPublicClient();
      const { SuperPaymasterABI } = await import('@aastar/core');
      
      const treasury = await publicClient.readContract({
        address: contracts.core.superPaymaster as Address,
        abi: SuperPaymasterABI,
        functionName: 'treasury',
        args: [],
      });
      
      return treasury as Address;
    } catch (err) {
      console.error('Error fetching treasury', err);
      return '0x0000000000000000000000000000000000000000';
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getPublicClient]);

  /**
   * Set Protocol Fee (Owner Only)
   */
  const setProtocolFee = useCallback(async (newFeeBPS: bigint): Promise<Hash> => {
    try {
      setLoading(true);
      setError(null);
      const contracts = await getContractAddresses();
      const walletClient = await getWalletClient();
      const publicClient = getPublicClient();
      const { SuperPaymasterABI } = await import('@aastar/core');

      const hash = await walletClient.writeContract({
        address: contracts.core.superPaymaster as Address,
        abi: SuperPaymasterABI,
        functionName: 'setProtocolFee',
        args: [newFeeBPS],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set protocol fee';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getWalletClient, getPublicClient]);

  /**
   * Set Treasury (Owner Only)
   */
  const setTreasury = useCallback(async (newTreasury: Address): Promise<Hash> => {
    try {
      setLoading(true);
      setError(null);
      const contracts = await getContractAddresses();
      const walletClient = await getWalletClient();
      const publicClient = getPublicClient();
      const { SuperPaymasterABI } = await import('@aastar/core');

      const hash = await walletClient.writeContract({
        address: contracts.core.superPaymaster as Address,
        abi: SuperPaymasterABI,
        functionName: 'setTreasury',
        args: [newTreasury],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set treasury';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getWalletClient, getPublicClient]);

  /**
   * Set Operator Paused (Owner Only)
   */
  const setOperatorPaused = useCallback(async (operator: Address, paused: boolean): Promise<Hash> => {
    try {
      setLoading(true);
      setError(null);
      const contracts = await getContractAddresses();
      const walletClient = await getWalletClient();
      const publicClient = getPublicClient();
      const { SuperPaymasterABI } = await import('@aastar/core');

      const hash = await walletClient.writeContract({
        address: contracts.core.superPaymaster as Address,
        abi: SuperPaymasterABI,
        functionName: 'setOperatorPaused',
        args: [operator, paused],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to pause operator';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getWalletClient, getPublicClient]);

  return {
    loading,
    error,
    getProtocolFee,
    getTreasury,
    setProtocolFee,
    setTreasury,
    setOperatorPaused,
  };
}
