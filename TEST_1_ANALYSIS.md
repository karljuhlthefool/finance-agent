# Test 1: Multi-Company Comparison Analysis

**Date:** October 5, 2025  
**Query:** "Compare Apple, Microsoft, and Google's Q2 2025 performance. For each company, calculate: profit margin, ROE, revenue growth YoY, and FCF margin. Then create a comparison table and tell me which company has the best overall financial health."

---

## 📊 Execution Metrics

- **Turns:** 31 (hit max of 25, but continued)
- **Tool Calls:** 25
- **Total Cost:** $0.14
- **Tokens:** 3,871 (37 in / 3,834 out)
- **Cache Savings:** $0.36
- **Status:** ❌ **INCOMPLETE** - Agent stopped mid-execution

---

## 🔍 Trajectory Analysis

### Phase 1: Data Fetching (Turns 1-3) ✅ GOOD
**Tool Calls:** 3 parallel `mf-market-get` calls

```bash
# Parallel execution (excellent!)
mf-market-get AAPL (fundamentals, key_metrics)
mf-market-get MSFT (fundamentals, key_metrics)
mf-market-get GOOGL (fundamentals, key_metrics)
```

**✅ What Went Well:**
- Perfect parallel execution (3 calls in same turn)
- Fetched both fundamentals and key_metrics in one call per company
- Efficient data gathering

**Time:** ~10s for all 3 companies (parallel)

---

### Phase 2: First Batch Extraction Attempt (Turns 4-6) ❌ FAILED
**Tool Calls:** 3 batch extractions (all failed)

**Error:** `Path '.quarters[-1].netIncome': key 'netIncome' not found`

**❌ Problem:**
- Agent used camelCase (`netIncome`, `freeCashFlow`, `totalStockholdersEquity`)
- Actual keys are snake_case (`net_income`, `fcf`, `total_assets`)

**🔍 Root Cause:**
The agent doesn't have a clear reference for field naming conventions. The system prompt shows examples with snake_case, but the agent defaulted to camelCase (which is common in JSON APIs).

**💡 Improvement Opportunity:**
1. Add a "Field Naming Convention" section to the system prompt
2. Explicitly state: "All field names use snake_case (e.g., `net_income`, not `netIncome`)"
3. Add common field name mappings in the data schemas section

---

### Phase 3: Corrected Batch Extraction (Turns 7-9) ✅ GOOD
**Tool Calls:** 3 batch extractions + 3 single ROE extractions

```bash
# Batch extraction (5 values each)
AAPL: revenue_q2, net_income_q2, fcf_q2, revenue_yoy, date_q2
MSFT: revenue_q2, net_income_q2, fcf_q2, revenue_yoy, date_q2
GOOGL: revenue_q2, net_income_q2, fcf_q2, revenue_yoy, date_q2
```

**✅ What Went Well:**
- Used batch extraction correctly (5 values in 1 call)
- Self-corrected field names to snake_case
- Efficient recovery

**❌ Problem:**
- Tried to extract ROE from `key_metrics_quarter.json` using `quarters[-1].roe`
- Error: `Path '.quarters': expected object, got list`
- The file is a direct array, not an object with a `quarters` key

**🔍 Root Cause:**
The agent assumed all files have the same structure (with a `quarters` key). The `key_metrics` file is structured differently from `fundamentals`.

**💡 Improvement Opportunity:**
1. Update data schemas to show BOTH structures:
   - `fundamentals_quarterly.json`: `{"ticker": "...", "quarters": [...]}`
   - `key_metrics_quarter.json`: `[{...}, {...}]` (direct array)
2. Add a note: "key_metrics files are direct arrays, not objects"

---

### Phase 4: ROE Extraction Correction (Turns 10-12) ✅ GOOD
**Tool Calls:** 1 `mf-json-inspect` + 3 corrected ROE extractions

```bash
# Inspect structure first
mf-json-inspect key_metrics_quarter.json

# Then extract correctly
[-1].roe (not quarters[-1].roe)
```

**✅ What Went Well:**
- Agent used `mf-json-inspect` to discover the correct structure
- Self-corrected and extracted ROE successfully
- Good error recovery pattern

**Time:** ~3s for inspection + extractions

---

### Phase 5: Ratio Calculations (Turns 13-21) ✅ EXCELLENT
**Tool Calls:** 9 ratio/delta calculations

```bash
# All calculations using mf-calc-simple (no manual math!)
AAPL: profit_margin (ratio), fcf_margin (ratio), revenue_growth (delta)
MSFT: profit_margin (ratio), fcf_margin (ratio), revenue_growth (delta)
GOOGL: profit_margin (ratio), fcf_margin (ratio), revenue_growth (delta)
```

**✅ What Went Well:**
- Used new `ratio` operation for all margin calculations
- Used `delta` operation for growth calculations
- Zero manual calculations
- Parallel execution (9 calls in same turn)

