# Claude Finance Agent UI - Setup Guide

## Quick Start

### 1. Start Backend
```bash
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
uvicorn agent_service.app:app --reload --port 5051
```

### 2. Start Frontend
```bash
cd /Users/karl/work/claude_finance_py/frontend
npm run dev
```

### 3. Access UI
Open browser to: **http://localhost:3000**

## Testing

Run integration tests:
```bash
./test_integration.sh
```

Visit debug page: **http://localhost:3000/debug**

## Architecture

```
Browser → Next.js (:3000) → FastAPI (:5051) → Claude Agent SDK → Finance CLI Tools
```

### Data Flow
1. User sends message in browser
2. Next.js `/api/chat` receives request
3. Forwards to FastAPI backend `/query`
4. Backend streams NDJSON events from Claude Agent SDK
5. Route converts NDJSON to AI SDK format (`0:"text"\n`)
6. Frontend renders with markdown support

## Key Features

✅ **Markdown Rendering** - Uses `react-markdown` with Tailwind typography
✅ **Streaming Responses** - Real-time text streaming from agent
✅ **Tool Auto-Approval** - `permission_mode="accept"` enables automatic tool use
✅ **Finance CLI Tools** - Access to all 11 finance analysis tools via MCP
✅ **Debug Tools** - Integration test script + debug page

## Available Tools

The agent has access to these finance CLI tools:
- `mf-market-get` - Fetch 38 types of FMP market data
- `mf-estimates-get` - CapIQ consensus estimates
- `mf-documents-get` - SEC filings (10-K, 10-Q, etc.)
- `mf-filing-extract` - Extract sections/search filings
- `mf-json-inspect` - Schema inspection
- `mf-extract-json` - JSON field extraction
- `mf-calc-simple` - Financial calculations
- `mf-valuation-basic-dcf` - DCF valuation
- `mf-qa` - LLM document analysis
- `mf-doc-diff` - Document comparison
- `mf-report-save` - Save markdown reports

## Troubleshooting

### Backend won't start
```bash
# Check if port is in use
lsof -i :5051

# Kill existing process
pkill -f uvicorn
```

### Frontend won't start
```bash
# Check if port is in use
lsof -i :3000

# Kill existing process
pkill -f "next dev"
```

### Kill all servers
```bash
pkill -f "uvicorn|next dev"
```

### Check logs
```bash
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

### Agent not using tools
- Check `permission_mode="accept"` in `agent_service/settings.py`
- Verify MCP server is connected (look for `'mcp_servers': [{'name': 'finance_cli', 'status': 'connected'}]` in backend response)

### Messages not appearing
- Check browser console (F12) for errors
- Visit http://localhost:3000/debug to test endpoints
- Verify backend is returning text: `curl -X POST http://localhost:5051/query -H "Content-Type: application/json" -d '{"prompt":"hello"}'`

## Configuration

### Backend (`agent_service/settings.py`)
- `permission_mode` - Set to `"accept"` for auto-approval
- `max_turns` - Max conversation turns (default: 12)
- `allowed_tools` - List of enabled tools

### Frontend (`.env.local`)
- `AGENT_URL` - Backend URL (default: http://localhost:5051)

### Main (`.env.local`)
- `ANTHROPIC_API_KEY` - Required for Claude API
- `WORKSPACE_ABS_PATH` - Working directory for data/outputs
- `FMP_API_KEY` - Financial Modeling Prep API key (optional)
- `CIQ_LOGIN` / `CIQ_PASSWORD` - CapIQ credentials (optional)

## Development

### Add new finance tool
1. Create CLI in `bin/`
2. Add to `agent_service/tools_cli.py`
3. Add to `allowed_tools` in `settings.py`
4. Update system prompt in `src/prompts/agent_system.py`

### Modify UI
- Main chat: `frontend/app/page.tsx`
- API route: `frontend/app/api/chat/route.ts`
- Cards: `frontend/components/cards/`

## Example Queries

Try asking the agent:

- "Fetch market data for AAPL including fundamentals and analyst recommendations"
- "Get the latest 10-K for TSLA and extract the risk factors"
- "Calculate the YoY revenue growth for MSFT"
- "Run a DCF valuation for NVDA"
- "Compare the risk factors between this year's and last year's 10-K for AAPL"

The agent will automatically use the appropriate CLI tools and show you the results!


