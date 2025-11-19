import React, { useState, useEffect } from 'react';
import type { ParameterConfig } from '../../types/contracts';

interface ParameterInputProps {
  config: ParameterConfig;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export const ParameterInput: React.FC<ParameterInputProps> = ({
  config,
  value,
  onChange,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');

  // Initialize input value from prop
  useEffect(() => {
    if (value !== undefined && value !== null) {
      if (config.isArray && Array.isArray(value)) {
        setInputValue(value.join(', '));
      } else {
        setInputValue(String(value));
      }
    } else if (config.defaultValue !== undefined) {
      if (config.isArray && Array.isArray(config.defaultValue)) {
        setInputValue(config.defaultValue.join(', '));
      } else {
        setInputValue(String(config.defaultValue));
      }
    }
  }, [value, config.isArray, config.defaultValue]);

  // Validate input
  const validateInput = (val: string) => {
    if (config.required && (!val || val.trim() === '')) {
      setIsValid(false);
      setError('This field is required');
      return false;
    }

    if (config.validation && val) {
      const regex = new RegExp(config.validation);
      if (!regex.test(val)) {
        setIsValid(false);
        setError('Invalid format');
        return false;
      }
    }

    if (config.isAddress && val) {
      const addresses = val.split(/[\s,]+/).filter(a => a.trim());
      for (const addr of addresses) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          setIsValid(false);
          setError(`Invalid Ethereum address: ${addr}`);
          return false;
        }
      }
    }

    setIsValid(true);
    setError('');
    return true;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (validateInput(val)) {
      let parsedValue: any = val;

      // Parse based on type
      if (config.isArray) {
        // Split by commas, spaces, or newlines
        parsedValue = val.split(/[\s,]+/).filter(item => item.trim());
      } else if (config.type === 'number' || config.type.includes('uint')) {
        parsedValue = parseInt(val, 10);
        if (isNaN(parsedValue)) {
          parsedValue = 0;
        }
      } else if (config.type === 'boolean') {
        parsedValue = val.toLowerCase() === 'true';
      } else if (config.type === 'json') {
        try {
          parsedValue = JSON.parse(val);
        } catch {
          setError('Invalid JSON format');
          setIsValid(false);
          return;
        }
      }

      onChange(parsedValue);
    }
  };

  // Render input based on type
  const renderInput = () => {
    const baseProps = {
      value: inputValue,
      onChange: handleChange,
      disabled,
      placeholder: config.placeholder || `Enter ${config.label.toLowerCase()}`,
      className: `parameter-input ${!isValid ? 'invalid' : ''}`
    };

    if (config.isArray || config.type === 'json') {
      return (
        <textarea
          {...baseProps}
          rows={4}
          className={`parameter-input textarea ${!isValid ? 'invalid' : ''}`}
        />
      );
    }

    return <input {...baseProps} type="text" />;
  };

  return (
    <div className="parameter-input-container">
      <div className="parameter-header">
        <label className="parameter-label">
          {config.label}
          {config.required && <span className="required-star">*</span>}
        </label>
        {config.description && (
          <span className="parameter-description">{config.description}</span>
        )}
      </div>

      <div className="parameter-field">
        {renderInput()}

        {!isValid && error && (
          <div className="parameter-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {config.isArray && inputValue && (
          <div className="parameter-preview">
            <span className="preview-label">Preview:</span>
            <div className="preview-content">
              {inputValue.split(/[\s,]+/)
                .filter(item => item.trim())
                .slice(0, 3)
                .map((item, index) => (
                  <span key={index} className="preview-item">
                    {config.isAddress ? `${item.slice(0, 8)}...${item.slice(-6)}` : item}
                  </span>
                ))}
              {inputValue.split(/[\s,]+/).filter(item => item.trim()).length > 3 && (
                <span className="preview-more">
                  +{inputValue.split(/[\s,]+/).filter(item => item.trim()).length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface DynamicParametersProps {
  parameters: ParameterConfig[];
  values: { [key: string]: any };
  onChange: (values: { [key: string]: any }) => void;
  disabled?: boolean;
}

export const DynamicParameters: React.FC<DynamicParametersProps> = ({
  parameters,
  values,
  onChange,
  disabled = false
}) => {
  const handleParameterChange = (paramName: string, value: any) => {
    const newValues = { ...values, [paramName]: value };
    onChange(newValues);
  };

  return (
    <div className="dynamic-parameters">
      <div className="parameters-header">
        <h3>⚙️ 参数配置</h3>
        <p>配置批量操作的参数</p>
      </div>

      <div className="parameters-grid">
        {parameters
          .filter(param => !param.isAddress || param.isArray) // Filter out single address params (provided by BatchAddressInput)
          .map((param) => (
          <div key={param.name} className="parameter-section">
            <ParameterInput
              config={param}
              value={values[param.name]}
              onChange={(value) => handleParameterChange(param.name, value)}
              disabled={disabled || param.name === 'metadata' || param.name === 'metas'}
            />
            {(param.name === 'metadata' || param.name === 'metas') && (
              <div className="parameter-readonly-hint">
                🔒 Auto-filled with your community information (read-only)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Parameters Summary */}
      <div className="parameters-summary">
        <h4>📋 参数摘要</h4>
        <div className="summary-grid">
          {parameters
            .filter(param => !param.isAddress || param.isArray)
            .map((param) => (
            <div key={param.name} className="summary-item">
              <span className="param-name">{param.label}:</span>
              <span className="param-value">
                {values[param.name] !== undefined && values[param.name] !== null
                  ? param.isArray && Array.isArray(values[param.name])
                    ? `${values[param.name].length} items`
                    : param.isAddress
                    ? `${String(values[param.name]).slice(0, 8)}...${String(values[param.name]).slice(-6)}`
                    : String(values[param.name])
                  : 'Not set'
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};