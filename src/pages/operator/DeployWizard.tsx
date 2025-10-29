import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './DeployWizard.css';

// Import step components
import { Step1_ConnectAndSelect } from './deploy-v2/steps/Step1_ConnectAndSelect';
import { Step2_ConfigForm } from './deploy-v2/steps/Step2_ConfigForm';
import { Step3_DeployPaymaster } from './deploy-v2/steps/Step3_DeployPaymaster';
import { Step4_DeployResources, type DeployedResources } from './deploy-v2/steps/Step4_DeployResources';
import { Step5_Stake } from './deploy-v2/steps/Step5_Stake';
import { Step6_RegisterRegistry_v2 } from './deploy-v2/steps/Step6_RegisterRegistry_v2';
import { Step7_Complete } from './deploy-v2/steps/Step7_Complete';

// Import types and utilities
import type { WalletStatus } from './deploy-v2/utils/walletChecker';
import { getCurrentNetworkConfig } from '../../config/networkConfig';
import {
  saveProgress,
  loadProgress,
  validateProgress,
  clearProgress,
  shouldShowRestorePrompt,
  type WizardProgress,
} from './deploy-v2/utils/progressManager';

/**
 * DeployWizard - Dynamic deployment flow with branching paths
 *
 * Flow Structure:
 * Common Steps:
 *   1. Connect Wallet & Select Stake Option (Merged Step)
 *      - 1a. Connect wallet
 *      - 1b. Select mode (AOA or Super)
 *      - 1c. Check resources based on selection
 *
 * AOA Flow (7 steps total):
 *   2. Deploy Resources (SBT + xPNTs + Stake GToken)
 *   3. Configuration
 *   4. Deploy Paymaster
 *   5. Stake to EntryPoint
 *   6. Register to Registry
 *   7. Complete
 *
 * Super Mode (6 steps total):
 *   2. Deploy Resources (SBT + xPNTs + Stake GToken)
 *   3. Configuration
 *   4. Stake to SuperPaymaster (no deployment)
 *   5. Register to Registry
 *   6. Complete
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
  stakeOption?: 'aoa' | 'super';

  // Resource requirements
  resourcesReady?: boolean;

  // Deployed resources (SBT + xPNTs + staked GToken)
  deployedResources?: DeployedResources;

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

/**
 * Create step configs with i18n translation keys
 */
const createStepConfigs = (t: (key: string) => string) => {
  // Common steps (all users go through these)
  const COMMON_STEPS: StepConfig[] = [
    { id: 1, title: t('wizard.steps.connectAndSelect'), icon: '🔌', stepKey: 'connectAndSelect' },
  ];

  // AOA flow specific steps (7 total)
  const STANDARD_FLOW_STEPS: StepConfig[] = [
    { id: 2, title: t('wizard.steps.resources'), icon: '📦', stepKey: 'resources' },
    { id: 3, title: t('wizard.steps.config'), icon: '⚙️', stepKey: 'config' },
    { id: 4, title: t('wizard.steps.deploy'), icon: '🚀', stepKey: 'deploy' },
    { id: 5, title: t('wizard.steps.stake'), icon: '🔒', stepKey: 'stake' },
    { id: 6, title: t('wizard.steps.register'), icon: '📝', stepKey: 'register' },
    { id: 7, title: t('wizard.steps.complete'), icon: '✅', stepKey: 'complete' },
  ];

  // Super mode specific steps (6 total - no deployment)
  const SUPER_MODE_STEPS: StepConfig[] = [
    { id: 2, title: t('wizard.steps.resources'), icon: '📦', stepKey: 'resources' },
    { id: 3, title: t('wizard.steps.config'), icon: '⚙️', stepKey: 'config' },
    { id: 4, title: t('wizard.steps.stake'), icon: '🔒', stepKey: 'stake' },
    { id: 5, title: t('wizard.steps.register'), icon: '📝', stepKey: 'register' },
    { id: 6, title: t('wizard.steps.complete'), icon: '✅', stepKey: 'complete' },
  ];

  return { COMMON_STEPS, STANDARD_FLOW_STEPS, SUPER_MODE_STEPS };
};

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
function getStepsForOption(
  option: 'aoa' | 'super' | undefined,
  t: (key: string) => string
): StepConfig[] {
  const { COMMON_STEPS, STANDARD_FLOW_STEPS, SUPER_MODE_STEPS } = createStepConfigs(t);

  if (!option) {
    // Before selection, only show common steps
    return COMMON_STEPS;
  }

  return option === 'aoa'
    ? [...COMMON_STEPS, ...STANDARD_FLOW_STEPS]
    : [...COMMON_STEPS, ...SUPER_MODE_STEPS];
}

