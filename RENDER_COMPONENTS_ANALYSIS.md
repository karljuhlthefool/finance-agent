# Render Components - Usage Analysis

**Date:** October 5, 2025  
**Goal:** Teach agent when to automatically use UI render components

---

## 🎨 Available UI Components

### 1. mf-render-metrics (MetricsGrid)
**Purpose:** Display 4-12 key metrics in a scannable grid format

**When to use automatically:**
- User asks for "snapshot", "overview", "key metrics", "summary"
- Displaying multiple metrics for a single entity (company, scenario)
- Showing current state/status with multiple data points
- Financial health check queries

**Example queries:**
- "Show me Apple's key metrics"
- "What's Tesla's financial snapshot?"
- "Give me an overview of Microsoft"
- "How is Google doing?"

**Structure:**
```json
{
  "title": "AAPL Financial Snapshot",
  "subtitle": "Q2 2025",
  "metrics": [
    {
      "label": "Revenue",
      "value": "$94.0B",
      "change": "+9.6% YoY",
      "trend": "up"
    }
  ]
}
```

---

### 2. mf-render-comparison (ComparisonTable)
**Purpose:** Compare 2-5 entities side-by-side

**When to use automatically:**
- User mentions 2+ companies in same query
- Words like "compare", "vs", "versus", "difference between"
- Asking about relative performance
- "Which is better" type questions

**Example queries:**
- "Compare Apple and Microsoft"
- "Apple vs Google revenue"
- "Which has better margins: AAPL, MSFT, or GOOGL?"
- "Show me tech giants side by side"

**Structure:**
```json
{
  "title": "Tech Giants Comparison",
  "entities": [
    {"name": "Apple", "ticker": "AAPL"},
    {"name": "Microsoft", "ticker": "MSFT"}
  ],
  "rows": [
    {
      "label": "Revenue",
      "values": ["$94.0B", "$76.4B"]
    }
  ]
}
```

---

### 3. mf-render-insight (InsightCard)
**Purpose:** Display structured findings, recommendations, or key takeaways

**When to use automatically:**
- After complex analysis with multiple findings
- When providing recommendations or warnings
- Summarizing key insights from data
- "What should I know about..." queries

**Example queries:**
- "What are the key risks for Apple?"
- "Should I invest in Tesla?"
- "What's your analysis of Microsoft?"
- "Give me the bottom line on Google"

**Structure:**
```json
{
  "title": "Investment Analysis: AAPL",
  "type": "recommendation",
  "summary": "Strong fundamentals with premium valuation",
  "points": [
    {"text": "Excellent profit margins (25%)", "emphasis": "positive"},
    {"text": "Premium valuation (32x P/E)", "emphasis": "neutral"},
    {"text": "Strong market position", "emphasis": "positive"}
  ],
  "conclusion": "Buy for long-term growth"
}
```

---

### 4. mf-render-timeline (TimelineChart)
**Purpose:** Display time-series data with trends

**When to use automatically:**
- Showing data over time (quarters, years)
- Trend analysis queries
- Words like "trend", "over time", "historical", "growth"
- Revenue/earnings progression

**Example queries:**
- "Show me Apple's revenue trend"
- "How has Tesla's margin changed over time?"
- "Microsoft's quarterly performance"
- "Google's growth over the last 2 years"

**Structure:**
```json
{
  "title": "AAPL Revenue Trend",
  "series": [
    {
      "name": "Quarterly Revenue",
      "data": [
        {"date": "2024-Q1", "value": 81797000000},
        {"date": "2024-Q2", "value": 85777000000}
      ]
    }
  ]
}
```

---

## 🎯 Decision Tree for Agent

### Query Pattern Recognition

```
User Query → Analyze Intent → Choose Component

Single company + metrics → mf-render-metrics
Multiple companies → mf-render-comparison
Time-based data → mf-render-timeline
Analysis/recommendations → mf-render-insight
```

### Specific Patterns

**Pattern 1: Single Company Snapshot**
- Triggers: "show", "overview", "snapshot", "key metrics", "how is X doing"
- Component: **mf-render-metrics**
- Metrics to include: Revenue, Profit Margin, ROE, P/E, Market Cap, Debt-to-Equity

**Pattern 2: Multi-Company Comparison**
- Triggers: Multiple tickers mentioned, "compare", "vs", "versus", "which is better"
- Component: **mf-render-comparison**
- Always include: Revenue, Profit Margin, ROE, P/E (most commonly compared)

**Pattern 3: Trend Analysis**
- Triggers: "trend", "over time", "historical", "growth", "quarters", "years"
- Component: **mf-render-timeline**
- Show last 4-8 quarters by default

**Pattern 4: Analysis Summary**
- Triggers: "should I", "analysis", "recommendation", "risks", "bottom line"
- Component: **mf-render-insight**
- Structure: Summary → Key Points → Conclusion

---

## 🚨 Current Problem

**Agent is NOT using these components automatically!**

Test 1: "Show me a financial snapshot of Apple with key metrics"
- Expected: mf-render-metrics
- Actual: Markdown table in text response
- Problem: Agent doesn't know when to use render components

---

## 💡 Solution: Update System Prompt

### Add "UI Component Strategy" Section

Need to teach agent:
1. **When** to use each component (pattern recognition)
2. **How** to structure the data for each component
3. **Why** components are better than markdown tables (interactive, visual, scannable)

### Key Principles

