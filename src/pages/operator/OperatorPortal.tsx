import { useState } from "react";
import { DeployPaymaster } from "./DeployPaymaster";
import { ConfigurePaymaster } from "./ConfigurePaymaster";
import { StakeEntryPoint } from "./StakeEntryPoint";
import { RegisterToRegistry } from "./RegisterToRegistry";
import { ManagePaymaster } from "./ManagePaymaster";
import "./OperatorPortal.css";

type Step = "select" | "deploy" | "configure" | "stake" | "register" | "manage";

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
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [paymasterState, setPaymasterState] = useState<PaymasterState>({});

  const handleSelectMode = (mode: "new" | "existing") => {
    if (mode === "new") {
      setCurrentStep("deploy");
    } else {
      setCurrentStep("manage");
    }
  };

  const handleDeployComplete = (address: string, owner: string) => {
    setPaymasterState({ ...paymasterState, address, owner });
    setCurrentStep("configure");
  };

  const handleConfigureComplete = (
    sbtAddress: string,
    gasTokenAddress: string,
  ) => {
    setPaymasterState({ ...paymasterState, sbtAddress, gasTokenAddress });
    setCurrentStep("stake");
  };

  const handleStakeComplete = () => {
    setPaymasterState({ ...paymasterState, entryPointDeposited: true });
    setCurrentStep("register");
  };

  const handleRegisterComplete = () => {
    setPaymasterState({ ...paymasterState, registryRegistered: true });
    setCurrentStep("manage");
  };

  const handleBackToStart = () => {
    setCurrentStep("select");
    setPaymasterState({});
  };

  return (
    <div className="operator-portal-container">
      <div className="operator-portal-header">
        <h1>Operator Portal</h1>
        <p className="operator-portal-subtitle">
          Self-service Paymaster deployment and management
        </p>
      </div>

      {/* Progress indicator */}
      <div className="progress-container">
        <div className="progress-steps">
          <StepIndicator
            step={1}
            label="Deploy"
            active={currentStep === "deploy"}
            completed={!!paymasterState.address}
          />
          <StepIndicator
            step={2}
            label="Configure"
            active={currentStep === "configure"}
            completed={!!paymasterState.sbtAddress}
          />
          <StepIndicator
            step={3}
            label="Stake"
            active={currentStep === "stake"}
            completed={!!paymasterState.entryPointDeposited}
          />
          <StepIndicator
            step={4}
            label="Register"
            active={currentStep === "register"}
            completed={!!paymasterState.registryRegistered}
          />
          <StepIndicator
            step={5}
            label="Manage"
            active={currentStep === "manage"}
            completed={false}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="operator-content-card">
        {currentStep === "select" && <SelectMode onSelect={handleSelectMode} />}

        {currentStep === "deploy" && (
          <DeployPaymaster onComplete={handleDeployComplete} />
        )}

        {currentStep === "configure" && paymasterState.address && (
          <ConfigurePaymaster
            paymasterAddress={paymasterState.address}
            onComplete={handleConfigureComplete}
            onBack={() => setCurrentStep("deploy")}
          />
        )}

        {currentStep === "stake" && paymasterState.address && (
          <StakeEntryPoint
            paymasterAddress={paymasterState.address}
            onComplete={handleStakeComplete}
            onBack={() => setCurrentStep("configure")}
          />
        )}

        {currentStep === "register" && paymasterState.address && (
          <RegisterToRegistry
            paymasterAddress={paymasterState.address}
            onComplete={handleRegisterComplete}
            onBack={() => setCurrentStep("stake")}
          />
        )}

        {currentStep === "manage" && paymasterState.address && (
          <ManagePaymaster
            paymasterAddress={paymasterState.address}
            onBackToStart={handleBackToStart}
          />
        )}
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  const circleClass = completed
    ? "step-circle completed"
    : active
      ? "step-circle active"
      : "step-circle inactive";

  const labelClass = active ? "step-label active" : "step-label";

  return (
    <div className="step-indicator">
      <div className={circleClass}>{completed ? "✓" : step}</div>
      <span className={labelClass}>{label}</span>
    </div>
  );
}

// Mode selection component
function SelectMode({
  onSelect,
}: {
  onSelect: (mode: "new" | "existing") => void;
}) {
  return (
    <div className="mode-selection">
      <h2>Welcome to Operator Portal</h2>
      <p>Choose how you want to proceed:</p>

      <div className="mode-grid">
        <button onClick={() => onSelect("new")} className="mode-card primary">
          <span className="mode-icon">🆕</span>
          <h3>Deploy New Paymaster</h3>
          <p>
            Create a new PaymasterV4_1 contract and configure it step by step
          </p>
        </button>

        <button onClick={() => onSelect("existing")} className="mode-card">
          <span className="mode-icon">📋</span>
          <h3>Manage Existing Paymaster</h3>
          <p>
            Manage parameters, stake, and Registry status of your deployed
            Paymaster
          </p>
        </button>
      </div>

      <div className="info-box">
        <h4>📚 What is a Paymaster?</h4>
        <p>
          A Paymaster is a smart contract that sponsors gas fees for users in
          your community. Users pay with community tokens (PNT) instead of ETH,
          making blockchain interactions more accessible and user-friendly.
        </p>
      </div>
    </div>
  );
}
