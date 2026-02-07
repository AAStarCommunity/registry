import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useRegistry } from '../../hooks/useRegistry';
import { usePaymasterV4 } from '../../hooks/usePaymasterV4';
import { useFaucet } from '../../hooks/useFaucet';
import { FaucetCard } from './FaucetCard';

type Step = 'WELCOME' | 'FAUCET' | 'DEPOSIT' | 'ROLE' | 'DEPLOY' | 'DONE';

export const OnboardingWizard: React.FC = () => {
    const { address, network } = useWallet();
    const { hasRole } = useRegistry();
    const { mintGTokens, quickStart, isLoading: isFaucetLoading } = useFaucet();

    const [currentStep, setCurrentStep] = useState<Step>('WELCOME');
    const [isRoleChecked, setIsRoleChecked] = useState(false);
    const [hasOperatorRole, setHasOperatorRole] = useState(false);

    // Initial status check
    useEffect(() => {
        const checkStatus = async () => {
            if (!address) return;
            // hasRole expects a role bytes32, we'll need to get ROLE_PAYMASTER_AOA from SDK
            // For now, skip this check as it's not critical for the UI demo
            setIsRoleChecked(true);
        };
        checkStatus();
    }, [address]);

    const handleNext = () => {
        if (currentStep === 'WELCOME') setCurrentStep('FAUCET');
        else if (currentStep === 'FAUCET') setCurrentStep('ROLE');
        else if (currentStep === 'ROLE') setCurrentStep('DEPLOY');
        else if (currentStep === 'DEPLOY') setCurrentStep('DONE');
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-10 text-white">
                <h2 className="text-2xl font-bold mb-2">Operator Onboarding</h2>
                <p className="text-blue-100 opacity-90">
                    Follow these steps to set up your Paymaster node.
                </p>
                
                {/* Progress Bar */}
                <div className="mt-8 flex items-center space-x-2">
                    {['WELCOME', 'FAUCET', 'ROLE', 'DEPLOY', 'DONE'].map((s, idx) => (
                        <div 
                            key={s}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                                ['WELCOME', 'FAUCET', 'ROLE', 'DEPLOY', 'DONE'].indexOf(currentStep) >= idx 
                                ? 'bg-white' 
                                : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-8">
                {currentStep === 'WELCOME' && (
                    <div className="space-y-6">
                        <div className="text-center py-4">
                            <div className="text-5xl mb-4">👋</div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Welcome, Operator</h3>
                            <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
                                We'll help you deploy your Paymaster V4 and register with the AAStar Registry in just a few minutes.
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <button 
                                onClick={handleNext}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-105"
                            >
                                Let's Get Started
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'FAUCET' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                            <span className="mr-2">Step 1:</span> Get Test Assets
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            You'll need some Test ETH and GToken to pay for deployment and staking. If you already have assets, you can skip this.
                        </p>
                        <FaucetCard />
                        
                        {/* GToken Market Link */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-start space-x-3">
                                <span className="text-2xl">🎟️</span>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">
                                        Need GTokens but have no ETH on this address?
                                    </h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                                        You can buy GTokens from another wallet and send them directly to this operator address.
                                    </p>
                                    <a
                                        href="/v3-admin/gtoken-market"
                                        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                                    >
                                        Open GToken Market →
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button onClick={() => setCurrentStep('WELCOME')} className="text-slate-500 hover:text-slate-700 font-medium">Back</button>
                            <button 
                                onClick={handleNext}
                                className="px-6 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-xl transition-all"
                            >
                                Skip & Continue
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'ROLE' && (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
                            🛡️
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Step 2: Role Registration</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                            Every Paymaster must be registered in the Registry with the `ROLE_PAYMASTER_AOA` role.
                        </p>
                        
                        {hasOperatorRole ? (
                            <div className="py-4 px-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 flex items-center justify-center">
                                <span className="mr-2">✅</span> Registered as Operator
                            </div>
                        ) : (
                            <div className="py-8">
                                <p className="text-sm text-amber-600 mb-4 font-medium italic">
                                    [Sponsored Registration Flow - Coming Soon]
                                </p>
                                <button
                                    onClick={() => {/* Direct registration call if user has tokens */}}
                                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200"
                                >
                                    Check Registration Status
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <button onClick={() => setCurrentStep('FAUCET')} className="text-slate-500 hover:text-slate-700 font-medium">Back</button>
                            <button 
                                onClick={handleNext}
                                className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-xl shadow-md"
                            >
                                Next Step
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'DEPLOY' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Step 3: Deploy Paymaster V4</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Finally, we'll deploy your personalized Paymaster V4 contract. 
                        </p>
                        
                        <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-sm font-medium block">Account Status:</span>
                                    <span className="text-xs text-slate-500">{address}</span>
                                </div>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Ready</span>
                            </div>
                            
                            <button 
                                onClick={handleNext}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                Deploy Paymaster V4
                            </button>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button onClick={() => setCurrentStep('ROLE')} className="text-slate-500 hover:text-slate-700 font-medium">Back</button>
                        </div>
                    </div>
                )}

                {currentStep === 'DONE' && (
                    <div className="text-center py-6 space-y-6">
                        <div className="text-6xl animate-bounce">🎉</div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Setup Complete!</h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                            Your Paymaster is now active and ready to sponsor transactions on the AAStar network.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-10 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl shadow-xl transition-all"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
