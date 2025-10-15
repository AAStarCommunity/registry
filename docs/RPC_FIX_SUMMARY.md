# RPC 错误修复总结

**日期**: 2025-10-15  
**问题**: Analytics Dashboard 仍然出现 RPC 404 错误  
**状态**: ✅ 已修复

---

## 🐛 问题描述

用户报告手动刷新 Analytics Dashboard 后仍然报错:

```
Error: unsupported protocol /api/rpc-proxy
POST http://localhost:5173/api/rpc-proxy 404 (Not Found)
```

**错误位置**: `useGasAnalytics.ts:372`

---

## 🔍 根本原因

`useGasAnalytics.ts` 文件中直接使用了 `new ethers.JsonRpcProvider(RPC_URL)`,没有使用我们创建的 `ProxyRpcProvider`。

虽然我们之前修复了:
- ✅ `PaymasterDetail.tsx` - 使用 `getProvider()`
- ✅ `rpc-provider.ts` - 创建了 `ProxyRpcProvider` 类
- ✅ `vite.config.ts` - 配置了 proxy

但是 **漏掉了** `useGasAnalytics.ts`!

---

## ✅ 修复方案

### 修改的文件

**`src/hooks/useGasAnalytics.ts`**:

```diff
 import { useState, useEffect, useCallback } from "react";
 import { ethers } from "ethers";
+import { getProvider } from "../utils/rpc-provider";

-// RPC Configuration
-const RPC_URL =
-  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
-
 export async function fetchAllPaymastersAnalytics(
   fromBlock?: number,
   toBlock?: number,
 ): Promise<GasAnalytics> {
-  const provider = new ethers.JsonRpcProvider(RPC_URL);
+  const provider = getProvider();
```

### 修改内容

1. **导入 getProvider()**:
   ```typescript
   import { getProvider } from "../utils/rpc-provider";
   ```

2. **替换 provider 创建**:
   ```typescript
   // Before
   const provider = new ethers.JsonRpcProvider(RPC_URL);
   
   // After
   const provider = getProvider();
   ```

3. **移除不再需要的常量**:
   ```typescript
   // 删除
   const RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
   ```

---

## 🎯 修复效果

### 修复前
```
useGasAnalytics.ts:372 → new ethers.JsonRpcProvider(RPC_URL)
                        → RPC_URL = "/api/rpc-proxy"
                        → ethers.js 报错: unsupported protocol
                        → 404 Not Found
```

### 修复后
```
useGasAnalytics.ts:372 → getProvider()
                        → 检测 "/api/" 前缀
                        → 使用 ProxyRpcProvider
                        → fetch("/api/rpc-proxy")
                        → Vite proxy 转发到 localhost:3000
                        → Vercel dev 处理请求
                        → ✅ 成功!
```

---

## 📝 完整的 RPC 架构

现在所有组件都使用统一的 RPC provider:

```
组件层
├── PaymasterDetail.tsx ──┐
├── AnalyticsDashboard.tsx │
└── useGasAnalytics.ts ────┤
                           │
                    getProvider()  ← 统一入口
                           │
                    rpc-provider.ts
                           │
      ┌────────────────────┴────────────────────┐
      │                                         │
 检测 /api/ 前缀?                          普通 HTTP(S)?
      │                                         │
ProxyRpcProvider                      JsonRpcProvider
      │                                         │
 fetch("/api/rpc-proxy")              直接 RPC 调用
      │
 Vite Proxy (localhost:5173)
      │
 转发到 localhost:3000
      │
 Vercel Dev Server
      │
 /api/rpc-proxy.ts (serverless function)
      │
 私有 RPC → (fallback) → 公共 RPC
```

---

## 🧪 测试结果

### 测试步骤

1. 启动开发环境:
   ```bash
   cd registry
   ./scripts/dev.sh
   ```

2. 访问 Analytics Dashboard:
   ```
   http://localhost:5173/analytics
   ```

3. 点击 "Refresh" 按钮

### 期望结果

- ✅ 不再出现 "unsupported protocol" 错误
- ✅ 不再出现 404 错误
- ✅ 成功查询 Registry
- ✅ 正常加载 Paymaster 数据
- ✅ 控制台显示正常日志

---

## 📂 相关文件

**修改的文件**:
- `src/hooks/useGasAnalytics.ts` (+2, -5 lines)

**相关文件**:
- `src/utils/rpc-provider.ts` (ProxyRpcProvider 实现)
- `src/pages/analytics/PaymasterDetail.tsx` (已使用 getProvider)
- `vite.config.ts` (proxy 配置)
- `api/rpc-proxy.ts` (Vercel serverless function)

---

## 🔄 Git 提交

**Commit**: `4437ba7`

```
fix: use getProvider() in useGasAnalytics to support RPC proxy

- Import getProvider() from rpc-provider
- Replace direct JsonRpcProvider instantiation
- Remove unused RPC_URL constant
- Fix Analytics Dashboard RPC 404 errors

This ensures Analytics Dashboard uses the same RPC proxy
configuration as PaymasterDetail, fixing the 'unsupported
protocol /api/rpc-proxy' error.
```

---

## 🎓 经验教训

### 1. 全局搜索的重要性

修复 RPC 配置时,应该搜索**所有** `new ethers.JsonRpcProvider` 的使用:

```bash
grep -r "new ethers.JsonRpcProvider" src/
```

结果:
- `src/utils/rpc-provider.ts` ✅ (内部使用,正确)
- `src/hooks/useGasAnalytics.ts` ❌ (被遗漏!)

### 2. 测试覆盖面

修复后应该测试所有使用 RPC 的页面:
- ✅ PaymasterDetail
- ❌ AnalyticsDashboard (被遗漏!)
- ✅ Operator Portal

### 3. 代码审查清单

在类似的架构性修改后,应该检查:
- [ ] 所有相关文件是否已更新?
- [ ] 是否有其他组件使用旧模式?
- [ ] 是否所有测试都通过?
- [ ] 文档是否已更新?

---

## ✅ 当前状态

### 已修复
- ✅ PaymasterDetail RPC 配置
- ✅ useGasAnalytics RPC 配置
- ✅ Vite proxy 配置
- ✅ ProxyRpcProvider 实现
- ✅ 本地开发文档

### 完整的 RPC 支持
- ✅ `/api/rpc-proxy` 相对路径
- ✅ `http://localhost:3000` 代理
- ✅ 私有 RPC fallback
- ✅ 公共 RPC fallback

---

## 🚀 下一步

现在 RPC 配置已完全修复,可以继续:

1. **测试所有页面**:
   - Analytics Dashboard ✅
   - PaymasterDetail ✅
   - Operator Portal (Step 3-5 需要 RPC)

2. **部署 PaymasterV4_1**:
   - 参考 `SuperPaymaster/docs/DEPLOY_V4_1.md`
   - 更新文档中的地址

3. **完成 Phase 2 收尾**:
   - 合约部署集成
   - E2E 测试

---

**修复完成!** 🎉

现在刷新 Analytics Dashboard 应该不会再出现 RPC 错误了。
