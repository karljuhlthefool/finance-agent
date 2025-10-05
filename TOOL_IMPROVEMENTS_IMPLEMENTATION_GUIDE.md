# Tool Improvements Implementation Guide
## Practical Code Examples & Step-by-Step Instructions

## Overview

This guide provides concrete implementation steps for the high-priority tool improvements identified in the analysis. Each improvement includes:
- Code examples
- Testing procedures
- Integration steps
- Expected impact

## Phase 1: Quick Wins (Week 1)

### Improvement 1: Add Division/Ratio to mf-calc-simple

**Problem:** Agent manually calculates profit margins (23.43 / 94.04 = 24.9%)

**Solution:** Add ratio operation to `mf-calc-simple`

**Implementation:**

```python
# File: bin/mf-calc-simple

# Add to operation handlers
elif op == "ratio":
    numerator = data.get("numerator")
    denominator = data.get("denominator")
    mode = data.get("mode", "decimal")  # "decimal" or "percent"
    precision = data.get("precision", 2)
    
    # Validation
    if numerator is None:
        return error_response("Missing required field: numerator")
    if denominator is None:
        return error_response("Missing required field: denominator")
    if denominator == 0:
        return error_response("Division by zero", 
                            hint="Check that denominator is not zero")
    
    # Calculate ratio
    ratio = numerator / denominator
    
    # Format based on mode
    if mode == "percent":
        ratio_value = ratio * 100
        formatted = f"{ratio_value:.{precision}f}%"
    else:
        ratio_value = ratio
        formatted = f"{ratio_value:.{precision}f}x"
    
    return success_response({
        "numerator": numerator,
        "denominator": denominator,
        "ratio": ratio_value,
        "mode": mode,
        "formatted": formatted
    })
```

**Usage Examples:**

```bash
# Profit Margin (net income / revenue)
echo '{"op":"ratio","numerator":23434000000,"denominator":94036000000,"mode":"percent"}' | mf-calc-simple
# Returns: {"ratio": 24.92, "formatted": "24.92%", ...}

# P/E Ratio (price / EPS)
echo '{"op":"ratio","numerator":258.02,"denominator":7.26,"mode":"decimal"}' | mf-calc-simple
# Returns: {"ratio": 35.54, "formatted": "35.54x", ...}

# Debt-to-Equity
echo '{"op":"ratio","numerator":101698000000,"denominator":62285000000,"mode":"decimal","precision":2}' | mf-calc-simple
# Returns: {"ratio": 1.63, "formatted": "1.63x", ...}
```

**Update System Prompt:**

```markdown
## mf-calc-simple Operations

**Ratio (NEW):**
```json
{
  "op": "ratio",
  "numerator": 23434000000,
  "denominator": 94036000000,
  "mode": "percent",  // "percent" or "decimal"
  "precision": 2      // decimal places (optional, default: 2)
}
```

**Use cases:**
- Profit margins: net_income / revenue (mode: "percent")
- P/E ratio: price / EPS (mode: "decimal")
- Debt ratios: debt / equity (mode: "decimal")
- ROE, ROA: income / equity or assets (mode: "percent")
```

**Testing:**

```bash
# Test profit margin
echo '{"op":"ratio","numerator":23434000000,"denominator":94036000000,"mode":"percent"}' | bin/mf-calc-simple
# Expected: 24.92%

# Test division by zero
echo '{"op":"ratio","numerator":100,"denominator":0,"mode":"percent"}' | bin/mf-calc-simple
# Expected: Error with hint

# Test P/E ratio
echo '{"op":"ratio","numerator":258.02,"denominator":7.26,"mode":"decimal"}' | bin/mf-calc-simple
# Expected: 35.54x
```

**Expected Impact:**
- ✅ Eliminates manual calculations in agent responses
- ✅ Deterministic, auditable results
- ✅ Consistent formatting
- ✅ Reduces errors from manual math

---

### Improvement 2: Enhanced Error Messages

**Problem:** Errors lack actionable hints for self-correction

**Solution:** Add hints, suggested actions, and similar keys to all error responses

**Implementation:**

