#!/bin/bash

# Check if services are running

echo "🔍 Checking service status..."
echo ""

# Check backend
if curl -s http://localhost:5052/health > /dev/null 2>&1; then
    echo "✅ Backend:  RUNNING (http://localhost:5052)"
else
    echo "❌ Backend:  NOT RUNNING"
    echo "   Check logs: tail -50 /tmp/backend_output.log"
fi

# Check frontend
if curl -s http://localhost:3031 > /dev/null 2>&1; then
    echo "✅ Frontend: RUNNING (http://localhost:3031)"
else
    echo "❌ Frontend: NOT RUNNING"
    echo "   Check logs: tail -50 /tmp/frontend_output.log"
fi

echo ""
echo "📊 Running processes:"
ps aux | grep -E "uvicorn|next-server" | grep -v grep || echo "   (none)"
echo ""

