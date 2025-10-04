#!/bin/bash

echo "🧪 Testing All Visual Components"
echo "================================="

# Test 1: MetricsGrid
echo -e "\n📊 Test 1: MetricsGrid (6 metrics)"
echo '{
  "title": "AAPL Financial Snapshot",
  "subtitle": "Q4 2024",
  "metrics": [
    {"label": "Revenue", "value": "$394.3B", "change": "+15.2% YoY", "trend": "up"},
    {"label": "EPS", "value": "$6.42", "change": "+18.3% YoY", "trend": "up"},
    {"label": "P/E Ratio", "value": "28.5x", "context": "Premium"},
    {"label": "ROE", "value": "156.4%", "context": "Excellent"},
    {"label": "FCF", "value": "$112.7B", "change": "+18.9% YoY", "trend": "up"},
    {"label": "Op Margin", "value": "42.2%", "context": "Best in class"}
  ]
}' | ./bin/mf-render-metrics

echo -e "\n---"

# Test 2: ComparisonTable
echo -e "\n📋 Test 2: ComparisonTable (3 companies, 5 metrics)"
echo '{
  "title": "Tech Giants Comparison",
  "subtitle": "Q4 2024 Key Metrics",
  "entities": [
    {"name": "AAPL", "subtitle": "Apple"},
    {"name": "MSFT", "subtitle": "Microsoft", "highlight": true},
    {"name": "GOOGL", "subtitle": "Alphabet"}
  ],
  "rows": [
    {"label": "Market Cap", "values": ["$3.0T", "$2.8T", "$1.7T"]},
    {"label": "Revenue", "values": ["$394B", "$211B", "$307B"]},
    {
      "label": "Revenue Growth",
      "values": [
        {"value": "+15%", "trend": "up", "status": "good"},
        {"value": "+12%", "trend": "up", "status": "good"},
        {"value": "+8%", "trend": "up"}
      ]
    },
    {"label": "P/E Ratio", "values": ["28.5x", "34.1x", "25.2x"]},
    {"label": "Operating Margin", "values": ["42%", "45%", "28%"]}
  ]
}' | ./bin/mf-render-comparison

echo -e "\n---"

# Test 3: InsightCard (Recommendation)
echo -e "\n💡 Test 3: InsightCard - Recommendation"
echo '{
  "title": "Investment Recommendation: MSFT",
  "type": "recommendation",
  "summary": "Microsoft presents a compelling long-term investment opportunity based on strong fundamentals and growth trajectory.",
  "points": [
    {
      "text": "Azure cloud growth accelerating at 25% YoY, driving margin expansion and recurring revenue",
      "emphasis": "high"
    },
    {
      "text": "AI integration across Office 365, Azure, and GitHub creating sustainable competitive advantages"
    },
    {
      "text": "Strong balance sheet with $100B+ cash provides flexibility for acquisitions and R&D"
    },
    {
      "text": "Diversified revenue streams reduce concentration risk"
    }
  ],
  "conclusion": "Recommend BUY with 12-month price target of $425 (15% upside from current levels)"
}' | ./bin/mf-render-insight

echo -e "\n---"

# Test 4: InsightCard (Warning)
echo -e "\n⚠️  Test 4: InsightCard - Warning"
echo '{
  "title": "Risk Alert: High Valuation Concerns",
  "type": "warning",
  "summary": "Current valuation metrics suggest limited upside and increased downside risk.",
  "points": [
    {
      "text": "P/E ratio at 35x vs industry average of 22x - premium valuation may not be sustainable",
      "emphasis": "high"
    },
    {
      "text": "Revenue growth decelerating from 15% to 8% YoY"
    },
    {
      "text": "Competitive pressures intensifying in core markets"
    }
  ],
  "conclusion": "Consider taking profits or reducing position size at current levels"
}' | ./bin/mf-render-insight

echo -e "\n---"

# Test 5: TimelineChart
echo -e "\n📈 Test 5: TimelineChart (2 series, 5 data points)"
echo '{
  "title": "AAPL Revenue & Net Income Trend",
  "subtitle": "Last 5 Years",
  "y_label": "$ Billions",
  "series": [
    {
      "name": "Revenue",
      "color": "#3b82f6",
      "data": [
        {"date": "2019", "value": 260},
        {"date": "2020", "value": 275},
        {"date": "2021", "value": 365},
        {"date": "2022", "value": 394},
        {"date": "2023", "value": 383}
      ]
    },
    {
      "name": "Net Income",
      "color": "#10b981",
      "data": [
        {"date": "2019", "value": 55},
        {"date": "2020", "value": 57},
        {"date": "2021", "value": 95},
        {"date": "2022", "value": 100},
        {"date": "2023", "value": 97}
      ]
    }
  ],
  "annotations": [
    {"date": "2021", "label": "iPhone 12 supercycle drove record revenue"}
  ]
}' | ./bin/mf-render-timeline

echo -e "\n✅ All component tests passed!\n"

