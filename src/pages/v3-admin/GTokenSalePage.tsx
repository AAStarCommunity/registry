import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useGTokenSale } from '../../hooks/useGTokenSale';
import { getNetworkConfig } from '../../config/networkConfig';
import { parseUnits, formatUnits, type Address } from 'viem';
import './GTokenSalePage.css';

type PurchaseMethod = 'ETH' | 'USDT' | 'USDC';

export const GTokenSalePage: React.FC = () => {
  const { address, isConnected, network, switchNetwork } = useWallet();
  const { buyGTokenFor, buyWithToken, stats, isLoading, SALE_CONTRACT_ADDRESS } = useGTokenSale();
  const config = getNetworkConfig(network || 'sepolia');

  const [method, setMethod] = useState<PurchaseMethod>('ETH');
  const [amount, setAmount] = useState('0.1');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Constants
  const RATE = 2000; // 1 ETH = 2000 GToken (Mock)
  const USDT_RATE = 0.5; // 1 USDT = 0.5 GToken (Mock)

  const estimatedGToken = () => {
    const val = parseFloat(amount || '0');
    if (method === 'ETH') return (val * RATE).toFixed(2);
    return (val * USDT_RATE).toFixed(2);
  };

  const handlePurchase = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setError(null);
    setTxHash(null);

    try {
      let hash;
      if (method === 'ETH') {
        hash = await buyGTokenFor({
          recipient: address as Address,
          ethAmount: amount
        });
      } else {
        // Enforce Optimism for USDT/USDC
        if (network !== 'op-sepolia' && network !== 'optimism') {
          setError('USDT/USDC purchases are only available on Optimism Network.');
          return;
        }
        
        const tokenAddr = method === 'USDT' ? config.contracts.usdtContract : config.contracts.usdtContract; // Mock using same contract for simplicity if USDC undefined
        hash = await buyWithToken({
          tokenAddress: tokenAddr as Address,
          amount: amount,
          recipient: address as Address
        });
      }
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    }
  };

  const checkNetworkForStablecoins = () => {
    if (method !== 'ETH' && network !== 'op-sepolia' && network !== 'optimism') {
      return (
        <div className="error-msg">
          <p>⚠️ USDT/USDC purchases require Optimism Network.</p>
          <button 
            className="btn-sm btn-outline" 
            style={{marginTop: '0.5rem'}}
            onClick={() => switchNetwork('op-sepolia')}
          >
            Switch to OP Sepolia
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="gtoken-market">
      <div className="market-header">
        <h1>🛒 GToken Market</h1>
        <p className="page-description">Acquire Governance Tokens for operator staking and participation.</p>
        
        <div className="contract-address" onClick={() => navigator.clipboard.writeText(SALE_CONTRACT_ADDRESS)}>
          <span>Contract:</span>
          <span>{SALE_CONTRACT_ADDRESS.substring(0, 6)}...{SALE_CONTRACT_ADDRESS.substring(38)}</span>
          <span style={{opacity: 0.5}}>📋</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>Current Price</h3>
          <div className="stat-value">{stats?.price || '...'}</div>
          <div className="stat-sub">1 ETH = {RATE} sGT</div>
        </div>
        <div className="stat-card">
          <h3>Total Supply</h3>
          <div className="stat-value">{stats?.totalSupply || '...'}</div>
          <div className="stat-sub">Cap: 21,000,000</div>
        </div>
        <div className="stat-card">
          <h3>Circulating</h3>
          <div className="stat-value">{stats?.circulatingSupply || '...'}</div>
          <div className="stat-sub">Burned: 1.2%</div>
        </div>
      </div>

      <div className="market-content">
        {/* Purchase Card */}
        <div className="purchase-card">
          <h2>Purchase GToken</h2>
          
          <div className="purchase-tabs">
            <button 
              className={`purchase-tab ${method === 'ETH' ? 'active' : ''}`}
              onClick={() => setMethod('ETH')}
            >
              Pay with ETH
            </button>
            <button 
              className={`purchase-tab ${method === 'USDT' ? 'active' : ''}`}
              onClick={() => setMethod('USDT')}
            >
              Pay with USDT (OP)
            </button>
             <button 
              className={`purchase-tab ${method === 'USDC' ? 'active' : ''}`}
              onClick={() => setMethod('USDC')}
            >
              Pay with USDC (OP)
            </button>
          </div>

          {method === 'ETH' ? (
             <p className="text-sm text-slate-500 mb-4">You are paying with <strong>Sepolia ETH</strong>.</p>
          ) : (
             <p className="text-sm text-slate-500 mb-4">Paying with <strong>{method}</strong> on Optimism.</p>
          )}

          {checkNetworkForStablecoins()}

          <div className="token-input-group">
            <label>You Pay</label>
            <div className="input-wrapper">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0" 
              />
              <span className="token-symbol">{method}</span>
            </div>
          </div>

          <div className="exchange-arrow">↓</div>

          <div className="token-input-group">
            <label>You Receive (Estimated)</label>
            <div className="input-wrapper">
              <input 
                type="text" 
                value={estimatedGToken()} 
                readOnly 
                disabled 
              />
              <span className="token-symbol">sGT</span>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {txHash && (
            <div className="success-msg">
              <p>✅ Purchase Successful!</p>
              <a 
                href={`${config.explorerUrl}/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{textDecoration: 'underline', fontWeight: 'bold'}}
              >
                View Transaction ↗
              </a>
            </div>
          )}

          <button 
            className="btn-purchase" 
            onClick={handlePurchase}
            disabled={isLoading || !isConnected}
          >
            {isLoading ? 'Processing...' : 'Buy GToken Now'}
          </button>
        </div>

        {/* Info Panel */}
        <div className="info-panel">
          <div className="info-card">
            <h4>💡 How it works</h4>
            <ul className="info-list">
              <li>GToken is the governance token of the AAStar Protocol.</li>
              <li>Limited issuance of <strong>21,000,000</strong> tokens.</li>
              <li>Required for Paymaster staking and Registry role management.</li>
            </ul>
          </div>

          <div className="info-card">
             <h4>ℹ️ Notice</h4>
             <ul className="info-list">
               <li><strong>Deflationary:</strong> New member joins trigger a small burn mechanism.</li>
               <li><strong>Lock-up:</strong> SBT and GToken are staked and locked together.</li>
               <li><strong>Refund:</strong> Burning your SBT (exiting) allows a partial refund of staked GTokens.</li>
             </ul>
          </div>

          <div className="info-card highlight-box">
            <h4>🎁 Gift for a Friend?</h4>
            <p>You can purchase GTokens for any address. The tokens will be sent directly to their wallet.</p>
            {/* Extended feature for future: Add Recipient Input */}
          </div>
        </div>
      </div>
    </div>
  );
};
