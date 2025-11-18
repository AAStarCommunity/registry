import React, { useState, useCallback } from 'react';
import type { AddressValidationResult } from '../../types/contracts';

interface BatchAddressInputProps {
  onAddressesChange: (addresses: string[], validationResults: AddressValidationResult[]) => void;
  disabled?: boolean;
}

export const BatchAddressInput: React.FC<BatchAddressInputProps> = ({
  onAddressesChange,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [addresses, setAddresses] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<AddressValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Validate a single address
  const validateAddress = useCallback(async (address: string): Promise<AddressValidationResult> => {
    if (!address || address.trim() === '') {
      return {
        isValid: false,
        address: '',
        error: 'Empty address'
      };
    }

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        isValid: false,
        address,
        error: 'Invalid Ethereum address format'
      };
    }

    // Check for checksum
    try {
      // Simple checksum validation (you can enhance this with web3.utils.checkAddressChecksum)
      const checksumAddress = address.toLowerCase();
      if (address !== checksumAddress) {
        // This is a simplified check - in production you'd want proper checksum validation
        console.warn('Address checksum validation skipped for demo');
      }
    } catch (error) {
      console.warn('Address validation warning:', error);
    }

    try {
      // You can add additional validation here like:
      // - Check if address already has SBT
      // - Check address balance
      // - Check if address is a contract

      return {
        isValid: true,
        address,
        hasSBT: false, // Would need actual contract call to check
        hasNFT: false, // Would need actual contract call to check
        balance: '0'  // Would need actual contract call to check
      };
    } catch (error) {
      return {
        isValid: false,
        address,
        error: 'Failed to validate address'
      };
    }
  }, []);

  // Process input and validate addresses
  const processAddresses = useCallback(async (input: string) => {
    setIsValidating(true);

    try {
      // Parse addresses from input
      const parsedAddresses = input
        .split(/[\n,\s]+/)
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);

      // Remove duplicates
      const uniqueAddresses = [...new Set(parsedAddresses.map(addr => addr.toLowerCase()))];

      // Validate all addresses
      const results = await Promise.all(
        uniqueAddresses.map(addr => validateAddress(addr))
      );

      // Filter valid addresses
      const validAddresses = results
        .filter(result => result.isValid)
        .map(result => result.address);

      setAddresses(validAddresses);
      setValidationResults(results);
      onAddressesChange(validAddresses, results);
    } catch (error) {
      console.error('Error processing addresses:', error);
    } finally {
      setIsValidating(false);
    }
  }, [validateAddress, onAddressesChange]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Debounce validation
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        processAddresses(value);
      } else {
        setAddresses([]);
        setValidationResults([]);
        onAddressesChange([], []);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Remove an address
  const removeAddress = (addressToRemove: string) => {
    const newAddresses = addresses.filter(addr => addr !== addressToRemove);
    const newResults = validationResults.filter(result => result.address !== addressToRemove);

    setAddresses(newAddresses);
    setValidationResults(newResults);
    onAddressesChange(newAddresses, newResults);
  };

  // Get validation statistics
  const getValidationStats = () => {
    const total = validationResults.length;
    const valid = validationResults.filter(r => r.isValid).length;
    const invalid = total - valid;
    const duplicates = inputValue.split(/[\n,\s]+/).length - validationResults.length;

    return { total, valid, invalid, duplicates };
  };

  const stats = getValidationStats();

  return (
    <div className="batch-address-input">
      <div className="input-header">
        <h3>📋 批量地址输入</h3>
        <p>输入要批量处理的地址，支持多种格式（每行一个、逗号分隔、空格分隔）</p>
      </div>

      <div className="input-section">
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          placeholder="0x1234567890123456789012345678901234567890&#10;0xabcdefabcdefabcdefabcdefabcdefabcdefabcd&#10;或者: 0x1234...7890, 0xabcd...efcd, 0x5678...9012"
          className="address-textarea"
          disabled={disabled}
          rows={6}
        />

        {isValidating && (
          <div className="validation-loading">
            <div className="spinner"></div>
            <span>验证地址中...</span>
          </div>
        )}
      </div>

      {validationResults.length > 0 && (
        <div className="validation-stats">
          <div className="stats-grid">
            <div className="stat-item total">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">总地址数</span>
            </div>
            <div className="stat-item valid">
              <span className="stat-value">{stats.valid}</span>
              <span className="stat-label">有效地址</span>
            </div>
            <div className="stat-item invalid">
              <span className="stat-value">{stats.invalid}</span>
              <span className="stat-label">无效地址</span>
            </div>
            <div className="stat-item duplicates">
              <span className="stat-value">{stats.duplicates}</span>
              <span className="stat-label">重复地址</span>
            </div>
          </div>
        </div>
      )}

      {validationResults.length > 0 && (
        <div className="address-list">
          <h4>地址验证结果</h4>

          {/* Invalid addresses */}
          {validationResults.filter(r => !r.isValid).length > 0 && (
            <div className="address-group invalid">
              <h5>❌ 无效地址 ({validationResults.filter(r => !r.isValid).length})</h5>
              {validationResults
                .filter(r => !r.isValid)
                .map((result, index) => (
                  <div key={`invalid-${index}`} className="address-item invalid">
                    <span className="address-text">{result.address}</span>
                    <span className="error-message">{result.error}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Valid addresses */}
          {addresses.length > 0 && (
            <div className="address-group valid">
              <h5>✅ 有效地址 ({addresses.length})</h5>
              {addresses.map((address, index) => (
                <div key={`valid-${index}`} className="address-item valid">
                  <span className="address-text">
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </span>
                  <div className="address-actions">
                    <span className="address-status">有效</span>
                    <button
                      className="remove-button"
                      onClick={() => removeAddress(address)}
                      disabled={disabled}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {addresses.length > 0 && (
        <div className="summary-section">
          <div className="summary-card">
            <h4>📊 批量操作摘要</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">有效地址数:</span>
                <span className="value">{addresses.length}</span>
              </div>
              <div className="summary-item">
                <span className="label">预估 Gas 费用:</span>
                <span className="value">~{(addresses.length * 0.0001).toFixed(4)} ETH</span>
              </div>
              <div className="summary-item">
                <span className="label">状态:</span>
                <span className="value ready">准备就绪</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};