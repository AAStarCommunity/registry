# Mint SBT 业务流程设计文档

**日期**: 2025-11-06
**版本**: v1.0

---

## 1. 业务流程设计

### 1.1 自助流程（Self-Service Flow）

**适用场景**: 用户有 ETH，自己操作完成整个流程

**流程步骤**:
```
用户准备 ETH
  ↓
Buy GToken (Uniswap/DEX)
  ↓
Stake GToken (GTokenStaking.stake)
  ↓
Mint SBT (MySBT.userMint)
  ↓
完成 ✅
```

**前端页面**: `/mint-sbt` (已存在)
- 步骤 1: 检查 ETH 余额
- 步骤 2: Buy GToken (集成 Uniswap widget)
- 步骤 3: Stake GToken (调用 GTokenStaking.stake)
- 步骤 4: Mint SBT (调用 MySBT.userMint)

**优点**:
- 完全去中心化
- 用户自主控制
- 无需等待人工审核

**缺点**:
- 需要用户有 ETH 支付 gas
- 操作步骤多，技术门槛高

---

### 1.2 傻瓜式无 Gas Mint 流程（Gasless Flow）

**适用场景**: 新用户无 ETH，由项目方代付 gas

**流程设计**:

#### Phase 1: 用户申请
```
用户填写表单
  ↓
钱包签名（EIP-712）
  ↓
提交到 waiting-list (后端 API)
  ↓
等待审核 ⏳
```

**签名内容** (EIP-712):
```solidity
struct MintRequest {
    address user;
    address community;
    string metadata;
    uint256 timestamp;
    uint256 nonce;
}
```

**前端页面**: `/mint-sbt-gasless`
- 用户输入：选择社区、填写个人信息
- 生成签名并提交
- 显示申请状态

#### Phase 2: 后台审核与批量处理
```
人工审核申请
  ↓
导出待处理地址列表 (CSV/JSON)
  ↓
管理员页面批量操作
  ↓
完成 ✅
```

**管理员页面**: `/admin/batch-mint`
- 导入地址列表
- 预览批量操作
- 确认并执行（使用 Multicall）

**Operator 合约接口** (推荐):
```solidity
// MySBT v2.4.3 已有的接口
function mintFor(
    address user,
    address comm,
    string memory meta
) external onlyOperator returns (uint256 tid, bool isNew);

function batchMintFor(
    address[] memory users,
    address[] memory comms,
    string[] memory metas
) external onlyOperator returns (uint256[] memory tids);
```

**优点**:
- 用户无需 ETH，零门槛
- 项目方控制审核流程
- 批量操作节省 gas

**缺点**:
- 需要人工审核，不是实时的
- 中心化审核机制

---

## 2. MySBT 合约检查与改进

### 2.1 确保无许可 Mint 开关默认打开

**检查结果**:
- ✅ Registry.sol Line 171: `profile.allowPermissionlessMint = true;`
- ✅ 新注册社区默认开启无许可 mint

**问题**:
- ❌ 测试社区 Super (0x2dE69065D657760E2C58daD1DaF26C331207c676) 显示为 `false`

**原因分析**:
1. 该社区在添加此默认值之前注册
2. 或社区手动调用 `setPermissionlessMint(false)` 关闭

**解决方案**:
```javascript
// 社区 owner 调用
Registry.setPermissionlessMint(true);
```

---

### 2.2 移除 Auto-Stake 功能的考量

**当前问题**:
1. **复杂度高**: 需要同时处理 stake + burn 两个操作
2. **Bug 风险**: v2.4.2 有 token transfer 顺序错误的 bug
3. **合约大小**: v2.4.3 优化后 24,395 bytes，接近 24KB 限制
4. **Gas 节省有限**: 只节省一次用户交易的 gas (~21000 gas)

**移除 Auto-Stake 后的好处**:
- ✅ 简化合约逻辑，减少 bug 风险
- ✅ 缩小合约体积，留出升级空间
- ✅ 更清晰的职责分离: Staking 是 GTokenStaking 的职责

