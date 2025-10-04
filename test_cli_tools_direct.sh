#!/bin/bash
# Direct test of all mf-render-* CLI tools to verify correct output format

cd /Users/karl/work/claude_finance_py

echo "🧪 Testing CLI Tools Direct Output"
echo "========================================"
echo ""

# Test 1: mf-render-metrics
echo "TEST 1: mf-render-metrics"
echo "-------------------------------------------"
result=$(echo '{
  "title": "AAPL Financial Snapshot",
  "subtitle": "Q4 2023",
  "metrics": [
    {"label": "Revenue", "value": "$94.84B", "change": "+2.1% YoY", "trend": "up"},
    {"label": "Net Income", "value": "$21.27B", "change": "+3.7% YoY", "trend": "up"},
    {"label": "Gross Margin", "value": "44.8%", "context": "Strong profitability"},
    {"label": "P/E Ratio", "value": "29.5x", "context": "Premium valuation"},
    {"label": "Free Cash Flow", "value": "$23.5B", "change": "+5.3% YoY", "trend": "up"},
    {"label": "ROE", "value": "146.7%", "context": "Exceptional returns"}
  ],
  "data_sources": ["data/market/AAPL/fundamentals.json"]
}' | ./bin/mf-render-metrics)

echo "Output: $result"
echo ""

# Check if output has correct format
if echo "$result" | jq -e '.ok and .format == "ui_component" and .result.component == "metrics_grid"' > /dev/null 2>&1; then
    echo "✅ PASS: Correct format (ok=true, format=ui_component, component=metrics_grid)"
else
    echo "❌ FAIL: Incorrect format"
    echo "Expected: {ok: true, format: 'ui_component', result: {component: 'metrics_grid', ...}}"
fi
echo ""
echo ""

# Test 2: mf-render-comparison
echo "TEST 2: mf-render-comparison"
echo "-------------------------------------------"
result=$(echo '{
  "title": "Tech Giants Comparison",
  "entities": [
    {"name": "AAPL", "subtitle": "Apple Inc."},
    {"name": "MSFT", "subtitle": "Microsoft"},
    {"name": "GOOGL", "subtitle": "Alphabet"}
  ],
  "rows": [
    {"label": "Market Cap", "values": ["$2.8T", "$2.5T", "$1.7T"]},
    {"label": "Revenue", "values": ["$394B", "$211B", "$307B"]},
    {"label": "P/E Ratio", "values": ["28.5x", "32.1x", "25.3x"]}
  ]
}' | ./bin/mf-render-comparison)

echo "Output: $result"
echo ""

if echo "$result" | jq -e '.ok and .format == "ui_component" and .result.component == "comparison_table"' > /dev/null 2>&1; then
    echo "✅ PASS: Correct format (ok=true, format=ui_component, component=comparison_table)"
else
    echo "❌ FAIL: Incorrect format"
fi
echo ""
echo ""

# Test 3: mf-render-insight
echo "TEST 3: mf-render-insight"
echo "-------------------------------------------"
result=$(echo '{
  "title": "Investment Recommendation",
  "type": "recommendation",
  "summary": "Microsoft presents a compelling investment opportunity.",
  "points": [
    {"text": "Strong fundamentals with consistent revenue growth", "emphasis": "high"},
    {"text": "Premium valuation limits upside potential"},
    {"text": "Consider waiting for a better entry point"}
  ]
}' | ./bin/mf-render-insight)

echo "Output: $result"
echo ""

if echo "$result" | jq -e '.ok and .format == "ui_component" and .result.component == "insight_card"' > /dev/null 2>&1; then
    echo "✅ PASS: Correct format (ok=true, format=ui_component, component=insight_card)"
else
    echo "❌ FAIL: Incorrect format"
fi
echo ""
echo ""

# Test 4: mf-render-timeline
echo "TEST 4: mf-render-timeline"
echo "-------------------------------------------"
result=$(echo '{
  "title": "Revenue Trend",
  "subtitle": "Last 5 Years",
  "series": [
    {
      "name": "Revenue",
      "data": [
        {"date": "2019", "value": 260.17},
        {"date": "2020", "value": 274.52},
        {"date": "2021", "value": 365.82},
        {"date": "2022", "value": 394.33},
        {"date": "2023", "value": 383.29}
      ]
    }
  ]
}' | ./bin/mf-render-timeline)

echo "Output: $result"
echo ""

if echo "$result" | jq -e '.ok and .format == "ui_component" and .result.component == "timeline_chart"' > /dev/null 2>&1; then
    echo "✅ PASS: Correct format (ok=true, format=ui_component, component=timeline_chart)"
else
    echo "❌ FAIL: Incorrect format"
fi
echo ""
echo ""

echo "========================================"
echo "✅ All CLI Tool Tests Complete"
echo "========================================"

