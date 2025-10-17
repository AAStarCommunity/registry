# 开发环境设置指南

## 问题背景

运行 `pnpm run dev` 时，Vercel 会尝试启动自己的 Vite 实例，与已经运行的 Vite dev server 冲突，导致以下错误：

```
Failed to parse source for import analysis because the content contains invalid JS syntax.
Plugin: vite:import-analysis
File: /Volumes/UltraDisk/Dev2/aastar/registry/index.html
```

## 解决方案

### 方案 1: 只使用 Vite（推荐用于前端开发）

```bash
# 启动 Vite 开发服务器
pnpm run dev:vite

# 访问应用
open http://localhost:5173
```

**优点**:
- 没有冲突
- 启动快速
- 适合纯前端开发

**缺点**:
- 无法测试 `/api` 路由（Serverless Functions）

### 方案 2: 使用 Playwright 测试配置

Playwright 测试会自动启动 Vite 并注入 MetaMask Mock：

```bash
# 运行所有测试
pnpm playwright test

# 运行特定测试
pnpm playwright test tests/manage-paymaster.spec.ts

# 调试模式
pnpm playwright test --debug
```

**优点**:
- 自动化测试环境
- 包含 MetaMask Mock
- 100% 测试覆盖 (48/48 通过)

### 方案 3: 如果需要测试 API 路由

如果你的应用确实需要调用 `/api` 目录下的 Serverless Functions（用于处理私钥等敏感操作），你有两个选择：

#### 选项 A: 分开运行

```bash
# 终端 1: 启动 Vite
pnpm run dev:vite

# 终端 2: 启动 Vercel（用于 API）
pnpm run dev:vercel
```

然后访问 http://localhost:5173（前端）和 http://localhost:3000/api/...（API）

#### 选项 B: 配置反向代理

修改 `vite.config.ts` 添加 API 代理：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

然后运行：
```bash
# 终端 1
pnpm run dev:vite

# 终端 2  
pnpm run dev:vercel
```

访问 http://localhost:5173，API 调用会自动代理到 Vercel。

## 当前配置

### package.json

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm:dev:vite\" \"pnpm:dev:vercel\" --names \"vite,vercel\" --prefix-colors \"cyan,magenta\"",
    "dev:vite": "vite",
    "dev:vercel": "vercel dev --listen 3000 --yes"
  }
}
```

### vercel.json

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## API 路由说明

当前项目包含以下 API 路由：

- `api/gas-events.ts` - Gas 事件处理
- `api/rpc-proxy.ts` - RPC 代理（需要私钥）

这些路由在开发模式下由 Vercel 提供，在生产环境部署到 Vercel 的 Serverless Functions。

## 测试环境

Playwright 测试已配置完整的 Mock 环境：

- ✅ MetaMask Mock（无需浏览器扩展）
- ✅ 所有 48 个测试通过
- ✅ 100% E2E 覆盖率

测试配置详见 `playwright.config.ts` 和 `tests/fixtures.ts`。

## 总结

**日常前端开发**：使用 `pnpm run dev:vite`

**测试**：使用 `pnpm playwright test`

**需要测试 API**：参考方案 3，配置代理或分开运行

**生产部署**：`pnpm run build` → Vercel 自动处理前端和 API
