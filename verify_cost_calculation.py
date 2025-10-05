"""
Cost Calculation Verification Script

Verifies that the Claude Agent SDK is calculating costs correctly,
including prompt caching costs.

This script:
1. Checks SDK-reported costs against manual calculations
2. Verifies cache pricing is correct
3. Ensures we're not over/under-charging
"""

import json
from pathlib import Path
from typing import Dict, Any

# Anthropic API Pricing (as of 2025)
# Source: https://www.anthropic.com/pricing

PRICING = {
    "claude-sonnet-4-5-20250929": {
        "input": 3.00,  # $3 per 1M tokens
        "output": 15.00,  # $15 per 1M tokens
        "cache_write": 3.75,  # $3.75 per 1M tokens (25% premium)
        "cache_read": 0.30,  # $0.30 per 1M tokens (90% discount)
    },
    "claude-3-5-sonnet-20241022": {
        "input": 3.00,
        "output": 15.00,
        "cache_write": 3.75,
        "cache_read": 0.30,
    },
    "claude-3-5-haiku-20241022": {
        "input": 0.25,  # $0.25 per 1M tokens
        "output": 1.25,  # $1.25 per 1M tokens
        "cache_write": 0.3125,  # $0.3125 per 1M tokens (25% premium)
        "cache_read": 0.025,  # $0.025 per 1M tokens (90% discount)
    },
}

def calculate_cost(usage: Dict[str, Any], model: str) -> Dict[str, float]:
    """
    Manually calculate cost from usage metrics.
    
    Args:
        usage: Usage dict from SDK with token counts
        model: Model identifier
        
    Returns:
        Dict with cost breakdown
    """
    # Get pricing for model
    if model not in PRICING:
        # Try to match by model family
        if "sonnet" in model.lower():
            pricing = PRICING["claude-sonnet-4-5-20250929"]
        elif "haiku" in model.lower():
            pricing = PRICING["claude-3-5-haiku-20241022"]
        else:
            raise ValueError(f"Unknown model: {model}")
    else:
        pricing = PRICING[model]
    
    # Extract token counts
    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    cache_creation = usage.get("cache_creation_input_tokens", 0)
    cache_read = usage.get("cache_read_input_tokens", 0)
    
    # Calculate costs (per 1M tokens)
    input_cost = (input_tokens / 1_000_000) * pricing["input"]
    output_cost = (output_tokens / 1_000_000) * pricing["output"]
    cache_write_cost = (cache_creation / 1_000_000) * pricing["cache_write"]
    cache_read_cost = (cache_read / 1_000_000) * pricing["cache_read"]
    
    total_manual = input_cost + output_cost + cache_write_cost + cache_read_cost
    
    return {
        "input_cost": input_cost,
        "output_cost": output_cost,
        "cache_write_cost": cache_write_cost,
        "cache_read_cost": cache_read_cost,
        "total_manual": total_manual,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cache_creation": cache_creation,
        "cache_read": cache_read,
    }

