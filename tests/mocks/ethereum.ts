/**
 * Mock Ethereum Provider for Playwright Tests
 *
 * This mock simulates MetaMask's window.ethereum API
 * to enable testing of Web3-dependent components without
 * requiring a real browser extension.
 */

export interface MockEthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, callback: (...args: any[]) => void) => void;
  removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
  isMetaMask: boolean;
  selectedAddress: string | null;
  chainId: string;
}

// Mock account address
const MOCK_ACCOUNT = '0x1234567890123456789012345678901234567890';

// Mock Paymaster contract data
const MOCK_PAYMASTER_DATA = {
  owner: MOCK_ACCOUNT,
  treasury: '0x2345678901234567890123456789012345678901',
  gasToUSDRate: '4500000000000000000000', // 4500 * 10^18
  pntPriceUSD: '20000000000000000', // 0.02 * 10^18
  serviceFeeRate: '200', // 2% in basis points
  maxGasCostCap: '100000000000000000', // 0.1 ETH in wei
  minTokenBalance: '100000000000000000000', // 100 * 10^18
  paused: false,
};

// Mock EntryPoint data
const MOCK_ENTRYPOINT_DATA = {
  balance: '50000000000000000', // 0.05 ETH
  depositInfo: {
    deposit: '50000000000000000',
    staked: true,
    stake: '100000000000000000', // 0.1 ETH
    unstakeDelaySec: 86400, // 1 day
    withdrawTime: 0,
  },
};

// Mock Registry data
const MOCK_REGISTRY_DATA = {
  paymasterStake: '10000000000000000000', // 10 GToken
};

// Mock GToken data
const MOCK_GTOKEN_DATA = {
  balance: '150000000000000000000', // 150 GToken
  allowance: '10000000000000000000', // 10 GToken approved
};

/**
 * Create a mock Ethereum provider
 */
export function createMockEthereum(): MockEthereumProvider {
  const eventListeners: { [key: string]: ((...args: any[]) => void)[] } = {};

  return {
    isMetaMask: true,
    selectedAddress: MOCK_ACCOUNT,
    chainId: '0xaa36a7', // Sepolia testnet

    request: async ({ method, params = [] }) => {
      console.log(`[Mock Ethereum] ${method}`, params);

      switch (method) {
        // Account management
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [MOCK_ACCOUNT];

        case 'eth_chainId':
          return '0xaa36a7'; // Sepolia

        // Network info
        case 'net_version':
          return '11155111'; // Sepolia

        // Balance queries
        case 'eth_getBalance':
          return '0x16345785d8a0000'; // 0.1 ETH in hex

        // Contract calls (eth_call)
        case 'eth_call': {
          const callData = params[0]?.data || '';

          // Decode function selector (first 4 bytes / 8 hex chars after 0x)
          const selector = callData.slice(0, 10);

          // Mock contract responses based on function selector
          switch (selector) {
            // owner()
            case '0x8da5cb5b':
              return '0x000000000000000000000000' + MOCK_PAYMASTER_DATA.owner.slice(2);

            // treasury()
            case '0x61d027b3':
              return '0x000000000000000000000000' + MOCK_PAYMASTER_DATA.treasury.slice(2);

            // gasToUSDRate()
            case '0x3e7a47b2':
              return '0x' + BigInt(MOCK_PAYMASTER_DATA.gasToUSDRate).toString(16).padStart(64, '0');

            // pntPriceUSD()
            case '0x8b7afe2e':
              return '0x' + BigInt(MOCK_PAYMASTER_DATA.pntPriceUSD).toString(16).padStart(64, '0');

            // serviceFeeRate()
            case '0x4c5a628c':
              return '0x' + BigInt(MOCK_PAYMASTER_DATA.serviceFeeRate).toString(16).padStart(64, '0');

            // maxGasCostCap()
            case '0x8e499cb9':
              return '0x' + BigInt(MOCK_PAYMASTER_DATA.maxGasCostCap).toString(16).padStart(64, '0');

            // minTokenBalance()
            case '0xf8b2cb4f':
              return '0x' + BigInt(MOCK_PAYMASTER_DATA.minTokenBalance).toString(16).padStart(64, '0');

            // paused()
            case '0x5c975abb':
              return MOCK_PAYMASTER_DATA.paused ? '0x0000000000000000000000000000000000000000000000000000000000000001' : '0x0000000000000000000000000000000000000000000000000000000000000000';

            // balanceOf(address) - EntryPoint or GToken
            case '0x70a08231':
              return '0x' + BigInt(MOCK_ENTRYPOINT_DATA.balance).toString(16).padStart(64, '0');

            // getDepositInfo(address) - EntryPoint
            case '0x5287ce12':
              // Return struct DepositInfo { uint256 deposit; bool staked; uint112 stake; uint32 unstakeDelaySec; uint48 withdrawTime; }
              // Must encode as ABI tuple properly
              const depositValue = BigInt(MOCK_ENTRYPOINT_DATA.depositInfo.deposit).toString(16).padStart(64, '0');
              const stakedValue = MOCK_ENTRYPOINT_DATA.depositInfo.staked ? '0000000000000000000000000000000000000000000000000000000000000001' : '0000000000000000000000000000000000000000000000000000000000000000';
              const stakeValue = BigInt(MOCK_ENTRYPOINT_DATA.depositInfo.stake).toString(16).padStart(64, '0');
              const unstakeDelayValue = MOCK_ENTRYPOINT_DATA.depositInfo.unstakeDelaySec.toString(16).padStart(64, '0');
              const withdrawTimeValue = MOCK_ENTRYPOINT_DATA.depositInfo.withdrawTime.toString(16).padStart(64, '0');
              return '0x' + depositValue + stakedValue + stakeValue + unstakeDelayValue + withdrawTimeValue;

            // paymasterStakes(address) - Registry
            case '0x9d76ea58':
              return '0x' + BigInt(MOCK_REGISTRY_DATA.paymasterStake).toString(16).padStart(64, '0');

            // allowance(address,address) - GToken
            case '0xdd62ed3e':
              return '0x' + BigInt(MOCK_GTOKEN_DATA.allowance).toString(16).padStart(64, '0');

            // supportedSBTs(address) / supportedGasTokens(address)
            case '0x7c3a00fd':
            case '0x8f283b3f':
              // Return false by default
              return '0x0000000000000000000000000000000000000000000000000000000000000000';

            default:
              console.warn(`[Mock Ethereum] Unknown function selector: ${selector}`);
              return '0x0000000000000000000000000000000000000000000000000000000000000000';
          }
        }

        // Transaction sending
        case 'eth_sendTransaction':
          // Return a mock transaction hash
          return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

        case 'eth_estimateGas':
          return '0x5208'; // 21000 gas

        case 'eth_gasPrice':
          return '0x3b9aca00'; // 1 gwei

        // Transaction receipt
        case 'eth_getTransactionReceipt': {
          const txHash = params[0];
          return {
            transactionHash: txHash,
            blockNumber: '0x123456',
            status: '0x1', // success
            gasUsed: '0x5208',
          };
        }

        // Sign typed data (for EIP-712)
        case 'eth_signTypedData_v4':
          return '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

        default:
          console.warn(`[Mock Ethereum] Unhandled method: ${method}`);
          return null;
      }
    },

    on: (eventName: string, callback: (...args: any[]) => void) => {
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(callback);
    },

    removeListener: (eventName: string, callback: (...args: any[]) => void) => {
      if (eventListeners[eventName]) {
        eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
      }
    },
  };
}

