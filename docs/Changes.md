# Registry Project - Change Log

> **历史记录已归档**: 2025-10-29 之前的完整更改历史已备份至 `Changes.backup-20251029-121101.md`

本文档记录 AAStar Registry 项目的开发进展和重要变更。

---

## 2025-10-29 - Registry v2.1 注册流程修复与配置统一

### 核心问题修复

#### 1. Registry 注册参数缺失修复 (commit: f2c635b)
**问题**: Step6 注册到 Registry v2.1 时硬编码 `stGTokenAmount = 0`，导致 "missing revert data" 错误

**根本原因**:
- Registry v2.1 的 `registerCommunity(profile, stGTokenAmount)` 需要传入实际质押的 stGToken 数量
- Step6 未从 Step4 接收质押金额参数

**修复方案**:
- `Step6_RegisterRegistry_v2.tsx`: 新增 `sGTokenAmount` prop
- `DeployWizard.tsx`: 传递 `config.deployedResources?.sGTokenAmount` 到 Step6
- 使用 `ethers.parseEther(sGTokenAmount || "0")` 转换为 wei 单位
- 文件: `src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry_v2.tsx:17,93-94`

#### 2. GTokenStaking 地址不一致问题 (commits: cb3baf0, 03558d7)
**问题**: 用户质押后显示余额为 0.0 stGT

**根本原因**:
- Step4 使用旧 fallback 地址 `0xc3aa...` (GTokenStaking V1 - 使用 MockERC20)
- Step6 通过 networkConfig 使用新地址 `0x1994...` (GTokenStaking V2 - 使用生产 GToken)
- 用户质押到地址 A，但余额查询在地址 B，导致返回 0

**修复方案**: 统一所有 fallback 地址为规范地址 `0x199402b3F213A233e89585957F86A07ED1e1cD67`

**影响文件**:
- `src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx:25`
- `src/pages/operator/deploy-v2/components/StakeToSuperPaymaster.tsx:23`
- `src/pages/resources/GetSBT.tsx:13`
- `.env.example:23`

### 增强诊断能力

#### 3. Step4 质押前预检查 (commit: c648e72)
新增三重验证机制防止交易失败：

**Check 1**: GToken 余额验证
```typescript
const gTokenBalance = await gToken.balanceOf(userAddress);
if (gTokenBalance < stakeAmount) {
  throw new Error(`Insufficient GToken balance...`);
}
```

**Check 2**: 已质押检测
```typescript
const existingStake = await gtokenStaking.getStakeInfo(userAddress);
if (stakedAmount > 0n) {
  // 显示已质押金额，提供继续选项
}
```

**Check 3**: 待处理解锁请求检测
```typescript
if (unstakeRequestedAt > 0n) {
  throw new Error(`You have a pending unstake request...`);
}
```

文件: `src/pages/operator/deploy-v2/steps/Step4_DeployResources.tsx:394-455`

#### 4. Step6 注册前预检查
新增合约验证和余额详细日志：

- 验证 Paymaster 合约存在性
- 验证 xPNTs 合约存在性
- 验证 SBT 合约存在性
- **详细的 stGToken 余额检查**:
  ```typescript
  console.log("🔍 Checking stGToken balance...");
  console.log("GTokenStaking contract:", config.contracts.gTokenStaking);
  const userBalance = await gTokenStaking.balanceOf(userAddress);
  console.log("📊 User stGToken balance:", ethers.formatEther(userBalance), "stGT");
  ```
- 余额不足时提示可能的合约地址不匹配问题

文件: `src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry_v2.tsx:96-147`

### 合约历史调研

#### GToken 演进历程
- **V1 (已废弃)**: `0x54Afca294BA9824E6858E9b2d0B9a19C440f6D35`
  - 类型: MockERC20 (不安全的测试代币)
  - 特性: 无供应量上限，任何人可随意 mint
  - 状态: commit 777536e 已回退

- **V2 (生产环境)**: `0x868F843723a98c6EECC4BF0aF3352C53d5004147`
  - 类型: 生产级 ERC20 代币
  - 特性: 21,000,000 总供应量上限
  - 状态: 当前活跃使用

#### GTokenStaking 演进历程
- **V1 (已废弃)**: `0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2`
  - 依赖: MockERC20 GToken (不安全)
  - 状态: 已弃用

- **V2 (生产环境)**: `0x199402b3F213A233e89585957F86A07ED1e1cD67`
  - 依赖: 生产 GToken V2
  - 部署: commit 2192e36
  - 状态: 当前活跃使用

### 环境配置统一

#### 更新 `.env.local` (用户本地环境)
所有过时地址已更新为最新生产版本：

