import React from 'react';
import { useFaucet } from '../../hooks/useFaucet';
import { useWallet } from '../../contexts/WalletContext';

export const FaucetCard: React.FC = () => {
  const { network } = useWallet();
  const { mintGTokens, quickStart, isLoading, error } = useFaucet();

  const isTestnet = network === 'sepolia' || network === 'op-sepolia';

  if (!isTestnet) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <span className="text-xl">🚰</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Testnet Faucet</h3>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Get test assets to quickly set up your operator node on {network || 'Testnet'}.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => mintGTokens()}
          disabled={isLoading}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all group"
        >
          <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🪙</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mint 1,000 GToken</span>
          <span className="text-xs text-slate-500 mt-1">Direct Minting</span>
        </button>

        <button
          onClick={() => quickStart()}
          disabled={isLoading}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all group"
        >
          <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🚀</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quick Start</span>
          <span className="text-xs text-slate-500 mt-1">ETH + Role + Tokens</span>
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Processing faucet request...</span>
        </div>
      )}
    </div>
  );
};
