# Registry 前端合约地址修复

**日期**: 2025-11-08
**问题**: "Verify Resource Requirements" 页面调用旧合约地址导致错误

## 问题描述

Registry 前端在检查社区注册和 xPNTs token 时，调用了**已弃用的旧合约地址**，导致 `missing revert data` 错误。

### 错误信息

```
Failed to check community registration: Error: missing revert data
transaction={ "to": "0x838da93c815a6E45Aa50429529da9106C0621eF0" }

Failed to check xPNTs factory: Error: missing revert data
transaction={ "to": "0x6720Dc8ce5021bC6F3F126054556b5d3C125101F" }
```

### 根本原因

`networkConfig.ts` 中为了向后兼容保留了旧地址：
- `contracts.registry` = `0x838da93c815a6E45Aa50429529da9106C0621eF0` (Registry v1.2, deprecated)
- `contracts.gasTokenFactory` = `0x6720Dc8ce5021bC6F3F126054556b5d3C125101F` (Old xPNTsFactory, deprecated)

但代码应该使用**新的字段**：
- `contracts.registryV2_1` = `0x028aB52B4E0EF26820043ca4F1B5Fe14FfC1EF75` (Registry v2.2.0, from shared-config)
- `contracts.xPNTsFactory` = `0x9dD72cB42427fC9F7Bf0c949DB7def51ef29D6Bd` (from shared-config)

## 修复内容

### 1. `walletChecker.ts:191` - Registry 地址

```diff
  const networkConfig = getCurrentNetworkConfig();
- const registryAddress = networkConfig.contracts.registry;
+ const registryAddress = networkConfig.contracts.registryV2_1;
```

### 2. `walletChecker.ts:309` - xPNTsFactory 地址

```diff
  const networkConfig = getCurrentNetworkConfig();
- const gasTokenFactoryAddress = networkConfig.contracts.gasTokenFactory;
+ const gasTokenFactoryAddress = networkConfig.contracts.xPNTsFactory;
```

### 3. `GetXPNTs.tsx:15` - Registry 地址

```diff
  const networkConfig = getCurrentNetworkConfig();
  const XPNTS_FACTORY_ADDRESS = networkConfig.contracts.xPNTsFactory;
- const REGISTRY_ADDRESS = networkConfig.contracts.registry;
+ const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
```

## 测试验证

### 修复前 ❌

```
walletChecker.ts:166 Failed to check community registration
→ Calling Registry v1.2: 0x838da93c815a6E45Aa50429529da9106C0621eF0

walletChecker.ts:272 Failed to check xPNTs factory
→ Calling Old Factory: 0x6720Dc8ce5021bC6F3F126054556b5d3C125101F
```

### 修复后 ✅

```
✅ Calling Registry v2.2.0: 0x028aB52B4E0EF26820043ca4F1B5Fe14FfC1EF75
✅ Calling xPNTsFactory: 0x9dD72cB42427fC9F7Bf0c949DB7def51ef29D6Bd
```

## 合约地址对照表

| 合约 | 旧地址 (弃用) | 新地址 (v2.2.0) |
|------|--------------|----------------|
| **Registry** | `0x838da93c815a6E45Aa50429529da9106C0621eF0` | `0x028aB52B4E0EF26820043ca4F1B5Fe14FfC1EF75` |
| **xPNTsFactory** | `0x6720Dc8ce5021bC6F3F126054556b5d3C125101F` | `0x9dD72cB42427fC9F7Bf0c949DB7def51ef29D6Bd` |

## 影响范围

**修复的文件**:
- `src/pages/operator/deploy-v2/utils/walletChecker.ts` (2 处)
- `src/pages/resources/GetXPNTs.tsx` (1 处)

**未修改的文件**:
- `src/pages/RegistryExplorer.tsx` - 保持不变，用于版本切换功能

## 最佳实践建议

1. **使用 Helper Functions**: 优先使用 `getLatestRegistry()` 而不是直接访问 `contracts.registry`
2. **从 shared-config 导入**: 新代码应该直接从 `@aastar/shared-config` 导入合约地址
3. **弃用标记**: `networkConfig.ts` 中的 `registry` 和 `gasTokenFactory` 字段标记为 `@deprecated`

## 下一步

- [ ] 测试前端 "Verify Resource Requirements" 页面
- [ ] 验证社区注册检查功能
- [ ] 验证 xPNTs factory 查询功能
- [ ] 考虑完全移除旧地址字段，或添加运行时警告

---

**修复完成时间**: 2025-11-08
**状态**: ✅ 已修复，待测试
