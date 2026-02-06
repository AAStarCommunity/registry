# 钱包与旧功能处理方案

## 1. 钱包兼容方案

### 两种模式

| 模式 | 环境检测 | 签名器 | 交易流程 |
|------|----------|--------|----------|
| EOA 钱包 | `window?.parent === window` | ethers BrowserProvider | 直接签名 |
| Safe 多签 | `window?.parent !== window` | Safe Apps SDK | 多签提案 → 签名收集 → 执行 |

### 实现方式

```typescript
// contexts/WalletContext.tsx
const isSafeApp = window?.parent !== window;

if (isSafeApp) {
  const safe = new SafeAppsSDK();
  // 交易通过 Safe UI 提交
  const txs = [{ to, data, value }];
  await safe.txs.send({ txs });
} else {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  // 直接签名发送
}
```

### 技术成本：中等 ✅

- Registry 已有 Safe SDK 依赖
- 只需封装钱包层，SDK API 层不变
- Safe 环境自动显示多签界面

---

## 2. 旧功能迁移方案

### 需要迁移到 `deprecated/`

**operator 目录** (直接操作合约的管理页面)：
- `ManagePaymaster.tsx` (17KB)
- `ManagePaymasterAOA.tsx` (42KB)
- `SuperPaymasterConfig.tsx` (34KB)
- `DeployWizard.tsx` (6KB)
- `deploy-v2/` (29 files)

**resources 目录** (直接操作合约的流程页面)：
- `GetGToken.tsx` (61KB)
- `GetXPNTs.tsx` (62KB)
- `RegisterCommunity.tsx` (51KB)
- `LaunchPaymaster.tsx` (49KB)
- `ConfigureSuperPaymaster.tsx` (16KB)

### 保留（网站基础）

- `LandingPage` - 官网首页
- `ExplorerHub` - 浏览器/数据展示
- `DeveloperPortal` - 开发者门户
- `OperatorsPortal` - Operator 门户（可作为跳转入口）
- `legal/*` - 法律页面
- `admin/AdminBatchMint` - Admin 批量铸造（可能需要迁移）

### 迁移步骤

```bash
mkdir -p src/pages/deprecated/operator
mkdir -p src/pages/deprecated/resources

# 移动直接操作合约的管理页面
git mv src/pages/operator/ManagePaymaster* src/pages/deprecated/operator/
git mv src/pages/operator/SuperPaymasterConfig* src/pages/deprecated/operator/
git mv src/pages/operator/DeployWizard* src/pages/deprecated/operator/
git mv src/pages/operator/deploy-v2 src/pages/deprecated/operator/

# 移动直接操作合约的流程页面
git mv src/pages/resources/GetGToken* src/pages/deprecated/resources/
git mv src/pages/resources/GetXPNTs* src/pages/deprecated/resources/
git mv src/pages/resources/RegisterCommunity* src/pages/deprecated/resources/
git mv src/pages/resources/LaunchPaymaster* src/pages/deprecated/resources/
git mv src/pages/resources/ConfigureSuperPaymaster* src/pages/deprecated/resources/
```

### 路由更新

从 App.tsx 移除废弃路由，保留基础网站路由。

---

## 总结

**兼容性**：✅ 可行，成本中等
**迁移**：✅ 清晰，保留参考

可以继续下一步计划。
