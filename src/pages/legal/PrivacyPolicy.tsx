/**
 * Privacy Policy Page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import "./Legal.css";

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>

        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: October 21, 2025</p>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            SuperPaymaster Registry is a decentralized, open-source application that interacts
            with blockchain networks. This Privacy Policy explains our approach to data and privacy.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Data We Do NOT Collect</h2>
          <div className="info-box">
            <p>
              <strong>Privacy-First Approach:</strong>
            </p>
            <ul>
              <li>We do NOT collect personal identification information</li>
              <li>We do NOT track user browsing behavior or analytics</li>
              <li>We do NOT store private keys, passwords, or wallet credentials</li>
              <li>We do NOT sell or share user data with third parties</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>3. Blockchain Data</h2>
          <p>
            All interactions with the SuperPaymaster Registry occur on public blockchain networks.
            This means:
          </p>
          <ul>
            <li>Your wallet address and transactions are publicly visible on the blockchain</li>
            <li>Transaction history is permanently recorded and cannot be deleted</li>
            <li>Anyone can view on-chain data using blockchain explorers</li>
            <li>We do not control or have the ability to modify blockchain data</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Wallet Connection</h2>
          <p>
            When you connect your wallet to the Service:
          </p>
          <ul>
            <li>The connection is handled directly by your wallet provider (MetaMask, etc.)</li>
            <li>We only receive your public wallet address, not your private keys</li>
            <li>You can disconnect your wallet at any time</li>
            <li>We do not have access to your wallet funds or ability to initiate transactions without your explicit approval</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Local Storage</h2>
          <p>
            The application may use browser local storage to:
          </p>
          <ul>
            <li>Save user preferences and UI settings</li>
            <li>Cache network configuration</li>
            <li>Store deployment history for convenience</li>
          </ul>
          <p>
            This data is stored locally on your device and is not transmitted to any servers.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Third-Party Services</h2>
          <p>
            The Service may interact with third-party services including:
          </p>
          <ul>
            <li>Blockchain RPC providers (Alchemy, Infura, etc.)</li>
            <li>Wallet providers (MetaMask, WalletConnect, etc.)</li>
            <li>Block explorers (Etherscan, etc.)</li>
          </ul>
          <p>
            These services have their own privacy policies and data collection practices.
            We are not responsible for their privacy practices.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Cookies</h2>
          <p>
            We do not use tracking cookies or analytics cookies. Essential cookies may be used
            for basic functionality only.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Data Security</h2>
          <div className="warning-box">
            <p>
              <strong>Your Responsibility:</strong>
            </p>
            <ul>
              <li>You are solely responsible for the security of your private keys</li>
              <li>Never share your seed phrase or private keys with anyone</li>
              <li>Always verify transaction details before signing</li>
              <li>Use hardware wallets for enhanced security when handling significant funds</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>9. Changes to Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this
            page with an updated "Last Updated" date.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            For privacy-related questions, please contact:{" "}
            <a href="mailto:contact@aastar.io">contact@aastar.io</a>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