```python
# File: src/util/error_handling.py (new file)

from typing import Optional, List, Dict, Any

def error_response(
    message: str,
    hint: Optional[str] = None,
    suggested_action: Optional[str] = None,
    similar_keys: Optional[List[str]] = None,
    error_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized error response with helpful context.
    
    Args:
        message: Primary error message
        hint: Actionable suggestion for fixing the error
        suggested_action: Tool or command to run next
        similar_keys: List of similar/alternative keys (for "key not found" errors)
        error_code: Machine-readable error code
    """
    response = {
        "ok": False,
        "error": message
    }
    
    if hint:
        response["hint"] = hint
    if suggested_action:
        response["suggested_action"] = suggested_action
    if similar_keys:
        response["similar_keys"] = similar_keys
    if error_code:
        response["error_code"] = error_code
    
    return response

# Common error patterns
def key_not_found_error(key: str, available_keys: List[str]) -> Dict[str, Any]:
    """Error for missing JSON keys with suggestions."""
    # Find similar keys (simple string matching)
    similar = [k for k in available_keys if key.lower() in k.lower() or k.lower() in key.lower()][:3]
    
    return error_response(
        message=f"Key '{key}' not found in JSON",
        hint=f"Use mf-json-inspect to see all available keys. Try: {', '.join(similar[:3]) if similar else 'check structure'}",
        suggested_action="mf-json-inspect",
        similar_keys=similar,
        error_code="KEY_NOT_FOUND"
    )

def invalid_format_error(expected: str, received: str, example: str = None) -> Dict[str, Any]:
    """Error for format mismatches."""
    hint = f"Expected {expected}, received {received}"
    if example:
        hint += f". Example: {example}"
    
    return error_response(
        message=f"Invalid format: expected {expected}",
        hint=hint,
        error_code="INVALID_FORMAT"
    )

def missing_field_error(field: str, required_fields: List[str]) -> Dict[str, Any]:
    """Error for missing required fields."""
    return error_response(
        message=f"Missing required field: {field}",
        hint=f"Required fields: {', '.join(required_fields)}",
        error_code="MISSING_FIELD"
    )
```

**Update Existing Tools:**

```python
# File: bin/mf-extract-json

from src.util.error_handling import key_not_found_error, invalid_format_error

# Old error
if key not in data:
    return {"ok": False, "error": f"Key '{key}' not found"}

# New error
if key not in data:
    available_keys = list(data.keys())
    return key_not_found_error(key, available_keys)
```

**Example Error Outputs:**

```json
// Before
{"ok": false, "error": "Key 'historical' not found"}

// After
{
    "ok": false,
    "error": "Key 'historical' not found in JSON",
    "hint": "Use mf-json-inspect to see all available keys. Try: points, data, series",
    "suggested_action": "mf-json-inspect",
    "similar_keys": ["points", "data", "series"],
    "error_code": "KEY_NOT_FOUND"
}
```

**Update System Prompt:**

```markdown
## Error Recovery (ENHANCED)

When you receive an error, the response includes:
- `error`: Primary error message
- `hint`: Actionable suggestion for fixing
- `suggested_action`: Tool to run next (if applicable)
- `similar_keys`: Alternative keys to try (for key errors)
- `error_code`: Machine-readable code

**Common Error Patterns:**

1. **KEY_NOT_FOUND**
   ```
   Error: Key 'historical' not found
   Hint: Use mf-json-inspect. Try: points, data, series
   Action: Run mf-json-inspect on the file
   ```

2. **INVALID_FORMAT**
   ```
   Error: Expected array, received object
   Hint: Chart data must be array of {x, y}. Example: [{"x":"Q1","y":100}]
   Action: Restructure data as array
   ```

3. **MISSING_FIELD**
   ```
   Error: Missing required field: ticker
   Hint: Required fields: ticker, fields
   Action: Add ticker to request
   ```

**Recovery Pattern:**
1. Read error message and hint
2. If suggested_action provided, run that tool
3. If similar_keys provided, try those alternatives
4. Adjust input based on hint
5. Retry with corrected input
```

**Expected Impact:**
- ✅ 50% reduction in failed retry attempts
- ✅ Faster self-correction
- ✅ Better agent learning
- ✅ Clearer debugging

---

### Improvement 3: Reorganize System Prompt by Tool Categories

**Problem:** 660+ line prompt is hard to navigate

