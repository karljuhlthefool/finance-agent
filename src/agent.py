#!/usr/bin/env python3
"""
Main agent runner for Claude Finance.
Interactive CLI mode using Claude Agent SDK.
"""
import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
)

from prompts.agent_system import AGENT_SYSTEM
from util.workspace import ensure_workspace
from hooks import AgentHooks


# Workspace root
WORKSPACE = Path(os.getenv("WORKSPACE_ABS_PATH", "./runtime/workspace")).resolve()
ensure_workspace(WORKSPACE)

# Project root (where bin/ tools are located)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# Initialize hooks
hooks = AgentHooks(WORKSPACE)


def truncate_output(text: str, max_length: int = 500) -> str:
    """Truncate large outputs for logging to avoid console spam."""
    if len(text) <= max_length:
        return text
    return text[:max_length] + f"... [{len(text)} chars total]"


class UsageTracker:
    """Track token usage and costs from agent and tools."""
    
    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost_usd = 0.0
        self.tool_costs = []
        self.agent_messages = []
    
    def add_tool_usage(self, tool_output: str):
        """Parse metrics from tool JSON output and accumulate usage."""
        try:
            data = json.loads(tool_output)
            if 'metrics' in data:
                metrics = data['metrics']
                input_tokens = metrics.get('input_tokens', 0)
                output_tokens = metrics.get('output_tokens', 0)
                cost = metrics.get('cost_usd', 0.0)
                
                if input_tokens or output_tokens or cost:
                    self.total_input_tokens += input_tokens
                    self.total_output_tokens += output_tokens
                    self.total_cost_usd += cost
                    self.tool_costs.append({
                        'cost': cost,
                        'tokens_in': input_tokens,
                        'tokens_out': output_tokens
                    })
        except:
            pass  # Tool output might not be JSON
    
    def add_agent_message(self, message: str):
        """Track agent messages for usage estimation."""
        self.agent_messages.append(message)
    
    def estimate_agent_usage(self, model: str = 'sonnet'):
        """Estimate main agent usage from message lengths."""
        # Rough estimate: 1 token ≈ 4 characters
        total_chars = sum(len(msg) for msg in self.agent_messages)
        estimated_tokens = total_chars // 4
        
        # Assume 60% input (user + system + tool results), 40% output (agent responses)
        input_tokens = int(estimated_tokens * 0.6)
        output_tokens = int(estimated_tokens * 0.4)
        
        if model == 'sonnet' or 'sonnet' in model.lower():
            cost = (input_tokens / 1_000_000 * 3.0) + (output_tokens / 1_000_000 * 15.0)
        else:  # haiku
            cost = (input_tokens / 1_000_000 * 0.25) + (output_tokens / 1_000_000 * 1.25)
        
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_cost_usd += cost


