# Workspace Filesystem - Complete Analysis

## Current Structure Problems

### Directory Tree (Actual)
```
runtime/workspace/
├── analysis/
│   ├── calculations/          [EMPTY - never used]
│   ├── charts/                [mf-chart-data writes here]
│   └── tables/                [EMPTY - never used]
├── charts/                    [DUPLICATE - redundant with analysis/charts]
├── data/
│   ├── charts/                [DUPLICATE - never used]
│   ├── comparisons/           [EMPTY - never used]
│   ├── extracted/             [EMPTY - never used]
│   ├── market/
│   │   ├── AAPL/             [mf-market-get, mf-estimates-get write here]
│   │   ├── GOOGL/
│   │   ├── META/
│   │   ├── MSFT/
│   │   ├── NVDA/
│   │   └── TSLA/
│   ├── sec/                   [mf-documents-get SHOULD write here, but doesn't]
│   └── url/                   [Internal SDK cache - binary files]
├── logs/                      [Created by ensure_workspace, never used]
├── outputs/
│   └── answers/               [mf-qa writes here]
├── reports/
│   ├── analysis/              [mf-report-save writes here]
│   ├── summaries/             [mf-report-save CAN write here]
│   ├── recommendations/       [mf-report-save CAN write here]
│   ├── comparisons/           [mf-report-save CAN write here]
│   └── valuations/            [mf-report-save CAN write here]
├── runtime/                   [NESTED WORKSPACE - BUG!]
│   └── workspace/            [Should NOT exist]
├── big_tech_comparison.json   [Loose file at root]
├── claude_agent_sdk_report.json [SDK internal file]
└── important-instruction-reminders.txt [Loose file at root]
```

### Key Problems

