/**
 * useRegistry Hook
 * 
 * 封装Registry SDK调用，提供React Hook接口
 */

import { useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { createPublicClient, createWalletClient, custom, http, type Address, type Hash, type Hex } from 'viem';
import { sepolia, optimismSepolia } from 'viem/chains';
import type { RoleConfigDetailed } from '@aastar/core';

export function useRegistry() {
  const { address, isConnected, network, chainId } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache Keys Prefix & TTL
  const CACHE_PREFIX = 'reg-v3-';
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Helper: Cached Call Wrapper
  const cachedCall = useCallback(async <T>(
    keySuffix: string, 
    fetcher: () => Promise<T>, 
    ttl = CACHE_TTL
  ): Promise<T> => {
    const fullKey = CACHE_PREFIX + keySuffix;
    
    // 1. Try Cache
    try {
      const item = localStorage.getItem(fullKey);
      if (item) {
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp < ttl) {
          console.log(`⚡ [Cache Hit] ${keySuffix}`, parsed.data);
          return parsed.data as T;
        } else {
          localStorage.removeItem(fullKey); // Expired
        }
      }
    } catch (e) {
      console.warn('Cache read failed', e);
    }

    // 2. Fetch
    const data = await fetcher();

    // 3. Set Cache
    try {
      const replacer = (_key: string, value: any) => 
        typeof value === 'bigint' ? value.toString() : value;
        
      localStorage.setItem(fullKey, JSON.stringify({
        timestamp: Date.now(),
        data
      }, replacer));
    } catch (e) {
      console.warn('Cache write failed', e);
    }

    return data;
  }, []);

  // Action: Clear Registry Cache
  const clearCache = useCallback(() => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🧹 Registry cache cleared');
    window.location.reload();
  }, []);

  // 获取合约地址 (使用 SDK 真实数据)
  const getContractAddresses = useCallback(async () => {
    // 动态导入以避免初始化时的 SSR/构建 问题，尝试隔离依赖
    const { getContracts } = await import('@aastar/core');
    // 确保 network 类型匹配
    const net = (network === 'sepolia' || network === 'op-sepolia') ? network : 'sepolia';
    return getContracts(net as any);
  }, [network]);

  // 创建PublicClient
  const getPublicClient = useCallback(() => {
    const targetChain = network === 'op-sepolia' ? optimismSepolia : sepolia;
    const rpcBase = process.env.SEPOLIA_RPC_URL || '/api/rpc-proxy';
    
    // If using proxy, append chainId query param
    const rpcUrl = rpcBase.includes('rpc-proxy') 
      ? `${rpcBase}?chainId=${targetChain.id}`
      : rpcBase;

    return createPublicClient({
      chain: targetChain,
      transport: http(rpcUrl, { timeout: 30_000 }), // 30s timeout
    });
  }, [network]);

  // 创建WalletClient
  const getWalletClient = useCallback(async () => {
    if (!window.ethereum || !address) {
      throw new Error('No wallet connected');
    }
    
    const targetChain = network === 'op-sepolia' ? optimismSepolia : sepolia;

    return createWalletClient({
      account: address as Address,
      chain: targetChain,
      transport: custom(window.ethereum),
    });
  }, [address, network]);

  /**
   * 查询Role配置
   */
  const getRoleConfig = useCallback(async (roleId: Hex): Promise<RoleConfigDetailed> => {
    return cachedCall(`role-config-${roleId}-${chainId}`, async () => {
      try {
        setLoading(true);
        setError(null);

        const contracts = await getContractAddresses();
        const publicClient = getPublicClient();
        const { registryActions } = await import('@aastar/core');

        // 使用 as any 规避 viem 版本不一致导致的类型检查错误，但逻辑是真实的
        return await registryActions(contracts.core.registry)(publicClient as any).getRoleConfig({
          roleId,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    });
  }, [getContractAddresses, getPublicClient, cachedCall, chainId]);

  /**
   * 获取Role ID常量
   */
  const getRoleIds = useCallback(async () => {
    return cachedCall(`role-ids-${chainId}`, async () => {
      try {
        const contracts = await getContractAddresses();
        const publicClient = getPublicClient();
        const { registryActions } = await import('@aastar/core');
        
        const actions = registryActions(contracts.core.registry)(publicClient as any);
        
        const [
          paymasterSuper, 
          community, 
          enduser,
          paymasterAOA,
          dvt,
          anode,
          kms
        ] = await Promise.all([
          actions.ROLE_PAYMASTER_SUPER(),
          actions.ROLE_COMMUNITY(),
          actions.ROLE_ENDUSER(),
          actions.ROLE_PAYMASTER_AOA(),
          actions.ROLE_DVT(),
          actions.ROLE_ANODE(),
          actions.ROLE_KMS(),
        ]);

        return {
          ROLE_PAYMASTER_SUPER: paymasterSuper,
          ROLE_COMMUNITY: community,
          ROLE_ENDUSER: enduser,
          ROLE_PAYMASTER_AOA: paymasterAOA,
          ROLE_DVT: dvt,
          ROLE_ANODE: anode,
          ROLE_KMS: kms,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        throw err;
      }
    });
  }, [getContractAddresses, getPublicClient, cachedCall, chainId]);

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
      const txHash = await registryActions(contracts.core.registry)(walletClient as any).adminConfigureRole({
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

      const txHash = await registryActions(contracts.core.registry)(walletClient as any).transferOwnership({
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

      return await registryActions(contracts.core.registry)(publicClient as any).hasRole({
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
    hasRole,
    getContractAddresses,
    clearCache,
  };
}
