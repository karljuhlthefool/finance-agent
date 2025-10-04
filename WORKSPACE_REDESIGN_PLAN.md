# Workspace Redesign - Implementation Plan

## Overview

Redesign workspace from confusing 20+ directory structure to simple 3-directory organization:
- `raw/` - Automatic data fetches (market data, filings)
- `artifacts/` - Intentional user outputs (reports, charts, Q&A)
- `.cache/` - Hidden SDK internals

## Current vs Proposed

### Before
```
workspace/
├── analysis/calculations/  ❌ Empty
├── analysis/charts/        ✓ Used
├── analysis/tables/        ❌ Empty
├── charts/                 ❌ Duplicate
├── data/charts/            ❌ Empty
├── data/comparisons/       ❌ Empty
├── data/extracted/         ❌ Empty
├── data/market/AAPL/      ✓ Used
├── data/sec/               ❌ Empty
├── data/url/               ⚠️ SDK cache (binary)
├── logs/                   ❌ Empty
├── outputs/answers/        ✓ Used
├── reports/analysis/       ✓ Used
└── runtime/workspace/      ❌ Nested bug
```

### After
```
workspace/
├── raw/
│   ├── market/AAPL/       ✓ Market data
│   └── filings/AAPL/      ✓ SEC filings
├── artifacts/
│   ├── reports/           ✓ User reports
│   ├── charts/            ✓ Chart configs
│   └── answers/           ✓ Q&A results
└── .cache/                ✓ Hidden from UI
    └── url/               ✓ SDK internals
```

## Step-by-Step Implementation

### Phase 1: Code Updates (No File Moves Yet)

#### 1.1 Update `src/util/workspace.py`

**Before**:
```python
def ensure_workspace(root: Path) -> None:
    """Create workspace directory structure."""
    dirs = [
        root,
        root / "data",
        root / "analysis",
        root / "outputs",
        root / "logs",
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
```

**After**:
```python
def ensure_workspace(root: Path) -> None:
    """Create workspace directory structure.
    
    Structure:
      workspace/
        ├── raw/          # Automatic data fetches
        ├── artifacts/    # Intentional user outputs
        └── .cache/       # Hidden SDK internals
    """
    dirs = [
        root,
        root / "raw",
        root / "artifacts",
        root / ".cache",
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
```

#### 1.2 Update `bin/mf-market-get`

**Line 178-179**:
```python
# Before
market_dir = WORKSPACE / "data" / "market" / ticker
market_dir.mkdir(parents=True, exist_ok=True)

# After
market_dir = WORKSPACE / "raw" / "market" / ticker
market_dir.mkdir(parents=True, exist_ok=True)
```

#### 1.3 Update `bin/mf-estimates-get`

**Line 47-48**:
```python
# Before
out_dir = WORKSPACE / "data" / "market" / ticker
out_dir.mkdir(parents=True, exist_ok=True)

# After  
out_dir = WORKSPACE / "raw" / "market" / ticker
out_dir.mkdir(parents=True, exist_ok=True)
```

#### 1.4 Update `bin/mf-documents-get`

**Currently saves to**: Not clear (needs investigation)

**Change to**:
```python
filing_dir = WORKSPACE / "raw" / "filings" / ticker / f"{form_type}_{filing_date}"
filing_dir.mkdir(parents=True, exist_ok=True)
```

#### 1.5 Update `bin/mf-chart-data`

**Line 100-101**:
```python
# Before
output_dir = WORKSPACE / "analysis" / "charts"
output_dir.mkdir(parents=True, exist_ok=True)

# After
output_dir = WORKSPACE / "artifacts" / "charts"
output_dir.mkdir(parents=True, exist_ok=True)
```

#### 1.6 Update `bin/mf-qa`

**Line 153-154**:
```python
# Before
output_dir = WORKSPACE / "outputs" / "answers"
output_dir.mkdir(parents=True, exist_ok=True)

# After
output_dir = WORKSPACE / "artifacts" / "answers"
output_dir.mkdir(parents=True, exist_ok=True)
```

#### 1.7 Update `bin/mf-report-save`

**Lines 34-44**:
```python
# Before
type_dirs = {
    'analysis': 'reports/analysis',
    'summary': 'reports/summaries',
    'recommendation': 'reports/recommendations',
    'comparison': 'reports/comparisons',
    'valuation': 'reports/valuations',
    'custom': 'reports/custom'
}

# After
type_dirs = {
    'analysis': 'artifacts/reports/analysis',
    'summary': 'artifacts/reports/summaries',
    'recommendation': 'artifacts/reports/recommendations',
    'comparison': 'artifacts/reports/comparisons',
    'valuation': 'artifacts/reports/valuations',
    'custom': 'artifacts/reports/custom'
}
```

### Phase 2: Backend/UI Updates

#### 2.1 Update `agent_service/app.py`

**In `_scan_workspace_tree()` function, add**:

```python
# Hide internal cache directory
if relative_path.startswith('.cache'):
    continue

# Hide old empty directories (during transition)
if relative_path in ['data', 'analysis', 'outputs', 'reports', 'logs', 'charts']:
    continue
```

#### 2.2 Update `src/prompts/agent_system.py`

**Find the "Operating Environment" section and update**:

