# RPC Security Best Practices - Hybrid Mode

## ⚠️ 问题：API Key 暴露

### 当前问题
```bash
# ❌ 错误：在前端暴露 API Key
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N
                                                         ^^^^^^^^^^^^^^^^^^^^^^^^
                                                         API Key 会暴露给所有用户！
```

**风险**：
- ❌ 任何访问网站的用户都能获取你的 API Key
- ❌ 恶意用户可以滥用你的配额
- ❌ 可能导致 API Key 被封禁或产生高额费用

---

## ✅ 推荐方案：混合模式（Backend Proxy + Public Fallback）⭐⭐⭐⭐⭐

### 架构设计

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend  │──────▶│  /api/rpc-proxy  │──────▶│  Private RPC    │
│  (Browser)  │      │  (Serverless)    │      │  (Alchemy/Infura)│
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │                         ❌ Failed
                              │
                              ▼
                     ┌─────────────────┐
                     │  Public RPC #1  │  ✅ Success
                     │  Public RPC #2  │
                     │  Public RPC #3  │
                     └─────────────────┘
```

### 优势

- ✅ **安全**：API Key 永不暴露到前端
- ✅ **可靠**：自动 fallback 到公共 RPC，零宕机
- ✅ **灵活**：可选择是否使用私有 RPC
- ✅ **简单**：前端无需任何配置改动
- ✅ **兼容**：本地开发和生产环境使用相同配置

---

## 🚀 实现步骤

### 1. Backend RPC Proxy（已实现）

文件：`registry/api/rpc-proxy.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Public RPC endpoints for fallback
const PUBLIC_SEPOLIA_RPCS = [
  'https://rpc.sepolia.org',
  'https://ethereum-sepolia.publicnode.com',
  'https://sepolia.drpc.org',
  'https://rpc2.sepolia.org',
  'https://eth-sepolia.public.blastapi.io',
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Try private RPC first (if configured)
  const privateRpcUrl = process.env.SEPOLIA_RPC_URL;
  
  if (privateRpcUrl) {
    try {
      const response = await fetch(privateRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      
      if (response.ok) {
        return res.status(response.status).json(await response.json());
      }
    } catch (error) {
      console.warn('Private RPC failed, falling back to public RPCs');
    }
  }

  // 2. Fallback to public RPCs
  for (const publicRpc of PUBLIC_SEPOLIA_RPCS) {
    try {
      const response = await fetch(publicRpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      
      if (response.ok) {
        return res.status(response.status).json(await response.json());
      }
    } catch (error) {
      continue; // Try next public RPC
    }
  }

  return res.status(500).json({ error: 'All RPC endpoints failed' });
}
```

### 2. 前端配置（已更新）

文件：`registry/.env.local`

```bash
# ✅ 始终使用 Backend Proxy
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
```

文件：`registry/src/config/rpc.ts`

```typescript
export const RPC_CONFIG = {
  development: '/api/rpc-proxy',
  production: '/api/rpc-proxy',
} as const;

export function getRpcUrl(): string {
  const env = import.meta.env.MODE;
  return env === 'development' ? RPC_CONFIG.development : RPC_CONFIG.production;
}
```

### 3. 配置私有 RPC（可选）

#### 本地开发

创建 `registry/.env.local`（项目根目录，不是 `src/`）：

```bash
# Server-side environment variable (NOT exposed to frontend)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

#### Vercel 生产环境

```bash
cd registry

# 添加私有 RPC URL（不会暴露到前端）
printf 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY' | \
  vercel env add SEPOLIA_RPC_URL production

# 更新前端 RPC URL 为 proxy（如果尚未配置）
printf '/api/rpc-proxy' | \
  vercel env add VITE_SEPOLIA_RPC_URL production --force

# 重新部署
vercel --prod
```

---

## 📊 环境变量说明

### Frontend Variables（VITE_ 前缀）

| 变量名 | 作用域 | 暴露情况 | 推荐值 |
|--------|--------|----------|--------|
| `VITE_SEPOLIA_RPC_URL` | 前端浏览器 | ✅ 暴露给所有用户 | `/api/rpc-proxy` |

### Backend Variables（无 VITE_ 前缀）

| 变量名 | 作用域 | 暴露情况 | 推荐值 |
|--------|--------|----------|--------|
| `SEPOLIA_RPC_URL` | 服务端 Serverless Function | ❌ 永不暴露 | `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY` |

---

## 🎯 使用场景

### 场景 1：个人项目 / MVP（使用公共 RPC）

**配置**：
```bash
# Vercel 环境变量
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
# 不配置 SEPOLIA_RPC_URL（自动使用公共 RPC）
```

**优点**：
- ✅ 零成本
- ✅ 自动 fallback，高可用

**缺点**：
- ⚠️ 公共 RPC 有速率限制（通常 10-100 req/s）

---

### 场景 2：生产项目（使用私有 RPC + 公共 Fallback）

**配置**：
```bash
# Vercel 环境变量
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**优点**：
- ✅ 高性能（Alchemy/Infura）
- ✅ 高可用（Private RPC 故障时自动降级到公共 RPC）
- ✅ API Key 安全隐藏

**成本**：
- 💰 Alchemy 免费套餐：300M Compute Units/月
- 💰 Infura 免费套餐：100K requests/天

---

## 🔍 验证配置

### 检查 Vercel 环境变量

```bash
cd registry

# 查看生产环境变量
vercel env pull .env.production.local --environment production

# 验证配置
cat .env.production.local | grep -E "(VITE_SEPOLIA_RPC_URL|SEPOLIA_RPC_URL)"

# 期望输出：
# VITE_SEPOLIA_RPC_URL="/api/rpc-proxy"  ← 前端使用 proxy
# SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/..."  ← 后端私有 RPC（可选）
```

### 测试 Proxy 端点

```bash
# 本地测试（需要先启动 dev server）
curl -X POST http://localhost:5173/api/rpc-proxy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 期望输出：
# {"jsonrpc":"2.0","id":1,"result":"0x..."}

# 生产环境测试
curl -X POST https://your-app.vercel.app/api/rpc-proxy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 检查浏览器 Network 面板

1. 打开浏览器开发者工具
2. 访问应用
3. Network 标签中应该看到：
   - ✅ 请求 URL：`/api/rpc-proxy`（相对路径）
   - ✅ 响应正常
   - ❌ **不应该看到** Alchemy/Infura URL

---

## 📊 方案对比

| 方案 | 安全性 | 性能 | 成本 | 可用性 | 复杂度 | 推荐度 |
|------|--------|------|------|--------|--------|--------|
| **混合模式**（推荐）⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 💰（可选） | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅✅✅ |
| 纯公共 RPC | ⭐⭐⭐⭐ | ⭐⭐⭐ | 免费 | ⭐⭐⭐ | ⭐ | ✅ MVP |
| 纯私有 RPC（无 fallback） | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 💰💰 | ⭐⭐ | ⭐⭐ | ⚠️ 单点故障 |
| 直接暴露 API Key | ⭐ | ⭐⭐⭐⭐⭐ | 💰💰💰 | ⭐⭐⭐⭐ | ⭐ | ❌❌❌ |

---

## 🐛 常见问题

### Q1: 本地开发时 `/api/rpc-proxy` 返回 404？

**原因**：Vite 需要配置代理到 Vercel Serverless Functions。

**解决**：使用 Vercel CLI 启动本地开发：

```bash
cd registry

# 方案 A：使用 Vercel Dev（推荐）
vercel dev

# 方案 B：在 vite.config.ts 配置代理
# 已在项目配置中处理
```

### Q2: 如何知道当前使用的是私有 RPC 还是公共 RPC？

**方法**：查看 Vercel Function Logs

```bash
# 在 Vercel Dashboard 查看 Function Logs
# 或使用 CLI
vercel logs

# 日志输出示例：
# 🔐 Trying private RPC endpoint...        ← 使用私有 RPC
# ✅ Private RPC request successful
# 
# 或
# 🌐 No private RPC configured, using public RPCs  ← 使用公共 RPC
# 🌐 Trying public RPC: https://rpc.sepolia.org
# ✅ Public RPC request successful
```

### Q3: 私有 RPC 配额用完了怎么办？

**自动处理**：Backend Proxy 会自动 fallback 到公共 RPC，应用不会中断。

### Q4: 如何临时切换到纯公共 RPC 模式？

```bash
# 删除私有 RPC 配置（不影响前端）
vercel env rm SEPOLIA_RPC_URL production

# 重新部署
vercel --prod
```

---

## 📚 参考资料

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Chainlist - 公共 RPC 端点](https://chainlist.org/)
- [Alchemy API 最佳实践](https://docs.alchemy.com/docs/best-practices)
- [ethers.js Providers](https://docs.ethers.org/v6/api/providers/)

---

## 🎉 总结

**当前配置（混合模式）**：

✅ 前端安全：API Key 永不暴露  
✅ 高可用：自动 fallback 机制  
✅ 高性能：优先使用私有 RPC  
✅ 灵活：可选择纯公共/私有+公共模式  
✅ 简单：前端无需任何配置

**推荐做法**：

- **开发/测试**：不配置 `SEPOLIA_RPC_URL`，使用免费公共 RPC
- **生产环境**：配置 `SEPOLIA_RPC_URL`，获得最佳性能和可靠性
