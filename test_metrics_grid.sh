#!/bin/bash
# Test MetricsGrid end-to-end

set -e

echo "🧪 Testing MetricsGrid Component"
echo "================================"
echo ""

# Test 1: Simple metrics grid
echo "Test 1: Simple 4-metric grid"
echo '{"title":"AAPL Quick View","subtitle":"Q4 2024","metrics":[{"label":"Revenue","value":"$394.3B","change":"+15.2% YoY","trend":"up"},{"label":"EPS","value":"$6.42","change":"+18.3% YoY","trend":"up"},{"label":"P/E Ratio","value":"28.5x","context":"Premium"},{"label":"ROE","value":"156.4%","context":"Excellent"}]}' | bin/mf-render-metrics

echo ""
echo "---"
echo ""

# Test 2: Grid with benchmarks
echo "Test 2: 6-metric grid with benchmarks"
echo '{"title":"MSFT Financial Health","subtitle":"As of Dec 2024","metrics":[{"label":"Market Cap","value":"$3.06T","context":"#2 in Tech"},{"label":"Revenue","value":"$211B","change":"+12.3% YoY","trend":"up"},{"label":"Op Margin","value":"42.2%","context":"Best in class","benchmark":"vs industry 28%"},{"label":"FCF","value":"$65B","change":"+8% YoY","trend":"up"},{"label":"P/E","value":"34.1x","context":"Premium"},{"label":"Debt/Equity","value":"0.42","context":"Conservative"}],"data_sources":["data/market/MSFT/fundamentals_quarterly.json"]}' | bin/mf-render-metrics

echo ""
echo "---"
echo ""

# Test 3: Valuation scenario grid
echo "Test 3: Valuation scenario metrics"
echo '{"title":"NVDA DCF Valuation","subtitle":"3-Scenario Analysis","metrics":[{"label":"Bull Case","value":"$850","change":"+36% upside","trend":"up","context":"AI leadership sustained"},{"label":"Base Case","value":"$700","change":"+12% upside","trend":"up","context":"Market consensus"},{"label":"Bear Case","value":"$550","change":"-12% downside","trend":"down","context":"Competition intensifies"},{"label":"Current Price","value":"$625","trend":"neutral"}],"data_sources":["analysis/tables/dcf_NVDA.json"]}' | bin/mf-render-metrics

echo ""
echo "✅ All tests passed!"

