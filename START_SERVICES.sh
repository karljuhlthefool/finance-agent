#!/bin/bash

# Simple, reliable startup script for Claude Finance Agent
# Usage: bash START_SERVICES.sh

set -e  # Exit on any error

echo "🧹 Cleaning up any existing processes..."
pkill -f "uvicorn agent_service.app" || true
pkill -f "next-server" || true
lsof -ti:5052 | xargs kill -9 2>/dev/null || true
lsof -ti:3031 | xargs kill -9 2>/dev/null || true
sleep 2

echo ""
echo "📦 Checking Python dependencies..."
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

echo ""
echo "📦 Checking Node dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Node modules not found. Installing..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🚀 Starting Backend (Port 5052)..."
source venv/bin/activate
nohup uvicorn agent_service.app:app --reload --port 5052 > /tmp/backend_output.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "   Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:5052/health > /dev/null 2>&1; then
        echo "   ✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Backend failed to start. Check logs:"
        echo "      tail -100 /tmp/backend_output.log"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🚀 Starting Frontend (Port 3031)..."
cd frontend
nohup npm run dev -- -p 3031 > /tmp/frontend_output.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo "   Waiting for frontend..."
for i in {1..30}; do
    if curl -s http://localhost:3031 > /dev/null 2>&1; then
        echo "   ✅ Frontend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ⚠️  Frontend may still be starting..."
        break
    fi
    sleep 1
done

echo ""
echo "✅ ALL SERVICES RUNNING!"
echo ""
echo "📍 URLs:"
echo "   • Chat UI:    http://localhost:3031"
echo "   • Logs Page:  http://localhost:3031/logs"
echo "   • Backend:    http://localhost:5052"
echo ""
echo "📋 Process IDs:"
echo "   • Backend:  $BACKEND_PID"
echo "   • Frontend: $FRONTEND_PID"
echo ""
echo "📊 View logs:"
echo "   • Backend:  tail -f /tmp/backend_output.log"
echo "   • Frontend: tail -f /tmp/frontend_output.log"
echo ""
echo "🛑 Stop services:"
echo "   bash STOP_SERVICES.sh"
echo ""
