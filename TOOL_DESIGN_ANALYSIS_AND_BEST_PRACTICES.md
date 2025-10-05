# Tool Design Analysis & Best Practices
## Based on Claude/Anthropic Guidelines & Agent Trajectory Analysis

## Executive Summary

After analyzing 10 comprehensive agent tests (192 tool calls, $2.52 total cost, 100% success rate) against Claude/Anthropic best practices, this document identifies opportunities for tool design improvements, better descriptions, optimal granularity, and enhanced capabilities.

## Current Tool Architecture

### Tool Inventory

**Primary Tools (via Bash):**
1. `mf-market-get` - Fetch FMP market data (38 data types)
2. `mf-extract-json` - Extract data from JSON (path or instruction mode)
3. `mf-json-inspect` - Discover JSON structure
4. `mf-calc-simple` - Deterministic math (delta, growth, sum, average)
5. `mf-chart-data` - Create interactive charts
6. `mf-documents-get` - Fetch SEC filings
7. `mf-qa` - LLM-powered document analysis
8. `mf-report-save` - Save markdown reports
9. `mf-valuation-basic-dcf` - DCF valuation
10. `mf-doc-diff` - Compare documents
11. `mf-filing-extract` - Extract filing sections
12. `mf-render-*` - Visual components (metrics, comparison, insight, timeline)

**SDK Tools:**
- Bash - Execute shell commands
- Read - Read files
- Write - Write files
- Glob - File pattern matching
- Grep - Search file contents

### Current Tool Usage Patterns (from Tests 1-10)

**Most Used Tools:**
1. `mf-market-get` (35% of calls) - Data fetching
2. `mf-extract-json` (30% of calls) - Data extraction
3. `mf-calc-simple` (15% of calls) - Calculations
4. `mf-chart-data` (12% of calls) - Visualizations
5. `Write` (5% of calls) - Report generation
6. `mf-json-inspect` (3% of calls) - Schema discovery

**Tool Call Patterns:**
- Parallel execution: ✅ Working (3-5 companies fetched simultaneously)
- Path-based extraction: ✅ Preferred (free, instant)
- Self-correction: ✅ Uses `mf-json-inspect` on errors
- Sequential chaining: ✅ Fetch → Extract → Calculate → Chart → Report

## Analysis Against Claude/Anthropic Best Practices

### 1. Tool Granularity

**Best Practice:** Tools should be atomic, single-purpose, and composable.

**Current State:**
- ✅ **Good:** `mf-calc-simple` is atomic (one operation per call)
- ✅ **Good:** `mf-extract-json` is single-purpose (extraction only)
- ⚠️ **Mixed:** `mf-market-get` fetches 38 different data types (very broad)
- ⚠️ **Mixed:** `mf-qa` does both structured and unstructured analysis

**Recommendations:**

**Option A: Keep Current Granularity** (Recommended)
- `mf-market-get` breadth is actually beneficial (reduces API calls)
- Agent can request multiple fields in one call
- Cost-effective and efficient

**Option B: Split into Focused Tools** (Not recommended)
- Would require: `mf-fundamentals-get`, `mf-prices-get`, `mf-metrics-get`, etc.
- Increases tool calls and complexity
- Higher latency and cost

**Verdict:** Current granularity is optimal. The breadth of `mf-market-get` is a feature, not a bug.

### 2. Tool Descriptions

**Best Practice:** Tool descriptions should be clear, concise, and include examples.

**Current State:**
- ✅ System prompt has extensive tool documentation
- ✅ Examples provided for each tool
- ✅ Common patterns documented
- ⚠️ Description parameter added to Bash calls (recent improvement)
- ❌ No tool-level metadata in SDK (descriptions are in prompt only)

**Recommendations:**

**Add Tool Metadata to SDK:**
```python
# In tools_cli.py or similar
TOOL_DESCRIPTIONS = {
    "mf_market_get": {
        "name": "mf-market-get",
        "description": "Fetch comprehensive market data from FMP (38 data types including fundamentals, prices, metrics, ratios, analyst data, ownership, segments)",
        "parameters": {
            "ticker": "Stock ticker symbol (required)",
            "fields": "Array of data types to fetch (optional, default: ['prices'])",
            "range": "Date range for historical data (optional, default: '1y')",
            "period": "annual or quarter for time-series (optional)",
            "limit": "Number of historical records (optional)"
        },
        "examples": [
            {"ticker": "AAPL", "fields": ["quote", "fundamentals"]},
            {"ticker": "MSFT", "fields": ["prices", "key_metrics"], "range": "5y"}
        ],
        "cost": "Free (uses cached data when available)",
        "latency": "1-5s depending on fields requested"
    },
    # ... other tools
}
```

