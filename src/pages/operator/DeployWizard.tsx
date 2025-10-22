import { useState } from 'react';
import './DeployWizard.css';

// Import step components
import { Step1_ConfigForm } from './deploy-v2/steps/Step1_ConfigForm';
import { Step2_WalletCheck } from './deploy-v2/steps/Step2_WalletCheck';
import { Step3_StakeOption } from './deploy-v2/steps/Step3_StakeOption';
import { Step4_ResourcePrep } from './deploy-v2/steps/Step4_ResourcePrep';
import { Step5_StakeEntryPoint } from './deploy-v2/steps/Step5_StakeEntryPoint';
import { Step6_RegisterRegistry } from './deploy-v2/steps/Step6_RegisterRegistry';
import { Step7_Complete } from './deploy-v2/steps/Step7_Complete';

// Import types and utilities
import type { WalletStatus } from './deploy-v2/utils/walletChecker';
import { checkWalletStatus } from './deploy-v2/utils/walletChecker';

/**
 * DeployWizard - Complete 7-step deployment flow
 *
 * Phase 2.1.4 & 2.1.5 Implementation:
 * - Step 1: Configure and deploy Paymaster ✅
 * - Step 2: Check wallet balances ✅
 * - Step 3: Select stake option (Standard/Fast) ✅
 * - Step 4: Prepare resources (check/acquire) ✅
 * - Step 5: Stake to EntryPoint 🔄
 * - Step 6: Register to Registry 🔄
 * - Step 7: Manage Paymaster 🔄
 */

export type SupportedNetwork = 'sepolia' | 'op-sepolia' | 'op-mainnet' | 'mainnet';

export interface NetworkConfig {
  id: SupportedNetwork;
  name: string;
  chainId: number;
  rpcUrl: string;
  isTestnet: boolean;
}

export const SUPPORTED_NETWORKS: Record<SupportedNetwork, NetworkConfig> = {
  'sepolia': {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    isTestnet: true,
  },
  'op-sepolia': {
    id: 'op-sepolia',
    name: 'OP Sepolia Testnet',
    chainId: 11155420,
    rpcUrl: 'https://sepolia.optimism.io',
    isTestnet: true,
  },
  'op-mainnet': {
    id: 'op-mainnet',
    name: 'Optimism Mainnet',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    isTestnet: false,
  },
  'mainnet': {
    id: 'mainnet',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    isTestnet: false,
  },
};

export interface DeployConfig {
  // Network selection (new)
  network: SupportedNetwork;

  // Step 1: Configuration
  communityName: string;
  treasury: string;
  gasToUSDRate: string;
  pntPriceUSD: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  minTokenBalance: string;

  // Step 1: Deployment result
  paymasterAddress?: string;
  owner?: string;

  // Step 2: Wallet status
  walletStatus?: WalletStatus;

  // Step 3: Stake option
  stakeOption?: 'standard' | 'fast';

  // Step 4: Resource requirements
  resourcesReady?: boolean;

  // Step 5: EntryPoint deposit
  entryPointTxHash?: string;

  // Step 6: Registry registration
  registryTxHash?: string;
}

const STEPS = [
  { id: 1, title: 'Deploy Contract', icon: '🚀' },
  { id: 2, title: 'Check Wallet', icon: '💼' },
  { id: 3, title: 'Select Stake Option', icon: '⚡' },
  { id: 4, title: 'Prepare Resources', icon: '📦' },
  { id: 5, title: 'Stake to EntryPoint', icon: '🔒' },
  { id: 6, title: 'Register to Registry', icon: '📝' },
  { id: 7, title: 'Manage Paymaster', icon: '⚙️' },
];

