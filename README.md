# SuperPaymaster Registry

Registry is SuperPaymaster operation interface based on PRD version contracts.

## 🚀 Quick Start

### Development Mode

**IMPORTANT**: Always use `pnpm run dev` to start the development server, **not** `pnpm run dev:vite`.

```bash
# Install dependencies
pnpm install

# Start development servers (Vite + Vercel)
pnpm run dev
```

This starts **two services**:
- **Vite Dev Server** (port 5173) - Frontend application
- **Vercel Dev Server** (port 3000) - API endpoints and RPC proxy

### Why Dual-Server Mode?

The application uses a dual-server architecture to:

1. **Protect API Keys**: RPC endpoints (Alchemy/Infura) are proxied through the Vercel serverless function, keeping your private keys secure and never exposed to the frontend.

2. **Hybrid Mode**:
   - **Local Development**: Uses the RPC proxy at `/api/rpc-proxy` served by Vercel
   - **Production**: Vercel automatically serves the API routes based on request URI

### Access the Application

- **Frontend**: http://localhost:5173
- **API Proxy**: http://localhost:3000 (proxied through Vite)

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | **Recommended** - Start both Vite and Vercel dev servers |
| `pnpm run dev:vite` | ❌ **Do not use alone** - Vite only (breaks RPC proxy) |
| `pnpm run dev:vercel` | Start Vercel dev server only (port 3000) |
| `pnpm run build` | Build for production |
| `pnpm run preview` | Preview production build |
| `pnpm test` | Run Playwright tests |

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (not committed to git) with your private RPC endpoint:

```bash
# Optional: Private RPC URL (recommended for better reliability)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# The proxy will fallback to public RPCs if this is not set
```

### Public RPC Fallback

If `SEPOLIA_RPC_URL` is not set, the proxy automatically falls back to public Sepolia RPC endpoints:
- https://rpc.sepolia.org
- https://ethereum-sepolia.publicnode.com
- https://sepolia.drpc.org
- And more...

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in headed mode (see browser)
pnpm playwright test --headed

# Run specific test file
pnpm playwright test tests/deploy-wizard.spec.ts

# Open test report
pnpm playwright show-report
```

## 📁 Project Structure

```
registry/
├── api/                    # Vercel serverless functions
│   ├── rpc-proxy.ts       # RPC endpoint proxy (protects API keys)
│   └── gas-events.ts      # Gas events endpoint
├── src/
│   ├── pages/             # React pages
│   ├── components/        # Reusable components
│   └── utils/             # Utility functions
├── tests/                 # Playwright e2e tests
└── docs/                  # Documentation
```

## 🐛 Troubleshooting

### RPC Proxy Errors

If you see `Failed to load resource: the server responded with a status of 500` in the console:

**Problem**: You're running `pnpm run dev:vite` instead of `pnpm run dev`

**Solution**:
1. Stop the current server (Ctrl+C)
2. Run `pnpm run dev` instead

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Kill process on port 3000
lsof -ti :3000 | xargs kill -9

# Kill process on port 5173
lsof -ti :5173 | xargs kill -9

# Then restart
pnpm run dev
```

## 🌐 Deployment

The application is deployed to Vercel. Push to `main` branch to trigger automatic deployment.

```bash
# Manual deployment
vercel --prod
```

## 📚 Documentation

- [Changes Log](./docs/Changes.md) - Development progress and changes
- [User Guide](./docs/USER_GUIDE_WITH_SCREENSHOTS.md) - User documentation with screenshots

## 🤝 Contributing

1. Create a new branch for your feature/fix
2. Make your changes
3. Run tests: `pnpm test`
4. Commit and push
5. Create a Pull Request

## 📄 License

MIT