**替代方案**:
- 前端引导用户先 stake，再 mint
- 使用 Multicall 批量调用 stake + mint（一次交易完成）

**推荐**: ✅ **移除 `mintWithAutoStake`，保留简单的 `userMint`**

---

### 2.3 版本对比

| 功能                  | MySBT v2.4.1 (无 auto-stake) | MySBT v2.4.2 (auto-stake, 有 bug) | MySBT v2.4.3 (auto-stake, 已修复) |
|-----------------------|------------------------------|------------------------------------|------------------------------------|
| **基础 Mint**         | ✅ userMint                   | ✅ userMint                         | ✅ userMint                         |
| **Auto-Stake Mint**   | ❌                            | ✅ mintWithAutoStake (bug)         | ✅ mintWithAutoStake (fixed)       |
| **Operator Mint**     | ✅ mintFor                    | ✅ mintFor                          | ✅ mintFor                          |
| **Burn SBT**          | ✅ burn                       | ✅ burn                             | ✅ burn                             |
| **Transfer Ownership**| ✅ transferCommunityOwnership | ✅ transferCommunityOwnership       | ✅ transferCommunityOwnership       |
| **合约大小**          | ~22KB                         | 24,776 bytes (超限)                | 24,395 bytes (接近上限)            |

**结论**:
- ✅ v2.4.3 保留了 v2.4.1 的所有核心能力
- ⚠️ 增加的 auto-stake 功能带来了复杂度和合约大小压力
- 建议: 部署 MySBT v2.5.0，移除 `mintWithAutoStake`，回归简洁设计

---

### 2.4 Operator 批量 Mint 页面设计

**需求**: Operator 为多个用户批量 stake 和 mint SBT，支付 gas

**合约能力检查**:

#### ✅ 已有接口
```solidity
// MySBT 合约
function mintFor(
    address user,
    address comm,
    string memory meta
) external onlyOperator returns (uint256 tid, bool isNew);
```

#### ❌ 缺少接口
```solidity
// GTokenStaking 合约需要添加
function stakeForBatch(
    address[] memory users,
    uint256[] memory amounts
) external;
```

**当前方案**:
Operator 需要分两步操作：
1. 为每个用户调用 `GTokenStaking.stakeFor(user, minLockAmount)`
2. 为每个用户调用 `MySBT.mintFor(user, comm, meta)`

**优化方案 1**: 使用 Multicall
```javascript
// 前端使用 ethers.js Multicall
const multicall = new Multicall3(MULTICALL3_ADDRESS);
const calls = [];

// Step 1: Batch stake
users.forEach(user => {
  calls.push({
    target: GTOKEN_STAKING,
    callData: gtokenStaking.interface.encodeFunctionData('stakeFor', [user, minLockAmount])
  });
});

// Step 2: Batch mint
users.forEach(user => {
  calls.push({
    target: MYSBT,
    callData: mySBT.interface.encodeFunctionData('mintFor', [user, community, metadata])
  });
});

await multicall.aggregate(calls);
```

**优化方案 2**: 添加批量合约
```solidity
contract MySBTBatchOperator {
    function stakeAndMintForBatch(
        address[] memory users,
        address community,
        string[] memory metadatas
    ) external {
        require(users.length == metadatas.length, "Length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            // Stake for user
            IERC20(GTOKEN).approve(GTOKEN_STAKING, minLockAmount);
            IGTokenStaking(GTOKEN_STAKING).stakeFor(users[i], minLockAmount);

            // Mint for user
            IMySBT(MYSBT).mintFor(users[i], community, metadatas[i]);
        }
    }
}
```

**推荐**: ✅ **使用 Multicall 方案（无需部署新合约）**

---

## 3. 前端页面设计

### 3.1 管理员批量 Mint 页面

**路径**: `/admin/batch-mint`

