# Agent Testing Analysis Report
**Date:** October 5, 2025  
**Testing Tool:** `agent_testing.py`  
**Model Tested:** Claude Sonnet 4.5 & Haiku 3.5

---

## Executive Summary

Tested the Claude Finance Agent with progressively complex queries to identify performance issues, inefficiencies, and behavioral patterns. The agent demonstrates **mixed performance** - it handles simple queries well but shows significant inefficiencies in tool usage, data extraction, and multi-step workflows.

### Key Findings:
1. ❌ **Critical Issue**: Agent often describes tool commands instead of executing them
2. ⚠️ **Performance**: Slow LLM-based extraction (23s) when deterministic parsing would suffice
3. ⚠️ **Data Schema**: Agent repeatedly tries wrong JSON paths before discovering correct structure
4. ✅ **Strengths**: Good at market data fetching and chart creation when it actually executes tools

---

## Test Results

### Test 1: Simple Math Query
**Query:** "What is 2 + 2?"  
**Model:** Haiku  
**Duration:** 6.9s  
**Cost:** $0.018  
**Tool Calls:** 0 ❌

#### Behavior:
```
Agent Response: "I'll use the mf-calc-simple tool to perform this calculation deterministically.

"Computing simple addition"
echo '{"op":"delta","current":4,"previous":0","mode":"percent"}' | /Users/karl/work/claude_finance_py/bin/mf-calc-simple

The answer is 4. 2 + 2 = 4."
```

#### Analysis:
- **CRITICAL ISSUE**: Agent described the bash command but never executed it
- The agent returned the correct answer (4) but without actually calling any tools
- This suggests the system prompt may be encouraging "show don't do" behavior
- **Inefficiency**: Spent 6.9s and $0.018 to answer a trivial question

#### Root Cause:
The agent is in "explanation mode" rather than "execution mode". It's treating the tools as examples to show the user rather than actions to perform.

---

### Test 2: Stock Price Query
**Query:** "What is Apple's current stock price?"  
**Model:** Sonnet  
**Duration:** 14.0s  
**Cost:** $0.137  
**Tool Calls:** 1 ✅  
**Turns:** 3

#### Execution Flow:
1. **Turn 1** (5.0s): Agent plans to fetch data
2. **Turn 2** (1.6s): Executes `mf-market-get` → Success (2.3s execution)
3. **Turn 3** (4.6s): Reads cached quote data and formats response

#### Tool Call:
```bash
echo '{"ticker":"AAPL","fields":["quote","profile"],"format":"concise"}' | mf-market-get
```

#### Analysis:
- ✅ **Success**: Agent correctly fetched and returned stock price ($246.43)
- ✅ **Efficiency**: Single tool call, no retries
- ⚠️ **Cost**: $0.137 for a simple lookup seems high
- ⚠️ **Latency**: 14s total (5s thinking, 2.3s tool, 4.6s formatting)
- ✅ **Data Handling**: Agent correctly read the cached quote.json file

#### Optimization Opportunities:
1. Agent could cache the quote data in context to avoid re-reading
2. The 5s initial planning seems excessive for such a simple query
3. Could use haiku for simple lookups (would cost ~$0.02 instead of $0.14)

---

### Test 3: Price Chart Creation
**Query:** "Get Apple's stock price and create a chart showing the last 30 days"  
**Model:** Sonnet  
**Duration:** 54.3s  
**Cost:** $0.065  
**Tool Calls:** 3  
**Turns:** 7

#### Execution Flow:
1. **Turn 1** (4.1s): Planning
2. **Turn 2** (1.7s): Fetch market data → **3.0s execution** ✅
3. **Turn 3** (2.6s): Extract 30 days of data → **23.9s execution** ⚠️
4. **Turn 4** (2.6s): Create chart → **1.4s execution** ✅
5. **Turn 5** (7.1s): Format final response

#### Critical Performance Issue:
**Tool 2 - JSON Extraction took 23.9 seconds!**

```bash
echo '{"json_file":"...prices_1y.json","instruction":"Return the last 30 days..."}'
| mf-extract-json
```

**Why so slow?**
- Used LLM-based extraction (`claude-3-5-haiku-latest`) for a simple array slice
- Cost: $0.037 just for extraction
- This should have been a deterministic JSONPath operation (< 100ms)

#### Analysis:
- ⚠️ **Major Inefficiency**: 44% of total time (23.9s / 54.3s) spent on LLM extraction
- ⚠️ **Cost**: $0.037 for extraction that should be free
- ✅ **Success**: Chart was created correctly
- ✅ **Data Quality**: Agent provided good summary with price range and trend analysis

#### Optimization Opportunities:
1. **Use JSONPath for simple extractions**: `points[-30:]` would be instant
2. **Teach agent about data structure**: Agent should know `points` array exists
3. **Pre-compute common queries**: Last 30 days is a common request
4. **Batch operations**: Could extract and chart in one step

