# Claude Finance Agent - Quick Start Guide

## 🚀 Starting the System

**One simple command:**

```bash
bash START_SERVICES.sh
```

That's it! The script will:
1. ✅ Kill any old processes
2. ✅ Start the backend (port 5051)
3. ✅ Wait for backend to be ready
4. ✅ Start the frontend (port 3001)
5. ✅ Verify everything is running

## 📍 Access Points

- **Chat UI**: http://localhost:3001
- **Live Logs**: http://localhost:3001/logs
- **Backend API**: http://localhost:5051

## 🔍 Check Status

```bash
bash CHECK_SERVICES.sh
```

Shows:
- ✅ Which services are running
- ❌ Which services failed
- 📊 Process IDs
- 📋 How to view logs

## 🛑 Stop Everything

```bash
bash STOP_SERVICES.sh
```

Cleanly stops both frontend and backend.

## 📊 View Logs

**Backend logs:**
```bash
tail -f /tmp/backend_output.log
```

**Frontend logs:**
```bash
tail -f /tmp/frontend_output.log
```

## ❓ Troubleshooting

### Backend won't start

```bash
# View recent backend errors
tail -100 /tmp/backend_output.log

# Check if virtual environment exists
ls -la venv/

# Reinstall dependencies if needed
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start

```bash
# View recent frontend errors
tail -100 /tmp/frontend_output.log

# Check if node_modules exists
ls -la frontend/node_modules/

# Reinstall dependencies if needed
cd frontend
npm install
cd ..
```

### Port already in use

```bash
# Kill processes on specific ports
lsof -ti:5051 | xargs kill -9  # Backend
lsof -ti:3001 | xargs kill -9  # Frontend
```

### Environment variables not set

Make sure you have `.env` or `.env.local` in the project root with:

```bash
ANTHROPIC_API_KEY=your_key_here
FMP_API_KEY=your_fmp_key_here
```

## 🎯 Complete Workflow

```bash
# 1. Start everything
bash START_SERVICES.sh

# 2. Use the app
open http://localhost:3001

# 3. Watch logs in another terminal (optional)
bash CHECK_SERVICES.sh
tail -f /tmp/backend_output.log

# 4. When done, stop everything
bash STOP_SERVICES.sh
```

## 💡 What the "Magic Commands" Do

When you see me run complex commands, it's usually:

1. **Kill old processes**: `pkill -f uvicorn` or `lsof -ti:5051 | xargs kill -9`
2. **Start backend**: `source venv/bin/activate && uvicorn agent_service.app:app --reload --port 5051 &`
3. **Start frontend**: `cd frontend && npm run dev &`
4. **Check status**: `curl http://localhost:5051/health`

All of this is now automated in `START_SERVICES.sh`!

