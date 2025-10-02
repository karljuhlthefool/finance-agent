# Claude Finance Python Project Structure

This document summarizes the layout and key components of the Claude Finance Python agent. Use it to understand how the project is organized, where core logic lives, and how each CLI tool participates in workflows driven by the Claude Agent SDK.

## Top-Level Overview

- **Goal**: Provide a CLI-first financial analysis assistant that orchestrates purpose-built tools for filings, market data, analytics, and reporting through the Claude Agent SDK runtime. The main runner lives in [`src/agent.py`](src/agent.py) and is wrapped by the convenience script [`./agent`](agent). A FastAPI streaming surface in [`agent_service/`](agent_service) exposes the agent for UI clients, while [`frontend/`](frontend) hosts the generative React interface.
- **Runtime workspace**: Tools write outputs under `runtime/workspace/` (configurable via `WORKSPACE_ABS_PATH`). The workspace tree is created at startup by [`ensure_workspace`](src/util/workspace.py) and contains `data/`, `analysis/`, `outputs/`, and `logs/` directories for persistent artifacts.
- **CLI contract**: Every executable in `bin/` reads JSON from `stdin` and emits a one-line JSON response containing `ok`, `result`, `paths`, `provenance`, `metrics`, and `format`, as described in the README’s “Standard CLI Contract”.

## Execution Flow

1. **Entry point** – Running `./agent "<query>"` activates the virtual environment and calls `python src/agent.py`. The runner bootstraps environment variables (`dotenv`), resolves the workspace, injects guard hooks, and prints the configured tool roots.
2. **Claude Agent SDK loop** – [`src/agent.py`](src/agent.py) builds a `ClaudeAgentOptions` object with the injected system prompt (`src/prompts/agent_system.py`), allowed SDK tools (`Bash`, `Read`, `Write`, `Glob`, `Grep`), and the maximum number of turns. It streams assistant/tool messages via `claude_agent_sdk.query`, rendering real-time logs and tracking token usage in `UsageTracker`.
3. **Hooks and reporting** – [`AgentHooks`](src/hooks.py) enforces guardrails before tool execution (blocking dangerous shell commands and non-workspace writes), logs every tool invocation, and optionally persists the final assistant message through the `mf-report-save` CLI.

## Source Modules (`src/`)

| Module | Purpose |
| --- | --- |
| `agent.py` | Interactive SDK runner that manages conversation flow, telemetry, and report persistence. |
| `hooks.py` | Guard hooks for pre/post tool use, audit logging, and automatic report saving. |
| `prompts/agent_system.py` | System prompt describing the workspace, tool catalog, and operating rules used by the SDK agent. |
| `util/workspace.py` | Ensures the workspace directory tree exists before tool execution. |
| `util/filings_processor.py` | Filing text cleaning, section extraction, keyword/regex context search, and AI/R&D content helpers reused by SEC tooling. |
| `datahub/hub.py` | High-level façade that composes all data providers and returns strongly-typed domain objects for fundamentals, prices, filings, estimates, and company info. |
| `domain/models.py` & `domain/types.py` | Pydantic models and shared type aliases (tickers, ISO dates, money) that normalize data exchanged between providers and tools. |
| `providers/` | Typed API clients for FMP (`fmp/client.py`), SEC EDGAR (`sec/client.py`), and S&P Capital IQ (`capiq/client.py`) that power the DataHub façade. |

## CLI Tools (`bin/`)

Each CLI is a standalone executable that the agent (or a user) can invoke directly. They share the same workspace and provenance conventions.

| Script | Description |
| --- | --- |
| `mf-market-get` | Fetches fundamentals and/or price history through the DataHub FMP provider, saves JSON files under `data/market/<TICKER>/`, and emits provenance plus metadata about fetched bytes. |
| `mf-estimates-get` | Requests analyst consensus estimates from CapIQ via DataHub, persists them to `data/market/<TICKER>/estimates_<metric>.json`. |
| `mf-documents-get` | Downloads the latest SEC filing (10-K/10-Q/8-K/20-F/40-F), stores clean text, raw text, exhibits index, and metadata under `data/sec/<TICKER>/<DATE>/<form>/`. |
| `mf-filing-extract` | Works on previously-downloaded filings to extract Item sections, keyword windows, or regex matches (no LLM cost), writing outputs into `sections/` or `searches/`. |
| `mf-doc-diff` | Produces line/character diffs between two documents or sections and saves JSON summaries in `analysis/diffs/`. |
| `mf-extract-json` | Performs JSON field extraction using jq-style paths or (optionally) Anthropic Haiku for free-form instructions. |
| `mf-json-inspect` | Explores JSON schema, array shapes, and suggests access paths before extraction. |
| `mf-calc-simple` | Deterministic deltas, growth series, sums, and averages with optional persistence to `analysis/calculations/`. |
| `mf-valuation-basic-dcf` | Generates base/bull/bear discounted cash-flow scenarios, optionally deriving FCF projections from fundamentals, and saves valuation tables to `analysis/tables/`. |
| `mf-qa` | Chunked LLM analysis pipeline (Haiku/Sonnet) that processes large documents without polluting the main agent context and stores responses in `outputs/answers/`. |
| `mf-report-save` | Persists markdown reports with accompanying JSON metadata under `runtime/workspace/reports/<type>/`. |

