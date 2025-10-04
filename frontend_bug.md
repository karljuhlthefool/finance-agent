# Frontend Bug: Next.js Build Cache Issue

## Problem

When sending messages in the chat UI at http://localhost:3031, nothing happened. The frontend appeared to work but messages weren't reaching the backend.

## Root Cause

**Next.js caches compiled API routes in the `.next/` directory.** When the backend port changed from 5051 → 5052 and the connection changed from `localhost` → `127.0.0.1`, the source code was updated but Next.js continued serving the **old cached version** with hardcoded references to `http://localhost:5051`.

### Error in logs:
```
Error: Cannot connect to backend at http://localhost:5051: TypeError: fetch failed
POST /api/chat 500 in 52ms
```

Even though `frontend/app/api/chat/route.ts` had the correct URL, Next.js was using stale build artifacts.

## Solution

### 1. Hardcode the Backend URL (Immediate Fix)

Changed `frontend/app/api/chat/route.ts`:

```typescript
// Before (using env var)
const AGENT_URL = process.env.AGENT_URL ?? 'http://127.0.0.1:5052'

// After (hardcoded)
const AGENT_URL = 'http://127.0.0.1:5052'
```

**Why this works:** API routes evaluate `process.env` at build time, not runtime. Hardcoding avoids the caching issue entirely.

### 2. Clear Cache Before Starting (Permanent Fix)

Updated `START_SERVICES.sh` to clear Next.js cache:

```bash
echo "🚀 Starting Frontend (Port 3031)..."
cd frontend
# Clear Next.js cache to avoid stale env variables
rm -rf .next 2>/dev/null || true
nohup npm run dev -- -p 3031 > /tmp/frontend_output.log 2>&1 &
```

### 3. Manual Fix (If Needed)

If the frontend still shows errors:

```bash
# Stop frontend
pkill -f "next-server"

# Clear cache
cd frontend && rm -rf .next

# Restart
npm run dev -- -p 3031
```

## Why This Happened

1. **Port changed** from 5051 → 5052
2. **Hostname changed** from `localhost` → `127.0.0.1` (to fix IPv4/IPv6 issues)
3. Source code was updated but `.next/` cache wasn't cleared
4. Next.js served old compiled API route with wrong URL
5. Frontend couldn't connect to backend

## Lessons Learned

1. **Always clear `.next/` when changing environment variables** or connection URLs
2. **Hardcode values** for local development to avoid env var timing issues
3. **Check compiled output location** when changes don't take effect
4. **Use `127.0.0.1` instead of `localhost`** to avoid IPv6 resolution issues

## Verification

Test that it's working:

```bash
# Test backend directly
curl http://127.0.0.1:5052/health
# Should return: {"status":"ok","service":"claude-finance-agent"}

# Test frontend API
curl -X POST http://127.0.0.1:3031/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
# Should return streaming responses starting with: 0:"Hello! I'm the Motley Fool..."
```

## Current Configuration

- **Backend:** `http://127.0.0.1:5052` (hardcoded in `agent_service/app.py` via `--host 0.0.0.0 --port 5052`)
- **Frontend:** `http://localhost:3031` (hardcoded in start script via `-p 3031`)
- **API Route:** `http://127.0.0.1:5052` (hardcoded in `frontend/app/api/chat/route.ts`)

All working as of last test! ✅

