#!/bin/bash

# Stop all services cleanly

echo "🛑 Stopping all services..."

echo "  Killing uvicorn processes..."
pkill -f "uvicorn agent_service.app" || true

echo "  Killing next-server processes..."
pkill -f "next-server" || true

echo "  Freeing port 5052..."
lsof -ti:5052 | xargs kill -9 2>/dev/null || true

echo "  Freeing port 3031..."
lsof -ti:3031 | xargs kill -9 2>/dev/null || true

sleep 1

echo ""
echo "✅ All services stopped!"
echo ""

