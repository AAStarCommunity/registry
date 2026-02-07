import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { createPublicClient, http, parseEther, type Address, type Hash } from 'viem';
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

  /**
   * Deposit ETH to Paymaster
   */
  const deposit = useCallback(async (amount: string) => {
    try {
      setLoading(true);
      const paymaster = await getOwnedPaymaster();
      if (!paymaster) throw new Error('No paymaster found');

      const signer = await getSigner();
      const tx = await signer.sendTransaction({
        to: paymaster,
        value: parseEther(amount)
      });
      
      return tx;
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getOwnedPaymaster, getSigner]);

  /**
   * Withdraw ETH from Paymaster
   */
  const withdraw = useCallback(async (to: Address, amount: string) => {
    try {
      setLoading(true);
      const paymaster = await getOwnedPaymaster();
      if (!paymaster) throw new Error('No paymaster found');

      const contracts = await getContractAddresses(); // ensure contracts loaded if needed for ABI
      const { PaymasterOperatorClient } = await import('@aastar/operator');
      const signer = await getSigner();
      
      // We can use the generic client or a specific contract instance
      // For V4, withdrawal might be a function on the contract 'withdrawTo'
      // Assuming PaymasterV4 has withdrawTo(address, uint256)
      
      // Quickest way: use a raw contract call via signer or client
      // Let's use the PaymasterOperatorClient helper if available, or raw call
      
      const { parseEther } = await import('viem');
      
      // Using raw contract call for simplicity if method exists
      // const tx = await contract.withdrawTo(to, parseEther(amount));
      
      // Alternatively, use PaymasterOperatorClient if it exposes it. 
      // Checking SDK... BasePaymaster usually has withdrawTo.
      
      /* 
       * Ideally we should use the SDK client, but for now let's leave this blank 
       * or simple until we confirm the V4 ABI. 
       * User complained about Settings being invalid. settings usually implies config.
       */
       
       throw new Error('Withdrawal not yet implemented in UI');

    } catch (err: any) {
      setError(err.message || 'Withdrawal failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getOwnedPaymaster, getSigner, getContractAddresses]);

  return {
    loading,
    error,
    deployPaymaster,
    getOwnedPaymaster,
    deposit,
    withdraw
  };
}