---

### Test 4: Stock Comparison (Partial)
**Query:** "Compare Apple and Microsoft's stock performance over the last quarter"  
**Model:** Sonnet  
**Status:** Timed out after 120s ⏱️

#### Execution Flow (before timeout):
1. **Turn 1**: Fetch AAPL 3m data → 3.9s ✅
2. **Turn 2**: Fetch MSFT 3m data → 5.3s ✅
3. **Turn 3-6**: Try to extract prices with wrong JSON path (`historical`) → 4 failures ❌
4. **Turn 7**: Inspect JSON structure with `mf-json-inspect` → 1.2s ✅
5. **Turn 8+**: Agent discovered correct path (`points`) but test was terminated

#### Critical Issues:
1. **Schema Discovery Problem**: Agent tried `historical[0].close` 4 times before checking structure
2. **No Learning**: Each retry used the same wrong path
3. **Slow Recovery**: Took 12.3s of failed attempts before using `mf-json-inspect`
4. **Parallel Failures**: All 4 extractions failed simultaneously (good parallelism, bad paths)

#### Analysis:
- ❌ **Schema Knowledge**: Agent doesn't know the data structure it's working with
- ⚠️ **Error Handling**: Agent eventually recovered but took too long
- ✅ **Parallelism**: Agent correctly parallelized fetching AAPL and MSFT data
- ⚠️ **Complexity**: Multi-stock comparison is significantly harder than single stock

#### Root Causes:
1. **System Prompt Issue**: Doesn't document the JSON schema for market data
2. **No Schema Cache**: Agent rediscovers structure every session
3. **Poor Error Messages**: Tool errors don't suggest correct alternatives
4. **No Examples**: System prompt lacks examples of common extraction patterns

---

## Performance Metrics Summary

| Test | Duration | Cost | Tool Calls | Success | Efficiency |
|------|----------|------|------------|---------|------------|
| Test 1: Math | 6.9s | $0.018 | 0 | ❌ No execution | Very Poor |
| Test 2: Stock Price | 14.0s | $0.137 | 1 | ✅ Correct | Moderate |
| Test 3: Chart | 54.3s | $0.065 | 3 | ✅ Correct | Poor (23s waste) |
| Test 4: Comparison | 120s+ | ~$0.20 | 7+ | ❌ Timeout | Very Poor |

### Cost Breakdown (Test 3 - Most Detailed):
- **Market Data Fetch**: $0.00 (cached)
- **LLM Extraction**: $0.037 (57% of total cost!)
- **Chart Creation**: $0.00 (deterministic)
- **Agent Thinking**: $0.028 (43% of total cost)
- **Total**: $0.065

---

## Identified Problems

### 1. Agent Doesn't Execute Tools (Critical)
**Severity:** 🔴 Critical  
**Impact:** Agent is useless if it just describes commands

**Evidence:**
- Test 1: Agent wrote bash command in text but didn't execute it
- This is a fundamental behavior issue

**Possible Causes:**
- System prompt encourages explanation over execution
- Agent SDK configuration issue
- Model trying to be "helpful" by showing what it would do

**Recommended Fix:**
```python
# In system prompt:
"IMPORTANT: You must EXECUTE tools, not describe them.
When you need to use a tool, call it immediately.
Never write bash commands in your text response - use the Bash tool instead."
```

### 2. Slow LLM-Based Extraction
**Severity:** 🟡 High  
**Impact:** 44% of execution time wasted, unnecessary costs

**Evidence:**
- Test 3: 23.9s to extract 30 items from array
- Cost: $0.037 for simple array slice

**Root Cause:**
- `mf-extract-json` uses LLM for "instruction" mode
- Agent doesn't know when to use JSONPath vs LLM extraction

**Recommended Fix:**
1. Update system prompt with decision tree:
   ```
   Use JSONPath (path="...") for:
   - Array slicing: points[-30:]
   - Key access: points[0].close
   - Simple filters
   
   Use LLM (instruction="...") for:
   - Complex transformations
   - Conditional logic
   - Aggregations
   ```

2. Add examples to system prompt showing both modes

3. Consider adding a "smart" mode to `mf-extract-json` that auto-detects

### 3. Schema Discovery Inefficiency
**Severity:** 🟡 High  
**Impact:** Multiple failed attempts, wasted time

**Evidence:**
- Test 4: Tried `historical` path 4 times before checking structure
- Each failure took 2-4 seconds

**Root Cause:**
- Agent doesn't know market data schema
- No schema documentation in system prompt
- Agent doesn't learn from previous sessions

**Recommended Fix:**
1. Add schema reference to system prompt:
   ```markdown
   ## Market Data Schema
   
   prices_*.json:
   {
     "ticker": "AAPL",
     "currency": "USD",
     "points": [
       {"date": "YYYY-MM-DD", "close": "123.45", "open": "...", ...}
     ]
   }
   
   quote.json:
   {
     "symbol": "AAPL",
     "price": 123.45,
     "change": 1.23,
     ...
   }
   ```

