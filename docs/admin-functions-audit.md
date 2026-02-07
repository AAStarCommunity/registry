# 协议管理员权限全面审计报告 (Protocol Admin Functions Audit)

本文档详细列出了协议核心合约中的管理员功能（Admin/Owner Functions）和受保护的特殊权限功能。
审计目的是为了明确 Protocol Admin 后台需要支持的功能清单，以及梳理当前系统的权限边界。

## 1. 核心注册表 (Registry.sol)

`Registry` 是权限管理的核心，控制着角色（Roles）的定义和配置。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移 Registry 的最高管理权限（建议多签/DAO）。 | 🚨 高危 |
| `createNewRole(roleId, config, roleOwner)` | **Owner** | 创建一个新的生态角色（如 DVT, ANODE 等），并设置初始参数。 | 🔴 高 |
| `adminConfigureRole(roleId, minStake, ...)` | **Owner** | 修改现有角色的关键参数（最小质押、燃烧比例、退出费率等）。 | 🔴 高 |
| `addLevelThreshold(threshold)` | **Owner** | 设置信誉等级的阈值。 | 🟠 中 |
| `grantRole(role, account)` | **Admin/Rule** | 手动赋予某个账户特定权限（标准 AccessControl）。 | 🟠 中 |
| `revokeRole(role, account)` | **Admin/Rule** | 撤销某个账户的权限。 | 🟠 中 |

## 2. 超级支付大师 (SuperPaymaster.sol)

`SuperPaymaster` 管理全协议的资金流和 Gas 赞助策略。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移合约所有权。 | 🚨 高危 |
| `setProtocolFee(newFeeBPS)` | **Owner** | 设置协议抽成比例（基点）。 | 🔴 高 |
| `setTreasury(newTreasury)` | **Owner** | 设置协议收入的接收金库地址。 | 🔴 高 |
| `setOperatorPaused(operator, paused)` | **Owner** | 紧急暂停/恢复某个 Operator 的特定权限或服务。 | 🔴 高 |
| `setOperatorLimits(minTxInterval)` | **Owner** | 设置 Operator 的全局限制参数（如最小交易间隔）。 | 🟠 中 |
| `setAPNTSPrice(newPrice)` | **Owner/Oracle** | 手动更新 aPNTs 的预言机价格（如果未使用 Chainlink 自动更新）。 | 🟠 中 |
| `setAPNTsToken(newToken)` | **Owner** | 更新系统识别的 aPNTs 代币地址。 | 🟠 中 |
| `setBLSAggregator(newBLS)` | **Owner** | 更改绑定的 BLS 聚合器地址。 | 🟠 中 |
| `withdrawTo(to, amount)` | **Owner** | (需确认) 提取合约内滞留资金（非 User 存款部分）。 | 🚨 高危 |

## 3. Paymaster 工厂 (PaymasterFactory.sol)

用于部署和管理 PaymasterV4 实例的工厂合约。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移工厂所有权。 | 🚨 高危 |
| `addImplementation(version, impl)` | **Owner** | 注册新的 Paymaster 实现合约版本。 | 🔴 高 |
| `upgradeImplementation(version, newImpl)` | **Owner** | 升级现有版本的实现地址（需谨慎）。 | 🔴 高 |
| `setDefaultVersion(version)` | **Owner** | 设置部署时默认使用的版本号。 | 🟠 中 |

## 4. Paymaster 实例 (PaymasterV4Impl.sol)

具体的 Paymaster 合约，通常由 Operator 管理。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移 Operator 的管理权限。 | 🔴 高 |
| `withdraw(to, amount)` | **Owner** | Operator 提取自己的 Gas 资金。 | 🔴 高 |
| `setVerifyingSigner(signer)` | **Owner** | 设置用于签名验证的 signer 地址（如果不完全依赖 Registry）。 | 🟠 中 |
| `addDiffToken(token, priceFeed)` | **Owner** | 添加支持的支付代币及其预言机。 | 🟠 中 |
| `updateTokenPrice(token)` | **Owner/Anyone** | 触发更新代币价格（取决于策略）。 | 🟢 低 |

## 5. 治理代币 (GToken.sol)

协议治理代币。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移代币合约所有权。 | 🚨 高危 |
| `mint(to, amount)` | **Owner/Minter** | 铸造新代币（通常受控于 Staking 或 Rewards 需谨慎）。 | 🔴 高 |
| `burn(amount)` | **Owner/Burner** | 销毁代币（通常公开或受控）。 | 🟠 中 |

## 6. 功能代币 (aPNTs.sol)

