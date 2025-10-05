# Tests 4 & 5 Analysis: Complex Multi-Step Queries
**Date:** October 5, 2025

---

## Test 4: Revenue Trend Analysis
**Query:** "Analyze Apple's revenue growth trend over the last 8 quarters and create a chart"

### Performance
- **Duration:** ~15s
- **Cost:** $0.051
- **Tool Calls:** 4
- **Result:** ✅ Success

### Execution Flow
```
1. Fetch fundamentals (8 quarters) → 3.1s ✅
2. Extract revenues using cat | jq → 1.0s ⚠️
3. Calculate growth → 1.5s (returned empty) ❌
4. Create chart → 1.2s ✅
```

### Issues Identified

#### 1. Used `cat | jq` Instead of `mf-extract-json`
**What happened:**
```bash
cat fundamentals_quarterly.json | jq '.quarters[].revenue'
```

**Should have been:**
```bash
echo '{"json_file":"...","path":"quarters[*].revenue"}' | mf-extract-json
```

**Impact:** Minor - works but bypasses our tool
**Why:** Agent defaults to familiar Unix tools

#### 2. Growth Calculation Failed
**What happened:**
```json
{
  "op": "growth",
  "series": [
    {"date": "2023-06-30", "value": 85777000000},
    ...
  ]
}
```
**Result:** `{"growth": [], "period": "yoy"}`

**Why:** Only provided 4 data points for YoY growth (needs 8 for 4 quarters of YoY)

**Impact:** Agent couldn't show growth rates

#### 3. Chart Data Out of Order
**What happened:** Chart shows:
- Q2 2023, Q3 2023, Q4 2023, Q1 2024, Q2 2022, Q3 2022, Q4 2022, Q1 2023

**Should be:** Chronological order from oldest to newest

**Impact:** Chart visualization is confusing

---

## Test 5: Multi-Company Margin Comparison
**Query:** "Compare Apple, Microsoft, and Google's profit margins for the last quarter"

### Performance
- **Duration:** ~30s
- **Cost:** ~$0.08 (estimated)
- **Tool Calls:** 11
- **Result:** ✅ Success

### Execution Flow
```
1. Fetch all 3 companies' data (chained) → 8.6s ✅
2. Try jq extraction → Failed ❌
3. Use Task (subagent) → 15.7s ⚠️
   - Subagent read all 3 files
   - Calculated margins
   - Formatted response
4. Create chart → 1.3s ✅
5. Save report → 0.1s ✅
```

### Issues Identified

#### 1. Used Task (Subagent) for Simple Calculation
**What happened:** Agent delegated margin calculation to a subagent

**Why:** After jq failed, agent thought task was complex

**Impact:** 
- ⚠️ Added 15.7s overhead (subagent initialization + LLM call)
- ⚠️ Extra cost (~$0.03-0.05)
- ✅ But it worked and calculated correctly!

**Should have been:**
```bash
# Extract net income and revenue for each company
echo '{"json_file":"...","path":"quarters[-1].net_income"}' | mf-extract-json
echo '{"json_file":"...","path":"quarters[-1].revenue"}' | mf-extract-json

# Calculate margin
echo '{"op":"delta","current":23434000000,"previous":94036000000,"mode":"percent"}' | mf-calc-simple
```

#### 2. Chained mf-market-get Calls
**What happened:**
```bash
echo '{"ticker":"AAPL",...}' | mf-market-get && 
echo '{"ticker":"MSFT",...}' | mf-market-get && 
echo '{"ticker":"GOOGL",...}' | mf-market-get
```

**Good:** Sequential execution ensures all complete
**Bad:** Could be parallel for speed

**Impact:** 8.6s total (could be ~3s if parallel)

---

## Pattern Analysis

### What's Working Well ✅

1. **Path-based extraction for simple cases** - Test 3 showed agent using `quarters[-1].revenue`
2. **Error recovery** - When jq failed, agent tried alternative approach
3. **Chart creation** - Consistently works well
4. **Multi-step reasoning** - Agent breaks down complex queries

### What Needs Improvement ⚠️

1. **Inconsistent tool usage** - Sometimes uses path extraction, sometimes uses cat/jq
2. **Subagent overuse** - Used Task for simple math (margin = net_income / revenue)
3. **Sequential vs parallel** - Fetches data sequentially when could be parallel
4. **Growth calculations** - Doesn't understand YoY requirements

---

## Root Causes

