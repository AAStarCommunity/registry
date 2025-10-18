import { useState } from "react";
import "./LaunchTutorial.css";

export function LaunchTutorial() {
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", title: "📖 Overview", icon: "📖" },
    { id: "prerequisites", title: "✅ Prerequisites", icon: "✅" },
    { id: "step1", title: "Step 1: Configure & Deploy", icon: "🚀" },
    { id: "step2", title: "Step 2: Check Wallet", icon: "💼" },
    { id: "step3", title: "Step 3: Select Stake Option", icon: "⚡" },
    { id: "step4", title: "Step 4: Prepare Resources", icon: "📦" },
    { id: "step5", title: "Step 5: Stake EntryPoint", icon: "🔒" },
    { id: "step6", title: "Step 6: Register Registry", icon: "📝" },
    { id: "step7", title: "Step 7: Manage", icon: "⚙️" },
    { id: "faq", title: "❓ FAQ", icon: "❓" },
  ];

  return (
    <div className="launch-guide">
      {/* Sidebar TOC */}
      <aside className="guide-sidebar">
        <div className="sidebar-header">
          <h2>🚀 Launch Tutorial</h2>
          <p>Learn the Paymaster Deployment Process</p>
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
            <h1>Launch Tutorial - Learn the Deployment Process</h1>
            <p className="lead">
              This tutorial teaches you the complete 7-step process for deploying
              and configuring a PaymasterV4 contract. This is an educational guide
              only - no actual wallet operations or transactions are performed here.
            </p>

            <div className="info-box">
              <h3>What You'll Learn</h3>
              <ul>
                <li>✅ How to select and switch networks (Sepolia, OP Sepolia, OP Mainnet, Mainnet)</li>
                <li>✅ How to configure and deploy a PaymasterV4 contract</li>
                <li>✅ How to check wallet requirements before deployment</li>
                <li>✅ The difference between Standard and Fast Stake options</li>
                <li>✅ How to prepare resources (ETH, GToken, PNT)</li>
                <li>✅ How to stake to EntryPoint for ERC-4337 compliance</li>
                <li>✅ How to register to the SuperPaymaster Registry</li>
                <li>✅ How to manage your deployed Paymaster</li>
              </ul>
            </div>

            <div className="warning-box">
              <h3>⚠️ Important Notes</h3>
              <ul>
                <li>
                  This is a <strong>teaching guide only</strong> - no actual deployments happen here
                </li>
                <li>
                  For real deployment, use the{" "}
                  <a href="/operator/wizard">Deployment Wizard</a>
                </li>
                <li>
                  Default network is <strong>Sepolia</strong>, but you can learn about all supported networks
                </li>
                <li>Total deployment time: ~15-30 minutes</li>
                <li>Estimated mainnet cost: ~0.13 ETH (~$325)</li>
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
                  <strong>Network-Specific Funds</strong>
                  <p>
                    For testnet: Get test ETH from faucets<br />
                    For mainnet: Have at least 0.15 ETH for deployment and staking
                  </p>
                  <a
                    href="https://sepoliafaucet.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sepolia Faucet →
                  </a>
                </label>
              </div>

              <div className="checklist-item">
                <input type="checkbox" id="prereq3" />
                <label htmlFor="prereq3">
                  <strong>Basic Blockchain Knowledge</strong>
                  <p>Understand transactions, gas fees, smart contracts, and ERC-4337</p>
                </label>
              </div>
            </div>

            <div className="cost-estimate">
              <h3>💎 Network-Specific Costs</h3>
              <table>
                <thead>
                  <tr>
                    <th>Network</th>
                    <th>Deployment</th>
                    <th>Staking</th>
                    <th>Total Estimate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sepolia (Testnet)</td>
                    <td>~0.03 ETH</td>
                    <td>~0.1 ETH</td>
                    <td>~0.13 ETH (Free test ETH)</td>
                  </tr>
                  <tr>
                    <td>OP Sepolia (Testnet)</td>
                    <td>~0.001 ETH</td>
                    <td>~0.05 ETH</td>
                    <td>~0.051 ETH (Free test ETH)</td>
                  </tr>
                  <tr>
                    <td>Optimism Mainnet</td>
                    <td>~0.002 ETH</td>
                    <td>~0.1 ETH</td>
                    <td>~0.102 ETH (~$250)</td>
                  </tr>
                  <tr>
                    <td>Ethereum Mainnet</td>
                    <td>~0.03 ETH</td>
                    <td>~0.1 ETH</td>
                    <td>~0.13 ETH (~$325)</td>
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
                Start Learning →
              </button>
            </div>
          </section>
        )}

        {/* Step 1: Configure & Deploy */}
        {activeSection === "step1" && (
          <section className="content-section">
            <h1>🚀 Step 1: Configure & Deploy Paymaster</h1>

            <div className="step-intro">
              <p>
                The first step is to select your target network and configure your
                Paymaster settings, then deploy the contract.
              </p>
            </div>

            <h2>1.1 Select Network</h2>
            <div className="instructions">
              <p>Choose which blockchain network to deploy to:</p>
              <div className="info-box">
                <h4>Supported Networks</h4>
                <ul>
                  <li><strong>Sepolia Testnet</strong> (Default) - Ethereum testnet, free test ETH</li>
                  <li><strong>OP Sepolia</strong> - Optimism testnet, lower gas fees</li>
                  <li><strong>Optimism Mainnet</strong> - Production L2, ~90% cheaper than Ethereum</li>
                  <li><strong>Ethereum Mainnet</strong> - Main Ethereum network, highest security</li>
                </ul>
              </div>
              <p className="note">
                💡 <strong>Tip:</strong> Start with Sepolia testnet to learn without spending real money!
              </p>
            </div>

            <h2>1.2 Configure Paymaster Settings</h2>
            <div className="instructions">
              <p>Fill in the configuration form with these parameters:</p>

              <h3>Community Name</h3>
              <div className="code-block">
                <p>Your community or project name (min 3 characters)</p>
                <code>Example: "MyDAO Community"</code>
              </div>

              <h3>Treasury Address</h3>
              <div className="code-block">
                <p>Ethereum address to receive collected fees</p>
                <code>Example: 0x1234567890123456789012345678901234567890</code>
              </div>

              <h3>Gas to USD Rate</h3>
              <div className="code-block">
                <p>Current GWEI to USD conversion rate</p>
                <code>Default: 4500 (adjust based on current gas prices)</code>
              </div>

              <h3>PNT Price (USD)</h3>
              <div className="code-block">
                <p>Price of your gas token in USD</p>
                <code>Default: 0.02</code>
              </div>

              <h3>Service Fee Rate</h3>
              <div className="code-block">
                <p>Your commission percentage (max 10%)</p>
                <code>Default: 2% (200 basis points)</code>
              </div>

              <h3>Max Gas Cost Cap</h3>
              <div className="code-block">
                <p>Maximum ETH to spend per transaction</p>
                <code>Default: 0.1 ETH</code>
              </div>

              <h3>Min Token Balance</h3>
              <div className="code-block">
                <p>Minimum PNT balance users must have</p>
                <code>Default: 100 PNT</code>
              </div>
            </div>

            <h2>1.3 Deploy Contract</h2>
            <div className="instructions">
              <p>
                After filling the form, the wizard will deploy your PaymasterV4
                contract to the selected network. The contract will be owned by
                your connected wallet address.
              </p>
              <div className="success-box">
                <h3>✅ After Deployment</h3>
                <p>You'll receive your Paymaster contract address, which you'll need for all subsequent steps.</p>
                <code>Example: 0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445</code>
              </div>
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
                Next: Check Wallet →
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Check Wallet */}
        {activeSection === "step2" && (
          <section className="content-section">
            <h1>💼 Step 2: Check Wallet Status</h1>

            <div className="step-intro">
              <p>
                Before proceeding with staking, the wizard checks your wallet
                to ensure you have sufficient funds for the deployment process.
              </p>
            </div>

            <h2>What Gets Checked</h2>
            <div className="instructions">
              <h3>ETH Balance</h3>
              <div className="info-box">
                <p>Required for gas fees and EntryPoint deposits</p>
                <ul>
                  <li>Minimum: 0.05 ETH (varies by network)</li>
                  <li>Recommended: 0.15 ETH (includes buffer)</li>
                </ul>
              </div>

              <h3>GToken Balance (if using Fast Stake)</h3>
              <div className="info-box">
                <p>Stable-value gas tokens for the improved staking flow</p>
                <ul>
                  <li>Minimum: 100 GToken</li>
                  <li>Used to maintain ETH liquidity automatically</li>
                </ul>
              </div>

              <h3>PNT Balance</h3>
              <div className="info-box">
                <p>Your community's gas payment token</p>
                <ul>
                  <li>Minimum: 1000 PNT</li>
                  <li>Users will pay for transactions using PNT</li>
                </ul>
              </div>
            </div>

            <h2>Wallet Status Display</h2>
            <div className="instructions">
              <p>The wizard will show you:</p>
              <ul>
                <li>✅ <strong>Sufficient</strong> - Balance meets requirements</li>
                <li>⚠️ <strong>Low</strong> - Balance below recommended amount</li>
                <li>❌ <strong>Insufficient</strong> - Balance too low to proceed</li>
              </ul>
            </div>

            <div className="warning-box">
              <h3>⚠️ If Balances Are Insufficient</h3>
              <p>
                The wizard provides links to acquire the needed tokens:
              </p>
              <ul>
                <li>ETH: Use faucets (testnet) or exchanges (mainnet)</li>
                <li>GToken: Acquire from DEX or token swap</li>
                <li>PNT: Get from community treasury or DEX</li>
              </ul>
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
                Next: Select Stake Option →
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Select Stake Option */}
        {activeSection === "step3" && (
          <section className="content-section">
            <h1>⚡ Step 3: Select Stake Option</h1>

            <div className="step-intro">
              <p>
                Choose between two staking approaches: Standard ERC-4337 flow
                or our improved Fast Stake flow.
              </p>
            </div>

            <h2>Option 1: Standard Stake</h2>
            <div className="instructions">
              <h3>Overview</h3>
              <p>
                Traditional 3-step process following ERC-4337 specification:
              </p>
              <ol>
                <li>Stake ETH to EntryPoint (0.1 ETH minimum)</li>
                <li>Deposit ETH for gas sponsorship (0.5 ETH recommended)</li>
                <li>Stake PNT tokens (1000 PNT minimum)</li>
              </ol>

              <h3>Requirements</h3>
              <div className="info-box">
                <ul>
                  <li>0.1 ETH - EntryPoint stake (locked, refundable)</li>
                  <li>0.5 ETH - Gas sponsorship deposit (refillable)</li>
                  <li>1000 PNT - Gas token reserve</li>
                </ul>
              </div>

              <h3>Pros & Cons</h3>
              <div className="info-box">
                <p><strong>Pros:</strong></p>
                <ul>
                  <li>✅ Standard ERC-4337 compliant</li>
                  <li>✅ No dependency on GToken liquidity</li>
                  <li>✅ Simple to understand</li>
                </ul>
                <p><strong>Cons:</strong></p>
                <ul>
                  <li>❌ Requires periodic ETH refills</li>
                  <li>❌ More transactions = higher gas costs</li>
                  <li>❌ Manual monitoring needed</li>
                </ul>
              </div>
            </div>

            <h2>Option 2: Fast Stake (Recommended) 🚀</h2>
            <div className="instructions">
              <h3>Overview</h3>
              <p>
                Our improved flow combines staking with GToken liquidity,
                eliminating the need for repeated ETH deposits:
              </p>
              <ol>
                <li>Stake GTokens (500 GToken)</li>
                <li>Stake PNT tokens (1000 PNT)</li>
              </ol>
              <p>
                The Paymaster automatically converts GTokens to ETH as needed
                for gas sponsorship, maintaining continuous operation.
              </p>

              <h3>Requirements</h3>
              <div className="info-box">
                <ul>
                  <li>500 GToken - Stable-value gas tokens</li>
                  <li>1000 PNT - Gas payment reserve</li>
                  <li>Small ETH amount for initial stake (~0.1 ETH)</li>
                </ul>
              </div>

              <h3>How It Works</h3>
              <div className="success-box">
                <p>
                  By staking <strong>GTokens</strong> (stable-value tokens)
                  and <strong>PNTs</strong>, the Paymaster can:
                </p>
                <ul>
                  <li>✅ Automatically convert GTokens to ETH for gas sponsorship</li>
                  <li>✅ Maintain liquidity through PNT/xPNT pools</li>
                  <li>✅ Only need to refill PNTs (not ETH) in the future</li>
                  <li>✅ Sustainable operation with stable-value assumption</li>
                </ul>
              </div>

              <h3>Pros & Cons</h3>
              <div className="info-box">
                <p><strong>Pros:</strong></p>
                <ul>
                  <li>✅ No ETH refills - just top up PNT when low</li>
                  <li>✅ Single transaction setup</li>
                  <li>✅ Lower total gas costs</li>
                  <li>✅ Automated ETH management</li>
                </ul>
                <p><strong>Cons:</strong></p>
                <ul>
                  <li>❌ Requires GToken acquisition</li>
                  <li>❌ Depends on GToken market liquidity</li>
                  <li>❌ Assumes GToken value stability</li>
                </ul>
              </div>
            </div>

            <h2>Comparison Table</h2>
            <div className="instructions">
              <table>
                <thead>
                  <tr>
                    <th>Aspect</th>
                    <th>Standard Stake</th>
                    <th>Fast Stake</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Transactions</td>
                    <td>3 separate</td>
                    <td>1 combined</td>
                  </tr>
                  <tr>
                    <td>Initial Deposit</td>
                    <td>0.6 ETH + 1000 PNT</td>
                    <td>500 GToken + 1000 PNT</td>
                  </tr>
                  <tr>
                    <td>Future Refills</td>
                    <td>ETH + PNT</td>
                    <td>PNT only</td>
                  </tr>
                  <tr>
                    <td>Maintenance</td>
                    <td>Manual</td>
                    <td>Automated</td>
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
                Next: Prepare Resources →
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Prepare Resources */}
        {activeSection === "step4" && (
          <section className="content-section">
            <h1>📦 Step 4: Prepare Resources</h1>

            <div className="step-intro">
              <p>
                Based on your chosen stake option, this step shows you exactly
                what resources you need and provides links to acquire them.
              </p>
            </div>

            <h2>Resource Checklist</h2>
            <div className="instructions">
              <p>The wizard displays a checklist showing:</p>
              <div className="checklist">
                <div className="checklist-item">
                  <input type="checkbox" id="res1" />
                  <label htmlFor="res1">
                    <strong>ETH Balance</strong>
                    <p>Current balance vs required amount</p>
                  </label>
                </div>

                <div className="checklist-item">
                  <input type="checkbox" id="res2" />
                  <label htmlFor="res2">
                    <strong>GToken Balance (Fast Stake only)</strong>
                    <p>Current balance vs required 500 GToken</p>
                  </label>
                </div>

                <div className="checklist-item">
                  <input type="checkbox" id="res3" />
                  <label htmlFor="res3">
                    <strong>PNT Balance</strong>
                    <p>Current balance vs required 1000 PNT</p>
                  </label>
                </div>
              </div>
            </div>

            <h2>How to Acquire Resources</h2>
            <div className="instructions">
              <h3>Getting ETH</h3>
              <div className="info-box">
                <p><strong>Testnet:</strong></p>
                <ul>
                  <li>Sepolia: <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer">Sepolia Faucet</a></li>
                  <li>OP Sepolia: <a href="https://app.optimism.io/faucet" target="_blank" rel="noopener noreferrer">OP Faucet</a></li>
                </ul>
                <p><strong>Mainnet:</strong></p>
                <ul>
                  <li>Buy from exchanges (Coinbase, Binance, etc.)</li>
                  <li>Bridge from other L2s using official bridges</li>
                </ul>
              </div>

              <h3>Getting GToken</h3>
              <div className="info-box">
                <ul>
                  <li>Swap on Uniswap or other DEXes</li>
                  <li>Contact your community treasury</li>
                  <li>Check the AAStar community Discord for test tokens</li>
                </ul>
              </div>

              <h3>Getting PNT</h3>
              <div className="info-box">
                <ul>
                  <li>Claim from community faucet</li>
                  <li>Purchase from DEX</li>
                  <li>Request from AAStar Discord</li>
                </ul>
              </div>
            </div>

            <h2>Refresh Wallet Status</h2>
            <div className="instructions">
              <p>
                After acquiring the needed resources, click "Refresh Wallet Status"
                to re-check your balances. The wizard will update the checklist
                and enable the "Continue" button when all requirements are met.
              </p>
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
                Next: Stake EntryPoint →
              </button>
            </div>
          </section>
        )}

        {/* Step 5: Stake to EntryPoint */}
        {activeSection === "step5" && (
          <section className="content-section">
            <h1>🔒 Step 5: Stake to EntryPoint</h1>

            <div className="step-intro">
              <p>
                This step executes the actual staking transactions to the
                ERC-4337 EntryPoint contract, making your Paymaster operational.
              </p>
            </div>

            <h2>What Happens in This Step</h2>
            <div className="instructions">
              <h3>For Standard Stake</h3>
              <div className="code-block">
                <pre>{`// Step 5.1: Stake ETH to EntryPoint
entryPoint.addStake(
  paymasterAddress,
  86400, // 1 day unstake delay
  { value: 0.1 ETH }
)

// Step 5.2: Deposit ETH for gas sponsorship
entryPoint.depositTo(
  paymasterAddress,
  { value: 0.5 ETH }
)

// Step 5.3: Stake PNT tokens
pntToken.approve(paymasterAddress, 1000 PNT)
paymaster.stakeGasToken(pntAddress, 1000 PNT)`}</pre>
              </div>

              <h3>For Fast Stake</h3>
              <div className="code-block">
                <pre>{`// Single combined transaction
gToken.approve(paymasterAddress, 500 GToken)
pntToken.approve(paymasterAddress, 1000 PNT)

paymaster.quickStake(
  gTokenAddress,
  500 GToken,
  pntAddress,
  1000 PNT
)`}</pre>
              </div>
            </div>

            <h2>What You'll See</h2>
            <div className="instructions">
              <p>During this step, the wizard will:</p>
              <ol>
                <li>Show transaction details before sending</li>
                <li>Request MetaMask approval for each transaction</li>
                <li>Display transaction status (pending, confirmed, failed)</li>
                <li>Show transaction hashes on Etherscan</li>
                <li>Update progress as each transaction completes</li>
              </ol>
            </div>

            <div className="warning-box">
              <h3>⚠️ Important Notes</h3>
              <ul>
                <li>Don't close the browser during transaction processing</li>
                <li>If a transaction fails, you can retry without losing progress</li>
                <li>MetaMask may show high gas estimates - this is normal for complex transactions</li>
                <li>Staked ETH has a 1-day unstake delay for security</li>
              </ul>
            </div>

            <div className="success-box">
              <h3>✅ After Completion</h3>
              <p>
                Your Paymaster is now staked to the EntryPoint and ready to
                sponsor transactions! The final step is registering to the
                public registry.
              </p>
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
                onClick={() => setActiveSection("step6")}
              >
                Next: Register Registry →
              </button>
            </div>
          </section>
        )}

        {/* Step 6: Register to Registry */}
        {activeSection === "step6" && (
          <section className="content-section">
            <h1>📝 Step 6: Register to Registry</h1>

            <div className="step-intro">
              <p>
                Register your Paymaster in the SuperPaymaster Registry to make
                it discoverable by developers and end users.
              </p>
            </div>

            <h2>Why Register?</h2>
            <div className="info-box">
              <h3>Benefits of Registration</h3>
              <ul>
                <li>✅ Your Paymaster appears in the public registry explorer</li>
                <li>✅ Developers can find and integrate your Paymaster</li>
                <li>✅ Users can search for community Paymasters</li>
                <li>✅ Increases visibility and transaction volume</li>
                <li>✅ Builds trust through public verification</li>
              </ul>
            </div>

            <h2>Registration Information</h2>
            <div className="instructions">
              <p>The wizard will submit the following information to the registry:</p>

              <h3>Basic Info</h3>
              <ul>
                <li><strong>Paymaster Address:</strong> Your deployed contract address</li>
                <li><strong>Community Name:</strong> From Step 1 configuration</li>
                <li><strong>Network:</strong> Selected network (Sepolia, OP Sepolia, etc.)</li>
                <li><strong>Owner Address:</strong> Your wallet address</li>
              </ul>

              <h3>Configuration Details</h3>
              <ul>
                <li><strong>Service Fee Rate:</strong> Your commission percentage</li>
                <li><strong>Supported Networks:</strong> Which chains your Paymaster operates on</li>
                <li><strong>Stake Type:</strong> Standard or Fast Stake</li>
                <li><strong>Status:</strong> Active, Paused, or Inactive</li>
              </ul>
            </div>

            <h2>The Registration Transaction</h2>
            <div className="instructions">
              <div className="code-block">
                <pre>{`// Register to SuperPaymaster Registry
registry.registerPaymaster(
  paymasterAddress,
  communityName,
  serviceFeeRate,
  ownerAddress
)`}</pre>
              </div>
              <p>
                This is a simple transaction that writes your Paymaster info to
                the on-chain registry contract. Gas cost is minimal (~0.001 ETH).
              </p>
            </div>

            <div className="success-box">
              <h3>✅ After Registration</h3>
              <p>
                Your Paymaster is now publicly listed! Users can:
              </p>
              <ul>
                <li>Find it in the <a href="/explorer">Registry Explorer</a></li>
                <li>View your configuration and stats</li>
                <li>Integrate it into their dApps</li>
                <li>Start using it for gasless transactions</li>
              </ul>
            </div>

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step5")}
              >
                ← Back
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("step7")}
              >
                Next: Manage Paymaster →
              </button>
            </div>
          </section>
        )}

        {/* Step 7: Manage Paymaster */}
        {activeSection === "step7" && (
          <section className="content-section">
            <h1>⚙️ Step 7: Manage Your Paymaster</h1>

            <div className="step-intro">
              <p>
                Congratulations! Your Paymaster is now deployed, staked, and registered.
                This final step shows you how to manage and monitor it.
              </p>
            </div>

            <div className="success-box large">
              <h2>🎉 Deployment Complete!</h2>
              <p>
                Your Community Paymaster is now live and ready to sponsor
                gasless transactions for your users!
              </p>
            </div>

            <h2>Management Dashboard</h2>
            <div className="instructions">
              <p>
                The management interface provides 4 tabs for operating your Paymaster:
              </p>

              <h3>1. Overview Tab</h3>
              <ul>
                <li>📊 Transaction statistics (total, today, this week)</li>
                <li>💰 Revenue from service fees</li>
                <li>📈 Usage graphs and trends</li>
                <li>⚡ Quick status indicators</li>
              </ul>

              <h3>2. Balance & Deposits Tab</h3>
              <ul>
                <li>💵 Current ETH balance in EntryPoint</li>
                <li>🪙 PNT token reserves</li>
                <li>🔄 GToken balance (if using Fast Stake)</li>
                <li>➕ Quick deposit buttons</li>
                <li>📉 Balance history and alerts</li>
              </ul>

              <h3>3. User Gas Records Tab</h3>
              <ul>
                <li>📋 Transaction history</li>
                <li>👤 User-by-user breakdown</li>
                <li>⛽ Gas costs and fees collected</li>
                <li>🔍 Search and filter transactions</li>
                <li>📥 Export data for analysis</li>
              </ul>

              <h3>4. Settings Tab</h3>
              <ul>
                <li>⚙️ Adjust service fee rate</li>
                <li>🎯 Update gas price parameters</li>
                <li>⏸️ Pause/unpause Paymaster</li>
                <li>🔒 Security settings</li>
                <li>📝 Update registry information</li>
              </ul>
            </div>

            <h2>Ongoing Operations</h2>
            <div className="instructions">
              <h3>Monitor Your Balances</h3>
              <div className="info-box">
                <p>Regularly check:</p>
                <ul>
                  <li><strong>ETH Balance:</strong> Refill when below 0.05 ETH</li>
                  <li><strong>PNT Balance:</strong> Maintain at least 500 PNT reserve</li>
                  <li><strong>GToken Balance:</strong> Keep above 100 GToken for auto-refill</li>
                </ul>
              </div>

              <h3>Adjust Fees</h3>
              <div className="info-box">
                <p>Optimize your service fee based on:</p>
                <ul>
                  <li>Transaction volume</li>
                  <li>Competitor rates</li>
                  <li>Community feedback</li>
                  <li>Operational costs</li>
                </ul>
              </div>

              <h3>Track Revenue</h3>
              <div className="info-box">
                <p>Monitor your earnings:</p>
                <ul>
                  <li>PNT fees accumulate in your treasury</li>
                  <li>Withdraw anytime via standard ERC-20 transfer</li>
                  <li>Export transaction data for accounting</li>
                </ul>
              </div>
            </div>

            <h2>Next Steps</h2>
            <div className="instructions">
              <ol>
                <li>
                  <strong>Promote Your Paymaster</strong>
                  <p>Share in your community Discord, Twitter, etc.</p>
                </li>
                <li>
                  <strong>Integrate in Your dApp</strong>
                  <p>Add Paymaster to your application's transaction flow</p>
                </li>
                <li>
                  <strong>Join the Community</strong>
                  <p>Connect with other operators on <a href="https://discord.gg/aastar" target="_blank" rel="noopener noreferrer">Discord</a></p>
                </li>
                <li>
                  <strong>Monitor & Optimize</strong>
                  <p>Track usage, adjust fees, and improve service</p>
                </li>
              </ol>
            </div>

            <div className="cta-buttons">
              <a href="/operator/wizard" className="cta-button primary">
                Start Real Deployment →
              </a>
              <a href="/explorer" className="cta-button secondary">
                View Registry
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

            <div className="button-group">
              <button
                className="prev-button"
                onClick={() => setActiveSection("step6")}
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
              <h3>Which network should I deploy to?</h3>
              <p>
                For learning and testing: <strong>Sepolia</strong> (free test ETH, identical to mainnet)<br />
                For production with lower fees: <strong>Optimism Mainnet</strong> (~90% cheaper gas)<br />
                For maximum security: <strong>Ethereum Mainnet</strong> (highest decentralization)
              </p>
            </div>

            <div className="faq-item">
              <h3>Should I choose Standard or Fast Stake?</h3>
              <p>
                <strong>Fast Stake is recommended</strong> if you can acquire GTokens.
                It saves gas costs and eliminates the need for manual ETH refills.
                Use Standard Stake if GTokens are unavailable or you prefer the
                traditional ERC-4337 approach.
              </p>
            </div>

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
                to resume service. With Fast Stake, this happens less frequently.
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
              <h3>Can I deploy the same Paymaster to multiple networks?</h3>
              <p>
                Yes, but each network requires a separate deployment. Your
                Paymaster address will be different on each network. You can
                manage all deployments from the same management dashboard.
              </p>
            </div>

            <div className="faq-item">
              <h3>How do I pause my Paymaster temporarily?</h3>
              <p>
                Yes! Call <code>pause()</code> to temporarily stop accepting
                transactions. Call <code>unpause()</code> to resume. This is
                useful for maintenance or emergencies.
              </p>
            </div>

            <div className="faq-item">
              <h3>How do I withdraw my staked ETH?</h3>
              <p>
                Call <code>unlockStake()</code>, then wait 1 day (unstake delay),
                then call <code>withdrawStake()</code>. The delay is a security
                feature required by ERC-4337.
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
                onClick={() => setActiveSection("step7")}
              >
                ← Back to Final Step
              </button>
              <button
                className="next-button"
                onClick={() => setActiveSection("overview")}
              >
                Back to Overview
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
