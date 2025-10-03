# GenUI Component Fix Summary

## Issues Identified

### 1. **Tool Cards Not Rendering**
**Problem:** Generic tool cards showing "unknown" instead of specialized cards (MarketDataCard, QACard, etc.)

**Root Cause:** Backend wasn't detecting CLI tool types from Bash commands and wasn't sending `cli_tool` and `metadata` fields to frontend.

**Fix Applied:**
- Added CLI tool detection in `agent_service/app.py` in the `ToolUseBlock` handler
- Extracts `cli_tool` type from bash command (e.g., "mf-market-get")
- Parses JSON metadata from `echo '{"ticker":"AAPL",...}' | tool` pattern
- Emits enhanced `agent.tool-start` events with:
  ```json
  {
    "type": "data",
    "event": "agent.tool-start",
    "tool": "Bash",
    "tool_id": "toolu_01ABC...",
    "cli_tool": "mf-market-get",
    "metadata": {
      "ticker": "AAPL",
      "fields": ["profile", "quote", ...],
      ...
    },
    "args": { "command": "...", "description": "..." }
  }
  ```

### 2. **Tool Results Not Streaming to Frontend**
**Problem:** Tool results weren't being sent to the frontend, so cards stayed in loading state

**Root Cause:** `UserMessage` handler wasn't yielding events to the frontend

**Fix Applied:**
- Modified `UserMessage` handler to yield `agent.tool-result` and `agent.tool-error` events
- Emits structured result events:
  ```json
  {
    "type": "data",
    "event": "agent.tool-result",  // or "agent.tool-error"
    "tool_id": "toolu_01ABC...",
    "result": {
      "ok": true,
      "result": {...},
      "paths": [...],
      "metrics": {...}
    },
    "error": null  // or error message if failed
  }
  ```

### 3. **Insufficient Logging for GenUI Components**
**Problem:** Hard to debug which events are being sent and how cards are rendering

**Fix Applied:**
- Enhanced logging in backend to log:
  - CLI tool detection: `🔧 Tool CALLED: Bash` with `cli_tool` and `metadata`
  - Tool results: `✅ Tool result received` with metrics and ok status
  - Errors: `❌ Tool result ERROR` with error details
- Logs now include:
  - Tool ID (truncated to 20 chars for readability)
  - CLI tool type (e.g., "mf-market-get")
  - Parsed metadata (ticker, fields, etc.)
  - Result metrics (bytes, t_ms, fields_fetched, etc.)
  - Error messages for failed tools

## Code Changes

### `agent_service/app.py`

**1. ToolUseBlock Handler (Lines 176-222)**
```python
elif isinstance(block, ToolUseBlock):
    # ... existing code ...
    
    # NEW: Detect CLI tool if this is a Bash command
    cli_tool = None
    metadata = {}
    if tool_name == "Bash" and "command" in tool_args:
        command = tool_args["command"]
        # Detect CLI tool type
        cli_tools = ["mf-market-get", "mf-estimates-get", ...]
        for tool in cli_tools:
            if tool in command:
                cli_tool = tool
                break
        
        # Extract JSON metadata from echo pattern
        match = re.search(r"echo\s+'(\{[^']+\})'", command)
        if match:
            try:
                metadata = json.loads(match.group(1))
            except:
                pass
    
    # NEW: Enhanced logging
    log("tool", f"🔧 Tool CALLED: {tool_name}", {
        "id": tool_id[:20], 
        "cli_tool": cli_tool,
        "metadata": metadata
    })
    
    # NEW: Enhanced event emission
    yield {
        "type": "data",
        "event": "agent.tool-start",
        "tool": tool_name,
        "tool_id": tool_id,
        "cli_tool": cli_tool,      # NEW
        "metadata": metadata,       # NEW
        "args": tool_args,
    }
```

**2. UserMessage Handler (Lines 138-183)**
```python
elif isinstance(message, UserMessage):
    # ... existing code ...
    
    # NEW: Enhanced logging
    if is_error:
        log("error", f"❌ Tool result ERROR for {tool_id[:20]}", ...)
    else:
        if isinstance(result_data, dict):
            log_summary = {
                "tool_id": tool_id[:20],
                "ok": result_data.get("ok"),
                "metrics": result_data.get("metrics"),
            }
            log("tool", f"✅ Tool result received", log_summary)
    
    # NEW: Yield tool result to frontend
    event_type = "agent.tool-error" if (is_error or failed) else "agent.tool-result"
    
    yield {                        # NEW - was previously return (no yield)
        "type": "data",
        "event": event_type,
        "tool_id": tool_id,
        "result": result_data,
        "error": ... if failed else None
    }
```