1. **Default to UI Components for Structured Data**
   - Metrics → mf-render-metrics
   - Comparisons → mf-render-comparison
   - Trends → mf-render-timeline
   - Insights → mf-render-insight

2. **Use Markdown Only for Narrative**
   - Explanations, context, analysis text
   - When no structured component fits

3. **Combine Components with Narrative**
   - Component first (visual)
   - Then brief narrative explanation

---

## 📋 Prompt Additions Needed

### 1. Add UI Component Decision Rules

```markdown
# UI Component Strategy

**CRITICAL: Use render components for structured data, not markdown tables!**

## When to Use Each Component

### mf-render-metrics (Single Entity Metrics)
**Automatic triggers:**
- User asks about ONE company's metrics
- Words: "snapshot", "overview", "key metrics", "how is X doing"
- Showing 4-12 metrics for one entity

**Example:** "Show me Apple's key metrics" → Use mf-render-metrics

### mf-render-comparison (Multi-Entity Comparison)
**Automatic triggers:**
- User mentions 2+ companies
- Words: "compare", "vs", "versus", "which is better"
- Side-by-side analysis

**Example:** "Compare Apple and Microsoft" → Use mf-render-comparison

### mf-render-timeline (Time-Series Data)
**Automatic triggers:**
- Showing data over time
- Words: "trend", "over time", "historical", "growth"
- Quarterly/yearly progression

**Example:** "Apple's revenue trend" → Use mf-render-timeline

### mf-render-insight (Analysis Summary)
**Automatic triggers:**
- After complex analysis
- Words: "should I", "recommendation", "risks", "analysis"
- Structured findings

**Example:** "Should I invest in Apple?" → Use mf-render-insight
```

### 2. Add Component Examples

```markdown
## Component Usage Examples

### Example 1: Single Company Snapshot
Query: "Show me Apple's financial snapshot"

Steps:
1. Fetch data (fundamentals, key_metrics, quote)
2. Extract metrics
3. **Use mf-render-metrics** (not markdown!)

```bash
echo '{
  "title": "Apple Inc. (AAPL) Financial Snapshot",
  "subtitle": "Q2 2025",
  "metrics": [
    {"label": "Revenue", "value": "$94.0B", "change": "+9.6% YoY", "trend": "up"},
    {"label": "Profit Margin", "value": "24.92%", "trend": "up"},
    {"label": "ROE", "value": "35.6%", "context": "Excellent"},
    {"label": "P/E Ratio", "value": "32.0x", "context": "Premium"},
    {"label": "Market Cap", "value": "$3.0T"},
    {"label": "Debt-to-Equity", "value": "1.54x", "context": "Moderate"}
  ]
}' | mf-render-metrics
```

### Example 2: Multi-Company Comparison
Query: "Compare Apple, Microsoft, and Google"

Steps:
1. Fetch data for all companies (parallel)
2. Extract same metrics for each
3. **Use mf-render-comparison** (not markdown!)

```bash
echo '{
  "title": "Tech Giants Comparison",
  "subtitle": "Q2 2025 Performance",
  "entities": [
    {"name": "Apple", "ticker": "AAPL"},
    {"name": "Microsoft", "ticker": "MSFT"},
    {"name": "Google", "ticker": "GOOGL"}
  ],
  "rows": [
    {"label": "Revenue", "values": ["$94.0B", "$76.4B", "$96.4B"]},
    {"label": "Profit Margin", "values": ["24.92%", "35.63%", "29.24%"]},
    {"label": "ROE", "values": ["35.6%", "42.1%", "28.3%"]},
    {"label": "P/E Ratio", "values": ["32.0x", "34.5x", "28.7x"]}
  ]
}' | mf-render-comparison
```
```

### 3. Add Anti-Pattern

```markdown
## Anti-Patterns

❌ **DON'T use markdown tables for structured metrics**
   ✓ DO use mf-render-metrics or mf-render-comparison

Example WRONG:
```
| Metric | Value |
|--------|-------|
| Revenue | $94.0B |
| Profit Margin | 24.92% |
```

Example CORRECT:
```bash
echo '{"title":"AAPL Snapshot","metrics":[...]}' | mf-render-metrics
```

**Why components are better:**
- Interactive and scannable
- Consistent visual design
- Better mobile experience
- Automatic formatting and styling
```

---

## 🎯 Expected Improvements

After prompt updates:

### Test 1: Single Company Snapshot
**Query:** "Show me Apple's financial snapshot"

**Before:**
- Uses markdown table
- 0 render component calls

**After:**
- Uses mf-render-metrics
- 1 render component call
- Better visual presentation

### Test 2: Multi-Company Comparison
**Query:** "Compare Apple, Microsoft, and Google"

**Before:**
- Uses markdown table or text
- 0 render component calls

**After:**
- Uses mf-render-comparison
- 1 render component call
- Side-by-side visual comparison

### Test 3: Trend Analysis
**Query:** "Show me Apple's revenue trend over the last 8 quarters"

**Before:**
- Text description or markdown
- 0 render component calls

**After:**
- Uses mf-render-timeline
- 1 render component call
- Visual chart with trend line

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| **Component Usage Rate** | >80% for structured data queries |
| **Correct Component Selection** | >90% accuracy |
| **User Satisfaction** | Better visual presentation |
| **Markdown Table Usage** | <20% (only for narrative) |

---

**Status:** Analysis complete, ready to implement prompt improvements
