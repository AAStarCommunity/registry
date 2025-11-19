import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { MySBTABI, RegistryABI } from '@aastar/shared-config';
import { getCoreContracts, getTokenContracts } from '@aastar/shared-config';
import { getRpcUrl } from '../config/rpc';

export interface OperatorPermissions {
  isOperator: boolean;
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to check if the connected wallet is a registered community owner in Registry
 */
export function useOperatorPermissions(account?: string): OperatorPermissions {
  const [permissions, setPermissions] = useState<OperatorPermissions>({
    isOperator: false,
    isOwner: false,
    isLoading: false,
    error: null,
  });

  const checkPermissions = useCallback(async (address: string) => {
    if (!address || !ethers.isAddress(address)) {
      setPermissions(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setPermissions(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const rpcProvider = new ethers.JsonRpcProvider(getRpcUrl());
      const core = getCoreContracts('sepolia');
      const tokens = getTokenContracts('sepolia');

      // Check if the address is a registered community in Registry
      const registry = new ethers.Contract(core.registry, RegistryABI, rpcProvider);

      let isOperator = false;
      let isOwner = false;

      try {
        // Check if this address has registered a community in Registry
        // If registeredAt != 0, this address is a community owner
        const isRegisteredCommunity = await registry.isRegisteredCommunity(address);

        console.log(`[useOperatorPermissions] Checking ${address}`);
        console.log(`[useOperatorPermissions] isRegisteredCommunity: ${isRegisteredCommunity}`);

        if (isRegisteredCommunity) {
          // This address is a registered community owner
          isOperator = true;

          // Also check if this is the Registry contract owner (DAO multisig)
          try {
            const registryOwner = await registry.owner();
            isOwner = registryOwner.toLowerCase() === address.toLowerCase();
          } catch (err) {
            console.warn('Could not check registry owner:', err);
          }
        }
      } catch (err) {
        console.warn('Could not check registry permissions:', err);
        isOperator = false;
      }

      setPermissions({
        isOperator,
        isOwner,
        isLoading: false,
        error: null,
      });

    } catch (err: any) {
      console.error('Error checking permissions:', err);
      setPermissions({
        isOperator: false,
        isOwner: false,
        isLoading: false,
        error: err.message || 'Failed to check permissions',
      });
    }
  }, []);

  useEffect(() => {
    if (account) {
      checkPermissions(account);
    } else {
      setPermissions(prev => ({ ...prev, isLoading: false }));
    }
  }, [account, checkPermissions]);

  return permissions;
}