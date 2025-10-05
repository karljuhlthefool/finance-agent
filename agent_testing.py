#!/usr/bin/env python3
"""
Agent Testing & Debugging Script
==================================

Purpose:
--------
This script provides a clean, focused way to test the Claude Finance Agent backend
directly without the UI layer. It shows:
  - LLM responses (text blocks)
  - Tool calls (with full arguments)
  - Tool results (with success/error status)
  - Execution flow and timing
  - Token usage and costs

Use this to:
  - Debug agent behavior and tool execution
  - Optimize tool usage patterns
  - Test different prompts and scenarios
  - Identify performance bottlenecks
  - Verify tool call/response flow

Usage:
------
Basic:
    python agent_testing.py "What is Apple's current stock price?"

With options:
    python agent_testing.py "Analyze Tesla's financials" --model haiku --max-turns 30

Options:
    --model MODEL       Model to use (sonnet, haiku, opus) [default: sonnet]
    --max-turns N       Maximum turns [default: 50]
    --verbose           Show full tool outputs (not truncated)
    --no-color          Disable colored output
    --save-log FILE     Save execution log to JSON file

Output Format:
--------------
The console shows a clean, sequential view of:
  1. 🤖 Agent thinking/responses (text blocks)
  2. 🔧 Tool calls (name + arguments)
  3. ✓/✗ Tool results (success/error + data preview)
  4. 📊 Final summary (timing, costs, tokens)

Examples:
---------
Test market data:
    python agent_testing.py "Get Apple's stock price and create a chart"

Test with verbose output:
    python agent_testing.py "Analyze AAPL 10-K" --verbose

Test with haiku (faster/cheaper):
    python agent_testing.py "Quick price check for TSLA" --model haiku

Save execution log:
    python agent_testing.py "Test query" --save-log debug.json

Tips:
-----
- Use --verbose to see full tool outputs and responses (helpful for debugging)
- Use --save-log to capture a JSON log of the entire execution for analysis
- Use --model haiku for faster/cheaper testing during development
- The script shows real-time execution flow, so you can see exactly what the agent is doing
- Look for patterns in tool usage, errors, and response quality
- Compare logs between different prompts to optimize behavior

Common Issues to Debug:
-----------------------
1. Agent not calling tools: Check system prompt and tool availability
2. Tool errors: Look at the tool result error messages and fix tool inputs
3. Slow execution: Check which tools are taking longest (time shown in ms)
4. High costs: Review token usage and consider using haiku for testing
5. Incorrect results: Examine the full tool call chain to find where it went wrong
"""

import os
import sys
import json
import asyncio
import argparse
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load environment - check .env.local first, then .env
PROJECT_ROOT_FOR_ENV = Path(__file__).parent.resolve()
env_local = PROJECT_ROOT_FOR_ENV / ".env.local"
env_file = PROJECT_ROOT_FOR_ENV / ".env"

if env_local.exists():
    load_dotenv(env_local)
elif env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()  # Try default behavior

from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    AssistantMessage,
    ResultMessage,
    UserMessage,
    SystemMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
)

from src.prompts.agent_system_improved import AGENT_SYSTEM
from src.util.workspace import ensure_workspace

# ANSI color codes
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    
    # Foreground colors
    BLACK = '\033[30m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'
    
    # Bright variants
    BRIGHT_BLACK = '\033[90m'
    BRIGHT_RED = '\033[91m'
    BRIGHT_GREEN = '\033[92m'
    BRIGHT_YELLOW = '\033[93m'
    BRIGHT_BLUE = '\033[94m'
    BRIGHT_MAGENTA = '\033[95m'
    BRIGHT_CYAN = '\033[96m'
    BRIGHT_WHITE = '\033[97m'

USE_COLOR = True

def colorize(text: str, color: str) -> str:
    """Apply color to text if colors are enabled."""
    if not USE_COLOR:
        return text
    return f"{color}{text}{Colors.RESET}"

def truncate(text: str, max_len: int = 1000) -> str:
    """Truncate text to max length with ellipsis."""
    if len(text) <= max_len:
        return text
    return text[:max_len] + colorize(f"... [{len(text)} chars total]", Colors.DIM)

def format_json(data: Any, indent: int = 2, max_len: Optional[int] = None) -> str:
    """Format JSON data with optional truncation."""
    json_str = json.dumps(data, indent=indent, default=str)
    if max_len and len(json_str) > max_len:
        return truncate(json_str, max_len)
    return json_str

