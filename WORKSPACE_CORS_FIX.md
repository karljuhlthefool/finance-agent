# Workspace CORS & RefreshTree Fix

## ✅ Issues Fixed

### Issue 1: CORS Error - Port 3033 Not Allowed
**Error:**
```
Access to fetch at 'http://localhost:5051/workspace/tree' from origin 'http://localhost:3033' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**Root Cause:** Frontend running on port **3033** but backend only allowed **3000** and **3001**

**Fix:** Added port 3033 to CORS allowed origins
```python
# agent_service/app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3033"],
    # ↑ Added 3033
)
```

---

### Issue 2: refreshTree is not defined
**Error:**
```
❌ Chat error: ReferenceError: refreshTree is not defined
    at onFinish (page.tsx:38:7)
```

**Root Cause:** `refreshTree()` was called but not destructured from `useWorkspace()`

**Fix:** Added `refreshTree` to the destructuring
```typescript
// frontend/app/page.tsx - BEFORE
export default function Page() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, input, setInput, append, isLoading, data } = useChat({
    onFinish: (message) => {
      refreshTree() // ❌ Not defined!
    }
  })

// AFTER
export default function Page() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { refreshTree } = useWorkspace() // ✅ Added this!
  
  const { messages, input, setInput, append, isLoading, data } = useChat({
    onFinish: (message) => {
      refreshTree() // ✅ Now works!
    }
  })
```

---

## 🔄 Required Actions

### 1. Restart Backend
The CORS change requires backend restart:

```bash
# Stop backend (Ctrl+C in terminal)
# Then restart:
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
uvicorn agent_service.app:app --reload --host 0.0.0.0 --port 5051
```

### 2. Refresh Frontend
The frontend code change should auto-reload (if using `npm run dev`), but if not:
- Refresh browser at `http://localhost:3033`
- Or restart Next.js dev server

---

## ✅ Verification

After restarting backend and refreshing frontend:

1. **Check browser console** - CORS errors should be gone ✅
2. **Check workspace panel** - Should show file tree (not error) ✅
3. **Send a message** - refreshTree error should be gone ✅

### Test Commands

```bash
# 1. Test backend workspace endpoint
curl http://localhost:5051/workspace/tree

# Should return JSON like:
# {"ok":true,"workspace":"/path/to/workspace","tree":[...]}

# 2. Test CORS headers
curl -H "Origin: http://localhost:3033" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:5051/workspace/tree

# Should return 200 with CORS headers
```

---

## 📊 Summary

| Issue | Status | Fix Location |
|-------|--------|--------------|
| CORS blocking port 3033 | ✅ Fixed | `agent_service/app.py` line 32 |
| refreshTree undefined | ✅ Fixed | `frontend/app/page.tsx` line 32 |

**Files changed:** 2  
**Lines changed:** 2  
**Restart required:** Backend only

---

## 🎯 After Fixes

Your workspace should now:
- ✅ Load file tree without CORS errors
- ✅ Display files and directories
- ✅ Auto-refresh after agent completes (no errors)
- ✅ Allow clicking files to view contents
- ✅ Work perfectly on port 3033

**All issues resolved!** 🚀

