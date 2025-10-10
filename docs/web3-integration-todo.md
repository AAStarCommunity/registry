# Web3 Integration TODO

## 📋 项目概述

将静态展示网站升级为完整的 Web3 DApp，支持钱包连接和链上交互。

**参考代码位置**: `backup/nextjs-src/` (原 Next.js 实现)

---

## 🎯 集成目标

### 核心功能
- [ ] 钱包连接 (MetaMask, WalletConnect)
- [ ] 链上数据读取 (Paymaster 列表、统计数据)
- [ ] 用户交互功能 (注册 Paymaster、部署合约、管理)

---

## 📦 技术栈选型

### 推荐方案: Vite + Wagmi
- **钱包连接**: Wagmi v2
- **以太坊库**: Viem (替代 ethers.js)
- **UI 组件**: 现有纯 CSS (可选升级 Tailwind)
- **状态管理**: React Context / Zustand

### 依赖包清单
```json
{
  "dependencies": {
    "wagmi": "^2.x",
    "viem": "^2.x",
    "@tanstack/react-query": "^5.x",
    "connectkit": "^1.x" // 可选: 钱包连接 UI
  }
}
```

---

## 🔨 实施步骤

### Phase 1: 基础设施搭建

#### 1.1 安装 Web3 依赖
```bash
pnpm add wagmi viem @tanstack/react-query
pnpm add connectkit # 可选
```

**参考文件**:
- `backup/nextjs-src/lib/wagmi.ts` - Wagmi 配置示例

#### 1.2 配置 Wagmi Provider
**任务**:
- [ ] 创建 `src/lib/wagmi.ts`
- [ ] 配置支持的链 (Sepolia, Mainnet)
- [ ] 配置 RPC endpoints
- [ ] 设置 MetaMask connector

**关键点**:
```typescript
// 参考 backup/nextjs-src/lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia, mainnet],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})
```

#### 1.3 在 App 中注入 Provider
**任务**:
- [ ] 修改 `src/main.tsx`
- [ ] 包裹 WagmiProvider 和 QueryClientProvider

**示例代码**:
```tsx
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './lib/wagmi'

const queryClient = new QueryClient()

<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</WagmiProvider>
```

---

### Phase 2: 合约交互层

#### 2.1 创建合约定义文件
**任务**:
- [ ] 创建 `src/lib/contracts.ts`
- [ ] 定义合约地址 (从环境变量读取)
- [ ] 导入 ABI (使用现有 `src/compiled/` 和 `src/singleton-compiled/`)

**参考文件**:
- `backup/nextjs-src/lib/contracts.ts` - 完整示例

**关键结构**:
```typescript
import SuperPaymasterRegistryABI from './SuperPaymasterRegistry_v1_2.json'
import { SingletonPaymasterV6, SingletonPaymasterV7, SingletonPaymasterV8 } from './singleton-compiled'

export const CONTRACTS = {
  SUPER_PAYMASTER_REGISTRY: import.meta.env.VITE_REGISTRY_ADDRESS || '0x...',
  ENTRY_POINT_V6: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  // ...
}

export const REGISTRY_ABI = SuperPaymasterRegistryABI
```

#### 2.2 创建合约 Hooks
**任务**:
- [ ] 创建 `src/hooks/useRegistry.ts`
- [ ] 封装常用合约读取操作
- [ ] 封装合约写入操作

**参考逻辑** (从 `backup/nextjs-src/app/page.tsx`):
```typescript
import { useReadContract, useWriteContract } from 'wagmi'

export function useRegistry() {
  const { data: paymasters } = useReadContract({
    address: CONTRACTS.SUPER_PAYMASTER_REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'getActivePaymasters',
  })

  const { writeContract } = useWriteContract()

  const registerPaymaster = async (params) => {
    await writeContract({
      address: CONTRACTS.SUPER_PAYMASTER_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'registerPaymaster',
      args: [params.address, params.feeRate, params.name],
    })
  }

  return { paymasters, registerPaymaster }
}
```

---

### Phase 3: UI 组件升级

#### 3.1 钱包连接按钮
**任务**:
- [ ] 创建 `src/components/WalletButton.tsx`
- [ ] 显示连接/断开状态
- [ ] 显示地址和余额
- [ ] 处理网络切换

**参考文件**:
- `backup/nextjs-src/components/MetaMaskButton.tsx`

**示例代码**:
```tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected) {
    return (
      <button onClick={() => disconnect()}>
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    )
  }

  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>
  )
}
```

#### 3.2 集成到 Header
**任务**:
- [ ] 修改 `src/components/Header.tsx`
- [ ] 添加 WalletButton 到导航栏

---

### Phase 4: 页面功能实现

#### 4.1 Registry Explorer (动态数据)
**文件**: `src/pages/RegistryExplorer.tsx`

**任务**:
- [ ] 替换 Mock 数据为链上读取
- [ ] 使用 `useRegistry` hook 获取 Paymaster 列表
- [ ] 实时显示统计数据 (totalPaymasters, totalTransactions)
- [ ] 添加加载状态和错误处理

**参考**:
- `backup/nextjs-src/app/page.tsx` - 数据获取逻辑

**核心改动**:
```tsx
// 原来: Mock 数据
const mockPaymasters = [...]

// 改为: 链上数据
const { paymasters, isLoading, error } = useRegistry()
```

#### 4.2 Paymaster 注册功能
**新页面**: `src/pages/RegisterPaymaster.tsx`

