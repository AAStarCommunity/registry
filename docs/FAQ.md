# Registry 常见问题解答 (FAQ)

## Q1: 前端可否也优先使用私有 RPC?

### 简短回答
**前端已经在使用私有 RPC**,通过 Backend Proxy 实现,无需且不应该直接配置。

### 详细解释

#### 当前架构

```
┌─────────────┐
│   前端      │ VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
│  (浏览器)   │
└──────┬──────┘
       │ ① 所有 RPC 请求发送到 /api/rpc-proxy
       ▼
┌─────────────────────┐
│  Backend Proxy      │ 
│  (Serverless)       │
└──────┬──────────────┘
       │
       ├─ ② 优先尝试: SEPOLIA_RPC_URL (私有 Alchemy)
       │               ✅ 成功 → 返回结果给前端
       │               ❌ 失败 ↓
       │
       └─ ③ 自动降级: 公共 RPC 端点
                      ✅ 成功 → 返回结果给前端
```

#### 前端实际上已在使用私有 RPC

您可以验证:

```bash
# 1. 检查 Vercel 环境变量
cd registry
vercel env pull .env.production.local --environment production

# 输出:
# VITE_SEPOLIA_RPC_URL="/api/rpc-proxy"  ← 前端使用 Proxy
# SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/..."  ← 后端私有 RPC

# 2. 查看 Function Logs
vercel logs --follow

# 日志输出:
# 🔐 Trying private RPC endpoint...        ← 优先使用私有 RPC
# ✅ Private RPC request successful         ← 前端请求实际走的是 Alchemy
```

#### 为什么不能让前端直接使用私有 RPC?

**安全风险**:

```bash
# ❌ 如果这样配置:
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N
                                                         ^^^^^^^^^^^^^^^^^^^^^^^^
                                                         暴露给所有访问网站的人!
```

**后果**:
1. 任何打开浏览器 DevTools 的用户都能看到 API Key
2. 恶意用户可以复制 API Key 用于自己的项目
3. 您的 Alchemy 配额会被滥用
4. 可能产生高额账单或账号被封禁

**实际案例**:
```javascript
// 用户只需在浏览器 Console 输入:
console.log(import.meta.env.VITE_SEPOLIA_RPC_URL)
// 输出: "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"

// 然后复制 API Key,在任何地方使用
```

#### 当前方案的优势

| 特性 | 前端直接用私有 RPC | 当前 Proxy 方案 |
|------|-------------------|----------------|
| **实际使用私有 RPC** | ✅ | ✅ (通过 Proxy) |
| **性能** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **API Key 安全** | ❌ 完全暴露 | ✅ 完全隐藏 |
| **配额保护** | ❌ 可被滥用 | ✅ 受保护 |
| **高可用性** | ❌ 单点故障 | ✅ 自动 Fallback |
| **前端配置** | 复杂 | 简单 (统一用 `/api/rpc-proxy`) |

#### 验证前端正在使用私有 RPC

**方法 1: 浏览器 Network 面板**
1. 访问 https://registry-86wyeeeig-jhfnetboys-projects.vercel.app
2. 打开 DevTools → Network 标签
3. 观察 RPC 请求:
   - ✅ Request URL: `/api/rpc-proxy` (相对路径)
   - ❌ **看不到** Alchemy URL (说明 API Key 已隐藏)

**方法 2: 性能对比**
- 如果后端私有 RPC 配置正确,请求速度应该很快 (Alchemy 性能优异)
- 如果删除 `SEPOLIA_RPC_URL`,会降级到公共 RPC (可能稍慢)

**方法 3: Function Logs**
```bash
vercel logs --follow

# 成功使用私有 RPC 时:
# 🔐 Trying private RPC endpoint...
# ✅ Private RPC request successful

# 降级到公共 RPC 时:
# ⚠️ Private RPC failed, falling back...
# 🌐 Trying public RPC: https://rpc.sepolia.org
```

---

## Q2: 为何还要 VITE_HISTORICAL_FROM_BLOCK 变量?

### 简短回答
**用于首次加载时的历史数据查询起始点**,优化数据加载性能。

### 详细解释

#### 使用场景

**文件**: `src/hooks/useGasAnalytics.ts:426`

```typescript
if (maxQueriedBlock === 0) {
  // 首次加载,没有缓存数据
  queryFromBlock = 
    fromBlock || 
    parseInt(import.meta.env.VITE_HISTORICAL_FROM_BLOCK || "0");
  
  queryToBlock = 
    toBlock || 
    parseInt(import.meta.env.VITE_HISTORICAL_TO_BLOCK || currentBlock.toString());
  
  console.log(`Initial cache build - querying blocks ${queryFromBlock} → ${queryToBlock}`);
} else {
  // 已有缓存,增量查询
  queryFromBlock = maxQueriedBlock + 1;
  queryToBlock = currentBlock;
  console.log(`Incremental query - from block ${queryFromBlock} → ${queryToBlock}`);
}
```

#### 为什么需要这个变量?

**问题**: 如果从区块 0 开始查询,需要扫描整个链的历史

```bash
# ❌ 没有 VITE_HISTORICAL_FROM_BLOCK
queryFromBlock = 0
queryToBlock = 7,000,000  (当前 Sepolia 区块高度)

# 需要查询 7,000,000 个区块 → 极慢,可能超时
```

**解决**: 从已知的合约部署区块开始

```bash
# ✅ 使用 VITE_HISTORICAL_FROM_BLOCK
queryFromBlock = 9408600  (Registry v1.2 部署区块)
queryToBlock = 7,000,000

# 只需查询 ~591,400 个区块 → 快得多!
```

#### 实际效果对比

