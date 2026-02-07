import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { usePaymasterV4 } from '../../hooks/usePaymasterV4';
import { OnboardingWizard } from '../../components/v3-admin/OnboardingWizard';
import { FaucetCard } from '../../components/v3-admin/FaucetCard';
import { parseEther } from 'viem';

/**
 * PaymasterV4 Admin Page
 * 
 * Re-designed with Premium Glassmorphism UI (Tailwind v4)
 */
export const PaymasterV4AdminPage: React.FC = () => {
  const { address, isConnected, network } = useWallet();
  const v4 = usePaymasterV4();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [stakeAmount, setStakeAmount] = useState('30');
  const [ownedPaymaster, setOwnedPaymaster] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  
  const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://opsepolia.explorer.alchemy.com';

  useEffect(() => {
    if (isConnected && address) {
      loadOwnedPaymaster();
    }
  }, [isConnected, address]);

  const loadOwnedPaymaster = async () => {
    try {
      const addr = await v4.getOwnedPaymaster();
      setOwnedPaymaster(addr);
    } catch (err) {
      console.error('Failed to load paymaster', err);
    }
  };

  const handleDeploy = async () => {
    if (!address) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHash(null);
      const result = await v4.deployPaymaster({
        stakeAmount: parseEther(stakeAmount)
      });
      setTxHash(result.deployHash);
      setSuccess(`Success! Paymaster deployed at ${result.paymasterAddress}`);
      setOwnedPaymaster(result.paymasterAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      setLoading(true);
      setError(null);
      const tx = await v4.deposit(depositAmount);
      setTxHash(tx.hash);
      setSuccess(`Successfully deposited ${depositAmount} ETH`);
      setDepositAmount('');
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 flex items-center justify-center">
        <div className="max-w-md w-full p-10 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl text-center">
          <div className="text-6xl mb-6">🔌</div>
          <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            Connect Wallet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Access your Paymaster V4 management dashboard with a secure connection.
          </p>
          <div className="animate-pulse flex justify-center">
             <div className="h-12 w-48 bg-blue-500/20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 -ml-40 -mb-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Operator Portal</span>
              <span className="text-slate-400 font-mono text-xs">{network?.toUpperCase()}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white flex items-center">
              Paymaster<span className="text-blue-600 ml-2">V4</span> Admin
            </h1>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
              Enterprise-grade gas management for distributed applications.
            </p>
          </div>
          
          <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
             <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{address}</span>
          </div>
        </header>

        {/* Global Notifications */}
        {(error || success) && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-start space-x-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 ${
            error ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
          }`}>
            <span className="text-xl mt-0.5">{error ? '⚠️' : '✅'}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{error ? 'Operation Error' : 'Success'}</p>
              <p className="text-sm opacity-90">{error || success}</p>
              {txHash && (
                <a 
                  href={`${explorerUrl}/tx/${txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-2 text-xs font-bold underline underline-offset-4 hover:opacity-75 transition-opacity"
                >
                  View on Explorer <span className="ml-1">↗</span>
                </a>
              )}
            </div>
            <button onClick={() => { setError(null); setSuccess(null); }} className="hover:opacity-50 transition-opacity">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls - Left 2 Columns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Onboarding / Faucet Section */}
            {!ownedPaymaster && (
               <div className="relative group">
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                 <div className="relative rounded-[2rem] border border-white/20 bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl p-1 overflow-hidden">
                    <OnboardingWizard />
                 </div>
               </div>
            )}

            {/* 2. Deployment / Instance Header */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-8">
               <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {ownedPaymaster ? 'Management Console' : 'Instance Setup'}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${ownedPaymaster ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                    {ownedPaymaster ? 'Active' : 'Not Deployed'}
                  </span>
               </div>

               {!ownedPaymaster ? (
                  <div className="space-y-8">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                        <span className="mr-2">🛠️</span> Configuration Parameters
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">Set the initial staking amount to activate your operator status.</p>
                      
                      <div className="group">
                        <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2 ml-1">Stake Amount (sGT)</label>
                        <div className="flex space-x-3">
                           <input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                          />
                          <button
                            onClick={handleDeploy}
                            disabled={loading || !stakeAmount}
                            className="px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-2"
                          >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            <span>Deploy</span>
                          </button>
                        </div>
                        <p className="mt-3 text-[10px] text-slate-400 font-medium italic">Requirement: Min 30 GToken for AOA registration.</p>
                      </div>
                    </div>
                  </div>
               ) : (
                  <div className="space-y-8">
                     {/* Dashboard Stats */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                           <span className="text-xl font-bold text-green-500 flex items-center">
                             <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                             Operational
                           </span>
                        </div>
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Type</span>
                           <span className="text-xl font-bold text-slate-900 dark:text-white">PaymasterV4</span>
                        </div>
                     </div>

                     {/* Address Card */}
                     <div className="group relative">
                        <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors rounded-2xl" />
                        <div className="relative p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl shadow-inner">
                                📑
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Contract Address</p>
                                <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 break-all">{ownedPaymaster}</p>
                              </div>
                           </div>
                           <div className="flex space-x-2">
                             <button 
                                onClick={() => window.open(`${explorerUrl}/address/${ownedPaymaster}`, '_blank')}
                                className="px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                             >
                               Explorer ↗
                             </button>
                           </div>
                        </div>
                     </div>

                     {/* Funds Management */}
                     <div className="p-8 rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rotate-45" />
                        <h3 className="text-lg font-bold mb-6 flex items-center">
                          <span className="mr-2">🏦</span> Gas Funding
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                           <input
                            type="number"
                            step="0.01"
                            placeholder="Amount in ETH"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-4 font-mono font-bold text-lg outline-none focus:bg-white/10 transition-colors placeholder:text-white/20"
                          />
                          <button
                            onClick={handleDeposit}
                            disabled={loading || !depositAmount}
                            className="bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl px-8 shadow-lg shadow-white/5 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                             {loading ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" /> : null}
                             <span>Deposit Gas</span>
                          </button>
                        </div>
                        <p className="mt-4 text-[10px] text-white/40 font-medium">Deposited ETH will be used to sponsor UserOps on behalf of this paymaster.</p>
                     </div>
                  </div>
               )}
            </div>

            {/* 3. Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="group p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-2xl transition-all border-b-4 border-b-blue-500">
                  <div className="text-3xl mb-4">📖</div>
                  <h3 className="text-xl font-bold mb-2">Documentation</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Master the Paymaster V4 API and integration patterns.</p>
                  <a href="https://docs.aastar.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 font-bold hover:translate-x-1 transition-transform">
                    Read Guide <span>→</span>
                  </a>
               </div>
               <div className="group p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60">
                  <div className="text-3xl mb-4">🧪</div>
                  <h3 className="text-xl font-bold mb-2">Simulator</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Test gasless transactions in a sandbox environment.</p>
                  <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Dev Roadmap</span>
               </div>
            </div>

          </div>

          {/* Sidebar - Right 1 Column */}
          <div className="space-y-8">
            <FaucetCard />
            
            <div className="p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden relative">
               <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl rotate-12">⚙️</div>
               <h3 className="text-lg font-bold mb-4">Instance Settings</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Oracle Price Feed</span>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">AUTO</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Policy Control</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">LIMITED</span>
                  </div>
               </div>
               <button 
                disabled={!ownedPaymaster}
                className="mt-6 w-full py-3 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all text-slate-500 dark:text-slate-400"
                onClick={() => alert('Settings configuration coming soon!')}
               >
                 Advance Configuration
               </button>
            </div>

            <div className="p-8 rounded-[2rem] bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white">
               <h3 className="text-lg font-bold mb-2">Need Help?</h3>
               <p className="text-xs text-white/70 mb-6">Connect with our support team or join the developer discord.</p>
               <button className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-50 transition-colors shadow-lg">
                 Support Center
               </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
