#!/bin/bash
# Simple test to see what the agent actually does when asked to use visual tools

echo "🧪 Testing Agent Response to Visual Tool Request"
echo "========================================"
echo ""

echo "Sending query: 'Create a test metrics grid using mf-render-metrics'"
echo ""

# Save response to file for inspection
curl -X POST http://localhost:5052/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Execute this exact bash command:\necho '"'"'{\"title\":\"Test\",\"metrics\":[{\"label\":\"Revenue\",\"value\":\"$100B\"}]}'"'"' | ./bin/mf-render-metrics\n\nDo not modify the command. Just run it exactly as shown."}' \
  --no-buffer \
  -s \
  > /tmp/agent_response.json

echo "Response saved to /tmp/agent_response.json"
echo ""
echo "Checking for tool calls..."
echo ""

# Check if mf-render-metrics was called
if grep -q "mf-render-metrics" /tmp/agent_response.json; then
    echo "✅ Found 'mf-render-metrics' in response!"
else
    echo "❌ Did NOT find 'mf-render-metrics' in response"
fi

# Check if ui_component format was returned
if grep -q "ui_component" /tmp/agent_response.json; then
    echo "✅ Found 'ui_component' format in response!"
else
    echo "❌ Did NOT find 'ui_component' format in response"
fi

# Check if metrics_grid component was returned
if grep -q "metrics_grid" /tmp/agent_response.json; then
    echo "✅ Found 'metrics_grid' component in response!"
else
    echo "❌ Did NOT find 'metrics_grid' component in response"
fi

echo ""
echo "First 20 lines of response:"
echo "----------------------------"
head -20 /tmp/agent_response.json | cat

echo ""
echo "========================================"

