# Model Comparison Analysis: Haiku vs Sonnet

## Executive Summary

After implementing the description parameter fix and testing with both Haiku and Sonnet models, we discovered that **model capability is the primary factor** in reliable tool execution. Sonnet consistently executes tools correctly, while Haiku struggles despite explicit system prompt instructions.

## Test Results

### Haiku (claude-3-5-haiku-20241022)

#### Test 1: Simple Query - "What is Apple's current stock price?"
**Result:** ❌ FAILED
- Agent output text describing commands instead of executing them
- No tool calls made
- Cost: $0.0027
- Behavior: Outputted `echo '{"ticker":"AAPL",...}' | mf-market-get` as text

#### Test 2: Complex Query - "Compare Apple and Microsoft's profit margins"
**Result:** ❌ FAILED
- Agent output plain text commands without executing
- No tool calls made
- Cost: $0.0106
- Behavior: Listed all commands as text, provided manual calculations

**Haiku Success Rate: 0%**

### Sonnet (claude-sonnet-4-5-20250929)

#### Test 1: Simple Query - "What is Apple's current stock price?"
**Result:** ✅ SUCCESS
- 4 tool calls with descriptions
- Self-corrected when encountering errors
- Used `mf-json-inspect` to understand structure
- Successfully extracted price: $258.02
- Cost: $0.1348
- Turns: 5

#### Test 2: Complex Query - "Compare Apple and Microsoft's profit margins"
**Result:** ✅ SUCCESS
- 10 tool calls with descriptions
- Parallel execution (AAPL + MSFT fetched simultaneously)
- Self-corrected field name errors (netIncome → net_income)
- Calculated profit margins: AAPL 24.9%, MSFT 35.6%
- Cost: $0.0880
- Turns: 9

#### Test 3: Highly Complex Query - "Analyze Apple's revenue growth over 4 quarters and create chart"
**Result:** ✅ SUCCESS
- 4 tool calls with descriptions
- Fetched 4 quarters of data
- Used path-based extraction (`quarters[-4:]`)
- Calculated growth with `mf-calc-simple`
- Created chart with `mf-chart-data`
- Provided insightful analysis with seasonal patterns
- Cost: $0.0946
- Turns: 6

**Sonnet Success Rate: 100%**

## Key Differences

### Tool Execution Reliability

| Aspect | Haiku | Sonnet |
|--------|-------|--------|
| Tool Calls | 0% success | 100% success |
| Description Parameter | N/A (no calls) | Always included |
| Self-Correction | N/A | Excellent |
| Error Recovery | N/A | Uses `mf-json-inspect` |
| Parallel Execution | No | Yes |

### Cost Comparison

| Query Type | Haiku | Sonnet | Difference |
|------------|-------|--------|------------|
| Simple | $0.0027 (failed) | $0.1348 | +$0.132 |
| Complex | $0.0106 (failed) | $0.0880 | +$0.077 |
| Highly Complex | N/A | $0.0946 | N/A |

**Note:** Haiku appears cheaper but **delivers no value** since it doesn't execute tools. Sonnet is more expensive but **actually works**.

### Behavior Patterns

**Haiku:**
- Outputs commands as text: `echo '{"ticker":"AAPL",...}' | mf-market-get`
- Provides manual calculations in response
- Ignores system prompt instructions about tool execution
- Sometimes outputs raw XML: `<function_calls><invoke name="Bash">...`
- Inconsistent - works on first turn, fails on subsequent turns

**Sonnet:**
- Consistently calls tools with proper syntax
- Always includes description parameter
- Self-corrects when encountering errors
- Uses `mf-json-inspect` to understand data structures
- Executes tools in parallel when appropriate
- Provides clean, insightful final summaries

## Root Cause Analysis

### Why Haiku Fails

1. **Model Capability Limitation**: Haiku is optimized for speed/cost, not complex instruction following
2. **Tool Execution Confusion**: Struggles to distinguish between "describe tool" vs "execute tool"
3. **Context Switching**: Works on first turn, fails on subsequent turns after seeing tool results
4. **Prompt Sensitivity**: Even explicit warnings don't prevent text mode behavior

### Why Sonnet Succeeds

1. **Strong Instruction Following**: Reliably follows system prompt directives
2. **Tool Awareness**: Understands when to use tools vs when to respond with text
3. **Self-Correction**: Automatically uses `mf-json-inspect` when encountering errors
4. **Parallel Execution**: Intelligently calls multiple tools in same turn
5. **Consistent Behavior**: Maintains tool execution mode across all turns

## System Prompt Effectiveness

Despite extensive system prompt improvements:
- ⚠️ Warning at top: "YOU MUST USE TOOLS, NOT DESCRIBE THEM"
- ❌ Anti-pattern: "DON'T output `<function_calls>` XML as text"
- ✅ Examples: Correct vs wrong tool usage patterns
- 📋 Detailed schemas and workflows

**Result:** Sonnet follows instructions perfectly, Haiku ignores them.

**Conclusion:** System prompt quality matters, but **model capability is the bottleneck**.

## Recommendations

### For Production Use

1. **Use Sonnet for agent workflows** - It's the only model that reliably executes tools
2. **Haiku is not suitable** for this agent architecture (despite lower cost)
3. **Cost vs Value**: Sonnet's higher cost is justified by 100% success rate

### Cost Optimization Strategies

If cost is a concern:
1. **Use Sonnet with prompt caching** - Reduce repeated context costs
2. **Optimize system prompt length** - Currently 640+ lines, could be condensed
3. **Batch similar queries** - Amortize initialization costs
4. **Consider Haiku only for simple, non-tool tasks** - Text generation, summarization

### Future Testing

1. Test with Claude Opus (if even higher quality needed)
2. Test Sonnet with even more complex multi-step workflows
3. Measure Sonnet's performance on edge cases
4. Explore hybrid approach (Sonnet for planning, Haiku for execution)

## Conclusion

The description parameter fix was necessary but not sufficient. The real breakthrough came from testing with Sonnet, which revealed that **model capability is the primary determinant of success**.

**For this agent architecture:**
- ✅ **Use Sonnet** - Reliable, self-correcting, parallel execution
- ❌ **Avoid Haiku** - Unreliable tool execution despite lower cost

The additional cost of Sonnet ($0.08-0.13 per query) is worth it for:
- 100% success rate
- Self-correction and error recovery
- Parallel tool execution
- Insightful analysis and clean outputs

**Next Steps:** Continue testing Sonnet with increasingly complex queries to identify any remaining edge cases or optimization opportunities.
