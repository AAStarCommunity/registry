# MySBT Mint 测试脚本设置指南

## 1. 配置环境变量

在项目根目录的 `.env` 文件中添加以下配置：

```bash
# 必需：社区owner的私钥（用于测试mint功能）
COMMUNITY_OWNER_PRIVATE_KEY=0x你的私钥

# 可选：测试目标地址（默认为 0x57b2e6f08399c276b2c1595825219d29990d0921）
TEST_TARGET_ADDRESS=0x目标地址

# 可选：RPC URL（默认使用 publicnode）
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

### 获取私钥

从 MetaMask 导出私钥：
1. 打开 MetaMask
2. 点击账户详情
3. 点击 "导出私钥"
4. 输入密码
5. 复制私钥（以 0x 开头）

**⚠️ 安全提示**：
- 不要使用主网账户的私钥
- 不要提交 .env 文件到 git
- 测试完成后考虑删除私钥

## 2. 运行测试

```bash
npm run test:mint
```

## 3. 测试流程

脚本会执行以下检查：

### ✅ 第1步：验证社区注册
- 检查账户是否在 Registry 中注册为社区
- 显示社区名称、节点类型、状态

**如果失败**：需要先注册社区

### ✅ 第2步：检查 GToken 余额
- 显示 owner 的 GToken 余额
- 警告如果余额过低

### ✅ 第3步：检查目标地址
- 显示目标地址的 SBT 余额
- **如果目标已有 SBT**：这可能是 mint 失败的原因
- 显示目标地址的 GToken 余额（需要 ≥ 0.4 GT）

### ✅ 第4步：准备元数据
- 显示将要使用的 JSON 元数据

### ✅ 第5步：Gas 估算
- 尝试估算 gas
- **如果失败**：会显示详细的失败原因

### ✅ 第6步：执行 Mint
- 发送交易
- 等待确认
- 显示最终结果

## 4. 常见失败原因

### "execution reverted" 错误

可能原因：

1. **目标地址已有 SBT**
   - MySBT 可能不允许同一地址多次 mint
   - 解决方案：使用新的目标地址

2. **社区未注册**
   - 检查账户是否在 Registry 中注册
   - 解决方案：先注册社区

3. **目标 GToken 不足**
   - 目标地址需要 ≥ 0.4 GT
   - 解决方案：先给目标地址转 GToken

4. **权限问题**
   - 调用者不是注册的社区 owner
   - 解决方案：使用正确的 owner 账户

5. **合约限制**
   - 合约可能有其他业务逻辑限制
   - 解决方案：查看合约代码或咨询开发团队

## 5. 调试技巧

### 查看详细错误

脚本会自动尝试解码 revert reason，显示更详细的错误信息。

### 使用不同的目标地址

如果怀疑是目标地址的问题，可以修改 `.env` 中的 `TEST_TARGET_ADDRESS`：

```bash
TEST_TARGET_ADDRESS=0x新的地址
```

### 检查合约状态

可以在 Sepolia Etherscan 上查看合约状态：
- MySBT: https://sepolia.etherscan.io/address/0xD1e6BDfb907EacD26FF69a40BBFF9278b1E7Cf5C
- GToken: https://sepolia.etherscan.io/address/0x7D49e4E72887fAaBA8e49fE7e49b5F02b04d2028
- Registry: https://sepolia.etherscan.io/address/0x05Fa33Cc7bb3E909Cf19e0e791Da5A7D16789918

## 6. 成功示例

```
🧪 Testing MySBT mintOrAddMembership

📍 Configuration:
  Network: Sepolia Testnet
  Community Owner: 0x92a30ef...
  MySBT: 0xD1e6BDfb...
  GToken: 0x7D49e4E...
  Registry: 0x05Fa33C...

1️⃣ Checking community registration...
  Is Registered: true
  Community Name: BreadCommunity
  Node Type: PAYMASTER_SUPER
  Is Active: true
  ✅ Community registration verified

2️⃣ Checking owner GToken balance...
  Balance: 1300.0 GT
  ✅ GToken balance checked

3️⃣ Target address for minting:
  Address: 0x57b2e6f...
  Current SBT balance: 0
  Target GToken balance: 1300.0 GT

4️⃣ Preparing metadata:
{
  "communityAddress": "0x92a30ef...",
  "communityName": "BreadCommunity",
  ...
}

5️⃣ Estimating gas for mintOrAddMembership...
  Gas estimate: 250000
  ✅ Gas estimation successful

6️⃣ Executing mintOrAddMembership transaction...
  Transaction hash: 0xabc123...
  Waiting for confirmation...
  ✅ Transaction confirmed!
  Block number: 12345678
  Gas used: 245000
  Final SBT balance: 1

🎉 Mint successful!
```