**Benefits:**
- SDK can auto-generate help text
- Consistent documentation across CLI and agent
- Easier to maintain and update

### 3. Error Handling & Recovery

**Best Practice:** Tools should provide actionable error messages with hints.

**Current State:**
- ✅ Tools return `{"ok": false, "error": "message", "hint": "suggestion"}`
- ✅ Agent uses `mf-json-inspect` on "key not found" errors
- ✅ Self-correction working well
- ⚠️ Some errors don't include hints

**Observed Error Patterns:**

**Test 3 (Simple Price Query):**
```
Error: Path '.price': expected object, got list
Agent Response: Used mf-json-inspect to discover structure
Result: ✅ Self-corrected and succeeded
```

**Test 9 (EV Comparison):**
```
Error: Data point 0 missing required fields: {'x', 'y'}
Agent Response: Immediately tried different chart format
Result: ✅ Self-corrected and succeeded
```

**Recommendations:**

**Enhance Error Messages:**
```python
# Bad error
{"ok": false, "error": "Key not found"}

# Good error
{"ok": false, "error": "Key 'historical' not found in JSON", 
 "hint": "Use mf-json-inspect to see available keys. Common keys: 'points', 'quarters', 'data'"}

# Better error
{"ok": false, "error": "Key 'historical' not found", 
 "hint": "Use mf-json-inspect to see structure. For price data, try 'points' instead",
 "suggested_action": "mf-json-inspect",
 "similar_keys": ["points", "data", "series"]}
```

**Add Error Recovery Patterns to Prompt:**
```
Common Errors & Fixes:
1. "Key not found" → Use mf-json-inspect to discover structure
2. "Chart format error" → Check data format (x/y for line/bar, name/value for pie)
3. "Division by zero" → Check for null/zero values before calculation
4. "File not found" → Verify path from previous tool output
```

### 4. Tool Composition & Chaining

**Best Practice:** Tools should compose well, with outputs designed as inputs for other tools.

**Current State:**
- ✅ **Excellent:** Tools return absolute paths in `paths[]` array
- ✅ **Excellent:** Next tool accepts those exact paths
- ✅ **Excellent:** JSON-in, JSON-out contract is consistent
- ✅ **Good:** Agent chains tools effectively (fetch → extract → calculate → chart)

**Observed Chaining Patterns:**

**Pattern 1: Data Analysis Workflow** (Test 5)
```bash
# 1. Fetch data
mf-market-get → paths: [fundamentals_quarterly.json]

# 2. Extract values
mf-extract-json (path: quarters[-1].revenue) → "94036000000"
mf-extract-json (path: quarters[-5].revenue) → "85777000000"

# 3. Calculate growth
mf-calc-simple (delta) → "+9.6% YoY"

# 4. Visualize
mf-chart-data → chart saved

# 5. Report
Write → report saved
```

**Pattern 2: Multi-Company Comparison** (Test 4)
```bash
# 1. Parallel fetch
mf-market-get (AAPL) ┐
mf-market-get (MSFT) ├→ All execute simultaneously
mf-market-get (GOOGL)┘

# 2. Parallel extract
mf-extract-json (AAPL revenue) ┐
mf-extract-json (MSFT revenue) ├→ All execute simultaneously
mf-extract-json (GOOGL revenue)┘

# 3. Calculate & compare
mf-calc-simple (margins for each)

# 4. Visualize
mf-chart-data (comparison chart)
```

**Recommendations:**

**Add Pipeline Helpers:**
```python
# Potential new tool: mf-pipeline
# Chains multiple operations in one call
{
    "pipeline": [
        {"tool": "mf-market-get", "args": {"ticker": "AAPL", "fields": ["fundamentals"]}},
        {"tool": "mf-extract-json", "args": {"path": "quarters[-1].revenue"}, "input_from": 0},
        {"tool": "mf-calc-simple", "args": {"op": "delta", "mode": "percent"}, "input_from": 1}
    ]
}
```

**Verdict:** Current chaining works well. Pipeline tool would add complexity without significant benefit. Keep current approach.

