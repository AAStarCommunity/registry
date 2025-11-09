# AOA+ Step3 Implementation Guide

**日期**: 2025-11-09
**目标**: 完成 AOA+ 模式 Step3 的安全警示、注册逻辑和信息显示

---

## 📋 任务清单

- [ ] **任务3**: 添加安全警示区域（类似 AOA 模式的多签警示）
- [ ] **任务4**: 添加 SuperPaymaster 注册交易逻辑
- [ ] **任务5**: 添加 SuperPaymaster 信息卡片

---

## 任务3: 添加安全警示区域

### 位置
`src/pages/operator/deploy-v2/steps/Step3_Complete.tsx` 第158-213行之后

### 实现代码

```tsx
{/* Security Recommendation (AOA+ Mode) */}
{mode === "aoa+" && (
  <div className="security-recommendation">
    <div className="recommendation-header">
      <span className="icon">🔐</span>
      <h3>Security Recommendation: Create Community Multisig Vault</h3>
    </div>
    <div className="recommendation-content">
      <p>
        For production use, we recommend creating a <strong>Gnosis Safe multisig wallet</strong> to manage your community resources securely.
      </p>
      <div className="recommendation-benefits">
        <div className="benefit-item">
          <span className="check">✅</span>
          <span>Prevent single point of failure (lost private key)</span>
        </div>
        <div className="benefit-item">
          <span className="check">✅</span>
          <span>Require multiple approvals for critical operations</span>
        </div>
        <div className="benefit-item">
          <span className="check">✅</span>
          <span>Enable team-based governance</span>
        </div>
      </div>
      <div className="recommendation-actions">
        <a
          href="https://app.safe.global/new-safe/create"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-create-safe"
        >
          🛡️ Create Gnosis Safe Multisig ↗
        </a>
        <a
          href={communityAddress ? `/explorer/community/${communityAddress}` : "/explorer"}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-transfer"
        >
          🔄 Manage Community (Transfer Ownership) ↗
        </a>
      </div>
      <div className="recommendation-note">
        <strong>Note:</strong> After creating a Safe multisig wallet:
        <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
          <li>Click "Manage Community" to open your community management page</li>
          <li>Connect your current wallet (owner account)</li>
          <li>Use the "Edit" button on "Owner Address" to transfer ownership to your Safe wallet address</li>
          <li>The page supports both MetaMask and Safe App modes</li>
        </ol>
      </div>
    </div>
  </div>
)}
```

**CSS**: 已存在于 `Step3_Complete.css`，无需修改

---

## 任务4: 添加 SuperPaymaster 注册交易逻辑

### 问题分析

**当前流程**:
Step2 (资源检查通过) → 直接跳转 Step3 (Complete)

**缺失环节**:
没有调用 SuperPaymaster 的 `registerOperator` 和 `depositAPNTs`

### 解决方案

#### 选项A: 在 Step3 初始化时执行注册

**优点**: 最小改动，保持现有流程
**缺点**: 用户可能不知道正在执行交易

#### 选项B: 在 Step2 和 Step3 之间插入注册步骤

**优点**: 用户体验更清晰
**缺点**: 需要修改 Wizard 流程

**推荐**: 使用选项A（最小改动）

### 实现代码

#### 1. 添加状态（Step3_Complete.tsx 第26行之后）

```tsx
export function Step3_Complete({ mode, resources, onRestart }: Step3Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const networkConfig = getCurrentNetworkConfig();
  const mySBTAddress = networkConfig.contracts.mySBT;
  const [communityAddress, setCommunityAddress] = useState<string>("");

  // AOA+ 注册状态
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationError, setRegistrationError] = useState<string>("");
  const [superPaymasterInfo, setSuperPaymasterInfo] = useState<{
    stGTokenLocked: string;
    aPNTsBalance: string;
    reputationLevel: number;
    treasury: string;
  } | null>(null);

  // ... existing code ...
```

#### 2. 添加注册函数

