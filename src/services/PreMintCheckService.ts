/**
 * Pre-Mint Check Service
 * Validates all requirements before executing batch mint
 */

import { ethers } from 'ethers';
import { getCoreContracts, MySBTABI, RegistryABI, CORE_ADDRESSES } from '@aastar/shared-config';
import { getRpcUrl } from '../config/rpc';

// Get GToken address from shared-config
const GTOKEN_ADDRESS = CORE_ADDRESSES.gToken;

export interface CheckResult {
  passed: boolean;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  details?: string;
}

export interface PreMintCheckResults {
  allPassed: boolean;
  checks: CheckResult[];
  summary: {
    critical: number;
    warnings: number;
    passed: number;
  };
}

export interface AddressMintStatus {
  address: string;
  hasSBT: boolean;
  sbtBalance: number;
  tokenIds: string[];
  gtokenBalance: string;
  hasEnoughGToken: boolean;
  gtokenAllowance: string;
  hasEnoughAllowance: boolean;
}

export class PreMintCheckService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(getRpcUrl());
  }

  /**
   * Check if addresses already have SBT
   */
  async checkAddressesSBTStatus(
    addresses: string[],
    contractAddress: string,
    abi: any[]
  ): Promise<AddressMintStatus[]> {
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    const results: AddressMintStatus[] = [];

    // Get GToken contract for balance and allowance checks
    const gtokenContract = new ethers.Contract(
      GTOKEN_ADDRESS,
      [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ],
      this.provider
    );

    // Try to get decimals, fallback to 18 if it fails
    let decimals = 18;
    try {
      decimals = await gtokenContract.decimals();
    } catch (error) {
      console.warn('[GToken] Failed to get decimals, using default 18:', error);
    }

    for (const address of addresses) {
      try {
        // Check SBT balance
        const balance = await contract.balanceOf(address);
        const hasSBT = balance > 0n;

        // Get token IDs if has SBT
        const tokenIds: string[] = [];
        if (hasSBT) {
          try {
            // Try to enumerate tokens
            for (let i = 0; i < Number(balance); i++) {
              const tokenId = await contract.tokenOfOwnerByIndex(address, i);
              tokenIds.push(tokenId.toString());
            }
          } catch (e) {
            // Token enumeration not supported
          }
        }

        // Check GToken balance
        let gtBalanceFormatted = '0';
        let hasEnoughGToken = false;
        try {
          const gtBalance = await gtokenContract.balanceOf(address);
          gtBalanceFormatted = ethers.formatUnits(gtBalance, decimals);
          hasEnoughGToken = Number(gtBalanceFormatted) >= 0.4;
        } catch (error) {
          console.warn(`[GToken] Failed to check balance for ${address}:`, error);
        }

        // Check GToken allowance to MySBT contract
        let gtAllowanceFormatted = '0';
        let hasEnoughAllowance = false;
        try {
          const allowance = await gtokenContract.allowance(address, contractAddress);
          gtAllowanceFormatted = ethers.formatUnits(allowance, decimals);
          hasEnoughAllowance = Number(gtAllowanceFormatted) >= 0.4; // mintFee (0.1) + minLockAmount (0.3)
        } catch (error) {
          console.warn(`[GToken] Failed to check allowance for ${address}:`, error);
        }

        results.push({
          address,
          hasSBT,
          sbtBalance: Number(balance),
          tokenIds,
          gtokenBalance: gtBalanceFormatted,
          hasEnoughGToken,
          gtokenAllowance: gtAllowanceFormatted,
          hasEnoughAllowance
        });
      } catch (error) {
        console.error(`Failed to check status for ${address}:`, error);
        results.push({
          address,
          hasSBT: false,
          sbtBalance: 0,
          tokenIds: [],
          gtokenBalance: '0',
          hasEnoughGToken: false,
          gtokenAllowance: '0',
          hasEnoughAllowance: false
        });
      }
    }

    return results;
  }

  /**
   * Check if operator's community is properly registered
   */
  async checkCommunityRegistration(operatorAddress: string): Promise<CheckResult> {
    try {
      const core = getCoreContracts('sepolia');
      const registry = new ethers.Contract(core.registry, RegistryABI, this.provider);

      const isRegistered = await registry.isRegisteredCommunity(operatorAddress);

      if (!isRegistered) {
        return {
          passed: false,
          title: '社区未注册',
          description: '当前账户未在 Registry 中注册为社区',
          severity: 'critical',
          details: '需要先注册社区才能执行批量铸造操作'
        };
      }

      const profile = await registry.getCommunityProfile(operatorAddress);
      if (!profile.isActive) {
        return {
          passed: false,
          title: '社区未激活',
          description: '社区已注册但处于未激活状态',
          severity: 'critical',
          details: '请联系管理员激活社区'
        };
      }

      return {
        passed: true,
        title: '社区注册验证',
        description: `社区 "${profile.name}" 已注册并激活`,
        severity: 'info',
        details: `节点类型: ${['PAYMASTER_AOA', 'PAYMASTER_SUPER', 'ANODE', 'KMS'][Number(profile.nodeType)]}`
      };
    } catch (error: any) {
      return {
        passed: false,
        title: '社区注册检查失败',
        description: '无法验证社区注册状态',
        severity: 'critical',
        details: error.message
      };
    }
  }

  /**
   * Check operator's GToken balance
   */
  async checkOperatorGTokenBalance(operatorAddress: string): Promise<CheckResult> {
    try {
      const gtokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.provider
      );

      // Try to get decimals, fallback to 18 if it fails
      let decimals = 18;
      try {
        decimals = await gtokenContract.decimals();
      } catch (error) {
        console.warn('[GToken] Failed to get decimals, using default 18:', error);
      }

      const balance = await gtokenContract.balanceOf(operatorAddress);
      const balanceFormatted = ethers.formatUnits(balance, decimals);

      if (Number(balanceFormatted) < 1) {
        return {
          passed: false,
          title: 'GToken 余额不足',
          description: `当前余额: ${balanceFormatted} GT`,
          severity: 'warning',
          details: '建议至少持有 1 GT 以支付 Gas 费用'
        };
      }

      return {
        passed: true,
        title: 'Operator GToken 余额',
        description: `余额充足: ${Number(balanceFormatted).toFixed(2)} GT`,
        severity: 'info'
      };
    } catch (error: any) {
      return {
        passed: false,
        title: 'GToken 余额检查失败',
        description: '无法获取 GToken 余额',
        severity: 'warning',
        details: error.message
      };
    }
  }

  /**
   * Run all pre-mint checks
   */
  async runPreMintChecks(
    operatorAddress: string,
    addresses: string[],
    contractAddress: string,
    contractABI: any[]
  ): Promise<PreMintCheckResults> {
    const checks: CheckResult[] = [];

    // 1. Check community registration
    const communityCheck = await this.checkCommunityRegistration(operatorAddress);
    checks.push(communityCheck);

    // 2. Check operator GToken balance
    const operatorGTokenCheck = await this.checkOperatorGTokenBalance(operatorAddress);
    checks.push(operatorGTokenCheck);

    // 3. Check target addresses SBT status
    const addressStatuses = await this.checkAddressesSBTStatus(addresses, contractAddress, contractABI);

    // Add check for addresses that already have SBT
    const addressesWithSBT = addressStatuses.filter(s => s.hasSBT);
    if (addressesWithSBT.length > 0) {
      checks.push({
        passed: false,
        title: '部分地址已有 SBT',
        description: `${addressesWithSBT.length} 个地址已经铸造过 SBT`,
        severity: 'critical',
        details: addressesWithSBT.map(s =>
          `${s.address.slice(0, 8)}...${s.address.slice(-6)} (拥有 ${s.sbtBalance} 个 SBT)`
        ).join('\n')
      });
    } else {
      checks.push({
        passed: true,
        title: 'SBT 状态检查',
        description: '所有目标地址均未铸造 SBT',
        severity: 'info'
      });
    }

    // 4. Check target addresses GToken balance
    const addressesWithoutEnoughGToken = addressStatuses.filter(s => !s.hasEnoughGToken);
    if (addressesWithoutEnoughGToken.length > 0) {
      checks.push({
        passed: false,
        title: '部分地址 GToken 不足',
        description: `${addressesWithoutEnoughGToken.length} 个地址 GToken 余额 < 0.4 GT`,
        severity: 'critical',
        details: addressesWithoutEnoughGToken.map(s =>
          `${s.address.slice(0, 8)}...${s.address.slice(-6)} (余额: ${Number(s.gtokenBalance).toFixed(2)} GT)`
        ).join('\n')
      });
    } else {
      checks.push({
        passed: true,
        title: 'GToken 余额检查',
        description: '所有目标地址 GToken 余额充足 (≥ 0.4 GT)',
        severity: 'info'
      });
    }

    // 5. Check target addresses GToken allowance to MySBT contract
    const addressesWithoutEnoughAllowance = addressStatuses.filter(s => !s.hasEnoughAllowance);
    if (addressesWithoutEnoughAllowance.length > 0) {
      checks.push({
        passed: false,
        title: '部分地址未授权 GToken',
        description: `${addressesWithoutEnoughAllowance.length} 个地址未授权 GToken 给 MySBT 合约`,
        severity: 'critical',
        details: addressesWithoutEnoughAllowance.map(s =>
          `${s.address.slice(0, 8)}...${s.address.slice(-6)} (授权额度: ${Number(s.gtokenAllowance).toFixed(2)} GT, 需要: 0.4 GT)\n` +
          `需要先执行: GToken.approve("${contractAddress}", "0.4 GT")`
        ).join('\n\n')
      });
    } else {
      checks.push({
        passed: true,
        title: 'GToken 授权检查',
        description: '所有目标地址已授权足够的 GToken (≥ 0.4 GT)',
        severity: 'info'
      });
    }

    // Calculate summary
    const critical = checks.filter(c => !c.passed && c.severity === 'critical').length;
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;
    const passed = checks.filter(c => c.passed).length;

    return {
      allPassed: critical === 0,
      checks,
      summary: { critical, warnings, passed }
    };
  }

  /**
   * Run pre-checks for Airdrop mode (Operator-paid)
   * Only checks operator, not target addresses
   */
  async runAirdropPreChecks(
    operatorAddress: string,
    addresses: string[],
    contractAddress: string
  ): Promise<PreMintCheckResults> {
    const checks: CheckResult[] = [];

    // 1. Check community registration
    const communityCheck = await this.checkCommunityRegistration(operatorAddress);
    checks.push(communityCheck);

    // 2. Check operator GToken balance (needs 0.4 GT × number of addresses)
    const requiredGToken = addresses.length * 0.4;
    try {
      const gtokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.provider
      );

      let decimals = 18;
      try {
        decimals = await gtokenContract.decimals();
      } catch (error) {
        console.warn('[GToken] Failed to get decimals, using default 18:', error);
      }

      const balance = await gtokenContract.balanceOf(operatorAddress);
      const balanceFormatted = ethers.formatUnits(balance, decimals);
      const hasEnough = Number(balanceFormatted) >= requiredGToken;

      if (!hasEnough) {
        checks.push({
          passed: false,
          title: 'Operator GToken 余额不足',
          description: `需要 ${requiredGToken.toFixed(1)} GT，当前余额 ${Number(balanceFormatted).toFixed(2)} GT`,
          severity: 'critical',
          details: `空投模式需要 Operator 支付所有费用 (0.4 GT × ${addresses.length} 地址)`
        });
      } else {
        checks.push({
          passed: true,
          title: 'Operator GToken 余额',
          description: `余额充足: ${Number(balanceFormatted).toFixed(2)} GT (需要: ${requiredGToken.toFixed(1)} GT)`,
          severity: 'info'
        });
      }
    } catch (error: any) {
      checks.push({
        passed: false,
        title: 'GToken 余额检查失败',
        description: '无法获取 Operator GToken 余额',
        severity: 'critical',
        details: error.message
      });
    }

    // 3. Check if target addresses already have SBT
    try {
      const contract = new ethers.Contract(contractAddress, MySBTABI, this.provider);
      const addressStatuses: { address: string; hasSBT: boolean }[] = [];

      for (const address of addresses) {
        try {
          const balance = await contract.balanceOf(address);
          addressStatuses.push({
            address,
            hasSBT: balance > 0n
          });
        } catch (error) {
          console.error(`Failed to check SBT status for ${address}:`, error);
        }
      }

      const addressesWithSBT = addressStatuses.filter(s => s.hasSBT);
      if (addressesWithSBT.length > 0) {
        checks.push({
          passed: false,
          title: '部分地址已有 SBT',
          description: `${addressesWithSBT.length} 个地址已经铸造过 SBT`,
          severity: 'warning',
          details: addressesWithSBT.map(s =>
            `${s.address.slice(0, 8)}...${s.address.slice(-6)}`
          ).join('\n') + '\n\n注意：已有 SBT 的地址将添加社区成员资格（不收费）'
        });
      } else {
        checks.push({
          passed: true,
          title: 'SBT 状态检查',
          description: '所有目标地址均未铸造 SBT',
          severity: 'info'
        });
      }
    } catch (error: any) {
      checks.push({
        passed: false,
        title: 'SBT 状态检查失败',
        description: '无法验证目标地址 SBT 状态',
        severity: 'warning',
        details: error.message
      });
    }

    // Calculate summary
    const critical = checks.filter(c => !c.passed && c.severity === 'critical').length;
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;
    const passed = checks.filter(c => c.passed).length;

    return {
      allPassed: critical === 0,
      checks,
      summary: { critical, warnings, passed }
    };
  }
}
