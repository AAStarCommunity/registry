# Vercel Environment Variables Setup Guide

## 概述

本指南说明如何安全地管理 SuperPaymaster Registry 项目的环境变量,区分前端公开变量和服务器私密变量。

## 环境变量分类

### 1. 前端变量 (VITE_ 前缀)
**特点**: 
- 打包到前端 JavaScript bundle 中
- 用户可以在浏览器 DevTools 中看到
- **只能放公开信息**

**使用场景**:
- RPC 端点 URL (公开 API)
- 合约地址 (公开的区块链地址)
- Etherscan URL
- 功能开关标志

**设置方法**:
```bash
# 本地开发: 在 .env.local 中设置
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Vercel 部署: 通过 Vercel Dashboard 或 CLI 设置
vercel env add VITE_SEPOLIA_RPC_URL production
```

### 2. 服务器变量 (无 VITE_ 前缀)
**特点**:
- 只在服务器端可用 (API routes, SSR)
- **不会暴露给浏览器**
- 可以存储敏感信息

**使用场景**:
- 私钥 (OWNER_PRIVATE_KEY, DEPLOYER_PRIVATE_KEY)
- API 密钥 (Gemini API, 第三方服务)
- 数据库连接字符串
- JWT 密钥

**设置方法**: **只能通过 Vercel CLI 或 Dashboard**

## 安全设置流程

### Step 1: 本地开发环境

创建 `.env.local` 文件 (已在 .gitignore 中):

```bash
# 复制模板
cp .env.example .env.local

# 编辑并填入你的值
nano .env.local
```

`.env.local` 内容示例:
```env
# 前端公开变量
# ⚠️ 使用你自己的 Alchemy/Infura API key
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_PAYMASTER_V4_ADDRESS=0x000000009F4F0b194c9b3e4Df48F4fa9cC7a5FFe

# 服务器私密变量 (仅用于本地开发 API routes)
# ⚠️ 警告: 使用你自己的测试私钥，不要使用文档中的示例！
# 注意: 这些不会暴露到前端!
OWNER_PRIVATE_KEY=0xYOUR_TEST_PRIVATE_KEY_HERE
DEPLOYER_PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY_HERE
```

### Step 2: Vercel 生产环境

#### 方法 1: 使用 Vercel CLI (推荐)

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 链接项目
cd /path/to/registry
vercel link

# 4. 添加前端公开变量 (VITE_ 前缀)
vercel env add VITE_SEPOLIA_RPC_URL production
# 输入值: https://eth-sepolia.g.alchemy.com/v2/YOUR_PROD_KEY

vercel env add VITE_PAYMASTER_V4_ADDRESS production
# 输入值: 0x000000009F4F0b194c9b3e4Df48F4fa9cC7a5FFe

vercel env add VITE_REGISTRY_ADDRESS production
# 输入值: 0x838da93c815a6E45Aa50429529da9106C0621eF0

vercel env add VITE_PNT_TOKEN_ADDRESS production
# 输入值: 0xD14E87d8D8B69016Fcc08728c33799bD3F66F180

vercel env add VITE_ETHERSCAN_BASE_URL production
# 输入值: https://sepolia.etherscan.io

# 5. 添加服务器私密变量 (无 VITE_ 前缀)
# ⚠️ 警告: 这些是敏感信息!
vercel env add OWNER_PRIVATE_KEY production
# 输入值: 0x... (生产环境私钥)

vercel env add DEPLOYER_PRIVATE_KEY production
# 输入值: 0x... (部署者私钥)

vercel env add ADMIN_KEY production
# 输入值: 你的管理员密钥

# 6. 为 Preview 和 Development 环境重复步骤 4-5
vercel env add VITE_SEPOLIA_RPC_URL preview
vercel env add VITE_SEPOLIA_RPC_URL development
# ... 重复所有变量
```

#### 方法 2: 使用 Vercel Dashboard (Web UI)

1. 访问 https://vercel.com/dashboard
2. 选择你的项目 (registry)
3. 进入 **Settings** → **Environment Variables**
4. 点击 **Add New**
5. 填写:
   - **Key**: 变量名 (如 `OWNER_PRIVATE_KEY`)
   - **Value**: 变量值
   - **Environments**: 选择 Production/Preview/Development
6. 点击 **Save**

### Step 3: 多环境配置

为不同环境使用不同的密钥:

```bash
# Development (开发环境 - 使用测试密钥)
vercel env add OWNER_PRIVATE_KEY development
# 输入: 测试私钥 (有少量测试币)

# Preview (预览环境 - 使用 Staging 密钥)
vercel env add OWNER_PRIVATE_KEY preview
# 输入: Staging 私钥

# Production (生产环境 - 使用生产密钥)
vercel env add OWNER_PRIVATE_KEY production
# 输入: 生产私钥 (务必安全保管!)
```

## 变量使用示例

### 前端代码 (React 组件)

```typescript
// ✅ 正确: 使用 VITE_ 变量
const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
const paymasterAddress = import.meta.env.VITE_PAYMASTER_V4_ADDRESS;

