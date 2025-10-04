#!/usr/bin/env python3
"""
Direct test of the agent calling visual tools.
Simpler approach - just call the CLI tools directly to verify they work.
"""
import subprocess
import json

def test_cli_tool(tool_name, input_data, description):
    """Test a CLI tool directly."""
    print(f"\n{'='*80}")
    print(f"Testing: {tool_name}")
    print(f"Purpose: {description}")
    print(f"{'='*80}\n")
    
    try:
        # Call the CLI tool
        result = subprocess.run(
            [f"./bin/{tool_name}"],
            input=json.dumps(input_data),
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = json.loads(result.stdout)
            if output.get('ok'):
                print(f"✅ SUCCESS")
                print(f"   Format: {output.get('format')}")
                print(f"   Component: {output.get('result', {}).get('component')}")
                
                # Check if it has the ui_component format
                if output.get('format') == 'ui_component':
                    print(f"   ✅ Returns ui_component format - Agent can use this!")
                    return True
                else:
                    print(f"   ⚠️  Does not return ui_component format")
                    return False
            else:
                print(f"❌ Tool returned ok=False")
                print(f"   Error: {output.get('error')}")
                return False
        else:
            print(f"❌ Tool failed with return code {result.returncode}")
            print(f"   Error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

print("🧪 Testing CLI Tools Directly")
print("="*80)
print("This verifies that all visual tools work and return ui_component format")
print("="*80)

results = {}

# Test 1: MetricsGrid
results['metrics'] = test_cli_tool(
    'mf-render-metrics',
    {
        "title": "Tech Company Snapshot",
        "subtitle": "Q4 2024",
        "metrics": [
            {"label": "Revenue", "value": "$394B", "change": "+15%", "trend": "up"},
            {"label": "EPS", "value": "$6.42", "change": "+18%", "trend": "up"},
            {"label": "P/E", "value": "28.5x", "context": "Premium"},
            {"label": "Op Margin", "value": "42%", "context": "Excellent"},
            {"label": "FCF", "value": "$113B", "change": "+19%", "trend": "up"},
            {"label": "ROE", "value": "156%", "context": "Best"}
        ]
    },
    "MetricsGrid with 6 metrics"
)

# Test 2: ComparisonTable
results['comparison'] = test_cli_tool(
    'mf-render-comparison',
    {
        "title": "Tech Giants Comparison",
        "entities": [
            {"name": "AAPL"},
            {"name": "MSFT", "highlight": True},
            {"name": "GOOGL"}
        ],
        "rows": [
            {"label": "Market Cap", "values": ["$3.0T", "$2.8T", "$1.7T"]},
            {"label": "Revenue", "values": ["$394B", "$211B", "$307B"]},
            {"label": "P/E Ratio", "values": ["28.5x", "34.1x", "25.2x"]}
        ]
    },
    "ComparisonTable with 3 entities"
)

# Test 3: InsightCard
results['insight'] = test_cli_tool(
    'mf-render-insight',
    {
        "title": "Investment Recommendation: MSFT",
        "type": "recommendation",
        "summary": "Strong buy opportunity",
        "points": [
            {"text": "Azure growth accelerating at 25% YoY"},
            {"text": "AI integration creating competitive moat"},
            {"text": "Strong balance sheet with $100B+ cash"}
        ],
        "conclusion": "Recommend BUY with $425 target"
    },
    "InsightCard with recommendation"
)

# Test 4: TimelineChart
results['timeline'] = test_cli_tool(
    'mf-render-timeline',
    {
        "title": "Revenue Trend",
        "y_label": "$ Billions",
        "series": [
            {
                "name": "Revenue",
                "data": [
                    {"date": "2019", "value": 260},
                    {"date": "2020", "value": 275},
                    {"date": "2021", "value": 365},
                    {"date": "2022", "value": 394},
                    {"date": "2023", "value": 383}
                ]
            }
        ]
    },
    "TimelineChart with 5 data points"
)

# Summary
print(f"\n{'='*80}")
print("SUMMARY")
print(f"{'='*80}")
for tool, success in results.items():
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"  {tool:15} {status}")

all_pass = all(results.values())
if all_pass:
    print(f"\n✅ ALL TOOLS WORKING - Agent can use them!")
else:
    print(f"\n⚠️  Some tools failed - need to fix before agent can use them")

print(f"{'='*80}")