/**
 * Inject the mock Ethereum provider into the page
 * Call this in test.beforeEach() or page.addInitScript()
 */
export function getEthereumMockScript(): string {
  return `
    // Mock Ethereum Provider
    window.ethereum = ${JSON.stringify({
      isMetaMask: true,
      selectedAddress: MOCK_ACCOUNT,
      chainId: '0xaa36a7',
    })};

    window.ethereum.request = async function({ method, params = [] }) {
      const responses = {
        'eth_requestAccounts': ['${MOCK_ACCOUNT}'],
        'eth_accounts': ['${MOCK_ACCOUNT}'],
        'eth_chainId': '0xaa36a7',
        'net_version': '11155111',
        'eth_getBalance': '0x16345785d8a0000',
      };

      // Handle eth_call for contract data
      if (method === 'eth_call') {
        const callData = params[0]?.data || '';
        const selector = callData.slice(0, 10);

        const contractResponses = {
          '0x8da5cb5b': '0x000000000000000000000000${MOCK_PAYMASTER_DATA.owner.slice(2)}',
          '0x61d027b3': '0x000000000000000000000000${MOCK_PAYMASTER_DATA.treasury.slice(2)}',
          '0x3e7a47b2': '0x${BigInt(MOCK_PAYMASTER_DATA.gasToUSDRate).toString(16).padStart(64, '0')}',
          '0x8b7afe2e': '0x${BigInt(MOCK_PAYMASTER_DATA.pntPriceUSD).toString(16).padStart(64, '0')}',
          '0x4c5a628c': '0x${BigInt(MOCK_PAYMASTER_DATA.serviceFeeRate).toString(16).padStart(64, '0')}',
          '0x8e499cb9': '0x${BigInt(MOCK_PAYMASTER_DATA.maxGasCostCap).toString(16).padStart(64, '0')}',
          '0xf8b2cb4f': '0x${BigInt(MOCK_PAYMASTER_DATA.minTokenBalance).toString(16).padStart(64, '0')}',
          '0x5c975abb': '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x70a08231': '0x${BigInt(MOCK_ENTRYPOINT_DATA.balance).toString(16).padStart(64, '0')}',
          '0x5287ce12': '0x${BigInt(MOCK_ENTRYPOINT_DATA.depositInfo.deposit).toString(16).padStart(64, '0')}${MOCK_ENTRYPOINT_DATA.depositInfo.staked ? "0000000000000000000000000000000000000000000000000000000000000001" : "0000000000000000000000000000000000000000000000000000000000000000"}${BigInt(MOCK_ENTRYPOINT_DATA.depositInfo.stake).toString(16).padStart(64, '0')}${MOCK_ENTRYPOINT_DATA.depositInfo.unstakeDelaySec.toString(16).padStart(64, '0')}${MOCK_ENTRYPOINT_DATA.depositInfo.withdrawTime.toString(16).padStart(64, '0')}',
          '0x9d76ea58': '0x${BigInt(MOCK_REGISTRY_DATA.paymasterStake).toString(16).padStart(64, '0')}',
          '0xdd62ed3e': '0x${BigInt(MOCK_GTOKEN_DATA.allowance).toString(16).padStart(64, '0')}',
        };

        return contractResponses[selector] || '0x0000000000000000000000000000000000000000000000000000000000000000';
      }

      if (method === 'eth_sendTransaction') {
        return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      }

      return responses[method] || null;
    };

    window.ethereum.on = function() {};
    window.ethereum.removeListener = function() {};
  `;
}