def print_separator(char: str = "─", width: int = 80, color: str = Colors.DIM):
    """Print a separator line."""
    print(colorize(char * width, color))

def print_header(text: str, emoji: str = ""):
    """Print a section header."""
    print()
    print_separator("═", color=Colors.CYAN)
    header = f"{emoji} {text}" if emoji else text
    print(colorize(header, Colors.BOLD + Colors.CYAN))
    print_separator("═", color=Colors.CYAN)

class ExecutionLog:
    """Track execution for debugging and analysis."""
    
    def __init__(self):
        self.events: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
        self.tool_count = 0
        self.turn_count = 0
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost_usd = 0.0
    
    def add_event(self, event_type: str, data: Dict[str, Any]):
        """Add an event to the log."""
        self.events.append({
            "timestamp": datetime.now().isoformat(),
            "elapsed_ms": int((datetime.now() - self.start_time).total_seconds() * 1000),
            "type": event_type,
            "data": data
        })
    
    def save(self, path: Path):
        """Save execution log to JSON file."""
        log_data = {
            "query_start": self.start_time.isoformat(),
            "query_end": datetime.now().isoformat(),
            "duration_ms": int((datetime.now() - self.start_time).total_seconds() * 1000),
            "tool_count": self.tool_count,
            "turn_count": self.turn_count,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_cost_usd": self.total_cost_usd,
            "events": self.events
        }
        
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(log_data, f, indent=2, default=str)
        
        print(f"\n{colorize('📝 Execution log saved:', Colors.GREEN)} {path}")


