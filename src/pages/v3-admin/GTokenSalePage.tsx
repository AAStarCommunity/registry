import React, { useState } from 'react';
import { GTokenSale } from '../../components/v3-admin/GTokenSale';
import { useNavigate } from 'react-router-dom';

export const GTokenSalePage: React.FC = () => {
    const navigate = useNavigate();
    const [lastHash, setLastHash] = useState<string | null>(null);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4">
            <div className="max-w-md w-full animate-fade-in-up">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 underline bg-blue-100 dark:bg-blue-900/30 inline-block px-2">GToken Market</h1>
                    <p className="text-slate-500">
                        Acquire Governance Tokens for operator staking and role management.
                    </p>
                </div>

                <GTokenSale 
                    onSuccess={(hash) => setLastHash(hash)}
                />

                {lastHash && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Purchase order submitted!</p>
                        <a 
                            href={`https://sepolia.etherscan.io/tx/${lastHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 underline mt-1 block"
                        >
                            View on Etherscan ↗
                        </a>
                    </div>
                )}

                <div className="mt-12 space-y-4">
                    <button 
                        onClick={() => navigate('/admin/v4')}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow group"
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-xl">🛠️</span>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Return to Onboarding</p>
                                <p className="text-xs text-slate-500">Go back to setup your Paymaster</p>
                            </div>
                        </div>
                        <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                    
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">🎁 Gifting GToken?</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            Simply enter the recipient's address in the field above to buy tokens for their account.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
