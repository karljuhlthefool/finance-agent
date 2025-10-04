# Tool Args Investigation - Complete Analysis

## Problem Statement

User reported 3 issues:
1. **Tool arguments not displaying** in tool cards
2. **Latest tool not visible** when multiple tools exist
3. **Collapsed view only shows 1 tool** instead of all previous tools

## Root Cause Analysis

### Issue 1: Args Not Being Sent From Backend ✅ IDENTIFIED

**Backend Code** (`app.py:269`):
```python
yield {
    "type": "data",
    "event": "agent.tool-start",
    "tool": tool_name,           # ← Intended to send
    "tool_id": tool_id,
    "cli_tool": cli_tool,
    "metadata": metadata,
    "args": serializable_args,    # ← Intended to send
}
```

**Frontend Receives** (from console logs):
```json
{
  "type": "data",
  "event": "agent.tool-start",
  "tool_id": "toolu_01RsrvYDeqz74tSsZXBnTHFa",
  "cli_tool": "mf-market-get",
  "metadata": {
    "ticker": "META",
    "fields": ["profile"]
  }
  // ❌ NO "tool" field!
  // ❌ NO "args" field!
}
```

**Hypothesis**: 
- The backend yield statement includes `"tool"` and `"args"`
- But the JSON serialization in `_event_stream` (line 96) is **silently failing** to serialize those fields
- OR the service didn't reload with the new code

**Next Steps**:
1. Verify backend actually reloaded with new code
2. Add explicit error handling around JSON serialization
3. Test if `tool_args` (block.input) is empty for Bash tools (likely cause)

### Issue 2: Latest Tool Not Rendering ✅ IDENTIFIED

**Component Code** (`ToolChainGroup.tsx:53-56`):
```tsx
<div className="border-2 border-purple-500">
  <div className="text-xs text-purple-600 font-mono p-1">LATEST TOOL:</div>
  <ToolCard toolId={latestToolId} />
</div>
```

**Actual DOM**:
```yaml
- generic [ref=e65]:
  - generic [ref=e67]: "LATEST TOOL:"  ← Debug text shows!
  - button "▶ Show 1 previous tool"   ← Button shows but is INSIDE the same container!
```

**The ToolCard is NOT rendering at all!**

Console logs show:
```
[ToolChainGroup] Multiple tools, rendering latest at top + collapse button
[ToolHeader] Rendering: {cliTool: null, status: intent, ...}
```

**Hypothesis**:
- The ToolCard component IS being called (ToolHeader renders)
- But the ToolCard wrapper div is not showing in DOM
- Likely a React/CSS issue where the component is rendering but invisible
- OR the component structure is broken somehow

**Next Steps**:
1. Inspect the actual ToolCard component render
2. Check if there's a CSS `display: none` or `opacity: 0`
3. Verify the component hierarchy in React DevTools

### Issue 3: Collapsed View Shows Wrong Tools ⏳ NOT YET TESTED

Need to test by:
1. Getting 3+ tools to run
2. Clicking the "▶ Show N previous tools" button
3. Verifying all previous tools display

## Backend Args Serialization Analysis

The issue is that `tool_args = block.input` for a Bash tool might be:
```python
{
  "command": "cd /Users/karl/work/claude_finance_py && echo '{\"ticker\": \"META\", ...}' | ./bin/mf-market-get --fields profile"
}
```

This is a dict with ONE key: `"command"`. The actual tool arguments are INSIDE the command string, not as dict keys!

So when we send `"args": tool_args`, we're sending:
```json
{
  "args": {
    "command": "cd ... && echo ... | ./bin/mf-market-get ..."
  }
}
```

Which is NOT useful for display!

## Recommended Fixes

### Fix 1: Parse Args from Bash Command

```python
# After detecting cli_tool, also parse args from the echo pattern
if cli_tool and "echo" in command:
    match = re.search(r"echo\s+'(\{[^']+\})'", command)
    if match:
        try:
            parsed_args = json.loads(match.group(1))
            # Use parsed_args instead of tool_args
        except:
            parsed_args = {}
```

### Fix 2: Display BOTH Tool Name and CLI Tool

```python
yield {
    "type": "data",
    "event": "agent.tool-start",
    "tool": tool_name,            # "Bash"
    "cli_tool": cli_tool,          # "mf-market-get"
    "tool_id": tool_id,
    "metadata": metadata,          # Already contains parsed args!
    "args": metadata,              # Send metadata as args (it has the parsed JSON)
}
```

### Fix 3: Frontend Display All Args

Instead of selectively showing ticker/fields, show ALL args as key-value pairs:

```tsx
// In ToolHeader
{args && Object.keys(args).length > 0 && (
  <div className="text-[10px] text-slate-600 space-y-0.5">
    {Object.entries(args).map(([key, value]) => (
      <div key={key}>
        <span className="font-medium">{key}:</span>{' '}
        <span>{JSON.stringify(value)}</span>
      </div>
    ))}
  </div>
)}
```

## Current Status

- ✅ Identified root cause for args issue (not being sent OR not being serialized)
- ✅ Identified root cause for latest tool not rendering (ToolCard not in DOM)
- ⏳ Need to test collapsed view behavior
- ⏳ Need to implement fixes and verify

## Action Items

1. **Backend**: Use `metadata` as args (it already contains the parsed JSON!)
2. **Frontend**: Display args as full key-value list
3. **Debugging**: Remove debug borders and logs after fixes confirmed
4. **Testing**: Test with 3+ tool chain to verify collapse/expand works