```tsx
// Check if already registered in SuperPaymaster
const checkSuperPaymasterRegistration = async (address: string) => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const superPaymasterAddress = networkConfig.contracts.superPaymaster;

    // 简化的 ABI（只需要 accounts 函数）
    const abi = [
      "function accounts(address) external view returns (uint256 stGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused)"
    ];

    const superPaymaster = new ethers.Contract(superPaymasterAddress, abi, provider);
    const account = await superPaymaster.accounts(address);

    // stakedAt > 0 表示已注册
    if (account.stakedAt > 0n) {
      setIsRegistered(true);
      setSuperPaymasterInfo({
        stGTokenLocked: ethers.formatEther(account.stGTokenLocked),
        aPNTsBalance: ethers.formatEther(account.aPNTsBalance),
        reputationLevel: Number(account.reputationLevel),
        treasury: account.treasury,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to check SuperPaymaster registration:", err);
    return false;
  }
};

// Register to SuperPaymaster
const registerToSuperPaymaster = async () => {
  if (!communityAddress || mode !== "aoa+") return;

  setIsRegistering(true);
  setRegistrationError("");

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const superPaymasterAddress = networkConfig.contracts.superPaymaster;
    const gTokenStakingAddress = networkConfig.contracts.gTokenStaking;
    const aPNTsAddress = networkConfig.contracts.aPNTs;

    // SuperPaymaster ABI
    const superPaymasterABI = [
      "function registerOperator(uint256 stGTokenAmount, address[] memory supportedSBTs, address xPNTsToken, address treasury) external",
      "function depositAPNTs(uint256 amount) external"
    ];

    // ERC20 ABI (for approve)
    const erc20ABI = [
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];

    const superPaymaster = new ethers.Contract(superPaymasterAddress, superPaymasterABI, signer);
    const stGToken = new ethers.Contract(networkConfig.contracts.gToken, erc20ABI, signer);
    const aPNTs = new ethers.Contract(aPNTsAddress, erc20ABI, signer);

    // 参数
    const stakeAmount = ethers.parseEther("50"); // 50 GT
    const initialAPNTs = ethers.parseEther("1000"); // 1000 aPNTs
    const supportedSBTs = [mySBTAddress];
    const xPNTsToken = resources.xPNTsAddress || ethers.ZeroAddress;
    const treasury = communityAddress; // 使用社区所有者作为 treasury

    console.log("=== Starting SuperPaymaster Registration ===");
    console.log("Stake Amount:", ethers.formatEther(stakeAmount), "GT");
    console.log("Initial aPNTs:", ethers.formatEther(initialAPNTs));
    console.log("Supported SBTs:", supportedSBTs);
    console.log("xPNTs Token:", xPNTsToken);
    console.log("Treasury:", treasury);

    // Step 1: Approve stGToken
    console.log("Step 1: Approving stGToken...");
    const approveTx1 = await stGToken.approve(gTokenStakingAddress, stakeAmount);
    await approveTx1.wait();
    console.log("✅ stGToken approved");

    // Step 2: Register Operator
    console.log("Step 2: Registering operator...");
    const registerTx = await superPaymaster.registerOperator(
      stakeAmount,
      supportedSBTs,
      xPNTsToken,
      treasury
    );
    await registerTx.wait();
    console.log("✅ Operator registered");

    // Step 3: Approve aPNTs
    console.log("Step 3: Approving aPNTs...");
    const approveTx2 = await aPNTs.approve(superPaymasterAddress, initialAPNTs);
    await approveTx2.wait();
    console.log("✅ aPNTs approved");

    // Step 4: Deposit aPNTs
    console.log("Step 4: Depositing aPNTs...");
    const depositTx = await superPaymaster.depositAPNTs(initialAPNTs);
    await depositTx.wait();
    console.log("✅ aPNTs deposited");

    console.log("=== Registration Complete ===");

    // Refresh SuperPaymaster info
    await checkSuperPaymasterRegistration(communityAddress);

    setIsRegistering(false);
  } catch (err: any) {
    console.error("Failed to register to SuperPaymaster:", err);
    setRegistrationError(err.message || "Registration failed");
    setIsRegistering(false);
  }
};
```

#### 3. 添加 useEffect 检查注册状态

```tsx
// Check SuperPaymaster registration on mount (AOA+ mode only)
useEffect(() => {
  if (mode === "aoa+" && communityAddress) {
    checkSuperPaymasterRegistration(communityAddress).then((registered) => {
      if (!registered && !isRegistering) {
        // 自动开始注册流程
        registerToSuperPaymaster();
      }
    });
  }
}, [mode, communityAddress]);
```

---

## 任务5: 添加 SuperPaymaster 信息卡片

### 位置
`Step3_Complete.tsx` Deployment Summary 区域，Balances 卡片之后

### 实现代码

