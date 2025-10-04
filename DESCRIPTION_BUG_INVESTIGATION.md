# Tool Description Bug - Deep Investigation & Fix

## 🔍 Investigation Process

### Step 1: Understanding the Expected Flow

The intended flow for action descriptions:
1. Agent outputs text: "Fetching comprehensive AAPL market data"
2. Backend sends: `{type: "data", event: "agent.text", text: "..."}`
3. Frontend captures short text (< 12 words) as `lastAgentText`
4. Agent calls tool
5. Backend sends: `{event: "agent.tool-start", ...}`
6. Frontend attaches `lastAgentText` as `description` to the tool

### Step 2: Checking Backend

**File**: `agent_service/app.py:221-228`

```python
if isinstance(block, TextBlock):
    text = block.text
    log("info", f"💬 Agent response: {text[:150]}...")
    yield {
        "type": "data",
        "event": "agent.text",
        "text": text,
    }
```

✅ **Backend is working correctly** - it sends `agent.text` events.

### Step 3: Checking Frontend Event Processing

**File**: `frontend/app/page.tsx:49-60`

```typescript
// Agent text (might be description for next tool)
if (event.event === 'agent.text') {
  const text = event.text?.trim()
  if (text && text.split(' ').length <= 12) {
    setLastAgentText(text)  // Store for next tool
    console.log('  💬 Captured potential description:', text)
  } else {
    setLastAgentText(null)
  }
}
```

✅ **Frontend logic is correct** - it captures short text as descriptions.

### Step 4: Checking the API Route (THE BUG!)

**File**: `frontend/app/api/chat/route.ts:73-79`

```typescript
// Text content goes as text chunks
if (event.event === 'agent.text' && event.text) {
  const formatted = `0:${JSON.stringify(event.text)}\n`
  controller.enqueue(encoder.encode(formatted))
}
```

🐛 **BUG FOUND!** 

The API route converts `agent.text` to format `0:"text"` (AI SDK text chunk format) but does NOT send it as a data annotation `2:[...]`!

This means:
- Text goes into `message.content` (visible to user)
- Text does NOT go into `data` array (where frontend is looking for it!)

### Step 5: Understanding AI SDK Stream Format

The Vercel AI SDK uses a specific stream format:
- `0:"text"` = Text chunks (appended to `message.content`)
- `1:[...]` = Tool calls
- `2:[{...}]` = Data annotations (goes into `data` array)

**The frontend `useChat` hook only checks `data` array for events!**

## 🔧 The Fix

**File**: `frontend/app/api/chat/route.ts`

Send `agent.text` events **BOTH** as text chunks (for display) AND as data annotations (for description capture):

```typescript
if (event.event === 'agent.text' && event.text) {
  // Send as text chunk (for message content - user sees it)
  const formatted = `0:${JSON.stringify(event.text)}\n`
  controller.enqueue(encoder.encode(formatted))
  
  // ALSO send as data annotation (for description capture)
  const dataAnnotation = `2:[${JSON.stringify({
    type: 'data',
    event: 'agent.text',
    text: event.text,
  })}]\n`
  controller.enqueue(encoder.encode(dataAnnotation))
}
```

## 📊 Data Flow (Before vs After)

### Before (Broken)
```
Backend:    {event: "agent.text", text: "Fetching..."}
           ↓
API Route:  0:"Fetching..."
           ↓
useChat:    message.content += "Fetching..."
            data array = [] ← EMPTY!
           ↓
Frontend:   if (event.event === 'agent.text') ← NEVER RUNS!
```

### After (Fixed)
```
Backend:    {event: "agent.text", text: "Fetching..."}
           ↓
API Route:  0:"Fetching..."  AND  2:[{event: "agent.text", text: "Fetching..."}]
           ↓
useChat:    message.content += "Fetching..."
            data array = [{type: "data", event: "agent.text", text: "Fetching..."}]
           ↓
Frontend:   if (event.event === 'agent.text') ← NOW RUNS!
            setLastAgentText("Fetching...")
```

## ✅ Expected Result

After this fix:
1. Agent outputs description before tool call
2. Frontend captures it in `lastAgentText`
3. When tool starts, description is attached
4. ToolHeader displays description in italics below tool name

## 🧪 Testing

**Query**: "pull stock data for apple"

**Expected**:
- ✅ Each tool card shows italic description
- ✅ Example: "Fetching comprehensive AAPL market data"
- ✅ Description appears between tool name and arguments

**Console Logs to Verify**:
```
💬 Captured potential description: Fetching comprehensive AAPL market data
🔧 TOOL START detected: toolu_xxx mf-market-get
(Tool state should include description field)
```