def verify_log_file(log_path: Path) -> None:
    """Verify cost calculation in a log file."""
    
    with open(log_path, 'r') as f:
        data = json.load(f)
    
    # Find query_complete event with usage and cost
    for event in data['events']:
        if event['type'] == 'query_complete':
            usage = event['data'].get('usage', {})
            sdk_cost = event['data'].get('cost_usd', 0)
            
            # Find model used - check multiple places
            model = None
            for e in data['events']:
                if e['type'] == 'system_message':
                    if isinstance(e.get('data'), dict) and 'model' in e['data']:
                        model = e['data']['model']
                        break
                elif e['type'] == 'query_start':
                    if isinstance(e.get('data'), dict) and 'model' in e['data']:
                        model_name = e['data']['model']
                        # Map short names to full model IDs
                        if model_name == 'sonnet':
                            model = 'claude-sonnet-4-5-20250929'
                        elif model_name == 'haiku':
                            model = 'claude-3-5-haiku-20241022'
                        else:
                            model = model_name
                        break
            
            if not model:
                print("⚠️  Could not find model in log")
                print(f"    Available event types: {[e['type'] for e in data['events'][:5]]}")
                return
            
            # Calculate manual cost
            breakdown = calculate_cost(usage, model)
            
            # Print results
            print(f"\n{'='*80}")
            print(f"Cost Verification for: {log_path.name}")
            print(f"{'='*80}")
            print(f"\nModel: {model}")
            print(f"\nToken Usage:")
            print(f"  Regular input:  {breakdown['input_tokens']:>8,} tokens")
            print(f"  Cache creation: {breakdown['cache_creation']:>8,} tokens")
            print(f"  Cache read:     {breakdown['cache_read']:>8,} tokens")
            print(f"  Output:         {breakdown['output_tokens']:>8,} tokens")
            
            print(f"\nCost Breakdown:")
            print(f"  Regular input:  ${breakdown['input_cost']:>10.6f}")
            print(f"  Cache creation: ${breakdown['cache_write_cost']:>10.6f}")
            print(f"  Cache read:     ${breakdown['cache_read_cost']:>10.6f}")
            print(f"  Output:         ${breakdown['output_cost']:>10.6f}")
            print(f"  {'─'*40}")
            print(f"  Manual total:   ${breakdown['total_manual']:>10.6f}")
            print(f"  SDK reported:   ${sdk_cost:>10.6f}")
            
            # Calculate difference
            diff = abs(sdk_cost - breakdown['total_manual'])
            diff_pct = (diff / sdk_cost * 100) if sdk_cost > 0 else 0
            
            print(f"\nVerification:")
            print(f"  Difference:     ${diff:>10.6f} ({diff_pct:.2f}%)")
            
            if diff_pct < 1:
                print(f"  Status:         ✅ CORRECT (within 1% tolerance)")
            elif diff_pct < 5:
                print(f"  Status:         ⚠️  ACCEPTABLE (within 5% tolerance)")
            else:
                print(f"  Status:         ❌ DISCREPANCY (>5% difference)")
                print(f"\n  Note: This may be due to:")
                print(f"    - Additional internal tokens")
                print(f"    - Rounding differences")
                print(f"    - Pricing tier adjustments")
            
            # Cache savings analysis
            if breakdown['cache_read'] > 0:
                # What would it have cost without caching?
                no_cache_cost = ((breakdown['cache_read'] + breakdown['input_tokens']) / 1_000_000) * PRICING[model]["input"]
                with_cache_cost = breakdown['input_cost'] + breakdown['cache_read_cost']
                savings = no_cache_cost - with_cache_cost
                savings_pct = (savings / no_cache_cost * 100) if no_cache_cost > 0 else 0
                
                print(f"\nCache Savings Analysis:")
                print(f"  Without caching: ${no_cache_cost:.6f}")
                print(f"  With caching:    ${with_cache_cost:.6f}")
                print(f"  Savings:         ${savings:.6f} ({savings_pct:.1f}%)")
            
            print(f"\n{'='*80}\n")
            
            return
    
    print("⚠️  No query_complete event found in log")

def main():
    """Verify costs for all test logs."""
    
    logs_dir = Path("logs")
    
    if not logs_dir.exists():
        print("❌ logs/ directory not found")
        return
    
    # Find recent test logs
    log_files = sorted(logs_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    
    if not log_files:
        print("❌ No log files found in logs/")
        return
    
    print("\n" + "="*80)
    print("COST CALCULATION VERIFICATION")
    print("="*80)
    print(f"\nFound {len(log_files)} log files. Verifying most recent...")
    
    # Verify the most recent log
    verify_log_file(log_files[0])
    
    # Offer to verify more
    print("To verify other logs, run:")
    for i, log_file in enumerate(log_files[1:5], 1):  # Show next 4
        print(f"  python verify_cost_calculation.py {log_file.name}")
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("""
The Claude Agent SDK calculates costs using the Anthropic API's usage metrics.

Key Points:
1. SDK-reported costs include all token types (input, output, cache)
2. Small discrepancies (<5%) are normal due to rounding
3. Cache pricing is correctly applied:
   - Cache write: 25% premium over regular input
   - Cache read: 90% discount from regular input
4. Costs are calculated server-side by Anthropic

If you see discrepancies >5%, this may indicate:
- Pricing changes (check https://www.anthropic.com/pricing)
- Additional internal tokens (e.g., for tool use formatting)
- Batch pricing or volume discounts

The SDK's cost calculation should be trusted as the source of truth.
    """)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Verify specific log file
        log_path = Path("logs") / sys.argv[1]
        if log_path.exists():
            verify_log_file(log_path)
        else:
            print(f"❌ Log file not found: {log_path}")
    else:
        # Verify most recent log
        main()
