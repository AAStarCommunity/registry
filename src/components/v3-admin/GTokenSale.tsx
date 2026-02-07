import React, { useState } from 'react';
import { useGTokenSale } from '../../hooks/useGTokenSale';
import { useWallet } from '../../contexts/WalletContext';
import { type Address } from 'viem';

interface GTokenSaleProps {
  initialRecipient?: string;
  onSuccess?: (hash: string) => void;
}

export const GTokenSale: React.FC<GTokenSaleProps> = ({ initialRecipient, onSuccess }) => {
  const { address: connectedAddress } = useWallet();
  const { buyGTokenFor, rate, isLoading } = useGTokenSale();
  
  const [recipient, setRecipient] = useState(initialRecipient || connectedAddress || '');
  const [ethAmount, setEthAmount] = useState('0.1');
  const [error, setError] = useState<string | null>(null);

  const estimatedGTokens = (parseFloat(ethAmount || '0') * Number(rate)).toString();

  const handleBuy = async () => {
    setError(null);
    try {
      const hash = await buyGTokenFor({
        recipient: recipient as Address,
        ethAmount
      });
      if (onSuccess) onSuccess(hash);
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center space-x-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg ring-4 ring-white/10">
          🎟️
        </div>
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200">
            GToken Market
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Instant ETH to sGT Conversion
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Recipient Input */}
        <div className="group">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
            Recipient Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full pl-4 pr-4 py-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-sm shadow-sm backdrop-blur-sm group-hover:bg-white/70 dark:group-hover:bg-slate-900/70"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
               {recipient && recipient.length === 42 ? (
                 <span className="text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded-full">VALID</span>
               ) : (
                 <span className="text-slate-400 text-xs">HEX</span>
               )}
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="group">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
              Pay ETH
            </label>
            <div className="relative transform transition-transform group-focus-within:scale-[1.02]">
              <input
                type="number"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                className="w-full px-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold shadow-inner"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                ETH
              </span>
            </div>
          </div>
          
          <div className="group">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
              Receive sGT
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={estimatedGTokens}
                className="w-full px-4 py-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 border border-blue-100 dark:border-slate-700 font-bold text-blue-600 dark:text-blue-400 text-lg shadow-sm cursor-not-allowed"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-xs uppercase bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                sGT
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-600 dark:text-red-400 animate-pulse">
          <span className="text-xl">⚠️</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={isLoading || !recipient || !ethAmount}
        className="mt-8 w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-lg flex items-center justify-center space-x-2 group"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Processing Transaction...</span>
          </>
        ) : (
          <>
            <span>Buy GTokens Now</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </>
        )}
      </button>

      <div className="mt-4 flex justify-between items-center text-[10px] font-medium text-slate-500 dark:text-slate-400 px-2">
        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
          Exchange Rate: 1 ETH = {rate.toString()} sGT
        </span>
        <button className="hover:text-blue-500 transition-colors flex items-center space-x-1">
          <span>Need help?</span>
        </button>
      </div>
    </div>
  );
};
