import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { MySBTABI } from '@aastar/shared-config';
import { getCoreContracts, getTokenContracts } from '@aastar/shared-config';
import { getRpcUrl } from '../config/rpc';

export interface OperatorPermissions {
  isOperator: boolean;
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to check if the connected wallet has Operator permissions for MySBT contract
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
      const mySBT = new ethers.Contract(tokens.mySBT, MySBTABI, rpcProvider);

      // Check if the address is the contract owner (MySBT uses daoMultisig instead of owner)
      let isOwner = false;
      let isOperator = false;

      try {
        // MySBT v2.3+ uses daoMultisig instead of owner()
        if (typeof mySBT.daoMultisig === 'function') {
          const daoMultisig = await mySBT.daoMultisig();
          isOwner = daoMultisig.toLowerCase() === address.toLowerCase();
        }
      } catch (err) {
        console.warn('Could not check owner permissions:', err);
      }

      // Check if the address has operator permissions
      // MySBT v2.3 does not have explicit operator role
      // Operator permissions are typically granted to:
      // 1. The DAO multisig (owner)
      // 2. Registry contract
      // For now, we'll consider only the DAO multisig as having operator permissions

      try {
        // In MySBT v2.3, the main admin is the daoMultisig
        // Registry contract can also call certain functions
        if (isOwner) {
          // If user is owner (daoMultisig), they have operator permissions
          isOperator = true;
        } else if (address.toLowerCase() === core.registry.toLowerCase()) {
          // Registry contract is also considered an operator
          isOperator = true;
        } else {
          // Regular users don't have operator permissions in MySBT v2.3
          isOperator = false;
        }
      } catch (err) {
        console.warn('Could not check operator permissions:', err);
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