2. Add `mf-json-inspect` to the "first resort" tools for unknown structures

3. Consider caching schema discoveries across sessions

### 4. High Thinking Time
**Severity:** 🟢 Medium  
**Impact:** 30-40% of total time spent planning

**Evidence:**
- Test 2: 5s initial planning for simple query
- Test 3: 7.1s formatting final response

**Analysis:**
This is partially acceptable (agent needs to think), but seems excessive for simple queries.

**Recommended Fix:**
- Use Haiku for simple queries (faster, cheaper)
- Add "fast mode" flag for time-sensitive requests
- Optimize system prompt to reduce unnecessary planning

### 5. No Caching/Learning
**Severity:** 🟢 Medium  
**Impact:** Repeated work across sessions

**Evidence:**
- Agent rediscovers schema every time
- No memory of previous successful patterns

**Recommended Fix:**
- Implement session memory for schema discoveries
- Cache common query patterns
- Add "workspace memory" file with learned schemas

---

## System Prompt Issues

### Current Problems:

1. **Too Verbose**: 872 lines of system prompt
   - Agent spends time processing huge context
   - Costs more per query
   - Harder to find relevant information

2. **Missing Critical Info**:
   - No data schemas
   - No decision trees for tool selection
   - Few concrete examples

3. **Encourages Description Over Execution**:
   - Phrases like "you can call" instead of "call"
   - Too much explanation of what tools do
   - Not enough "just do it" energy

### Recommended Changes:

```markdown
# CRITICAL RULES (put at top)
1. EXECUTE tools immediately - never describe bash commands in text
2. Use JSONPath for simple extractions (fast, free)
3. Use LLM extraction only for complex transformations
4. Check mf-json-inspect if you get "key not found" errors

# DATA SCHEMAS (add section)
[Include common schemas here]

# EXAMPLES (add more)
[Show successful tool usage patterns]
```

---

## Tool-Specific Issues

### `mf-extract-json`
**Problem:** Agent overuses expensive LLM mode

**Fix Options:**
1. Make JSONPath the default, require explicit flag for LLM mode
2. Add auto-detection: try JSONPath first, fall back to LLM
3. Better error messages: "Try JSONPath: points[-30:]"

### `mf-market-get`
**Status:** ✅ Works well

**Minor Issue:** Agent doesn't always know what ranges are available (1d, 1m, 3m, 1y, 5y)

### `mf-chart-data`
**Status:** ✅ Works well

**Minor Issue:** Agent manually constructs series data when it could pass file paths

---

## Recommendations Priority

### 🔴 Critical (Do Immediately)
1. **Fix non-execution behavior** - Agent must actually call tools
2. **Add data schemas to system prompt** - Prevent repeated schema discovery
3. **Optimize mf-extract-json usage** - Add decision tree for when to use LLM vs JSONPath

### 🟡 High Priority (Do Soon)
4. **Reduce system prompt verbosity** - Make it more actionable, less descriptive
5. **Add caching for common queries** - Last 30 days, current price, etc.
6. **Improve error messages** - Tools should suggest correct alternatives

### 🟢 Medium Priority (Nice to Have)
7. **Add session memory** - Remember schemas and patterns
8. **Implement fast mode** - Use Haiku for simple queries
9. **Add more examples** - Show successful patterns in system prompt

---

## Testing Tool Evaluation

### `agent_testing.py` - Excellent! ✅

**Strengths:**
- Clear, colored output showing execution flow
- Captures all tool calls with arguments and results
- Shows timing for each step
- Saves detailed JSON logs for analysis
- 1000 char truncation prevents overwhelming output
- Easy to use with wrapper script

**Suggestions:**
- Add diff mode to compare two test runs
- Add benchmark mode to test same query multiple times
- Add cost tracking across multiple tests
- Consider adding flamegraph visualization of time spent

---

## Conclusion

The agent has **solid infrastructure** but **poor execution patterns**. The main issues are:

1. **Behavioral**: Agent describes instead of executes (critical bug)
2. **Efficiency**: Uses expensive LLM operations for simple tasks
3. **Knowledge**: Lacks schema awareness, rediscovers structure repeatedly
4. **Speed**: Too much thinking time for simple queries

**Good News:** All issues are fixable through:
- System prompt improvements
- Tool usage guidelines
- Schema documentation
- Better examples

**Estimated Impact of Fixes:**
- **Speed**: 2-3x faster (eliminate LLM extraction waste)
- **Cost**: 50-70% reduction (use JSONPath, cache results)
- **Reliability**: 90%+ success rate (fix execution, add schemas)

The testing tool (`agent_testing.py`) is excellent and should be used regularly to validate improvements.
