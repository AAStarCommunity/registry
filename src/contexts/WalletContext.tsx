import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import SafeAppsSDK, { type SafeInfo } from '@safe-global/safe-apps-sdk';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isSafeApp: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSigner: () => Promise<JsonRpcSigner | SafeAppsSDK>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSafeApp, setIsSafeApp] = useState(false);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);

  // 检测是否在 Safe App 环境
  useEffect(() => {
    const checkSafeApp = async () => {
      try {
        const sdk = new SafeAppsSDK();
        const safe = await sdk.safe.getInfo();
        setIsSafeApp(true);
        setSafeInfo(safe);
        setAddress(safe.safeAddress);
        setIsConnected(true);
      } catch (error) {
        // 不在 Safe 环境，使用普通钱包
        setIsSafeApp(false);
      }
    };

    checkSafeApp();
  }, []);

  const connect = async () => {
    if (isSafeApp) {
      // Safe App 已自动连接
      return;
    }

    // EOA 钱包连接
    if (!window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask.');
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAddress(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnect = () => {
    if (!isSafeApp) {
      setAddress(null);
      setIsConnected(false);
    }
    // Safe App 无法断开连接
  };

  const getSigner = async (): Promise<JsonRpcSigner | SafeAppsSDK> => {
    if (isSafeApp) {
      return new SafeAppsSDK();
    }

    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    const provider = new BrowserProvider(window.ethereum);
    return await provider.getSigner();
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isSafeApp,
        connect,
        disconnect,
        getSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
