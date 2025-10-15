#!/bin/bash

# Registry Local Development Startup Script
#
# This script starts both Vercel dev server and Vite dev server
# for local development of the Operator Portal.
#
# Usage:
#   ./scripts/dev.sh
#
# Prerequisites:
#   - Node.js and pnpm installed
#   - Vercel CLI installed (npm i -g vercel)
#   - .env.local configured with RPC URLs

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting Registry Local Development Environment"
echo "=================================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm not found. Please install: npm i -g pnpm"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    if [ -f ".env.example.v4_1" ]; then
        cp .env.example.v4_1 .env.local
        echo "✅ Created .env.local - Please configure your RPC URLs"
    else
        echo "❌ .env.example.v4_1 not found"
        exit 1
    fi
fi

echo "✅ Prerequisites OK"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
fi

echo "🎯 Starting development servers..."
echo ""
echo "Terminal layout:"
echo "  - Vercel Dev (API routes): http://localhost:3000"
echo "  - Vite Dev (Frontend):     http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to kill all background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    jobs -p | xargs -r kill 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Vercel dev server in background
echo "🔷 Starting Vercel dev server (port 3000)..."
vercel dev --listen 3000 &
VERCEL_PID=$!

# Wait a bit for Vercel to start
sleep 3

# Start Vite dev server in background
echo "🔶 Starting Vite dev server (port 5173)..."
pnpm run dev &
VITE_PID=$!

echo ""
echo "✅ Development servers started!"
echo ""
echo "📍 Access points:"
echo "  - Operator Portal: http://localhost:5173/operator/deploy"
echo "  - Landing Page:    http://localhost:5173/"
echo "  - Analytics:       http://localhost:5173/analytics"
echo ""
echo "💡 Tips:"
echo "  - Use MetaMask on Sepolia testnet"
echo "  - Check .env.local for RPC configuration"
echo "  - API proxy routes to http://localhost:3000/api/*"
echo ""

# Wait for both processes
wait $VERCEL_PID $VITE_PID
