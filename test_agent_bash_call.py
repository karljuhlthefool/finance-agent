#!/usr/bin/env python3
"""
Test script to send a very explicit request to the agent to use Bash to call mf-render-metrics.
"""
import requests
import json
import time

BASE_URL = "http://localhost:5052"

def test_explicit_bash_call():
    print("🧪 Testing Explicit Bash Call to mf-render-metrics")
    print("="*80)
    
    # Very explicit instructions
    query = """I want you to execute this EXACT bash command:

echo '{"title":"Test Metrics","metrics":[{"label":"Revenue","value":"$100B"}]}' | ./bin/mf-render-metrics

Just run that command exactly as written. Do NOT fetch any data. Do NOT create your own JSON. Just copy and execute that exact command."""
    
    print(f"\nQuery: {query}\n")
    print("Sending request...")
    print("-"*80)
    
    try:
        response = requests.post(
            f"{BASE_URL}/query",
            json={"prompt": query},
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}\n")
        
        if response.status_code != 200:
            print(f"❌ Error: {response.text}")
            return
        
        # Stream the response
        tool_calls = []
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line.decode('utf-8'))
                    
                    if data.get('type') == 'message' and data.get('role') == 'assistant':
                        content = data.get('content', '')
                        if content:
                            print(f"💬 Agent: {content[:200]}...")
                    
                    elif data.get('type') == 'data':
                        event = data.get('event', {})
                        if event.get('type') == 'tool_call':
                            tool_name = event['data'].get('name')
                            tool_args = event['data'].get('args', {})
                            print(f"\n🔧 Tool Called: {tool_name}")
                            if tool_name == "Bash":
                                command = tool_args.get('command', '')
                                print(f"   Command: {command[:150]}")
                                if 'mf-render-metrics' in command:
                                    print("   ✅ Calling mf-render-metrics!")
                                tool_calls.append({
                                    'name': tool_name,
                                    'command': command
                                })
                        
                        elif event.get('type') == 'tool_result':
                            result = event['data'].get('result', {})
                            print(f"\n📊 Tool Result:")
                            print(f"   ok: {result.get('ok')}")
                            print(f"   format: {result.get('format')}")
                            if result.get('result'):
                                component = result['result'].get('component')
                                print(f"   component: {component}")
                                if component == 'metrics_grid':
                                    print("   ✅ MetricsGrid component returned!")
                
                except json.JSONDecodeError:
                    continue
        
        print("\n" + "="*80)
        print(f"✅ Test Complete - {len(tool_calls)} tool calls detected")
        
        # Summary
        bash_calls = [t for t in tool_calls if t['name'] == 'Bash']
        metrics_calls = [t for t in tool_calls if 'mf-render-metrics' in t.get('command', '')]
        
        print(f"\nSummary:")
        print(f"  - Bash calls: {len(bash_calls)}")
        print(f"  - mf-render-metrics calls: {len(metrics_calls)}")
        
        if len(metrics_calls) > 0:
            print("\n✅ SUCCESS: Agent called mf-render-metrics via Bash!")
        else:
            print("\n❌ FAILED: Agent did NOT call mf-render-metrics")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_explicit_bash_call()

