#!/bin/bash

echo "🔄 Restarting Registry Development Server..."

# Kill processes on ports 3000, 3001, 3002, and 5173
echo "🛑 Killing existing processes..."
for port in 3000 3001 3002 5173; do
    pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "  Killing process on port $port (PID: $pid)"
        kill -9 $pid
    else
        echo "  No process found on port $port"
    fi
done

# Wait a moment for processes to fully terminate
echo "⏳ Waiting for processes to terminate..."
sleep 2

# Clear any potential cache
echo "🧹 Clearing cache..."
rm -rf node_modules/.vite
rm -rf .next
rm -rf dist

echo "🚀 Starting development server..."
pnpm run dev
