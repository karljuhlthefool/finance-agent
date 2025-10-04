#!/usr/bin/env python3
"""
Test the agent's ability to use visual rendering tools.
Makes direct API calls to the backend to test in isolation.
"""
import requests
import json
import time

BASE_URL = "http://localhost:5052"

def test_agent_query(query, description):
    """Send a query to the agent and examine the response."""
    print(f"\n{'='*80}")
    print(f"TEST: {description}")
    print(f"{'='*80}")
    print(f"Query: {query}\n")
    
    try:
        response = requests.post(
            f"{BASE_URL}/query",
            json={"query": query},
            stream=True,
            timeout=60
        )
        
        tool_calls = []
        agent_texts = []
        errors = []
        
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8').replace('data: ', ''))
                    event = data.get('event')
                    
                    if event == 'agent.text':
                        agent_texts.append(data.get('text', ''))
                    
                    elif event == 'agent.tool-start':
                        tool_info = {
                            'tool_id': data.get('tool_id'),
                            'tool': data.get('tool'),
                            'metadata': data.get('metadata', {})
                        }
                        tool_calls.append(tool_info)
                        print(f"🔧 Tool Called: {tool_info['tool']}")
                        if tool_info['metadata']:
                            print(f"   Metadata: {json.dumps(tool_info['metadata'], indent=2)[:200]}...")
                    
                    elif event == 'agent.tool-result':
                        print(f"✅ Tool Result for: {data.get('tool_id')}")
                        result = data.get('result', {})
                        if isinstance(result, dict):
                            if result.get('format') == 'ui_component':
                                print(f"   📊 UI Component: {result.get('result', {}).get('component')}")
                                print(f"   ✅ SUCCESS - Returned ui_component format!")
                            elif result.get('ok') is False:
                                errors.append(result.get('error', 'Unknown error'))
                                print(f"   ❌ Error: {result.get('error')}")
                    
                    elif event == 'agent.tool-error':
                        error_msg = data.get('error', 'Unknown error')
                        errors.append(error_msg)
                        print(f"❌ Tool Error: {error_msg}")
                
                except json.JSONDecodeError:
                    continue
        
        # Summary
        print(f"\n{'─'*80}")
        print(f"SUMMARY:")
        print(f"  Tools Called: {len(tool_calls)}")
        print(f"  Agent Texts: {len(agent_texts)}")
        print(f"  Errors: {len(errors)}")
        
        # Check for ui_component tools
        visual_tools = [t for t in tool_calls if any(
            x in str(t.get('metadata', {})) for x in 
            ['mf-render-metrics', 'mf-render-comparison', 'mf-render-insight', 'mf-render-timeline']
        )]
        
        if visual_tools:
            print(f"  ✅ Visual Tools Used: {len(visual_tools)}")
            for vt in visual_tools:
                print(f"     - {vt.get('metadata', {}).get('cli_tool', 'unknown')}")
        else:
            print(f"  ⚠️  No visual tools used")
        
        if errors:
            print(f"\n  ❌ ERRORS:")
            for err in errors:
                print(f"     - {err}")
        
        return {
            'success': len(visual_tools) > 0 and len(errors) == 0,
            'tool_calls': tool_calls,
            'visual_tools': visual_tools,
            'errors': errors
        }
        
    except Exception as e:
        print(f"❌ Request Error: {e}")
        return {'success': False, 'errors': [str(e)]}


# Test Cases
print("🧪 Testing Agent's Visual Tool Usage")
print("="*80)

# Test 1: MetricsGrid (should work - already tested)
test_agent_query(
    "Create a test metrics grid showing 6 sample financial metrics for a tech company. Use the mf-render-metrics tool.",
    "MetricsGrid - Explicit tool mention"
)

time.sleep(2)

# Test 2: ComparisonTable (new tool)
test_agent_query(
    "Show me a comparison table with test data comparing Apple, Microsoft, and Google on market cap, revenue, and P/E ratio. Use mf-render-comparison.",
    "ComparisonTable - Explicit tool mention"
)

time.sleep(2)

# Test 3: InsightCard (new tool)
test_agent_query(
    "Give me a recommendation insight card about Microsoft stock with 3 key points. Use mf-render-insight.",
    "InsightCard - Explicit tool mention"
)

time.sleep(2)

# Test 4: TimelineChart (new tool)
test_agent_query(
    "Show me a timeline chart with sample revenue data for the last 5 years. Use mf-render-timeline.",
    "TimelineChart - Explicit tool mention"
)

print("\n" + "="*80)
print("✅ ALL TESTS COMPLETE")
print("="*80)