1. **Redundant/Empty Directories**
   - `analysis/calculations/` - Never used
   - `analysis/tables/` - Never used
   - `data/charts/` - Never used (charts go in analysis/charts)
   - `data/comparisons/` - Never used
   - `data/extracted/` - Never used (extractions don't get saved)
   - `logs/` - Created but never written to
   - `charts/` - Duplicate of analysis/charts

2. **Nested Workspace Bug**
   - `runtime/workspace/runtime/workspace/` exists
   - Caused by relative path resolution issues (documented in WORKSPACE_DUPLICATION_FIX.md)

3. **Confusing Organization**
   - Charts in `analysis/charts/` but market data in `data/market/`
   - Reports in `reports/` but QA answers in `outputs/answers/`
   - No clear distinction between raw data vs processed outputs

4. **Binary/Internal Files**
   - `data/url/` contains base64-encoded filenames and `.bin` files
   - `claude_agent_sdk_report.json` is SDK internal metadata
   - These shouldn't be visible to users

5. **Loose Root Files**
   - Files like `big_tech_comparison.json` saved at root level
   - No consistent organization

## Tool → Directory Mapping

### Tools That Write to Workspace

| Tool | Writes To | Purpose | Auto/Manual |
|------|-----------|---------|-------------|
| `mf-market-get` | `data/market/{TICKER}/` | Raw market data (quotes, fundamentals, ratios) | Automatic |
| `mf-estimates-get` | `data/market/{TICKER}/` | Analyst estimates | Automatic |
| `mf-documents-get` | `data/sec/{TICKER}/` (intended) | SEC filings | Automatic |
| `mf-chart-data` | `analysis/charts/` | Chart configurations | Automatic |
| `mf-qa` | `outputs/answers/` | LLM Q&A results | Manual (intentional) |
| `mf-report-save` | `reports/{type}/` | Final reports & summaries | Manual (intentional) |
| `mf-valuation-basic-dcf` | *(returns data, doesn't save)* | DCF calculations | N/A |
| `mf-calc-simple` | *(returns data, doesn't save)* | Simple calculations | N/A |
| `mf-filing-extract` | *(returns data, doesn't save)* | Filing sections | N/A |
| `mf-extract-json` | *(returns data, doesn't save)* | JSON extraction | N/A |
| SDK internals | `data/url/` | Document cache | Automatic (hidden) |

### Directories Created by `ensure_workspace()`

```python
# src/util/workspace.py
dirs = [
    root,                  # runtime/workspace
    root / "data",        # For raw inputs
    root / "analysis",    # For processed outputs
    root / "outputs",     # For intentional saves
    root / "logs",        # Never actually used
]
```

## User Needs Analysis

### What Users Actually Want

1. **Access Raw Data** - Market data, filings, estimates fetched during conversation
2. **Access Reports** - Final outputs, summaries, analyses saved intentionally
3. **Access Charts** - Chart configurations for visualization
4. **Access Q&A Results** - Answers to specific questions

### What Users Don't Need to See

1. Internal SDK cache files (`data/url/`, `.bin` files)
2. SDK metadata (`claude_agent_sdk_report.json`)
3. Empty placeholder directories
4. Nested workspace bugs

## Proposed New Structure

### Simple, Clear Organization

```
workspace/
├── raw/                    # All automatic fetches (read-only for user)
│   ├── market/
│   │   ├── AAPL/
│   │   ├── MSFT/
│   │   └── ...
│   └── filings/
│       ├── AAPL/
│       │   └── 10-K_2024-Q4/
│       └── ...
├── artifacts/              # Intentional saves (user-facing outputs)
│   ├── reports/
│   │   ├── analysis/
│   │   ├── valuations/
│   │   └── summaries/
│   ├── charts/
│   └── answers/            # Q&A results
└── .cache/                 # Hidden from UI (SDK internals)
    └── url/
```

### Benefits

1. **Clear Separation**: `raw/` = automatic, `artifacts/` = intentional
2. **No Empty Dirs**: Only create directories when files are written
3. **No Confusion**: One place for each type of data
4. **Hidden Internals**: `.cache/` prefix hides SDK files from UI
5. **Flat & Scannable**: Max 3 levels deep

## Required Code Changes

### 1. Update `ensure_workspace()` 

**File**: `src/util/workspace.py`

```python
def ensure_workspace(root: Path) -> None:
    """Create workspace directory structure."""
    dirs = [
        root,
        root / "raw",
        root / "artifacts",
        root / ".cache",  # Hidden from UI
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
```

### 2. Update All CLI Tools

**Pattern**: Replace `WORKSPACE / "data" / "market"` with `WORKSPACE / "raw" / "market"`

**Files to Update**:
- `bin/mf-market-get` - Line 178: `market_dir = WORKSPACE / "raw" / "market" / ticker`
- `bin/mf-estimates-get` - Line 47: `out_dir = WORKSPACE / "raw" / "market" / ticker`
- `bin/mf-documents-get` - Update to write to `WORKSPACE / "raw" / "filings" / ticker`
- `bin/mf-chart-data` - Line 100: `output_dir = WORKSPACE / "artifacts" / "charts"`
- `bin/mf-qa` - Line 153: `output_dir = WORKSPACE / "artifacts" / "answers"`
- `bin/mf-report-save` - Lines 36-42: Update `type_dirs` to use `artifacts/reports/`

### 3. Update Backend Filtering

**File**: `agent_service/app.py` - `_scan_workspace_tree()`

Add filter to hide `.cache/` directory:

```python
# Hide internal cache directory
if relative_path.startswith('.cache'):
    continue
```

### 4. Update System Prompt

**File**: `src/prompts/agent_system.py`

Update workspace structure documentation:

```
Runtime workspace structure:
  workspace/
    ├── raw/              # Auto-fetched data (market, filings)
    ├── artifacts/        # Your saved outputs (reports, charts, answers)
    └── .cache/           # (hidden)
```

### 5. Migration Script

Create one-time migration to move existing files:

```bash
#!/bin/bash
# migrate_workspace.sh

cd runtime/workspace

# Move market data
mkdir -p raw/market
mv data/market/* raw/market/ 2>/dev/null

# Move filings (if any)
mkdir -p raw/filings
mv data/sec/* raw/filings/ 2>/dev/null

# Move artifacts
mkdir -p artifacts/charts
mkdir -p artifacts/answers
mkdir -p artifacts/reports
mv analysis/charts/* artifacts/charts/ 2>/dev/null
mv outputs/answers/* artifacts/answers/ 2>/dev/null
mv reports/* artifacts/reports/ 2>/dev/null

# Move SDK cache
mkdir -p .cache
mv data/url .cache/ 2>/dev/null

# Clean up old structure
rm -rf data/ analysis/ outputs/ reports/ charts/ logs/
rm -rf runtime/  # Remove nested workspace bug
rm -f claude_agent_sdk_report.json  # Remove SDK internal file

echo "✅ Workspace migrated to new structure"
```

## Summary

**Current**: 20+ directories, many empty, confusing organization
**Proposed**: 3 top-level dirs, clear purpose, no empty dirs

**Changes Required**:
- 1 file: `src/util/workspace.py`
- 6 files: `bin/mf-*` tools
- 1 file: `agent_service/app.py`
- 1 file: `src/prompts/agent_system.py`
- 1 script: migration

**Impact**: Dramatically simpler, clearer workspace that users can actually understand and navigate.

