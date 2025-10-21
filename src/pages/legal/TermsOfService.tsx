/**
 * Terms of Service Page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import "./Legal.css";

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>

        <h1>Terms of Service</h1>
        <p className="last-updated">Last Updated: October 21, 2025</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the SuperPaymaster Registry ("the Service"), you acknowledge
            that you have read, understood, and agree to be bound by these Terms of Service.
            If you do not agree with these terms, please do not use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Open Source Software</h2>
          <p>
            SuperPaymaster is an open-source project provided "AS IS" without warranty of any kind.
            The software is made available under open-source licenses and is maintained by the
            AAStar Community.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. No Liability & Disclaimer</h2>
          <div className="warning-box">
            <p>
              <strong>IMPORTANT DISCLAIMER:</strong>
            </p>
            <ul>
              <li>The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind.</li>
              <li>We do NOT guarantee the accuracy, completeness, or usefulness of any information.</li>
              <li>We are NOT responsible for any losses, damages, or consequences arising from your use of the Service.</li>
              <li>Users assume ALL risks associated with using blockchain technology and smart contracts.</li>
              <li>No contributor, developer, or affiliate shall be liable for any direct, indirect, incidental, special, or consequential damages.</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>4. User Responsibilities</h2>
          <p>
            You are solely responsible for:
          </p>
          <ul>
            <li>Maintaining the security of your private keys and wallet credentials</li>
            <li>Verifying all transaction details before execution</li>
            <li>Understanding the risks of blockchain technology and smart contracts</li>
            <li>Complying with all applicable laws and regulations in your jurisdiction</li>
            <li>Conducting your own due diligence before using any Paymaster service</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Blockchain Risks</h2>
          <p>
            You acknowledge and accept the following risks:
          </p>
          <ul>
            <li>Blockchain transactions are irreversible and may result in permanent loss of funds</li>
            <li>Smart contract vulnerabilities or bugs may exist and cause unexpected behavior</li>
            <li>Network congestion, gas price fluctuations, and failed transactions may occur</li>
            <li>Third-party services integrated with the platform may fail or be compromised</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. No Financial Advice</h2>
          <p>
            Nothing on this Service constitutes financial, investment, legal, or tax advice.
            Always consult with qualified professionals before making any financial decisions.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Third-Party Services</h2>
          <p>
            The Service may integrate with third-party Paymaster operators, wallets, and other
            services. We are not responsible for the actions, services, or content provided
            by third parties.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued use of the Service
            after changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable laws,
            without regard to conflict of law principles.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            For questions about these Terms, please contact us at:{" "}
            <a href="mailto:contact@aastar.io">contact@aastar.io</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