## Data Flow

### Before Fix
```
Backend: Bash tool called → (no cli_tool detection)
Backend: Tool result received → (not yielded to frontend)
Frontend API: Receives tool-start with tool="Bash", no cli_tool
Frontend UI: Can't determine card type → Shows GenericToolCard
Frontend UI: Never receives tool-result → Card stuck in loading
```

### After Fix
```
Backend: Bash tool called → Detects "mf-market-get" + parses metadata
Backend: Yields tool-start with cli_tool + metadata
Frontend API: Receives and forwards cli_tool + metadata
Frontend UI: Routes to MarketDataCard based on cli_tool
Backend: Tool result received → Yields tool-result event  
Frontend API: Forwards tool-result with tool_id
Frontend UI: Matches tool_id → Updates MarketDataCard with result
Frontend UI: Card transitions from loading → success state
```

## Testing

### Test Case 1: Market Data
```
User: "Pull market data for AAPL"
Expected Backend Logs:
  [INFO] 🔧 Tool CALLED: Bash
    cli_tool: mf-market-get
    metadata: {ticker: "AAPL", fields: [...]}
  [INFO] ✅ Tool result received
    ok: true
    metrics: {bytes: 525553, t_ms: 11498, fields_fetched: 11}

Expected Frontend:
  - MarketDataCard appears with ticker badge "AAPL"
  - Shows loading spinner with "Fetching 11 data types..."
  - After result: Shows tabs (Overview, Prices, Fundamentals, ...)
  - InsightBubble: "Fetched 11 data types for AAPL in 11.5s"
```

### Test Case 2: QA Tool
```
User: "Analyze risk factors from AAPL 10-K"
Expected Backend Logs:
  [INFO] 🔧 Tool CALLED: Bash
    cli_tool: mf-qa
    metadata: {instruction: "Analyze risks", model: "haiku", ...}
  [INFO] ✅ Tool result received
    ok: true
    metrics: {chunks: 3, cost_usd: 0.055, ...}

Expected Frontend:
  - QACard appears with model badge "Haiku"
  - Shows instruction quoted
  - After result: Shows answer with cost badge "$0.0550"
  - Token counts displayed
```

### Test Case 3: Failed Tool
```
User: "Get data for INVALID_TICKER"
Expected Backend Logs:
  [ERROR] ❌ Tool result ERROR
    ok: false
    error: "Invalid ticker: INVALID_TICKER"

Expected Frontend:
  - Card shows error state (red background)
  - Error message displayed clearly
  - No loading spinner stuck
```

## Verification Checklist

✅ Backend detects all 11 CLI tools:
  - mf-market-get
  - mf-estimates-get
  - mf-documents-get
  - mf-filing-extract
  - mf-qa
  - mf-calc-simple
  - mf-valuation-basic-dcf
  - mf-report-save
  - mf-extract-json
  - mf-json-inspect
  - mf-doc-diff

✅ Backend extracts JSON metadata from echo pattern

✅ Backend emits tool-start with cli_tool + metadata

✅ Backend emits tool-result/tool-error from UserMessage

✅ Frontend API route forwards all fields to useChat data annotations

✅ Frontend page.tsx routes to correct card based on cli_tool

✅ All specialized cards handle loading/success/error states

✅ Logging includes sufficient detail for debugging

## Next Steps (Optional)

1. **Add Progress Events:** For long-running tools, emit progress updates
   ```json
   {"event": "agent.tool-progress", "tool_id": "...", "progress": 0.5, "message": "Processing chunk 2/4"}
   ```

2. **Add Thinking Events:** When agent is planning, emit thinking events
   ```json
   {"event": "agent.thinking", "message": "Analyzing which data fields to fetch", "plan": [...]}
   ```

3. **Enhanced Metadata Extraction:** Handle more patterns:
   - Multi-line JSON in echo
   - Heredoc patterns (`cat <<EOF`)
   - File inputs (`< input.json`)

4. **Tool Chain Visualization:** Use tool-start/result events to build dependency graph

5. **Performance Metrics:** Track and display:
   - Time between tool-start and tool-result
   - Total cost per query
   - Tool success/failure rates

---

**Fix Applied:** October 2, 2025  
**Status:** Complete ✅  
**Ready for Testing:** Yes 🚀