```tsx
{/* SuperPaymaster Registration (AOA+ mode) */}
{mode === "aoa+" && (
  <div className="summary-card highlight">
    <div className="card-icon">🌟</div>
    <div className="card-content">
      <h4>SuperPaymaster Registration</h4>
      {isRegistering ? (
        <p className="card-detail">⏳ Registering to SuperPaymaster...</p>
      ) : registrationError ? (
        <>
          <p className="card-detail error">❌ Registration failed</p>
          <p className="card-detail">{registrationError}</p>
          <button
            onClick={registerToSuperPaymaster}
            className="retry-btn"
            style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Retry Registration
          </button>
        </>
      ) : isRegistered && superPaymasterInfo ? (
        <>
          <p className="card-detail">
            ✅ Registered
          </p>
          <p className="card-detail">
            Staked: {superPaymasterInfo.stGTokenLocked} stGToken
          </p>
          <p className="card-detail">
            aPNTs Balance: {superPaymasterInfo.aPNTsBalance}
          </p>
          <p className="card-detail">
            Reputation Level: {superPaymasterInfo.reputationLevel}/12
          </p>
          <a
            href={getExplorerLink(networkConfig.contracts.superPaymaster)}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
          >
            View SuperPaymaster Contract ↗
          </a>
        </>
      ) : (
        <p className="card-detail">⏸️ Checking registration status...</p>
      )}
    </div>
  </div>
)}
```

### CSS 样式（已存在）

`.summary-card.highlight` 样式已在 `Step3_Complete.css` 中定义，无需修改。

对于 error 样式，添加：

```css
.card-detail.error {
  color: #ef4444;
  font-weight: 600;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.retry-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}
```

---

## 🔧 SuperPaymaster ABI

完整的 ABI 需要从 `@aastar/shared-config` 导入，或者使用简化版本：

```typescript
// 在 src/config/abis.ts 添加
export const SuperPaymasterABI = [
  // Read functions
  "function accounts(address operator) external view returns (uint256 stGTokenLocked, uint256 stakedAt, uint256 aPNTsBalance, uint256 totalSpent, uint256 lastRefillTime, uint256 minBalanceThreshold, address[] supportedSBTs, address xPNTsToken, address treasury, uint256 exchangeRate, uint256 reputationScore, uint256 consecutiveDays, uint256 totalTxSponsored, uint256 reputationLevel, uint256 lastCheckTime, bool isPaused)",
  "function minOperatorStake() external view returns (uint256)",
  "function minAPNTsBalance() external view returns (uint256)",

  // Write functions
  "function registerOperator(uint256 stGTokenAmount, address[] memory supportedSBTs, address xPNTsToken, address treasury) external",
  "function depositAPNTs(uint256 amount) external",
  "function updateTreasury(address newTreasury) external",
  "function updateExchangeRate(uint256 newRate) external",

  // Events
  "event OperatorRegistered(address indexed operator, uint256 stakedAmount, uint256 timestamp)",
  "event aPNTsDeposited(address indexed operator, uint256 amount, uint256 timestamp)"
];
```

---

## 📝 测试清单

### 测试场景

1. **新用户 AOA+ 注册流程**
   - [ ] Step1: 选择 AOA+ 模式
   - [ ] Step2: 资源检查通过（显示 PaymasterFactory 检查卡片）
   - [ ] Step3: 自动开始注册
   - [ ] 交易1: Approve stGToken
   - [ ] 交易2: registerOperator
   - [ ] 交易3: Approve aPNTs
   - [ ] 交易4: depositAPNTs
   - [ ] 显示 SuperPaymaster 信息卡片

2. **已注册用户返回 Step3**
   - [ ] 检测到已注册
   - [ ] 直接显示 SuperPaymaster 信息
   - [ ] 不执行重复注册

3. **注册失败重试**
   - [ ] 显示错误信息
   - [ ] Retry 按钮可用
   - [ ] 点击 Retry 重新执行注册

4. **安全警示显示**
   - [ ] AOA+ 模式显示黄色安全警示卡片
   - [ ] Create Safe 链接正确
   - [ ] Manage Community 链接正确

---

## 🚨 注意事项

1. **Gas 费用**: 注册需要 4 笔交易，确保用户有足够 ETH
2. **错误处理**: 如果任何一步失败，需要清晰提示用户
3. **状态持久化**: 考虑使用 localStorage 缓存注册状态
4. **合约地址**: 确保 `networkConfig.contracts.superPaymaster` 已配置

---

## 🔗 相关文档

- SuperPaymaster 合约分析: `docs/SuperPaymaster-v2-Analysis.md`
- 多签支持方案: `docs/multisig-support-plan.md`
- Registry 管理文档: `registry/docs/aoa-plus-step3-implementation-guide.md` (本文档)

---

**文档版本**: v1.0
**最后更新**: 2025-11-09
**维护者**: AAstar Dev Team
