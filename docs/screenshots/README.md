# Screenshots 截图说明

本目录包含 SuperPaymaster Registry 应用的真实界面截图。

## 📸 Wizard 部署流程截图 (Deploy Wizard Flow)

完整的 7 步 Paymaster 部署向导界面截图,包括桌面版和移动端。

### 桌面版 (Desktop - 1920x1080)

| 文件名 | 说明 | 尺寸 |
|--------|------|------|
| `00-landing-page.png` | 🏠 主页 - Launch Paymaster 入口 | 452K |
| `01-step1-configuration.png` | ⚙️ Step 1: Configuration - 配置参数 | 334K |
| `02-step2-wallet-check.png` | 💼 Step 2: Check Wallet - 钱包资源检查 | 522K |
| `03a-step3-stake-option.png` | ⚡ Step 3: Select Stake Option（未选择） | 675K |
| `03b-step3-stake-selected.png` | ⚡ Step 3: Standard 模式已选中 | 831K |
| `03c-step3-super-mode-selected.png` | ⚡ Step 3: Super 模式已选中 | 856K |
| `04-step4-resource-preparation.png` | 📦 Step 4: Prepare Resources - 资源准备 | 525K |
| `05-step5-deposit-entrypoint.png` | 🔒 Step 5: Stake - 质押界面 | 276K |

### 移动端 (Mobile - 375x812)

| 文件名 | 说明 | 尺寸 |
|--------|------|------|
| `mobile-00-landing.png` | 📱 主页（移动端） | 386K |
| `mobile-01-step1.png` | 📱 Step 1: 配置（移动端） | 289K |
| `mobile-03-step3.png` | 📱 Step 3: 质押选项（移动端） | 570K |

### Wizard 流程说明

**完整 7 步流程**:
1. **⚙️ Step 1 - Configuration**: 配置 Paymaster 部署参数
2. **💼 Step 2 - Check Wallet**: 检查 ETH、GToken、PNTs、aPNTs 余额
3. **⚡ Step 3 - Select Stake Option**: 选择 Standard 或 Super 模式
4. **📦 Step 4 - Prepare Resources**: 验证所需资源是否就绪
5. **🔒 Step 5 - Stake**: 根据 Step 3 选择动态路由
   - Standard 模式 → Stake to EntryPoint v0.7
   - Super 模式 → Stake to SuperPaymaster V2
6. **📝 Step 6 - Register to Registry**: 注册到 SuperPaymaster Registry
7. **🚀 Step 7 - Manage Paymaster**: 部署完成,进入管理界面

**Test Mode**: 使用 `?testMode=true` 参数可跳过真实钱包连接,使用 Mock 数据进行测试。

---

## 📋 其他界面截图

### 门户和浏览器

| 文件名 | 说明 | 尺寸 |
|--------|------|------|
| `01-landing-page.png` | 主页（旧版）- 显示平台统计和功能入口 | 436K |
| `02-operator-portal.png` | 操作员门户 - 部署和管理 Paymaster | 969K |
| `03-developer-portal.png` | 开发者门户 - 集成文档和工具 | 448K |
| `04-explorer.png` | 浏览器 - 查找已注册的 Paymaster | 478K |

### 管理界面

| 文件名 | 说明 | 尺寸 |
|--------|------|------|
| `05-manage-overview.png` | 管理概览（旧版） | 82K |
| `06-manage-config-tab.png` | 配置 Tab（旧版） | 82K |
| `07-manage-config-tab.png` | 配置 Tab - 7 个可编辑参数 | 322K |
| `08-manage-entrypoint-tab.png` | EntryPoint Tab - 余额和质押状态 | 267K |
| `09-manage-registry-tab.png` | Registry Tab - 质押信息 | 252K |
| `10-manage-tokens-tab.png` | Token Management Tab - SBT 和 Gas Token | 280K |

## 使用说明

### 在 Markdown 中引用

```markdown
![Landing Page](screenshots/01-landing-page.png)
```

### 相对路径

从 `docs/` 目录引用：
```markdown
![Landing Page](screenshots/01-landing-page.png)
```

从项目根目录引用：
```markdown
![Landing Page](docs/screenshots/01-landing-page.png)
```

## 截图详情

### 1. 主页 (01-landing-page.png)

