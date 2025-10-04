# Workspace Redesign - Executive Summary

## Problem

The current workspace has **20+ directories**, many empty or redundant, making it **confusing and overwhelming** for users.

### Issues
- ❌ **8 empty directories** that serve no purpose
- ❌ **3 duplicate directories** for the same content
- ❌ **Nested workspace bug** (`runtime/workspace/runtime/workspace/`)
- ❌ **Binary cache files** visible to users
- ❌ **No clear organization** (raw data mixed with outputs)

## Solution

**Simplify to 3 clear directories:**

```
workspace/
├── raw/          # Automatic fetches (market data, filings)
├── artifacts/    # Intentional outputs (reports, charts, Q&A)
└── .cache/       # Hidden internals (SDK cache)
```

### Benefits
✅ **3x simpler** - From 20+ dirs to 3
✅ **Clear purpose** - Each directory has obvious meaning
✅ **No confusion** - Auto vs intentional is obvious
✅ **No clutter** - Empty dirs eliminated, cache hidden
✅ **Easy navigation** - Users find what they need instantly

## What Changes

### Directory Mapping

| Old Path | New Path | Tool |
|----------|----------|------|
| `data/market/AAPL/` | `raw/market/AAPL/` | mf-market-get, mf-estimates-get |
| `data/sec/` | `raw/filings/` | mf-documents-get |
| `analysis/charts/` | `artifacts/charts/` | mf-chart-data |
| `outputs/answers/` | `artifacts/answers/` | mf-qa |
| `reports/` | `artifacts/reports/` | mf-report-save |
| `data/url/` | `.cache/url/` | SDK internals |

### Eliminated Directories
- `analysis/calculations/` ❌ Empty
- `analysis/tables/` ❌ Empty
- `data/charts/` ❌ Empty  
- `data/comparisons/` ❌ Empty
- `data/extracted/` ❌ Empty
- `logs/` ❌ Empty
- `charts/` ❌ Duplicate
- `runtime/workspace/` ❌ Nested bug

## Implementation

### Files to Change (9 total)

**Python Files (7)**:
1. `src/util/workspace.py` - Update initial directory creation
2. `bin/mf-market-get` - Change `data/market` → `raw/market`
3. `bin/mf-estimates-get` - Change `data/market` → `raw/market`
4. `bin/mf-documents-get` - Change to write to `raw/filings`
5. `bin/mf-chart-data` - Change `analysis/charts` → `artifacts/charts`
6. `bin/mf-qa` - Change `outputs/answers` → `artifacts/answers`
7. `bin/mf-report-save` - Change `reports/` → `artifacts/reports/`

**Backend/Frontend (2)**:
1. `agent_service/app.py` - Hide `.cache/` directory
2. `src/prompts/agent_system.py` - Update workspace docs

### Migration Script

One command to move all existing files:
```bash
./migrate_workspace_structure.sh
```

### Testing

Test each tool writes to correct location:
- Market data → `raw/market/`
- Charts → `artifacts/charts/`
- Reports → `artifacts/reports/`
- Cache hidden from UI

## Impact

### Before
```
📁 workspace (20+ directories, confusing)
  ├── 📁 analysis
  │   ├── 📁 calculations ❌
  │   ├── 📁 charts ✓
  │   └── 📁 tables ❌
  ├── 📁 charts ❌ (duplicate)
  ├── 📁 data
  │   ├── 📁 charts ❌
  │   ├── 📁 comparisons ❌
  │   ├── 📁 extracted ❌
  │   ├── 📁 market ✓
  │   ├── 📁 sec ❌
  │   └── 📁 url ⚠️ (binary)
  ├── 📁 logs ❌
  ├── 📁 outputs
  │   └── 📁 answers ✓
  ├── 📁 reports ✓
  └── 📁 runtime ❌ (nested bug)
```

### After
```
📁 workspace (3 directories, crystal clear)
  ├── 📁 raw
  │   ├── 📁 market
  │   │   ├── 📁 AAPL
  │   │   └── 📁 MSFT
  │   └── 📁 filings
  │       └── 📁 AAPL
  ├── 📁 artifacts
  │   ├── 📁 reports
  │   ├── 📁 charts
  │   └── 📁 answers
  └── 📁 .cache (hidden)
```

## Time Estimate

- **Code updates**: 30 min
- **Migration**: 15 min
- **Testing**: 20 min
- **Docs**: 15 min
- **Total**: ~90 minutes

## Next Steps

1. ✅ Review design (complete)
2. ⏳ Implement code changes
3. ⏳ Run migration script
4. ⏳ Test all tools
5. ⏳ Update documentation

## Decision

Ready to proceed? This will make the workspace **dramatically clearer** for users while fixing existing bugs.

**Recommendation**: ✅ Proceed with implementation