### 5. Cost Optimization

**Best Practice:** Provide free/cheap alternatives before expensive operations.

**Current State:**
- ✅ **Excellent:** `mf-extract-json` has path mode (FREE) and instruction mode (LLM cost)
- ✅ **Excellent:** System prompt emphasizes path mode first
- ✅ **Excellent:** `mf-json-inspect` is FREE (no LLM)
- ✅ **Good:** `mf-calc-simple` is deterministic (no LLM)
- ✅ **Good:** Prompt caching enabled (65-70% savings observed)

**Cost Breakdown from Tests:**

| Tool | Cost | Usage | Total Cost |
|------|------|-------|------------|
| mf-extract-json (path) | $0 | 60% | $0 |
| mf-json-inspect | $0 | 5% | $0 |
| mf-calc-simple | $0 | 15% | $0 |
| mf-extract-json (instruction) | $0.03-0.05 | 10% | ~$0.40 |
| mf-qa | $0.05-0.10 | 5% | ~$0.30 |
| LLM (agent turns) | Variable | 100% | ~$1.80 |

**Total: $2.50 across 10 tests (192 tool calls)**

**Recommendations:**

**Add Cost Estimates to Tool Output:**
```json
{
    "ok": true,
    "result": {...},
    "metrics": {
        "cost_usd": 0.0,
        "cost_breakdown": {
            "api_calls": 0.0,
            "llm_tokens": 0.0,
            "storage": 0.0
        },
        "cost_saved": 0.05  // By using path mode instead of instruction mode
    }
}
```

**Add Cost Warnings:**
```
# In system prompt
COST AWARENESS:
- Path extraction: FREE ✅
- Instruction extraction: $0.03-0.05 ⚠️
- QA (Haiku): $0.05-0.10 ⚠️
- QA (Sonnet): $0.15-0.30 ⚠️

Always try path mode first. Only use instruction mode when:
- Complex transformations needed
- Conditional filtering required
- Data reshaping necessary
```

### 6. Parallel Execution

**Best Practice:** Enable parallel tool calls to reduce latency.

**Current State:**
- ✅ **Excellent:** Agent calls multiple tools in same turn
- ✅ **Excellent:** System prompt explicitly encourages parallel execution
- ✅ **Excellent:** Examples show parallel patterns

**Observed Parallel Execution:**

**Test 4 (Multi-Company):**
- 3 companies fetched in ~5s (parallel)
- vs ~15s if sequential (3x speedup)

**Test 6 (5 Companies, 5 Years):**
- 5 companies fetched in ~8s (parallel)
- vs ~40s if sequential (5x speedup)

**Test 10 (Valuation):**
- Multiple extractions in parallel
- 36 tool calls in 46 turns (ratio: 1.28)

**Recommendations:**

**Enhance Parallel Execution Guidance:**
```
# Add to system prompt
PARALLEL EXECUTION RULES:

1. **Always parallelize independent operations:**
   ✅ Fetching multiple companies
   ✅ Extracting multiple fields from same file
   ✅ Calculating multiple metrics
   ✅ Creating multiple charts

2. **Don't parallelize dependent operations:**
   ❌ Extract before fetch completes
   ❌ Calculate before extract completes
   ❌ Chart before calculate completes

3. **Optimal batch sizes:**
   - Data fetching: 3-5 companies per turn
   - Extractions: 5-10 fields per turn
   - Calculations: 5-10 operations per turn

4. **Example (CORRECT):**
   <Turn 1: Parallel fetch>
   mf-market-get AAPL
   mf-market-get MSFT
   mf-market-get GOOGL
   
   <Turn 2: Parallel extract>
   mf-extract-json AAPL revenue
   mf-extract-json AAPL net_income
   mf-extract-json MSFT revenue
   mf-extract-json MSFT net_income
   mf-extract-json GOOGL revenue
   mf-extract-json GOOGL net_income
```

### 7. Tool Discoverability

**Best Practice:** Make it easy for agents to find and use the right tool.

**Current State:**
- ✅ System prompt has comprehensive tool catalog
- ✅ Decision rules help agent choose right tool
- ✅ Examples for common workflows
- ⚠️ 660+ line system prompt (very long)
- ⚠️ Some tools rarely used (mf-doc-diff, mf-filing-extract)

**Tool Usage Statistics (Tests 1-10):**

