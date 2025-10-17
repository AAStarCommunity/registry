# SuperPaymaster Registry 文档中心

欢迎来到 SuperPaymaster Registry 文档中心！

## 📚 完整文档

### ⭐ 推荐阅读

**[USER_GUIDE_WITH_SCREENSHOTS.md](USER_GUIDE_WITH_SCREENSHOTS.md)** - 带真实截图的用户指南

包含 10 张真实截图，适合快速上手。

### 📖 所有文档

| 文档 | 说明 | 适合 |
|------|------|------|
| **[USER_GUIDE_WITH_SCREENSHOTS.md](USER_GUIDE_WITH_SCREENSHOTS.md)** | 带截图的简化指南 | 新用户 |
| **[USER_GUIDE.md](USER_GUIDE.md)** | 完整详细指南（8,500 字） | 高级用户 |
| **[DEV_SETUP.md](DEV_SETUP.md)** | 开发环境设置 | 开发者 |
| **[Changes.md](Changes.md)** | 开发历程记录 | 维护者 |
| **[screenshots/README.md](screenshots/README.md)** | 截图说明 | 文档维护者 |

## 📸 截图预览

![Landing Page](screenshots/01-landing-page.png)

**更多截图** → [screenshots/](screenshots/)

## 🚀 快速开始

### 操作员（部署 Paymaster）
→ [USER_GUIDE_WITH_SCREENSHOTS.md#操作员门户](USER_GUIDE_WITH_SCREENSHOTS.md#操作员门户---部署和管理)

### 开发者（集成到 dApp）
→ [USER_GUIDE_WITH_SCREENSHOTS.md#开发者门户](USER_GUIDE_WITH_SCREENSHOTS.md#开发者门户---集成指南)

### 贡献者（本地开发）
→ [DEV_SETUP.md](DEV_SETUP.md)

## 🔑 核心合约

- **Entry Point v0.7**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **Registry v1.2**: `0x838da93c815a6E45Aa50429529da9106C0621eF0`

## 🛠️ 开发环境

```bash
pnpm install
pnpm run dev:vite  # http://localhost:5173
pnpm playwright test  # 48/48 通过 ✅
```

**详细** → [DEV_SETUP.md](DEV_SETUP.md)

---

**维护**: AAStar Community | **更新**: 2025-10-17 | **许可**: MIT
