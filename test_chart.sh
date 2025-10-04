#!/bin/bash
# Test script for mf-chart-data CLI tool

set -e

echo "🧪 Testing mf-chart-data CLI tool..."
echo ""

# Set workspace
export WORKSPACE_ABS_PATH="$(pwd)/runtime/workspace"

# Test 1: Line chart (quarterly revenue)
echo "📊 Test 1: Line Chart (Quarterly Revenue)"
echo '{"chart_type":"line","series":[{"x":"Q1 2024","y":81797000000},{"x":"Q2 2024","y":85777000000},{"x":"Q3 2024","y":94036000000},{"x":"Q4 2024","y":124630000000}],"title":"Apple Quarterly Revenue FY2024","x_label":"Quarter","y_label":"Revenue","format_y":"currency","ticker":"AAPL"}' | ./bin/mf-chart-data
echo ""
echo "✅ Line chart test passed"
echo ""

# Test 2: Bar chart (growth rates)
echo "📊 Test 2: Bar Chart (Annual Growth Rates)"
echo '{"chart_type":"bar","series":[{"x":"2020","y":5.5},{"x":"2021","y":33.3},{"x":"2022","y":7.8},{"x":"2023","y":-2.8},{"x":"2024","y":2.0}],"title":"Apple Annual Revenue Growth","x_label":"Year","y_label":"Growth Rate","format_y":"percent","ticker":"AAPL"}' | ./bin/mf-chart-data
echo ""
echo "✅ Bar chart test passed"
echo ""

# Test 3: Pie chart (segment breakdown)
echo "📊 Test 3: Pie Chart (Revenue by Segment)"
echo '{"chart_type":"pie","series":[{"name":"iPhone","value":200.5},{"name":"Mac","value":29.4},{"name":"iPad","value":28.3},{"name":"Wearables","value":37.0},{"name":"Services","value":85.2}],"title":"Apple Revenue by Segment (FY2024)","format_y":"currency","ticker":"AAPL"}' | ./bin/mf-chart-data
echo ""
echo "✅ Pie chart test passed"
echo ""

# Test 4: Area chart (revenue trend)
echo "📊 Test 4: Area Chart (Annual Revenue Trend)"
echo '{"chart_type":"area","series":[{"x":"2020","y":274515000000},{"x":"2021","y":365817000000},{"x":"2022","y":394328000000},{"x":"2023","y":383285000000},{"x":"2024","y":391035000000}],"title":"Apple Annual Revenue Trend","x_label":"Year","y_label":"Revenue","format_y":"currency","ticker":"AAPL"}' | ./bin/mf-chart-data
echo ""
echo "✅ Area chart test passed"
echo ""

# Test 5: Combo chart (revenue + margin)
echo "📊 Test 5: Combo Chart (Revenue & Margin)"
echo '{"chart_type":"combo","series":[{"x":"2020","y":274.5},{"x":"2021","y":365.8},{"x":"2022","y":394.3},{"x":"2023","y":383.3},{"x":"2024","y":391.0}],"secondary_series":[{"x":"2020","y":38.2},{"x":"2021","y":41.8},{"x":"2022","y":43.3},{"x":"2023","y":44.1},{"x":"2024","y":46.2}],"title":"Revenue ($B) vs Gross Margin (%)","x_label":"Year","y_label":"Revenue ($B)","series_name":"Revenue","format_y":"currency","ticker":"AAPL"}' | ./bin/mf-chart-data
echo ""
echo "✅ Combo chart test passed"
echo ""

# Test 6: Error handling (missing required field)
echo "📊 Test 6: Error Handling (Missing series)"
echo '{"chart_type":"line","title":"Should Fail"}' | ./bin/mf-chart-data || echo "✅ Error handling works correctly"
echo ""

echo "🎉 All chart tests passed!"
echo ""
echo "📁 Chart configs saved to: runtime/workspace/analysis/charts/"
ls -lh runtime/workspace/analysis/charts/ | tail -5