**Solution:** Categorize tools by usage frequency and purpose

**Implementation:**

```python
# File: src/prompts/agent_system_improved.py

AGENT_SYSTEM = """
⚠️ **CRITICAL: YOU MUST USE TOOLS, NOT DESCRIBE THEM** ⚠️
[... existing critical rules ...]

---

# TOOL CATALOG (BY USAGE FREQUENCY)

## 🔥 CORE TOOLS (Use 95% of the time)

These tools handle the vast majority of queries. Master these first.

### 1. mf-market-get - Fetch Market Data ⭐⭐⭐⭐⭐
**Usage:** 35% of all tool calls
**Purpose:** One-stop shop for ALL FMP data (38 types)
**Cost:** Free (uses caching)
**Latency:** 2-5s

**Quick Start:**
```bash
# Company overview
echo '{"ticker":"AAPL","fields":["profile","quote","fundamentals"]}' | mf-market-get

# Financial analysis
echo '{"ticker":"MSFT","fields":["fundamentals","key_metrics","ratios"],"period":"quarter","limit":8}' | mf-market-get
```

**Available Fields:** fundamentals, prices, quote, profile, key_metrics, ratios, growth, analyst_recs, institutional, segments_product, peers [+27 more]

**When to use:**
- ✅ Need ANY financial data
- ✅ Company fundamentals, prices, metrics
- ✅ Analyst data, ownership, segments
- ✅ Combine 5-10 fields in one call for efficiency

---

### 2. mf-extract-json - Extract Data from JSON ⭐⭐⭐⭐⭐
**Usage:** 30% of all tool calls
**Purpose:** Get specific values from JSON files
**Cost:** FREE (path mode) | $0.03-0.05 (instruction mode)
**Latency:** <100ms (path) | 20-30s (instruction)

**CRITICAL:** Always use path mode first (FREE!)

**Path Mode (PREFERRED):**
```bash
# Latest quarter revenue
echo '{"json_file":"/path/fundamentals.json","path":"quarters[-1].revenue"}' | mf-extract-json

# Last 30 days of prices
echo '{"json_file":"/path/prices.json","path":"points[-30:]"}' | mf-extract-json

# All closing prices
echo '{"json_file":"/path/prices.json","path":"points[*].close"}' | mf-extract-json
```

**Instruction Mode (ONLY when necessary):**
```bash
# Complex transformation
echo '{"json_file":"/path/data.json","instruction":"Return quarters where revenue > $80B"}' | mf-extract-json
```

**When to use:**
- ✅ Extract specific values from JSON
- ✅ Array slicing, key access
- ✅ Simple data retrieval
- ⚠️ Use instruction mode ONLY for complex transformations

---

### 3. mf-calc-simple - Deterministic Math ⭐⭐⭐⭐
**Usage:** 15% of all tool calls
**Purpose:** Calculations without LLM
**Cost:** FREE
**Latency:** <100ms

**Operations:**
```bash
# Delta (change)
echo '{"op":"delta","current":94036000000,"previous":85777000000,"mode":"percent"}' | mf-calc-simple
# Returns: +9.6%

# Ratio (NEW!)
echo '{"op":"ratio","numerator":23434000000,"denominator":94036000000,"mode":"percent"}' | mf-calc-simple
# Returns: 24.92% (profit margin)

# Growth (YoY, QoQ)
echo '{"op":"growth","series":[{"date":"2024-06-29","value":85777000000},{"date":"2025-06-28","value":94036000000}],"period":"yoy"}' | mf-calc-simple
```

**When to use:**
- ✅ ANY math operation
- ✅ Growth rates, deltas, ratios
- ✅ Profit margins, P/E ratios
- ❌ NEVER calculate manually in your response

---

### 4. mf-chart-data - Create Charts ⭐⭐⭐⭐
**Usage:** 12% of all tool calls
**Purpose:** Beautiful interactive visualizations
**Cost:** FREE
**Latency:** <200ms

**Chart Types:**
```bash
# Line chart (trends)
echo '{"chart_type":"line","series":[{"x":"Q1","y":81797},{"x":"Q2","y":85777}],"title":"Revenue Trend","format_y":"currency"}' | mf-chart-data

