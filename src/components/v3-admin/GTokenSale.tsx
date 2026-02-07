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

  const estimatedGTokens = (parseFloat(ethAmount) * Number(rate)).toString();

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
          🎟️
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">GToken On-ramp</h2>
          <p className="text-sm text-slate-500">Buy GTokens for any address (ETH to sGT)</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Recipient Input */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-[10px] text-slate-400 mt-1 ml-1 italic">
             * GTokens will be sent directly to this address.
          </p>
        </div>

        {/* Amount Input */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Pay ETH</label>
            <div className="relative">
              <input
                type="number"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-xs uppercase">ETH</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 ml-1">Receive sGT</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={estimatedGTokens}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-bold text-blue-600"
              />
              <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-xs uppercase">sGT</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-lg border border-red-100 dark:border-red-800">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={isLoading || !recipient}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-xl transition-all transform hover:scale-[1.01] active:scale-100 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </span>
        ) : (
          `Buy ${estimatedGTokens} GTokens`
        )}
      </button>

      <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 pt-2">
        <span>汇率: 1 ETH = {rate.toString()} sGT</span>
        <span className="underline cursor-help">需要 USDT 支付?</span>
      </div>
    </div>
  );
};
