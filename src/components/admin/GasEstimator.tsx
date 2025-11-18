import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import type { ContractConfig, BatchMethod } from '../../types/contracts';

interface GasEstimatorProps {
  contractConfig: ContractConfig;
  selectedMethod: BatchMethod;
  addresses: string[];
  parameters: { [key: string]: any };
  onEstimateUpdate?: (estimate: GasEstimate) => void;
}

interface GasEstimate {
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

export const GasEstimator: React.FC<GasEstimatorProps> = ({
  contractConfig,
  selectedMethod,
  addresses,
  parameters,
  onEstimateUpdate
}) => {
  const [estimate, setEstimate] = useState<GasEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current gas price
  const getGasPrice = async (): Promise<{ gwei: string; wei: string }> => {
    try {
      // For demo purposes, use a fallback gas price
      // In production, you would get this from the network
      const fallbackGasPrice = '20000000000'; // 20 gwei in wei

      return {
        gwei: ethers.formatUnits(fallbackGasPrice, 'gwei'),
        wei: fallbackGasPrice.toString()
      };
    } catch (err) {
      console.error('Failed to get gas price:', err);
      throw new Error('Failed to get gas price');
    }
  };

  // Get ETH price in USD
  const getEthPrice = async (): Promise<number> => {
    try {
      // For demo purposes, use a fallback ETH price
      // In production, you would get this from a price API
      return 3500; // $3500 per ETH
    } catch (err) {
      console.error('Failed to get ETH price:', err);
      return 3500; // Fallback price
    }
  };

  // Calculate gas estimate
  const calculateGasEstimate = async () => {
    if (!selectedMethod || addresses.length === 0) {
      setEstimate(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get gas price
      const gasPrice = await getGasPrice();
      const ethPrice = await getEthPrice();

      // Calculate gas per item (base + parameters overhead)
      let gasPerItem = selectedMethod.gasEstimate;

      // Add overhead for array parameters
      selectedMethod.parameters.forEach(param => {
        if (param.isArray && parameters[param.name]) {
          const arrayLength = Array.isArray(parameters[param.name])
            ? parameters[param.name].length
            : 1;
          gasPerItem += arrayLength * 5000; // 5000 gas per array item
        }
      });

      // Calculate total gas
      const totalGas = gasPerItem * addresses.length;

      // Calculate costs
      const totalCostWei = BigInt(totalGas) * BigInt(gasPrice.wei);
      const totalCostEth = Number(ethers.formatEther(totalCostWei));
      const totalCostUSD = totalCostEth * ethPrice;

      const newEstimate: GasEstimate = {
        gasPerItem,
        totalGas,
        gasPrice,
        estimatedCost: {
          eth: totalCostEth.toFixed(6),
          usd: totalCostUSD.toFixed(2)
        },
        ethPrice
      };

      setEstimate(newEstimate);
      onEstimateUpdate?.(newEstimate);

    } catch (err: any) {
      console.error('Gas estimation failed:', err);
      setError(err.message || 'Failed to estimate gas');
    } finally {
      setIsLoading(false);
    }
  };

  // Recalculate when inputs change
  useEffect(() => {
    calculateGasEstimate();
  }, [contractConfig, selectedMethod, addresses.length, parameters]);

  if (!selectedMethod || addresses.length === 0) {
    return (
      <div className="gas-estimator empty">
        <h3>⛽ Gas 费预估</h3>
        <p>选择合约和方法，并输入地址后查看 Gas 费预估</p>
      </div>
    );
  }

  return (
    <div className="gas-estimator">
      <div className="estimator-header">
        <h3>⛽ Gas 费预估</h3>
        <div className="estimator-info">
          <span className="method-info">{selectedMethod.displayName}</span>
          <span className="address-count">{addresses.length} 个地址</span>
        </div>
      </div>

      {isLoading && (
        <div className="estimation-loading">
          <div className="spinner"></div>
          <span>计算 Gas 费用中...</span>
        </div>
      )}

      {error && (
        <div className="estimation-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {estimate && !isLoading && !error && (
        <div className="estimation-results">
          <div className="results-grid">
            <div className="result-card primary">
              <div className="card-header">
                <span className="card-title">总费用估算</span>
                <span className="eth-price">ETH: ${estimate.ethPrice.toLocaleString()}</span>
              </div>
              <div className="cost-display">
                <div className="cost-main">
                  <span className="cost-value">{estimate.estimatedCost.eth}</span>
                  <span className="cost-unit">ETH</span>
                </div>
                <div className="cost-secondary">
                  ≈ ${estimate.estimatedCost.usd} USD
                </div>
              </div>
            </div>

            <div className="result-card secondary">
              <div className="card-header">
                <span className="card-title">Gas 详情</span>
              </div>
              <div className="gas-details">
                <div className="gas-item">
                  <span className="gas-label">Gas 价格:</span>
                  <span className="gas-value">{estimate.gasPrice.gwei} Gwei</span>
                </div>
                <div className="gas-item">
                  <span className="gas-label">每个地址:</span>
                  <span className="gas-value">{estimate.gasPerItem.toLocaleString()} gas</span>
                </div>
                <div className="gas-item">
                  <span className="gas-label">总 Gas:</span>
                  <span className="gas-value">{estimate.totalGas.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="cost-breakdown">
            <h4>💰 费用明细</h4>
            <div className="breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-label">基础费用:</span>
                <span className="breakdown-value">
                  {(addresses.length * selectedMethod.gasEstimate * Number(estimate.gasPrice.gwei) / 1e9).toFixed(6)} ETH
                </span>
              </div>
              {selectedMethod.parameters.map(param => {
                if (param.isArray && parameters[param.name]) {
                  const arrayLength = Array.isArray(parameters[param.name])
                    ? parameters[param.name].length
                    : 1;
                  const extraGas = addresses.length * arrayLength * 5000;
                  const extraCost = extraGas * Number(estimate.gasPrice.gwei) / 1e9;

                  return (
                    <div key={param.name} className="breakdown-item">
                      <span className="breakdown-label">{param.label} 开销:</span>
                      <span className="breakdown-value">{extraCost.toFixed(6)} ETH</span>
                    </div>
                  );
                }
                return null;
              })}
              <div className="breakdown-item total">
                <span className="breakdown-label">总计:</span>
                <span className="breakdown-value">{estimate.estimatedCost.eth} ETH</span>
              </div>
            </div>
          </div>

          {/* Savings Comparison */}
          <div className="savings-comparison">
            <h4>💡 批量操作节省</h4>
            <div className="comparison-grid">
              <div className="comparison-item">
                <span className="comparison-label">单独操作费用:</span>
                <span className="comparison-value individual">
                  {(addresses.length * selectedMethod.gasEstimate * Number(estimate.gasPrice.gwei) / 1e9 * 1.5).toFixed(6)} ETH
                </span>
              </div>
              <div className="comparison-item">
                <span className="comparison-label">批量操作费用:</span>
                <span className="comparison-value batch">
                  {estimate.estimatedCost.eth} ETH
                </span>
              </div>
              <div className="comparison-item savings">
                <span className="comparison-label">节省费用:</span>
                <span className="comparison-value saved">
                  -{((addresses.length * selectedMethod.gasEstimate * Number(estimate.gasPrice.gwei) / 1e9 * 1.5 - Number(estimate.estimatedCost.eth))).toFixed(6)} ETH
                  (-{(((addresses.length * selectedMethod.gasEstimate * Number(estimate.gasPrice.gwei) / 1e9 * 1.5 - Number(estimate.estimatedCost.eth)) / (addresses.length * selectedMethod.gasEstimate * Number(estimate.gasPrice.gwei) / 1e9 * 1.5)) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};