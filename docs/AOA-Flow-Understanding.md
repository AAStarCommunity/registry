# AOA 流程完整理解文档

## 概述

根据与用户的讨论确认，SuperPaymaster 的部署流程有 **两个模式**（不是三个）：
- **[AOA]** - Account Owned Address 模式
- **[Super(AOA+)]** - Super Mode (AOA增强版)

**重要**：没有 "Standard" 模式了，传统的 Standard Flow 已经被改进为 AOA 模式。

---

## 两个模式的对比

### 🔹 AOA 模式
**特点**：部署和运营自己的 Paymaster

**适合**：
- 想要完全控制 Paymaster 的运营商
- 有技术能力维护 Paymaster 的团队
- 需要自定义 Paymaster 逻辑的项目
- 想要独立收取服务费的运营商

### 🔹 Super(AOA+) 模式
**特点**：使用共享的 SuperPaymaster，无需部署

**适合**：
- 想要快速启动的社区
- 不想维护 Paymaster 的运营商
- 小型项目或初创团队
- 想要降低运营成本的项目

---

## 共享组件（两个模式都需要）

两个模式都必须完成以下步骤：

### 1. 部署 SBT (MySBT 合约)
- **作用**：Soul Bound Token，身份验证凭证
- **特点**：不可转移的身份 NFT
- **用途**：验证社区成员身份

### 2. 部署 xPNTs (Gas Token)
- **作用**：社区专属的 gas token
- **用途**：用户用 xPNTs 支付 gas 费用（免 ETH 支付）

### 3. Stake GToken → 获得 stGToken
- **流程**：质押 GToken 到 Staking Contract
- **获得**：stGToken (Staked GToken)
- **数量**：需要质押足够的 GToken 以满足后续 lock 要求

---

## 模式特有步骤

### AOA 模式流程

```
Step 1: 连接钱包 + 选择模式 (AOA)
Step 2: 检查资源 (ETH + GToken)
Step 3: 部署 Paymaster (PaymasterV4.1)
Step 4: 部署资源 (SBT + xPNTs + Stake GToken → stGToken)
Step 5: EntryPoint Deposit (存入 ETH 用于 gas sponsorship)
Step 6: 注册到 Registry
        - Lock stGToken: 30-100 个 (最低 30，推荐 100)
        - 设置 Fee Rate
Step 7: 完成部署
```

### Super(AOA+) 模式流程

```
Step 1: 连接钱包 + 选择模式 (Super)
Step 2: 检查资源 (ETH + GToken + aPNTs)
Step 3: [跳过 Paymaster 部署]
Step 4: 部署资源 (SBT + xPNTs + Stake GToken → stGToken)
Step 5: 加入 SuperPaymaster
        - Lock stGToken: 30-100 个
        - 充值 aPNTs
Step 6: 完成注册
```

---

## 技术原理

### AOA (Account Owned Address)
优化了传统 ERC-4337 的架构：

**传统 4337 的问题**：
- 需要链下签名服务器
- 需要链上验签机制
- 运营成本高
- 技术门槛高

**AOA 的改进**：
- **面向资产抽象**
- **SBT 身份验证** - 不需要链下签名服务器
- **xPNTs 作为 gas token** - 用户免 ETH 支付
- 降低技术门槛和运营成本

### Super(AOA+) 模式
建立了一个共享的 SuperPaymaster：

**核心特点**：
- **不需要部署和运营 Paymaster**
- 只需 **lock stGToken** (30-100 个)
- 只需 **充值 aPNTs**
- 自动获得社区的 **SBT 身份验证 + xPNTs**

**优势**：
- 零运营负担
- 快速启动
- 低成本
- 共享 SuperPaymaster 的声誉和可靠性

---

## 资源需求对比

| 资源 | AOA 模式 | Super(AOA+) 模式 |
|-----|---------|-----------------|
| **ETH** | 0.1+ ETH<br/>(部署 + EntryPoint deposit) | 0.01+ ETH<br/>(仅部署费用) |
| **GToken** | 需要质押以获得 stGToken | 需要质押以获得 stGToken |
| **stGToken** | 30-100 个<br/>(lock 到 Registry) | 30-100 个<br/>(lock 到 SuperPaymaster) |
| **aPNTs** | ❌ 不需要 | ✅ 需要充值 |
| **SBT** | ✅ 需要部署 | ✅ 需要部署 |
| **xPNTs** | ✅ 需要部署 | ✅ 需要部署 |

---

## Lock stGToken 要求

### Registry 注册要求（AOA 模式）
- **最低**: 30 stGToken
- **推荐**: 100 stGToken
- **作用**: 作为信誉保证金，防止恶意行为
- **解锁**: 可以在满足条件后提取

### SuperPaymaster 加入要求（Super 模式）
- **最低**: 30 stGToken
- **推荐**: 100 stGToken
- **作用**: 获得使用 SuperPaymaster 的权限
- **关系**: Lock 的 stGToken 越多，声誉越高

---

## 当前合约支持情况

### ❌ Registry v1.2 - 不支持 stGToken
**当前实现**：
- 使用 ETH staking 机制
- `registerPaymaster()` 接收 ETH 作为 stake
- `addStake()` 和 `withdrawStake()` 都是 ETH-based

**需要增加的功能**：
1. 集成 stGToken ERC20 接口
2. 添加 `lockStGToken()` 函数
3. 添加 `unlockStGToken()` 函数
4. 在注册时检查 stGToken lock 数量（30-100）

### ✅ Registry v1.2 - 已实现 Reputation
**当前实现**：
- `reputation` 字段（0-10000 分）
- 自动计算：基于成功率 `(successCount * 10000) / totalAttempts`
- 支持手动更新：`updateReputation()` by owner
- 默认起始值：5000 (50%)

### 🔍 SuperPaymaster V2 - 需要进一步检查
**已发现**：
- 有 reputation 系统实现
- 使用 Fibonacci reputation levels (1-144 GT)
- 12 个等级

**需要确认**：
- 是否支持 lock stGToken
- Operator 注册机制
- aPNTs 充值机制

---

## 下一步工作

### Phase 2: 合约功能增强
1. **Registry v1.2 增加 stGToken lock 功能**
   - 设计 `lockStGToken()` 接口
   - 设计 `unlockStGToken()` 接口
   - 添加最低/最高 lock 数量限制（30-100）
   - 与现有 reputation 系统集成

2. **SuperPaymaster V2 确认和增强**
   - 确认 operator registration 流程
   - 确认 stGToken lock 机制
   - 确认 aPNTs 充值机制
   - 测试完整 Super(AOA+) 流程

3. **文档和测试**
   - 编写部署脚本
   - 编写测试用例
   - 更新用户文档

### Phase 3: UI 流程实现
1. 重新设计 Step1 (只显示 AOA 和 Super 两个选项)
2. 添加 Step4_DeployResources (SBT + xPNTs + Stake)
3. 修改 Step5/Step6 支持 stGToken lock
4. 更新所有 "Standard" 文案为 "AOA"

---

## 参考文档
- [UI-Improvements-2025-10-24.md](/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/docs/UI-Improvements-2025-10-24.md)
- [SuperPaymasterRegistry_v1_2.sol](/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/src/paymasters/registry/SuperPaymasterRegistry_v1_2.sol)
- [SuperPaymasterV2.sol](/Volumes/UltraDisk/Dev2/aastar/SuperPaymaster/src/paymasters/v2/core/SuperPaymasterV2.sol)

---

## 更新日志
- 2025-10-24: 创建文档，记录完整的 AOA 流程理解
