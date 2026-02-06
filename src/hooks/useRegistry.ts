/**
 * useRegistry Hook
 * 
 * 封装Registry SDK调用，提供React Hook接口
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { createPublicClient, createWalletClient, custom, http, type Address, type Hash, type Hex } from 'viem';
import { sepolia } from 'viem/chains';
import type { RoleConfigDetailed } from '@aastar/core';

export function useRegistry() {
  const { address, isConnected, network, chainId } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取合约地址
  const getContractAddresses = useCallback(async () => {
    const { getContracts } = await import('@aastar/core');
    return getContracts(network as 'sepolia');
  }, [network]);

  // 创建PublicClient（用于read操作）
  const getPublicClient = useCallback(() => {
    return createPublicClient({
      chain: sepolia,
      transport: http('https://rpc.sepolia.org'),
    });
  }, []);

  // 创建WalletClient（用于write操作）
  const getWalletClient = useCallback(async () => {
    if (!window.ethereum || !address) {
      throw new Error('No wallet connected');
    }
    
    return createWalletClient({
      account: address as Address,
      chain: sepolia,
      transport: custom(window.ethereum),
    });
  }, [address]);

  /**
   * 查询Role配置
   */
  const getRoleConfig = useCallback(async (roleId: Hex): Promise<RoleConfigDetailed> => {
    try {
      setLoading(true);
      setError(null);

      const contracts = await getContractAddresses();
      const publicClient = getPublicClient();
      const { registryActions } = await import('@aastar/core');

      const config = await registryActions(contracts.core.registry)(publicClient).getRoleConfig({
        roleId,
      });

      return config;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getContractAddresses, getPublicClient]);

  /**
   * 获取Role ID常量
   */
  const getRoleIds = useCallback(async () => {
    try {
      const contracts = await getContractAddresses();
      const publicClient = getPublicClient();
      const { registryActions } = await import('@aastar/core');
      
      const actions = registryActions(contracts.core.registry)(publicClient);
      
      const [paymasterSuper, community, enduser] = await Promise.all([
        actions.ROLE_PAYMASTER_SUPER(),
        actions.ROLE_COMMUNITY(),
        actions.ROLE_ENDUSER(),
      ]);

      return {
        ROLE_PAYMASTER_SUPER: paymasterSuper,
        ROLE_COMMUNITY: community,
        ROLE_ENDUSER: enduser,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    }
  }, [getContractAddresses, getPublicClient]);

  /**
   * 修改Role配置（仅Admin）
   */
  const adminConfigureRole = useCallback(async (params: {
    roleId: Hex;
    minStake: bigint;
    entryBurn: bigint;
    exitFeePercent: bigint;
    minExitFee: bigint;
  }): Promise<Hash> => {
    try {
      setLoading(true);
      setError(null);

      const contracts = await getContractAddresses();
      const walletClient = await getWalletClient();
      const publicClient = getPublicClient();
      const { registryActions } = await import('@aastar/core');

      // 发送交易
      const txHash = await registryActions(contracts.core.registry)(walletClient).adminConfigureRole({
        ...params,
        account: address as Address,
      });

      // 等待确认
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      return txHash;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getContractAddresses, getWalletClient, getPublicClient]);

  /**
   * 转移所有权
   */
  const transferOwnership = useCallback(async (newOwner: Address): Promise<Hash> => {
    try {
      setLoading(true);
      setError(null);

      const contracts = await getContractAddresses();
      const walletClient = await getWalletClient();
      const publicClient = getPublicClient();
      const { registryActions } = await import('@aastar/core');

      const txHash = await registryActions(contracts.core.registry)(walletClient).transferOwnership({
        newOwner,
        account: address as Address,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      return txHash;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, getContractAddresses, getWalletClient, getPublicClient]);

  /**
   * 检查用户是否有指定角色
   */
  const hasRole = useCallback(async (roleId: Hex, user: Address): Promise<boolean> => {
    try {
      const contracts = await getContractAddresses();
      const publicClient = getPublicClient();
      const { registryActions } = await import('@aastar/core');

      return await registryActions(contracts.core.registry)(publicClient).hasRole({
        roleId,
        user,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    }
  }, [getContractAddresses, getPublicClient]);

  return {
    loading,
    error,
    getRoleConfig,
    getRoleIds,
    adminConfigureRole,
    transferOwnership,
    hasRole,
    getContractAddresses,
  };
}