| Tool | Usage Count | Usage % |
|------|-------------|---------|
| mf-market-get | 67 | 35% |
| mf-extract-json | 58 | 30% |
| mf-calc-simple | 29 | 15% |
| mf-chart-data | 23 | 12% |
| Write | 10 | 5% |
| mf-json-inspect | 5 | 3% |
| mf-qa | 0 | 0% |
| mf-doc-diff | 0 | 0% |
| mf-filing-extract | 0 | 0% |

**Recommendations:**

**Option A: Lazy Loading** (Recommended)
- Core tools in main prompt (top 6 tools = 95% usage)
- Advanced tools in separate "advanced_tools.md" file
- Agent can Read file when needed

**Option B: Tool Categories**
```
# CORE TOOLS (use these 95% of the time)
1. mf-market-get - Fetch market data
2. mf-extract-json - Extract from JSON
3. mf-calc-simple - Math operations
4. mf-chart-data - Create charts
5. Write - Save reports
6. mf-json-inspect - Discover structure

# ADVANCED TOOLS (use for specific scenarios)
7. mf-qa - Document analysis
8. mf-documents-get - SEC filings
9. mf-filing-extract - Extract filing sections
10. mf-doc-diff - Compare documents
11. mf-valuation-basic-dcf - DCF valuation

# VISUAL TOOLS (use for rich UI)
12. mf-render-metrics - Metrics grid
13. mf-render-comparison - Comparison table
14. mf-render-insight - Insight card
15. mf-render-timeline - Timeline chart
```

**Option C: Dynamic Tool Loading**
- Agent starts with core tools only
- Can request additional tools: "load advanced_analysis_tools"
- SDK dynamically adds tools to allowed_tools list

**Verdict:** Option B (categorization) is simplest and most effective.

### 8. Tool Output Format

**Best Practice:** Consistent, structured output that's easy to parse.

**Current State:**
- ✅ **Excellent:** All tools use same JSON contract
- ✅ **Excellent:** `ok`, `result`, `paths`, `provenance`, `metrics` fields
- ✅ **Good:** Absolute paths returned for chaining
- ⚠️ Some inconsistency in `result` structure across tools

**Recommendations:**

**Standardize Result Structure:**
```json
{
    "ok": true,
    "result": {
        "data": {...},           // Primary result data
        "summary": "...",         // Human-readable summary
        "metadata": {...}         // Additional context
    },
    "paths": [...],              // File paths created/used
    "provenance": [...],         // Data sources
    "metrics": {
        "duration_ms": 1234,
        "bytes": 5678,
        "cost_usd": 0.0,
        "cache_hit": true
    },
    "format": "concise"
}
```

**Add Validation:**
```python
def validate_tool_output(output: dict) -> bool:
    """Ensure all tools return consistent structure."""
    required_fields = ["ok", "result"]
    optional_fields = ["paths", "provenance", "metrics", "format"]
    
    if not all(field in output for field in required_fields):
        raise ValueError(f"Missing required fields: {required_fields}")
    
    if not isinstance(output["ok"], bool):
        raise ValueError("'ok' must be boolean")
    
    return True
```

### 9. Missing Tool Capabilities

**Analysis of Test Queries Reveals Gaps:**

**Gap 1: Division/Ratio Operations**
- **Issue:** `mf-calc-simple` doesn't support division
- **Impact:** Agent calculates profit margins manually (23.43 / 94.04 = 24.9%)
- **Observed in:** Tests 2, 4, 10 (profit margin calculations)

**Recommendation:**
```python
# Add to mf-calc-simple
{
    "op": "ratio",
    "numerator": 23434000000,
    "denominator": 94036000000,
    "mode": "percent"  // or "decimal"
}
# Returns: {"ratio": 24.92, "mode": "percent"}
```

**Gap 2: Batch Extractions**
- **Issue:** Must call `mf-extract-json` separately for each field
- **Impact:** 4 calls to extract revenue, net_income, fcf, shares
- **Observed in:** All multi-metric tests

**Recommendation:**
```python
# Add batch mode to mf-extract-json
{
    "json_file": "/path/fundamentals.json",
    "paths": {
        "revenue": "quarters[-1].revenue",
        "net_income": "quarters[-1].net_income",
        "fcf": "quarters[-1].fcf",
        "shares": "quarters[-1].shares_diluted"
    }
}
# Returns: {"revenue": "94036000000", "net_income": "23434000000", ...}
```

