# Testing Action Descriptions - Complete Guide

## ✅ What We've Fixed

### Backend
- ✅ Agent outputs descriptions before tool calls
- ✅ Backend sends `agent.text` events correctly

### API Route  
- ✅ Forwards `agent.text` as BOTH text chunks AND data annotations
- ✅ Frontend can now access these events in the `data` array

### Frontend
- ✅ Enhanced logging to track description capture
- ✅ Captures short text (≤12 words) as descriptions
- ✅ Attaches descriptions to tools when they start

## 🧪 How to Test

### Step 1: Open Browser Console
1. Open http://localhost:3031
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab

### Step 2: Run a Query
Type: **"get quote for TSLA"** or **"get data for Microsoft"**

### Step 3: Check Console Logs

You should see:

```
📦 Processing event 0: ...
  ✓ Event type is "data", event name: agent.text
  💬 Agent text received: {
    text: "\"Fetching real-time quote data for TSLA\"",
    wordCount: 6,
    willCapture: true
  }
  ✅ Captured as potential description! "Fetching real-time quote data for TSLA"

📦 Processing event 1: ...
  ✓ Event type is "data", event name: agent.tool-start
  🔧 TOOL START detected: toolu_xxx mf-market-get
  🎯 ATTACHING DESCRIPTION: {
    lastAgentText: "\"Fetching real-time quote data for TSLA\"",
    willAttach: true
  }
  ✅ Tool added with description: "\"Fetching real-time quote data for TSLA\""
```

### Step 4: Check Visual Display

Look at the tool cards - each should show:

```
📊 Get Market Data
Fetching real-time quote data for TSLA    ← THIS LINE (italic)
ticker = TSLA    fields = quote
✓ 0.5s
📄 quote.json
```

## 🔍 Debugging Guide

### If Descriptions Don't Appear:

1. **Check Console for "💬 Agent text received"**
   - If missing → API route not forwarding data annotations
   - If present but `willCapture: false` → Text too long (>12 words)

2. **Check Console for "🎯 ATTACHING DESCRIPTION"**
   - If `willAttach: false` → Text was cleared before tool started
   - If `willAttach: true` → Description should be attached!

3. **Check Console for "✅ Tool added with description"**
   - Shows what description (if any) was attached to the tool

4. **Check Tool Card HTML**
   - Right-click tool card → Inspect
   - Look for italic text div with description

### Common Issues:

1. **Agent not providing descriptions**
   - Check system prompt is loaded
   - Restart backend to reload prompt

2. **Descriptions too long**
   - Agent might be verbose
   - Check word count in console logs

3. **Timing issue**
   - Description arrives after tool start
   - Check event order in console

## 📊 Test Cases

| Query | Expected Description | Word Count |
|-------|---------------------|------------|
| "get quote for TSLA" | "Fetching real-time quote data for TSLA" | 6 ✓ |
| "get data for MSFT" | "Fetching comprehensive MSFT market data" | 5 ✓ |
| "analyze Apple" | "Analyzing Apple stock data" | 4 ✓ |

## 🎯 Success Criteria

✅ Console shows descriptions being captured  
✅ Console shows descriptions being attached to tools  
✅ Tool cards display descriptions in italics  
✅ Descriptions appear between tool name and arguments

## 🐛 If Still Not Working

Run these commands to debug:

```bash
# 1. Check backend is sending descriptions
curl -s -X POST http://localhost:5052/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"get quote for AAPL"}' | grep agent.text

# 2. Check API route is forwarding
curl -s -X POST http://localhost:3031/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"get quote for AAPL"}]}' | grep agent.text

# 3. Check browser console for detailed logs
```

If all three show descriptions but UI doesn't display them, the issue is in the ToolHeader component rendering logic.

