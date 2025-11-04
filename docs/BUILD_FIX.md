# 构建错误修复指南

## 错误症状

```
src/config/networkConfig.ts:128:30 - error TS2339: Property 'paymasterFactory' does not exist on type...
src/config/networkConfig.ts:162:20 - error TS2339: Property 'aPNTs' does not exist on type...
src/config/networkConfig.ts:165:20 - error TS2339: Property 'bPNTs' does not exist on type...
```

## 原因

`@aastar/shared-config` 包的 `node_modules` 版本不是最新的或安装不完整。

## 解决方案

### 方案 1: 清除缓存并重新安装（推荐）

```bash
# 1. 清除 node_modules 和锁文件
rm -rf node_modules
rm pnpm-lock.yaml

# 2. 重新安装所有依赖
pnpm install

# 3. 验证 shared-config 版本
pnpm list @aastar/shared-config
# 应该显示: @aastar/shared-config 0.2.11

# 4. 尝试构建
pnpm run build
```

### 方案 2: 强制更新 shared-config

```bash
# 1. 更新 shared-config 到最新版本
pnpm update @aastar/shared-config

# 2. 验证版本
pnpm list @aastar/shared-config

# 3. 尝试构建
pnpm run build
```

### 方案 3: 手动验证 shared-config 内容

```bash
# 检查 shared-config 是否包含必需的属性
cat node_modules/@aastar/shared-config/dist/index.d.ts | grep "paymasterFactory"
cat node_modules/@aastar/shared-config/dist/index.d.ts | grep "aPNTs"
cat node_modules/@aastar/shared-config/dist/index.d.ts | grep "bPNTs"

# 如果这些命令没有输出，说明 shared-config 版本有问题
# 使用方案 1 重新安装
```

## 验证修复

### 1. 检查类型定义

```bash
# 查看 getCoreContracts 的返回类型
cat node_modules/@aastar/shared-config/dist/index.d.ts | grep -A 15 "getCoreContracts"

# 应该看到:
# readonly paymasterFactory: "0x65Cf6C4ab3d40f3C919b6F3CADC09Efb72817920";
```

### 2. 检查 testTokens

```bash
# 查看 getTestTokenContracts 的返回类型
cat node_modules/@aastar/shared-config/dist/index.d.ts | grep -A 10 "getTestTokenContracts"

# 应该看到:
# readonly aPNTs: "0xBD0710596010a157B88cd141d797E8Ad4bb2306b";
# readonly bPNTs: "0xF223660d24c436B5BfadFEF68B5051bf45E7C995";
```

### 3. 运行构建测试

```bash
# TypeScript 类型检查
pnpm tsc --noEmit

# 完整构建
pnpm run build

# 如果构建成功，应该看到:
# ✓ built in X.XXs
```

## 正确的 shared-config 版本信息

```json
{
  "@aastar/shared-config": "^0.2.11"
}
```

### 包含的核心合约地址

- **paymasterFactory**: `0x65Cf6C4ab3d40f3C919b6F3CADC09Efb72817920`
- **aPNTs**: `0xBD0710596010a157B88cd141d797E8Ad4bb2306b`
- **bPNTs**: `0xF223660d24c436B5BfadFEF68B5051bf45E7C995`

## 其他可能的问题

### pnpm 缓存问题

```bash
# 清除 pnpm 缓存
pnpm store prune

# 重新安装
pnpm install
```

### TypeScript 缓存问题

```bash
# 清除 TypeScript 构建缓存
rm -rf tsconfig.tsbuildinfo
rm -rf dist/

# 重新构建
pnpm run build
```

### Node 版本问题

```bash
# 检查 Node 版本（推荐 v18 或更高）
node --version

# 如果版本太低，使用 nvm 更新
nvm install 18
nvm use 18
```

## 预防措施

为避免将来出现类似问题：

1. **提交锁文件**: 确保 `pnpm-lock.yaml` 已提交到 git
2. **版本固定**: 考虑在 `package.json` 中使用固定版本而不是 `^`
3. **CI/CD 验证**: 在 CI 中运行完整的类型检查和构建

## 联系方式

如果问题仍未解决，请提供以下信息：

```bash
# 1. Node 版本
node --version

# 2. pnpm 版本
pnpm --version

# 3. shared-config 版本
pnpm list @aastar/shared-config

# 4. 完整的错误日志
pnpm run build > build-error.log 2>&1
cat build-error.log
```
