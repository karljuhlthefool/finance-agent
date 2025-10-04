#!/bin/bash

echo "🧪 Testing Agent Visual Tool Usage (Simple Backend Test)"
echo "=========================================================================="

# Test 1: MetricsGrid
echo -e "\n1️⃣  TEST: MetricsGrid"
echo "Query: Create a test metrics grid with 6 sample metrics using mf-render-metrics"
echo "------------------------------------------------------------------------"
curl -X POST http://localhost:5052/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Create a test metrics grid showing: Revenue $394B (+15%), EPS $6.42 (+18%), P/E 28.5x (Premium), Op Margin 42% (Excellent), FCF $113B (+19%), ROE 156% (Best). Use mf-render-metrics tool with proper JSON format."}' \
  2>&1 | grep -E "(mf-render|ui_component|error|Error)" | head -20

sleep 3

# Test 2: ComparisonTable  
echo -e "\n\n2️⃣  TEST: ComparisonTable"
echo "Query: Create comparison table for AAPL vs MSFT vs GOOGL"
echo "------------------------------------------------------------------------"
curl -X POST http://localhost:5052/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Create a comparison table using mf-render-comparison: Compare Apple (Market Cap $3.0T, Revenue $394B, P/E 28.5x), Microsoft (Market Cap $2.8T, Revenue $211B, P/E 34.1x), and Google (Market Cap $1.7T, Revenue $307B, P/E 25.2x). Use proper JSON format with entities and rows arrays."}' \
  2>&1 | grep -E "(mf-render|ui_component|error|Error|entities|rows)" | head -20

sleep 3

# Test 3: InsightCard
echo -e "\n\n3️⃣  TEST: InsightCard"
echo "Query: Create recommendation insight card"
echo "------------------------------------------------------------------------"
curl -X POST http://localhost:5052/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Create a recommendation insight card using mf-render-insight with title Investment Recommendation MSFT, type recommendation, summary Strong buy opportunity, and 3 points about Azure growth, AI integration, and strong balance sheet. Use proper JSON format."}' \
  2>&1 | grep -E "(mf-render|ui_component|error|Error|recommendation|insight)" | head -20

sleep 3

# Test 4: TimelineChart
echo -e "\n\n4️⃣  TEST: TimelineChart"
echo "Query: Create timeline chart with revenue data"
echo "------------------------------------------------------------------------"
curl -X POST http://localhost:5052/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Create a timeline chart using mf-render-timeline showing Revenue series with data points for 2019-2023: 260, 275, 365, 394, 383 billion. Use proper JSON format with series array containing name and data."}' \
  2>&1 | grep -E "(mf-render|ui_component|error|Error|series|timeline)" | head -20

echo -e "\n\n=========================================================================="
echo "✅ All tests sent to agent"
echo "=========================================================================="

