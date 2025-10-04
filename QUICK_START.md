# Claude Finance Agent - Quick Start

## ✅ Your Configuration

**Ports:**
- Backend: **5052** (http://127.0.0.1:5052)
- Frontend: **3031** (http://127.0.0.1:3031)

These ports are configured to avoid conflicts with your other projects.

## 🚀 Start the System

```bash
bash START_SERVICES.sh
```

Wait for the output showing both services are running, then open:

**Main Chat UI:** http://localhost:3031

**Live Backend Logs:** http://localhost:3031/logs

**Debug Panel:** http://localhost:3031/debug

## 🛑 Stop Everything

```bash
bash STOP_SERVICES.sh
```

## 🔍 Check Status

```bash
bash CHECK_SERVICES.sh
```

## 🐛 Troubleshooting

### Problem: "Frontend test button does nothing"

**Solution:** The frontend was cached. Already fixed by:
1. Clearing Next.js `.next` cache
2. Adding missing `Badge` component
3. Fixing stream parsing in debug page

### Problem: "Backend won't start" 

**Check logs:**
```bash
tail -50 /tmp/backend_output.log
```

**Common fixes:**
- Port in use: `lsof -ti:5052 | xargs kill -9`
- Syntax error: Check last edit in `agent_service/app.py`
- Missing env vars: Create `.env` with `ANTHROPIC_API_KEY` and `FMP_API_KEY`

### Problem: "Frontend shows errors"

**Check logs:**
```bash
tail -50 /tmp/frontend_output.log
```

**Common fixes:**
- Port in use: `lsof -ti:3031 | xargs kill -9`
- Build errors: Look for import errors or TypeScript issues
- Old cache: `cd frontend && rm -rf .next`

### Problem: "Chat sends messages but nothing happens"

**Fix:** Backend might not be responding. Check:
```bash
curl http://127.0.0.1:5052/health
# Should return: {"status":"ok","service":"claude-finance-agent"}

curl -X POST http://127.0.0.1:5052/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' | head -20
# Should return streaming NDJSON events
```

If backend doesn't respond, restart with `bash STOP_SERVICES.sh && bash START_SERVICES.sh`

## 📝 Logs

**Backend logs (real-time):**
```bash
tail -f /tmp/backend_output.log
```

**Frontend logs (real-time):**
```bash
tail -f /tmp/frontend_output.log
```

**Or view in browser:** http://localhost:3031/logs

## 💡 How It Works

1. **Backend (Python/FastAPI)** runs Claude Agent SDK with custom CLI tools
2. **Frontend (Next.js)** provides chat UI and streams responses from backend
3. **Communication:** Frontend → `/api/chat` → Backend `/query` → Claude SDK → CLI tools

All configured to use `127.0.0.1` (IPv4) to avoid IPv6 issues.

## ✨ Features

- **Real-time streaming** of agent responses
- **Tool execution tracking** with detailed logs
- **Workspace browser** to view agent's file operations
- **Live logs viewer** to debug agent behavior
- **Compact UI** scaled at 70% for better screen usage
- **Collapsible workspace** panel

Enjoy your Claude Finance Agent! 🎉

