# WalletChecker RPC 错误修复总结

## 问题描述
在 Step 2 资源检查阶段，钱包检查器遇到以下 RPC 错误：
- `execution reverted` 当检查社区注册状态时 (`registry.communities(address)`)
- RPC 连接不稳定，在 MetaMask 和 RPC 代理之间切换

## 根本原因分析
1. **社区注册检查**: `registry.communities(address)` 函数在地址未注册时会 revert，这是正常的合约行为
2. **xPNTsFactory ABI 分析**: 经过检查 ABI，`hasToken(address)` 函数应该返回 `bool`，不会 revert
3. **RPC 复杂性**: 同时使用 RPC 代理和 MetaMask 备用增加了不必要的复杂性

## 解决方案

### 1. 社区注册检查优化
```typescript
// 之前：直接调用 communities()，会 revert
const community = await registry.communities(address);
const isRegistered = community.registeredAt !== 0n;

// 现在：使用 isRegisteredCommunity() 避免 revert
const isRegistered = await registry.isRegisteredCommunity(address);
if (!isRegistered) {
  return { isRegistered: false };
}
// 只有在确认已注册时才获取详细信息
const community = await registry.communities(address);
```

### 2. xPNTs 代币检查简化
```typescript
// 根据 ABI，hasToken() 返回 boolean，不需要特殊错误处理
const hasToken = await factory.hasToken(address);
if (hasToken) {
  const tokenAddress = await factory.getTokenAddress(address);
  status.hasGasTokenContract = true;
  status.gasTokenAddress = tokenAddress;
} else {
  status.hasGasTokenContract = false;
}
```

### 3. RPC 架构简化
- **移除 MetaMask 备用**: 只使用 RPC 代理 (`getRpcUrl()`)
- **简化错误处理**: 移除复杂的 fallback 逻辑
- **提高可靠性**: 单一 RPC 源减少故障点

## 修改的文件
1. **src/pages/operator/deploy-v2/utils/walletChecker.ts**
   - 修复社区注册检查逻辑
   - 简化 xPNTsFactory 检查（移除不必要的 revert 处理）
   - 移除所有 MetaMask RPC 备用逻辑
   - 简化所有函数的 RPC 调用

2. **eslint.config.js** (新增)
   - 将 ESLint 配置移到根目录
   - 修复 lint 命令无法运行的问题

## 技术细节
### ABI 验证
检查了 xPNTsFactory ABI，确认 `hasToken` 函数签名：
```json
{
  "type": "function", 
  "name": "hasToken", 
  "inputs": [{"name": "community", "type": "address"}], 
  "outputs": [{"name": "", "type": "bool"}], 
  "stateMutability": "view"
}
```

### RPC 简化前后对比
- **之前**: RPC 代理 → MetaMask 备用 → 复杂错误处理
- **现在**: 仅 RPC 代理 → 简单错误处理

## 测试验证
- ✅ 项目构建成功 (`pnpm build`)
- ✅ TypeScript 编译通过
- ✅ ESLint 配置正常工作
- ✅ 代码行数减少 74 行（从 482 行减少到 408 行）
- ✅ 移除了不必要的复杂性

## 影响
- **性能提升**: 移除 MetaMask 备用减少了网络请求
- **代码简化**: 更清晰的错误处理逻辑
- **维护性**: 单一 RPC 源更容易调试和维护
- **用户体验**: 新用户不会再看到令人困惑的 "execution reverted" 错误