import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner, Network } from 'ethers';
import SafeAppsSDK, { type SafeInfo } from '@safe-global/safe-apps-sdk';

// 支持的网络配置
export const SUPPORTED_NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
  },
  // OP Sepolia（等SDK支持后启用）
  // optimismSepolia: {
  //   chainId: 11155420,
  //   name: 'OP Sepolia',
  //   rpcUrl: 'https://sepolia.optimism.io',
  //   explorer: 'https://sepolia-optimism.etherscan.io',
  // },
} as const;

export type SupportedChainId = (typeof SUPPORTED_NETWORKS)[keyof typeof SUPPORTED_NETWORKS]['chainId'];

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isSafeApp: boolean;
  chainId: number | null;
  network: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner | SafeAppsSDK>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSafeApp, setIsSafeApp] = useState(false);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [network, setNetwork] = useState<string | null>(null);

  // 检测是否在 Safe App 环境
  useEffect(() => {
    const checkSafeApp = async () => {
      try {
        const sdk = new SafeAppsSDK();
        const safe = await sdk.safe.getInfo();
        setIsSafeApp(true);
        setSafeInfo(safe);
        setAddress(safe.safeAddress);
        setChainId(Number(safe.chainId));
        setIsConnected(true);
        
        // 根据 chainId 设置网络名称
        const networkName = getNetworkName(Number(safe.chainId));
        setNetwork(networkName);
      } catch (error) {
        // 不在 Safe 环境，使用普通钱包
        setIsSafeApp(false);
      }
    };

    checkSafeApp();
  }, []);

  // 监听账户和网络变化（仅 EOA）
  useEffect(() => {
    if (isSafeApp || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      } else {
        setAddress(null);
        setIsConnected(false);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      const parsedChainId = parseInt(newChainId, 16);
      setChainId(parsedChainId);
      setNetwork(getNetworkName(parsedChainId));
      // 刷新页面以重新加载合约
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isSafeApp]);

  const getNetworkName = (chainId: number): string => {
    const entry = Object.entries(SUPPORTED_NETWORKS).find(
      ([, config]) => config.chainId === chainId
    );
    return entry ? entry[0] : 'unknown';
  };

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
      const network = await provider.getNetwork();
      
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
      setNetwork(getNetworkName(Number(network.chainId)));
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
      setChainId(null);
      setNetwork(null);
    }
    // Safe App 无法断开连接
  };

  const switchNetwork = async (targetChainId: number) => {
    if (isSafeApp) {
      throw new Error('Cannot switch network in Safe App. Please switch network in Safe UI.');
    }

    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // 如果网络不存在，尝试添加
      if (error.code === 4902) {
        const networkConfig = Object.values(SUPPORTED_NETWORKS).find(
          n => n.chainId === targetChainId
        );
        
        if (networkConfig) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${targetChainId.toString(16)}`,
              chainName: networkConfig.name,
              rpcUrls: [networkConfig.rpcUrl],
              blockExplorerUrls: [networkConfig.explorer],
            }],
          });
        }
      } else {
        throw error;
      }
    }
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
        chainId,
        network,
        connect,
        disconnect,
        switchNetwork,
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