用于支付 Gas 的功能性代币。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移所有权。 | 🚨 高危 |
| `setSuperPaymasterAddress(addr)` | **Owner** | 绑定 SuperPaymaster 地址。 | 🔴 高 |
| `updateAPNTsPrice(price)` | **Owner/Oracle** | 更新价格（影响兑换率）。 | 🟠 中 |
| `setIndustryMultiplier(industry, mult)` | **Owner** | (如有) 设置特定行业的系数。 | 🟠 中 |
| `updatePrediction(...)` | **Owner** | 更新预估参数。 | 🟠 中 |

## 7. 社区代币工厂 (xPNTsFactory.sol)

用于部署社区具体的 xPNTs 代币。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移工厂所有权。 | 🚨 高危 |
| `setSuperPaymasterAddress(addr)` | **Owner** | 绑定 SuperPaymaster。 | 🔴 高 |
| `setIndustryMultiplier(ind, mult)` | **Owner** | 设置行业倍率。 | 🟠 中 |
| `updatePrediction(...)` | **Owner** | 更新预估参数。 | 🟠 中 |

## 8. 质押系统 (GTokenStaking.sol)

管理角色质押资金。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移所有权。 | 🚨 高危 |
| `setTreasury(addr)` | **Owner** | 设置罚没资金或费用的接收地址。 | 🔴 高 |
| `setRegistry(addr)` | **Owner** | 绑定 Registry。 | 🔴 高 |
| `setAuthorizedSlasher(slasher, bool)` | **Owner** | 授权或取消授权 Slasher（如 SuperPaymaster 或 DVT）。 | 🔴 高 |
| `setRoleExitFee(roleId, percent, min)` | **Owner** | 调整特定角色的退出费用。 | 🟠 中 |

## 9. 灵魂绑定代币 (MySBT.sol)

用户身份与建立关联的 SBT。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `setBaseURI(uri)` | **Owner** | 设置 Metadata 的 Base URI。 | 🟠 中 |
| `setDAOMultisig(addr)` | **Owner** | 设置 DAO 管理地址。 | 🔴 高 |
| `setMinLockAmount(amount)` | **Owner** | 设置最小锁仓数量。 | 🟠 中 |
| `setMintFee(fee)` | **Owner** | 设置铸造费用。 | 🟠 中 |
| `setRegistry(addr)` | **Owner** | 绑定 Registry。 | 🔴 高 |
| `setReputationCalculator(addr)` | **Owner** | 绑定信誉计算器合约。 | 🔴 高 |
| `pause() / unpause()` | **Owner** | 暂停/恢复 SBT 转移或特定功能。 | 🔴 高 |

## 10. BLS 验证器 (BLSValidator.sol)

BLS 签名验证逻辑（主要是纯逻辑，少 Admin）。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `verifyProof(...)` | **Pure** | 纯验证函数，无 Admin。 | ⚪ 无 |

## 11. BLS 聚合器 (BLSAggregator.sol)

管理 BLS 签名聚合与验证者集合。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移所有权。 | 🚨 高危 |
| `setDVTValidator(addr)` | **Owner** | 绑定 DVT 验证逻辑合约。 | 🔴 高 |
| `setSuperPaymaster(addr)` | **Owner** | 绑定 SuperPaymaster。 | 🔴 高 |
| `setDefaultThreshold(num)` | **Owner** | 设置默认签名阈值。 | 🟠 中 |
| `setMinThreshold(num)` | **Owner** | 设置最小签名阈值。 | 🟠 中 |

## 12. 信誉系统 (ReputationSystem.sol)

计算和存储用户信誉分。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移所有权。 | 🚨 高危 |
| `setRule(ruleId, ...)` | **Owner** | 设置信誉计算规则。 | 🟠 中 |
| `setEntropyFactor(comm, factor)` | **Owner** | 设置熵因子（调节难度/系数）。 | 🟠 中 |
| `setNFTBoost(collection, boost)` | **Owner** | 设置特定 NFT 系列的信誉加成。 | 🟠 中 |
| `updateNFTHoldStart(collection)` | **Owner** | 更新 NFT 持有时间计算起点。 | 🟢 低 |

## 13. DVT 验证逻辑 (DVTValidator.sol)

处理 DVT 节点的提案与验证。

| 函数名 | 权限要求 | 描述 | 关键度 |
| :--- | :--- | :--- | :--- |
| `transferOwnership(newOwner)` | **Owner** | 转移所有权。 | 🚨 高危 |
| `addValidator(addr)` | **Owner** | 手动添加 DVT 验证节点。 | 🔴 高 |
| `setBLSAggregator(addr)` | **Owner** | 绑定 BLS 聚合器。 | 🔴 高 |

---

**注：**
*   **🚨 高危**: 涉及合约控制权转移，必须慎用，建议仅通过 Safe 多签操作。
*   **🔴 高**: 涉及核心参数、资金流向、暂停开关，会直接影响协议运行。
*   **🟠 中**: 业务逻辑参数调整，影响体验或经济模型细节。
*   **🟢 低**: 辅助功能或低频操作。