| 起始区块 | 需查询区块数 | 预计时间 | 说明 |
|---------|------------|---------|------|
| `0` | ~7,000,000 | 数小时 | ❌ 不实际 |
| `9408600` | ~591,400 | 几分钟 | ✅ 推荐 (Registry 部署区块) |
| `currentBlock - 1000` | 1,000 | 几秒 | ⚠️ 仅查询最近数据 |

#### 如何确定这个值?

**Registry v1.2 部署交易**:
- 部署区块: `9408600`
- 交易哈希: (参考 TRANSACTION_RECORDS.md)

**查找方法**:
```bash
# 在 Etherscan 查看合约部署交易
# https://sepolia.etherscan.io/address/0x838da93c815a6E45Aa50429529da9106C0621eF0

# 或使用 ethers.js
const provider = new ethers.JsonRpcProvider(RPC_URL);
const code = await provider.getCode(REGISTRY_ADDRESS, 9408600);
console.log(code !== '0x' ? '✅ Deployed' : '❌ Not deployed yet');
```

#### 缓存机制

**首次访问** (无缓存):
```
查询范围: [9408600 → currentBlock]
└─ 耗时较长 (几分钟)
└─ 结果存入 localStorage cache
```

**后续访问** (有缓存):
```
查询范围: [lastCachedBlock + 1 → currentBlock]
└─ 仅查询新区块 (几秒)
└─ 增量更新 cache
```

#### 是否可以移除这个变量?

**可以,但不推荐**:

```typescript
// ❌ 移除后的行为:
queryFromBlock = fromBlock || 0;  // 从区块 0 开始查询

// 首次加载会非常慢,可能导致:
// - RPC 请求超时
// - 浏览器卡顿
// - 用户体验极差
```

**推荐做法**:
1. ✅ 保留 `VITE_HISTORICAL_FROM_BLOCK=9408600`
2. ✅ 如果部署新的 Registry 版本,更新为新的部署区块
3. ✅ 用户首次访问后会自动缓存,后续只查询增量数据

#### 未来优化方向

根据代码注释,计划引入 KV DB:

```typescript
/*==============================================================================
  TODO: Replace with KV DB query for initial cache load
        - fetchAllPaymastersAnalytics() should check KV DB first
        - Only query RPC for blocks not in KV DB
        - This will significantly reduce initialization time for new users
==============================================================================*/
```

**优化后**:
```
用户首次访问:
1. 从 KV DB 加载历史数据 (秒级)
2. 仅查询 KV DB 到当前的增量数据
3. VITE_HISTORICAL_FROM_BLOCK 将成为 KV DB 的初始化参数,而非运行时参数
```

---

## Q3: 如何优化环境变量配置?

### 当前必需的环境变量

**前端变量** (VITE_ 前缀):
```bash
# 网络配置
VITE_NETWORK=sepolia
VITE_CHAIN_ID=11155111

# RPC 配置 (统一使用 Proxy)
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy

# 合约地址
VITE_REGISTRY_ADDRESS=0x838da93c815a6E45Aa50429529da9106C0621eF0
VITE_SUPER_PAYMASTER_REGISTRY_V1_2=0x838da93c815a6E45Aa50429529da9106C0621eF0
VITE_SUPER_PAYMASTER_REGISTRY_V1_3=TBD
VITE_PAYMASTER_V4_ADDRESS=0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445
VITE_PNT_TOKEN_ADDRESS=0xD14E87d8D8B69016Fcc08728c33799bD3F66F180

# 性能优化
VITE_HISTORICAL_FROM_BLOCK=9408600  ← 重要!用于首次查询起始点
```

**后端变量** (无 VITE_ 前缀):
```bash
# 私有 RPC (可选,不暴露到前端)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### 可移除的变量

**已移除**:
- ❌ `VITE_HISTORICAL_TO_BLOCK` - 代码中会自动使用 currentBlock

**可能不需要**:
- `VITE_NETWORK_NAME` - 与 `VITE_NETWORK` 重复
- `VITE_SBT_CONTRACT_ADDRESS` - 如果未使用
- `VITE_USDT_CONTRACT_ADDRESS` - 如果未使用
- 测试账户地址 (A-G, 1-3) - 仅开发环境需要

---

## 总结

### 关键要点

1. **前端 RPC 配置**:
   - ✅ 前端**已经在使用**私有 RPC (通过 Proxy)
   - ✅ API Key 完全隐藏,绝对安全
   - ✅ 自动 Fallback,高可用
   - ❌ 不应该也不需要让前端直接访问私有 RPC

2. **VITE_HISTORICAL_FROM_BLOCK**:
   - ✅ **必需**的性能优化参数
   - ✅ 避免查询数百万个无效区块
   - ✅ 将首次加载从"数小时"优化到"几分钟"
   - ✅ 后续访问利用缓存,仅查询增量数据

3. **安全架构**:
   ```
   前端 (/api/rpc-proxy) 
     → 后端 (SEPOLIA_RPC_URL - 私有,安全) 
     → Fallback (公共 RPC - 高可用)
   ```

### 推荐配置

**生产环境** (Vercel):
```bash
# 前端 (VITE_)
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
VITE_HISTORICAL_FROM_BLOCK=9408600

# 后端 (无 VITE_)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**开发环境** (.env.local):
```bash
# 前端
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
VITE_HISTORICAL_FROM_BLOCK=9408600

# 后端 (可选,可使用公共 RPC)
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### 验证检查清单

- [ ] 浏览器 Network 面板中看不到 Alchemy URL
- [ ] Vercel Function Logs 显示 "Private RPC request successful"
- [ ] 首次加载耗时合理 (几分钟,而非数小时)
- [ ] 后续访问快速 (几秒,利用缓存)
- [ ] 环境变量中 `SEPOLIA_RPC_URL` 没有 `VITE_` 前缀