Additional helper CLIs present in the repository (`mf-documents-get`, `mf-market-get`, etc.) all comply with the shared contract, enabling the SDK agent to chain them safely.

## Agent Service (`agent_service/`)

- **`app.py`** – FastAPI application that exposes `/query` for NDJSON streaming of assistant messages, tool invocations, and normalized results, plus `/healthz` for readiness checks.
- **`tools_cli.py`** – In-process SDK MCP server that wraps the finance CLIs (`mf-calc-simple`, `mf-market-get`, `mf-report-save`) so the agent can invoke them as native tools.
- **`hooks.py`** – Reuses [`AgentHooks`](src/hooks.py) to enforce pre/post tool guardrails for the API surface and normalize outputs for the UI.
- **`settings.py`** – Builds `ClaudeAgentOptions` with workspace defaults, allowed tools, registered MCP server, and hook configuration consumed by both CLI and FastAPI flows.

Run locally via `uvicorn agent_service.app:app --reload --port 5051` (ensure your Python environment includes the dependencies from `pyproject.toml`).

## Frontend (`frontend/`)

- **Stack** – Next.js App Router + TypeScript + Vercel AI SDK for streaming chats and generative UI cards.
- **`app/api/chat/route.ts`** – Server route that proxies chat requests to the Python agent (`/query`) and registers AI SDK tools (`runCalcSimple`, `fetchMarket`) so Anthropic can request CLI invocations.
- **`app/page.tsx`** – Chat experience backed by `useChat` in `streamMode: 'stream-data'`, rendering assistant text, tool lifecycle chips, and specialized cards for CLI results.
- **`components/cards/`** – Generative UI cards (`ReportCard`, `LogsCard`, `GenericToolCard`) that parse the normalized `{ok,data,error}` envelopes emitted by the backend.
- **Configuration** – `package.json`, `tsconfig.json`, `next.config.mjs`, and `app/globals.css` define tooling, build targets, and styling. Set `AGENT_URL`/`ANTHROPIC_MODEL` env vars for dev/prod.

Run with `npm install` then `npm run dev` (or `pnpm dev`) from `frontend/`, ensuring the FastAPI agent is reachable at the configured `AGENT_URL`.

## DataHub and Provider Layer

- **FMP provider** – Wraps Financial Modeling Prep endpoints for quarterly financial statements and historical prices, merging income, balance, and cash flow rows into typed `FundamentalsQuarterly` objects. It also converts price rows into `PriceSeries` instances.
- **SEC provider** – Handles CIK lookups, filing downloads, exhibit enumeration, clean-text extraction, and section/keyword/regex helpers using `filings_processor`. Results are encapsulated in `FilingRef` models with provenance metadata and local file paths.
- **CapIQ provider** – Authenticates against S&P Global APIs, constructs bulk GDS requests, parses responses into `CapIQDataPoint` objects, and powers higher-level utilities for estimates, past metrics, and company descriptions.
- **DataHub façade** – Exposes convenience methods (`fundamentals_quarterly`, `price_series`, `latest_filing`, `extract_filing_sections`, `search_filing_keywords`, `search_filing_regex`, `estimates`, `company_info`) that each return validated domain models or structured dictionaries ready for the CLIs.

## Tests

- `tests/test_smoke.py` provides import and instantiation smoke checks (skipping networked calls when API keys are absent).
- Additional unit tests (`test_datahub_fmp.py`, `test_datahub_sec.py`, `test_datahub_capiq.py`, `test_mappers.py`) focus on provider-to-domain transformations and helper utilities.

## Configuration & Dependencies

- `.env` (from `.env.example`) should hold API keys: `ANTHROPIC_API_KEY` (required), `FMP_API_KEY`, optional CapIQ credentials (`CIQ_LOGIN`/`CIQ_PASSWORD`), and runtime knobs like `WORKSPACE_ABS_PATH`, `QA_MODEL`, and `MAX_TURNS`.
- Python dependencies are defined in `requirements.txt` and `pyproject.toml`, with optional dev tooling (`pytest`, `black`, `mypy`).
- Shell wrapper `agent` activates the virtual environment and launches `src/agent.py` with forwarded arguments.

## Working With the Project

1. **Install dependencies** via `python -m venv venv` and `pip install -r requirements.txt` (or `pip install .[dev]` for tooling).
2. **Configure environment** by copying `.env.example` → `.env` and populating required API keys.
3. **Run the agent** with `python src/agent.py "Analyze NVDA"` (or use the `./agent` wrapper) to enter the Claude Agent SDK loop.
4. **Invoke tools directly** by piping JSON to any script in `bin/` for targeted tasks (e.g., market data fetches, DCF valuation, filing extraction).
5. **Persist outputs** with `mf-report-save` or rely on automatic saving from `AgentHooks` when the final message exceeds the configured length threshold.

Keep this document updated as new tools, providers, or directories are added to maintain an accurate mental model for engineers onboarding to the project.