# Bar chart (comparisons)
echo '{"chart_type":"bar","series":[{"x":"AAPL","y":24.9},{"x":"MSFT","y":35.6}],"title":"Profit Margins","format_y":"percent"}' | mf-chart-data

# Pie chart (composition)
echo '{"chart_type":"pie","series":[{"name":"iPhone","value":200.5},{"name":"Services","value":85.2}],"title":"Revenue by Segment"}' | mf-chart-data
```

**When to use:**
- ✅ Time-series data (revenue, prices)
- ✅ Comparisons (companies, metrics)
- ✅ Composition (segments, breakdown)

---

### 5. mf-json-inspect - Discover Structure ⭐⭐⭐
**Usage:** 3% of all tool calls
**Purpose:** See what's in a JSON file
**Cost:** FREE
**Latency:** <200ms

```bash
echo '{"json_file":"/path/data.json","max_depth":3,"show_hints":true}' | mf-json-inspect
```

**When to use:**
- ✅ First time working with a file
- ✅ Got "key not found" error
- ✅ Don't know structure
- ✅ Want to see available fields

---

### 6. Write - Save Reports ⭐⭐⭐
**Usage:** 5% of all tool calls
**Purpose:** Save markdown reports to disk

```bash
# Via SDK Write tool
Write(path="/path/report.md", content="# Analysis\n...")
```

**When to use:**
- ✅ Final analysis complete
- ✅ Want to save findings
- ✅ Create durable artifact

---

## 🔧 ADVANCED TOOLS (Use 5% of the time)

Use these for specific scenarios only.

### 7. mf-qa - Document Analysis
**Purpose:** Analyze large text with LLM (delegate)
**Cost:** $0.05-0.10 (Haiku) | $0.15-0.30 (Sonnet)
**When:** Analyzing SEC filings, risk factors, MD&A

### 8. mf-documents-get - SEC Filings
**Purpose:** Fetch 10-K, 10-Q, 8-K filings
**Cost:** FREE
**When:** Need source filings for analysis

### 9. mf-filing-extract - Extract Sections
**Purpose:** Get specific sections (Risk Factors, MD&A)
**Cost:** FREE
**When:** Need focused filing content

### 10. mf-doc-diff - Compare Documents
**Purpose:** Year-over-year filing comparison
**Cost:** FREE
**When:** Analyzing changes in filings

### 11. mf-valuation-basic-dcf - DCF Valuation
**Purpose:** 3-scenario DCF model
**Cost:** FREE
**When:** Need intrinsic value estimate

### 12. mf-render-* - Visual Components
**Purpose:** Rich UI components (metrics grid, comparison table, insight card, timeline)
**Cost:** FREE
**When:** Want beautiful formatted output in UI

---

## 🎯 DECISION TREE (Pick the right tool fast)

**Need financial data?**
→ `mf-market-get` with fields array

**Have JSON file?**
→ Don't know structure? `mf-json-inspect`
→ Know structure? `mf-extract-json` with path (FREE!)
→ Complex extraction? `mf-extract-json` with instruction

**Need calculation?**
→ `mf-calc-simple` (NEVER calculate manually!)

**Have time-series data?**
→ `mf-chart-data` (beautiful charts)

**Need SEC filing?**
→ `mf-documents-get` → `mf-filing-extract` → `mf-qa`

**Done with analysis?**
→ `Write` to save report

---

## 💰 COST OPTIMIZATION

**FREE Tools (use liberally):**
- mf-market-get (cached)
- mf-extract-json (path mode)
- mf-json-inspect
- mf-calc-simple
- mf-chart-data
- mf-filing-extract
- Write

**Paid Tools (use sparingly):**
- mf-extract-json (instruction mode): $0.03-0.05
- mf-qa (Haiku): $0.05-0.10
- mf-qa (Sonnet): $0.15-0.30

**Cost Order (cheapest → priciest):**
Inspect → Extract(path) → Calc → Chart → Extract(instruction) → QA(Haiku) → QA(Sonnet)

---

[... rest of prompt with detailed documentation for each tool ...]
"""
```

**Expected Impact:**
- ✅ Faster tool discovery
- ✅ Better tool selection
- ✅ Clearer usage patterns
- ✅ Reduced prompt reading time

---

