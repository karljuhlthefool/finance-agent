# 🔍 Live Logs Viewer - Quick Guide

## What I Just Built

I created a **real-time logs viewer** that shows you EVERYTHING happening in the backend:

✅ **What the LLM is thinking** - Every message and response  
✅ **Tool calls** - When the agent calls CLI tools (with arguments)  
✅ **Tool results** - What the tools return (success/failure/data)  
✅ **Execution details** - Timestamps, errors, warnings  
✅ **Full debugging visibility** - Nothing is hidden!

## How to Use It

### Step 1: Open the Logs Page
Open your browser and go to:
```
http://localhost:3001/logs
```

*(or `http://localhost:3000/logs` if frontend is on port 3000)*

### Step 2: Open the Chat in Another Tab
In a separate browser tab, open:
```
http://localhost:3001
```

### Step 3: Watch the Magic!
1. **In the chat tab**: Ask the agent something like "What's Apple's stock price?"
2. **In the logs tab**: You'll see LIVE updates showing:
   - 🚀 Query starting
   - 💬 Agent thinking/responding
   - 🔧 Tools being called (WebSearch, Bash, CLI tools, etc.)
   - ✅ Tool results coming back
   - 🏁 Query completing

## What You'll See

The logs page shows color-coded entries:

- **🔵 BLUE (tool)** - CLI tool execution (the important stuff!)
- **⚪ WHITE (info)** - General information
- **🟡 YELLOW (warning)** - Non-critical issues
- **🔴 RED (error)** - Actual errors
- **🟤 GRAY (debug)** - Detailed debugging info

## Example Workflow

**Ask in chat:** "Pull the latest 10-K filing for Apple"

**See in logs:**
```
16:42:15.234 [INFO] 🚀 Starting query
16:42:15.456 [DEBUG] 📨 Received message type: AssistantMessage
16:42:15.567 [TOOL] 🔧 Tool called: Bash
  → {"command": "echo '{\"ticker\":\"AAPL\",\"type\":\"10-K\"}' | /path/to/bin/mf-documents-get"}
16:42:18.901 [TOOL] ✅ Tool Bash succeeded
  → {"ok": true, "data": {"main_text": "/workspace/data/sec/AAPL/..."}}
16:42:19.012 [INFO] 💬 Agent text: I've fetched Apple's latest 10-K filing...
16:42:19.123 [INFO] 🏁 Agent completed in 3689ms
```

## Controls

- **Auto-scroll** (checkbox) - Automatically scroll to new logs
- **Clear** (button) - Clear all logs from view
- **Connection indicator** - Shows if you're connected to the backend

## Tips

1. **Keep both tabs side-by-side** for the best experience
2. **Turn OFF auto-scroll** if you want to read older logs
3. **The logs persist** in memory (last 1000 entries)
4. **Refresh the logs page** to reconnect if it disconnects

## Troubleshooting

**"Disconnected" status?**
- Make sure the backend is running on port 5051
- Refresh the page to reconnect

**Not seeing any logs?**
- Send a message in the chat first
- Check that the backend is running: `curl http://localhost:5051/healthz`

**Too many logs?**
- Click "Clear" to clean up
- Only the latest 1000 logs are kept automatically

---

## Technical Details (for nerds 🤓)

- Backend streams logs via **Server-Sent Events (SSE)**
- Logs are buffered in memory (1000 max)
- Real-time updates every 100ms
- Color-coded by severity level
- JSON data is pretty-printed for readability

