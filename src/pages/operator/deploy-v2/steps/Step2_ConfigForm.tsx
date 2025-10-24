import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { HistoryDropdown } from "../components/HistoryDropdown";
import {
  saveToHistory,
  loadHistory,
  getMostRecent,
} from "../utils/formHistory";
import type { HistoryItem } from "../utils/formHistory";
import "./Step2_ConfigForm.css";

export interface DeployConfig {
  communityName: string;
  treasury: string;
  gasToUSDRate: string;
  pntPriceUSD: string;
  serviceFeeRate: string;
  maxGasCostCap: string;
  minTokenBalance: string;
}

interface ValidationErrors {
  communityName?: string;
  treasury?: string;
  gasToUSDRate?: string;
  pntPriceUSD?: string;
  serviceFeeRate?: string;
  maxGasCostCap?: string;
  minTokenBalance?: string;
}

interface Step2Props {
  onNext: (config: DeployConfig) => void;
  onBack: () => void;
}

export function Step2_ConfigForm({ onNext, onBack }: Step2Props) {
  // Form state
  const [config, setConfig] = useState<DeployConfig>({
    communityName: "",
    treasury: getMostRecent("treasury") || "",
    gasToUSDRate: getMostRecent("gasToUSDRate") || "4500",
    pntPriceUSD: getMostRecent("pntPriceUSD") || "0.02",
    serviceFeeRate: "2",
    maxGasCostCap: "0.1",
    minTokenBalance: "100",
  });

  // Validation errors
  const [errors, setErrors] = useState<ValidationErrors>({});

  // History dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [treasuryHistory, setTreasuryHistory] = useState<HistoryItem[]>([]);
  const [gasRateHistory, setGasRateHistory] = useState<HistoryItem[]>([]);
  const [pntPriceHistory, setPntPriceHistory] = useState<HistoryItem[]>([]);

  // Refs for click outside detection
  const treasuryRef = useRef<HTMLDivElement>(null);
  const gasRateRef = useRef<HTMLDivElement>(null);
  const pntPriceRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    setTreasuryHistory(loadHistory("treasury"));
    setGasRateHistory(loadHistory("gasToUSDRate"));
    setPntPriceHistory(loadHistory("pntPriceUSD"));
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (treasuryRef.current && !treasuryRef.current.contains(target)) {
        if (openDropdown === "treasury") setOpenDropdown(null);
      }
      if (gasRateRef.current && !gasRateRef.current.contains(target)) {
        if (openDropdown === "gasRate") setOpenDropdown(null);
      }
      if (pntPriceRef.current && !pntPriceRef.current.contains(target)) {
        if (openDropdown === "pntPrice") setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Validate individual field
  const validateField = (
    name: keyof DeployConfig,
    value: string,
  ): string | undefined => {
    switch (name) {
      case "communityName":
        if (!value.trim()) return "Community name is required";
        if (value.length < 3)
          return "Community name must be at least 3 characters";
        if (value.length > 50)
          return "Community name must be less than 50 characters";
        return undefined;

      case "treasury":
        if (!value.trim()) return "Treasury address is required";
        if (!ethers.isAddress(value)) return "Invalid Ethereum address";
        return undefined;

      case "gasToUSDRate":
        const gasRate = parseFloat(value);
        if (isNaN(gasRate) || gasRate <= 0)
          return "Gas rate must be a positive number";
        if (gasRate < 1000 || gasRate > 10000)
          return "Gas rate should be between 1000 and 10000";
        return undefined;

      case "pntPriceUSD":
        const pntPrice = parseFloat(value);
        if (isNaN(pntPrice) || pntPrice <= 0)
          return "PNT price must be a positive number";
        if (pntPrice < 0.001 || pntPrice > 10)
          return "PNT price should be between 0.001 and 10";
        return undefined;

      case "serviceFeeRate":
        const feeRate = parseFloat(value);
        if (isNaN(feeRate) || feeRate < 0 || feeRate > 10)
          return "Service fee rate must be between 0 and 10";
        return undefined;

      case "maxGasCostCap":
        const gasCap = parseFloat(value);
        if (isNaN(gasCap) || gasCap <= 0)
          return "Max gas cost cap must be a positive number";
        if (gasCap < 0.01 || gasCap > 10)
          return "Max gas cost cap should be between 0.01 and 10 ETH";
        return undefined;

      case "minTokenBalance":
        const minBalance = parseFloat(value);
        if (isNaN(minBalance) || minBalance <= 0)
          return "Min token balance must be a positive number";
        if (minBalance < 1 || minBalance > 10000)
          return "Min token balance should be between 1 and 10000";
        return undefined;

      default:
        return undefined;
    }
  };

  // Handle input change
  const handleChange = (name: keyof DeployConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle input blur (validate and save to history)
  const handleBlur = (name: keyof DeployConfig) => {
    const value = config[name];
    const error = validateField(name, value);

    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      // Save to history for specific fields
      if (name === "treasury" && value.trim()) {
        saveToHistory("treasury", value.trim());
        setTreasuryHistory(loadHistory("treasury"));
      } else if (name === "gasToUSDRate" && value.trim()) {
        saveToHistory("gasToUSDRate", value.trim(), `${value} USD/ETH`);
        setGasRateHistory(loadHistory("gasToUSDRate"));
      } else if (name === "pntPriceUSD" && value.trim()) {
        saveToHistory("pntPriceUSD", value.trim(), `$${value} per PNT`);
        setPntPriceHistory(loadHistory("pntPriceUSD"));
      }
    }
  };

  // Handle history selection
  const handleHistorySelect = (field: string, value: string) => {
    if (field === "treasury") {
      handleChange("treasury", value);
      setOpenDropdown(null);
    } else if (field === "gasRate") {
      handleChange("gasToUSDRate", value);
      setOpenDropdown(null);
    } else if (field === "pntPrice") {
      handleChange("pntPriceUSD", value);
      setOpenDropdown(null);
    }
  };

  // Handle history clear
  const handleHistoryClear = (field: string) => {
    // Will be implemented when user clicks "Clear All"
    setOpenDropdown(null);
  };

  // Validate all fields
  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    (Object.keys(config) as Array<keyof DeployConfig>).forEach((key) => {
      const error = validateField(key, config[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateAll()) {
      onNext(config);
    }
  };

  // Calculate estimated gas cost
  const estimatedGasCost = "~0.02 ETH"; // TODO: Calculate based on current gas price

  return (
    <div className="step2-config-form">
      <div className="step-header">
        <h2>Step 2: Configure Deployment</h2>
        <p className="step-description">
          Fill in the basic configuration for your Paymaster. Fields with
          history will show recent values you've used before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="config-form">
        {/* Community Name */}
        <div className="form-group">
          <label htmlFor="communityName">
            Community Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="communityName"
            value={config.communityName}
            onChange={(e) => handleChange("communityName", e.target.value)}
            onBlur={() => handleBlur("communityName")}
            placeholder="Enter your community name"
            className={errors.communityName ? "error" : ""}
          />
          {errors.communityName && (
            <div className="error-message">{errors.communityName}</div>
          )}
          <div className="field-help">
            This name will be displayed in the Registry
          </div>
        </div>

        {/* Treasury Address (with history) */}
        <div className="form-group" ref={treasuryRef}>
          <label htmlFor="treasury">
            Treasury Address <span className="required">*</span>
            {treasuryHistory.length > 0 && (
              <button
                type="button"
                className="history-toggle"
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "treasury" ? null : "treasury",
                  )
                }
              >
                📋 History
              </button>
            )}
          </label>
          <input
            type="text"
            id="treasury"
            value={config.treasury}
            onChange={(e) => handleChange("treasury", e.target.value)}
            onBlur={() => handleBlur("treasury")}
            onFocus={() =>
              treasuryHistory.length > 0 && setOpenDropdown("treasury")
            }
            placeholder="0x..."
            className={errors.treasury ? "error" : ""}
          />
          {openDropdown === "treasury" && treasuryHistory.length > 0 && (
            <HistoryDropdown
              history={treasuryHistory}
              onSelect={(value) => handleHistorySelect("treasury", value)}
              onClear={() => handleHistoryClear("treasury")}
              isOpen={true}
              onClose={() => setOpenDropdown(null)}
            />
          )}
          {errors.treasury && (
            <div className="error-message">{errors.treasury}</div>
          )}
          <div className="field-help">
            Address that will receive service fees
          </div>
        </div>

        {/* Gas to USD Rate (with history) - HIDDEN, using default value 4500 for calculations */}
        {/* Future: Will fetch from Chainlink oracle on-chain */}
        <input type="hidden" value={config.gasToUSDRate} />

        {/* PNT Price USD (with history) - HIDDEN, using default value 0.02 for calculations */}
        {/* Future: Will fetch from swap contract with periodic price updates */}
        <input type="hidden" value={config.pntPriceUSD} />

        {/* Service Fee Rate */}
        <div className="form-group">
          <label htmlFor="serviceFeeRate">Service Fee Rate (%)</label>
          <input
            type="text"
            id="serviceFeeRate"
            value={config.serviceFeeRate}
            onChange={(e) => handleChange("serviceFeeRate", e.target.value)}
            onBlur={() => handleBlur("serviceFeeRate")}
            placeholder="2"
            className={errors.serviceFeeRate ? "error" : ""}
          />
          {errors.serviceFeeRate && (
            <div className="error-message">{errors.serviceFeeRate}</div>
          )}
          <div className="field-help">
            Percentage fee charged on gas costs (0-10%)
          </div>
        </div>

        {/* Max Gas Cost Cap */}
        <div className="form-group">
          <label htmlFor="maxGasCostCap">Max Gas Cost Cap (ETH)</label>
          <input
            type="text"
            id="maxGasCostCap"
            value={config.maxGasCostCap}
            onChange={(e) => handleChange("maxGasCostCap", e.target.value)}
            onBlur={() => handleBlur("maxGasCostCap")}
            placeholder="0.1"
            className={errors.maxGasCostCap ? "error" : ""}
          />
          {errors.maxGasCostCap && (
            <div className="error-message">{errors.maxGasCostCap}</div>
          )}
          <div className="field-help">
            Maximum gas cost per transaction in ETH
          </div>
        </div>

        {/* Min Gas Token Balance */}
        <div className="form-group">
          <label htmlFor="minTokenBalance">Min Gas Token Balance (xPNTs)</label>
          <input
            type="text"
            id="minTokenBalance"
            value={config.minTokenBalance}
            onChange={(e) => handleChange("minTokenBalance", e.target.value)}
            onBlur={() => handleBlur("minTokenBalance")}
            placeholder="100"
            className={errors.minTokenBalance ? "error" : ""}
          />
          {errors.minTokenBalance && (
            <div className="error-message">{errors.minTokenBalance}</div>
          )}
          <div className="field-help">
            Minimum xPNTs balance required for end users
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="estimated-cost">
          <div className="cost-label">Estimated Deployment Cost:</div>
          <div className="cost-value">{estimatedGasCost}</div>
          <div className="cost-note">
            This is an estimate based on current gas prices. Actual cost may
            vary.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button type="button" onClick={onBack} className="btn-cancel">
            Cancel
          </button>
          <button type="submit" className="btn-next">
            Next: Deploy Paymaster →
          </button>
        </div>
      </form>
    </div>
  );
}