## Phase 2: Batch Operations (Week 2)

### Improvement 4: Batch Extraction

**Problem:** Must call `mf-extract-json` 4+ times to get multiple fields

**Solution:** Add batch mode to extract multiple paths in one call

**Implementation:**

```python
# File: bin/mf-extract-json

def handle_batch_extraction(json_data: dict, paths: dict) -> dict:
    """
    Extract multiple paths in one call.
    
    Args:
        json_data: Parsed JSON data
        paths: Dict of {key: path} to extract
    
    Returns:
        Dict of {key: extracted_value}
    """
    results = {}
    errors = {}
    
    for key, path in paths.items():
        try:
            value = extract_path(json_data, path)
            results[key] = value
        except Exception as e:
            errors[key] = str(e)
    
    if errors:
        return error_response(
            f"Failed to extract {len(errors)} of {len(paths)} paths",
            hint=f"Errors: {errors}",
            error_code="PARTIAL_EXTRACTION_FAILURE"
        )
    
    return success_response({
        "extractions": results,
        "count": len(results)
    })

# Main handler
if "paths" in data:  # Batch mode
    return handle_batch_extraction(json_data, data["paths"])
elif "path" in data:  # Single mode (existing)
    return handle_single_extraction(json_data, data["path"])
```

**Usage Examples:**

```bash
# Extract multiple metrics from one file
echo '{
    "json_file": "/path/fundamentals.json",
    "paths": {
        "revenue": "quarters[-1].revenue",
        "net_income": "quarters[-1].net_income",
        "fcf": "quarters[-1].fcf",
        "shares": "quarters[-1].shares_diluted"
    }
}' | mf-extract-json

# Returns:
{
    "ok": true,
    "result": {
        "extractions": {
            "revenue": "94036000000",
            "net_income": "23434000000",
            "fcf": "23143000000",
            "shares": "15207000000"
        },
        "count": 4
    }
}

# Extract from multiple quarters
echo '{
    "json_file": "/path/fundamentals.json",
    "paths": {
        "q1_revenue": "quarters[-4].revenue",
        "q2_revenue": "quarters[-3].revenue",
        "q3_revenue": "quarters[-2].revenue",
        "q4_revenue": "quarters[-1].revenue"
    }
}' | mf-extract-json
```

**Update System Prompt:**

```markdown
## mf-extract-json - BATCH MODE (NEW)

**Single Extraction (existing):**
```json
{"json_file": "/path/file.json", "path": "quarters[-1].revenue"}
```

**Batch Extraction (NEW - use this!):**
```json
{
    "json_file": "/path/file.json",
    "paths": {
        "revenue": "quarters[-1].revenue",
        "net_income": "quarters[-1].net_income",
        "fcf": "quarters[-1].fcf"
    }
}
```

**Benefits:**
- ✅ One call instead of 3-4
- ✅ Faster execution (parallel extraction)
- ✅ Cleaner code
- ✅ Atomic operation (all or nothing)

**When to use batch mode:**
- Extracting multiple fields from same file
- Getting data for multiple quarters
- Building comparison tables
```

**Expected Impact:**
- ✅ 50-70% reduction in extraction tool calls
- ✅ Faster execution (1 call vs 4 calls)
- ✅ Lower latency
- ✅ Cleaner agent trajectory

---

### Improvement 5: Statistical Functions

**Problem:** No tool for std dev, variance, correlation

**Solution:** Add statistics operation to `mf-calc-simple`

**Implementation:**

```python
# File: bin/mf-calc-simple

import statistics
import math

elif op == "statistics":
    values = data.get("values", [])
    metrics = data.get("metrics", ["mean", "std_dev", "min", "max"])
    
    if not values:
        return error_response("No values provided")
    
    if not isinstance(values, list):
        return error_response("Values must be an array")
    
    # Calculate requested metrics
    results = {}
    
    if "mean" in metrics:
        results["mean"] = statistics.mean(values)
    
    if "median" in metrics:
        results["median"] = statistics.median(values)
    
    if "std_dev" in metrics:
        if len(values) < 2:
            results["std_dev"] = 0
        else:
            results["std_dev"] = statistics.stdev(values)
    
    if "variance" in metrics:
        if len(values) < 2:
            results["variance"] = 0
        else:
            results["variance"] = statistics.variance(values)
    
    if "min" in metrics:
        results["min"] = min(values)
    
    if "max" in metrics:
        results["max"] = max(values)
    
    if "range" in metrics:
        results["range"] = max(values) - min(values)
    
    if "count" in metrics:
        results["count"] = len(values)
    
    if "sum" in metrics:
        results["sum"] = sum(values)
    
    # Coefficient of variation (std_dev / mean)
    if "cv" in metrics and "mean" in results and "std_dev" in results:
        if results["mean"] != 0:
            results["cv"] = results["std_dev"] / results["mean"]
        else:
            results["cv"] = 0
    
    return success_response(results)
```

