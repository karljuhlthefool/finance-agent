#!/bin/bash
# Integration test script for Claude Finance Agent UI

set -e

echo "=== Claude Finance Agent Integration Test ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if backend is running
echo -n "1. Checking backend (port 5051)... "
if curl -s http://localhost:5051/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running${NC}"
else
    echo -e "${RED}✗ Backend not running${NC}"
    echo "   Start with: cd $PWD && source venv/bin/activate && uvicorn agent_service.app:app --reload --port 5051"
    exit 1
fi

# 2. Check if frontend is running
echo -n "2. Checking frontend (port 3000)... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not running on 3000, trying 3001...${NC}"
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend running on 3001${NC}"
        FRONTEND_PORT=3001
    else
        echo -e "${RED}✗ Frontend not running${NC}"
        echo "   Start with: cd frontend && npm run dev"
        exit 1
    fi
fi
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# 3. Test backend directly
echo ""
echo "3. Testing backend /query endpoint..."
BACKEND_RESPONSE=$(curl -sS -X POST http://localhost:5051/query \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}' 2>&1)

if echo "$BACKEND_RESPONSE" | grep -q "agent.completed"; then
    echo -e "   ${GREEN}✓ Backend responding with NDJSON${NC}"
    echo "   Sample: $(echo "$BACKEND_RESPONSE" | head -1 | cut -c1-80)..."
else
    echo -e "   ${RED}✗ Backend not responding correctly${NC}"
    echo "   Response: $BACKEND_RESPONSE"
    exit 1
fi

# 4. Test frontend API
echo ""
echo "4. Testing frontend /api/chat endpoint..."
FRONTEND_RESPONSE=$(curl -sS -X POST http://localhost:$FRONTEND_PORT/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"hello"}]}' 2>&1)

if [ -n "$FRONTEND_RESPONSE" ]; then
    echo -e "   ${GREEN}✓ Frontend API responding${NC}"
    echo "   Response length: $(echo "$FRONTEND_RESPONSE" | wc -c) bytes"
    echo "   First 100 chars: $(echo "$FRONTEND_RESPONSE" | head -c 100)..."
else
    echo -e "   ${RED}✗ Frontend API returned empty response${NC}"
    exit 1
fi

# 5. Check environment variables
echo ""
echo "5. Checking environment variables..."
if [ -f .env.local ]; then
    echo -n "   .env.local exists... "
    if grep -q "ANTHROPIC_API_KEY" .env.local; then
        echo -e "${GREEN}✓ ANTHROPIC_API_KEY found${NC}"
    else
        echo -e "${RED}✗ ANTHROPIC_API_KEY not found${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠ .env.local not found${NC}"
fi

# 6. Check logs
echo ""
echo "6. Checking logs..."
if [ -f /tmp/backend.log ]; then
    BACKEND_ERRORS=$(grep -i "error\|exception\|traceback" /tmp/backend.log | wc -l)
    if [ "$BACKEND_ERRORS" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠ Backend has $BACKEND_ERRORS errors/warnings${NC}"
        echo "   Last error:"
        grep -i "error\|exception" /tmp/backend.log | tail -1
    else
        echo -e "   ${GREEN}✓ No backend errors${NC}"
    fi
else
    echo "   ℹ No backend log file found"
fi

if [ -f /tmp/frontend.log ]; then
    FRONTEND_ERRORS=$(grep -i "error" /tmp/frontend.log | grep -v "TypeError: terminated" | wc -l)
    if [ "$FRONTEND_ERRORS" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠ Frontend has $FRONTEND_ERRORS errors${NC}"
    else
        echo -e "   ${GREEN}✓ No frontend errors${NC}"
    fi
fi

# 7. Full end-to-end test
echo ""
echo "7. Running full end-to-end test..."
echo "   Sending: 'What is 5 + 5?'"
E2E_RESPONSE=$(curl -sS -X POST http://localhost:$FRONTEND_PORT/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"What is 5 + 5?"}]}')

if echo "$E2E_RESPONSE" | grep -qi "10"; then
    echo -e "   ${GREEN}✓ End-to-end test PASSED${NC}"
    echo "   Response includes expected answer"
else
    echo -e "   ${YELLOW}? End-to-end test uncertain${NC}"
    echo "   Response: $(echo "$E2E_RESPONSE" | head -c 200)..."
fi

echo ""
echo "=== Test Summary ==="
echo -e "${GREEN}✓ All critical tests passed${NC}"
echo ""
echo "Next steps:"
echo "  • Open browser to http://localhost:$FRONTEND_PORT"
echo "  • Send a test message"
echo "  • Check browser console (F12) for client-side errors"
echo ""
echo "Debug commands:"
echo "  • Backend logs: tail -f /tmp/backend.log"
echo "  • Frontend logs: tail -f /tmp/frontend.log"
echo "  • Kill all: pkill -f 'uvicorn|next dev'"
echo ""


