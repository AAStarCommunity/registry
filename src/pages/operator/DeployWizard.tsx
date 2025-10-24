import { useState, useEffect } from 'react';
import './DeployWizard.css';

// Import step components
import { Step1_ConnectAndSelect } from './deploy-v2/steps/Step1_ConnectAndSelect';
import { Step2_ConfigForm } from './deploy-v2/steps/Step2_ConfigForm';
import { Step3_DeployPaymaster } from './deploy-v2/steps/Step3_DeployPaymaster';
import { Step5_Stake } from './deploy-v2/steps/Step5_Stake';
import { Step6_RegisterRegistry } from './deploy-v2/steps/Step6_RegisterRegistry';
import { Step7_Complete } from './deploy-v2/steps/Step7_Complete';

// Import types and utilities
import type { WalletStatus } from './deploy-v2/utils/walletChecker';
import { getCurrentNetworkConfig } from '../../config/networkConfig';

/**
 * DeployWizard - Dynamic deployment flow with branching paths
 *
 * Flow Structure:
 * Common Steps:
 *   1. Connect Wallet & Select Stake Option (Merged Step)
 *      - 1a. Connect wallet
 *      - 1b. Select mode (Standard or Super)
 *      - 1c. Check resources based on selection
 *
 * Standard Flow (6 steps total):
 *   2. Configuration
 *   3. Deploy Paymaster
 *   4. Stake to EntryPoint
 *   5. Register to Registry
 *   6. Complete
 *
 * Super Mode (5 steps total):
 *   2. Configuration
 *   3. Stake to SuperPaymaster (no deployment)
 *   4. Register to Registry
 *   5. Complete
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
  // Network selection
  network: SupportedNetwork;

  // Configuration
  communityName: string;
  treasury: string;
  gasToUSDRate: string;
  pntPriceUSD: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  minTokenBalance: string;

  // Deployment result
  paymasterAddress?: string;
  owner?: string;

  // Wallet status
  walletStatus?: WalletStatus;

  // Stake option
  stakeOption?: 'standard' | 'super';

  // Resource requirements
  resourcesReady?: boolean;

  // EntryPoint deposit
  entryPointTxHash?: string;

  // Registry registration
  registryTxHash?: string;
}

// Step configuration interface
export interface StepConfig {
  id: number;
  title: string;
  icon: string;
  stepKey: string; // Unique identifier for routing
}

// Common steps (all users go through these)
const COMMON_STEPS: StepConfig[] = [
  { id: 1, title: 'Connect & Select Mode', icon: '🔌', stepKey: 'connectAndSelect' },
];

// Standard flow specific steps (6 total)
const STANDARD_FLOW_STEPS: StepConfig[] = [
  { id: 2, title: 'Configuration', icon: '⚙️', stepKey: 'config' },
  { id: 3, title: 'Deploy Paymaster', icon: '🚀', stepKey: 'deploy' },
  { id: 4, title: 'Stake', icon: '🔒', stepKey: 'stake' },
  { id: 5, title: 'Register to Registry', icon: '📝', stepKey: 'register' },
  { id: 6, title: 'Complete', icon: '✅', stepKey: 'complete' },
];

// Super mode specific steps (5 total - no deployment)
const SUPER_MODE_STEPS: StepConfig[] = [
  { id: 2, title: 'Configuration', icon: '⚙️', stepKey: 'config' },
  { id: 3, title: 'Stake', icon: '🔒', stepKey: 'stake' },
  { id: 4, title: 'Register to Registry', icon: '📝', stepKey: 'register' },
  { id: 5, title: 'Complete', icon: '✅', stepKey: 'complete' },
];

/**
 * Get SuperPaymaster address from network config
 */
function getSuperPaymasterAddress(): string {
  const networkConfig = getCurrentNetworkConfig();
  return networkConfig.contracts.paymasterV4;
}

/**
 * Generate steps based on selected stake option
 */
function getStepsForOption(option: 'standard' | 'super' | undefined): StepConfig[] {
  if (!option) {
    // Before selection, only show common steps
    return COMMON_STEPS;
  }

  return option === 'standard'
    ? [...COMMON_STEPS, ...STANDARD_FLOW_STEPS]
    : [...COMMON_STEPS, ...SUPER_MODE_STEPS];
}

