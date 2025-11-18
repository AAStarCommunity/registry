import { ethers } from 'ethers';

export interface OperationLog {
  id: string;
  timestamp: Date;
  operator: string;
  operation: 'batch_mint' | 'single_mint' | 'contract_config' | 'permission_check';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  contractAddress: string;
  contractName: string;
  method: string;
  targetAddresses: string[];
  parameters: { [key: string]: any };
  gasEstimate?: {
    totalGas: number;
    totalCost: string;
    gasPrice: string;
  };
  executionResult?: {
    txHash?: string;
    successCount: number;
    failCount: number;
    totalGasUsed: number;
    totalCost: string;
    errors: string[];
  };
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  confirmationSteps: string[];
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface OperationFilter {
  operator?: string;
  operation?: string;
  status?: string;
  contractAddress?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class OperationLogService {
  private static instance: OperationLogService;
  private logs: OperationLog[] = [];
  private readonly STORAGE_KEY = 'batch_operation_logs';

  private constructor() {
    this.loadLogs();
  }

  public static getInstance(): OperationLogService {
    if (!OperationLogService.instance) {
      OperationLogService.instance = new OperationLogService();
    }
    return OperationLogService.instance;
  }

  // Log a new operation
  public logOperation(operation: Omit<OperationLog, 'id' | 'timestamp'>): string {
    const log: OperationLog = {
      ...operation,
      id: this.generateLogId(),
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.logs.unshift(log);
    this.saveLogs();

    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    return log.id;
  }

  // Update operation status and results
  public updateOperation(
    id: string,
    updates: Partial<Pick<OperationLog, 'status' | 'executionResult' | 'notes'>>
  ): boolean {
    const index = this.logs.findIndex(log => log.id === id);
    if (index === -1) return false;

    this.logs[index] = { ...this.logs[index], ...updates };
    this.saveLogs();
    return true;
  }

  // Get logs with filtering
  public getLogs(filter: OperationFilter = {}): OperationLog[] {
    let filteredLogs = [...this.logs];

    if (filter.operator) {
      filteredLogs = filteredLogs.filter(log =>
        log.operator.toLowerCase() === filter.operator!.toLowerCase()
      );
    }

    if (filter.operation) {
      filteredLogs = filteredLogs.filter(log => log.operation === filter.operation);
    }

    if (filter.status) {
      filteredLogs = filteredLogs.filter(log => log.status === filter.status);
    }

    if (filter.contractAddress) {
      filteredLogs = filteredLogs.filter(log =>
        log.contractAddress.toLowerCase() === filter.contractAddress!.toLowerCase()
      );
    }

    if (filter.dateFrom) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.dateTo!);
    }

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    filteredLogs = filteredLogs.slice(offset, offset + limit);

    return filteredLogs;
  }

  // Get operation statistics
  public getStatistics(operator?: string): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalAddressesProcessed: number;
    totalGasUsed: number;
    totalCost: string;
    operationCounts: { [key: string]: number };
    recentActivity: OperationLog[];
  } {
    const logs = operator ? this.getLogs({ operator }) : this.logs;

    const stats = {
      totalOperations: logs.length,
      successfulOperations: logs.filter(log => log.status === 'completed').length,
      failedOperations: logs.filter(log => log.status === 'failed').length,
      totalAddressesProcessed: logs.reduce((sum, log) => sum + log.targetAddresses.length, 0),
      totalGasUsed: logs.reduce((sum, log) => sum + (log.executionResult?.totalGasUsed || 0), 0),
      totalCost: logs.reduce((sum, log) => {
        const cost = log.executionResult?.totalCost || '0';
        return (BigInt(ethers.parseEther(sum)) + BigInt(ethers.parseEther(cost))).toString();
      }, '0'),
      operationCounts: {} as { [key: string]: number },
      recentActivity: logs.slice(0, 10)
    };

    // Count operation types
    logs.forEach(log => {
      stats.operationCounts[log.operation] = (stats.operationCounts[log.operation] || 0) + 1;
    });

    stats.totalCost = ethers.formatEther(stats.totalCost);

    return stats;
  }

  // Export logs to CSV
  public exportToCSV(filter: OperationFilter = {}): string {
    const logs = this.getLogs(filter);

    const headers = [
      'ID', 'Timestamp', 'Operator', 'Operation', 'Status', 'Contract Address',
      'Contract Name', 'Method', 'Target Count', 'Gas Estimate', 'Actual Gas Used',
      'Total Cost', 'TX Hash', 'Success Rate', 'Security Level'
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.operator,
      log.operation,
      log.status,
      log.contractAddress,
      log.contractName,
      log.method,
      log.targetAddresses.length,
      log.gasEstimate?.totalGas || '',
      log.executionResult?.totalGasUsed || '',
      log.executionResult?.totalCost || '',
      log.executionResult?.txHash || '',
      log.executionResult ?
        `${log.executionResult.successCount}/${log.targetAddresses.length}` : '',
      log.securityLevel
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  // Clear old logs (keep last N days)
  public clearOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    this.saveLogs();

    return initialCount - this.logs.length;
  }

  // Get security analysis
  public getSecurityAnalysis(operator?: string): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    unusualActivity: string[];
    recommendations: string[];
    recentFailedOperations: OperationLog[];
  } {
    const logs = operator ? this.getLogs({ operator }) : this.logs.slice(0, 100); // Last 100 operations
    const failedOperations = logs.filter(log => log.status === 'failed').slice(0, 10);
    const unusualActivity: string[] = [];
    const recommendations: string[] = [];

    // Analyze failure rate
    const failureRate = failedOperations.length / Math.max(logs.length, 1);
    if (failureRate > 0.2) {
      unusualActivity.push(`高失败率: ${(failureRate * 100).toFixed(1)}%`);
      recommendations.push('检查网络连接和 Gas 费用设置');
    }

    // Analyze large batch operations
    const largeBatches = logs.filter(log => log.targetAddresses.length > 50);
    if (largeBatches.length > 0) {
      unusualActivity.push(`${largeBatches.length} 个大批量操作 (>50 地址)`);
      recommendations.push('考虑将大批量操作分解为小批次');
    }

    // Analyze high cost operations
    const highCostOps = logs.filter(log =>
      parseFloat(log.executionResult?.totalCost || '0') > 0.1
    );
    if (highCostOps.length > 0) {
      unusualActivity.push(`${highCostOps.length} 个高成本操作 (>0.1 ETH)`);
      recommendations.push('监控 Gas 费用，考虑在 Gas 价格较低时操作');
    }

    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (failureRate > 0.3 || highCostOps.length > 5) {
      riskLevel = 'critical';
    } else if (failureRate > 0.15 || largeBatches.length > 3) {
      riskLevel = 'high';
    } else if (failureRate > 0.05 || largeBatches.length > 0) {
      riskLevel = 'medium';
    }

    return {
      riskLevel,
      unusualActivity,
      recommendations,
      recentFailedOperations: failedOperations
    };
  }

  // Private methods
  private generateLogId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(): string {
    // In a real implementation, this would get the client IP from server
    // For now, return a placeholder
    return 'client_ip_placeholder';
  }

  private saveLogs(): void {
    try {
      const serializedLogs = this.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializedLogs));
    } catch (error) {
      console.error('Failed to save operation logs:', error);
    }
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load operation logs:', error);
      this.logs = [];
    }
  }
}

// Export singleton instance
export const operationLogService = OperationLogService.getInstance();