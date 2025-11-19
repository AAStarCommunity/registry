import type { ContractConfig, BatchMethod, ParameterConfig } from '../types/contracts';
import { getCoreContracts, getTokenContracts } from '@aastar/shared-config';
import { MySBTABI } from '@aastar/shared-config';

export class ContractConfigManager {
  private configs: Map<string, ContractConfig> = new Map();
  private network: 'sepolia' = 'sepolia';

  constructor() {
    this.initializePresetConfigs();
  }

  private initializePresetConfigs() {
    // MySBT Configuration
    const core = getCoreContracts(this.network);
    const tokens = getTokenContracts(this.network);

    const mySBTConfig: ContractConfig = {
      id: 'mySBT',
      name: 'MySBT (Soul Bound Token)',
      type: 'SBT',
      address: tokens.mySBT,
      abi: MySBTABI,
      icon: '🎫',
      network: this.network,
      description: 'Soul Bound Token for community identity and reputation',
      chainId: 11155111, // Sepolia
      version: 'v2.3',
      deployedAt: '2024-01-15',

      batchMethods: [
        {
          name: 'mintOrAddMembership',
          displayName: 'Mint SBT for Address',
          parameters: [
            {
              name: 'user',
              type: 'address',
              label: '目标地址 (EOA或合约)',
              required: true,
              isAddress: true,
              placeholder: '0x1234...5678',
              description: '要铸造SBT的目标地址，可以是EOA或合约账户地址'
            },
            {
              name: 'metadata',
              type: 'string',
              label: '元数据',
              required: true,
              defaultValue: '{}',
              placeholder: '{"role": "member", "joined": "2024-01-01"}',
              description: '社区成员元数据，JSON格式'
            }
          ],
          gasEstimate: 150000,
          description: '为指定地址铸造SBT并添加到你的社区（需要目标地址有0.4 GT余额）',
          requiresGTokenCheck: true,
          requiredGTokenAmount: '0.4'
        }
      ],

      defaultParams: {
        meta: '{}',
        metas: ['{}']
      },

      permissions: {
        requireOperator: true,
        requireOwner: false
      }
    };

    // MyNFT Configuration (Example)
    const myNFTConfig: ContractConfig = {
      id: 'myNFT',
      name: 'MyNFT (Regular NFT)',
      type: 'NFT',
      address: '0x1234567890123456789012345678901234567890', // Example address
      abi: [], // Would be populated with actual NFT ABI
      icon: '🖼️',
      network: this.network,
      description: 'Regular NFT for collectibles and digital assets',
      chainId: 11155111,
      version: 'v1.0',

      batchMethods: [
        {
          name: 'mintBatch',
          displayName: 'Batch Mint NFT',
          parameters: [
            {
              name: 'to',
              type: 'address[]',
              label: '接收地址列表',
              required: true,
              isAddress: true,
              isArray: true,
              placeholder: '0x1234...5678,0xabcd...efgh',
              description: '接收 NFT 的用户地址列表'
            },
            {
              name: 'tokenURIs',
              type: 'string[]',
              label: 'Token URI 列表',
              required: true,
              isArray: true,
              placeholder: 'https://api.example.com/metadata/1',
              description: '每个 NFT 的元数据 URI'
            }
          ],
          gasEstimate: 120000,
          description: '批量铸造 NFT 代币'
        }
      ],

      defaultParams: {},

      permissions: {
        requireOperator: true,
        requireOwner: false
      }
    };

    // GToken Configuration (Example)
    const gTokenConfig: ContractConfig = {
      id: 'gToken',
      name: 'GToken (ERC-20)',
      type: 'FT',
      address: core.gToken,
      abi: [], // Would be populated with actual ERC-20 ABI
      icon: '🪙',
      network: this.network,
      description: 'Governance token for the ecosystem',
      chainId: 11155111,
      version: 'v1.0',

      batchMethods: [
        {
          name: 'batchTransfer',
          displayName: 'Batch Transfer GToken',
          parameters: [
            {
              name: 'recipients',
              type: 'address[]',
              label: '接收地址列表',
              required: true,
              isAddress: true,
              isArray: true,
              placeholder: '0x1234...5678,0xabcd...efgh',
              description: '接收 GToken 的用户地址列表'
            },
            {
              name: 'amounts',
              type: 'uint256[]',
              label: '转账金额列表',
              required: true,
              isArray: true,
              placeholder: '100,200,300',
              description: '每个地址对应的转账金额（wei 单位）'
            }
          ],
          gasEstimate: 45000,
          description: '批量转账 GToken 代币'
        }
      ],

      defaultParams: {},

      permissions: {
        requireOperator: false,
        requireOwner: false
      }
    };

    this.configs.set('mySBT', mySBTConfig);
    this.configs.set('myNFT', myNFTConfig);
    this.configs.set('gToken', gTokenConfig);
  }

  // Get all available contracts
  getAllContracts(): ContractConfig[] {
    return Array.from(this.configs.values());
  }

  // Get contract by ID
  getContract(id: string): ContractConfig | undefined {
    return this.configs.get(id);
  }

  // Get contracts by type
  getContractsByType(type: ContractConfig['type']): ContractConfig[] {
    return Array.from(this.configs.values()).filter(config => config.type === type);
  }

  // Add custom contract
  addContract(config: ContractConfig): void {
    this.validateContractConfig(config);
    this.configs.set(config.id, config);
  }

  // Update contract
  updateContract(id: string, updates: Partial<ContractConfig>): boolean {
    const existing = this.configs.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.validateContractConfig(updated);
    this.configs.set(id, updated);
    return true;
  }

  // Remove contract
  removeContract(id: string): boolean {
    return this.configs.delete(id);
  }

  // Get batch method for contract
  getBatchMethod(contractId: string, methodName: string): BatchMethod | undefined {
    const contract = this.getContract(contractId);
    if (!contract) return undefined;

    return contract.batchMethods.find(method => method.name === methodName);
  }

  // Validate contract config
  private validateContractConfig(config: ContractConfig): void {
    if (!config.id || !config.name || !config.address) {
      throw new Error('Contract ID, name, and address are required');
    }

    if (!config.batchMethods || config.batchMethods.length === 0) {
      throw new Error('At least one batch method is required');
    }

    // Validate batch methods
    config.batchMethods.forEach(method => {
      if (!method.name || !method.parameters) {
        throw new Error(`Invalid batch method: ${method.name}`);
      }

      // Validate parameters
      method.parameters.forEach(param => {
        if (!param.name || !param.type || !param.label) {
          throw new Error(`Invalid parameter: ${param.name} in method: ${method.name}`);
        }
      });
    });
  }

  // Get contract type options
  getContractTypeOptions(): { value: ContractConfig['type']; label: string; icon: string }[] {
    return [
      { value: 'SBT', label: 'Soul Bound Token', icon: '🎫' },
      { value: 'NFT', label: 'NFT (ERC-721)', icon: '🖼️' },
      { value: 'FT', label: 'Fungible Token (ERC-20)', icon: '🪙' },
      { value: 'CUSTOM', label: 'Custom Contract', icon: '🎯' }
    ];
  }

  // Export configs to JSON
  exportConfigs(): string {
    const configs = Array.from(this.configs.values());
    return JSON.stringify(configs, null, 2);
  }

  // Import configs from JSON
  importConfigs(jsonString: string): void {
    try {
      const configs: ContractConfig[] = JSON.parse(jsonString);
      configs.forEach(config => {
        this.addContract(config);
      });
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }
}

// Singleton instance
export const contractConfigManager = new ContractConfigManager();