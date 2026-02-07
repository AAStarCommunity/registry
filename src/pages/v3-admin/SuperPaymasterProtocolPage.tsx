import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useSuperPaymaster } from '../../hooks/useSuperPaymaster';
import { isAddress } from 'viem';
import './SuperPaymasterAdminPage.css'; // Recycle existing styles or create new one

/**
 * SuperPaymaster Protocol Admin Page
 * 
 * Functions:
 * - View/Edit Protocol Fee (setProtocolFee)
 * - View/Edit Treasury Address (setTreasury)
 * - Emergency Pause Operator (setOperatorPaused)
 */
export const SuperPaymasterProtocolPage: React.FC = () => {
    const { isConnected, network } = useWallet();
    const superPaymaster = useSuperPaymaster();

    // State
    const [currentFee, setCurrentFee] = useState<string>('0');
    const [currentTreasury, setCurrentTreasury] = useState<string>('');
    
    // Form State
    const [newFee, setNewFee] = useState('');
    const [newTreasury, setNewTreasury] = useState('');
    const [pauseOperatorAddr, setPauseOperatorAddr] = useState('');
    const [isPaused, setIsPaused] = useState(true);

    const [txHash, setTxHash] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        if (!isConnected) return;
        loadData();
    }, [isConnected, network]);

    const loadData = async () => {
        try {
            const fee = await superPaymaster.getProtocolFee();
            const treasury = await superPaymaster.getTreasury();
            setCurrentFee(fee.toString());
            setCurrentTreasury(treasury);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSetFee = async () => {
        try {
            setSuccessMsg(null);
            setTxHash(null);
            const feeBigInt = BigInt(newFee);
            const hash = await superPaymaster.setProtocolFee(feeBigInt);
            setTxHash(hash);
            setSuccessMsg('Protocol Fee Updated');
            loadData(); // Refresh
        } catch (e) {
            console.error(e);
        }
    };

    const handleSetTreasury = async () => {
        if (!isAddress(newTreasury)) {
            alert('Invalid Address');
            return;
        }
        try {
            setSuccessMsg(null);
            setTxHash(null);
            const hash = await superPaymaster.setTreasury(newTreasury);
            setTxHash(hash);
            setSuccessMsg('Treasury Updated');
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handlePauseOperator = async () => {
        if (!isAddress(pauseOperatorAddr)) {
            alert('Invalid Operator Address');
            return;
        }
        try {
            setSuccessMsg(null);
            setTxHash(null);
            const hash = await superPaymaster.setOperatorPaused(pauseOperatorAddr, isPaused);
            setTxHash(hash);
            setSuccessMsg(`Operator ${isPaused ? 'Paused' : 'Unpaused'}`);
        } catch (e) {
            console.error(e);
        }
    };

    const explorerUrl = network === 'sepolia' 
    ? 'https://sepolia.etherscan.io'
    : 'https://etherscan.io';

    if (!isConnected) {
        return (
          <div className="superpaymaster-admin">
            <div className="connect-prompt">
              <h2>🔌 Connect Wallet</h2>
              <p>Please connect your wallet to access SuperPaymaster Protocol Admin functions.</p>
            </div>
          </div>
        );
    }

    return (
        <div className="superpaymaster-admin">
            <h1>💎 SuperPaymaster Global Config</h1>
            <p className="page-description">
                Manage global parameters for the SuperPaymaster contract. <strong>Owner Only.</strong>
            </p>

            {/* Status Messages */}
            {superPaymaster.error && <p className="error">❌ {superPaymaster.error}</p>}
            {successMsg && <p className="success">✅ {successMsg}</p>}
            {txHash && (
                <p className="tx-link">
                    <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                        View Transaction ↗
                    </a>
                </p>
            )}

            {/* Fee Section */}
            <section className="admin-section">
                <h2>💰 Protocol Fee</h2>
                <div className="status-grid">
                    <div className="status-item">
                        <label>Current Fee (Basis Points)</label>
                        <span className="value monospace">{currentFee}</span>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>New Fee (BPS, e.g. 100 = 1%)</label>
                        <input 
                            type="number" 
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            placeholder="100"
                            disabled={superPaymaster.loading}
                        />
                    </div>
                    <button 
                        className="btn-primary"
                        onClick={handleSetFee}
                        disabled={superPaymaster.loading || !newFee}
                    >
                        Update Fee
                    </button>
                </div>
            </section>

            {/* Treasury Section */}
            <section className="admin-section">
                <h2>🏦 Treasury</h2>
                <div className="status-grid">
                    <div className="status-item">
                        <label>Current Treasury</label>
                        <span className="value monospace">{currentTreasury}</span>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>New Treasury Address</label>
                        <input 
                            type="text" 
                            value={newTreasury}
                            onChange={(e) => setNewTreasury(e.target.value)}
                            placeholder="0x..."
                            disabled={superPaymaster.loading}
                        />
                    </div>
                    <button 
                        className="btn-primary"
                        onClick={handleSetTreasury}
                        disabled={superPaymaster.loading || !newTreasury}
                    >
                        Update Treasury
                    </button>
                </div>
            </section>

            {/* Emergency Pause Section */}
            <section className="admin-section danger-zone">
                <h2>🚨 Emergency Operator Control</h2>
                <p>Pause or unpause a specific operator in SuperPaymaster.</p>
                <div className="form-row">
                    <div className="form-group">
                        <label>Operator Address</label>
                        <input 
                            type="text" 
                            value={pauseOperatorAddr}
                            onChange={(e) => setPauseOperatorAddr(e.target.value)}
                            placeholder="0x..."
                            disabled={superPaymaster.loading}
                        />
                    </div>
                    <div className="form-group">
                        <label>Action</label>
                        <select 
                            value={isPaused ? 'true' : 'false'}
                            onChange={(e) => setIsPaused(e.target.value === 'true')}
                            disabled={superPaymaster.loading}
                        >
                            <option value="true">⛔ PAUSE</option>
                            <option value="false">✅ UNPAUSE</option>
                        </select>
                    </div>
                    <button 
                        className="btn-danger"
                        onClick={handlePauseOperator}
                        disabled={superPaymaster.loading || !pauseOperatorAddr}
                    >
                        Execute
                    </button>
                </div>
            </section>
        </div>
    );
};