```markdown
Operating Environment
• You run on a real filesystem. The working directory (CWD) is:
• {{injected at runtime}} (e.g., /absolute/path/to/runtime/workspace)
• CLI tools live at:
• {{PROJECT_ROOT}}/bin/ (absolute path is injected at runtime)

Workspace structure:
  workspace/
    ├── raw/          # Auto-fetched data (market quotes, filings)
    ├── artifacts/    # Your intentional saves (reports, charts, Q&A answers)
    └── .cache/       # (internal - hidden from you)

When referencing files in your responses, use SHORT paths from workspace root:
  ✓ "raw/market/AAPL/quote.json"
  ✓ "artifacts/reports/analysis/tesla_analysis.md"
  ✗ "/runtime/workspace/raw/market/AAPL/quote.json"  (too verbose)
```

### Phase 3: Migration

#### 3.1 Create Migration Script

**File**: `migrate_workspace_structure.sh`

```bash
#!/bin/bash
set -e

WORKSPACE="/Users/karl/work/claude_finance_py/runtime/workspace"
cd "$WORKSPACE"

echo "🔄 Migrating workspace to new structure..."

# Create new structure
mkdir -p raw/market
mkdir -p raw/filings  
mkdir -p artifacts/reports
mkdir -p artifacts/charts
mkdir -p artifacts/answers
mkdir -p .cache

# Move market data
echo "  📊 Moving market data..."
if [ -d "data/market" ]; then
    cp -r data/market/* raw/market/ 2>/dev/null || true
fi

# Move SEC filings
echo "  📄 Moving filings..."
if [ -d "data/sec" ]; then
    cp -r data/sec/* raw/filings/ 2>/dev/null || true
fi

# Move charts
echo "  📈 Moving charts..."
if [ -d "analysis/charts" ]; then
    cp -r analysis/charts/* artifacts/charts/ 2>/dev/null || true
fi

# Move Q&A answers
echo "  💬 Moving Q&A answers..."
if [ -d "outputs/answers" ]; then
    cp -r outputs/answers/* artifacts/answers/ 2>/dev/null || true
fi

# Move reports
echo "  📋 Moving reports..."
if [ -d "reports" ]; then
    cp -r reports/* artifacts/reports/ 2>/dev/null || true
fi

# Move SDK cache
echo "  🗄️  Moving cache..."
if [ -d "data/url" ]; then
    mv data/url .cache/ 2>/dev/null || true
fi

# Clean up old structure (CAREFUL!)
echo "  🧹 Cleaning up old directories..."
rm -rf data/
rm -rf analysis/
rm -rf outputs/
rm -rf reports/
rm -rf charts/
rm -rf logs/
rm -rf runtime/  # Remove nested workspace bug

# Remove SDK internal files
rm -f claude_agent_sdk_report.json

# Move loose files to artifacts
echo "  📦 Moving loose root files..."
for file in *.json *.txt; do
    if [ -f "$file" ]; then
        mkdir -p artifacts/misc
        mv "$file" artifacts/misc/ 2>/dev/null || true
    fi
done

echo ""
echo "✅ Migration complete!"
echo ""
echo "New structure:"
tree -L 3 -I '.cache'

echo ""
echo "🎯 Next steps:"
echo "1. Restart services: ./STOP_SERVICES.sh && ./START_SERVICES.sh"
echo "2. Test with: 'Get quote for AAPL'"
echo "3. Verify file appears in: raw/market/AAPL/quote.json"
```

#### 3.2 Run Migration

```bash
chmod +x migrate_workspace_structure.sh
./migrate_workspace_structure.sh
```

### Phase 4: Testing

#### 4.1 Test Each Tool

1. **mf-market-get**: `echo '{"ticker":"AAPL","fields":["quote"]}' | ./bin/mf-market-get`
   - Verify: File in `raw/market/AAPL/quote.json`

2. **mf-chart-data**: Create chart
   - Verify: File in `artifacts/charts/chart_*.json`

3. **mf-qa**: Ask question
   - Verify: File in `artifacts/answers/answer_*.md`

4. **mf-report-save**: Save report
   - Verify: File in `artifacts/reports/analysis/*.md`

#### 4.2 Test UI Workspace Viewer

1. Open `http://localhost:3031`
2. Click workspace icon
3. Verify structure shows:
   ```
   📁 raw
     📁 market
   📁 artifacts
     📁 reports
     📁 charts
   ```
4. Verify `.cache` is hidden

### Phase 5: Cleanup & Documentation

#### 5.1 Update README.md

Add workspace structure section:

```markdown
## Workspace Structure

The agent organizes files in a simple 3-directory structure:

- **`raw/`** - Automatic data fetches (market data, SEC filings)
  - Updated every time you query for fresh data
  - Read-only reference data

- **`artifacts/`** - Your intentional outputs
  - `reports/` - Analysis reports, summaries, recommendations
  - `charts/` - Chart configurations
  - `answers/` - Q&A results

- **`.cache/`** - Internal (hidden from UI)
  - SDK document cache and internals
```

#### 5.2 Delete Old Documentation

Remove or archive:
- `WORKSPACE_DUPLICATION_FIX.md` (obsolete)
- `WORKSPACE_PATH_FIX_COMPLETE.md` (obsolete)
- `WORKSPACE_FIXES_SUMMARY.md` (obsolete)

## Rollback Plan

If issues arise:

```bash
cd runtime/workspace
# Restore from backup (if created)
cp -r ../workspace_backup/* .

# Or manually revert by updating tool paths back to old structure
```

## Success Criteria

✅ Workspace has 3 clear top-level directories
✅ No empty directories
✅ No nested `runtime/workspace/runtime/` bug
✅ All tools write to correct locations
✅ UI hides `.cache/` directory
✅ All existing files migrated successfully
✅ Documentation updated

## Estimated Time

- Code updates: 30 minutes
- Migration script: 15 minutes  
- Testing: 20 minutes
- Documentation: 15 minutes
- **Total: ~90 minutes**