export function DeployWizard() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<StepConfig[]>(() => createStepConfigs(t).COMMON_STEPS);
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

  // Progress restoration state
  const [savedProgress, setSavedProgress] = useState<WizardProgress | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [isValidatingProgress, setIsValidatingProgress] = useState(false);

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
        stakeOption: 'aoa', // Auto-select AOA flow
        resourcesReady: true,
      }));
      setSteps(getStepsForOption('aoa', t));
      setCurrentStep(2); // Skip to Step 2: Configuration
      console.log('🧪 Test Mode Enabled - Skipping to Step 2 with mock data');
    }
  }, []);

  // Load and validate saved progress on mount
  useEffect(() => {
    // Skip progress restoration in test mode
    if (isTestMode) {
      return;
    }

    const progress = loadProgress();
    if (progress && shouldShowRestorePrompt(progress, currentStep)) {
      setSavedProgress(progress);
      setShowRestorePrompt(true);
    }
  }, [isTestMode, currentStep]);

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
    stakeOption: 'aoa' | 'super'
  ) => {
    console.log(`✅ User selected: ${stakeOption} mode with wallet ${walletStatus.address}`);
    setConfig((prev) => ({ ...prev, walletStatus, stakeOption }));
    setSteps(getStepsForOption(stakeOption, t));
    handleNext();
  };

  const handleResourcesComplete = (resources: DeployedResources) => {
    console.log(`✅ Resources deployed:`, resources);
    setConfig((prev) => ({ ...prev, deployedResources: resources }));
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

  // Progress restoration handlers
  const handleRestoreProgress = async () => {
    if (!savedProgress || !window.ethereum) {
      return;
    }

    setIsValidatingProgress(true);
    setShowRestorePrompt(false);

    try {
      const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentOwnerAddress = await signer.getAddress();
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);

      // Validate progress
      const validation = await validateProgress(savedProgress, currentChainId, currentOwnerAddress);

      if (!validation.isValid) {
        alert(`Cannot restore progress: ${validation.reason || 'Validation failed'}`);
        clearProgress();
        setSavedProgress(null);
        setIsValidatingProgress(false);
        return;
      }

      // Restore config and steps
      setConfig(savedProgress.config);
      setSteps(getStepsForOption(savedProgress.stakeOption, t));
      setCurrentStep(validation.validatedStep);

      if (validation.validatedStep < savedProgress.currentStep) {
        alert(
          `Some steps could not be validated. Resuming from step ${validation.validatedStep}.`
        );
      }

      console.log('✅ Progress restored successfully');
    } catch (error) {
      console.error('❌ Failed to restore progress:', error);
      alert('Failed to restore progress. Starting from beginning.');
      clearProgress();
      setSavedProgress(null);
    } finally {
      setIsValidatingProgress(false);
    }
  };

  const handleDeclineRestore = () => {
    setShowRestorePrompt(false);
    clearProgress();
    setSavedProgress(null);
  };

  // Save progress after each step (except first and last)
  useEffect(() => {
    if (isTestMode || currentStep <= 1 || currentStep >= steps.length) {
      return;
    }

    const ownerAddress = config.walletStatus?.address || config.owner;
    if (!ownerAddress) {
      return;
    }

    const chainId = SUPPORTED_NETWORKS[config.network].chainId;
    saveProgress(currentStep, chainId, ownerAddress, config);
  }, [currentStep, config, steps.length, isTestMode]);

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

      case 'resources':
        return (
          config.walletStatus && (
            <Step4_DeployResources
              walletStatus={config.walletStatus}
              communityName={config.communityName}
              onNext={handleResourcesComplete}
              onBack={handleBack}
            />
          )
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
              deployedResources={config.deployedResources}
            />
          )
        );

      case 'stake':
        // For Super Mode, use shared SuperPaymaster address
        // For Standard Mode, use user's deployed paymaster
        const paymasterForStake =
          config.stakeOption === 'aoa'
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
          config.stakeOption === 'aoa'
            ? config.paymasterAddress
            : getSuperPaymasterAddress();

        // Registry v2.1 requires xPNTs and SBT addresses from deployed resources
        const xPNTsAddress = config.deployedResources?.xPNTsAddress;
        const sbtAddress = config.deployedResources?.sbtAddress;

        return (
          config.walletStatus &&
          paymasterForRegister &&
          xPNTsAddress &&
          sbtAddress && (
            <Step6_RegisterRegistry_v2
              paymasterAddress={paymasterForRegister}
              xPNTsAddress={xPNTsAddress}
              sbtAddress={sbtAddress}
              walletStatus={config.walletStatus}
              communityName={config.communityName}
              serviceFeeRate={config.serviceFeeRate}
              sGTokenAmount={config.deployedResources?.sGTokenAmount || "0"}
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
              deployedResources={config.deployedResources}
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
        <h1 className="wizard-title">{t('wizard.title')}</h1>
        <p className="wizard-subtitle">
          {t('wizard.subtitle', { totalSteps: steps.length })}
        </p>
      </div>

      {/* Progress restoration prompt */}
      {showRestorePrompt && savedProgress && (
        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px 20px',
            margin: '20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ flex: '1', minWidth: '250px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#1e40af' }}>
              📋 Previous Progress Found
            </div>
            <div style={{ fontSize: '14px', color: '#1e3a8a' }}>
              Resume from Step {savedProgress.currentStep} ({savedProgress.stakeOption.toUpperCase()} mode) - saved{' '}
              {Math.round((Date.now() - savedProgress.timestamp) / 1000 / 60)} minutes ago
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isValidatingProgress ? (
              <div style={{ padding: '8px 16px', color: '#6b7280' }}>Validating...</div>
            ) : (
              <>
                <button
                  onClick={handleRestoreProgress}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  ✅ Resume Progress
                </button>
                <button
                  onClick={handleDeclineRestore}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  ❌ Start Fresh
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="network-selector">
        <label htmlFor="network-select" className="network-label">
          {t('wizard.selectNetwork')}
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
            {t('wizard.chainId')}: {SUPPORTED_NETWORKS[config.network].chainId}
          </span>
          {SUPPORTED_NETWORKS[config.network].isTestnet && (
            <span className="network-badge testnet">{t('wizard.testnetBadge')}</span>
          )}
          {!SUPPORTED_NETWORKS[config.network].isTestnet && (
            <span className="network-badge mainnet">{t('wizard.mainnetBadge')}</span>
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
        <h3>{t('wizard.needHelp')}</h3>
        <ul>
          <li>
            <a href="/launch-tutorial" target="_blank" rel="noopener noreferrer">
              {t('wizard.deploymentGuide')}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