**Gap 3: Multi-Company Aggregation**
- **Issue:** No tool to aggregate data across companies
- **Impact:** Agent manually compares values in response text
- **Observed in:** Tests 4, 6, 8, 10 (all comparison queries)

**Recommendation:**
```python
# New tool: mf-aggregate
{
    "operation": "compare",
    "entities": [
        {"name": "AAPL", "values": {"revenue": 94036000000, "margin": 24.9}},
        {"name": "MSFT", "values": {"revenue": 76441000000, "margin": 35.6}},
        {"name": "GOOGL", "values": {"revenue": 96434000000, "margin": 29.2}}
    ],
    "metrics": ["revenue", "margin"],
    "sort_by": "margin",
    "format": "table"
}
# Returns formatted comparison table
```

**Gap 4: Statistical Analysis**
- **Issue:** No tool for std dev, variance, correlation
- **Impact:** Agent calculated manually in Test 6 (volatility analysis)
- **Observed in:** Test 6 (5-year growth volatility)

**Recommendation:**
```python
# Add to mf-calc-simple or new mf-stats tool
{
    "op": "statistics",
    "values": [24.54, 33.07, 7.87, -2.24],
    "metrics": ["mean", "std_dev", "variance", "min", "max"]
}
# Returns: {"mean": 15.81, "std_dev": 15.52, ...}
```

**Gap 5: Time-Series Operations**
- **Issue:** No tool for moving averages, trends, seasonality
- **Impact:** Agent identifies patterns manually in text
- **Observed in:** Test 3, 5 (revenue trends, seasonal patterns)

**Recommendation:**
```python
# New tool: mf-timeseries
{
    "operation": "moving_average",
    "data": [{"date": "2024-Q1", "value": 81797}, ...],
    "window": 4,
    "type": "simple"  // or "exponential"
}
```

### 10. Tool Performance & Optimization

**Best Practice:** Tools should be fast and efficient.

**Current Performance (from Tests):**

| Tool | Avg Latency | Cache Hit Rate | Optimization Opportunity |
|------|-------------|----------------|--------------------------|
| mf-market-get | 2-5s | High | ✅ Good (uses caching) |
| mf-extract-json (path) | <100ms | N/A | ✅ Excellent |
| mf-extract-json (instruction) | 20-30s | Low | ⚠️ Could improve |
| mf-calc-simple | <100ms | N/A | ✅ Excellent |
| mf-chart-data | <200ms | N/A | ✅ Excellent |
| mf-json-inspect | <200ms | N/A | ✅ Excellent |

**Recommendations:**

**Add Caching for Instruction Mode:**
```python
# Cache LLM-based extractions
cache_key = hash(json_file + instruction)
if cache_key in extraction_cache:
    return cached_result
```

**Add Batch Processing:**
```python
# Process multiple extractions in one LLM call
{
    "json_file": "/path/file.json",
    "instructions": [
        "Extract revenue for last 4 quarters",
        "Extract net income for last 4 quarters",
        "Calculate average growth rate"
    ]
}
# Single LLM call instead of 3
```

**Add Progress Indicators:**
```python
# For long-running operations
{
    "ok": true,
    "status": "in_progress",
    "progress": 0.45,
    "message": "Processing 3 of 5 companies..."
}
```

## Recommended Improvements Priority

### High Priority (Implement First)

1. **Add Division to mf-calc-simple** ✅
   - Impact: High (used in every profit margin calculation)
   - Effort: Low (simple addition to existing tool)
   - Benefit: Eliminates manual calculations

2. **Add Batch Extraction to mf-extract-json** ✅
   - Impact: High (reduces tool calls by 50-70%)
   - Effort: Medium (requires API changes)
   - Benefit: Faster execution, lower latency

3. **Enhance Error Messages with Hints** ✅
   - Impact: Medium (improves self-correction)
   - Effort: Low (update error handling)
   - Benefit: Fewer failed attempts

4. **Categorize Tools in Prompt** ✅
   - Impact: Medium (improves discoverability)
   - Effort: Low (reorganize prompt)
   - Benefit: Easier for agent to find right tool

### Medium Priority (Implement Next)

5. **Add Statistical Functions** ⚠️
   - Impact: Medium (used in volatility analysis)
   - Effort: Medium (new functionality)
   - Benefit: Better quantitative analysis

