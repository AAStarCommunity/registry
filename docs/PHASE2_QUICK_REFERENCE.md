# Phase 2 快速参考指南

**最后更新**: 2025-10-15  
**Phase**: 2 - Operator Portal + Paymaster Management

---

## 🚀 快速启动

### 本地开发

```bash
# 方式 1: 使用脚本 (推荐)
cd /Users/jason/Dev/mycelium/my-exploration/projects/registry
./scripts/dev.sh

# 方式 2: 手动启动
# Terminal 1
vercel dev --listen 3000

# Terminal 2
pnpm run dev
```

**访问地址**:
- Operator Portal: http://localhost:5173/operator/deploy
- Marketing Page: http://localhost:5173/operator
- Analytics: http://localhost:5173/analytics

---

## 📁 关键文件位置

### 合约
```
SuperPaymaster/contracts/
├── src/v3/
│   ├── PaymasterV4.sol          # 基础合约 (不要修改)
│   └── PaymasterV4_1.sol        # Phase 2 新增
├── script/
│   └── DeployPaymasterV4_1.s.sol # 部署脚本
└── test/
    ├── PaymasterV4.t.sol
    └── PaymasterV4_1.t.sol
```

### 前端
```
registry/
├── src/pages/operator/          # Operator Portal (Phase 2)
│   ├── OperatorPortal.tsx       # 主入口
│   ├── DeployPaymaster.tsx      # Step 1
│   ├── ConfigurePaymaster.tsx   # Step 2
│   ├── StakeEntryPoint.tsx      # Step 3
│   ├── RegisterToRegistry.tsx   # Step 4
│   └── ManagePaymaster.tsx      # Step 5 (含 Deactivate)
├── src/pages/OperatorsPortal.tsx # 营销页面
└── src/utils/rpc-provider.ts    # RPC proxy 支持
```

### 文档
```
docs/
├── PHASE2_UNIFIED_PLAN.md           # 原始计划
├── PHASE2_CODE_REVIEW_REPORT.md    # 代码审查
├── PHASE2_COMPLETION_SUMMARY.md    # 完成总结
├── PHASE2_QUICK_REFERENCE.md       # 本文档
└── LOCAL_DEVELOPMENT.md            # 开发环境配置
```

---

## 🔑 核心功能

### PaymasterV4_1 新增函数

```solidity
// 设置 Registry 地址
function setRegistry(address _registry) external onlyOwner

// 停用 Paymaster (停止接受新请求)
function deactivateFromRegistry() external onlyOwner

// 检查 Registry 是否设置
function isRegistrySet() external view returns (bool)

// 检查在 Registry 中的激活状态
function isActiveInRegistry() external view returns (bool)
```

### Operator Portal 流程

```
选择模式 → 部署 → 配置 → Stake → 注册 → 管理
   ↓         ↓       ↓       ↓       ↓       ↓
Select → Deploy → Config → Stake → Register → Manage
```

**每步详情**:

1. **Deploy**: 部署 PaymasterV4_1 合约
   - 连接 MetaMask
   - 配置参数 (Treasury, Rates, Caps)
   - 估计 gas: ~0.02 ETH

2. **Configure**: 设置 SBT 和 GasToken
   - 选择现有合约 OR 部署新合约
   - `addSBT()` + `addGasToken()`

3. **Stake**: 存入 ETH 到 EntryPoint
   - Deposit (必需): ≥ 0.1 ETH
   - Stake (可选): ≥ 0.05 ETH

4. **Register**: 注册到 Registry
   - Approve GToken (≥ 10 GToken)
   - 提交 metadata
   - `registerPaymaster()`

5. **Manage**: 管理 Paymaster
   - 查看状态
   - **Deactivate** (新功能)
   - Pause/Unpause
   - 参数调整

---

## 🧪 测试

### 合约测试

```bash
cd /Users/jason/Dev/mycelium/my-exploration/projects/SuperPaymaster/contracts

# 运行所有测试
forge test

# 运行特定测试
forge test --match-contract PaymasterV4_1Test

# 详细输出
forge test -vvv
```

**期望结果**: 18/18 通过 ✅

### 前端测试 (手动)

1. **访问 Portal**: http://localhost:5173/operator/deploy
2. **选择模式**: "Deploy New Paymaster"
3. **连接钱包**: MetaMask (Sepolia)
4. **逐步测试**:
   - Step 1: 填写配置 (可使用测试地址)
   - Step 2: 输入现有 SBT/GasToken 地址
   - Step 3: Deposit 测试 ETH
   - Step 4: Approve + Register (需要 GToken)
   - Step 5: 测试 Deactivate

---

## 🔧 常用命令

### Git 操作

```bash
# 在 SuperPaymaster 仓库
cd /Users/jason/Dev/mycelium/my-exploration/projects/SuperPaymaster
git add contracts/
git commit -m "feat: PaymasterV4_1 with Registry management"
git push

# 在 registry 仓库
cd /Users/jason/Dev/mycelium/my-exploration/projects/registry
git add src/
git commit -m "feat: Operator Portal with 5-step deployment flow"
git push
```