export function DeployWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<DeployConfig>({
    network: 'sepolia', // Default to Sepolia testnet
    communityName: '',
    treasury: '',
    gasToUSDRate: '4500',
    pntPriceUSD: '0.02',
    serviceFeeRate: '2',
    maxGasCostCap: '0.1',
    minTokenBalance: '100',
  });

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStep1Complete = (paymasterAddress: string, owner: string) => {
    setConfig({
      ...config,
      paymasterAddress,
      owner,
    });
    handleNext();
  };

  const handleStep2Complete = (walletStatus: WalletStatus) => {
    setConfig({
      ...config,
      walletStatus,
    });
    handleNext();
  };

  const handleStep3Complete = (option: 'standard' | 'fast') => {
    setConfig({
      ...config,
      stakeOption: option,
    });
    handleNext();
  };

  const handleStep4Complete = () => {
    setConfig({
      ...config,
      resourcesReady: true,
    });
    handleNext();
  };

  const handleStep5Complete = (txHash: string) => {
    setConfig({
      ...config,
      entryPointTxHash: txHash,
    });
    handleNext();
  };

  const handleStep6Complete = (txHash: string) => {
    setConfig({
      ...config,
      registryTxHash: txHash,
    });
    handleNext();
  };

  return (
    <div className="deploy-wizard">
      {/* Header */}
      <div className="wizard-header">
        <h1 className="wizard-title">Deploy Your Paymaster</h1>
        <p className="wizard-subtitle">
          Complete 7-step wizard to deploy and register your community Paymaster
        </p>
      </div>

      {/* Network Selector */}
      <div className="network-selector">
        <label htmlFor="network-select" className="network-label">
          Select Network:
        </label>
        <select
          id="network-select"
          className="network-dropdown"
          value={config.network}
          onChange={(e) => setConfig({ ...config, network: e.target.value as SupportedNetwork })}
          disabled={currentStep > 1}
        >
          {Object.values(SUPPORTED_NETWORKS).map((network) => (
            <option key={network.id} value={network.id}>
              {network.name} {network.isTestnet ? '(Testnet)' : '(Mainnet)'}
            </option>
          ))}
        </select>
        <div className="network-info">
          <span className="network-chain-id">
            Chain ID: {SUPPORTED_NETWORKS[config.network].chainId}
          </span>
          {SUPPORTED_NETWORKS[config.network].isTestnet && (
            <span className="network-badge testnet">TESTNET</span>
          )}
          {!SUPPORTED_NETWORKS[config.network].isTestnet && (
            <span className="network-badge mainnet">MAINNET</span>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="wizard-progress">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`progress-step ${
              currentStep === step.id
                ? 'active'
                : currentStep > step.id
                  ? 'completed'
                  : ''
            }`}
          >
            <div className="progress-step-circle">
              {currentStep > step.id ? '✓' : step.icon}
            </div>
            <div className="progress-step-label">
              <div className="progress-step-title">{step.title}</div>
              <div className="progress-step-number">Step {step.id}</div>
            </div>
            {index < STEPS.length - 1 && <div className="progress-step-line" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="wizard-content">
        {currentStep === 1 && (
          <Step1_ConfigForm
            onNext={(formConfig) => {
              // Update config with form data
              setConfig({
                ...config,
                ...formConfig,
              });
              // For now, we'll simulate deployment completion
              // In real implementation, this would deploy the contract
              handleStep1Complete('0x1234567890123456789012345678901234567890', '0x1234567890123456789012345678901234567890');
            }}
            onCancel={() => {
              // Navigate back to operator portal
              window.location.href = '/operator';
            }}
          />
        )}

        {currentStep === 2 && config.paymasterAddress && (
          <Step2_WalletCheck
            paymasterAddress={config.paymasterAddress}
            onNext={handleStep2Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && config.walletStatus && (
          <Step3_StakeOption
            walletStatus={config.walletStatus}
            onNext={handleStep3Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && config.walletStatus && config.stakeOption && (
          <Step4_ResourcePrep
            walletStatus={config.walletStatus}
            selectedOption={config.stakeOption}
            onNext={handleStep4Complete}
            onBack={handleBack}
            onRefreshWallet={async () => {
              // Re-check wallet status with current configuration
              try {
                const updatedStatus = await checkWalletStatus({
                  requiredETH: '0.05',
                  requiredGToken: '100',
                  requiredPNTs: '1000',
                  // TODO: Get actual token addresses from config or environment
                  // gTokenAddress: "0x...",
                  // pntAddress: "0x...",
                });

                // Update the wallet status in config
                setConfig({
                  ...config,
                  walletStatus: updatedStatus,
                });
              } catch (error) {
                console.error('Failed to refresh wallet status:', error);
              }
            }}
          />
        )}

        {currentStep === 5 && config.paymasterAddress && config.walletStatus && config.stakeOption && (
          <Step5_StakeEntryPoint
            paymasterAddress={config.paymasterAddress}
            walletStatus={config.walletStatus}
            selectedOption={config.stakeOption}
            onNext={handleStep5Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 6 && config.paymasterAddress && config.walletStatus && (
          <Step6_RegisterRegistry
            paymasterAddress={config.paymasterAddress}
            walletStatus={config.walletStatus}
            communityName={config.communityName}
            onNext={handleStep6Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 7 && config.paymasterAddress && config.owner && (
          <Step7_Complete
            paymasterAddress={config.paymasterAddress}
            communityName={config.communityName}
            owner={config.owner}
            entryPointTxHash={config.entryPointTxHash}
            registryTxHash={config.registryTxHash}
          />
        )}
      </div>

      {/* Help section */}
      <div className="wizard-help">
        <h3>💡 Need Help?</h3>
        <ul>
          <li>
            <a href="/launch-tutorial" target="_blank" rel="noopener noreferrer">
              📚 Read the Deployment Guide
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
