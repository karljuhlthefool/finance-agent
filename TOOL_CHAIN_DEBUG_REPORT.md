# Tool Chain Debug Report

## Current Issues (User Reported)

1. ✅ **Tool arguments not displaying** - Args showing "undefined" in console
2. ✅ **Latest tool not visible** - Only collapse button shows, no latest tool card
3. ✅ **Collapsed view only shows 1 tool** - Should show all previous tools

## Investigation Findings

### Issue 1: Args Not Passing Through

**Backend Code** (`app.py:262`):
```python
yield {
    "type": "data",
    "event": "agent.tool-start",
    "tool": tool_name,
    "tool_id": tool_id,
    "cli_tool": cli_tool,
    "metadata": metadata,
    "args": tool_args,  # ← Sending this
}
```

**Frontend Receives** (console log):
```json
{
  "event": "agent.tool-start",
  "tool_id": "toolu_011jkJtaLUpVJhysMr5ReJ6g",
  "cli_tool": "mf-market-get",
  "metadata": {
    "ticker": "TSLA",
    "fields": ["quote"]
  }
  // ❌ NO "args" field!
}
```

**Frontend Code** (`page.tsx:53`):
```typescript
addTool(event.tool_id, {
  tool: event.tool,
  cliTool: event.cli_tool,
  metadata: event.metadata,
  args: event.args,  // ← This is undefined!
```

**Hypothesis**: The args are being filtered out somewhere in the streaming pipeline, OR `tool_args` (block.input) is empty/None for the Bash tool.

### Issue 2: Latest Tool Not Rendering

**Component Structure**:
```tsx
<ToolChainGroup toolIds={["id1", "id2"]} />
  ↓
  <div className="space-y-1.5">
    {/* Latest tool */}
    <div className="border-2 border-purple-500">
      <div>LATEST TOOL:</div>
      <ToolCard toolId={latestToolId} />  ← Should render here
    </div>
    
    {/* Collapse button */}
    <button>▶ Show N previous tools</button>
  </div>
```

**Actual DOM** (from snapshot):
```yaml
- generic [ref=e65]:
  - generic [ref=e67]: "LATEST TOOL:"  ← Debug text shows
  - button "▶ Show 1 previous tool"   ← Button is INSIDE same container!
```

**The ToolCard is NOT rendering at all!**

Console shows:
```
[ToolChainGroup] Multiple tools, rendering latest at top + collapse button
```

But no ToolCard is in the DOM.

### Issue 3: Collapsed View Logic

Need to test by clicking the expand button and seeing what renders.

## Action Plan

1. ✅ Fix args not being passed - investigate why `block.input` for Bash tool is empty
2. ✅ Fix latest tool not rendering - investigate why ToolCard is not mounting
3. ✅ Test collapsed/expanded behavior with proper logging
4. ✅ Show ALL tool arguments as key-value pairs, not just ticker/fields

## Next Steps

1. Add backend logging to see what `tool_args` (block.input) actually contains
2. Check if there's a JSONification issue (can dict with complex types be serialized?)
3. Simplify ToolChainGroup to remove conditional rendering bugs
4. Add proper args display that shows ALL args, not selective ones

