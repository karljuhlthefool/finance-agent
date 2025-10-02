#!/bin/bash
# Comprehensive CLI test suite

set -e
cd "$(dirname "$0")"
source venv/bin/activate

echo "🧪 Testing All CLI Tools"
echo "========================="

# Test 1: FMP Fundamentals
echo ""
echo "1️⃣ Testing mf-market-get (FMP fundamentals)..."
result=$(echo '{"ticker":"AAPL","fields":["fundamentals"],"range":"2y"}' | python3 bin/mf-market-get)
if echo "$result" | grep -q '"ok": true'; then
    echo "✅ FMP fundamentals working"
else
    echo "❌ FMP fundamentals failed"
    echo "$result"
    exit 1
fi

# Test 2: CapIQ Estimates
echo ""
echo "2️⃣ Testing mf-estimates-get (CapIQ estimates)..."
result=$(echo '{"ticker":"AAPL","metric":"revenue","years_future":3}' | python3 bin/mf-estimates-get)
if echo "$result" | grep -q '"ok": true'; then
    echo "✅ CapIQ estimates working"
else
    echo "❌ CapIQ estimates failed"
    echo "$result"
    exit 1
fi

# Test 3: JSON Inspect (single-line output)
echo ""
echo "3️⃣ Testing mf-json-inspect (single-line JSON)..."
result=$(echo '{"json_file":"'$(pwd)'/runtime/workspace/data/market/AAPL/fundamentals_quarterly.json"}' | python3 bin/mf-json-inspect)
if echo "$result" | grep -q '"ok": true' && [ $(echo "$result" | wc -l) -eq 1 ]; then
    echo "✅ JSON inspect working (single-line)"
else
    echo "❌ JSON inspect failed or not single-line"
    exit 1
fi

# Test 4: Path-based extraction (FREE)
echo ""
echo "4️⃣ Testing mf-extract-json (path-based, FREE)..."
result=$(echo '{"json_file":"'$(pwd)'/runtime/workspace/data/market/AAPL/fundamentals_quarterly.json","path":"quarters[-1].revenue"}' | python3 bin/mf-extract-json)
if echo "$result" | grep -q '"ok": true' && echo "$result" | grep -q '"cost_estimate": 0'; then
    echo "✅ Path-based extraction working (FREE)"
else
    echo "❌ Path-based extraction failed"
    echo "$result"
    exit 1
fi

# Test 5: DCF Valuation (fixed FCF derivation)
echo ""
echo "5️⃣ Testing mf-valuation-basic-dcf (domain structure)..."
result=$(echo '{"ticker":"AAPL","years":5,"wacc":0.10,"terminal":{"method":"gordon","param":0.025},"shares_outstanding":15207000000}' | python3 bin/mf-valuation-basic-dcf)
if echo "$result" | grep -q '"ok": true' && echo "$result" | grep -q '"per_share"'; then
    echo "✅ DCF valuation working (derives FCF from domain)"
else
    echo "❌ DCF valuation failed"
    echo "$result"
    exit 1
fi

# Test 6: Growth calculation
echo ""
echo "6️⃣ Testing mf-calc-simple (growth)..."
result=$(echo '{"op":"growth","series":[{"date":"2024-06-29","value":85777000000},{"date":"2025-06-28","value":94036000000}],"period":"yoy"}' | python3 bin/mf-calc-simple)
if echo "$result" | grep -q '"ok": true' && echo "$result" | grep -q '"delta_pct"'; then
    echo "✅ Growth calculation working"
else
    echo "❌ Growth calculation failed"
    echo "$result"
    exit 1
fi

echo ""
echo "========================="
echo "✅ All CLI tests passed!"
echo ""
echo "Summary:"
echo "  ✓ FMP fundamentals (mf-market-get)"
echo "  ✓ CapIQ estimates (mf-estimates-get)" 
echo "  ✓ JSON inspect (single-line)"
echo "  ✓ Path extraction (FREE)"
echo "  ✓ DCF valuation (fixed)"
echo "  ✓ Growth calculation"
echo ""
echo "🎉 System ready for production!"

