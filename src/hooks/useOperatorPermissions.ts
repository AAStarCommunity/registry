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

      // Check if the address is the contract owner
      let isOwner = false;
      let isOperator = false;

      try {
        const owner = await mySBT.owner();
        isOwner = owner.toLowerCase() === address.toLowerCase();
      } catch (err) {
        console.warn('Could not check owner permissions:', err);
      }

      // Check if the address has operator permissions
      // This depends on the specific MySBT implementation
      // Common patterns include:
      // 1. hasRole() function for role-based access
      // 2. isOperator() function
      // 3. Mapping-based operator check

      try {
        // Try different common operator checking methods
        if (typeof mySBT.hasRole === 'function') {
          // Try with OPERATOR_ROLE (common in OpenZeppelin AccessControl)
          const OPERATOR_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
          isOperator = await mySBT.hasRole(OPERATOR_ROLE, address);
        } else if (typeof mySBT.isOperator === 'function') {
          isOperator = await mySBT.isOperator(address);
        } else {
          // Try calling a known operator-only function to check permissions
          // This is a fallback method - it might fail but we catch the error
          try {
            // We don't actually execute, just try to estimate gas to check permissions
            await mySBT.mintFor.estimateGas(address, core.registry, '{}');
            isOperator = true;
          } catch (gasError: any) {
            // If it fails with "not operator" or similar, we know they're not an operator
            if (gasError.message?.toLowerCase().includes('operator') ||
                gasError.message?.toLowerCase().includes('unauthorized') ||
                gasError.message?.toLowerCase().includes('permission')) {
              isOperator = false;
            } else {
              // If it fails for other reasons (like insufficient balance), they might still be an operator
              isOperator = false;
              console.log('Gas estimate failed for non-permission reasons:', gasError.message);
            }
          }
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