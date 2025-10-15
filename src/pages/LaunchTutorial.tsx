import { useState } from "react";
import "./LaunchTutorial.css";

export function LaunchTutorial() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", title: "📖 Overview", icon: "📖" },
    { id: "prerequisites", title: "✅ Prerequisites", icon: "✅" },
    { id: "step1", title: "Step 1: Deploy Paymaster", icon: "🚀" },
    { id: "step2", title: "Step 2: Configure Tokens", icon: "🪙" },
    { id: "step3", title: "Step 3: Stake to EntryPoint", icon: "⚡" },
    { id: "step4", title: "Step 4: Test Transaction", icon: "🧪" },
    { id: "step5", title: "Step 5: Register & Launch", icon: "🎉" },
    { id: "faq", title: "❓ FAQ", icon: "❓" },
  ];

  return (
    <div className="launch-guide">
      {/* Sidebar TOC */}
      <aside className="guide-sidebar">
        <div className="sidebar-header">
          <h2>🚀 Launch Tutorial</h2>
          <p>Practice Paymaster Setup (Testnet Only)</p>
        </div>
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? "active" : ""}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-title">{section.title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a
            href="https://github.com/AAStarCommunity/registry/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="help-link"
          >
            💬 Need Help? Post issues
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="guide-content">
        {/* Overview */}
        {activeSection === "overview" && (
          <section className="content-section">
            <h1>Launch Tutorial - Practice on Testnet</h1>
            <p className="lead">
              This tutorial guides you through deploying and configuring a
              PaymasterV4 contract on Sepolia testnet for learning purposes. For
              production deployment, use{" "}
              <a href="/operator/deploy">Operator Portal</a>. Total time: ~15-30
              minutes.
            </p>

            <div className="info-box">
              <h3>What You'll Build</h3>
              <ul>
                <li>✅ Deployed PaymasterV4 contract</li>
                <li>✅ Configured SBT and Gas Token support</li>
                <li>✅ Funded treasury for gas sponsorship</li>
                <li>✅ Tested gasless transaction</li>
                <li>✅ Registered in SuperPaymaster Registry</li>
              </ul>
            </div>

            <div className="warning-box">
              <h3>⚠️ Important Notes</h3>
              <ul>
                <li>
                  This guide uses Sepolia testnet - get test ETH from{" "}
                  <a
                    href="https://sepoliafaucet.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sepolia Faucet
                  </a>
                </li>
                <li>You'll need MetaMask installed and configured</li>
                <li>Have ~0.1 ETH on Sepolia for deployment and testing</li>
              </ul>
            </div>

            <button
              className="next-button"
              onClick={() => setActiveSection("prerequisites")}
            >
              Continue to Prerequisites →
            </button>
          </section>
        )}

        {/* Prerequisites */}
        {activeSection === "prerequisites" && (
          <section className="content-section">
            <h1>✅ Prerequisites</h1>

            <div className="checklist">
              <h3>Before You Start</h3>

              <div className="checklist-item">
                <input type="checkbox" id="prereq1" />
                <label htmlFor="prereq1">
                  <strong>MetaMask Wallet</strong>
                  <p>Install MetaMask browser extension and create a wallet</p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download MetaMask →
                  </a>
                </label>
              </div>

              <div className="checklist-item">
                <input type="checkbox" id="prereq2" />
                <label htmlFor="prereq2">
                  <strong>Sepolia Test ETH</strong>
                  <p>Get at least 0.1 ETH from Sepolia faucet</p>
                  <a
                    href="https://sepoliafaucet.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Test ETH →
                  </a>
                </label>
              </div>

              <div className="checklist-item">
                <input type="checkbox" id="prereq3" />
                <label htmlFor="prereq3">
                  <strong>Basic Blockchain Knowledge</strong>
                  <p>Understand transactions, gas fees, and smart contracts</p>
                </label>
              </div>
            </div>

            <div className="cost-estimate">
              <h3>💎 Cost Estimate</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Paymaster Deployment</td>
                    <td>~0.02 ETH (~$50)</td>
                  </tr>
                  <tr>
                    <td>Configuration Transactions</td>
                    <td>~0.01 ETH (~$25)</td>
                  </tr>
                  <tr>
                    <td>Treasury Initial Fund</td>
                    <td>0.1 ETH (~$250)</td>
                  </tr>
                  <tr className="total-row">
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>~0.13 ETH (~$325)</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("overview")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("step1")}
              >
                Start Deployment →
              </button>
            </div>
          </section>
        )}

        {/* Step 1: Deploy Paymaster */}
        {activeSection === "step1" && (
          <section className="content-section">
            <h1>🚀 Step 1: Deploy Paymaster</h1>

            <div className="step-intro">
              <p>
                Deploy your PaymasterV4 contract using our demo interface or
                direct contract interaction.
              </p>
            </div>

            <h2>Option A: Using Operator Portal (Recommended)</h2>
            <div className="instructions">
              <ol>
                <li>
                  <strong>Open Operator Portal</strong>
                  <p>
                    Navigate to <a href="/operator/deploy">Operator Portal</a>{" "}
                    and select "Deploy New Paymaster"
                  </p>
                </li>
                <li>
                  <strong>Connect Wallet</strong>
                  <p>Click "Connect MetaMask" and approve the connection</p>
                  <div className="code-block">
                    <code>Network: Sepolia Testnet (Chain ID: 11155111)</code>
                  </div>
                </li>
                <li>
                  <strong>Deploy Paymaster</strong>
                  <p>
                    Click "Deploy Paymaster" button and confirm the transaction
                  </p>
                  <div className="info-box small">
                    Expected Gas: ~2,000,000 gas (~0.02 ETH)
                  </div>
                </li>
                <li>
                  <strong>Save Paymaster Address</strong>
                  <p>Copy and save your new Paymaster contract address</p>
                  <div className="code-block">
                    <code>
                      Example: 0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445
                    </code>
                  </div>
                </li>
              </ol>
            </div>

            <h2>Option B: Direct Contract Deployment</h2>
            <div className="instructions">
              <div className="code-block">
                <pre>{`// Using ethers.js
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// PaymasterV4 Factory
const factoryAddress = "0x..."; // Factory contract
const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);

// Deploy with your address as owner
const tx = await factory.deployPaymaster(
  await signer.getAddress(), // owner
  ENTRY_POINT_ADDRESS
);

const receipt = await tx.wait();
console.log('Paymaster deployed at:', receipt.contractAddress);`}</pre>
              </div>
            </div>

            <div className="success-box">
              <h3>✅ Verification</h3>
              <p>After deployment, verify your Paymaster on Etherscan:</p>
              <code>
                https://sepolia.etherscan.io/address/YOUR_PAYMASTER_ADDRESS
              </code>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("prerequisites")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("step2")}
              >
                Next: Configure Tokens →
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Configure Tokens */}
        {activeSection === "step2" && (
          <section className="content-section">
            <h1>🪙 Step 2: Configure Tokens</h1>

            <div className="step-intro">
              <p>
                Add supported SBT (membership tokens) and Gas Tokens (PNT) to
                your Paymaster.
              </p>
            </div>

            <h2>Add Supported SBT</h2>
            <div className="instructions">
              <p>
                SBTs gate access to your Paymaster. Users must hold at least 1
                SBT to use it.
              </p>

              <div className="code-block">
                <pre>{`// Using Operator Demo
1. Click "Add SBT" button
2. Enter SBT contract address
3. Confirm transaction

// Or direct contract call
await paymaster.addSupportedSBT("0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f");`}</pre>
              </div>

              <div className="info-box small">
                <strong>Default SBT on Sepolia:</strong>
                <code>0xBfde68c232F2248114429DDD9a7c3Adbff74bD7f</code>
              </div>
            </div>

            <h2>Add Gas Token (PNT)</h2>
            <div className="instructions">
              <p>
                Gas Tokens are what users pay with for gasless transactions.
              </p>

              <div className="code-block">
                <pre>{`// Add PNT token
await paymaster.addSupportedGasToken("0xD14E87d8D8B69016Fcc08728c33799bD3F66F180");`}</pre>
              </div>

              <div className="info-box small">
                <strong>PNT (GasTokenV2) on Sepolia:</strong>
                <code>0xD14E87d8D8B69016Fcc08728c33799bD3F66F180</code>
              </div>
            </div>

            <h2>Set Service Fee Rate</h2>
            <div className="instructions">
              <p>Configure your service fee (default: 2%, max: 10%)</p>

              <div className="code-block">
                <pre>{`// Set 2% service fee (200 basis points)
await paymaster.setServiceFeeRate(200);`}</pre>
              </div>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step1")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("step3")}
              >
                Next: Fund Treasury →
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Stake to EntryPoint */}
        {activeSection === "step3" && (
          <section className="content-section">
            <h1>⚡ Step 3: Stake to EntryPoint</h1>

            <div className="step-intro">
              <p>
                ERC-4337 requires Paymasters to stake ETH to the EntryPoint
                contract. We provide two approaches: Standard ERC-4337 flow and
                our improved Quick Stake flow.
              </p>
            </div>

            <h2>Understanding Staking Requirements</h2>
            <div className="info-box">
              <h4>Why Stake?</h4>
              <p>
                EntryPoint requires Paymaster operators to stake ETH as
                collateral to prevent spam and ensure service quality. This is
                an ERC-4337 standard requirement.
              </p>
            </div>

            <h2>Approach 1: Standard ERC-4337 Flow</h2>
            <div className="instructions">
              <p>
                Traditional 3-step process following ERC-4337 specification:
              </p>

              <h3>Step 3.1: Stake ETH to EntryPoint</h3>
              <div className="code-block">
                <pre>{`// Stake ETH to EntryPoint (minimum: 0.1 ETH)
const entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, signer);
await entryPoint.addStake(
  PAYMASTER_ADDRESS,
  86400, // unstake delay: 1 day
  { value: ethers.parseEther("0.1") }
);`}</pre>
              </div>

              <h3>Step 3.2: Deposit ETH for Gas Sponsorship</h3>
              <div className="code-block">
                <pre>{`// Deposit ETH to sponsor user transactions
await entryPoint.depositTo(
  PAYMASTER_ADDRESS,
  { value: ethers.parseEther("0.5") }
);`}</pre>
              </div>

              <h3>Step 3.3: Stake Gas Tokens (PNT)</h3>
              <div className="code-block">
                <pre>{`// Stake PNT tokens as payment reserve
const pntToken = new ethers.Contract(PNT_ADDRESS, ERC20_ABI, signer);
await pntToken.approve(PAYMASTER_ADDRESS, ethers.parseEther("1000"));

const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, signer);
await paymaster.stakeGasToken(
  PNT_ADDRESS,
  ethers.parseEther("1000")
);`}</pre>
              </div>

              <div className="info-box small">
                <strong>Total Required:</strong>
                <ul>
                  <li>0.1 ETH - EntryPoint stake (locked, refundable)</li>
                  <li>0.5 ETH - Gas sponsorship deposit (refillable)</li>
                  <li>1000 PNT - Gas token reserve</li>
                </ul>
              </div>
            </div>

            <h2>Approach 2: Quick Stake Flow (Recommended) 🚀</h2>
            <div className="instructions">
              <p>
                Our improved flow combines stake calculation with GToken+PNT
                staking,
                <strong> eliminating the need for repeated ETH deposits</strong>
                :
              </p>

              <h3>How It Works</h3>
              <div className="info-box">
                <p>
                  By staking <strong>GTokens</strong> (stable-value gas tokens)
                  and <strong>PNTs</strong>, the Paymaster can:
                </p>
                <ul>
                  <li>
                    ✅ Automatically convert GTokens to ETH for gas sponsorship
                  </li>
                  <li>✅ Maintain liquidity through PNT/xPNT pools</li>
                  <li>✅ Only need to refill PNTs (not ETH) in the future</li>
                </ul>
                <p>
                  <strong>Key Assumption:</strong> GTokens have relatively
                  stable value, ensuring sustainable ETH conversion for gas
                  sponsorship.
                </p>
              </div>

              <h3>Single-Step Stake</h3>
              <div className="code-block">
                <pre>{`// Quick Stake: Only stake GToken + deposit PNTs
const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, signer);

// Approve tokens
const gToken = new ethers.Contract(GTOKEN_ADDRESS, ERC20_ABI, signer);
const pntToken = new ethers.Contract(PNT_ADDRESS, ERC20_ABI, signer);

await gToken.approve(PAYMASTER_ADDRESS, ethers.parseEther("500"));
await pntToken.approve(PAYMASTER_ADDRESS, ethers.parseEther("1000"));

// Combined stake operation
await paymaster.quickStake(
  GTOKEN_ADDRESS,
  ethers.parseEther("500"), // GToken stake
  PNT_ADDRESS,
  ethers.parseEther("1000") // PNT deposit
);`}</pre>
              </div>

              <div className="success-box">
                <h4>✨ Advantages</h4>
                <ul>
                  <li>
                    🎯 <strong>No ETH maintenance</strong> - Just refill PNTs
                    when low
                  </li>
                  <li>
                    ⚡ <strong>Faster setup</strong> - Single transaction vs 3
                    transactions
                  </li>
                  <li>
                    💰 <strong>Cost efficient</strong> - Saves gas on multiple
                    approvals
                  </li>
                  <li>
                    🔄 <strong>Sustainable</strong> - GToken liquidity ensures
                    continuous operation
                  </li>
                </ul>
              </div>

              <div className="warning-box">
                <h4>⚠️ Requirements</h4>
                <ul>
                  <li>GToken must have stable market value</li>
                  <li>PNT/xPNT pool must have sufficient liquidity</li>
                  <li>Monitor PNT balance and refill when needed</li>
                </ul>
              </div>
            </div>

            <h2>Comparison</h2>
            <div className="instructions">
              <table>
                <thead>
                  <tr>
                    <th>Aspect</th>
                    <th>Standard Flow</th>
                    <th>Quick Stake Flow</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Transactions</td>
                    <td>3 separate txs</td>
                    <td>1 combined tx</td>
                  </tr>
                  <tr>
                    <td>Initial Deposit</td>
                    <td>0.6 ETH + 1000 PNT</td>
                    <td>500 GToken + 1000 PNT</td>
                  </tr>
                  <tr>
                    <td>Future Refills</td>
                    <td>Both ETH and PNT</td>
                    <td>Only PNT</td>
                  </tr>
                  <tr>
                    <td>Gas Costs</td>
                    <td>Higher (3 txs)</td>
                    <td>Lower (1 tx)</td>
                  </tr>
                  <tr>
                    <td>Complexity</td>
                    <td>Medium</td>
                    <td>Low</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step2")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("step4")}
              >
                Next: Test Transaction →
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Test Transaction */}
        {activeSection === "step4" && (
          <section className="content-section">
            <h1>🧪 Step 4: Test Transaction</h1>

            <div className="step-intro">
              <p>
                Send a test gasless transaction to verify your Paymaster works
                correctly.
              </p>
            </div>

            <h2>Testing Your Paymaster</h2>
            <div className="instructions">
              <p>You can test your Paymaster by:</p>
              <ol>
                <li>
                  Using the{" "}
                  <a
                    href="https://demo.aastar.io"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    End User Demo
                  </a>{" "}
                  (external testnet playground)
                </li>
                <li>Create an AA account</li>
                <li>Claim SBT and PNT tokens</li>
                <li>Send a gasless transaction using your Paymaster</li>
              </ol>
              <div className="info-box small">
                <strong>Note:</strong> This tutorial is for testnet learning
                only. For production deployment on mainnet, use{" "}
                <a href="/operator/deploy">Operator Portal</a>.
              </div>
            </div>

            <h2>What to Verify</h2>
            <div className="checklist">
              <div className="checklist-item">
                <input type="checkbox" id="verify1" />
                <label htmlFor="verify1">
                  <strong>Transaction Succeeds</strong>
                  <p>UserOp is accepted and executed by EntryPoint</p>
                </label>
              </div>

              <div className="checklist-item">
                <input type="checkbox" id="verify2" />
                <label htmlFor="verify2">
                  <strong>PNT Deducted from User</strong>
                  <p>User's PNT balance decreases by gas cost + fee</p>
                </label>
              </div>

              <div className="checklist-item">
                <input type="checkbox" id="verify3" />
                <label htmlFor="verify3">
                  <strong>Service Fee Collected</strong>
                  <p>Your treasury receives PNT service fee (2%)</p>
                </label>
              </div>

              <div className="checklist-item">
                <input type="checkbox" id="verify4" />
                <label htmlFor="verify4">
                  <strong>ETH Balance Decreased</strong>
                  <p>Paymaster treasury ETH used for gas sponsorship</p>
                </label>
              </div>
            </div>

            <div className="success-box">
              <h3>✅ Test Successful!</h3>
              <p>If all checks pass, your Paymaster is working correctly!</p>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step3")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("step5")}
              >
                Next: Register & Launch →
              </button>
            </div>
          </section>
        )}

        {/* Step 5: Register & Launch */}
        {activeSection === "step5" && (
          <section className="content-section">
            <h1>🎉 Step 5: Register & Launch</h1>

            <div className="step-intro">
              <p>
                Register your Paymaster in the SuperPaymaster Registry to make
                it discoverable.
              </p>
            </div>

            <h2>Register Your Paymaster</h2>
            <div className="instructions">
              <p>Submit your Paymaster information to the registry:</p>

              <div className="code-block">
                <pre>{`// Coming soon: Registry contract integration
// For now, submit via form at superpaymaster.aastar.io/register

Required Information:
- Paymaster Address
- Name (e.g., "MyDAO Community Paymaster")
- Description
- Supported SBTs
- Supported Gas Tokens
- Service Fee Rate
- Contact (Discord/Twitter)`}</pre>
              </div>
            </div>

            <h2>Promote Your Paymaster</h2>
            <div className="instructions">
              <ol>
                <li>
                  <strong>Share in Community</strong> - Post in your
                  Discord/Telegram
                </li>
                <li>
                  <strong>Integrate in dApp</strong> - Add Paymaster to your
                  application UI
                </li>
                <li>
                  <strong>Monitor Usage</strong> - Track transactions on
                  Etherscan
                </li>
                <li>
                  <strong>Adjust Fees</strong> - Optimize service fee based on
                  usage
                </li>
              </ol>
            </div>

            <div className="success-box large">
              <h2>🎉 Congratulations!</h2>
              <p>
                Your Community Paymaster is now live! Users can start making
                gasless transactions.
              </p>

              <h3>Next Steps:</h3>
              <ul>
                <li>Monitor treasury balance and refill as needed</li>
                <li>Track revenue from service fees</li>
                <li>Join operator community on Discord</li>
                <li>Share your success story!</li>
              </ul>

              <div className="cta-buttons">
                <a href="/explorer" className="cta-button primary">
                  View in Registry
                </a>
                <a
                  href="https://discord.gg/aastar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-button secondary"
                >
                  Join Community
                </a>
              </div>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step4")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("faq")}
              >
                FAQ →
              </button>
            </div>
          </section>
        )}

        {/* FAQ */}
        {activeSection === "faq" && (
          <section className="content-section">
            <h1>❓ Frequently Asked Questions</h1>

            <div className="faq-item">
              <h3>How much can I earn from operating a Paymaster?</h3>
              <p>
                Revenue depends on transaction volume. With default 2% fee and
                avg $2.50 gas cost: 1,000 txs/day = $50/day = $1,500/month. See{" "}
                <a href="/operator#calculator">revenue calculator</a>.
              </p>
            </div>

            <div className="faq-item">
              <h3>What happens if my treasury runs out of ETH?</h3>
              <p>
                Your Paymaster will stop sponsoring transactions. Users will see
                "Insufficient Paymaster deposit" error. Simply deposit more ETH
                to resume service.
              </p>
            </div>

            <div className="faq-item">
              <h3>Can I change the service fee after deployment?</h3>
              <p>
                Yes! Call <code>setServiceFeeRate()</code> with new rate (max
                10%). The change takes effect immediately for new transactions.
              </p>
            </div>

            <div className="faq-item">
              <h3>How do I add custom SBT or Gas Tokens?</h3>
              <p>
                Deploy your own ERC-721 (SBT) or ERC-20 (Gas Token) contract,
                then call <code>addSupportedSBT()</code> or{" "}
                <code>addSupportedGasToken()</code>.
              </p>
            </div>

            <div className="faq-item">
              <h3>Is there a limit to how many tokens I can support?</h3>
              <p>
                Yes. Maximum 5 SBTs and 10 Gas Tokens per Paymaster to ensure
                efficient gas usage.
              </p>
            </div>

            <div className="faq-item">
              <h3>Can I pause my Paymaster temporarily?</h3>
              <p>
                Yes! Call <code>pause()</code> to temporarily stop accepting
                transactions. Call <code>unpause()</code> to resume.
              </p>
            </div>

            <div className="faq-item">
              <h3>How do I withdraw collected PNT fees?</h3>
              <p>
                PNT fees accumulate in your treasury address. Transfer them out
                using standard ERC-20 transfer.
              </p>
            </div>

            <div className="faq-item">
              <h3>Where can I get help?</h3>
              <p>
                Join our{" "}
                <a
                  href="https://discord.gg/aastar"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord community
                </a>{" "}
                for support. Check{" "}
                <a
                  href="https://docs.aastar.io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  documentation
                </a>{" "}
                for detailed guides.
              </p>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step5")}
              >
                ← Back to Final Step
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
