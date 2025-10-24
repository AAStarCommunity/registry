# Registry Project - Change Log

> **历史记录已归档**: 2025-10-24 之前的完整更改历史已备份至 `Changes.backup-20251024-222050.md`

本文档记录 AAStar Registry 项目的开发进展和重要变更。

---

## 2025-10-24 - 修复硬编码合约地址问题

### 问题描述
发现多个文件中存在硬编码的合约地址，而不是从环境变量读取配置。这导致：
1. .env 配置文件中的错误地址（Community Registry）无法被使用
2. 部署向导和管理界面使用了不一致的地址
3. 缺乏灵活性，无法通过环境变量切换不同的合约部署

### 修复内容

#### 1. Step6_RegisterRegistry.tsx (src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry.tsx:15-23)
- 修复前：硬编码 REGISTRY_V1_2 和 GTOKEN_ADDRESS
- 修复后：从 import.meta.env 读取配置，保留 fallback 值

#### 2. ManagePaymasterFull.tsx (src/pages/operator/ManagePaymasterFull.tsx:18-24)
- 修复前：硬编码 ENTRY_POINT_V07 和 REGISTRY_V1_2
- 修复后：从 import.meta.env 读取配置，保留 fallback 值

#### 3. Step5_Stake.tsx (src/pages/operator/deploy-v2/steps/Step5_Stake.tsx:51-54)
- 修复前：硬编码 ENTRY_POINT_V07
- 修复后：从 import.meta.env 读取配置，保留 fallback 值

#### 4. .env 文件更新
- 修复 REGISTRY_ADDRESS: 从错误地址 0x6806...043 改为正确地址 0x838...eF0
- 新增 ENTRY_POINT_V07 配置

### 验证结果
- ✅ 所有文件现在从环境变量读取地址配置
- ✅ 保留 fallback 值以确保向后兼容
- ✅ .env 配置已更正为正确的 SuperPaymasterRegistry_v1_2 地址
- ✅ 部署向导、管理界面、仪表盘分析都使用统一的合约地址

### 影响范围
- Paymaster 注册流程
- Paymaster 管理界面
- EntryPoint 质押流程
- 数据分析和仪表盘查询

### 关键合约地址
- **SuperPaymasterRegistry_v1_2**: `0x838da93c815a6E45Aa50429529da9106C0621eF0`
- **EntryPoint v0.7**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **GToken**: `0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35`

### Commits
- `7b4c6cd` - refactor: replace hardcoded addresses with environment variables
- `764b7f4` - docs: 添加硬编码地址修复的进度报告

---

## 2025-10-24 - Phase 1 UI 改进完成

### 问题描述
根据用户反馈，完成 Phase 1 的紧急修复和功能改进，包括：
- Registry 链接错误修复
- AOA 模式警告注释
- 管理页面链接添加
- Revenue Calculator 交互式改进

### 实现内容

#### 1. Registry 链接修复 (src/pages/analytics/AnalyticsDashboard.tsx:189)
- 修复前：`/paymaster/${pm.address}` （错误路径）
- 修复后：`/explorer/${pm.address}` （正确路径）
- 影响：Paymaster 列表中的详情链接现在正确指向 explorer 页面

#### 2. Step1 AOA 警告横幅 (src/pages/operator/deploy-v2/steps/)
- 添加 Enhanced ERC-4337 Flow: AOA Mode 警告横幅
- 内容包括：
  - Relies on PaymasterV4.1 enhanced contract
  - Requires ETH and stGToken resources
  - AOA (Account Owned Address) 技术说明
  - SBT identity verification + xPNTs 免 gas 支付说明
- 新增 CSS 样式：.aoa-warning-banner（黄色渐变背景 + 边框）

#### 3. 管理页面链接 (src/pages/operator/deploy-v2/steps/Step7_Complete.tsx)
- 在 "Adjust Parameters" (Step 3) 添加 "Manage Paymaster →" 按钮
- 在 "Monitor Treasury" (Step 4) 添加 "Manage Paymaster →" 按钮
- 点击按钮跳转到 `/operator/manage?address=${paymasterAddress}`

#### 4. Revenue Calculator 改进 (src/pages/OperatorsPortal.tsx)
**功能增强:**
- 添加 React useState 状态管理
- 实时自动计算（无需重新计算按钮）
- 输入值改变时立即更新结果

**参数调整:**
- Gas Cost 单位从 USD 改为 ETH
- 默认值从 2.50 USD 改为 0.0001 ETH
- 输入框 step 从 0.01 改为 0.0001（更精确）

**新增功能:**
- 显示当前 ETH 价格假设（$2500）
- 显示 Gas Cost 的 USD 等值（自动计算）
- 实时更新每日/每月/每年收入预估

### 验证结果
- ✅ Registry 链接正确指向 explorer 页面
- ✅ Step1 显示 AOA 模式警告信息
- ✅ Step7 完成页面有管理链接
- ✅ Revenue Calculator 实时计算功能正常
- ✅ 所有修改已提交到 git (commit afb1b48)

### 影响范围
- Analytics Dashboard 用户体验改善
- Deployment Wizard Step1 信息更完善
- Deployment Wizard Step7 操作更便捷
- Operators Portal 收入计算器更实用

### Commits
- `afb1b48` - feat: complete Phase 1 UI improvements

---

## 文档说明

### 如何记录变更
每次主要任务或阶段完成后，请按以下格式添加记录：

```markdown
## YYYY-MM-DD - 任务标题

### 问题描述
简要描述要解决的问题或实现的功能

### 实现内容
详细说明所做的更改

### 验证结果
列出测试结果和验证情况

### 影响范围
说明变更影响的模块和功能

### Commits
列出相关的 git commit hash
```

### 归档策略
当文件超过 200KB 或包含超过 100 个主要变更时，应创建新的备份并重置此文件。

### 备份文件命名规范
`Changes.backup-YYYYMMDD-HHMMSS.md`
