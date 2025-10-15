# Local Development Guide

## Running the Registry Frontend Locally

The Registry frontend uses Vercel serverless functions for RPC proxying. To develop locally, you need to run both Vercel dev server and Vite dev server.

### Prerequisites

```bash
# Install Vercel CLI if not already installed
npm i -g vercel
```

### Development Setup

#### Option 1: Using Vite Proxy (Recommended)

Run two terminal sessions:

**Terminal 1 - Vercel Dev Server:**
```bash
cd /Users/jason/Dev/mycelium/my-exploration/projects/registry
vercel dev --listen 3000
```

**Terminal 2 - Vite Dev Server:**
```bash
cd /Users/jason/Dev/mycelium/my-exploration/projects/registry
pnpm run dev
```

The Vite config (`vite.config.ts`) is configured to proxy `/api/*` requests to `http://localhost:3000`.

Access the app at: `http://localhost:5173`

#### Option 2: Direct Vercel Dev (Alternative)

Run only Vercel dev server (serves both frontend and API):

```bash
cd /Users/jason/Dev/mycelium/my-exploration/projects/registry
vercel dev
```

Access the app at: `http://localhost:3000`

### Environment Variables

Ensure `.env.local` is configured:

```env
# Use backend proxy for RPC (recommended for privacy)
VITE_SEPOLIA_RPC_URL=/api/rpc-proxy

# Private RPC (used by backend proxy)
SEPOLIA_RPC_URL=your_private_rpc_url

# Public RPC fallback
VITE_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/your_key

# Vercel API (for backend proxy)
VITE_VERCEL_API_URL=http://localhost:3000
```

### Troubleshooting

**404 on `/api/rpc-proxy`:**
- Ensure Vercel dev server is running on port 3000
- Check that Vite proxy configuration exists in `vite.config.ts`
- Restart both servers after config changes

**RPC Errors:**
- Check browser console for detailed error messages
- Verify `SEPOLIA_RPC_URL` is set in `.env.local`
- The proxy will fallback to public RPC if private RPC fails

### Architecture

```
Browser Request
    ↓
Vite Dev Server (port 5173)
    ↓ (proxy /api/*)
Vercel Dev Server (port 3000)
    ↓
/api/rpc-proxy serverless function
    ↓
Private RPC → (fallback) → Public RPC
```
