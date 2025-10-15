import { useState } from 'react';
import { DeployPaymaster } from './DeployPaymaster';
import { ConfigurePaymaster } from './ConfigurePaymaster';
import { StakeEntryPoint } from './StakeEntryPoint';
import { RegisterToRegistry } from './RegisterToRegistry';
import { ManagePaymaster } from './ManagePaymaster';

type Step = 'select' | 'deploy' | 'configure' | 'stake' | 'register' | 'manage';

interface PaymasterState {
  address?: string;
  owner?: string;
  sbtAddress?: string;
  gasTokenAddress?: string;
  entryPointDeposited?: boolean;
  registryRegistered?: boolean;
}

/**
 * Operator Portal - Self-service Paymaster management
 *
 * Flow:
 * 1. Deploy PaymasterV4_1 contract
 * 2. Configure SBT and GasToken
 * 3. Stake to EntryPoint
 * 4. Register to Registry
 * 5. Manage Paymaster (including Deactivate)
 */
export function OperatorPortal() {
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [paymasterState, setPaymasterState] = useState<PaymasterState>({});

  const handleSelectMode = (mode: 'new' | 'existing') => {
    if (mode === 'new') {
      setCurrentStep('deploy');
    } else {
      setCurrentStep('manage');
    }
  };

  const handleDeployComplete = (address: string, owner: string) => {
    setPaymasterState({ ...paymasterState, address, owner });
    setCurrentStep('configure');
  };

  const handleConfigureComplete = (sbtAddress: string, gasTokenAddress: string) => {
    setPaymasterState({ ...paymasterState, sbtAddress, gasTokenAddress });
    setCurrentStep('stake');
  };

  const handleStakeComplete = () => {
    setPaymasterState({ ...paymasterState, entryPointDeposited: true });
    setCurrentStep('register');
  };

  const handleRegisterComplete = () => {
    setPaymasterState({ ...paymasterState, registryRegistered: true });
    setCurrentStep('manage');
  };

  const handleBackToStart = () => {
    setCurrentStep('select');
    setPaymasterState({});
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Operator Portal</h1>
        <p className="text-gray-600 mb-8">
          Self-service Paymaster deployment and management
        </p>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <StepIndicator
              step={1}
              label="Deploy"
              active={currentStep === 'deploy'}
              completed={!!paymasterState.address}
            />
            <StepIndicator
              step={2}
              label="Configure"
              active={currentStep === 'configure'}
              completed={!!paymasterState.sbtAddress}
            />
            <StepIndicator
              step={3}
              label="Stake"
              active={currentStep === 'stake'}
              completed={!!paymasterState.entryPointDeposited}
            />
            <StepIndicator
              step={4}
              label="Register"
              active={currentStep === 'register'}
              completed={!!paymasterState.registryRegistered}
            />
            <StepIndicator
              step={5}
              label="Manage"
              active={currentStep === 'manage'}
              completed={false}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {currentStep === 'select' && (
            <SelectMode onSelect={handleSelectMode} />
          )}

          {currentStep === 'deploy' && (
            <DeployPaymaster onComplete={handleDeployComplete} />
          )}

          {currentStep === 'configure' && paymasterState.address && (
            <ConfigurePaymaster
              paymasterAddress={paymasterState.address}
              onComplete={handleConfigureComplete}
              onBack={() => setCurrentStep('deploy')}
            />
          )}

          {currentStep === 'stake' && paymasterState.address && (
            <StakeEntryPoint
              paymasterAddress={paymasterState.address}
              onComplete={handleStakeComplete}
              onBack={() => setCurrentStep('configure')}
            />
          )}

          {currentStep === 'register' && paymasterState.address && (
            <RegisterToRegistry
              paymasterAddress={paymasterState.address}
              onComplete={handleRegisterComplete}
              onBack={() => setCurrentStep('stake')}
            />
          )}

          {currentStep === 'manage' && paymasterState.address && (
            <ManagePaymaster
              paymasterAddress={paymasterState.address}
              onBackToStart={handleBackToStart}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({
  step,
  label,
  active,
  completed
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
          ${completed ? 'bg-green-500 text-white' : ''}
          ${active && !completed ? 'bg-blue-500 text-white' : ''}
          ${!active && !completed ? 'bg-gray-200 text-gray-500' : ''}
        `}
      >
        {completed ? '✓' : step}
      </div>
      <span className={`mt-2 text-xs ${active ? 'font-semibold' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

// Mode selection component
function SelectMode({ onSelect }: { onSelect: (mode: 'new' | 'existing') => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Welcome to Operator Portal</h2>
      <p className="text-gray-600 mb-6">
        Choose how you want to proceed:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('new')}
          className="p-6 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-left"
        >
          <div className="text-4xl mb-3">🆕</div>
          <h3 className="text-xl font-semibold mb-2">Deploy New Paymaster</h3>
          <p className="text-gray-600">
            Create a new PaymasterV4_1 contract and configure it step by step
          </p>
        </button>

        <button
          onClick={() => onSelect('existing')}
          className="p-6 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
        >
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-xl font-semibold mb-2">Manage Existing Paymaster</h3>
          <p className="text-gray-600">
            Manage parameters, stake, and Registry status of your deployed Paymaster
          </p>
        </button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold mb-2">📚 What is a Paymaster?</h4>
        <p className="text-sm text-gray-700">
          A Paymaster is a smart contract that sponsors gas fees for users in your community.
          Users pay with community tokens (PNT) instead of ETH, making blockchain interactions
          more accessible and user-friendly.
        </p>
      </div>
    </div>
  );
}
