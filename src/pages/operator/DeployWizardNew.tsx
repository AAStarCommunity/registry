/**
 * DeployWizard - Simplified 3-Step Flow
 *
 * New Architecture:
 * Step 1: Connect Wallet & Select Mode (AOA / AOA+)
 * Step 2: Resource Check & Guidance (detect and guide to independent pages)
 * Step 3: Complete (display summary and next steps)
 */

import { useState, useEffect } from 'react';
import './DeployWizard.css';

// Import step components
import { Step1_ConnectAndSelect } from './deploy-v2/steps/Step1_ConnectAndSelect';
import { Step2_ResourceCheck } from './deploy-v2/steps/Step2_ResourceCheck';
import { Step3_Complete } from './deploy-v2/steps/Step3_Complete';

// Import types
import type { WalletStatus } from './deploy-v2/utils/walletChecker';
import type { StakeMode, ResourceStatus } from './deploy-v2/utils/resourceChecker';
import { checkResources } from './deploy-v2/utils/resourceChecker';
import type { StakeOptionType } from './deploy-v2/components/StakeOptionCard';

export function DeployWizardNew() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<StakeMode | null>(null);
  const [resources, setResources] = useState<ResourceStatus | null>(null);

  // Handle URL params (for returning from independent pages)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');

    if (returnUrl === '/operator/wizard' && walletAddress && selectedMode) {
      // User returned from an independent page, refresh resources
      refreshResources();
    }
  }, []);

  const refreshResources = async () => {
    if (walletAddress && selectedMode) {
      try {
        const status = await checkResources(walletAddress, selectedMode);
        setResources(status);
      } catch (err) {
        console.error('Failed to refresh resources:', err);
      }
    }
  };

  // Step 1: Wallet Connection & Mode Selection
  const handleStep1Complete = (walletStatus: WalletStatus, stakeOption: StakeOptionType) => {
    console.log('Step 1 Complete:', { walletStatus, stakeOption });

    // Convert StakeOptionType to StakeMode
    const mode: StakeMode = stakeOption === 'super' ? 'aoa+' : 'aoa';

    setWalletAddress(walletStatus.address);
    setSelectedMode(mode);
    setCurrentStep(2);
  };

  // Step 2: Resource Check Complete
  const handleStep2Complete = async () => {
    console.log('Step 2 Complete');

    // Fetch final resource status
    if (walletAddress && selectedMode) {
      try {
        const status = await checkResources(walletAddress, selectedMode);
        setResources(status);
        setCurrentStep(3);
      } catch (err) {
        console.error('Failed to get final resources:', err);
        alert('Failed to get resource status');
      }
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setWalletAddress('');
    setSelectedMode(null);
    setResources(null);
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_ConnectAndSelect
            onNext={handleStep1Complete}
          />
        );

      case 2:
        if (!walletAddress || !selectedMode) {
          return <div>Error: Missing wallet or mode selection</div>;
        }
        return (
          <Step2_ResourceCheck
            walletAddress={walletAddress}
            mode={selectedMode}
            onNext={handleStep2Complete}
            onBack={handleBack}
          />
        );

      case 3:
        if (!resources || !selectedMode) {
          return <div>Error: Missing resources data</div>;
        }
        return (
          <Step3_Complete
            mode={selectedMode}
            resources={resources}
            onRestart={handleRestart}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="deploy-wizard">
      <div className="wizard-container">
        {/* Wizard Header */}
        <div className="wizard-header">
          <h1>🧙 部署向导</h1>
          <p className="wizard-subtitle">
            {currentStep === 1 && '连接钱包并选择部署模式'}
            {currentStep === 2 && '检测资源并完成缺失项'}
            {currentStep === 3 && '部署完成'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="wizard-progress">
          <div className="progress-steps">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <div className="step-label">连接 & 选择</div>
            </div>

            <div className="progress-line"></div>

            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <div className="step-label">资源检测</div>
            </div>

            <div className="progress-line"></div>

            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-circle">3</div>
              <div className="step-label">完成</div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="wizard-content">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

// Export as default for easier testing
export default DeployWizardNew;
