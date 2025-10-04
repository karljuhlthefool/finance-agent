# MetricsGrid QuickStart Guide

## What Is It?

MetricsGrid lets the agent show 4-12 metrics in a beautiful, scannable grid instead of boring text paragraphs.

---

## How To Use It (As The Agent)

### Step 1: Extract the metrics you want to show

From your data files, extract 4-12 key numbers. Each metric needs:
- **label** (required): "Revenue", "P/E Ratio", "ROE", etc.
- **value** (required): "$394B", "28.5x", "156%", etc.
- **change** (optional): "+15.2% YoY", "↑110bps"
- **trend** (optional): "up" | "down" | "neutral"
- **context** (optional): "Premium", "Excellent", "Strong"
- **benchmark** (optional): "vs industry 22x"

### Step 2: Output your description (5-8 words)

```
Presenting AAPL financial snapshot
```

### Step 3: Call the tool

```bash
echo '{"title":"AAPL Financial Snapshot","subtitle":"Q4 2024","metrics":[{"label":"Revenue","value":"$394B","change":"+15.2% YoY","trend":"up"},{"label":"EPS","value":"$6.42","change":"+18.3% YoY","trend":"up"},{"label":"P/E Ratio","value":"28.5x","context":"Premium"},{"label":"ROE","value":"156%","context":"Excellent"}]}' | /absolute/path/to/bin/mf-render-metrics
```

### Step 4: Add brief context (1-2 sentences)

```
Apple shows strong growth across all key metrics with best-in-class profitability. 
Valuation remains at a premium to historical averages.
```

---

## Visual Examples

### Example 1: Company Snapshot (8 metrics)

**Input:**
```json
{
  "title": "Apple Inc. (AAPL)",
  "subtitle": "Q4 2024 Financials",
  "metrics": [
    {"label": "Revenue", "value": "$394.3B", "change": "+15.2% YoY", "trend": "up"},
    {"label": "EPS", "value": "$6.42", "change": "+18.3% YoY", "trend": "up"},
    {"label": "Op Margin", "value": "30.1%", "change": "+110bps", "trend": "up"},
    {"label": "P/E Ratio", "value": "28.5x", "context": "Premium", "benchmark": "vs 22x avg"},
    {"label": "ROE", "value": "156.4%", "context": "Excellent"},
    {"label": "Debt/Equity", "value": "1.98", "context": "Moderate"},
    {"label": "Current Ratio", "value": "1.04", "context": "Tight"},
    {"label": "FCF Yield", "value": "3.8%", "change": "-40bps", "trend": "down"}
  ]
}
```

**Renders:**
```
┌────────────────────────────────────────────────────────┐
│ 📊 Apple Inc. (AAPL)                      [8 metrics] │
│    Q4 2024 Financials                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  REVENUE        EPS            OP MARGIN     P/E RATIO│
│  $394.3B       $6.42           30.1%         28.5x    │
│  ↑ +15.2% YoY  ↑ +18.3% YoY   ↑ +110bps    Premium   │
│                                              vs 22x avg│
│                                                        │
│  ROE            DEBT/EQUITY    CURRENT RATIO FCF YIELD│
│  156.4%        1.98            1.04          3.8%     │
│  Excellent     Moderate        Tight         ↓ -40bps │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Example 2: Valuation Scenarios (4 metrics)

**Input:**
```json
{
  "title": "NVDA DCF Valuation",
  "subtitle": "3-Scenario Analysis",
  "metrics": [
    {"label": "Bull Case", "value": "$850", "change": "+36% upside", "trend": "up", "context": "AI leadership sustained"},
    {"label": "Base Case", "value": "$700", "change": "+12% upside", "trend": "up", "context": "Market consensus"},
    {"label": "Bear Case", "value": "$550", "change": "-12% downside", "trend": "down", "context": "Competition intensifies"},
    {"label": "Current Price", "value": "$625", "trend": "neutral"}
  ]
}
```

**Renders:**
```
┌────────────────────────────────────────────────────────┐
│ 📊 NVDA DCF Valuation                     [4 metrics] │
│    3-Scenario Analysis                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  BULL CASE              BASE CASE                     │
│  $850                   $700                          │
│  ↑ +36% upside         ↑ +12% upside                 │
│  AI leadership          Market consensus              │
│                                                        │
│  BEAR CASE              CURRENT PRICE                 │
│  $550                   $625                          │
│  ↓ -12% downside                                      │
│  Competition intensifies                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Example 3: Peer Comparison (6 metrics)

**Input:**
```json
{
  "title": "MSFT vs Industry",
  "subtitle": "Tech Sector Comparison",
  "metrics": [
    {"label": "Market Cap", "value": "$3.06T", "context": "#2 in Tech"},
    {"label": "Revenue Growth", "value": "+12.3%", "trend": "up", "benchmark": "vs industry +8%"},
    {"label": "Op Margin", "value": "42.2%", "context": "Best in class", "benchmark": "vs industry 28%"},
    {"label": "P/E Ratio", "value": "34.1x", "context": "Premium", "benchmark": "vs industry 26x"},
    {"label": "ROE", "value": "43.8%", "context": "Strong", "benchmark": "vs industry 28%"},
    {"label": "FCF Yield", "value": "3.1%", "context": "Healthy"}
  ]
}
```

