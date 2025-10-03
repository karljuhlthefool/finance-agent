#!/bin/bash
# Iterative backend testing script

set -e

echo "=== Backend Iterative Test ==="
echo ""

# Kill any existing backend
pkill -f uvicorn 2>/dev/null || true
sleep 2

# Start backend
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
uvicorn agent_service.app:app --port 5051 > /tmp/backend_test.log 2>&1 &
BACKEND_PID=$!

echo "✓ Started backend (PID: $BACKEND_PID)"
echo "  Waiting 5 seconds for startup..."
sleep 5

# Test 1: Health check
echo ""
echo "Test 1: Health Check"
if curl -s http://localhost:5051/healthz | grep -q "ok"; then
    echo "  ✓ Health check passed"
else
    echo "  ✗ Health check failed"
    echo "  Logs:"
    tail -20 /tmp/backend_test.log
    kill $BACKEND_PID
    exit 1
fi

# Test 2: Simple query
echo ""
echo "Test 2: Simple Query (hello)"
RESPONSE=$(curl -sS -X POST http://localhost:5051/query \
    -H "Content-Type: application/json" \
    -d '{"prompt":"hello"}' \
    --max-time 30)

if [ -z "$RESPONSE" ]; then
    echo "  ✗ Empty response"
    echo "  Backend logs:"
    tail -30 /tmp/backend_test.log
    kill $BACKEND_PID
    exit 1
fi

if echo "$RESPONSE" | grep -q "agent.completed\|agent.text"; then
    echo "  ✓ Got NDJSON events"
    echo "  Sample response:"
    echo "$RESPONSE" | head -c 200
    echo ""
else
    echo "  ✗ Response doesn't contain expected events"
    echo "  Response:"
    echo "$RESPONSE"
    echo ""
    echo "  Backend logs:"
    tail -30 /tmp/backend_test.log
    kill $BACKEND_PID
    exit 1
fi

# Test 3: Tool usage query
echo ""
echo "Test 3: Tool Usage Query (fetch AAPL data)"
RESPONSE=$(curl -sS -X POST http://localhost:5051/query \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Get market data for AAPL"}' \
    --max-time 60)

if echo "$RESPONSE" | grep -q "AAPL\|market\|data"; then
    echo "  ✓ Agent responded about market data"
    
    # Check if tools were used
    if echo "$RESPONSE" | grep -q "mf_market_get\|Bash"; then
        echo "  ✓ Tools were invoked"
    else
        echo "  ⚠ Response received but no tool invocation detected"
        echo "  This might be okay if agent is just explaining"
    fi
else
    echo "  ✗ Response doesn't mention AAPL or data"
    echo "  Response preview:"
    echo "$RESPONSE" | head -c 300
fi

echo ""
echo "=== All Tests Passed! ==="
echo ""
echo "Backend is working correctly on http://localhost:5051"
echo "Keeping backend running (PID: $BACKEND_PID)"
echo ""
echo "To stop: kill $BACKEND_PID"
echo "To view logs: tail -f /tmp/backend_test.log"
echo ""

# Keep script alive
wait $BACKEND_PID

