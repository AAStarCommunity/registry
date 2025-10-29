/**
 * Progress Manager for Deploy Wizard
 *
 * Saves and restores wizard progress to localStorage
 * Validates historical steps before resuming
 */

import { ethers } from 'ethers';
import type { DeployConfig } from '../../DeployWizard';
import type { DeployedResources } from '../steps/Step4_DeployResources';

const PROGRESS_KEY = 'deploy-wizard-progress';
const PROGRESS_VERSION = '1.0';

export interface WizardProgress {
  version: string;
  timestamp: number;
  chainId: number;
  ownerAddress: string;
  currentStep: number;
  stakeOption: 'aoa' | 'super';
  config: DeployConfig;
  deployedResources?: DeployedResources;
  paymasterAddress?: string;
  entryPointTxHash?: string;
  registryTxHash?: string;
}

export interface ValidationResult {
  isValid: boolean;
  validatedStep: number;
  reason?: string;
}

/**
 * Save wizard progress to localStorage
 */
export function saveProgress(
  currentStep: number,
  chainId: number,
  ownerAddress: string,
  config: DeployConfig
): void {
  try {
    const progress: WizardProgress = {
      version: PROGRESS_VERSION,
      timestamp: Date.now(),
      chainId,
      ownerAddress: ownerAddress.toLowerCase(),
      currentStep,
      stakeOption: config.stakeOption || 'aoa',
      config,
      deployedResources: config.deployedResources,
      paymasterAddress: config.paymasterAddress,
      entryPointTxHash: config.entryPointTxHash,
      registryTxHash: config.registryTxHash,
    };

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    console.log('💾 Progress saved:', { currentStep, chainId, ownerAddress });
  } catch (error) {
    console.error('❌ Failed to save progress:', error);
  }
}

/**
 * Load wizard progress from localStorage
 */
export function loadProgress(): WizardProgress | null {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (!saved) {
      return null;
    }

    const progress = JSON.parse(saved) as WizardProgress;

    // Check version compatibility
    if (progress.version !== PROGRESS_VERSION) {
      console.warn('⚠️ Progress version mismatch, clearing old progress');
      clearProgress();
      return null;
    }

    // Check if progress is not too old (7 days)
    const age = Date.now() - progress.timestamp;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (age > maxAge) {
      console.warn('⚠️ Progress too old, clearing');
      clearProgress();
      return null;
    }

    console.log('📂 Progress loaded:', {
      currentStep: progress.currentStep,
      chainId: progress.chainId,
      ownerAddress: progress.ownerAddress,
      age: `${Math.round(age / 1000 / 60)} minutes`,
    });

    return progress;
  } catch (error) {
    console.error('❌ Failed to load progress:', error);
    return null;
  }
}

/**
 * Clear saved progress
 */
export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    console.log('🗑️ Progress cleared');
  } catch (error) {
    console.error('❌ Failed to clear progress:', error);
  }
}

/**
 * Validate saved progress against current wallet state
 */
export async function validateProgress(
  progress: WizardProgress,
  currentChainId: number,
  currentOwnerAddress: string
): Promise<ValidationResult> {
  try {
    // Check if chain ID matches
    if (progress.chainId !== currentChainId) {
      return {
        isValid: false,
        validatedStep: 1,
        reason: `Chain mismatch: saved ${progress.chainId}, current ${currentChainId}`,
      };
    }

    // Check if owner address matches
    if (progress.ownerAddress.toLowerCase() !== currentOwnerAddress.toLowerCase()) {
      return {
        isValid: false,
        validatedStep: 1,
        reason: `Wallet mismatch: saved ${progress.ownerAddress}, current ${currentOwnerAddress}`,
      };
    }

    // Get provider for on-chain validation
    if (!window.ethereum) {
      return { isValid: false, validatedStep: 1, reason: 'No wallet provider' };
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    // Validate based on current step
    let validatedStep = progress.currentStep;

    // Step 2+: Validate deployed resources
    if (progress.currentStep >= 2 && progress.deployedResources) {
      const { sbtAddress, xPNTsAddress, sGTokenAmount, gTokenStakeTxHash } = progress.deployedResources;

      // Validate SBT contract
      if (sbtAddress && sbtAddress !== ethers.ZeroAddress) {
        const sbtCode = await provider.getCode(sbtAddress);
        if (sbtCode === '0x') {
          console.warn('⚠️ SBT contract not found at', sbtAddress);
          validatedStep = Math.min(validatedStep, 1);
        }
      }

      // Validate xPNTs contract
      if (xPNTsAddress && xPNTsAddress !== ethers.ZeroAddress) {
        const xPNTsCode = await provider.getCode(xPNTsAddress);
        if (xPNTsCode === '0x') {
          console.warn('⚠️ xPNTs contract not found at', xPNTsAddress);
          validatedStep = Math.min(validatedStep, 1);
        }
      }

      // Validate GToken stake transaction
      if (gTokenStakeTxHash && gTokenStakeTxHash !== 'existing') {
        const tx = await provider.getTransaction(gTokenStakeTxHash);
        if (!tx) {
          console.warn('⚠️ GToken stake transaction not found:', gTokenStakeTxHash);
          validatedStep = Math.min(validatedStep, 1);
        }
      }
    }

    // Step 4+ (AOA mode): Validate paymaster deployment
    if (progress.stakeOption === 'aoa' && progress.currentStep >= 4 && progress.paymasterAddress) {
      const paymasterCode = await provider.getCode(progress.paymasterAddress);
      if (paymasterCode === '0x') {
        console.warn('⚠️ Paymaster contract not found at', progress.paymasterAddress);
        validatedStep = Math.min(validatedStep, 3);
      }
    }

    // Step 5+ (AOA mode) / Step 4+ (Super mode): Validate EntryPoint deposit
    const isAOAMode = progress.stakeOption === 'aoa';
    const stakeStepComplete = isAOAMode ? progress.currentStep >= 5 : progress.currentStep >= 4;

    if (stakeStepComplete && progress.entryPointTxHash) {
      const tx = await provider.getTransaction(progress.entryPointTxHash);
      if (!tx) {
        console.warn('⚠️ EntryPoint deposit transaction not found:', progress.entryPointTxHash);
        validatedStep = Math.min(validatedStep, isAOAMode ? 4 : 3);
      }
    }

    // Step 6+ (AOA mode) / Step 5+ (Super mode): Validate registry registration
    const registryStepComplete = isAOAMode ? progress.currentStep >= 6 : progress.currentStep >= 5;

    if (registryStepComplete && progress.registryTxHash) {
      const tx = await provider.getTransaction(progress.registryTxHash);
      if (!tx) {
        console.warn('⚠️ Registry transaction not found:', progress.registryTxHash);
        validatedStep = Math.min(validatedStep, isAOAMode ? 5 : 4);
      }
    }

    console.log('✅ Progress validated:', {
      originalStep: progress.currentStep,
      validatedStep,
      allValid: validatedStep === progress.currentStep,
    });

    return {
      isValid: true,
      validatedStep,
    };
  } catch (error) {
    console.error('❌ Progress validation failed:', error);
    return {
      isValid: false,
      validatedStep: 1,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if we should show restore prompt
 */
export function shouldShowRestorePrompt(
  progress: WizardProgress | null,
  currentStep: number
): boolean {
  if (!progress) {
    return false;
  }

  // Don't show if already at or past saved step
  if (currentStep >= progress.currentStep) {
    return false;
  }

  // Don't show if on first step
  if (progress.currentStep <= 1) {
    return false;
  }

  return true;
}