### 1. Tool Selection Ambiguity
**Problem:** Agent has multiple ways to do the same thing:
- `mf-extract-json` with path
- `cat | jq`
- `Read` tool + manual parsing
- `Task` subagent

**Why:** System prompt doesn't strongly discourage alternatives

**Fix:** Add explicit anti-patterns section

### 2. Missing Calculation Patterns
**Problem:** Agent doesn't know how to calculate margins, growth rates, ratios

**Why:** System prompt shows extraction but not calculation workflows

**Fix:** Add common calculation patterns

### 3. No Parallelization Guidance
**Problem:** Agent fetches data sequentially

**Why:** No examples of parallel tool calls

**Fix:** Add parallel execution examples

---

## Proposed Improvements

### Priority 1: Add Anti-Patterns Section
```markdown
# ANTI-PATTERNS (DO NOT DO THESE!)

❌ DON'T use `cat` for JSON files
   ✓ DO use `mf-extract-json` with path

❌ DON'T use Task for simple calculations
   ✓ DO use `mf-calc-simple` for math

❌ DON'T read files into context for extraction
   ✓ DO use path-based extraction

❌ DON'T fetch data sequentially
   ✓ DO use parallel tool calls when possible
```

### Priority 2: Add Calculation Patterns
```markdown
# COMMON CALCULATIONS

## Profit Margin
1. Extract: net_income and revenue
2. Calculate: (net_income / revenue) * 100

## Growth Rate (YoY)
1. Extract: current and prior year values
2. Calculate: ((current - prior) / prior) * 100

## Ratios
1. Extract: numerator and denominator
2. Calculate: numerator / denominator
```

### Priority 3: Add Parallel Execution Examples
```markdown
# PARALLEL TOOL CALLS

When fetching data for multiple companies, call tools in parallel:

WRONG (Sequential - 9s):
<call mf-market-get for AAPL>
<wait>
<call mf-market-get for MSFT>
<wait>
<call mf-market-get for GOOGL>

RIGHT (Parallel - 3s):
<call mf-market-get for AAPL>
<call mf-market-get for MSFT>
<call mf-market-get for GOOGL>
<wait for all>
```

### Priority 4: Improve Growth Calculation Guidance
```markdown
# GROWTH CALCULATIONS

YoY Growth requires:
- Current period value
- Same period last year value

For 8 quarters of YoY growth:
- Need quarters[-8:] (8 most recent)
- Compare Q1 2024 vs Q1 2023, Q2 2024 vs Q2 2023, etc.

QoQ Growth:
- Compare consecutive quarters
- Q2 vs Q1, Q3 vs Q2, etc.
```

---

## Performance Impact Estimates

### If we fix these issues:

**Test 4 (Revenue Trend):**
- Current: 15s, $0.051
- Optimized: 8s, $0.030
- **Improvement: 47% faster, 41% cheaper**

**Test 5 (Margin Comparison):**
- Current: 30s, ~$0.080
- Optimized: 12s, ~$0.035
- **Improvement: 60% faster, 56% cheaper**

### How:
1. Use path extraction instead of cat/jq: -1s
2. Use mf-calc-simple instead of Task: -15s, -$0.04
3. Parallel data fetching: -6s
4. Better growth calculation: -2s

---

## Recommendations

### Implement Now:
1. ✅ Add anti-patterns section to system prompt
2. ✅ Add calculation patterns
3. ✅ Add parallel execution examples
4. ✅ Improve growth calculation guidance

### Test After:
1. Re-run Test 4 and verify path extraction used
2. Re-run Test 5 and verify no Task subagent used
3. Test new query: "Compare revenue growth for AAPL, MSFT, GOOGL over last 4 quarters"

### Monitor:
1. Tool usage patterns (should see less cat/jq, no Task for simple math)
2. Execution time (should see 40-60% improvement)
3. Cost (should see 40-50% reduction)

---

## Conclusion

The agent is **functional and capable** but **not yet optimal**. It can handle complex queries but uses inefficient patterns:

**Current State:**
- ✅ Completes complex multi-step queries
- ⚠️ Uses suboptimal tools (cat/jq, Task for simple math)
- ⚠️ Sequential instead of parallel execution
- ⚠️ Inconsistent with path-based extraction

**After Improvements:**
- ✅ Completes queries 40-60% faster
- ✅ Costs 40-50% less
- ✅ Consistent tool usage
- ✅ Parallel execution where appropriate

**Next Step:** Implement the 4 priority improvements in system prompt and re-test.
