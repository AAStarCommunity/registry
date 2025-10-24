/**
 * Step 1: Connect Wallet & Select Stake Option
 *
 * Merged flow to avoid checking resources before knowing user's choice:
 * 1. Connect wallet (basic connection only)
 * 2. Select stake option (Standard or Super Mode)
 * 3. Check resources based on selected option
 */

import React, { useState, useEffect } from "react";
import { getCurrentNetworkConfig } from "../../../../config/networkConfig";
import { WalletStatus } from "../components/WalletStatus";
import { checkWalletStatus, getCurrentNetwork } from "../utils/walletChecker";
import type { WalletStatus as WalletStatusType } from "../utils/walletChecker";
import {
  StakeOptionCard,
  createStandardFlowOption,
  createSuperModeOption,
  type StakeOptionType,
  type StakeOption,
} from "../components/StakeOptionCard";
import "./Step1_ConnectAndSelect.css";

export interface Step1Props {
  onNext: (walletStatus: WalletStatusType, stakeOption: StakeOptionType) => void;
  isTestMode?: boolean;
}

enum SubStep {
  ConnectWallet = 1,
  SelectOption = 2,
  CheckResources = 3,
}

export function Step1_ConnectAndSelect({ onNext, isTestMode = false }: Step1Props) {
  const config = getCurrentNetworkConfig();
  const [subStep, setSubStep] = useState<SubStep>(SubStep.ConnectWallet);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<StakeOptionType | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{
    chainId: number;
    chainName: string;
  } | null>(null);

  // Test mode auto-setup
  useEffect(() => {
    if (isTestMode) {
      const mockWalletStatus: WalletStatusType = {
        isConnected: true,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
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
      };
      setWalletAddress(mockWalletStatus.address);
      setSelectedOption('standard');
      setWalletStatus(mockWalletStatus);
      setSubStep(SubStep.CheckResources);
      console.log('🧪 Test Mode: Auto-completed Step 1');
      return;
    }

    loadNetworkInfo();
  }, [isTestMode]);

  const loadNetworkInfo = async () => {
    try {
      const info = await getCurrentNetwork();
      setNetworkInfo(info);
    } catch (err) {
      console.error("Failed to get network info:", err);
    }
  };

  // SubStep 1: Connect Wallet (basic connection only)
  const handleConnectWallet = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask or another Web3 wallet");
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      setWalletAddress(address);
      setSubStep(SubStep.SelectOption);
      console.log(`✅ Wallet connected: ${address}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      console.error("Wallet connection error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // SubStep 2: Select Stake Option
  const handleSelectOption = (option: StakeOptionType) => {
    setSelectedOption(option);
    console.log(`✅ User selected: ${option} mode`);
  };

  const handleConfirmOption = async () => {
    if (!selectedOption) return;

    // Move to resource checking
    setSubStep(SubStep.CheckResources);

    // Check resources based on selected option
    await checkResourcesForOption(selectedOption);
  };

  // SubStep 3: Check Resources (conditional based on option)
  const checkResourcesForOption = async (option: StakeOptionType) => {
    setIsLoading(true);
    setError(null);

    try {
      // Define different requirements based on option
      const requirements = option === 'standard'
        ? {
            requiredETH: config.requirements.minEthDeploy, // 0.1 ETH for deployment + stake
            requiredGToken: config.requirements.minGTokenStake, // 100 GToken
            requiredPNTs: "0", // Standard flow doesn't need PNTs
          }
        : {
            requiredETH: "0.02", // Super mode only needs small ETH for gas
            requiredGToken: config.requirements.minGTokenStake, // 100 GToken
            requiredPNTs: config.requirements.minPntDeposit, // 1000 PNTs
          };

      const status = await checkWalletStatus(requirements);
      setWalletStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check wallet";
      setError(errorMessage);
      console.error("Resource check error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshResources = () => {
    if (selectedOption) {
      checkResourcesForOption(selectedOption);
    }
  };

  const handleGetGToken = () => {
    window.open("/get-gtoken", "_blank");
  };

  const handleGetPNTs = () => {
    window.open("/get-pnts", "_blank");
  };

  const handleGetETH = () => {
    if (networkInfo?.chainId === 11155111) {
      window.open("https://sepoliafaucet.com", "_blank");
    } else {
      alert("Please acquire ETH from your preferred exchange or faucet");
    }
  };

  const canProceed = () => {
    if (!walletStatus || !selectedOption) return false;

    // Check requirements based on selected option
    if (selectedOption === 'standard') {
      return walletStatus.hasEnoughETH && walletStatus.hasEnoughGToken;
    } else {
      return walletStatus.hasEnoughETH && walletStatus.hasEnoughGToken && walletStatus.hasEnoughPNTs;
    }
  };

  const handleNext = () => {
    if (walletStatus && selectedOption && canProceed()) {
      onNext(walletStatus, selectedOption);
    }
  };

  // Render different substeps
  const renderContent = () => {
    // SubStep 1: Connect Wallet
    if (subStep === SubStep.ConnectWallet) {
      return (
        <div className="substep-connect">
          <div className="substep-header">
            <h2>Connect Your Wallet</h2>
            <p className="substep-description">
              Connect your operator wallet (MetaMask) to get started with Paymaster deployment.
            </p>
          </div>

          {networkInfo && (
            <div className="network-info">
              <span className="network-icon">🌐</span>
              <span className="network-name">{networkInfo.chainName}</span>
              <span className="network-chain-id">Chain ID: {networkInfo.chainId}</span>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <div className="error-title">Connection Error</div>
                <div className="error-message">{error}</div>
              </div>
            </div>
          )}

          <div className="connect-wallet-container">
            <div className="connect-wallet-icon">🔐</div>
            <p className="connect-wallet-prompt">
              Please connect your MetaMask wallet to get started
            </p>
            <button
              className="btn-connect-primary"
              onClick={handleConnectWallet}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner">⏳</span> Connecting...
                </>
              ) : (
                <>
                  <span className="wallet-icon">🦊</span> Connect MetaMask
                </>
              )}
            </button>
            <p className="connect-wallet-hint">
              Make sure you have MetaMask installed and are on the correct network
            </p>
          </div>

          <div className="help-section">
            <div className="help-title">💡 What Happens Next?</div>
            <div className="help-content">
              <div className="help-step">
                <div className="help-step-number">1</div>
                <div className="help-step-text">
                  <strong>Connect Wallet</strong> - Connect your MetaMask wallet
                </div>
              </div>
              <div className="help-step">
                <div className="help-step-number">2</div>
                <div className="help-step-text">
                  <strong>Select Mode</strong> - Choose between Standard Flow or Super Mode
                </div>
              </div>
              <div className="help-step">
                <div className="help-step-number">3</div>
                <div className="help-step-text">
                  <strong>Check Resources</strong> - We'll verify you have the required resources
                </div>
              </div>
            </div>
            <div className="help-note">
              <strong>Resource Requirements:</strong>
              <ul>
                <li><strong>Standard Flow:</strong> ETH + stGToken</li>
                <li><strong>Super Mode:</strong> ETH + stGToken + aPNTs</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    // SubStep 2: Select Stake Option
    if (subStep === SubStep.SelectOption) {
      // Create temporary wallet status for option cards (without balance checks yet)
      const tempWalletStatus: WalletStatusType = {
        isConnected: true,
        address: walletAddress!,
        ethBalance: "0", // Will check after selection
        gTokenBalance: "0",
        pntsBalance: "0",
        aPNTsBalance: "0",
        hasSBTContract: false,
        hasGasTokenContract: false,
        hasEnoughETH: false,
        hasEnoughGToken: false,
        hasEnoughPNTs: false,
        hasEnoughAPNTs: false,
        requiredETH: "0",
        requiredGToken: "0",
        requiredPNTs: "0",
        requiredAPNTs: "0",
      };

      // Don't show balances yet - user hasn't been checked
      const standardOption = createStandardFlowOption(tempWalletStatus, config, false);
      const superOption = createSuperModeOption(tempWalletStatus, config, false);

      return (
        <div className="substep-select">
          <div className="substep-header">
            <h2>Select Your Deployment Mode</h2>
            <p className="substep-description">
              Choose between Standard Flow (full control) or Super Mode (quick launch).
              We'll check your resources based on your selection.
            </p>
          </div>

          <div className="wallet-connected-info">
            <span className="wallet-icon">👛</span>
            <span className="wallet-address">
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </span>
          </div>

          {/* Gas Station Metaphor */}
          <div className="metaphor-banner">
            <div className="metaphor-icon">⛽</div>
            <div className="metaphor-content">
              <div className="metaphor-title">Gas Station Metaphor: We Help You Build a Paymaster Gas Station</div>
              <div className="metaphor-comparison">
                <div className="metaphor-option">
                  <div className="metaphor-option-title">🏗️ Standard Flow</div>
                  <p>Use free building materials (open-source code), <strong>build and maintain your own</strong> gas station, register to Registry, and protocol provides customer traffic.</p>
                  <p className="metaphor-highlight">Gas (ETH) needs to be <strong>purchased and distributed across chains by yourself</strong>.</p>
                </div>
                <div className="metaphor-option">
                  <div className="metaphor-option-title">⚡ Super Mode</div>
                  <p><strong>No construction needed</strong>. Join SuperPaymaster, provide gas station services, sell your community gas cards (xPNTs).</p>
                  <p className="metaphor-highlight">Users top up credits to cards. Protocol handles <strong>cross-chain infrastructure, gas purchase & distribution</strong>.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="comparison-table">
            <div className="comparison-header">
              <h3>📊 Comprehensive Comparison: Core Differences</h3>
            </div>

            <div className="comparison-grid">
              {/* Resource Requirements */}
              <div className="comparison-row">
                <div className="comparison-label">💰 Resource Requirements</div>
                <div className="comparison-standard">
                  <strong>ETH + stGToken</strong>
                  <p className="comparison-detail">Need sufficient ETH for contract deployment and EntryPoint deposit</p>
                </div>
                <div className="comparison-super">
                  <strong>ETH + stGToken + aPNTs</strong>
                  <p className="comparison-detail">ETH only for gas, aPNTs for gas backing</p>
                </div>
              </div>

              {/* Maintenance */}
              <div className="comparison-row">
                <div className="comparison-label">🔧 Ongoing Maintenance</div>
                <div className="comparison-standard">
                  <strong>Self-Maintained</strong>
                  <p className="comparison-detail">Purchase ETH yourself and deposit to EntryPoints on each chain</p>
                  <p className="comparison-detail warning">⚠️ Bear the cost of managing multiple EntryPoint balances across chains</p>
                </div>
                <div className="comparison-super">
                  <strong>Protocol-Managed</strong>
                  <p className="comparison-detail">Simply deposit aPNTs in SuperPaymaster dashboard</p>
                  <p className="comparison-detail success">✅ aPNTs already distributed cross-chain. No manual cross-chain operations needed</p>
                </div>
              </div>

              {/* Reputation */}
              <div className="comparison-row">
                <div className="comparison-label">⭐ Reputation Accumulation</div>
                <div className="comparison-standard">
                  <strong>No Reputation</strong>
                  <p className="comparison-detail">SuperPaymaster provides free registration and smart routing</p>
                  <p className="comparison-detail warning">⚠️ But NO Reputation accumulation</p>
                  <p className="comparison-detail">Customers cannot select your service based on Reputation (stability, pricing, etc.)</p>
                </div>
                <div className="comparison-super">
                  <strong>Reputation System</strong>
                  <p className="comparison-detail success">✅ Accumulate Reputation through service quality</p>
                  <p className="comparison-detail">Customers can choose your service based on Reputation</p>
                  <p className="comparison-detail">Higher Reputation = More customer traffic and revenue</p>
                </div>
              </div>

              {/* Contract Deployment */}
              <div className="comparison-row">
                <div className="comparison-label">🚀 Contract Deployment</div>
                <div className="comparison-standard">
                  <strong>Deployment Required</strong>
                  <p className="comparison-detail">Deploy your own PaymasterV4 contract</p>
                  <p className="comparison-detail">Full control over contract and funds</p>
                </div>
                <div className="comparison-super">
                  <strong>No Deployment</strong>
                  <p className="comparison-detail success">✅ Use shared SuperPaymasterV2 contract</p>
                  <p className="comparison-detail">Launch in 3 seconds</p>
                </div>
              </div>

              {/* Best For */}
              <div className="comparison-row">
                <div className="comparison-label">🎯 Best For</div>
                <div className="comparison-standard">
                  <ul className="comparison-list">
                    <li>Have abundant ETH funds</li>
                    <li>Want full control over gas budget</li>
                    <li>Have technical team to manage cross-chain balances</li>
                    <li>Don't care about Reputation accumulation</li>
                  </ul>
                </div>
                <div className="comparison-super">
                  <ul className="comparison-list">
                    <li>Quick launch for community Paymaster</li>
                    <li>Don't want to handle cross-chain maintenance</li>
                    <li>Want to accumulate Reputation</li>
                    <li>Focus on community operations over tech</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="stake-options-grid">
            <StakeOptionCard
              option={standardOption}
              walletStatus={tempWalletStatus}
              selected={selectedOption === "standard"}
              disabled={false}
              onSelect={() => handleSelectOption("standard")}
            />

            <StakeOptionCard
              option={superOption}
              walletStatus={tempWalletStatus}
              selected={selectedOption === "super"}
              disabled={false}
              onSelect={() => handleSelectOption("super")}
            />
          </div>

          <div className="substep-navigation">
            <button
              onClick={() => setSubStep(SubStep.ConnectWallet)}
              className="nav-button back"
            >
              ← Back
            </button>

            <button
              onClick={handleConfirmOption}
              className="nav-button next"
              disabled={!selectedOption}
            >
              {selectedOption ? "Check Resources →" : "Select an option"}
            </button>
          </div>
        </div>
      );
    }

    // SubStep 3: Check Resources
    if (subStep === SubStep.CheckResources) {
      return (
        <div className="substep-resources">
          <div className="substep-header">
            <h2>Verify Your Resources</h2>
            <p className="substep-description">
              You selected <strong>{selectedOption === 'standard' ? 'Standard Flow' : 'Super Mode'}</strong>.
              Let's check if you have the required resources.
            </p>
          </div>

          <div className="selected-mode-banner">
            <span className="mode-icon">{selectedOption === 'standard' ? '🚀' : '⚡'}</span>
            <div className="mode-info">
              <div className="mode-title">
                {selectedOption === 'standard' ? 'Standard ERC-4337 Flow' : 'GToken Super Mode'}
              </div>
              <div className="mode-description">
                {selectedOption === 'standard'
                  ? 'Deploy your own Paymaster contract with full control'
                  : 'Quick launch using shared SuperPaymaster contract'}
              </div>
            </div>
            <button
              onClick={() => setSubStep(SubStep.SelectOption)}
              className="change-mode-btn"
            >
              Change Mode
            </button>
          </div>

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <div className="error-title">Resource Check Error</div>
                <div className="error-message">{error}</div>
                <button className="retry-button" onClick={handleRefreshResources}>
                  Retry Check
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="loading-state">
              <div className="loading-spinner">⏳</div>
              <div className="loading-text">Checking wallet resources...</div>
            </div>
          )}

          {!isLoading && walletStatus && (
            <>
              <WalletStatus
                status={walletStatus}
                onGetGToken={handleGetGToken}
                onGetPNTs={handleGetPNTs}
                onGetETH={handleGetETH}
              />

              <div className="refresh-section">
                <button className="refresh-button" onClick={handleRefreshResources}>
                  🔄 Refresh Balances
                </button>
                <span className="refresh-help">
                  Click to re-check your wallet balances after acquiring resources
                </span>
              </div>
            </>
          )}

          <div className="help-section">
            <div className="help-title">💡 Resource Guide</div>
            <div className="help-content">
              <div className="help-item">
                <strong>ETH:</strong> Required for {selectedOption === 'standard' ? 'deploying contracts and paying gas fees' : 'transaction gas fees'}.
                {selectedOption === 'standard'
                  ? ` You need ${config.requirements.minEthDeploy} ETH for deployment and staking.`
                  : ' Super Mode only needs minimal ETH for gas.'}
              </div>
              <div className="help-item">
                <strong>stGToken:</strong> Staked GToken credential obtained after staking GToken on Staking Contract.
                Lock {config.requirements.minGTokenStake}+ stGToken to join SuperPaymaster (more locked = higher reputation).
              </div>
              {selectedOption === 'super' && (
                <div className="help-item">
                  <strong>aPNTs:</strong> Advanced PNTs required for SuperPaymaster ({config.requirements.minPntDeposit}+ minimum).
                  Purchase from AAStar Community to enable fast deployment.
                </div>
              )}
            </div>
          </div>

          <div className="step-actions">
            <button
              className="btn-next"
              onClick={handleNext}
              disabled={!canProceed()}
              title={
                !canProceed()
                  ? "Please ensure you have all required resources"
                  : "Proceed to configuration"
              }
            >
              {canProceed() ? (
                <>Next: Configuration →</>
              ) : (
                <>Acquire Required Resources First</>
              )}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="step1-connect-and-select">
      {/* Progress indicator for substeps */}
      <div className="substep-progress">
        <div className={`substep-indicator ${subStep >= SubStep.ConnectWallet ? 'active' : ''} ${subStep > SubStep.ConnectWallet ? 'completed' : ''}`}>
          <span className="substep-number">1</span>
          <span className="substep-label">Connect</span>
        </div>
        <div className="substep-line" />
        <div className={`substep-indicator ${subStep >= SubStep.SelectOption ? 'active' : ''} ${subStep > SubStep.SelectOption ? 'completed' : ''}`}>
          <span className="substep-number">2</span>
          <span className="substep-label">Select Mode</span>
        </div>
        <div className="substep-line" />
        <div className={`substep-indicator ${subStep >= SubStep.CheckResources ? 'active' : ''}`}>
          <span className="substep-number">3</span>
          <span className="substep-label">Check Resources</span>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
