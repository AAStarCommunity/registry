/**
 * Security Page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import "./Legal.css";

const Security: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>

        <h1>Security</h1>
        <p className="last-updated">Last Updated: October 21, 2025</p>

        <section className="legal-section">
          <h2>1. Security Disclaimer</h2>
          <div className="warning-box">
            <p>
              <strong>CRITICAL SECURITY NOTICE:</strong>
            </p>
            <ul>
              <li>SuperPaymaster is experimental open-source software</li>
              <li>Smart contracts may contain bugs or vulnerabilities</li>
              <li>Use at your own risk - no guarantees or warranties provided</li>
              <li>We assume NO liability for any security incidents or losses</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>2. User Security Responsibilities</h2>
          <p>
            <strong>You are solely responsible for:</strong>
          </p>
          <ul>
            <li>
              <strong>Private Key Management</strong>: Securely storing and never sharing your
              private keys or seed phrases
            </li>
            <li>
              <strong>Transaction Verification</strong>: Carefully reviewing all transaction
              details before signing
            </li>
            <li>
              <strong>Smart Contract Risks</strong>: Understanding that smart contract
              interactions are irreversible
            </li>
            <li>
              <strong>Phishing Protection</strong>: Verifying URLs and avoiding malicious links
            </li>
            <li>
              <strong>Device Security</strong>: Keeping your devices and software up to date
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Smart Contract Security</h2>
          <p>
            <strong>Audit Status:</strong> The SuperPaymaster smart contracts are open source
            and available for community review. However:
          </p>
          <ul>
            <li>No third-party security audit guarantees complete safety</li>
            <li>Undiscovered vulnerabilities may exist</li>
            <li>Users should conduct their own due diligence</li>
            <li>
              Start with small amounts to test functionality before committing larger funds
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Known Risks</h2>
          <div className="info-box">
            <p>
              <strong>Blockchain & DeFi Risks:</strong>
            </p>
            <ul>
              <li>Smart contract bugs or exploits</li>
              <li>Network congestion and failed transactions</li>
              <li>Front-running and MEV attacks</li>
              <li>Oracle manipulation or failures</li>
              <li>Regulatory changes affecting blockchain usage</li>
              <li>Loss of funds due to user error or malicious actors</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>5. Best Security Practices</h2>
          <p>
            <strong>We strongly recommend:</strong>
          </p>
          <ul>
            <li>Use hardware wallets (Ledger, Trezor) for significant funds</li>
            <li>Never share your private keys or seed phrase with anyone</li>
            <li>Double-check contract addresses before interactions</li>
            <li>Start with testnet before deploying to mainnet</li>
            <li>Use separate wallets for testing and production</li>
            <li>Keep only necessary funds in hot wallets</li>
            <li>Enable multi-factor authentication where available</li>
            <li>Regularly back up your wallet securely</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Reporting Vulnerabilities</h2>
          <p>
            If you discover a security vulnerability in SuperPaymaster:
          </p>
          <ul>
            <li>
              <strong>DO NOT</strong> disclose it publicly
            </li>
            <li>
              Email us privately at:{" "}
              <a href="mailto:security@aastar.io">security@aastar.io</a>
            </li>
            <li>Provide detailed information about the vulnerability</li>
            <li>Allow reasonable time for us to address the issue</li>
          </ul>
          <p className="note">
            We appreciate responsible disclosure and may acknowledge security researchers
            who help improve the platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Third-Party Integrations</h2>
          <p>
            The Service integrates with various third-party services (wallets, RPC providers,
            explorers, etc.). We are not responsible for:
          </p>
          <ul>
            <li>Security breaches of third-party services</li>
            <li>Downtime or failures of external infrastructure</li>
            <li>Data collected by third-party providers</li>
            <li>Malicious behavior by third-party Paymaster operators</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. No Guarantees</h2>
          <div className="warning-box">
            <p>
              <strong>IMPORTANT:</strong> We provide NO guarantees regarding:
            </p>
            <ul>
              <li>Security of funds or smart contracts</li>
              <li>Availability or uptime of services</li>
              <li>Prevention of all potential attacks or exploits</li>
              <li>Recovery of lost funds due to any reason</li>
            </ul>
            <p>
              USE THIS SOFTWARE AT YOUR OWN RISK. WE ARE NOT LIABLE FOR ANY LOSSES.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>9. Updates and Maintenance</h2>
          <p>
            We may update the software to address security issues, but:
          </p>
          <ul>
            <li>Updates are provided on a best-effort basis</li>
            <li>We do not guarantee timely security patches</li>
            <li>Users are responsible for updating their own deployments</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            For security-related inquiries:{" "}
            <a href="mailto:security@aastar.io">security@aastar.io</a>
          </p>
          <p>
            For general questions:{" "}
            <a href="mailto:contact@aastar.io">contact@aastar.io</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Security;