export function DeployWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<StepConfig[]>(COMMON_STEPS);
  const [isTestMode, setIsTestMode] = useState(false);
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

  // Check for test mode on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testMode = params.get('testMode') === 'true';
    setIsTestMode(testMode);

    if (testMode) {
      setConfig((prev) => ({
        ...prev,
        communityName: 'E2E Test Community',
        treasury: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        paymasterAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        owner: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        walletStatus: {
          isConnected: true,
          address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          ethBalance: '1.5',
          gTokenBalance: '1200',
          pntsBalance: '800',
          aPNTsBalance: '600',
          hasSBTContract: false,
          hasGasTokenContract: false,
          hasEnoughETH: true,
          hasEnoughGToken: true,
          hasEnoughPNTs: true,
          hasEnoughAPNTs: true,
          requiredETH: '0.1',
          requiredGToken: '100',
          requiredPNTs: '1000',
          requiredAPNTs: '1000',
        },
        stakeOption: 'standard', // Auto-select standard flow
        resourcesReady: true,
      }));
      setSteps(getStepsForOption('standard'));
      setCurrentStep(2); // Skip to Step 2: Configuration
      console.log('🧪 Test Mode Enabled - Skipping to Step 2 with mock data');
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      console.log(`🎯 handleNext: ${currentStep} → ${nextStep}`);
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConnectAndSelectComplete = (
    walletStatus: WalletStatus,
    stakeOption: 'standard' | 'super'
  ) => {
    console.log(`✅ User selected: ${stakeOption} mode with wallet ${walletStatus.address}`);
    setConfig((prev) => ({ ...prev, walletStatus, stakeOption }));
    setSteps(getStepsForOption(stakeOption));
    handleNext();
  };

  const handleConfigComplete = (formConfig: Partial<DeployConfig>) => {
    setConfig((prev) => ({ ...prev, ...formConfig }));
    handleNext();
  };

  const handleDeployComplete = (paymasterAddress: string, owner: string) => {
    setConfig((prev) => ({ ...prev, paymasterAddress, owner }));
    handleNext();
  };

  const handleStakeComplete = (txHash: string) => {
    setConfig((prev) => ({ ...prev, entryPointTxHash: txHash }));
    handleNext();
  };

  const handleRegisterComplete = (txHash: string) => {
    setConfig((prev) => ({ ...prev, registryTxHash: txHash }));
    handleNext();
  };

  const renderStepContent = () => {
    const stepKey = steps[currentStep - 1]?.stepKey;

    switch (stepKey) {
      case 'connectAndSelect':
        return (
          <Step1_ConnectAndSelect
            onNext={handleConnectAndSelectComplete}
            isTestMode={isTestMode}
          />
        );

      case 'config':
        return (
          config.walletStatus && (
            <Step2_ConfigForm
              onNext={handleConfigComplete}
              onBack={handleBack}
            />
          )
        );

      case 'deploy':
        return (
          config.walletStatus && (
            <Step3_DeployPaymaster
              config={config}
              chainId={SUPPORTED_NETWORKS[config.network].chainId}
              onNext={handleDeployComplete}
              onBack={handleBack}
              isTestMode={isTestMode}
            />
          )
        );

      case 'stake':
        // For Super Mode, use shared SuperPaymaster address
        // For Standard Mode, use user's deployed paymaster
        const paymasterForStake =
          config.stakeOption === 'standard'
            ? config.paymasterAddress
            : getSuperPaymasterAddress();

        return (
          config.walletStatus &&
          config.stakeOption &&
          paymasterForStake && (
            <Step5_Stake
              paymasterAddress={paymasterForStake}
              walletStatus={config.walletStatus}
              selectedOption={config.stakeOption}
              onNext={handleStakeComplete}
              onBack={handleBack}
            />
          )
        );

      case 'register':
        // Similar to stake - use appropriate paymaster address
        const paymasterForRegister =
          config.stakeOption === 'standard'
            ? config.paymasterAddress
            : getSuperPaymasterAddress();

        return (
          config.walletStatus &&
          paymasterForRegister && (
            <Step6_RegisterRegistry
              paymasterAddress={paymasterForRegister}
              walletStatus={config.walletStatus}
              communityName={config.communityName}
              onNext={handleRegisterComplete}
              onBack={handleBack}
            />
          )
        );

      case 'complete':
        // In Super Mode, owner is the connected wallet (no contract deployed)
        // In Standard Mode, owner is from deployment
        const finalOwner = config.owner || config.walletStatus?.address;
        const finalPaymaster =
          config.paymasterAddress ||
          (config.stakeOption === 'super' ? getSuperPaymasterAddress() : undefined);

        return (
          finalPaymaster &&
          finalOwner && (
            <Step7_Complete
              paymasterAddress={finalPaymaster}
              communityName={config.communityName}
              owner={finalOwner}
              entryPointTxHash={config.entryPointTxHash}
              registryTxHash={config.registryTxHash}
            />
          )
        );

      default:
        return <div>Loading step...</div>;
    }
  };

  return (
    <div className="deploy-wizard">
      <div className="wizard-header">
        <h1 className="wizard-title">Deploy Your Paymaster</h1>
        <p className="wizard-subtitle">
          Complete {steps.length}-step wizard to deploy and register your community Paymaster
        </p>
      </div>

      <div className="network-selector">
        <label htmlFor="network-select" className="network-label">
          Select Network:
        </label>
        <select
          id="network-select"
          className="network-dropdown"
          value={config.network}
          onChange={(e) =>
            setConfig({ ...config, network: e.target.value as SupportedNetwork })
          }
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

      <div className="wizard-progress">
        {steps.map((step, index) => (
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
            {index < steps.length - 1 && <div className="progress-step-line" />}
          </div>
        ))}
      </div>

      <div className="wizard-content">{renderStepContent()}</div>

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