**任务**:
- [ ] 创建注册表单 (地址、费率、名称)
- [ ] 连接 `registerPaymaster` 合约方法
- [ ] 添加交易状态提示 (pending, success, error)

**参考文件**:
- `backup/nextjs-src/app/register/page.tsx`

#### 4.3 Paymaster 部署功能
**新页面**: `src/pages/DeployPaymaster.tsx`

**任务**:
- [ ] 支持 V6/V7/V8 版本选择
- [ ] 读取 Bytecode (从 `src/compiled/`)
- [ ] 调用 `deployContract` 方法
- [ ] 显示部署进度和结果

**参考文件**:
- `backup/nextjs-src/app/deploy/page.tsx`
- `backup/nextjs-src/app/deploy-super-paymaster/page.tsx`

#### 4.4 管理面板
**新页面**: `src/pages/ManagePaymaster.tsx`

**任务**:
- [ ] 查询用户拥有的 Paymaster
- [ ] 显示余额 (getDeposit)
- [ ] 充值功能 (deposit)
- [ ] 提现功能 (withdrawTo)
- [ ] 更新费率 (updateFeeRate)

**参考文件**:
- `backup/nextjs-src/app/manage/page.tsx`

---

### Phase 5: 错误处理与优化

#### 5.1 错误处理
**任务**:
- [ ] 创建统一错误处理 hook
- [ ] 处理网络错误
- [ ] 处理用户拒绝签名
- [ ] 处理合约 revert

**参考模式**:
```typescript
try {
  await writeContract({ ... })
} catch (error) {
  if (error.name === 'UserRejectedRequestError') {
    toast.error('User rejected transaction')
  } else {
    toast.error('Transaction failed')
  }
}
```

#### 5.2 加载状态
**任务**:
- [ ] 添加 Skeleton 加载组件
- [ ] 交易等待动画
- [ ] 网络请求 debounce

#### 5.3 缓存与性能
**任务**:
- [ ] 配置 React Query 缓存策略
- [ ] 使用 Multicall 批量读取
- [ ] 分页加载 Paymaster 列表

---

## 🔧 环境变量配置

创建 `.env.local`:
```bash
# RPC Endpoints
VITE_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
VITE_MAINNET_RPC=https://mainnet.infura.io/v3/YOUR_KEY

# Contract Addresses
VITE_REGISTRY_ADDRESS=0x...
VITE_ENTRY_POINT_V6=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
VITE_ENTRY_POINT_V7=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# WalletConnect Project ID (可选)
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## 📚 学习资源

### 官方文档
- [Wagmi v2 Docs](https://wagmi.sh/)
- [Viem Docs](https://viem.sh/)
- [TanStack Query](https://tanstack.com/query/latest)

### 参考实现
- `backup/nextjs-src/` - 完整 Next.js DApp 实现
- 重点参考文件:
  - `lib/wagmi.ts` - Wagmi 配置
  - `lib/contracts.ts` - 合约定义
  - `app/page.tsx` - 数据读取示例
  - `app/register/page.tsx` - 写入交易示例
  - `components/MetaMaskButton.tsx` - 钱包连接

---

## ⚠️ 注意事项

### 架构差异
1. **Next.js → Vite**:
   - 无 SSR，所有 Web3 逻辑在客户端
   - 不需要 `'use client'` 声明
   - 环境变量前缀: `NEXT_PUBLIC_` → `VITE_`

2. **路由**:
   - Next.js App Router → React Router
   - 文件路由 → 手动配置路由

3. **样式**:
   - 可选择保持纯 CSS 或升级到 Tailwind
   - 参考文件使用 Tailwind，需自行转换

### 测试网络
- 建议先在 Sepolia 测试网实现
- 确保合约已部署到测试网
- 准备测试 ETH

### 安全性
- [ ] 验证用户输入 (地址格式、费率范围)
- [ ] 处理整数溢出 (使用 Viem 的 parseEther)
- [ ] 限制 Gas 上限

---

## 📝 实施检查清单

### 准备阶段
- [ ] 阅读 Wagmi 文档
- [ ] 理解 `backup/nextjs-src` 代码结构
- [ ] 确认合约部署地址

### 开发阶段
- [ ] Phase 1: 基础设施 (Wagmi 配置)
- [ ] Phase 2: 合约交互层
- [ ] Phase 3: UI 组件
- [ ] Phase 4: 页面功能
- [ ] Phase 5: 优化与测试

### 测试阶段
- [ ] 钱包连接测试
- [ ] 网络切换测试
- [ ] 合约读取测试
- [ ] 合约写入测试
- [ ] 错误处理测试

### 部署阶段
- [ ] 配置生产环境变量
- [ ] 构建优化
- [ ] Vercel 部署配置

---

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm add wagmi viem @tanstack/react-query

# 2. 创建配置文件
cp backup/nextjs-src/lib/wagmi.ts src/lib/wagmi.ts

# 3. 修改 main.tsx 注入 Provider

# 4. 创建第一个 Hook
# 参考 backup/nextjs-src/app/page.tsx

# 5. 更新 RegistryExplorer 页面使用真实数据
```

---

## 📞 问题反馈

遇到问题时参考顺序:
1. 查看 `backup/nextjs-src` 对应文件实现
2. 查阅 Wagmi 官方文档
3. 检查合约 ABI 是否正确
4. 验证环境变量配置

---

**最后更新**: 2025-10-10
**维护者**: Jason Jiao