| 变量名 | 旧值 (MockERC20/V1) | 新值 (生产/V2) |
|--------|---------------------|----------------|
| `VITE_GTOKEN_ADDRESS` | `0x54Af...` (Mock) | `0x868F...` (V2 Production) |
| `VITE_GTOKEN_STAKING_ADDRESS` | `0xc3aa...` (V1) | `0x1994...` (V2 Latest) |
| `VITE_SUPERPAYMASTER_V2_ADDRESS` | `0xb96d...` | `0x2bc6...` |
| `VITE_XPNTS_FACTORY_ADDRESS` | `0x356C...` | `0xE346...` |
| `VITE_MYSBT_ADDRESS` | `0xB330...` | `0xd4EF...` (V2 Latest) |

文件: `.env.local:28-30,92-96`

### 技术细节

**ethers.js v6 单位转换**:
- 输入: `"50"` (用户输入的字符串)
- 转换: `ethers.parseEther("50")` → `50000000000000000000n` (BigInt)
- 链上: 50 * 10^18 wei

**Share-based Staking 机制**:
- 用户质押 GToken → 收到 sGToken (share token)
- sGToken 代表质押池份额
- `balanceOf()` 返回的是 sGToken 数量，非原始 GToken 数量
- 价值会因 slashing 调整

**Registry v2.1 registerCommunity 参数**:
```solidity
function registerCommunity(
    CommunityProfile calldata profile,
    uint256 stGTokenAmount  // Must match actual staked amount
) external
```

### 已解决的错误

1. ✅ **"missing revert data" in Registry registration**
   - 原因: stGTokenAmount 传 0
   - 修复: 传递实际质押金额

2. ✅ **"Insufficient stGToken balance" 显示 0.0**
   - 原因: 合约地址不一致
   - 修复: 统一 fallback 地址

3. ⏳ **"execution reverted (unknown custom error)" in staking**
   - 状态: 已添加预检查诊断
   - 需要: 用户重试以获取详细错误信息

### 下一步操作

**用户需要执行**:
1. 重启开发服务器以加载新环境变量:
   ```bash
   Ctrl+C  # 停止当前服务器
   npm run dev  # 重新启动
   ```

2. 重新尝试质押操作
   - 预检查现在会提供详细的诊断信息
   - 如果仍有错误，日志会显示具体原因

3. 如果质押成功，继续 Step6 注册
   - 现在会传递正确的 stGTokenAmount
   - 余额验证会使用统一的合约地址

---

### GetGToken 页面增强 (补充修复)

#### 问题
用户在 `/get-gtoken` 页面质押时仍然调用旧的 GTokenStaking V1 地址 `0xc3aa...`

#### 根本原因
1. **Vite 环境变量缓存**: `.env.local` 更新后开发服务器未重启
2. **错误提示简陋**: 使用 `alert()` 无法显示详细诊断信息

#### 修复方案
文件: `src/pages/resources/GetGToken.tsx`

1. **添加预检查机制** (类似 Step4):
   - Check 1: GToken 余额验证
   - Check 2: 已质押检测
   - Check 3: 待处理解锁请求检测

2. **改进错误显示**:
   - 移除所有 `alert()` 调用
   - 使用 React state (`error`) 显示错误
   - 添加详细的错误信息 UI (包含合约地址、可能原因)

3. **详细日志**:
   ```typescript
   console.log("=== Staking Pre-flight Checks ===");
   console.log("GToken contract:", config.contracts.gToken);
   console.log("GTokenStaking contract:", config.contracts.gTokenStaking);
   console.log("GToken balance:", ethers.formatEther(gTokenBalance), "GT");
   ```

#### 重要提示
**Vite 环境变量更新后必须重启开发服务器！**

```bash
# 停止当前服务器
Ctrl+C

# 重新启动以加载新的 .env.local
npm run dev
```

---

### Step6 stGToken Approval 修复 (最终修复)

#### 问题
Registry 注册时报错 "missing revert data"，所有预检查都通过但 `registerCommunity()` 调用失败

#### 根本原因
**Registry v2.1 需要从用户账户转移 stGToken，但用户未授权（approve）stGToken 给 Registry 合约**

错误表现：
```
missing revert data (action="estimateGas", data=null, reason=null)
```

这是典型的 ERC20 `transferFrom` 失败且未提供 revert message 的错误。

#### 解决方案
文件: `src/pages/operator/deploy-v2/steps/Step6_RegisterRegistry_v2.tsx:160-187`

添加 approval 流程：

```typescript
// Check and approve stGToken for Registry if needed
const stGTokenStakingSigner = new ethers.Contract(
  config.contracts.gTokenStaking,
  GTOKEN_STAKING_ABI,
  signer
);

const currentAllowance = await stGTokenStakingSigner.allowance(
  userAddress,
  config.contracts.registryV2_1
);

if (currentAllowance < stGTokenAmountWei) {
  console.log("📝 Approving stGToken for Registry...");
  const approveTx = await stGTokenStakingSigner.approve(
    config.contracts.registryV2_1,
    stGTokenAmountWei
  );
  await approveTx.wait();
  console.log("✅ stGToken approved for Registry");
}
```

#### 完整注册流程

