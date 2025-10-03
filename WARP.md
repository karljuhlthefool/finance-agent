# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Python 3.10+ CLI-first finance agent with typed domain models and a FastAPI bridge.
- Tooling is simple: venv + pip (requirements.txt). Optional dev tools via pytest/black/mypy.
- Two ways to run the agent: single-shot CLI and an interactive streaming CLI.

Common commands

Setup and install
```bash
# Create and activate venv
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install runtime deps
pip install -r requirements.txt

# Optional dev tools
pip install -U pytest black mypy
```

Environment
- Create a .env with at least ANTHROPIC_API_KEY; FMP_API_KEY enables market data.
- Key vars (see README for more): ANTHROPIC_API_KEY, FMP_API_KEY, WORKSPACE_ABS_PATH (default: ./runtime/workspace), AGENT_MODEL, MAX_TURNS.

Agent (run one-off vs interactive)
```bash
# Single-shot analysis (provide your prompt as a single argument)
python src/agent.py "Analyze NVDA: fetch 10-K, extract guidance, run DCF"

# Interactive streaming CLI (REPL powered by Claude SDK)
python src/agent_cli.py
```

Service (FastAPI streaming bridge for UI)
```bash
uvicorn agent_service.app:app --reload --port 5051
# POST /query with {"prompt": "..."} to stream NDJSON events
# GET /health and /healthz for health checks
```

CLI tools (JSON over stdin/stdout)
```bash
# Deterministic calc
echo '{"op":"delta","current":150,"previous":100}' | bin/mf-calc-simple

# Market data (requires FMP_API_KEY)
echo '{"ticker":"AAPL","fields":["prices"],"range":"1y"}' | bin/mf-market-get

# QA (requires ANTHROPIC_API_KEY)
echo '{"instruction":"Say hello","inline_text":"Hello world"}' | bin/mf-qa
```

Tests
```bash
# Full suite
pytest -q

# Single file
pytest -q tests/test_smoke.py

# Single test
pytest -q tests/test_smoke.py::test_imports
```

Formatting and type checks
```bash
# Format
black .

# Type-check (no strict project config; target main code and tests)
mypy src tests
```

High-level architecture and structure
- CLI tools (bin/): 7 executable utilities accept JSON on stdin and emit JSON on stdout with a standard contract (ok/result/paths/provenance/metrics). They write to a workspace rooted at WORKSPACE_ABS_PATH (default ./runtime/workspace).

- Domain and providers (src/domain, src/providers, src/datahub):
  - src/domain/models.py and types.py define strongly-typed financial entities (e.g., FundamentalsQuarterly, FilingRef, PriceSeries, Estimates).
  - src/providers/* implement external integrations (FMP, SEC, optional CapIQ).
  - src/datahub/hub.py exposes a DataHub facade that composes providers into typed domain results (fundamentals_quarterly, price_series, latest_filing, estimates, etc.). CLI tools and agents consume this facade.

- Agent runtime (src/agent.py and src/agent_cli.py):
  - src/agent.py performs single-shot analysis via claude_agent_sdk.query with a dynamically injected system prompt that includes absolute paths to bin/ and the workspace. It logs tool calls/results and estimates total token usage and cost.
  - src/agent_cli.py provides an interactive streaming REPL using ClaudeSDKClient, prompt_toolkit, and anyio. It renders a banner with allowed tools (Bash/Read/Write/Glob/Grep), lists available bin/mf-* CLIs, and streams partial assistant messages to the terminal UI.

- Prompts and hooks (src/prompts/agent_system.py, src/hooks.py):
  - The system prompt defines guardrails and directs the agent to call bin tools with full paths; hooks add security and report-saving behaviors.

- FastAPI bridge (agent_service/*):
  - agent_service/app.py exposes a streaming /query endpoint that converts Claude SDK messages (System/Assistant/User/Result) into NDJSON events suitable for a UI. CORS is enabled for local Next.js frontends; health endpoints are available.
  - agent_service/tools_cli.py wraps selected bin tools as typed in-process MCP tools via create_sdk_mcp_server so the SDK can call them directly.

- Workspace and persistence:
  - The runtime/workspace tree holds fetched data (SEC/market), computed analyses (tables/diffs), logs, and saved answers. Most tools/flows read and write here; the path is surfaced in prompts and service startup.

Notes specific to Warp agents
- When invoking shell commands to call bin tools, prefer absolute paths from the project root and ensure WORKSPACE_ABS_PATH is set (the agent code also sets/injects this at runtime).
- For reading/writing files during analysis, use the workspace root rather than scattering files across the repo.

Sources reviewed
- README.md (install, env, CLI tools, workspace structure)
- pyproject.toml (runtime deps; dev tools: pytest, black, mypy)
- src/agent.py, src/agent_cli.py, src/datahub/hub.py
- agent_service/app.py, agent_service/tools_cli.py
- tests/test_smoke.py
