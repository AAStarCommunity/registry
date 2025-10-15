import React, { useState } from "react";
import { Step2_WalletCheck } from "./steps/Step2_WalletCheck";
import type { DeployConfig } from "./steps/Step1_ConfigForm";

/**
 * Test page for Step2_WalletCheck component
 * Used to verify wallet checking, balance display, and resource guidance
 *
 * To test:
 * 1. Add route in App.tsx: <Route path="/test-step2" element={<TestStep2 />} />
 * 2. Navigate to /test-step2
 * 3. Connect MetaMask and test wallet checking
 */
export function TestStep2() {
  const [mockConfig] = useState<DeployConfig>({
    communityName: "Test Community",
    treasury: "0x1234567890123456789012345678901234567890",
    gasToUSDRate: "4500",
    pntPriceUSD: "0.02",
    serviceFeeRate: "2",
    maxGasCostCap: "0.1",
    minTokenBalance: "100",
  });

  const handleNext = () => {
    console.log("Next step clicked");
    alert("Next step: Stake option selection (not yet implemented)");
  };

  const handleBack = () => {
    console.log("Back clicked");
    alert("Would navigate back to Step 1");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "2rem 0",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#667eea",
            color: "white",
            padding: "1.5rem 2rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            🧪 Test: Step 2 Wallet Check
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.9rem" }}>
            Testing wallet connection, balance checking, and resource guidance
          </p>
        </div>

        <Step2_WalletCheck
          config={mockConfig}
          onNext={handleNext}
          onBack={handleBack}
        />
      </div>

      <div
        style={{
          maxWidth: "1000px",
          margin: "2rem auto",
          background: "white",
          borderRadius: "8px",
          padding: "1.5rem",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#333" }}>
          📝 Testing Instructions
        </h2>
        <ol style={{ color: "#666", lineHeight: "1.8" }}>
          <li>
            <strong>Test MetaMask Connection:</strong>
            <ul>
              <li>Ensure MetaMask is installed and unlocked</li>
              <li>Page should automatically connect on load</li>
              <li>Check that wallet address is displayed correctly</li>
            </ul>
          </li>
          <li>
            <strong>Test Balance Display:</strong>
            <ul>
              <li>Verify ETH balance shows correctly</li>
              <li>Check sufficiency indicators (✅/❌)</li>
              <li>Verify "Get ETH/GToken/PNTs" buttons appear when insufficient</li>
            </ul>
          </li>
          <li>
            <strong>Test Resource Guidance:</strong>
            <ul>
              <li>Click "Get ETH" - should open faucet (Sepolia) or show guide</li>
              <li>Click "Get GToken" - should open guide page in new tab</li>
              <li>Click "Get PNTs" - should open guide page in new tab</li>
            </ul>
          </li>
          <li>
            <strong>Test Refresh Functionality:</strong>
            <ul>
              <li>Click "🔄 Refresh Balances" button</li>
              <li>Verify balances update correctly</li>
              <li>Check loading state displays during refresh</li>
            </ul>
          </li>
          <li>
            <strong>Test Navigation:</strong>
            <ul>
              <li>Click "← Back to Configuration" - should show alert</li>
              <li>
                If resources insufficient, "Next" button should be disabled
              </li>
              <li>If resources sufficient, "Next" button should be enabled</li>
            </ul>
          </li>
          <li>
            <strong>Test Error Handling:</strong>
            <ul>
              <li>Lock MetaMask and refresh page</li>
              <li>Verify error message displays</li>
              <li>Click "Retry Connection" to reconnect</li>
            </ul>
          </li>
        </ol>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "#f8f9fa",
            borderRadius: "6px",
            borderLeft: "4px solid #667eea",
          }}
        >
          <strong style={{ color: "#667eea" }}>💡 Pro Tip:</strong>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#666",
              fontSize: "0.9rem",
            }}
          >
            Open browser DevTools (Console and Network tabs) to monitor wallet
            interactions and API calls. You can also check the Application tab to
            see if any data is being stored.
          </p>
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#fff3cd",
            borderRadius: "6px",
            borderLeft: "4px solid #ffc107",
          }}
        >
          <strong style={{ color: "#856404" }}>⚠️ Note:</strong>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#856404",
              fontSize: "0.9rem",
            }}
          >
            GToken and PNT token addresses are not yet configured. The balance
            checks for these tokens will show "0" until proper addresses are
            added to the configuration.
          </p>
        </div>
      </div>
    </div>
  );
}
