# Registry V3 多链支持文档

## 当前已配置网络

| 网络 | Chain ID | RPC Endpoint | Explorer |
|------|----------|--------------| ---------|
| **Sepolia** | `11155111` | `https://rpc.sepolia.org` | https://sepolia.etherscan.io |

## 未来待添加网络

根据 SDK 部署进度，以下网络可快速启用：

| 网络 | Chain ID | 预留配置 | 状态 |
|------|----------|----------|------|
| **OP Sepolia** | `11155420` | 已预留 | ⏳ 等待 SDK 部署 |
| **Optimism** | `10` | 待配置 | ⏳ 主网部署后 |
| **Arbitrum** | `42161` | 待配置 | ⏳ 主网部署后 |
| **Base** | `8453` | 待配置 | ⏳ 主网部署后 |

## 架构说明

### 1. 网络配置（WalletContext.tsx）

```typescript
export const SUPPORTED_NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
  },
  // 添加新网络只需添加配置项
};
```

### 2. SDK 合约地址（@aastar/core/contracts.ts）

```typescript
export const CONTRACTS = {
  sepolia: SEPOLIA_CONTRACTS,
  // 添加新网络合约地址
  // optimism: OPTIMISM_CONTRACTS,
};
```

### 3. 自动切换流程

```
用户切换钱包网络
    ↓
WalletContext 检测 chainId 变化
    ↓
更新 network 变量 ('sepolia' → 'optimism')
    ↓
V3 Admin 页面使用 SDK API
    ↓
SDK 自动加载对应网络的合约地址
    ↓
getContracts(network) → 正确的合约实例
```

## 添加新网络步骤

### Phase 1: SDK 部署（Contracts Team）
1. 在目标链部署所有合约
2. 更新 `@aastar/core/contract-addresses.ts`
3. 添加网络到 `CONTRACTS` 对象

### Phase 2: Registry 前端配置（3 分钟）
1. 在 `WalletContext.tsx` 的 `SUPPORTED_NETWORKS` 添加网络配置
2. 在 `rpc-provider.ts` 的 `RPC_URLS` 添加 RPC endpoint（如果需要自定义）
3. ✅ 完成！所有页面自动支持新网络

### Phase 3: 验证
```bash
# 1. 启动应用
pnpm dev:vite

# 2. 连接钱包并切换到新网络
# 3. 访问 /v3-admin 页面
# 4. 确认 NetworkSwitcher 显示正确网络
# 5. 测试 SDK API 调用
```

## 技术细节

### 钱包连接
- **EOA 钱包**：自动检测网络，支持 `wallet_switchEthereumChain`
- **Safe 多签**：读取 Safe 环境 chainId，提示用户在 Safe UI 切换

### RPC Provider
- **V3 Admin 页面**：使用 SDK Clients（自动处理网络）
- **Explorer 页面**：使用 `getProvider(chainId)` 进行只读查询

### 网络切换事件
```typescript
window.ethereum.on('chainChanged', (newChainId) => {
  // 自动刷新页面以重新加载合约
  window.location.reload();
});
```

## 性能优化建议

### 使用 Alchemy/Infura（可选）

如需更稳定的 RPC 服务，可配置 `.env`（**不会暴露到前端**）：

```bash
# .env (后端或构建时注入)
VITE_SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
VITE_OP_SEPOLIA_RPC_URL="https://opt-sepolia.g.alchemy.com/v2/YOUR_KEY"
```

然后修改 `rpc-provider.ts`:
```diff
const RPC_URLS: Record<number, string> = {
-  11155111: 'https://rpc.sepolia.org',
+  11155111: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
};
```

## 当前限制

- ✅ 前端已支持多链切换
- ⏸️ SDK 目前仅部署了 Sepolia
- ⏸️ 新链需要先在 SDK 配置合约地址

## 相关文件

- [WalletContext.tsx](file:///Users/jason/Dev/mycelium/my-exploration/projects/registry/src/contexts/WalletContext.tsx) - 网络配置和切换
- [NetworkSwitcher.tsx](file:///Users/jason/Dev/mycelium/my-exploration/projects/registry/src/components/NetworkSwitcher.tsx) - 网络切换 UI
- [rpc-provider.ts](file:///Users/jason/Dev/mycelium/my-exploration/projects/registry/src/utils/rpc-provider.ts) - RPC 工具函数
- [@aastar/core/contracts.ts](file:///Users/jason/Dev/mycelium/my-exploration/projects/aastar-sdk/packages/core/src/contracts.ts) - SDK 合约地址