async def main():
    """Run interactive agent CLI."""
    
    # Verify API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("❌ ANTHROPIC_API_KEY not set in environment")
        return
    
    # Ensure WORKSPACE_ABS_PATH is set to absolute path for tools
    os.environ["WORKSPACE_ABS_PATH"] = str(WORKSPACE)
    
    # Parse command line args for initial query
    initial_query = None
    if len(sys.argv) > 1:
        initial_query = " ".join(sys.argv[1:])
    
    print(f"\n{'='*70}")
    print(f"🚀 Claude Finance Agent - Interactive Mode")
    print(f"{'='*70}")
    print(f"📁 Workspace: {WORKSPACE}")
    print(f"📂 Project Root: {PROJECT_ROOT}")
    print(f"🔑 Anthropic API: {'✓' if os.getenv('ANTHROPIC_API_KEY') else '✗'}")
    print(f"💰 FMP API: {'✓' if os.getenv('FMP_API_KEY') else '✗'}")
    print(f"📊 SEC API: {'✓' if os.getenv('SEC_API_API_KEY') else '✗'}")
    print(f"💼 CapIQ: {'✓' if os.getenv('CIQ_LOGIN') and os.getenv('CIQ_PASSWORD') else '✗'}")
    print(f"{'='*70}\n")
    
    if not initial_query:
        print("💡 Usage: python src/agent.py \"<your request>\"")
        print("   Example: python src/agent.py \"Analyze Apple's latest 10-K filing\"")
        print("\n❌ No query provided. Exiting.")
        return
    
    # Inject dynamic paths into system prompt
    enhanced_system_prompt = f"""# ENVIRONMENT SETUP
Your current working directory (CWD) is: {WORKSPACE}
The CLI tools are located at: {PROJECT_ROOT}/bin/

IMPORTANT: To call any tool, use the FULL PATH from your CWD.
Example: `echo '{{"op":"delta","current":150,"previous":100}}' | {PROJECT_ROOT}/bin/mf-calc-simple`

DO NOT search for tool paths - they are always at {PROJECT_ROOT}/bin/mf-<tool-name>

{AGENT_SYSTEM}"""

    # Configure agent options
    options = ClaudeAgentOptions(
        cwd=str(WORKSPACE),
        model=os.getenv("AGENT_MODEL", "sonnet"),
        system_prompt=enhanced_system_prompt,
        allowed_tools=["Bash", "Read", "Write", "Glob", "Grep"],
        max_turns=int(os.getenv("MAX_TURNS", "50")),
    )
    
    try:
        print(f"🔍 Query: {initial_query}\n")
        print(f"{'='*70}\n")
        
        # Initialize usage tracker
        usage_tracker = UsageTracker()
        
        # Use the simple query() function which returns an async generator
        turn_count = 0
        last_agent_message = ""
        
        async for message in query(prompt=initial_query, options=options):
            # Handle different message types from SDK
            if isinstance(message, AssistantMessage):
                # Agent is thinking/responding
                for block in message.content:
                        block_type = getattr(block, 'type', None)
                        
                        if block_type == 'text' or hasattr(block, 'text'):
                            # Text block
                            text = block.text if hasattr(block, 'text') else str(block)
                            print(f"\n🤖 Agent:\n{text}")
                            last_agent_message = text
                            usage_tracker.add_agent_message(text)
                        
                        elif block_type == 'tool_use' or hasattr(block, 'name'):
                            # Tool use block
                            tool_name = block.name if hasattr(block, 'name') else 'unknown'
                            tool_input = block.input if hasattr(block, 'input') else {}
                            
                            # Truncate large tool inputs for clean logging
                            if isinstance(tool_input, dict):
                                if tool_name == "Bash":
                                    cmd = tool_input.get("command", "")
                                    print(f"\n🔧 Tool: {tool_name}")
                                    print(f"   Command: {truncate_output(cmd, 200)}")
                                elif tool_name == "Read":
                                    path = tool_input.get("path", "")
                                    print(f"\n🔧 Tool: {tool_name}")
                                    print(f"   Reading: {path}")
                                elif tool_name == "Write":
                                    path = tool_input.get("path", "")
                                    content_data = tool_input.get("content", "")
                                    print(f"\n🔧 Tool: {tool_name}")
                                    print(f"   Writing to: {path} ({len(str(content_data))} chars)")
                                else:
                                    print(f"\n🔧 Tool: {tool_name}")
                                    print(f"   Input: {truncate_output(str(tool_input), 200)}")
                            turn_count += 1
                        
                        elif block_type == 'tool_result' or hasattr(block, 'content'):
                            # Tool result embedded in assistant message
                            output = block.content if hasattr(block, 'content') else str(block)
                            is_error = getattr(block, 'is_error', False)
                            
                            # Track usage from tool output
                            usage_tracker.add_tool_usage(str(output))
                            
                            # Truncate large tool outputs
                            if is_error:
                                print(f"   ✗ Error: {truncate_output(str(output), 300)}")
                            else:
                                truncated = truncate_output(str(output), 300)
                                print(f"   ✓ Output: {truncated}")
            
            elif isinstance(message, ResultMessage):
                # Final result - estimate agent usage and display totals
                model_name = os.getenv("AGENT_MODEL", "sonnet")
                usage_tracker.estimate_agent_usage(model=model_name)
                
                print(f"\n{'='*70}")
                print(f"✅ ANALYSIS COMPLETE")
                print(f"{'='*70}")
                
                runtime_ms = message.runtime_ms if hasattr(message, 'runtime_ms') else 0
                
                print(f"⏱️  Duration: {runtime_ms}ms ({runtime_ms/1000:.1f}s)")
                print(f"🔄 Turns: {turn_count}")
                print(f"💰 Total Cost: ${usage_tracker.total_cost_usd:.4f}")
                print(f"📊 Total Tokens: {usage_tracker.total_input_tokens:,} in / {usage_tracker.total_output_tokens:,} out")
                
                # Show breakdown if there were tool costs
                if usage_tracker.tool_costs:
                    tool_cost_sum = sum(t['cost'] for t in usage_tracker.tool_costs)
                    print(f"   └─ Tool costs: ${tool_cost_sum:.4f} ({len(usage_tracker.tool_costs)} tool(s) with LLM usage)")
                
                # Use last agent message as final response
                if last_agent_message:
                    print(f"\n{'='*70}")
                    print(f"📋 FINAL RESPONSE:")
                    print(f"{'='*70}\n")
                    print(last_agent_message)
                    
                    # Save report
                    if hooks.auto_save_reports and len(last_agent_message.split()) > 20:
                        report_path = hooks.save_final_report(last_agent_message)
                        if report_path:
                            print(f"\n📝 Report saved: {report_path}")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
