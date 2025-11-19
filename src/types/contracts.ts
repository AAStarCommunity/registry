export interface ParameterConfig {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  validation?: RegExp;
  defaultValue?: any;
  isAddress?: boolean;
  isArray?: boolean;
  description?: string;
}

export interface BatchMethod {
  name: string;
  displayName: string;
  parameters: ParameterConfig[];
  gasEstimate: number; // gas per item
  description: string;
  requiresGTokenCheck?: boolean; // 是否需要检查GToken余额
  requiredGTokenAmount?: string; // 需要的GToken数量（如"0.4"）
}

export interface ContractConfig {
  id: string;
  name: string;
  type: 'SBT' | 'NFT' | 'FT' | 'CUSTOM';
  address: string;
  abi: any[];
  icon: string;
  network: string;
  description: string;

  // Batch operations
  batchMethods: BatchMethod[];

  // Default parameters
  defaultParams: {
    [key: string]: any;
  };

  // Permission requirements
  permissions: {
    requireOperator: boolean;
    requireOwner: boolean;
  };

  // Metadata
  chainId: number;
  version?: string;
  deployedAt?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  address: string;
  error?: string;
  hasSBT?: boolean;
  hasNFT?: boolean;
  balance?: string;
}

export interface BatchOperationConfig {
  contractId: string;
  method: string;
  parameters: {
    [key: string]: any;
  };
  addresses: string[];
  estimatedGas: number;
  estimatedCost: {
    eth: string;
    usd: string;
  };
}

export interface GasEstimate {
  gasPerItem: number;
  totalGas: number;
  gasPrice: {
    gwei: string;
    wei: string;
  };
  estimatedCost: {
    eth: string;
    usd: string;
  };
  ethPrice: number;
}