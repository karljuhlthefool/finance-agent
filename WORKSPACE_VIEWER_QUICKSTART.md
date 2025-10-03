# Workspace Viewer - Quick Start (5 Minutes)

## 🚀 Get Started in 3 Steps

### Step 1: Start Backend (Terminal 1)

```bash
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
uvicorn agent_service.app:app --reload --port 5051
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:5051
INFO:     Application startup complete.
```

### Step 2: Start Frontend (Terminal 2)

```bash
cd /Users/karl/work/claude_finance_py/frontend
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.2.3
  - Local:        http://localhost:3000
  
✓ Ready in 1.2s
```

### Step 3: Open & Test

1. Open browser: `http://localhost:3000`
2. Look at right side → See "📁 Workspace" button
3. Click to expand
4. See file tree from your workspace!

---

## 🎮 Try These Commands

### Test 1: View Existing Files (5 seconds)

1. Open workspace panel
2. Navigate to `data/market/AAPL/`
3. Click any `.json` file
4. See formatted contents!

### Test 2: Create New Files (30 seconds)

**In the chat, type:**
```
Get market data for AAPL including profile and quote
```

**Watch:**
- Agent runs tool
- Tool card shows "Files created"
- Click a file path → Workspace opens
- File displays instantly!

### Test 3: Download File (10 seconds)

1. Open any file in workspace
2. Click "⬇ Download" button
3. File downloads to your computer
4. Open in your favorite editor!

---

## ✅ You're Done!

That's it! The workspace viewer is now working. 

**What you can do:**
- 📂 Browse all agent files
- 👁️ View JSON, Markdown, and text files
- 🔗 Click file paths in tool cards
- ⬇️ Download any file
- 🔄 Watch real-time updates

**Next steps:**
- Read `WORKSPACE_VIEWER_FEATURES.md` for full feature list
- Read `WORKSPACE_VIEWER_SETUP.md` for troubleshooting
- Read `WORKSPACE_VIEWER_REQUIREMENTS.md` for technical details

---

## 🐛 Something Not Working?

### Backend Issue
```bash
# Check backend is running
curl http://localhost:5051/workspace/tree
# Should return JSON with workspace tree
```

### Frontend Issue
```bash
# Check for build errors
npm run dev
# Look for errors in output
```

### Still Stuck?
1. Check browser console (F12) for errors
2. Check backend logs for errors
3. Verify workspace exists: `/Users/karl/work/claude_finance_py/runtime/workspace/`
4. See `WORKSPACE_VIEWER_SETUP.md` → Troubleshooting section

---

## 📚 Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **QUICKSTART.md** (this) | Get running fast | First time setup |
| **FEATURES.md** | See what's possible | After setup |
| **SETUP.md** | Detailed guide | When troubleshooting |
| **REQUIREMENTS.md** | Technical spec | For development |

---

## 🎉 Enjoy!

You now have full visibility into your agent's workspace. Happy exploring! 🚀

