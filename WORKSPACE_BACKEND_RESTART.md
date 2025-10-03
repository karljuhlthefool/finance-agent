# Workspace Backend - Restart Required

## ⚠️ Issue

The workspace endpoints were missing from `agent_service/app.py` and have been re-added. The backend server needs to be restarted to load the new endpoints.

---

## ✅ Endpoints Re-Added

The following endpoints were re-added to `agent_service/app.py`:

1. **`GET /workspace/tree`** - Returns file tree structure
2. **`GET /workspace/file?path=...`** - Returns file contents
3. **`_scan_workspace_tree()`** - Helper function for tree scanning
4. **CORS middleware** - Added for frontend communication

**Lines added:** ~150 lines

---

## 🔄 How to Restart Backend

### Option 1: If using uvicorn with --reload (Recommended)

If you started the backend with `--reload` flag, the server should auto-reload. But if the file was completely replaced, you may need to restart manually:

```bash
# Find and kill the existing uvicorn process
pkill -f "uvicorn agent_service.app:app"

# Or if using Control+C in the terminal, just press Ctrl+C

# Then restart:
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
uvicorn agent_service.app:app --reload --host 0.0.0.0 --port 5051
```

### Option 2: Manual restart

```bash
# In the terminal where backend is running:
# Press Ctrl+C to stop

# Then restart:
uvicorn agent_service.app:app --reload --host 0.0.0.0 --port 5051
```

---

## ✅ Verify It's Working

After restarting, test the endpoint:

```bash
# Should return JSON with workspace tree
curl http://localhost:5051/workspace/tree

# Expected response:
# {
#   "ok": true,
#   "workspace": "/path/to/workspace",
#   "tree": [...]
# }

# NOT "Not Found"
```

---

## 🎯 Quick Start (All Steps)

```bash
# 1. Stop backend (if running)
# Press Ctrl+C in terminal OR:
pkill -f "uvicorn agent_service.app:app"

# 2. Start backend with reload
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
uvicorn agent_service.app:app --reload --host 0.0.0.0 --port 5051

# 3. Verify workspace endpoint works
curl http://localhost:5051/workspace/tree

# 4. Refresh frontend in browser
# Open http://localhost:3000
# Workspace should now load!
```

---

## 🐛 Troubleshooting

### "Command not found: uvicorn"

Virtual environment not activated:
```bash
source venv/bin/activate
```

### "Address already in use"

Kill the old process:
```bash
lsof -ti:5051 | xargs kill -9
# Then restart uvicorn
```

### Workspace still shows "Failed to fetch"

1. Check backend is running: `curl http://localhost:5051/healthz`
2. Check workspace endpoint: `curl http://localhost:5051/workspace/tree`
3. Check browser console for CORS errors
4. Verify frontend is using correct URL (http://localhost:5051)

### Backend starts but crashes immediately

Check for Python errors:
```bash
python -c "from agent_service import app; print('Import OK')"
```

If import fails, check dependencies:
```bash
pip install -r requirements.txt
```

---

## 📝 What Changed in app.py

### Added Imports
```python
from typing import Any, AsyncIterator, Dict, List  # Added List
from fastapi import FastAPI, HTTPException, Request, Query  # Added Query
from fastapi.middleware.cors import CORSMiddleware  # Added CORS
```

### Added CORS Middleware
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Added Workspace Endpoints
- `_scan_workspace_tree()` function (~40 lines)
- `GET /workspace/tree` endpoint (~25 lines)
- `GET /workspace/file` endpoint (~70 lines)

**Total:** ~150 lines added to end of file

---

## ✅ After Restart

Once the backend restarts successfully:

1. ✅ `/workspace/tree` returns JSON (not "Not Found")
2. ✅ Frontend workspace panel loads file tree
3. ✅ Can click files to view contents
4. ✅ Can resize workspace panel
5. ✅ No more "Failed to fetch" error

---

## 🎉 Summary

**Problem:** Backend endpoints missing, needs restart  
**Solution:** Restart uvicorn to load new code  
**Command:** `uvicorn agent_service.app:app --reload --port 5051`  
**Verify:** `curl http://localhost:5051/workspace/tree`

**After restart, workspace will work perfectly!** 🚀

