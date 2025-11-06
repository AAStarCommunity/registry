# 配置更新总结 - 2025-11-06

**更新原因**: MySBT v2.4.3 部署成功,Mycelium 测试社区注册完成

---

## 更新的合约地址

### MySBT v2.4.2 → v2.4.3

| 项目 | v2.4.2 | v2.4.3 |
|------|--------|--------|
| **地址** | `0xD20F64718485E8aA317c0f353420cdB147661b20` | `0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C` |
| **部署日期** | 2025-11-05 | 2025-11-06 |
| **代码行数** | 474 行 | 509 行 |
| **合约大小** | 24,776 bytes (超限) | 24,395 bytes (OK) |
| **状态** | ❌ 有 bug | ✅ 已修复 |

**v2.4.3 修复内容**:
- ✅ 修复 `mintWithAutoStake()` token transfer 顺序错误
- ✅ 正确处理 stake + burn 两个操作
- ✅ 合约大小在 24KB 限制内

**测试结果**:
- ✅ 成功使用 Mycelium 社区测试
- ✅ SBT ID 1 铸造成功 (TEST-USER5)
- ✅ 交易: [0x59548181ffd6fcfaa10ce4f31e9c37303623b8c16fcc160245347fb66495e196](https://sepolia.etherscan.io/tx/0x59548181ffd6fcfaa10ce4f31e9c37303623b8c16fcc160245347fb66495e196)

### GTokenStaking (无地址变化,更新文档)

| 项目 | 值 |
|------|-----|
| **版本** | v2.0.1 |
| **地址** | `0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0` |
| **新功能** | `stakeFor()` - 为其他用户质押 |
| **API 变更** | `balanceOf()` 替代 `stakedBalance()` |

---

## 更新的测试社区

### Mycelium Community

| 项目 | 值 |
|------|-----|
| **社区地址** | `0x411BD567E46C0781248dbB6a9211891C032885e5` |
| **节点类型** | PAYMASTER_SUPER |
| **质押数量** | 100 GT |
| **无权限 mint** | ✅ 开启 (allowPermissionlessMint = true) |
| **注册交易** | [0x933387292984dba7aabac43c86c56fd8a0ef1750609b1616f3a75f6e3c1abf4c](https://sepolia.etherscan.io/tx/0x933387292984dba7aabac43c86c56fd8a0ef1750609b1616f3a75f6e3c1abf4c) |

---

## 已更新的文件

### 1. SuperPaymaster/data-relation.md

**变更**:
```diff
  2. GTokenStaking (质押合约)

- - 版本: v2.0.0
- - 地址: 0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa
+ - 版本: v2.0.1
+ - 地址: 0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0
  - 类型: Staking + Lock + Slash 机制
  - 作用: GToken 质押、锁定、惩罚系统
+ - 新功能: stakeFor() - 为其他用户质押
+ - API变更: 使用 balanceOf() 替代 stakedBalance()

  4. MySBT (灵魂绑定代币)

- - 版本: v2.4.0
- - 地址: 0x73E635Fc9eD362b7061495372B6eDFF511D9E18F
+ - 版本: v2.4.3
+ - 地址: 0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C
  - 类型: ERC721 (Soulbound) + Reputation
  - 作用: 用户身份、社区会员、声誉系统
+ - 新功能: mintWithAutoStake() - 单次交易完成质押+铸造
+ - 优化: 代码精简至 509 行,合约大小 24,395 bytes (在 24KB 限制内)
+ - 测试社区: Mycelium (0x411BD567E46C0781248dbB6a9211891C032885e5)
```

### 2. aastar-shared-config/src/contract-addresses.ts

**变更**:
```diff
  export const TOKEN_ADDRESSES = {
    xPNTsFactory: '0x9dD72cB42427fC9F7Bf0c949DB7def51ef29D6Bd',
-   mySBT: '0xD20F64718485E8aA317c0f353420cdB147661b20', // MySBT v2.4.2
+   mySBT: '0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C', // MySBT v2.4.3
  } as const;

+ /**
+  * Test Community Addresses
+  */
+ export const TEST_COMMUNITIES = {
+   mycelium: '0x411BD567E46C0781248dbB6a9211891C032885e5',
+ } as const;
```

### 3. aastar-shared-config/src/contract-versions.ts

**变更**:
```diff
    mySBT: {
      name: 'MySBT',
-     version: '2.4.2',
-     versionCode: 20402,
-     deployedAt: '2025-11-05',
+     version: '2.4.3',
+     versionCode: 20403,
+     deployedAt: '2025-11-06',
      address: TOKEN_ADDRESSES.mySBT,
      features: [
        'VERSION interface',
        'NFT architecture refactor',
        'Soulbound token (SBT)',
        'Time-based reputation',
        'Membership management',
        'GToken mint fee (burn)',
        'safeMint() - DAO-only faucet minting',
-       'mintWithAutoStake() - one-transaction mint with automatic staking',
-       'Optimized under 24KB (24,458 bytes)',
+       'mintWithAutoStake() - FIXED: correct token transfer order',
+       'Highly optimized: 509 lines, 24,395 bytes (within 24KB limit)',
+       'Tested with Mycelium community',
      ],
    } as ContractVersion,
```

### 4. aastar-shared-config/package.json

**变更**:
```diff
  {
    "name": "@aastar/shared-config",
-   "version": "0.2.24",
+   "version": "0.2.25",
    "description": "Shared configuration for AAStar Community projects",
```

---

## 需要手动更新的项目

如果其他项目引用了以下旧地址,需要手动更新:

### 旧 MySBT 地址 (需要替换)

**v2.4.0 (已废弃)**:
```
0x73E635Fc9eD362b7061495372B6eDFF511D9E18F
```

**v2.4.2 (有 bug)**:
```
0xD20F64718485E8aA317c0f353420cdB147661b20
```

**替换为 v2.4.3**:
```
0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C
```

### 旧 GTokenStaking 地址 (需要替换)

**v2.0.0 (已废弃)**:
```
0x60Bd54645b0fDabA1114B701Df6f33C4ecE87fEa
```

**替换为 v2.0.1**:
```
0xbEbF9b4c6a4cDB92Ac184aF211AdB13a0b9BF6c0
```

---

## 受影响的项目

需要更新 `@aastar/shared-config` 到 v0.2.25 的项目:

1. **registry** - 前端 SBT 注册页面
2. **SuperPaymaster** - Paymaster 系统
3. **faucet** - GToken 水龙头
4. **其他依赖 shared-config 的项目**

**更新命令**:
```bash
pnpm update @aastar/shared-config@latest
```

---

## 验证步骤

### 1. 验证 MySBT v2.4.3 地址

```bash
# Etherscan
https://sepolia.etherscan.io/address/0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C

# 检查合约版本
cast call 0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C "VERSION()(string)" --rpc-url https://rpc.sepolia.org
# 应该返回: "2.4.3"
```

### 2. 验证 Mycelium 社区

```bash
# 检查社区配置
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.org');
const registry = new ethers.Contract(
  '0xf384c592D5258c91805128291c5D4c069DD30CA6',
  ['function getCommunityProfile(address) view returns (tuple(string name, string ensName, address xPNTsToken, address[] supportedSBTs, uint8 nodeType, address paymasterAddress, address community, uint256 registeredAt, uint256 lastUpdatedAt, bool isActive, bool allowPermissionlessMint))'],
  provider
);
registry.getCommunityProfile('0x411BD567E46C0781248dbB6a9211891C032885e5').then(console.log);
"
```

### 3. 验证 shared-config 包版本

```bash
cd /Volumes/UltraDisk/Dev2/aastar/aastar-shared-config
cat package.json | grep version
# 应该显示: "version": "0.2.25"

# 验证导出
node -e "const { TOKEN_ADDRESSES } = require('./dist/index.cjs'); console.log('MySBT:', TOKEN_ADDRESSES.mySBT);"
# 应该显示: MySBT: 0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C
```

---

## 下一步建议

### 1. 发布 shared-config v0.2.25

```bash
cd /Volumes/UltraDisk/Dev2/aastar/aastar-shared-config
pnpm publish
```

### 2. 更新所有依赖项目

在每个项目中运行:
```bash
pnpm update @aastar/shared-config@latest
```

### 3. 更新前端配置

确保前端项目使用最新的合约地址:
- Registry UI
- Mint SBT 页面
- Paymaster 管理页面

---

## 附录: 相关文档

- [MySBT 版本对比](./MYSBT-VERSION-COMPARISON.md)
- [Mint SBT 业务设计](./MINT-SBT-BUSINESS-DESIGN.md)
- [test-mintWithAutoStake-v2-4-3.mjs](./test-mintWithAutoStake-v2-4-3.mjs)
- [register-test-communities.mjs](./register-test-communities.mjs)

---

**更新完成时间**: 2025-11-06
**负责人**: Claude Code
**状态**: ✅ 完成
