import './DeveloperPortal.css';

export function DeveloperPortal() {
  return (
    <div className="developer-portal">
      {/* Hero Section */}
      <section className="dev-hero">
        <div className="hero-content-wrapper">
          <h1>Build with SuperPaymaster</h1>
          <p className="hero-subtitle">
            Integrate gasless transactions in 5 minutes. No backend required.
          </p>
          <div className="hero-ctas">
            <a href="https://demo.aastar.io" className="cta-button primary" target="_blank" rel="noopener noreferrer">
              🎮 Try Live Demo
            </a>
            <a href="#integration" className="cta-button secondary">
              📖 Integration Guide
            </a>
          </div>
        </div>
      </section>

      {/* What is SuperPaymaster */}
      <section className="what-is-section">
        <div className="content-container">
          <h2>What is SuperPaymaster?</h2>
          <div className="what-is-grid">
            <div className="what-is-card">
              <div className="card-icon">⚡</div>
              <h3>Gasless Transactions</h3>
              <p>
                Users pay with ERC-20 tokens (PNT) instead of ETH. No gas fees, no friction.
              </p>
            </div>
            <div className="what-is-card">
              <div className="card-icon">🏪</div>
              <h3>Community Paymasters</h3>
              <p>
                Decentralized network of Paymasters. Anyone can launch and earn fees.
              </p>
            </div>
            <div className="what-is-card">
              <div className="card-icon">🔐</div>
              <h3>ERC-4337 Compliant</h3>
              <p>
                Built on official Account Abstraction standard. EntryPoint v0.7 compatible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Guide */}
      <section id="integration" className="integration-section">
        <div className="content-container">
          <h2>5-Step Integration</h2>
          <div className="steps-container">
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Install SDK</h3>
                <p>Add SuperPaymaster SDK to your project</p>
                <pre className="code-block">
                  <code>{`npm install @aastar/superpaymaster-sdk ethers@^6`}</code>
                </pre>
              </div>
            </div>

            {/* Step 2 */}
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Initialize Provider</h3>
                <p>Connect to Sepolia testnet</p>
                <pre className="code-block">
                  <code>{`import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();`}</code>
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Build UserOperation</h3>
                <p>Create a gasless transaction</p>
                <pre className="code-block">
                  <code>{`import { buildUserOp } from '@aastar/superpaymaster-sdk';

const userOp = await buildUserOp({
  sender: aaAccountAddress,
  callData: transferCallData,
  paymaster: PAYMASTER_V4_ADDRESS,
  gasToken: PNT_TOKEN_ADDRESS,
});`}</code>
                </pre>
              </div>
            </div>

            {/* Step 4 */}
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Sign UserOp</h3>
                <p>Sign with user's wallet</p>
                <pre className="code-block">
                  <code>{`const userOpHash = getUserOpHash(userOp);
const signature = await signer.signMessage(
  ethers.getBytes(userOpHash)
);
userOp.signature = signature;`}</code>
                </pre>
              </div>
            </div>

            {/* Step 5 */}
            <div className="step-card">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>Submit to EntryPoint</h3>
                <p>Send and monitor transaction</p>
                <pre className="code-block">
                  <code>{`const entryPoint = new ethers.Contract(
  ENTRY_POINT_ADDRESS,
  EntryPointABI,
  provider
);

const tx = await entryPoint.handleOps([userOp], beneficiary);
const receipt = await tx.wait();
console.log('✅ Transaction confirmed!', receipt.hash);`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="examples-section">
        <div className="content-container">
          <h2>Complete Example</h2>
          <div className="example-tabs">
            <div className="tab-buttons">
              <button className="tab-button active">React + TypeScript</button>
              <button className="tab-button">Vanilla JS</button>
            </div>
            <div className="tab-content">
              <pre className="code-block large">
                <code>{`import { useState } from 'react';
import { ethers } from 'ethers';
import { buildUserOp, getUserOpHash } from '@aastar/superpaymaster-sdk';

export function GaslessTransfer() {
  const [status, setStatus] = useState('');

  const sendGasless = async (recipient: string, amount: string) => {
    try {
      setStatus('🔄 Building UserOp...');

      // 1. Connect wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 2. Prepare transaction data
      const pntToken = new ethers.Contract(PNT_TOKEN, ERC20_ABI, provider);
      const transferCallData = pntToken.interface.encodeFunctionData(
        'transfer',
        [recipient, ethers.parseUnits(amount, 18)]
      );

      // 3. Build UserOperation
      const userOp = await buildUserOp({
        sender: AA_ACCOUNT_ADDRESS,
        callData: transferCallData,
        paymaster: PAYMASTER_V4_ADDRESS,
        gasToken: PNT_TOKEN_ADDRESS,
      });

      // 4. Sign UserOp
      const userOpHash = getUserOpHash(userOp, ENTRY_POINT_ADDRESS, 11155111);
      userOp.signature = await signer.signMessage(ethers.getBytes(userOpHash));

      // 5. Submit to EntryPoint
      setStatus('📤 Submitting transaction...');
      const entryPoint = new ethers.Contract(
        ENTRY_POINT_ADDRESS,
        ['function handleOps(tuple[] ops, address beneficiary)'],
        signer
      );

      const tx = await entryPoint.handleOps([userOp], signer.address);
      const receipt = await tx.wait();

      setStatus(\`✅ Success! TX: \${receipt.hash}\`);
    } catch (error) {
      setStatus(\`❌ Error: \${error.message}\`);
    }
  };

  return (
    <div>
      <button onClick={() => sendGasless('0x...', '10')}>
        Send 10 PNT (Gasless)
      </button>
      <p>{status}</p>
    </div>
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="resources-section">
        <div className="content-container">
          <h2>Developer Resources</h2>
          <div className="resources-grid">
            <div className="resource-card">
              <div className="resource-icon">📚</div>
              <h3>Documentation</h3>
              <p>Complete API reference and guides</p>
              <a href="https://docs.aastar.io" target="_blank" rel="noopener noreferrer" className="resource-link">
                Read Docs →
              </a>
            </div>
            <div className="resource-card">
              <div className="resource-icon">💬</div>
              <h3>Discord Community</h3>
              <p>Get help from developers</p>
              <a href="https://discord.gg/aastar" target="_blank" rel="noopener noreferrer" className="resource-link">
                Join Discord →
              </a>
            </div>
            <div className="resource-card">
              <div className="resource-icon">🐙</div>
              <h3>GitHub Examples</h3>
              <p>Sample integrations and boilerplates</p>
              <a href="https://github.com/AAStarCommunity" target="_blank" rel="noopener noreferrer" className="resource-link">
                Browse Code →
              </a>
            </div>
            <div className="resource-card">
              <div className="resource-icon">🎮</div>
              <h3>Live Demo</h3>
              <p>Test SuperPaymaster in action</p>
              <a href="https://demo.aastar.io" target="_blank" rel="noopener noreferrer" className="resource-link">
                Try Demo →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="dev-cta-section">
        <div className="content-container">
          <h2>Ready to Build?</h2>
          <p>Start integrating gasless transactions today</p>
          <div className="cta-buttons">
            <a href="https://demo.aastar.io" className="cta-button large primary">
              🎮 Try Live Demo
            </a>
            <a href="https://docs.aastar.io" className="cta-button large secondary">
              📖 Read Documentation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
