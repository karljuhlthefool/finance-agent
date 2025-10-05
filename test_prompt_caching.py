"""
Test script to verify prompt caching implementation.

Based on Anthropic's documentation, prompt caching is enabled by:
1. Using models that support caching (claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus)
2. Structuring system messages with cache_control markers
3. The cache_control marker should be on the last system message block

Reference: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')
load_dotenv('.env')

from claude_agent_sdk import ClaudeAgent, ClaudeAgentOptions

PROJECT_ROOT = Path(__file__).resolve().parent
WORKSPACE = PROJECT_ROOT / "runtime" / "workspace"

# Simple system prompt for testing
SYSTEM_PROMPT = """You are a helpful financial analysis assistant.

You have access to CLI tools for fetching market data and performing calculations.
Always use tools to fetch data rather than making up information.

When asked for stock prices or financial data, use the mf-market-get tool.
"""

async def test_basic_query():
    """Test a basic query to see token usage."""
    
    options = ClaudeAgentOptions(
        cwd=str(WORKSPACE),
        model="claude-3-5-haiku-20241022",
        system_prompt=SYSTEM_PROMPT,
        allowed_tools=["Bash", "Read", "Write"],
        max_turns=3,
        permission_mode="bypassPermissions",
    )
    
    agent = ClaudeAgent(options)
    
    print("🧪 Testing basic query...")
    print("=" * 80)
    
    result = await agent.run("What is 2 + 2?")
    
    # Check if usage information is available
    if hasattr(result, 'usage'):
        usage = result.usage
        print(f"\n📊 Token Usage:")
        print(f"  Input tokens: {getattr(usage, 'input_tokens', 'N/A')}")
        print(f"  Output tokens: {getattr(usage, 'output_tokens', 'N/A')}")
        
        # Check for cache-related metrics
        if hasattr(usage, 'cache_creation_input_tokens'):
            print(f"  Cache creation tokens: {usage.cache_creation_input_tokens}")
        if hasattr(usage, 'cache_read_input_tokens'):
            print(f"  Cache read tokens: {usage.cache_read_input_tokens}")
            
        print("\n✅ If you see 'cache_creation_input_tokens' or 'cache_read_input_tokens',")
        print("   prompt caching is working!")
    else:
        print("\n⚠️  No usage information available in result")
        print(f"   Result type: {type(result)}")
        print(f"   Result attributes: {dir(result)}")
    
    print("\n" + "=" * 80)

async def test_repeated_query():
    """Test repeated queries to see if cache is being used."""
    
    options = ClaudeAgentOptions(
        cwd=str(WORKSPACE),
        model="claude-3-5-haiku-20241022",
        system_prompt=SYSTEM_PROMPT,
        allowed_tools=["Bash", "Read", "Write"],
        max_turns=3,
        permission_mode="bypassPermissions",
    )
    
    print("\n🧪 Testing repeated queries (to check cache hits)...")
    print("=" * 80)
    
    for i in range(2):
        print(f"\n📝 Query {i+1}:")
        agent = ClaudeAgent(options)
        result = await agent.run(f"What is {i+3} + {i+5}?")
        
        if hasattr(result, 'usage'):
            usage = result.usage
            cache_read = getattr(usage, 'cache_read_input_tokens', 0)
            cache_create = getattr(usage, 'cache_creation_input_tokens', 0)
            
            print(f"  Input tokens: {getattr(usage, 'input_tokens', 'N/A')}")
            print(f"  Cache creation: {cache_create}")
            print(f"  Cache read: {cache_read}")
            
            if i == 0 and cache_create > 0:
                print("  ✅ Cache created on first query")
            elif i > 0 and cache_read > 0:
                print("  ✅ Cache hit on subsequent query!")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🔍 PROMPT CACHING TEST")
    print("=" * 80)
    
    asyncio.run(test_basic_query())
    asyncio.run(test_repeated_query())
    
    print("\n" + "=" * 80)
    print("📋 NOTES:")
    print("=" * 80)
    print("""
The Claude Agent SDK may not expose prompt caching configuration directly.
Prompt caching is an API-level feature that requires:

1. System messages structured as a list with cache_control markers
2. The SDK needs to pass these through to the Anthropic API

If caching metrics don't appear, the SDK may need to be updated to support
structured system prompts with cache_control markers.

Current workaround: The SDK might automatically enable caching for long
system prompts, but this is not guaranteed.
    """)
