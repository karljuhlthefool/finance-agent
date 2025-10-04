# Chart Visualization Examples

This document shows real examples of what users will see when the agent creates charts.

## 🎨 Visual Examples

### Example 1: Line Chart - Quarterly Revenue Trend

**User Request**: "Show me Apple's quarterly revenue for FY2024"

**Agent Action**:
```json
{
  "chart_type": "line",
  "series": [
    {"x": "Q1 2024", "y": 81797000000},
    {"x": "Q2 2024", "y": 85777000000},
    {"x": "Q3 2024", "y": 94036000000},
    {"x": "Q4 2024", "y": 124630000000}
  ],
  "title": "Apple Quarterly Revenue FY2024",
  "x_label": "Quarter",
  "y_label": "Revenue",
  "format_y": "currency",
  "ticker": "AAPL"
}
```

**What User Sees**:
```
┌─────────────────────────────────────────────────────────┐
│  Apple Quarterly Revenue FY2024                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  $125B ┤                                          ●     │
│        │                                         ╱      │
│  $100B ┤                              ●         ╱       │
│        │                             ╱ ╲       ╱        │
│   $90B ┤                   ●        ╱   ╲     ╱         │
│        │                  ╱ ╲      ╱     ╲   ╱          │
│   $80B ┤         ●       ╱   ╲    ╱       ● ╱           │
│        │                ╱     ╲  ╱                      │
│        └─────┬─────┬─────┬─────┬─────                  │
│             Q1    Q2    Q3    Q4                        │
│                   Quarter                               │
│                                                         │
│  [Hover over points to see exact values]               │
│  [📊 4 data points • line chart]                       │
└─────────────────────────────────────────────────────────┘
```

**Interactive Features**:
- Hover over any point → Tooltip shows "Q2 2024: $85.8B"
- Click "Show Data Table" → See tabular view
- Responsive sizing

---

### Example 2: Bar Chart - Annual Growth Rates

**User Request**: "Compare Apple's year-over-year revenue growth"

**Agent Action**:
```json
{
  "chart_type": "bar",
  "series": [
    {"x": "2020", "y": 5.5},
    {"x": "2021", "y": 33.3},
    {"x": "2022", "y": 7.8},
    {"x": "2023", "y": -2.8},
    {"x": "2024", "y": 2.0}
  ],
  "title": "Apple Annual Revenue Growth",
  "x_label": "Year",
  "y_label": "Growth Rate",
  "format_y": "percent",
  "ticker": "AAPL"
}
```

**What User Sees**:
```
┌─────────────────────────────────────────────────────────┐
│  Apple Annual Revenue Growth                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   40% ┤                                                 │
│       │         ████████████                            │
│   30% ┤         █    33.3%  █                           │
│       │         █           █                           │
│   20% ┤         █           █                           │
│       │         █           █                           │
│   10% ┤  ████   █      ████ █       ████                │
│       │  5.5%   █      7.8% █       2.0%                │
│    0% ┼────────────────────────────────────            │
│       │                       █                         │
│  -10% ┤                     -2.8%                       │
│       └──────┬──────┬──────┬──────┬──────              │
│            2020   2021  2022  2023  2024                │
│                     Year                                │
│                                                         │
│  [📊 5 data points • bar chart]                        │
└─────────────────────────────────────────────────────────┘
```

**Interactive Features**:
- Hover over bars → "2021: 33.3%"
- Color coding: Green for positive, red for negative
- Rounded corners on bars

---

### Example 3: Pie Chart - Revenue by Segment

**User Request**: "Show me Apple's revenue breakdown by product"

**Agent Action**:
```json
{
  "chart_type": "pie",
  "series": [
    {"name": "iPhone", "value": 200.5},
    {"name": "Services", "value": 85.2},
    {"name": "Wearables", "value": 37.0},
    {"name": "Mac", "value": 29.4},
    {"name": "iPad", "value": 28.3}
  ],
  "title": "Apple Revenue by Segment (FY2024)",
  "format_y": "currency",
  "ticker": "AAPL"
}
```

**What User Sees**:
```
┌─────────────────────────────────────────────────────────┐
│  Apple Revenue by Segment (FY2024)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    iPhone: $200.5B ──┐                  │
│                                      │                  │
│                       ╭──────────────┴──╮               │
│                      ╱        52.7%      ╲              │
│                     │                     │             │
│         Mac: $29.4B ├         ●           │             │
│              (7.7%) │                     │             │
│                     │                     │             │
│        iPad: $28.3B ├                     │             │
│              (7.4%) │                     │             │
│                      ╲                   ╱              │
│   Wearables: $37.0B  ╰───┬──────────────╯               │
│          (9.7%)          │                              │
│                          │                              │
│              Services: $85.2B (22.4%)                   │
│                                                         │
│  [Hover over slices for details]                       │
│  [📊 5 data points • pie chart]                        │
└─────────────────────────────────────────────────────────┘
```

**Interactive Features**:
- Hover over slice → "iPhone: $200.5B (52.7%)"
- Color-coded segments
- Labels with values

---

### Example 4: Area Chart - Annual Revenue Trend

**User Request**: "Show Apple's revenue growth over 5 years as an area chart"

**Agent Action**:
```json
{
  "chart_type": "area",
  "series": [
    {"x": "2020", "y": 274515000000},
    {"x": "2021", "y": 365817000000},
    {"x": "2022", "y": 394328000000},
    {"x": "2023", "y": 383285000000},
    {"x": "2024", "y": 391035000000}
  ],
  "title": "Apple Annual Revenue Trend",
  "x_label": "Year",
  "y_label": "Revenue",
  "format_y": "currency",
  "ticker": "AAPL"
}
```

