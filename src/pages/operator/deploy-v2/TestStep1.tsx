import React from "react";
import { Step1_ConfigForm, type DeployConfig } from "./steps/Step1_ConfigForm";

/**
 * Test page for Step1_ConfigForm component
 * Used to verify form functionality, validation, and history integration
 *
 * To test:
 * 1. Add route in App.tsx: <Route path="/test-step1" element={<TestStep1 />} />
 * 2. Navigate to /test-step1
 * 3. Fill in the form and test history dropdowns
 */
export function TestStep1() {
  const handleNext = (config: DeployConfig) => {
    console.log("Form submitted with config:", config);
    alert("Form validation passed! Check console for details.");
  };

  const handleCancel = () => {
    console.log("Form cancelled");
    alert("Form cancelled");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "2rem 0"
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        overflow: "hidden"
      }}>
        <div style={{
          background: "#667eea",
          color: "white",
          padding: "1.5rem 2rem"
        }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            🧪 Test: Step 1 Config Form
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.9rem" }}>
            Testing form validation, history dropdowns, and state management
          </p>
        </div>

        <Step1_ConfigForm onNext={handleNext} onCancel={handleCancel} />
      </div>

      <div style={{
        maxWidth: "900px",
        margin: "2rem auto",
        background: "white",
        borderRadius: "8px",
        padding: "1.5rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)"
      }}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#333" }}>
          📝 Testing Instructions
        </h2>
        <ol style={{ color: "#666", lineHeight: "1.8" }}>
          <li>
            <strong>Test Field Validation:</strong>
            <ul>
              <li>Try submitting with empty required fields</li>
              <li>Enter invalid addresses for Treasury field</li>
              <li>Enter out-of-range values (e.g., gas rate &lt; 1000 or &gt; 10000)</li>
            </ul>
          </li>
          <li>
            <strong>Test History Dropdowns:</strong>
            <ul>
              <li>Fill in Treasury Address and blur the field</li>
              <li>Refresh the page and click on Treasury field - should show history</li>
              <li>Click on a history item to auto-fill</li>
              <li>Click "📋 History" button to toggle dropdown</li>
            </ul>
          </li>
          <li>
            <strong>Test Form Submission:</strong>
            <ul>
              <li>Fill in all required fields correctly</li>
              <li>Click "Next: Check Wallet Resources"</li>
              <li>Check browser console for submitted data</li>
            </ul>
          </li>
          <li>
            <strong>Test History Persistence:</strong>
            <ul>
              <li>Submit form multiple times with different values</li>
              <li>Open DevTools → Application → Local Storage</li>
              <li>Check for keys like "deploy_form_history_treasury"</li>
              <li>Verify history items have timestamps</li>
            </ul>
          </li>
        </ol>

        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: "6px",
          borderLeft: "4px solid #667eea"
        }}>
          <strong style={{ color: "#667eea" }}>💡 Pro Tip:</strong>
          <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
            Open browser DevTools and monitor the Console and Local Storage tabs
            while testing to see real-time validation and history updates.
          </p>
        </div>
      </div>
    </div>
  );
}
