import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { createPublicClient, http, type Address, type Hash } from 'viem';
import { sepolia, optimismSepolia } from 'viem/chains';
import { useRegistry } from './useRegistry';

export function usePaymasterV4() {
  const { address, isConnected, network, getSigner } = useWallet();
  const { getContractAddresses } = useRegistry();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /**
   * Deploy a new PaymasterV4
   */
  const deployPaymaster = useCallback(async (params?: { 
    stakeAmount?: bigint;
    version?: string;
  }): Promise<{ paymasterAddress: Address; deployHash: Hash; registerHash: Hash }> => {
    try {
      setLoading(true);
      setError(null);

      const contracts = await getContractAddresses();
      const { PaymasterOperatorClient } = await import('@aastar/operator');
      const signer = await getSigner();
      
      // Initialize Client
      const client = new PaymasterOperatorClient({
        client: signer as any,
        registryAddress: contracts.core.registry as Address,
        superPaymasterAddress: contracts.core.superPaymaster as Address,
        gTokenAddress: contracts.core.gToken as Address,
        gTokenStakingAddress: contracts.core.gTokenStaking as Address,
        paymasterFactoryAddress: contracts.core.paymasterFactory as Address,
        entryPointAddress: contracts.core.entryPoint as Address,
        ethUsdPriceFeedAddress: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia default
      });

      return await client.deployAndRegisterPaymasterV4(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deployment failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getSigner, network]);

  /**
   * Get Paymaster owned by the current user
   */
  const getOwnedPaymaster = useCallback(async (): Promise<Address | null> => {
    try {
      setLoading(true);
      const contracts = await getContractAddresses();
      const publicClient = getPublicClient();
      const { paymasterFactoryActions } = await import('@aastar/core');
      
      const factory = paymasterFactoryActions(contracts.core.paymasterFactory as Address);
      const paymaster = await factory(publicClient as any).getPaymaster({ 
        owner: address as Address 
      });

      if (paymaster === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      return paymaster;
    } catch (err) {
      console.error('Error fetching owned paymaster', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address, getContractAddresses, getPublicClient]);

  return {
    loading,
    error,
    deployPaymaster,
    getOwnedPaymaster,
  };
}