**Results:**
- **Apple:** 24.92% profit margin, 25.95% FCF margin, 9.63% revenue growth, 36.94% ROE
- **Microsoft:** 35.63% profit margin, 33.45% FCF margin, 18.10% revenue growth, 10.10% ROE
- **Google:** 29.24% profit margin, 5.50% FCF margin, 13.79% revenue growth, 7.21% ROE

**Time:** ~8s for all 9 calculations (parallel)

---

### Phase 6: Incomplete (Turns 22-31) ❌ STOPPED
**Status:** Agent hit max turns before completing the task

**❌ What Was Missing:**
1. No comparison table created
2. No final analysis ("which company has the best overall financial health?")
3. No use of `mf-render-comparison` tool
4. No report saved with `Write` or `mf-report-save`

**🔍 Root Cause:**
- Agent spent 21 turns on data gathering and calculations
- Only 4 turns left for analysis and reporting
- Hit max_turns (25) before completing

---

## 🐛 Issues Identified

### Critical Issues

1. **❌ Incomplete Execution**
   - **Problem:** Agent hit max turns without completing the task
   - **Impact:** No comparison table, no final analysis
   - **Root Cause:** Too many turns spent on error recovery

2. **❌ Field Naming Confusion**
   - **Problem:** Agent used camelCase instead of snake_case
   - **Impact:** 3 failed tool calls, wasted 3 turns
   - **Root Cause:** No explicit field naming convention in prompt

3. **❌ Data Structure Assumptions**
   - **Problem:** Agent assumed all files have `quarters` key
   - **Impact:** 3 failed tool calls, wasted 3 turns
   - **Root Cause:** Incomplete data schema documentation

### High Priority Issues

4. **⚠️ No Comparison Table**
   - **Problem:** Agent didn't use `mf-render-comparison` tool
   - **Impact:** Results not visualized, hard to compare
   - **Root Cause:** Tool not mentioned in decision tree for comparison queries

5. **⚠️ Sequential Ratio Calculations**
   - **Problem:** 9 ratio calculations in parallel is good, but could be batched differently
   - **Impact:** Minor - still efficient
   - **Observation:** Agent called 9 separate tools instead of potentially batching by company

### Medium Priority Issues

6. **⚠️ No Report Saved**
   - **Problem:** No final report saved to disk
   - **Impact:** Results only in console, not persisted
   - **Root Cause:** Ran out of turns before saving

7. **⚠️ Verbose Commentary**
   - **Problem:** Agent outputted text between tool calls: "Now I'll calculate all the metrics using mf-calc-simple:"
   - **Impact:** Unnecessary tokens, slower execution
   - **Root Cause:** Despite prompt updates, agent still narrates sometimes

---

## 💡 Recommended Improvements

### Priority 1: Fix Data Schema Documentation

**Problem:** Agent confused about field names and file structures

**Solution:** Update `src/prompts/agent_system_improved.py`

```markdown
# DATA SCHEMAS (MEMORIZE THESE!)

## ⚠️ CRITICAL: Field Naming Convention
**ALL field names use snake_case, NOT camelCase**

Common mappings:
- ✅ `net_income` (not `netIncome`)
- ✅ `free_cash_flow` or `fcf` (not `freeCashFlow`)
- ✅ `total_assets` (not `totalAssets`)
- ✅ `total_debt` (not `totalDebt`)
- ✅ `shareholders_equity` (not `shareholdersEquity`)

## File Structure Differences

### fundamentals_quarterly.json (OBJECT with quarters array)
```json
{
  "ticker": "AAPL",
  "currency": "USD",
  "quarters": [
    {
      "period_end": "2025-06-28",
      "revenue": "94036000000.0",
      "net_income": "23434000000.0",  // ← snake_case!
      "fcf": "24405000000.0"
    }
  ]
}
```
**Path:** `quarters[-1].revenue`

### key_metrics_quarter.json (DIRECT ARRAY)
```json
[
  {
    "date": "2025-06-28",
    "roe": 0.3694,
    "peRatio": 35.54
  }
]
```
**Path:** `[-1].roe` (NOT `quarters[-1].roe`)
```

**Expected Impact:** Eliminate 6 failed tool calls, save 6 turns

---

### Priority 2: Add Comparison Tool to Decision Tree

**Problem:** Agent didn't use `mf-render-comparison` for comparison queries

**Solution:** Update decision tree in system prompt

```markdown
## 🎯 DECISION TREE (Pick the right tool fast)

**Need financial data?** → `mf-market-get` with fields array  
**Have JSON file?** → Don't know structure? `mf-json-inspect` → Know structure? `mf-extract-json` with path  
**Need calculation?** → `mf-calc-simple` (profit margins, ratios, growth, statistics)  
**Have time-series data?** → `mf-chart-data`  
**Comparing companies/metrics?** → `mf-render-comparison` (NEW!)  
**Need SEC filing?** → `mf-documents-get` → `mf-filing-extract` → `mf-qa`  
**Done with analysis?** → `Write` to save report
```

Add detailed section:

