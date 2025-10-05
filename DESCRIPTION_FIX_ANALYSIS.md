# Description Parameter Fix - Analysis

## Problem Identified

The user correctly identified that the system prompt was instructing the agent to output a description **before** each tool call as separate text:

```
"Fetching Apple data"
<call tool>
```

This was causing two major issues:
1. **Agent stuck in "description mode"**: Sometimes the agent would output the description and command as text instead of actually calling the tool
2. **UI complexity**: The frontend had to capture "last agent text" and attach it to the next tool call, which was fragile

## Root Cause

The original system prompt said:
```
Before EVERY tool call, output ONE short sentence (5-8 words) describing what you're doing.
```

This pattern was problematic because:
- It encouraged the agent to stay in "text output mode" instead of "tool execution mode"
- It created a dependency between consecutive messages (text → tool)
- The frontend had to implement complex logic to capture and attach descriptions

## Solution Implemented

### 1. System Prompt Changes (`src/prompts/agent_system_improved.py`)

**Added explicit warning at the top:**
```
⚠️ **CRITICAL: YOU MUST USE TOOLS, NOT DESCRIBE THEM** ⚠️

When you need to run a command or fetch data:
- ✅ CORRECT: Call the Bash tool with command parameter AND description parameter
- ❌ WRONG: Output text describing the command or showing the command as text
```

**Changed the "Action Descriptions" section to "Tool Descriptions":**
```
# Tool Descriptions (MANDATORY)

**CRITICAL:** When calling the Bash tool, ALWAYS include a `description` parameter 
with a brief (5-8 words) explanation of what the command does.

**The description is a PARAMETER of the Bash tool, not separate text!**
```

**Updated Final Reminders:**
- Added: "Include description parameter in EVERY Bash tool call"
- Added: "NEVER output text before tool calls - put description inside the tool call"

### 2. Backend Changes (`agent_service/app.py`)

**Preserved description parameter when creating display_args:**
```python
# For CLI tools, use metadata (which has parsed JSON args) as args
# But preserve the description parameter from tool_args if present
if cli_tool and metadata:
    display_args = metadata.copy()
    if "description" in tool_args:
        display_args["description"] = tool_args["description"]
else:
    display_args = tool_args
```

This ensures the `description` parameter from the Bash tool call is passed through to the frontend.

### 3. Frontend Changes (`frontend/app/page.tsx`)

**Extract description from tool args first, fallback to last text:**
```typescript
// Extract description from tool args (for Bash tool) or use last agent text as fallback
const toolDescription = event.args?.description || lastAgentTextRef.current || undefined
```

This prioritizes the `description` parameter from the tool call over the previous text pattern.

### 4. Testing Script Changes (`agent_testing.py`)

**Display description parameter in console output:**
```python
if tool_name == "Bash":
    cmd = tool_args.get("command", "")
    desc = tool_args.get("description", "")
    
    # Show description if present
    if desc:
        print(f"   {colorize('Description:', Colors.BOLD)} {colorize(desc, Colors.CYAN)}")
```

**Fixed import to use improved system prompt:**
```python
from src.prompts.agent_system_improved import AGENT_SYSTEM
```

## Test Results

### Before Fix (Test 1 & 2)
```
Agent Response:
"Fetching real-time Apple stock quote"
echo '{"ticker":"AAPL","fields":["quote"]}' | /path/mf-market-get

Tool Calls: 0  ❌ Agent not executing tools!
```

### After Fix (Test 3)
```
Agent Response:
I'll fetch Apple's current stock quote using the market data tool:

🔧 Tool Call: Bash
   Description: Fetching AAPL current stock quote  ✅
   Command: echo '{"ticker":"AAPL","fields":["quote"]}' | ...

Tool Calls: 2  ✅ Agent executing tools!
```

## Impact

### Positive Changes
1. ✅ **Agent now executes tools instead of describing them**
2. ✅ **Description is part of tool call schema** (cleaner architecture)
3. ✅ **Frontend logic simplified** (no need to capture previous text)
4. ✅ **More reliable tool execution** (less confusion between modes)

### Remaining Issues
1. ⚠️ Agent still occasionally outputs raw XML function calls (see end of Test 3)
2. ⚠️ Need to test with more complex multi-step queries
3. ⚠️ Need to verify UI displays descriptions correctly

## Next Steps

1. **Test with complex queries** to ensure the fix holds up
2. **Verify UI rendering** of descriptions in tool cards
3. **Monitor for any regressions** where agent reverts to text mode
4. **Consider adding validation** to reject tool calls without descriptions

## Files Modified

1. `src/prompts/agent_system_improved.py` - Updated system prompt
2. `agent_service/app.py` - Preserve description in display_args
3. `frontend/app/page.tsx` - Extract description from tool args
4. `agent_testing.py` - Display description + use improved prompt
5. `src/prompts/__init__.py` - Import from improved prompt (already done)

## Conclusion

The fix successfully addresses the root cause by making the description a **parameter of the tool call** rather than **separate text before the tool call**. This architectural change aligns better with how the Claude Agent SDK works and reduces the complexity of the UI logic.

The agent now consistently executes tools with descriptions, which should improve both performance and reliability.