### 合约部署

```bash
cd /Users/jason/Dev/mycelium/my-exploration/projects/SuperPaymaster/contracts

# 部署到 Sepolia
forge script script/DeployPaymasterV4_1.s.sol:DeployPaymasterV4_1 \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

### 环境变量

```bash
# SuperPaymaster/.env
DEPLOYER_PRIVATE_KEY=0x...
DEPLOYER_ADDRESS=0x...
ENTRY_POINT_V07=0x0000000071727De22E5E9d8BAf0edAc6f37da032
SEPOLIA_RPC_URL=https://...
ETHERSCAN_API_KEY=...

# registry/.env.local
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
SEPOLIA_RPC_URL=https://... (private)
VITE_PUBLIC_SEPOLIA_RPC=https://... (public fallback)
VITE_REGISTRY_ADDRESS=0x...
VITE_GTOKEN_ADDRESS=0x...
VITE_ENTRY_POINT_V07=0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

---

## 🐛 故障排查

### 问题 1: RPC 404 错误

**症状**:
```
POST http://localhost:5173/api/rpc-proxy 404 (Not Found)
```

**解决**:
1. 确认 Vercel dev server 在运行 (port 3000)
2. 检查 `vite.config.ts` 有 proxy 配置
3. 重启两个服务器

```bash
./scripts/dev.sh
```

### 问题 2: Paymaster 显示 "not registered"

**症状**: PaymasterDetail 页面显示未注册警告

**检查**:
1. Paymaster 是否已调用 `setRegistry()`
2. 是否已完成 Registry 注册流程
3. RPC 是否正常工作 (见问题 1)

### 问题 3: 部署失败 "模拟部署"

**症状**: DeployPaymaster 显示 "Deployment simulation"

**原因**: 合约 ABI/Bytecode 尚未集成

**临时方案**: 输入已部署的 PaymasterV4_1 地址进行测试

**Sepolia 测试地址**: `0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445`

### 问题 4: MetaMask 交易失败

**检查**:
- 是否在 Sepolia 网络
- 账户是否有足够 ETH
- Gas limit 是否足够
- 合约 owner 是否正确

---

## 📊 部署信息

### Sepolia Testnet

**EntryPoint v0.7**:
```
0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

**PaymasterV4_1** (示例):
```
0xBC56D82374c3CdF1234fa67E28AF9d3E31a9D445
```

**Registry** (待配置):
```
VITE_REGISTRY_ADDRESS=0x...
```

**GToken** (待配置):
```
VITE_GTOKEN_ADDRESS=0x...
```

---

## 📝 开发检查清单

### 代码修改前
- [ ] 拉取最新代码
- [ ] 检查 .env 配置
- [ ] 运行测试确保通过

### 修改合约
- [ ] 只修改 PaymasterV4_1.sol (不要动 V4)
- [ ] 更新对应测试文件
- [ ] 运行 `forge test`
- [ ] 更新文档注释

### 修改前端
- [ ] 检查 TypeScript 类型
- [ ] 更新 props 接口
- [ ] 测试错误处理
- [ ] 验证 MetaMask 交互

### 提交代码
- [ ] Git commit message 清晰
- [ ] 分别在两个仓库提交
- [ ] 不要在 projects 根目录操作 git
- [ ] 更新相关文档

---

## 🎯 下一步任务

### Phase 2 收尾 (立即)
1. [ ] 集成合约部署 (DeployPaymaster.tsx)
2. [ ] 集成 Factory 合约 (SBT, GasToken)
3. [ ] 完善环境变量配置
4. [ ] E2E 测试
5. [ ] 用户文档

### Phase 3 准备 (之后)
1. [ ] 目录结构重组 (Plan A)
2. [ ] 参数调整界面
3. [ ] 更多管理功能
4. [ ] 历史记录查询

---

## 🔗 有用链接

- **ERC-4337 Docs**: https://eips.ethereum.org/EIPS/eip-4337
- **EntryPoint v0.7**: https://github.com/eth-infinitism/account-abstraction
- **Foundry Book**: https://book.getfoundry.sh/
- **ethers.js Docs**: https://docs.ethers.org/v6/
- **Sepolia Faucet**: https://sepoliafaucet.com/

---

## 💡 最佳实践

### 合约开发
- 继承而非修改历史版本
- 完善的 NatSpec 注释
- 事件记录关键操作
- 自定义错误节省 gas

### 前端开发
- 完善的错误处理
- 加载状态显示
- 交易确认提示
- 用户友好的错误消息

### 测试
- 单元测试覆盖所有函数
- 边界条件测试
- 权限控制测试
- E2E 用户流程测试

---

**快速上手**: 运行 `./scripts/dev.sh` → 访问 http://localhost:5173/operator/deploy → 开始部署! 🚀