**Usage Examples:**

```bash
# Growth rate volatility
echo '{
    "op": "statistics",
    "values": [24.54, 33.07, 7.87, -2.24, 2.05],
    "metrics": ["mean", "std_dev", "min", "max", "cv"]
}' | mf-calc-simple

# Returns:
{
    "mean": 13.06,
    "std_dev": 14.73,
    "min": -2.24,
    "max": 33.07,
    "cv": 1.13
}

# Quarterly revenue analysis
echo '{
    "op": "statistics",
    "values": [81797, 85777, 94036, 124630],
    "metrics": ["mean", "median", "std_dev", "range"]
}' | mf-calc-simple
```

**Expected Impact:**
- ✅ Eliminates manual statistical calculations
- ✅ Deterministic, auditable results
- ✅ Enables volatility analysis
- ✅ Better quantitative insights

---

## Testing Checklist

### For Each Improvement:

**1. Unit Tests**
```bash
# Test normal cases
./test_tool.sh --tool mf-calc-simple --op ratio --test normal

# Test edge cases
./test_tool.sh --tool mf-calc-simple --op ratio --test edge

# Test error cases
./test_tool.sh --tool mf-calc-simple --op ratio --test error
```

**2. Integration Tests**
```bash
# Test with agent
python agent_testing.py "Calculate Apple's profit margin" --model sonnet

# Verify tool is used correctly
grep "mf-calc-simple.*ratio" logs/latest.json
```

**3. Regression Tests**
```bash
# Ensure existing functionality still works
python agent_testing.py "What is Apple's stock price?" --model sonnet
python agent_testing.py "Compare AAPL and MSFT revenue growth" --model sonnet
```

**4. Performance Tests**
```bash
# Measure latency improvement
time echo '{"paths":{...}}' | mf-extract-json  # Batch mode
time for i in 1 2 3 4; do echo '{"path":"..."}' | mf-extract-json; done  # Sequential
```

---

## Rollout Plan

### Week 1: Development
- Day 1-2: Implement ratio operation
- Day 3-4: Enhance error messages
- Day 5: Reorganize system prompt
- Testing throughout

### Week 2: Testing & Refinement
- Day 1-2: Comprehensive testing
- Day 3-4: Fix bugs, refine implementations
- Day 5: Documentation updates

### Week 3: Deployment
- Day 1: Deploy to staging
- Day 2-3: Monitor and validate
- Day 4: Deploy to production
- Day 5: Monitor production metrics

---

## Success Metrics

**Track these metrics before and after:**

1. **Tool Call Efficiency**
   - Baseline: 192 tool calls across 10 tests
   - Target: <160 tool calls (15-20% reduction)

2. **Error Rate**
   - Baseline: ~5% failed tool calls
   - Target: <2.5% (50% reduction)

3. **Cost per Query**
   - Baseline: $0.25 average
   - Target: <$0.20 (20% reduction)

4. **Latency**
   - Baseline: 30s-3min depending on complexity
   - Target: 25s-2.5min (15% improvement)

5. **Agent Satisfaction** (qualitative)
   - Fewer manual calculations
   - Faster self-correction
   - Cleaner trajectories

---

## Conclusion

These improvements are high-impact, low-effort changes that will make the agent:
- **Faster** (batch operations, better error recovery)
- **Cheaper** (fewer tool calls, better path selection)
- **More capable** (ratio calculations, statistics)
- **Easier to use** (better organization, clearer errors)

Focus on Phase 1 first - these provide 80% of the benefit with minimal implementation effort.
