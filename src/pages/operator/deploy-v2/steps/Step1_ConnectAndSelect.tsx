/**
 * Step 1: Connect Wallet & Select Stake Option
 *
 * Merged flow to avoid checking resources before knowing user's choice:
 * 1. Connect wallet (basic connection only)
 * 2. Select stake option (Standard or Super Mode)
 * 3. Check resources based on selected option
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const config = getCurrentNetworkConfig();
  const [subStep, setSubStep] = useState<SubStep>(SubStep.ConnectWallet);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<StakeOptionType | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatusType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
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
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask or another Web3 wallet");
      }

      // First, check if wallet is already connected (auto-detect current account)
      let accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      // If not connected, request connection (this will show MetaMask popup)
      if (accounts.length === 0) {
        console.log('🔗 No accounts connected, requesting connection...');
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
      } else {
        console.log('✅ Auto-detected connected account:', accounts[0]);
      }

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
      setIsConnecting(false);
    }
  };

  // Force switch account - always show MetaMask account selector
  const handleSwitchAccount = async () => {
    setIsSwitching(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask or another Web3 wallet");
      }

      // Request permissions to force account selector popup
      console.log('🔄 Requesting account switch...');
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      // After permission is granted, request accounts to get the newly selected account
      // wallet_requestPermissions doesn't return accounts, so we need to request them again
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      setWalletAddress(address);
      setSubStep(SubStep.SelectOption);
      console.log(`✅ Switched to account: ${address}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to switch account";
      setError(errorMessage);
      console.error("Account switch error:", err);
    } finally {
      setIsSwitching(false);
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
            <h2>{t('step1.substep1.title')}</h2>
            <p className="substep-description">
              {t('step1.substep1.description')}
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
              {t('step1.substep1.connectPrompt')}
            </p>
            <div className="wallet-buttons">
              <button
                className="btn-connect-primary"
                onClick={handleConnectWallet}
                disabled={isConnecting || isSwitching}
              >
                {isConnecting ? (
                  <>
                    <span className="spinner">⏳</span> {t('step1.substep1.connecting')}
                  </>
                ) : (
                  <>
                    <span className="wallet-icon">🦊</span> {t('step1.substep1.connectButton')}
                  </>
                )}
              </button>
              <button
                className="btn-switch-account"
                onClick={handleSwitchAccount}
                disabled={isConnecting || isSwitching}
                title="Switch to a different MetaMask account"
              >
                {isSwitching ? (
                  <>
                    <span className="spinner">⏳</span> Switching...
                  </>
                ) : (
                  <>
                    <span className="switch-icon">🔄</span> Switch Account
                  </>
                )}
              </button>
            </div>
            <p className="connect-wallet-hint">
              {t('step1.substep1.connectHint')}
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
            <h2>{t('step1.substep2.title')}</h2>
            <p className="substep-description">
              {t('step1.substep2.description')}
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
            <div className="metaphor-icon">{t('step1.substep2.metaphor.icon')}</div>
            <div className="metaphor-content">
              <div className="metaphor-title">{t('step1.substep2.metaphor.title')}</div>
              <div className="metaphor-comparison">
                <div className="metaphor-option">
                  <div className="metaphor-option-title">{t('step1.substep2.metaphor.standard.title')}</div>
                  <p dangerouslySetInnerHTML={{ __html: t('step1.substep2.metaphor.standard.description') }} />
                  <p className="metaphor-highlight" dangerouslySetInnerHTML={{ __html: t('step1.substep2.metaphor.standard.highlight') }} />
                </div>
                <div className="metaphor-option">
                  <div className="metaphor-option-title">{t('step1.substep2.metaphor.super.title')}</div>
                  <p dangerouslySetInnerHTML={{ __html: t('step1.substep2.metaphor.super.description') }} />
                  <p className="metaphor-highlight" dangerouslySetInnerHTML={{ __html: t('step1.substep2.metaphor.super.highlight') }} />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="comparison-table">
            <div className="comparison-header">
              <h3>{t('step1.substep2.comparisonTable.title')}</h3>
            </div>

            <div className="comparison-grid">
              {/* Resource Requirements */}
              <div className="comparison-row">
                <div className="comparison-label">{t('step1.substep2.comparisonTable.dimensions.resources')}</div>
                <div className="comparison-standard">
                  <strong>{t('step1.substep2.comparisonTable.standard.resources.title')}</strong>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.standard.resources.detail1')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.standard.resources.detail2')}</p>
                  <p className="comparison-detail warning">{t('step1.substep2.comparisonTable.standard.resources.warning')}</p>
                </div>
                <div className="comparison-super">
                  <strong>{t('step1.substep2.comparisonTable.super.resources.title')}</strong>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.resources.detail1')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.resources.detail2')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.resources.detail3')}</p>
                  <p className="comparison-detail success">{t('step1.substep2.comparisonTable.super.resources.success')}</p>
                </div>
              </div>

              {/* Maintenance */}
              <div className="comparison-row">
                <div className="comparison-label">{t('step1.substep2.comparisonTable.dimensions.maintenance')}</div>
                <div className="comparison-standard">
                  <strong>{t('step1.substep2.comparisonTable.standard.maintenance.title')}</strong>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.standard.maintenance.detail1')}</p>
                  <p className="comparison-detail warning">{t('step1.substep2.comparisonTable.standard.maintenance.detail2')}</p>
                </div>
                <div className="comparison-super">
                  <strong>{t('step1.substep2.comparisonTable.super.maintenance.title')}</strong>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.maintenance.detail1')}</p>
                  <p className="comparison-detail success">{t('step1.substep2.comparisonTable.super.maintenance.detail2')}</p>
                </div>
              </div>

              {/* Reputation */}
              <div className="comparison-row">
                <div className="comparison-label">{t('step1.substep2.comparisonTable.dimensions.reputation')}</div>
                <div className="comparison-standard">
                  <strong>{t('step1.substep2.comparisonTable.standard.reputation.title')}</strong>
                  <p className="comparison-detail warning">{t('step1.substep2.comparisonTable.standard.reputation.detail1')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.standard.reputation.detail2')}</p>
                </div>
                <div className="comparison-super">
                  <strong>{t('step1.substep2.comparisonTable.super.reputation.title')}</strong>
                  <p className="comparison-detail success">{t('step1.substep2.comparisonTable.super.reputation.detail1')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.reputation.detail2')}</p>
                </div>
              </div>

              {/* Contract Deployment */}
              <div className="comparison-row">
                <div className="comparison-label">{t('step1.substep2.comparisonTable.dimensions.deployment')}</div>
                <div className="comparison-standard">
                  <strong>{t('step1.substep2.comparisonTable.standard.deployment.title')}</strong>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.standard.deployment.detail1')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.standard.deployment.detail2')}</p>
                  <p className="comparison-detail success">{t('step1.substep2.comparisonTable.standard.deployment.success')}</p>
                </div>
                <div className="comparison-super">
                  <strong>{t('step1.substep2.comparisonTable.super.deployment.title')}</strong>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.deployment.detail1')}</p>
                  <p className="comparison-detail">{t('step1.substep2.comparisonTable.super.deployment.detail2')}</p>
                  <p className="comparison-detail warning">{t('step1.substep2.comparisonTable.super.deployment.warning')}</p>
                </div>
              </div>

              {/* Best For */}
              <div className="comparison-row">
                <div className="comparison-label">{t('step1.substep2.comparisonTable.dimensions.bestFor')}</div>
                <div className="comparison-standard">
                  <ul className="comparison-list">
                    <li>{t('step1.substep2.comparisonTable.standard.bestFor.item1')}</li>
                    <li>{t('step1.substep2.comparisonTable.standard.bestFor.item2')}</li>
                    <li>{t('step1.substep2.comparisonTable.standard.bestFor.item3')}</li>
                    <li>{t('step1.substep2.comparisonTable.standard.bestFor.item4')}</li>
                  </ul>
                </div>
                <div className="comparison-super">
                  <ul className="comparison-list">
                    <li>{t('step1.substep2.comparisonTable.super.bestFor.item1')}</li>
                    <li>{t('step1.substep2.comparisonTable.super.bestFor.item2')}</li>
                    <li>{t('step1.substep2.comparisonTable.super.bestFor.item3')}</li>
                    <li>{t('step1.substep2.comparisonTable.super.bestFor.item4')}</li>
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
              {t('common.back')}
            </button>

            <button
              onClick={handleConfirmOption}
              className="nav-button next"
              disabled={!selectedOption}
            >
              {selectedOption ? `${t('common.next')} →` : t('step1.substep2.title')}
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
            <h2>{t('step1.substep3.title')}</h2>
            <p className="substep-description">
              {t('step1.substep3.description')}
            </p>
          </div>

          <div className="selected-mode-banner">
            <span className="mode-icon">{selectedOption === 'standard' ? '🚀' : '⚡'}</span>
            <div className="mode-info">
              <div className="mode-title">
                {selectedOption === 'standard' ? t('step1.substep3.modeStandard') : t('step1.substep3.modeSuper')}
              </div>
              <div className="mode-description">
                {selectedOption === 'standard'
                  ? t('step1.substep2.modeNames.standardSubtitle')
                  : t('step1.substep2.modeNames.superSubtitle')}
              </div>
            </div>
            <button
              onClick={() => setSubStep(SubStep.SelectOption)}
              className="change-mode-btn"
            >
              {t('common.back')}
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
              <div className="loading-text">{t('step1.substep3.checkingWallet')}</div>
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
                  🔄 {t('common.refresh')}
                </button>
                <span className="refresh-help">
                  {t('step1.substep3.resourceCheck')}
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
                  ? t('step1.substep3.notReady')
                  : t('step1.substep3.proceedButton')
              }
            >
              {canProceed() ? (
                <>{t('step1.substep3.proceedButton')}</>
              ) : (
                <>{t('step1.substep3.notReady')}</>
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
          <span className="substep-label">{t('step1.substep1.title')}</span>
        </div>
        <div className="substep-line" />
        <div className={`substep-indicator ${subStep >= SubStep.SelectOption ? 'active' : ''} ${subStep > SubStep.SelectOption ? 'completed' : ''}`}>
          <span className="substep-number">2</span>
          <span className="substep-label">{t('step1.substep2.title')}</span>
        </div>
        <div className="substep-line" />
        <div className={`substep-indicator ${subStep >= SubStep.CheckResources ? 'active' : ''}`}>
          <span className="substep-number">3</span>
          <span className="substep-label">{t('step1.substep3.title')}</span>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
