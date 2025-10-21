/**
 * Contact Page
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import "./Legal.css";

const Contact: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>

        <h1>Contact Us</h1>
        <p className="subtitle">
          Get in touch with the AAStar Community behind SuperPaymaster
        </p>

        <section className="legal-section">
          <h2>General Inquiries</h2>
          <p>
            For general questions, feedback, or collaboration opportunities:
          </p>
          <div className="contact-card">
            <div className="contact-item">
              <span className="contact-icon">✉️</span>
              <div>
                <strong>Email</strong>
                <p>
                  <a href="mailto:contact@aastar.io">contact@aastar.io</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>Security Issues</h2>
          <p>
            For security vulnerabilities or urgent security matters:
          </p>
          <div className="contact-card">
            <div className="contact-item">
              <span className="contact-icon">🔒</span>
              <div>
                <strong>Security Email</strong>
                <p>
                  <a href="mailto:security@aastar.io">security@aastar.io</a>
                </p>
                <p className="note">
                  Please do NOT disclose vulnerabilities publicly. Use this email for
                  responsible disclosure.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>Community & Social</h2>
          <p>Connect with us on social platforms:</p>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-item">
                <span className="contact-icon">🐙</span>
                <div>
                  <strong>GitHub</strong>
                  <p>
                    <a
                      href="https://github.com/AAStarCommunity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      github.com/AAStarCommunity
                    </a>
                  </p>
                  <p className="note">
                    View source code, report issues, and contribute to development
                  </p>
                </div>
              </div>
            </div>

            <div className="contact-card">
              <div className="contact-item">
                <span className="contact-icon">🐦</span>
                <div>
                  <strong>Twitter</strong>
                  <p>
                    <a
                      href="https://twitter.com/AAStarCommunity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @AAStarCommunity
                    </a>
                  </p>
                  <p className="note">Latest updates, announcements, and news</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>Documentation & Resources</h2>
          <div className="contact-card">
            <div className="contact-item">
              <span className="contact-icon">📚</span>
              <div>
                <strong>Documentation</strong>
                <p>
                  <a
                    href="https://docs.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    docs.aastar.io
                  </a>
                </p>
                <p className="note">
                  Technical guides, API references, and integration tutorials
                </p>
              </div>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-item">
              <span className="contact-icon">🎮</span>
              <div>
                <strong>Demo Playground</strong>
                <p>
                  <a
                    href="https://demo.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    demo.aastar.io
                  </a>
                </p>
                <p className="note">Try out SuperPaymaster features in a live demo</p>
              </div>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-item">
              <span className="contact-icon">🌐</span>
              <div>
                <strong>Official Website</strong>
                <p>
                  <a href="https://aastar.io" target="_blank" rel="noopener noreferrer">
                    aastar.io
                  </a>
                </p>
                <p className="note">Learn more about the AAStar ecosystem</p>
              </div>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>Response Time</h2>
          <div className="info-box">
            <p>
              <strong>Please Note:</strong>
            </p>
            <ul>
              <li>
                SuperPaymaster is an open-source community project maintained by volunteers
              </li>
              <li>We aim to respond to inquiries within 3-5 business days</li>
              <li>Security reports are prioritized and handled as quickly as possible</li>
              <li>
                For faster support, consider posting technical questions on GitHub Issues
              </li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>Before You Contact</h2>
          <p>To help us assist you better, please:</p>
          <ul>
            <li>Check the documentation for answers to common questions</li>
            <li>Search existing GitHub issues to see if your question has been answered</li>
            <li>Provide detailed information when reporting bugs or issues</li>
            <li>Include relevant transaction hashes, wallet addresses, and error messages</li>
            <li>Specify which network (mainnet/testnet) you're using</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Disclaimer</h2>
          <div className="warning-box">
            <p>
              <strong>Important:</strong>
            </p>
            <p>
              We will NEVER ask for your private keys, seed phrases, or passwords. Be cautious
              of impersonators. Always verify you're communicating with official AAStar
              channels.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contact;