**内容**:
- 标题: SuperPaymaster Registry
- 副标题: Decentralized Gasless Transaction Infrastructure for Ethereum
- 三个主要按钮: Explore Registry、Developer Portal、Operator Portal
- 统计数据: 114 Community Paymasters、52,648 Gasless Transactions、$3,368 Gas Fees Saved
- 特性卡片: True Decentralization、Flexible Payment Models、Developer Friendly
- Call to Action: Launch Your Paymaster、Try Live Demo

### 2. 操作员门户 (02-operator-portal.png)

**内容**:
- 页面标题: Operators Portal
- 主要操作:
  - Deploy New Paymaster
  - Manage Existing Paymaster
  - View Earnings Dashboard
  - Access Documentation

### 3. 开发者门户 (03-developer-portal.png)

**内容**:
- 页面标题: Developer Portal
- SDK 文档
- 集成示例代码
- API 参考

### 4. 浏览器 (04-explorer.png)

**内容**:
- 页面标题: Paymaster Explorer
- Paymaster 列表
- 筛选选项: Active Only、Staked Only、Low Fee
- 每个卡片显示: Address、Balance、Fee、Staked 状态

### 7. 配置 Tab (07-manage-config-tab.png)

**内容**:
- Header: Manage Paymaster
- Address: Paymaster 地址
- Your Address: 用户地址
- Owner Badge: 👑 Owner
- Tab 导航: Configuration（活跃）、EntryPoint、Registry、Token Management
- 配置参数表格（7 行）:
  1. Owner
  2. Treasury
  3. Gas to USD Rate
  4. PNT Price (USD)
  5. Service Fee Rate
  6. Max Gas Cost Cap
  7. Min Token Balance
- 每行都有 [Edit] 按钮
- Pause Control 区域
- Refresh Data 按钮

### 8. EntryPoint Tab (08-manage-entrypoint-tab.png)

**内容**:
- Tab: EntryPoint（活跃）
- EntryPoint v0.7 Status 卡片
- 显示字段:
  - Balance
  - Deposit
  - Staked
  - Stake Amount
  - Unstake Delay
  - Withdraw Time
- 说明文字

### 9. Registry Tab (09-manage-registry-tab.png)

**内容**:
- Tab: Registry（活跃）
- Registry v1.2 Status 卡片
- 显示字段:
  - Stake Amount (GToken)
- 说明文字

### 10. Token Management Tab (10-manage-tokens-tab.png)

**内容**:
- Tab: Token Management（活跃）
- 两个管理卡片:
  1. Supported SBT (Soul-Bound Tokens)
     - 输入框: SBT Contract Address
     - [Check Status] 按钮
     - 状态显示
     - [Add SBT] / [Remove SBT] 按钮
  2. Supported Gas Tokens
     - 输入框: Gas Token Contract Address
     - [Check Status] 按钮
     - 状态显示
     - [Add Gas Token] / [Remove Gas Token] 按钮

## 截图生成脚本

### 🚀 自动生成 Wizard 流程截图

```bash
# 生成所有 Wizard 流程截图（桌面版 + 移动端）
npx playwright test e2e/capture-wizard-screenshots.spec.ts --project=chromium

# 只生成主要流程截图
npx playwright test e2e/capture-wizard-screenshots.spec.ts --project=chromium -g "Capture complete wizard flow"

# 只生成移动端截图
npx playwright test e2e/capture-wizard-screenshots.spec.ts --project=chromium -g "Capture mobile views"
```

### 自动生成其他界面截图

```bash
# 运行完整截图脚本（门户和管理界面）
npx tsx scripts/capture-screenshots.ts

# 只捕获管理界面
npx tsx scripts/capture-manage-tabs.ts
```

### 手动捕获单个截图

```typescript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 }
});

await page.goto('http://localhost:5173/');
await page.screenshot({
  path: 'screenshot.png',
  fullPage: true
});

await browser.close();
```

## 注意事项

1. **分辨率**:
   - 桌面版: 1920x1080 (Wizard 流程)
   - 移动端: 375x812 (iPhone X)
   - 门户界面: 1280x720 (旧版截图)
2. **格式**: PNG 格式，保证清晰度
3. **完整页面**: 使用 `fullPage: true` 捕获完整页面
4. **Test Mode**: Wizard 流程截图使用 `?testMode=true` 参数，绕过真实钱包连接
5. **Mock 数据**: 截图使用 Mock 数据生成测试界面
6. **更新**: 如果 UI 有变化，重新运行对应的截图脚本

## 版本

- **创建日期**: 2025-10-17
- **更新日期**: 2025-10-23 (添加 Wizard 流程截图)
- **版本**: v1.1
- **作者**: AAStar Community