**UI 布局**:
```
┌─────────────────────────────────────────────┐
│  Batch Mint for Users                       │
├─────────────────────────────────────────────┤
│                                             │
│  Step 1: Import User List                  │
│  ┌───────────────────────────────────────┐ │
│  │ Drop CSV/JSON here or click to upload│ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Step 2: Configure                          │
│  Community: [Dropdown: Mycelium/AAStar]    │
│  Metadata Template: [Text Input]           │
│                                             │
│  Step 3: Preview                            │
│  ┌───────────────────────────────────────┐ │
│  │ 0x1234...  Mycelium  "Member #1"     │ │
│  │ 0x5678...  Mycelium  "Member #2"     │ │
│  │ Total: 50 users                       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Estimated Gas: 0.05 ETH                   │
│                                             │
│  [Cancel]  [Confirm & Execute]             │
│                                             │
└─────────────────────────────────────────────┘
```

**CSV 格式**:
```csv
address,community,metadata
0x1234...,0x2dE6...,Member #1
0x5678...,0x2dE6...,Member #2
```

---

### 3.2 社区列表展示页面

**路径**: `/register-community`

**新增区域**: 已注册社区信息卡片

**UI 设计**:
```
┌─────────────────────────────────────────────┐
│  Registered Communities                     │
│  Total: 12                                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Mycelium │  │  AAStar  │  │  Super   │ │
│  │ 🟢 Active│  │ 🟢 Active│  │ 🟢 Active│ │
│  │ 123 SBTs │  │  45 SBTs │  │  67 SBTs │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  ┌──────────┐                               │
│  │Community4│                               │
│  │ 🟢 Active│                               │
│  │  89 SBTs │                               │
│  └──────────┘                               │
│                                             │
│  [Show More] (if > 4)                       │
│                                             │
└─────────────────────────────────────────────┘
```

**数据来源**:
```javascript
// 调用 Registry 合约
const total = await registry.getCommunityCount();
const communities = await registry.getCommunities(0, 4); // 前 4 个

// 获取每个社区详情
for (const addr of communities) {
  const profile = await registry.getCommunityProfile(addr);
  // 显示 name, isActive, 等
}
```

---

## 4. 测试社区注册脚本

**需求**: 注册 Mycelium 和 AAStar 两个测试社区

**脚本**: `register-test-communities.mjs`

```javascript
// 见下一个文件
```

---

## 5. 推荐实施路径

### Phase 1: 简化合约（优先）
1. ✅ 部署 MySBT v2.5.0（移除 `mintWithAutoStake`）
2. ✅ 更新前端，使用 Multicall 实现 stake + mint 一次交易
3. ✅ 为所有已注册社区开启 `allowPermissionlessMint = true`

### Phase 2: 批量 Mint 功能
1. ✅ 实现管理员批量 mint 页面
2. ✅ 集成 Multicall3 合约
3. ✅ 测试批量操作

### Phase 3: Gasless Mint
1. ✅ 实现用户申请页面（签名）
2. ✅ 后端 API 接收签名请求
3. ✅ 管理员审核与批量处理

### Phase 4: 前端改进
1. ✅ 社区列表展示
2. ✅ 注册测试社区

---

## 6. 总结

| 项目                    | 状态      | 优先级 |
|-------------------------|-----------|--------|
| 移除 auto-stake 功能    | 推荐      | ⭐⭐⭐   |
| Operator 批量 mint 页面 | 可实现    | ⭐⭐⭐   |
| Multicall 优化          | 推荐      | ⭐⭐     |
| Gasless mint 流程       | 可选      | ⭐      |
| 前端社区列表            | 简单      | ⭐⭐     |
| 测试社区注册            | 简单      | ⭐⭐⭐   |

**下一步行动**:
1. 检查 MySBT 历史版本（v2.4.1 无 auto-stake）
2. 对比合约代码
3. 创建测试社区注册脚本
4. 前端添加社区列表展示
