# Wizard 重构说明

## 概述

将原有的 7 步线性向导重构为 3 步检测驱动的向导，提供更灵活的用户体验。

## 新架构

### 旧向导（7步线性流程）
用户必须按顺序完成所有步骤，即使某些资源已经部署。

### 新向导（3步检测驱动）
```
Step 1: 连接钱包 & 选择模式 (AOA / AOA+)
Step 2: 资源检测 → 引导用户到独立页面完成缺失的资源
Step 3: 显示完成摘要和后续步骤
```

## 访问路由

- **旧向导**: `/operator/wizard` (保留)
- **新向导**: `/operator/wizard-new` (推荐)

## 本地开发

### 启动开发服务器

```bash
pnpm run dev
```

服务器会在两个端口启动：
- **Vite**: `http://localhost:5173` (推荐用于开发)
- **Vercel**: `http://localhost:3002` (用于部署测试，目前有已知bug)

### 访问新向导

开发环境: `http://localhost:5173/operator/wizard-new`

### 常见问题

#### 1. 路由 404 错误

**症状**: 浏览器显示 "No routes matched location /operator/wizard-new"

**原因**:
- React 开发服务器热重载未生效
- 浏览器缓存了旧的路由配置

**解决方案**:

```bash
# 方案1: 清除浏览器缓存并硬刷新
# Chrome/Edge: Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)
# Safari: Cmd+Option+R

# 方案2: 重启开发服务器
pkill -f "pnpm run dev"
pnpm run dev

# 方案3: 清除构建缓存并重启
rm -rf node_modules/.vite
pnpm run dev
```

#### 2. Vercel Dev 解析错误

**症状**: vercel dev 输出大量 "Failed to parse source for import analysis" 错误

**原因**: Vercel dev 的 Vite 插件有已知 bug

**解决方案**:
使用 Vite 开发服务器 (端口 5173) 代替 Vercel dev (端口 3002)

## 测试

### 运行所有测试

```bash
pnpm exec playwright test wizard-refactored.spec.ts
```

### 运行烟雾测试（快速验证）

```bash
pnpm exec playwright test wizard-smoke-test.spec.ts
```

### 测试结果

- **wizard-refactored.spec.ts**: 14/14 通过 ✅
- **wizard-smoke-test.spec.ts**: 2/2 通过 ✅

## 文件结构

```
src/pages/operator/
├── DeployWizard.tsx              # 旧向导（保留）
├── DeployWizardNew.tsx           # 新向导（主文件）
└── deploy-v2/
    ├── steps/
    │   ├── Step1_ConnectAndSelect.tsx  # 步骤1: 连接钱包
    │   ├── Step2_ResourceCheck.tsx     # 步骤2: 资源检测（新增）
    │   ├── Step2_ResourceCheck.css
    │   ├── Step3_Complete.tsx          # 步骤3: 完成（新增）
    │   └── Step3_Complete.css
    └── utils/
        ├── resourceChecker.ts          # 资源检测工具
        └── walletChecker.ts

e2e/
├── wizard-refactored.spec.ts    # 详细功能测试（14个用例）
└── wizard-smoke-test.spec.ts    # 快速烟雾测试（2个用例）
```

## 类型转换

新向导需要处理两种不同的类型系统：

- **StakeOptionType**: `"aoa" | "super"` (Step1 使用)
- **StakeMode**: `"aoa" | "aoa+"` (资源检测使用)

转换逻辑在 `DeployWizardNew.tsx` 中：

```typescript
const mode: StakeMode = stakeOption === 'super' ? 'aoa+' : 'aoa';
```

## 部署

### 构建生产版本

```bash
pnpm run build
```

### 验证构建

```bash
# 检查 dist 目录
ls -la dist/

# 本地预览生产构建
pnpm run preview
```

## 迁移计划

1. ✅ **阶段 1**: 实现新向导，保留旧向导（当前状态）
2. ⏳ **阶段 2**: 用户测试和反馈收集
3. ⏳ **阶段 3**: 将 `/operator/wizard` 切换到新向导
4. ⏳ **阶段 4**: 移除旧向导代码

## Git 提交记录

- `c83fc58` - feat: implement 3-step wizard refactoring
- `636f326` - test: fix wizard test URLs to use vite dev server

## 技术栈

- React 18
- TypeScript
- React Router v6
- ethers.js v6
- Playwright (E2E 测试)
- Vite 7

## 相关资源

- [资源检测工具文档](./src/pages/operator/deploy-v2/utils/resourceChecker.ts)
- [测试文档](./e2e/wizard-refactored.spec.ts)
- [旧向导代码](./src/pages/operator/DeployWizard.tsx)
