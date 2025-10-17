# Screenshots 截图说明

本目录包含 SuperPaymaster Registry 应用的真实界面截图。

## 截图列表

| 文件名 | 说明 | 尺寸 |
|--------|------|------|
| `01-landing-page.png` | 主页 - 显示平台统计和功能入口 | 436K |
| `02-operator-portal.png` | 操作员门户 - 部署和管理 Paymaster | 969K |
| `03-developer-portal.png` | 开发者门户 - 集成文档和工具 | 448K |
| `04-explorer.png` | 浏览器 - 查找已注册的 Paymaster | 478K |
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

### 自动生成所有截图

```bash
# 运行完整截图脚本
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

1. **分辨率**: 所有截图使用 1280x720 分辨率
2. **格式**: PNG 格式，保证清晰度
3. **完整页面**: 使用 `fullPage: true` 捕获完整页面
4. **Mock 数据**: 截图使用 MetaMask Mock 生成测试数据
5. **更新**: 如果 UI 有变化，重新运行截图脚本

## 版本

- **创建日期**: 2025-10-17
- **版本**: v1.0
- **作者**: AAStar Community
