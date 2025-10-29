# AAStar Registry Project Instructions

## Changes.md 文档规则

### 写入条件（必须同时满足）
1. **修改文件数量**: ≥ 3个文件
2. **代码行数**: 总计 > 30行
3. **时机**: 大的对话完成所有task后

### 写入格式
- 每个task一句话概述（≤ 20字符）
- **禁止写入任何代码**

### 小修改处理
- 修改 < 3个文件 或 ≤ 30行代码
- **只使用 git commit message 说明**
- **不写入 Changes.md**

### 示例

❌ 错误（小修改写入Changes.md）:
```markdown
## 2025-10-29 - 修复 RPC provider

### 问题描述
...
### 代码修改
```typescript
const provider = getProvider();
```
```

✅ 正确（小修改只用commit message）:
```bash
git commit -m "fix: 使用 getProvider() 修复 RPC 错误"
```

✅ 正确（大修改概述）:
```markdown
## 2025-10-29 - Registry v2.1部署
- 修复GTokenStaking地址
- 更新前端ABI
- 部署新合约
```