**Step 4: 质押 GToken**
1. 用户质押 GToken 到 GTokenStaking
2. 收到 stGToken (share token)

**Step 6: 注册到 Registry v2.1**
1. ✅ 检查合约存在性（Paymaster, xPNTs, SBT）
2. ✅ 检查 stGToken 余额
3. ✅ **检查 stGToken allowance** (新增)
4. ✅ **自动 approve stGToken 给 Registry** (新增)
5. ✅ 检查是否已注册
6. ✅ 调用 `registerCommunity(profile, stGTokenAmount)`

#### 技术细节

**stGToken 是什么？**
- stGToken 是 GTokenStaking 合约的 share token
- GTokenStaking 实现了 ERC20 接口（balanceOf, approve, allowance, transferFrom）
- 用户质押 GToken → 收到 stGToken
- stGToken 数量代表在质押池中的份额

**为什么需要 approve？**
- Registry v2.1 的 `registerCommunity()` 需要从用户账户转移 stGToken
- 使用 `transferFrom(user, registry, amount)` 实现转移
- transferFrom 需要用户先 approve

**RPC 配置（安全架构）**

**前端** (`.env.local`):
```bash
# 使用后端代理，不暴露 API key
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy
```

**后端** (`.env.local`):
```bash
# 后端环境变量，不会暴露到前端
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N
```

**安全说明**:
- ⚠️ **绝对不要在 VITE_ 变量中直接使用私有 RPC URL**
- ✅ VITE_ 变量会被打包到前端代码，任何人都可以看到
- ✅ 使用 `/api/rpc-proxy` 后端代理保护 API key
- ✅ 代理会自动 fallback 到公共 RPC（无需 API key）

### 用户资金定位与迁移指引

#### 问题：注册失败显示 stGToken 余额 0.0

**诊断过程**:
使用 `cast` 检查用户 `0x411BD567E46C0781248dbB6a9211891C032885e5` 的资金分布：

```bash
# 检查 GToken 余额
cast call 0x868F843723a98c6EECC4BF0aF3352C53d5004147 \
  "balanceOf(address)(uint256)" 0x411BD567E46C0781248dbB6a9211891C032885e5
# 结果: 510000000000000000000 = 510.0 GT ✅

# 检查旧合约 V1 (0xc3aa...) stGToken 余额
cast call 0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2 \
  "balanceOf(address)(uint256)" 0x411BD567E46C0781248dbB6a9211891C032885e5
# 结果: 50000000000000000000 = 50.0 stGT ⚠️

# 检查新合约 V2 (0x1994...) stGToken 余额
cast call 0x199402b3F213A233e89585957F86A07ED1e1cD67 \
  "balanceOf(address)(uint256)" 0x411BD567E46C0781248dbB6a9211891C032885e5
# 结果: 0 = 0.0 stGT ❌

# 检查旧合约质押详情
cast call 0xc3aa5816B000004F790e1f6B9C65f4dd5520c7b2 \
  "getStakeInfo(address)(uint256,uint256,uint256,uint256)" \
  0x411BD567E46C0781248dbB6a9211891C032885e5
# 结果:
#   - stakedAmount: 50.0 GT
#   - shares: 50.0
#   - stakedAt: 1761326652 (2025-10-24 00:50:52)
#   - unstakeRequestedAt: 0 (无 pending unstake)
```

**诊断结论**:
- ✅ 用户有 510 GT 可用余额
- ⚠️ 用户在**旧合约 V1** 上质押了 50 GT（2025-10-24）
- ❌ 用户在**新合约 V2** 上余额为 0
- ❌ Registry v2.1 只接受**新合约 V2** 的 stGToken

**解决方案**:

**方案 A（推荐）**: 在新合约上直接质押新的 50 GT
- 用户有 510 GT 可用余额，足够质押
- 无需等待 unstake cooldown
- 保留旧合约质押作为备份

操作步骤：
1. 重启开发服务器清除缓存：
   ```bash
   pkill -f "node.*vite"
   rm -rf node_modules/.vite
   npm run dev
   ```
2. 浏览器硬刷新 (Cmd+Shift+R / Ctrl+Shift+R)
3. 进入 Deploy Wizard Step 4
4. 质押 50 GT 到新合约 V2 (0x1994...)
5. 继续 Step 6 注册到 Registry v2.1

**方案 B（可选）**: 从旧合约 unstake，然后在新合约 stake
- 节省 GToken，复用同一笔资金
- 可能需要等待 cooldown period
- 操作步骤：
  1. 在旧合约上调用 `requestUnstake()`
  2. 等待 cooldown period（如果有）
  3. 调用 `withdraw()` 提取 GToken
  4. 在新合约上质押

**工具脚本**: 创建了 `check-stgtoken-balance.js` 用于诊断余额分布

---

**技术栈**: React + TypeScript + ethers.js v6 + ERC-4337 (EntryPoint v0.7)
**测试网**: Sepolia
**关键合约**: Registry v2.1, GTokenStaking V2, MySBT v2.3