async def run_agent_test(
    prompt: str,
    model: str = "haiku",
    max_turns: int = 50,
    verbose: bool = False,
    save_log: Optional[str] = None
):
    """
    Run agent with detailed debugging output.
    
    Args:
        prompt: User query to test
        model: Model to use (sonnet, haiku, opus)
        max_turns: Maximum turns
        verbose: Show full outputs (not truncated)
        save_log: Path to save execution log JSON
    """
    
    # Setup workspace
    WORKSPACE = Path(os.getenv("WORKSPACE_ABS_PATH", "./runtime/workspace")).resolve()
    ensure_workspace(WORKSPACE)
    os.environ["WORKSPACE_ABS_PATH"] = str(WORKSPACE)
    
    PROJECT_ROOT = Path(__file__).parent.resolve()
    
    # Verify API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print(colorize("❌ ANTHROPIC_API_KEY not set in environment", Colors.RED))
        return
    
    # Print configuration
    print_header("🚀 Agent Testing Session", "🧪")
    print(f"{colorize('Query:', Colors.BOLD)} {prompt}")
    print(f"{colorize('Model:', Colors.BOLD)} {model}")
    print(f"{colorize('Max Turns:', Colors.BOLD)} {max_turns}")
    print(f"{colorize('Workspace:', Colors.BOLD)} {WORKSPACE}")
    print(f"{colorize('Verbose:', Colors.BOLD)} {verbose}")
    print()
    
    # Build system prompt with paths
    enhanced_system_prompt = f"""# ENVIRONMENT SETUP
Your current working directory (CWD) is: {WORKSPACE}
The CLI tools are located at: {PROJECT_ROOT}/bin/

IMPORTANT: To call any tool, use the FULL PATH from your CWD.
Example: `echo '{{"op":"delta","current":150,"previous":100}}' | {PROJECT_ROOT}/bin/mf-calc-simple`

DO NOT search for tool paths - they are always at {PROJECT_ROOT}/bin/mf-<tool-name>

{AGENT_SYSTEM}"""
    
    # Configure agent
    options = ClaudeAgentOptions(
        cwd=str(WORKSPACE),
        model=model,
        system_prompt=enhanced_system_prompt,
        allowed_tools=["Bash", "Read", "Write", "Glob", "Grep"],
        max_turns=max_turns,
        permission_mode="bypassPermissions",  # Auto-approve all tool uses
    )
    
    # Initialize execution log
    exec_log = ExecutionLog()
    exec_log.add_event("query_start", {"prompt": prompt, "model": model})
    
    try:
        print_header("🔄 Execution Flow", "")
        
        last_agent_text = ""
        current_tool_id = None
        tool_start_times = {}
        
        async for message in query(prompt=prompt, options=options):
            
            # ============================================================
            # SYSTEM MESSAGE (initialization, MCP status, etc.)
            # ============================================================
            if isinstance(message, SystemMessage):
                subtype = getattr(message, "subtype", "unknown")
                data = getattr(message, "data", {})
                
                exec_log.add_event("system_message", {"subtype": subtype, "data": data})
                
                if subtype == "init":
                    tools = data.get("tools", [])
                    mcp_servers = data.get("mcp_servers", [])
                    print(f"\n{colorize('⚙️  System Initialized', Colors.BRIGHT_BLACK)}")
                    print(f"   Model: {data.get('model', 'unknown')}")
                    print(f"   Tools: {len(tools)} available")
                    if mcp_servers:
                        print(f"   MCP Servers: {len(mcp_servers)}")
                        for server in mcp_servers:
                            status = server.get("status", "unknown")
                            name = server.get("name", "unknown")
                            status_color = Colors.GREEN if status == "connected" else Colors.YELLOW
                            print(f"      - {name}: {colorize(status, status_color)}")
            
            # ============================================================
            # ASSISTANT MESSAGE (agent thinking, tool calls)
            # ============================================================
            elif isinstance(message, AssistantMessage):
                exec_log.turn_count += 1
                
                for block in message.content:
                    
                    # Text block - agent is thinking/responding
                    if isinstance(block, TextBlock):
                        text = block.text
                        last_agent_text = text
                        
                        exec_log.add_event("agent_text", {"text": text})
                        
                        print(f"\n{colorize('🤖 Agent Response:', Colors.BRIGHT_BLUE + Colors.BOLD)}")
                        print_separator()
                        
                        # Show text with smart truncation
                        if verbose:
                            print(text)  # No limit in verbose mode
                        else:
                            print(truncate(text, 1000))  # Default 1000 char limit
                        
                        print_separator()
                    
                    # Tool use block - agent is calling a tool
                    elif isinstance(block, ToolUseBlock):
                        tool_name = block.name
                        tool_args = block.input
                        tool_id = getattr(block, "id", "unknown")
                        
                        current_tool_id = tool_id
                        tool_start_times[tool_id] = datetime.now()
                        
                        exec_log.tool_count += 1
                        exec_log.add_event("tool_call", {
                            "tool_id": tool_id,
                            "tool_name": tool_name,
                            "args": tool_args
                        })
                        
                        print(f"\n{colorize('🔧 Tool Call:', Colors.YELLOW + Colors.BOLD)} {colorize(tool_name, Colors.BRIGHT_YELLOW)}")
                        print(f"   {colorize('ID:', Colors.DIM)} {tool_id[:20]}...")
                        
                        # Show tool arguments
                        if tool_name == "Bash":
                            cmd = tool_args.get("command", "")
                            desc = tool_args.get("description", "")
                            
                            # Show description if present
                            if desc:
                                print(f"   {colorize('Description:', Colors.BOLD)} {colorize(desc, Colors.CYAN)}")
                            
                            print(f"   {colorize('Command:', Colors.BOLD)}")
                            if verbose:
                                # Pretty print for piped commands
                                if " | " in cmd:
                                    parts = cmd.split(" | ")
                                    for i, part in enumerate(parts):
                                        prefix = "      " if i == 0 else "      | "
                                        print(f"{prefix}{part}")
                                else:
                                    print(f"      {cmd}")
                            else:
                                # Default: show with 1000 char limit
                                if " | " in cmd and len(cmd) <= 1000:
                                    parts = cmd.split(" | ")
                                    for i, part in enumerate(parts):
                                        prefix = "      " if i == 0 else "      | "
                                        print(f"{prefix}{part}")
                                else:
                                    print(f"      {truncate(cmd, 1000)}")
                        
                        elif tool_name == "Read":
                            path = tool_args.get("path", "")
                            print(f"   {colorize('Path:', Colors.BOLD)} {path}")
                        
                        elif tool_name == "Write":
                            path = tool_args.get("path", "")
                            content = tool_args.get("content", "")
                            print(f"   {colorize('Path:', Colors.BOLD)} {path}")
                            print(f"   {colorize('Content:', Colors.BOLD)} {len(str(content))} chars")
                            if len(str(content)) <= 1000:
                                print(f"   {colorize('Preview:', Colors.DIM)}")
                                print(f"      {str(content)}")
                            elif not verbose:
                                print(f"   {colorize('Preview:', Colors.DIM)}")
                                print(f"      {truncate(str(content), 1000)}")
                        
                        elif tool_name == "Glob":
                            pattern = tool_args.get("pattern", "")
                            print(f"   {colorize('Pattern:', Colors.BOLD)} {pattern}")
                        
                        elif tool_name == "Grep":
                            pattern = tool_args.get("pattern", "")
                            path = tool_args.get("path", "")
                            print(f"   {colorize('Pattern:', Colors.BOLD)} {pattern}")
                            print(f"   {colorize('Path:', Colors.BOLD)} {path}")
                        
                        else:
                            # Generic tool - show all args
                            print(f"   {colorize('Arguments:', Colors.BOLD)}")
                            if verbose:
                                print(f"      {format_json(tool_args)}")
                            else:
                                print(f"      {format_json(tool_args, max_len=1000)}")
            
            # ============================================================
            # USER MESSAGE (tool results)
            # ============================================================
            elif isinstance(message, UserMessage):
                content = getattr(message, "content", [])
                
                for block in content:
                    if isinstance(block, ToolResultBlock):
                        tool_id = getattr(block, "tool_use_id", "unknown")
                        result_content = getattr(block, "content", None)
                        is_error = getattr(block, "is_error", False)
                        
                        # Calculate execution time
                        exec_time_ms = None
                        if tool_id in tool_start_times:
                            exec_time_ms = int((datetime.now() - tool_start_times[tool_id]).total_seconds() * 1000)
                            del tool_start_times[tool_id]
                        
                        # Parse result content
                        result_data = result_content
                        if isinstance(result_content, str):
                            try:
                                result_data = json.loads(result_content)
                            except:
                                result_data = result_content
                        elif isinstance(result_content, list) and len(result_content) > 0:
                            first_block = result_content[0]
                            if isinstance(first_block, dict):
                                if first_block.get("type") == "json" and "json" in first_block:
                                    result_data = first_block["json"]
                                elif "text" in first_block:
                                    result_data = first_block["text"]
                            elif hasattr(first_block, 'json'):
                                result_data = first_block.json
                            elif hasattr(first_block, 'text'):
                                result_data = first_block.text
                        
                        # Determine if this is actually an error
                        actual_error = is_error or (isinstance(result_data, dict) and result_data.get("ok") == False)
                        
                        exec_log.add_event("tool_result", {
                            "tool_id": tool_id,
                            "is_error": actual_error,
                            "result": result_data,
                            "exec_time_ms": exec_time_ms
                        })
                        
                        # Print result
                        if actual_error:
                            status_icon = colorize("✗", Colors.RED)
                            status_text = colorize("Error", Colors.RED + Colors.BOLD)
                        else:
                            status_icon = colorize("✓", Colors.GREEN)
                            status_text = colorize("Success", Colors.GREEN + Colors.BOLD)
                        
                        print(f"\n{status_icon} {colorize('Tool Result:', Colors.BOLD)} {status_text}")
                        print(f"   {colorize('ID:', Colors.DIM)} {tool_id[:20]}...")
                        
                        if exec_time_ms is not None:
                            print(f"   {colorize('Time:', Colors.DIM)} {exec_time_ms}ms")
                        
                        # Show result data
                        if isinstance(result_data, dict):
                            # Check for common fields
                            if "ok" in result_data:
                                print(f"   {colorize('Status:', Colors.BOLD)} {result_data.get('ok')}")
                            
                            if "error" in result_data and result_data.get("error"):
                                error_msg = result_data["error"]
                                print(f"   {colorize('Error:', Colors.RED)} {error_msg}")
                            
                            if "result" in result_data:
                                print(f"   {colorize('Result:', Colors.BOLD)}")
                                if verbose:
                                    print(f"      {format_json(result_data['result'])}")
                                else:
                                    print(f"      {format_json(result_data['result'], max_len=1000)}")
                            
                            # Show metrics if present
                            if "metrics" in result_data:
                                metrics = result_data["metrics"]
                                print(f"   {colorize('Metrics:', Colors.DIM)}")
                                if "cost_usd" in metrics:
                                    print(f"      Cost: ${metrics['cost_usd']:.4f}")
                                if "input_tokens" in metrics:
                                    print(f"      Tokens: {metrics['input_tokens']} in / {metrics.get('output_tokens', 0)} out")
                            
                            # Show full data if verbose and not too large
                            if verbose and len(str(result_data)) <= 2000:
                                print(f"   {colorize('Full Data:', Colors.DIM)}")
                                print(f"      {format_json(result_data)}")
                        
                        else:
                            # Non-dict result (plain text, etc.)
                            print(f"   {colorize('Output:', Colors.BOLD)}")
                            if verbose:
                                print(f"      {result_data}")
                            else:
                                print(f"      {truncate(str(result_data), 1000)}")
            
            # ============================================================
            # RESULT MESSAGE (final completion)
            # ============================================================
            elif isinstance(message, ResultMessage):
                summary = getattr(message, "result", None)
                usage = getattr(message, "usage", {})
                cost = getattr(message, "total_cost_usd", None)
                runtime_ms = getattr(message, "runtime_ms", None)
                
                # Update execution log
                if isinstance(usage, dict):
                    exec_log.total_input_tokens = usage.get("input_tokens", 0)
                    exec_log.total_output_tokens = usage.get("output_tokens", 0)
                if cost:
                    exec_log.total_cost_usd = cost
                
                exec_log.add_event("query_complete", {
                    "summary": summary,
                    "usage": usage,
                    "cost_usd": cost,
                    "runtime_ms": runtime_ms
                })
                
                # Print final summary
                print_header("📊 Execution Summary", "")
                
                if runtime_ms:
                    print(f"{colorize('⏱️  Duration:', Colors.BOLD)} {runtime_ms}ms ({runtime_ms/1000:.1f}s)")
                
                print(f"{colorize('🔄 Turns:', Colors.BOLD)} {exec_log.turn_count}")
                print(f"{colorize('🔧 Tool Calls:', Colors.BOLD)} {exec_log.tool_count}")
                
                if cost:
                    print(f"{colorize('💰 Total Cost:', Colors.BOLD)} ${cost:.4f}")
                
                if isinstance(usage, dict):
                    input_tok = usage.get("input_tokens", 0)
                    output_tok = usage.get("output_tokens", 0)
                    cache_creation = usage.get("cache_creation_input_tokens", 0)
                    cache_read = usage.get("cache_read_input_tokens", 0)
                    total_tok = input_tok + output_tok
                    
                    print(f"{colorize('📊 Tokens:', Colors.BOLD)} {total_tok:,} total ({input_tok:,} in / {output_tok:,} out)")
                    
                    # Show cache metrics if present
                    if cache_creation > 0 or cache_read > 0:
                        print(f"{colorize('💾 Cache:', Colors.BOLD)}", end="")
                        if cache_creation > 0:
                            print(f" {cache_creation:,} created", end="")
                        if cache_read > 0:
                            if cache_creation > 0:
                                print(" |", end="")
                            print(f" {cache_read:,} read", end="")
                            # Calculate savings
                            cache_savings = (cache_read * 0.003 * 0.9) / 1000
                            print(f" {colorize(f'(saved ${cache_savings:.4f})', Colors.GREEN)}", end="")
                        print()
                
                # Show final agent response
                if last_agent_text:
                    print_header("📋 Final Agent Response", "")
                    print(last_agent_text)
        
        # Save execution log if requested
        if save_log:
            log_path = Path(save_log)
            exec_log.save(log_path)
        
        print_header("✅ Test Complete", "")
    
    except KeyboardInterrupt:
        print(f"\n\n{colorize('⚠️  Interrupted by user', Colors.YELLOW)}")
        exec_log.add_event("interrupted", {})
    
    except Exception as e:
        print(f"\n{colorize('❌ Error:', Colors.RED)} {str(e)}")
        exec_log.add_event("error", {"error": str(e), "error_type": type(e).__name__})
        
        import traceback
        print(f"\n{colorize('Traceback:', Colors.DIM)}")
        traceback.print_exc()


def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Test Claude Finance Agent with detailed debugging output",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python agent_testing.py "What is Apple's stock price?"
  python agent_testing.py "Analyze Tesla" --model haiku --verbose
  python agent_testing.py "Test query" --save-log debug.json
        """
    )
    
    parser.add_argument(
        "prompt",
        help="Query to test with the agent"
    )
    
    parser.add_argument(
        "--model",
        default="haiku",
        choices=["sonnet", "haiku", "opus"],
        help="Model to use (default: haiku)"
    )
    
    parser.add_argument(
        "--max-turns",
        type=int,
        default=50,
        help="Maximum turns (default: 50)"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show extra verbose output (disables 1000 char limit)"
    )
    
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable colored output"
    )
    
    parser.add_argument(
        "--save-log",
        metavar="FILE",
        help="Save execution log to JSON file"
    )
    
    args = parser.parse_args()
    
    # Disable colors if requested
    global USE_COLOR
    if args.no_color:
        USE_COLOR = False
    
    # Run the test
    asyncio.run(run_agent_test(
        prompt=args.prompt,
        model=args.model,
        max_turns=args.max_turns,
        verbose=args.verbose,
        save_log=args.save_log
    ))


if __name__ == "__main__":
    main()