```markdown
### 7. mf-render-comparison - Create Comparison Tables ⭐⭐⭐

**Use for:** Comparing multiple companies or time periods

```bash
echo '{
  "title":"Tech Giants Q2 2025 Comparison",
  "entities":["Apple","Microsoft","Google"],
  "rows":[
    {"metric":"Profit Margin","values":["24.92%","35.63%","29.24%"]},
    {"metric":"ROE","values":["36.94%","10.10%","7.21%"]},
    {"metric":"Revenue Growth YoY","values":["9.63%","18.10%","13.79%"]}
  ]
}' | mf-render-comparison
```

**Expected Impact:** Agent will create comparison tables automatically

---

### Priority 3: Increase Max Turns for Complex Queries

**Problem:** 25 turns insufficient for multi-company analysis

**Solution:** Adjust `agent_testing.py` and `agent_service/settings.py`

```python
# For complex queries
max_turns = 35  # Up from 25
```

**Or:** Add dynamic turn allocation based on query complexity

```python
def estimate_turns(query: str) -> int:
    """Estimate required turns based on query complexity."""
    companies = len(re.findall(r'\b(AAPL|MSFT|GOOGL|AMZN|TSLA)\b', query, re.I))
    metrics = len(re.findall(r'\b(margin|growth|ratio|ROE|FCF)\b', query, re.I))
    
    base_turns = 15
    company_turns = companies * 5  # 5 turns per company
    metric_turns = metrics * 2     # 2 turns per metric
    
    return min(base_turns + company_turns + metric_turns, 50)
```

**Expected Impact:** Complex queries complete successfully

---

### Priority 4: Reduce Commentary Between Tool Calls

**Problem:** Agent still narrates despite prompt updates

**Solution:** Strengthen the anti-pattern in system prompt

```markdown
# ANTI-PATTERNS (DO NOT DO THESE!)

❌ **DON'T narrate between tool calls**
   ✓ DO execute tools silently, provide analysis only in final response
   
**WRONG:**
"Now I'll calculate all the metrics using mf-calc-simple:"
<tool call>

**CORRECT:**
<tool call>
<tool call>
<tool call>
... (all calculations)
"Here are the results: ..."
```

**Expected Impact:** 10-15% reduction in tokens, faster execution

---

### Priority 5: Add Batch Calculation Capability

**Problem:** 9 separate ratio calculations (could be more efficient)

**Solution:** Add batch calculation to `mf-calc-simple`

```python
# New batch mode
{
  "op": "batch",
  "operations": [
    {"id": "aapl_margin", "op": "ratio", "numerator": 23434000000, "denominator": 94036000000, "mode": "percent"},
    {"id": "msft_margin", "op": "ratio", "numerator": 27233000000, "denominator": 76441000000, "mode": "percent"},
    {"id": "googl_margin", "op": "ratio", "numerator": 28196000000, "denominator": 96428000000, "mode": "percent"}
  ]
}

# Returns
{
  "ok": true,
  "result": {
    "aapl_margin": {"ratio": 24.92, "formatted": "24.92%"},
    "msft_margin": {"ratio": 35.63, "formatted": "35.63%"},
    "googl_margin": {"ratio": 29.24, "formatted": "29.24%"}
  }
}
```

**Expected Impact:** 9 tool calls → 3 tool calls (67% reduction)

---

## 📊 Performance Summary

### What Worked Well ✅
1. **Parallel data fetching** - 3 companies in one turn
2. **Batch extraction** - 5 values per company in one call
3. **New ratio operations** - Zero manual calculations
4. **Self-correction** - Agent recovered from errors using `mf-json-inspect`

### What Needs Improvement ❌
1. **Field naming confusion** - Wasted 6 tool calls
2. **Incomplete execution** - Hit max turns
3. **No comparison table** - Results not visualized
4. **No report saved** - Results not persisted
5. **Verbose commentary** - Unnecessary narration

---

## 🎯 Expected Impact of Improvements

| Improvement | Current | After | Reduction |
|-------------|---------|-------|-----------|
| **Failed tool calls** | 6 | 0 | 100% |
| **Turns required** | 31 | ~20 | 35% |
| **Tool calls** | 25 | ~15 | 40% |
| **Completion rate** | 0% | 100% | ✅ |
| **Commentary tokens** | ~200 | ~50 | 75% |

---

## 🚀 Next Steps

1. ✅ Implement Priority 1: Fix data schema documentation
2. ✅ Implement Priority 2: Add comparison tool to decision tree
3. ✅ Implement Priority 3: Increase max turns
4. ✅ Test again with same query
5. ✅ Validate improvements

---

## 📝 Conclusion

The agent performed well in many areas (parallel execution, batch extraction, ratio operations), but was hindered by:
1. Incomplete documentation (field naming, file structures)
2. Insufficient turns for complex queries
3. Missing tool recommendations (comparison table)

All issues are fixable with prompt and configuration updates. No code changes required for tools themselves - they work perfectly when used correctly.

**Overall Grade:** B- (Good execution, incomplete due to documentation gaps)