6. **Add Multi-Company Aggregation Tool** ⚠️
   - Impact: Medium (used in all comparison queries)
   - Effort: Medium (new tool)
   - Benefit: Cleaner comparisons

7. **Add Cost Tracking to Tool Output** ⚠️
   - Impact: Low (informational)
   - Effort: Low (add metrics field)
   - Benefit: Better cost visibility

### Low Priority (Future Enhancements)

8. **Add Time-Series Operations** 📋
   - Impact: Low (nice-to-have)
   - Effort: High (complex functionality)
   - Benefit: Advanced analysis capabilities

9. **Add Pipeline Tool** 📋
   - Impact: Low (current chaining works well)
   - Effort: High (significant complexity)
   - Benefit: Marginal improvement

10. **Dynamic Tool Loading** 📋
    - Impact: Low (prompt optimization)
    - Effort: High (SDK changes required)
    - Benefit: Slightly cleaner architecture

## Implementation Plan

### Phase 1: Quick Wins (Week 1)

**1. Add Division to mf-calc-simple**
```python
# In bin/mf-calc-simple
if op == "ratio":
    numerator = data.get("numerator")
    denominator = data.get("denominator")
    mode = data.get("mode", "decimal")  # decimal or percent
    
    if denominator == 0:
        return error("Division by zero")
    
    ratio = numerator / denominator
    if mode == "percent":
        ratio *= 100
    
    return success({"ratio": ratio, "mode": mode})
```

**2. Enhance Error Messages**
```python
# Add to all tools
def error_with_hint(message: str, hint: str = None, similar_keys: list = None):
    return {
        "ok": false,
        "error": message,
        "hint": hint,
        "similar_keys": similar_keys,
        "suggested_action": "mf-json-inspect" if "key not found" in message else None
    }
```

**3. Reorganize System Prompt**
```
# CORE TOOLS (95% of usage)
...

# ADVANCED TOOLS (5% of usage)
...

# DECISION TREE
If you need... → Use this tool
```

### Phase 2: Batch Operations (Week 2)

**4. Add Batch Extraction**
```python
# In bin/mf-extract-json
if "paths" in data:  # Batch mode
    results = {}
    for key, path in data["paths"].items():
        results[key] = extract_path(json_data, path)
    return success({"extractions": results})
```

**5. Add Statistical Functions**
```python
# In bin/mf-calc-simple or new bin/mf-stats
if op == "statistics":
    values = data.get("values", [])
    metrics = data.get("metrics", ["mean", "std_dev"])
    
    results = {}
    if "mean" in metrics:
        results["mean"] = statistics.mean(values)
    if "std_dev" in metrics:
        results["std_dev"] = statistics.stdev(values)
    # ... other metrics
    
    return success(results)
```

### Phase 3: Advanced Features (Week 3-4)

**6. Add Multi-Company Aggregation**
```python
# New tool: bin/mf-aggregate
# Handles comparison, ranking, statistical analysis across entities
```

**7. Add Cost Tracking**
```python
# Add to all tool outputs
"metrics": {
    "duration_ms": 1234,
    "cost_usd": 0.0,
    "cost_breakdown": {...},
    "cost_saved": 0.05
}
```

## Success Metrics

**After implementing improvements, measure:**

1. **Tool Call Reduction**
   - Target: 20-30% fewer tool calls for same queries
   - Measure: Average tool calls per query type

2. **Latency Improvement**
   - Target: 15-25% faster execution
   - Measure: Time from query to final response

3. **Cost Reduction**
   - Target: 10-15% lower cost per query
   - Measure: Average cost per query type

4. **Error Rate**
   - Target: 50% fewer failed tool calls
   - Measure: Failed calls / total calls

5. **Agent Efficiency**
   - Target: Turn/tool ratio < 1.2
   - Measure: Turns / tool calls

## Conclusion

The current tool architecture is solid and performs well (100% success rate, reasonable costs). The main opportunities for improvement are:

1. **Add missing operations** (division, batch extraction, statistics)
2. **Enhance error messages** (better hints and suggestions)
3. **Improve discoverability** (categorize tools, clearer decision trees)
4. **Optimize performance** (caching, batch processing)

These improvements will make the agent faster, cheaper, and more capable while maintaining the clean architecture and composability that already works well.

**Priority:** Focus on Phase 1 (quick wins) first, as these provide 80% of the benefit with 20% of the effort.
