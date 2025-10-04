# Debug Tool Completion Issue

## Changes Made

### 1. Backend (`agent_service/app.py`)
- **Enhanced result unwrapping** - Now properly extracts `json` field from MCP tool response blocks
- Handles both dict and SDK ContentBlock objects
- Properly unwraps `[{"type": "json", "json": {...}}]` structure

### 2. Frontend Store (`lib/tool-store.ts`)
- **Fixed phase determination logic**
  - Before: `result?.ok ? 'complete' : 'error'` ← Would mark undefined as error
  - After: `result?.ok === false ? 'error' : 'complete'` ← Only explicit false is error
- Added console logging to track `setResult` calls

### 3. Frontend Page (`app/page.tsx`)
- **Added extensive debug logging**:
  - Logs when useEffect triggers
  - Logs full data array
  - Logs each event being processed
  - Logs when setResult is called

## How to Test

1. **Open browser console** (F12 → Console tab)
2. **Send a simple query**: "Get market data for AAPL"
3. **Watch the console output** for:
   ```
   🔄 useEffect triggered, data length: X
   📦 Processing event 0: {...}
   🔧 TOOL START detected: <toolId> mf-market-get
   ⏩ Transitioning to executing: <toolId>
   ✅ TOOL RESULT detected: <toolId>
   📄 Result data: {ok: true, data: {...}}
   ✓ setResult called for: <toolId>
   [tool-store] setResult called: {toolId, result, phase: 'complete'}
   ```

## Expected Behavior

- Tool should transition: `intent` (150ms) → `executing` → `complete`
- Result card should show tool data
- No tools should stay stuck in "executing" phase

## If Tools Still Stuck

Check console for:
1. **Are `agent.tool-result` events being received?**
   - If NO: Backend isn't sending them → check backend logs
   - If YES but empty result: Backend unwrapping failed
   
2. **Is `setResult` being called?**
   - If NO: Frontend event processing failed
   - If YES: Check Zustand store update

3. **Is store updating but UI not re-rendering?**
   - Check if `ToolCard` is reading from store correctly
   - Verify `useToolStore` hook is subscribed properly

## Next Steps After Fixing Completion

1. Implement tool chain grouping/collapsing
2. Make cards more compact
3. Add expand/collapse for args/results
4. Remove redundant status text