---

## When To Use MetricsGrid

### ✅ USE IT FOR:

- **Company snapshots** - "Show me AAPL's key metrics"
- **Valuation summaries** - After running DCF, show bull/base/bear
- **Financial health checks** - Show 6-8 core financial ratios
- **Post-data fetch** - After mf-market-get, show the numbers visually
- **Quick comparisons** - Show key metrics side-by-side

### ❌ DON'T USE IT FOR:

- **Single numbers** - Just say "$394B revenue" in text
- **Too many metrics** - 16+ is overwhelming, use multiple grids
- **Narrative explanations** - Use text for "why" and "how"
- **Time-series data** - Use charts for trends over time (not grids)

---

## Pro Tips

### Tip 1: Group Related Metrics

```json
// Good: Logical grouping
[
  {"label": "Revenue", ...},      // Top line
  {"label": "Op Margin", ...},    // Profitability
  {"label": "FCF", ...},          // Cash generation
  {"label": "P/E Ratio", ...},    // Valuation
  {"label": "Debt/Equity", ...},  // Financial health
  {"label": "ROE", ...}           // Returns
]
```

### Tip 2: Use Trends Effectively

```json
// Green for positive changes
{"label": "Revenue", "value": "$100B", "change": "+15% YoY", "trend": "up"}

// Red for negative changes  
{"label": "Margin", "value": "25%", "change": "-200bps", "trend": "down"}

// Neutral for no change or current values
{"label": "P/E Ratio", "value": "25x", "trend": "neutral"}
```

### Tip 3: Add Context for Interpretation

```json
// Help users understand what the number means
{"label": "P/E Ratio", "value": "28.5x", "context": "Premium", "benchmark": "vs industry 22x"}
{"label": "ROE", "value": "156%", "context": "Exceptional"}
{"label": "Debt/Equity", "value": "0.42", "context": "Conservative"}
```

### Tip 4: Don't Repeat Yourself

```
❌ WRONG:
<calls mf-render-metrics>
"Revenue is $394B up 15%, EPS is $6.42 up 18%..." 
// Don't repeat what's in the card!

✅ RIGHT:
<calls mf-render-metrics>
"Apple demonstrates strong growth with excellent profitability."
// Add insight, not repetition
```

---

## Testing Your MetricsGrid

### Quick Test (Manual)

```bash
cd /path/to/project

# Test basic grid
echo '{"title":"Test","metrics":[{"label":"Rev","value":"$100B"},{"label":"EPS","value":"$5"}]}' | bin/mf-render-metrics

# Should output:
# {"ok": true, "result": {"component": "metrics_grid", ...}}
```

### Visual Test (Browser)

1. Start services: `./START_SERVICES.sh`
2. Open browser: `http://localhost:3031`
3. Ask agent: "Show me a test metrics grid for AAPL"
4. Verify the card renders beautifully

---

## Common Mistakes

### Mistake 1: Missing Required Fields

```json
❌ {"metrics": [{"label": "Revenue"}]}  // Missing 'value'
❌ {"metrics": [{"value": "$100B"}]}    // Missing 'label'
✅ {"metrics": [{"label": "Revenue", "value": "$100B"}]}
```

### Mistake 2: Invalid Trend

```json
❌ {"trend": "positive"}     // Invalid
❌ {"trend": "increasing"}   // Invalid
✅ {"trend": "up"}           // Valid
✅ {"trend": "down"}         // Valid  
✅ {"trend": "neutral"}      // Valid
```

### Mistake 3: Too Many Metrics

```json
❌ 20 metrics in one grid    // Overwhelming
✅ 8 metrics in one grid     // Perfect
✅ 2 grids of 10 metrics each // If needed
```

---

## Complete Workflow Example

**User:** "Give me a quick view of AAPL's financials"

**Agent Response:**

```
Fetching comprehensive AAPL market data
<calls mf-market-get with fields=["fundamentals","key_metrics","quote"]>

Extracting latest quarterly data
<calls mf-extract-json on fundamentals>

Presenting AAPL financial snapshot
<calls mf-render-metrics with 8 metrics>

Apple demonstrates exceptionally strong performance across all dimensions. 
Revenue and earnings growth remain robust at 15%+, while maintaining 
industry-leading profitability with 30% operating margins and 156% ROE. 
The stock trades at a premium valuation (P/E of 28.5x vs industry 22x), 
reflecting this quality, though this leaves limited margin for error.
```

**User sees:** Beautiful grid + insightful context

---

## Summary

MetricsGrid transforms financial data presentation from this:

> "Apple reported revenue of $394.3B, up 15.2% year-over-year, with EPS of $6.42, up 18.3%. Operating margin expanded 110 basis points to 30.1%. The company maintains a P/E ratio of 28.5x, above the industry average of 22x. ROE stands at 156.4%, reflecting exceptional capital efficiency. Debt-to-equity is 1.98, moderate for the sector. Current ratio is 1.04, somewhat tight. Free cash flow yield of 3.8% decreased 40 basis points..."

To this:

> **[Beautiful 8-metric grid]**
> 
> "Apple demonstrates strong growth with best-in-class profitability. Valuation remains at a premium."

**That's the power of visual components!** 🎉