// ❌ 错误: 不要在前端访问服务器变量
// 这会返回 undefined (Vite 不会暴露非 VITE_ 变量)
const privateKey = import.meta.env.OWNER_PRIVATE_KEY; // undefined!
```

### 服务器端代码 (API Routes)

```typescript
// /api/deploy.ts (Vercel Serverless Function)

// ✅ 正确: 在服务器端访问私密变量
export default async function handler(req, res) {
  const privateKey = process.env.OWNER_PRIVATE_KEY; // ✅ 只在服务器可用
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY; // ✅ 安全
  
  // 使用私钥执行部署操作...
  const wallet = new ethers.Wallet(privateKey);
  
  res.status(200).json({ success: true });
}
```

## 查看和管理变量

### 列出所有环境变量

```bash
# 查看所有环境的变量
vercel env ls

# 查看特定环境的变量
vercel env ls production
vercel env ls preview
vercel env ls development
```

### 删除环境变量

```bash
# 删除变量
vercel env rm VARIABLE_NAME production
```

### 拉取环境变量到本地

```bash
# 拉取 Development 环境变量到 .env.local
vercel env pull .env.local

# 拉取 Production 环境变量
vercel env pull .env.production.local
```

## 安全最佳实践

### ✅ 应该做的

1. **使用 .env.local 存储本地开发密钥**
   ```bash
   # .env.local 已在 .gitignore 中
   OWNER_PRIVATE_KEY=0x...test...key...
   ```

2. **不同环境使用不同密钥**
   - Development: 测试账户 (少量测试币)
   - Preview: Staging 账户
   - Production: 生产账户 (充分审计)

3. **定期轮换生产密钥**
   ```bash
   # 更新生产密钥
   vercel env rm OWNER_PRIVATE_KEY production
   vercel env add OWNER_PRIVATE_KEY production
   # 输入新密钥
   ```

4. **使用 Vercel CLI 设置敏感变量**
   ```bash
   # 从命令行输入,不留痕迹
   vercel env add SECRET_KEY production
   ```

5. **审计环境变量访问**
   ```bash
   # 检查哪些函数访问了敏感变量
   grep -r "process.env.OWNER_PRIVATE_KEY" api/
   ```

### ❌ 不应该做的

1. **❌ 不要在 VITE_ 变量中存储私钥**
   ```env
   # 错误! 这会暴露到前端!
   VITE_OWNER_PRIVATE_KEY=0x... # ❌ 危险!
   ```

2. **❌ 不要提交 .env.local 到 Git**
   ```bash
   # 确保在 .gitignore 中
   .env.local
   .env.*.local
   ```

3. **❌ 不要在代码中硬编码密钥**
   ```typescript
   // ❌ 永远不要这样做!
   const privateKey = "0x7c28d50030917fb555bb19ac888f973b28eff37a7853cdb2da46d23fb46e4724";
   ```

4. **❌ 不要在前端日志中打印环境变量**
   ```typescript
   // ❌ 危险! 可能泄露信息
   console.log(import.meta.env); // 包含所有 VITE_ 变量
   ```

5. **❌ 不要共享生产环境的 .env 文件**
   ```bash
   # ❌ 不要通过 Slack/Email 发送
   # ❌ 不要上传到 GitHub Gist
   # ✅ 使用 Vercel CLI 或安全的密钥管理工具
   ```

## 故障排查

### 问题: 前端无法读取环境变量

**症状**: `import.meta.env.VITE_XXX` 返回 `undefined`

**解决方案**:
1. 确保变量名以 `VITE_` 开头
2. 重启开发服务器 (`npm run dev`)
3. 检查 `.env.local` 文件格式是否正确

### 问题: API Route 无法读取私密变量

**症状**: `process.env.OWNER_PRIVATE_KEY` 返回 `undefined`

**解决方案**:
1. 确认变量已通过 Vercel CLI 设置
2. 检查环境选择 (production/preview/development)
3. 重新部署项目触发更新

### 问题: CORS 错误 (RPC URL)

**症状**: `Access to fetch at 'https://...' has been blocked by CORS`

**解决方案**:
1. 使用支持浏览器访问的 RPC (Alchemy/Infura)
2. 确认 `VITE_SEPOLIA_RPC_URL` 正确设置
3. 检查 API Key 是否有效

## 相关资源

- [Vercel Environment Variables 官方文档](https://vercel.com/docs/environment-variables)
- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [以太坊安全最佳实践](https://consensys.github.io/smart-contract-best-practices/)

## 快速命令参考

```bash
# 列出变量
vercel env ls

# 添加变量
vercel env add VAR_NAME production

# 删除变量
vercel env rm VAR_NAME production

# 拉取到本地
vercel env pull .env.local

# 重新部署应用变量更新
vercel --prod
```

---

**最后更新**: 2025-10-14  
**维护者**: Jason (jFlow team)
