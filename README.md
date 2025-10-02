# Claude Finance (Python)

**CLI-first finance agent powered by Claude Agent SDK**

A complete financial analysis toolkit with 7 specialized tools for SEC filings, market data, Q&A extraction, calculations, document comparison, and DCF valuation.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your keys:
# - ANTHROPIC_API_KEY (required)
# - FMP_API_KEY (optional, for market data)
```

### 3. Run the Agent

```bash
# Make agent executable
chmod +x src/agent.py

# Run it
python src/agent.py
```

### 4. Start the FastAPI streaming service (optional, for UI)

```bash
uvicorn agent_service.app:app --reload --port 5051
```

### 5. Launch the Next.js frontend (optional)

```bash
cd frontend
npm install
npm run dev
```

---

## 📦 What's Included

### 7 CLI Tools (all in `bin/`)

1. **`mf-fetch-url`** - Download any URL
2. **`mf-documents-get`** - Fetch SEC filings (10-K/10-Q/8-K)
3. **`mf-market-get`** - Get prices, fundamentals, estimates
4. **`mf-qa`** - LLM-powered Q&A with schema enforcement
5. **`mf-calc-simple`** - Deltas, growth, sums, averages
6. **`mf-doc-diff`** - Compare documents/sections
7. **`mf-valuation-basic-dcf`** - DCF with 3 scenarios

### Agent Runner

- **`src/agent.py`** - Main agent using Claude Agent SDK
- **`src/hooks.py`** - Security guardrails
- **`src/prompts/agent_system.py`** - System prompt

### FastAPI + Generative UI

- **`agent_service/app.py`** – FastAPI bridge exposing `/query` and `/healthz` for streaming chat + tool activity as NDJSON.
- **`agent_service/tools_cli.py`** – Wraps finance CLIs as in-process MCP tools so the SDK can call them with typed inputs.
- **`agent_service/hooks.py`** – Reuses CLI guardrails for API usage and normalizes tool payloads for the UI cards.
- **`frontend/`** – Next.js App Router UI powered by Vercel AI SDK; see `app/page.tsx` for the chat surface and `components/cards/` for generative tool visualizations.

---

## 🧪 Test Individual Tools

Each tool works standalone:

```bash
# Test calculations
echo '{"op":"delta","current":150,"previous":100}' | bin/mf-calc-simple

# Test QA (requires ANTHROPIC_API_KEY)
echo '{"instruction":"Say hello","inline_text":"Hello world"}' | bin/mf-qa

# Test market data (requires FMP_API_KEY)
echo '{"ticker":"AAPL","fields":["prices"],"range":"1y"}' | bin/mf-market-get
```

---

## 📊 Example Workflows

### Full Company Analysis

```bash
python src/agent.py
# Then ask: "Analyze NVDA: fetch 10-K, extract guidance, run DCF"
```

### YoY Comparison

```bash
# Ask: "Compare AAPL Risk Factors between 2024 and 2023 10-Ks"
```

---

## 🎯 Standard CLI Contract

All tools follow this pattern:

**Input (stdin JSON):**
```json
{
  "op": "operation",
  "...": "tool-specific fields"
}
```

**Output (stdout JSON):**
```json
{
  "ok": true,
  "result": {...},
  "paths": ["/workspace/..."],
  "provenance": [...],
  "metrics": {...},
  "format": "concise"
}
```

**Error:**
```json
{
  "ok": false,
  "error": "message",
  "hint": "suggestion"
}
```

---

## 📁 Workspace Structure

```
runtime/workspace/
  data/
    sec/<TICKER>/<DATE>/<FORM>/     # SEC filings
    market/<TICKER>/                # Market data
    url/                            # Downloaded files
  analysis/
    calculations/                   # Growth calcs
    diffs/                         # Doc comparisons
    tables/                        # DCF tables
  outputs/
    answers/                       # QA results
  logs/
    tool_uses.jsonl               # Audit log
```

---

## 🔧 Configuration

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...      # Required
FMP_API_KEY=your_key              # For mf-market-get
WORKSPACE_ABS_PATH=./runtime/workspace
QA_MODEL=claude-3-5-sonnet-latest
AGENT_MODEL=sonnet
MAX_TURNS=50
```

### API Keys

- **Anthropic:** https://console.anthropic.com
- **FMP:** https://financialmodelingprep.com/developer/docs/

---

## 🎓 Key Features

✅ **SEC EDGAR integration** - Auto-fetches filings with rate limiting  
✅ **Market data** - FMP API for prices/fundamentals/estimates  
✅ **LLM extraction** - Map-reduce chunking with schema enforcement  
✅ **Deterministic math** - YoY/QoQ growth, deltas, sums  
✅ **Document comparison** - Line/char diffs for filings  
✅ **DCF valuation** - 3 scenarios with sensitivity  
✅ **Provenance tracking** - Every output tracked to source  
✅ **Token-efficient** - Concise mode by default  

---

## 📚 Documentation

- Full tool guide: See TypeScript version's `TOOLS_GUIDE.md`
- SDK analysis: See `CLAUDE_SDK_ANALYSIS.md`
- All tools use same interface as JS version

---

## 🔄 Differences from TypeScript Version

### Same:
- ✅ All 7 CLI tools (identical interface)
- ✅ System prompt (same logic)
- ✅ Workspace structure
- ✅ Standard CLI contract
- ✅ Error handling

### Different:
- 🐍 Python instead of Node.js
- 🔄 `anyio` for async (instead of native async/await)
- 📦 `claude-agent-sdk` Python package
- 🚀 Single `agent.py` instead of separate TypeScript files

---

## 🛠️ Development

### Project Structure

```
claude_finance_py/
├── bin/                    # 7 executable tools
├── src/
│   ├── agent.py           # Main runner
│   ├── hooks.py           # Security hooks
│   ├── prompts/
│   │   └── agent_system.py
│   └── util/
│       └── workspace.py
├── runtime/workspace/     # Agent working dir
├── .env                   # Config
├── requirements.txt       # Dependencies
├── pyproject.toml        # Package config
└── README.md             # This file
```

### Adding New Tools

1. Create `bin/mf-your-tool` (Python script)
2. Make it executable: `chmod +x bin/mf-your-tool`
3. Follow standard CLI contract (JSON in/out)
4. Update `src/prompts/agent_system.py`

---

## ⚠️ Requirements

- Python 3.10+
- ANTHROPIC_API_KEY
- FMP_API_KEY (optional, for market data)

---

## 🚦 Status

✅ **All core tools implemented**  
✅ **Agent runner with Claude SDK**  
✅ **Security hooks**  
✅ **Documentation complete**  
🚀 **Ready to use!**

---

**Built with Claude Agent SDK for Python 🐍**