**What User Sees**:
```
┌─────────────────────────────────────────────────────────┐
│  Apple Annual Revenue Trend                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  $400B ┤                   ●────────●─────────●         │
│        │                 ╱╱▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒│         │
│  $350B ┤               ╱╱▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒│         │
│        │             ╱╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒│         │
│  $300B ┤          ●╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒│         │
│        │        ╱╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒│         │
│  $250B ┤      ●╱▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒│         │
│        │     ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│         │
│        └──┬────┬────┬────┬────┬────           │         │
│         2020  2021 2022 2023 2024              │         │
│                   Year                         │         │
│                                                │         │
│  [Gradient fill shows cumulative growth]      │         │
│  [📊 5 data points • area chart]              │         │
└────────────────────────────────────────────────┘         
```

**Interactive Features**:
- Gradient fill (blue at top fading to transparent)
- Smooth curves connecting points
- Hover for exact values

---

### Example 5: Combo Chart - Revenue & Margin

**User Request**: "Compare Apple's revenue and gross margin on the same chart"

**Agent Action**:
```json
{
  "chart_type": "combo",
  "series": [
    {"x": "2020", "y": 274.5},
    {"x": "2021", "y": 365.8},
    {"x": "2022", "y": 394.3},
    {"x": "2023", "y": 383.3},
    {"x": "2024", "y": 391.0}
  ],
  "secondary_series": [
    {"x": "2020", "y": 38.2},
    {"x": "2021", "y": 41.8},
    {"x": "2022", "y": 43.3},
    {"x": "2023", "y": 44.1},
    {"x": "2024", "y": 46.2}
  ],
  "title": "Revenue ($B) vs Gross Margin (%)",
  "x_label": "Year",
  "y_label": "Revenue ($B)",
  "series_name": "Revenue",
  "format_y": "currency",
  "ticker": "AAPL"
}
```

**What User Sees**:
```
┌─────────────────────────────────────────────────────────┐
│  Revenue ($B) vs Gross Margin (%)                       │
├─────────────────────────────────────────────────────────┤
│  Revenue ($B)                     Margin (%)            │
│   $400B ┤                   ████ ████ ████        50%  │
│         │                   ▓▓▓▓ ▓▓▓▓ ▓▓▓▓              │
│   $350B ┤              ████ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓─●─●─●  45%  │
│         │              ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ╱ ╱ ╱        │
│   $300B ┤         ████ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓╱ ╱ ╱   40%  │
│         │         ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓●─ ╱ ╱          │
│   $250B ┤    ████ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓╱╱ ╱             │
│         │    ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓╱╱ ╱        35%  │
│         └──┬────┬────┬────┬────┬────                  │
│          2020  2021 2022 2023 2024                     │
│                    Year                                │
│                                                        │
│  █ Revenue (bars, left axis)   ─●─ Margin (line, right)│
│  [📊 5 data points • combo chart]                     │
└────────────────────────────────────────────────────────┘
```

**Interactive Features**:
- Dual Y-axes (revenue on left, margin on right)
- Bars for primary metric (revenue)
- Line for secondary metric (margin)
- Legend shows both series

---

## 🎯 Common Use Cases

### Financial Analysis
```
✅ Quarterly/annual revenue trends
✅ YoY/QoQ growth comparisons
✅ Segment revenue breakdown
✅ Profit margin trends
✅ Cash flow patterns
```

### Comparative Analysis
```
✅ Multi-company revenue comparison
✅ Peer group performance
✅ Industry benchmarking
✅ Historical vs estimates
```

### Metrics Visualization
```
✅ P/E ratio trends
✅ ROE/ROA over time
✅ Debt-to-equity evolution
✅ Operating margins
✅ FCF generation
```

## 💡 Pro Tips

### 1. Choose the Right Chart Type
- **Time-series data** → Line or Area
- **Comparisons** → Bar
- **Composition** → Pie
- **Two different scales** → Combo

### 2. Format Appropriately
- **Revenue, prices, valuations** → `format_y: "currency"`
- **Growth rates, margins, returns** → `format_y: "percent"`
- **Shares, units, counts** → `format_y: "number"`

### 3. Keep Labels Clear
- Use short, readable labels
- "Q1 2024" not "First Quarter Fiscal Year 2024"
- Provide descriptive titles

### 4. Limit Data Points
- **Optimal**: 4-12 data points for line/bar
- **Maximum**: 20 data points before chart gets crowded
- For longer series, consider aggregation or filtering

## 🎨 Color Meanings

The default palette uses meaningful colors:
- **Blue** (#3b82f6) → Primary data, neutral
- **Green** (#10b981) → Positive, growth, profit
- **Amber** (#f59e0b) → Warning, attention
- **Red** (#ef4444) → Negative, decline, loss
- **Purple** (#8b5cf6) → Secondary metrics
- **Cyan** (#06b6d4) → Tertiary data

## 📱 Responsive Behavior

Charts automatically adapt to:
- Desktop: Full width with detailed labels
- Tablet: Compact labels, maintained interactivity
- Mobile: Vertical orientation, touch-friendly tooltips

## ♿ Accessibility

All charts include:
- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High-contrast colors
- Alternative data table view

---

**These examples show the rich, interactive charts users will see when they ask the agent to visualize financial data!**

