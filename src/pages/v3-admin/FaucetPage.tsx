import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { FaucetCard } from '../../components/v3-admin/FaucetCard';
import { Link } from 'react-router-dom';

export const FaucetPage: React.FC = () => {
  const { network } = useWallet();
  const isTestnet = network === 'sepolia' || network === 'op-sepolia';

  if (!isTestnet) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">🚰 Faucet Unavailable</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">
          The faucet is only available on Testnets (Sepolia, OP Sepolia). <br/>
          You are continuously connected to <strong>{network}</strong>.
        </p>
        <Link to="/v3-admin/launch" className="text-blue-600 hover:underline">
          ← Back to Launchpad
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🚰 Testnet Faucet</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Get test assets to experiment with the Registry and Paymaster protocols.
        </p>
      </div>
      
      <FaucetCard />
      
      <div className="mt-8 text-center">
        <Link to="/v3-admin/launch" className="text-blue-600 hover:underline">
          Once you have funds, go to Launchpad →
        </Link>
      </div>
    </div>
  );
};
