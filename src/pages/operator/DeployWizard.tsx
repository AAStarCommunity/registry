import { useState, useEffect } from 'react';
import './DeployWizard.css';

// Import step components
import { Step1_ConnectWallet } from './deploy-v2/steps/Step1_ConnectWallet';
import { Step2_ConfigForm } from './deploy-v2/steps/Step2_ConfigForm';
import { Step3_DeployPaymaster } from './deploy-v2/steps/Step3_DeployPaymaster';
import { Step4_StakeOption } from './deploy-v2/steps/Step4_StakeOption';
import { Step5_Stake } from './deploy-v2/steps/Step5_Stake';
import { Step6_RegisterRegistry } from './deploy-v2/steps/Step6_RegisterRegistry';
import { Step7_Complete } from './deploy-v2/steps/Step7_Complete';

// Import types and utilities
import type { WalletStatus } from './deploy-v2/utils/walletChecker';
import { checkWalletStatus } from './deploy-v2/utils/walletChecker';

/**
 * DeployWizard - Complete 7-step deployment flow
 *
 * Phase 2.1.4 & 2.1.5 Implementation:
 * - Step 1: Configuration ✅
 * - Step 2: Check Wallet ✅
 * - Step 3: Select Stake Option (Standard/Super) ✅
 * - Step 4: Prepare Resources ✅
 * - Step 5: Stake (routes to EntryPoint or SuperPaymaster) ✅
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
  stakeOption?: 'standard' | 'super';

  // Step 4: Resource requirements
  resourcesReady?: boolean;

  // Step 5: EntryPoint deposit
  entryPointTxHash?: string;

  // Step 6: Registry registration
  registryTxHash?: string;
}

const STEPS = [
  { id: 1, title: 'Connect Wallet', icon: '🔌' },
  { id: 2, title: 'Configuration', icon: '⚙️' },
  { id: 3, title: 'Deploy Paymaster', icon: '🚀' },
  { id: 4, title: 'Select Stake Option', icon: '⚡' },
  { id: 5, title: 'Stake', icon: '🔒' },
  { id: 6, title: 'Register to Registry', icon: '📝' },
  { id: 7, title: 'Complete', icon: '✅' },
];

export function DeployWizard() {
  const [currentStep, setCurrentStep] = useState(1);
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

    // In test mode, pre-populate config with mock data and skip to Step 2
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
        resourcesReady: true,  // Pre-set resources as ready in test mode
      }));
      // Auto-advance to Step 2 in test mode
      setCurrentStep(2);
      console.log('🧪 Test Mode Enabled - Skipping to Step 2 with mock data');
    }
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
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

  const handleStep3Complete = (option: 'standard' | 'super') => {
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
        {/* Step 1: Connect Wallet - 连接钱包并检查资源（不需要 paymasterAddress）*/}
        {currentStep === 1 && (
          <Step1_ConnectWallet
            onNext={handleStep2Complete}
            isTestMode={isTestMode}
          />
        )}

        {/* Step 2: Config Form - 配置参数 */}
        {currentStep === 2 && config.walletStatus && (
          <Step2_ConfigForm
            onNext={(formConfig: DeployConfig) => {
              // Update config with form data, preserving walletStatus
              console.log('📝 Step 2 onNext called');
              console.log('  Current config.walletStatus:', config.walletStatus ? 'EXISTS' : 'MISSING');
              console.log('  FormConfig keys:', Object.keys(formConfig));

              setConfig({
                ...config,
                ...formConfig,
                // Explicitly preserve walletStatus from current config
                walletStatus: config.walletStatus,
              });

              console.log('  Config updated, calling handleNext');
              handleNext();
            }}
            onBack={handleBack}
          />
        )}

        {/* Step 3: Deploy Paymaster - 部署 PaymasterV4_1 合约 */}
        {currentStep === 3 && config.walletStatus && (
          <Step3_DeployPaymaster
            config={config}
            chainId={SUPPORTED_NETWORKS[config.network].chainId}
            onNext={(paymasterAddress: string, owner: string) => {
              // Update config with deployed contract info and advance to next step atomically
              console.log('📝 Step 3 onNext called - paymasterAddress:', paymasterAddress);
              setConfig((prevConfig) => ({
                ...prevConfig,
                paymasterAddress,
                owner,
              }));
              // Advance step immediately
              setCurrentStep(4);
              console.log('🎯 Advanced to Step 4');
            }}
            onBack={handleBack}
            isTestMode={isTestMode}
          />
        )}

        {/* Step 4: Stake Option - 选择质押选项 */}
        {currentStep === 4 && (() => {
          console.log('🔍 Step 4 render check:', {
            currentStep,
            hasPaymasterAddress: !!config.paymasterAddress,
            paymasterAddress: config.paymasterAddress,
            hasWalletStatus: !!config.walletStatus,
          });
          return config.paymasterAddress && config.walletStatus;
        })() && (
          <Step4_StakeOption
            walletStatus={config.walletStatus}
            onNext={handleStep3Complete}
            onBack={handleBack}
          />
        )}

        {/* Step 5: Stake - 质押 */}
        {currentStep === 5 && config.paymasterAddress && config.walletStatus && config.stakeOption && (
          <Step5_Stake
            paymasterAddress={config.paymasterAddress}
            walletStatus={config.walletStatus}
            selectedOption={config.stakeOption}
            onNext={handleStep5Complete}
            onBack={handleBack}
          />
        )}

        {/* Step 6: Register Registry - 注册到 Registry */}
        {currentStep === 6 && config.paymasterAddress && config.walletStatus && (
          <Step6_RegisterRegistry
            paymasterAddress={config.paymasterAddress}
            walletStatus={config.walletStatus}
            communityName={config.communityName}
            onNext={handleStep6Complete}
            onBack={handleBack}
          />
        )}

        {/* Step 7: Complete - 完成（需要跳转到管理页面）*/}
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
