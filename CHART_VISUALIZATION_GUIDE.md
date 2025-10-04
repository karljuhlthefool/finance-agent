# Interactive Chart Visualization Guide

This guide explains how to create beautiful, interactive financial charts in the Claude Finance Agent using the new `mf-chart-data` tool and generative UI components.

## Overview

The chart visualization system consists of:

1. **Backend CLI Tool** (`mf-chart-data`) - Validates and structures chart data
2. **Frontend Component** (`ChartResult.tsx`) - Renders interactive Recharts visualizations
3. **Agent Integration** - System prompt teaches the agent when and how to create charts

## Architecture Decision: Generative UI vs CLI-Generated Charts

We chose **Generative UI components** over CLI-generated static charts because:

### ✅ Advantages of Generative UI Approach

- **Rich Interactivity**: Hover tooltips, legends, responsive resizing, data tables
- **Real-time Streaming**: Charts render immediately as data arrives
- **Framework Integration**: Seamless React/Next.js integration with Recharts
- **State Management**: Client-side state for expand/collapse, show/hide data
- **Performance**: No image generation overhead, DOM-based rendering
- **Accessibility**: Native HTML/SVG accessibility support
- **Customization**: Easy to theme, style, and extend with React components

### ❌ Why Not CLI-Generated Charts

- Static images lack interactivity
- Server-side rendering adds latency
- Image files require storage management
- No responsive behavior
- Poor accessibility
- Limited customization

## Chart Types Supported

### 1. Line Chart
**Best for**: Time-series data, trends, continuous metrics
```json
{
  "chart_type": "line",
  "series": [
    {"x": "Q1 2024", "y": 81797000000},
    {"x": "Q2 2024", "y": 85777000000},
    {"x": "Q3 2024", "y": 94036000000},
    {"x": "Q4 2024", "y": 124630000000}
  ],
  "title": "Apple Quarterly Revenue",
  "x_label": "Quarter",
  "y_label": "Revenue",
  "format_y": "currency",
  "ticker": "AAPL"
}
```

### 2. Bar Chart
**Best for**: Comparisons, discrete categories, rankings
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
  "format_y": "percent"
}
```

### 3. Area Chart
**Best for**: Cumulative trends, volume over time, stacked data
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
  "format_y": "currency"
}
```

### 4. Pie Chart
**Best for**: Composition, market share, segment breakdown
```json
{
  "chart_type": "pie",
  "series": [
    {"name": "iPhone", "value": 200.5},
    {"name": "Mac", "value": 29.4},
    {"name": "iPad", "value": 28.3},
    {"name": "Wearables", "value": 37.0},
    {"name": "Services", "value": 85.2}
  ],
  "title": "Apple Revenue by Segment (FY2024)",
  "format_y": "currency"
}
```

### 5. Combo Chart (Dual Axis)
**Best for**: Comparing two metrics with different scales
```json
{
  "chart_type": "combo",
  "series": [
    {"x": "2020", "y": 274.5},
    {"x": "2021", "y": 365.8},
    {"x": "2022", "y": 394.3}
  ],
  "secondary_series": [
    {"x": "2020", "y": 38.2},
    {"x": "2021", "y": 41.8},
    {"x": "2022", "y": 43.3}
  ],
  "title": "Revenue ($B) vs Gross Margin (%)",
  "x_label": "Year",
  "y_label": "Revenue ($B)",
  "series_name": "Revenue",
  "format_y": "currency"
}
```

## Y-Axis Formatting

The `format_y` parameter controls how values are displayed:

- **`currency`**: `$94.0B`, `$1.2M`, `$542K` (compact notation)
- **`percent`**: `25.5%`, `3.2%`, `-1.8%`
- **`number`**: `94.0B`, `1.2M`, `542K` (compact notation, no currency symbol)

## Color Palette

Default professional financial color palette:
- Primary Blue: `#3b82f6`
- Green: `#10b981`
- Amber: `#f59e0b`
- Red: `#ef4444`
- Purple: `#8b5cf6`
- Cyan: `#06b6d4`

Custom colors can be provided via the `colors` parameter.

## CLI Tool: `mf-chart-data`

### Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chart_type` | string | ✅ | "line", "bar", "area", "pie", "combo" |
| `series` | array | ✅ | Data points (format varies by chart type) |
| `title` | string | ❌ | Chart title |
| `x_label` | string | ❌ | X-axis label |
| `y_label` | string | ❌ | Y-axis label (or primary Y for combo) |
| `series_name` | string | ❌ | Legend name for data series |
| `format_y` | string | ❌ | "currency", "percent", "number" (default: "number") |
| `secondary_series` | array | ❌ | For combo charts only |
| `colors` | array | ❌ | Custom color palette |
| `ticker` | string | ❌ | Stock ticker for context |
| `save` | boolean | ❌ | Save config to disk (default: true) |

### Output Structure

```json
{
  "ok": true,
  "result": {
    "chart": {
      "type": "line",
      "data": [...],
      "title": "...",
      "xLabel": "...",
      "yLabel": "...",
      "formatY": "currency",
      "colors": [...]
    },
    "data_points": 8,
    "saved": true
  },
  "paths": ["/workspace/analysis/charts/chart_AAPL_line_2025-10-04T12-30-15.json"],
  "provenance": [{...}],
  "metrics": {"t_ms": 5}
}
```

## Frontend Component: `ChartResult.tsx`

### Features

✨ **Interactive Elements**
- Hover tooltips with formatted values
- Responsive legends
- Gradient fills for area charts
- Smooth animations and transitions

📊 **Data Table Toggle**
- View raw data in tabular format
- Formatted values with proper currency/percent display
- Sortable columns

🎨 **Professional Styling**
- Clean, modern design matching UI theme
- Consistent colors across chart types
- Professional typography and spacing

## Agent Workflow Integration

### Example 1: Revenue Trend Analysis

```bash
# 1. Fetch market data
echo '{"ticker":"AAPL","fields":["fundamentals"],"period":"quarter","limit":8}' | mf-market-get

# 2. Extract quarterly revenue
echo '{"json_file":"/path/to/fundamentals_quarterly.json","path":"[*].{date:date,revenue:revenue}"}' | mf-extract-json

# 3. Create line chart
echo '{
  "chart_type":"line",
  "series":[
    {"x":"Q1 2024","y":81797000000},
    {"x":"Q2 2024","y":85777000000},
    {"x":"Q3 2024","y":94036000000},
    {"x":"Q4 2024","y":124630000000}
  ],
  "title":"Apple Quarterly Revenue FY2024",
  "x_label":"Quarter",
  "y_label":"Revenue",
  "format_y":"currency",
  "ticker":"AAPL"
}' | mf-chart-data
```

### Example 2: Segment Breakdown (Pie Chart)

```bash
# 1. Fetch segment data
echo '{"ticker":"AAPL","fields":["segments_product"],"period":"annual","limit":1}' | mf-market-get

# 2. Extract and structure segment data

# 3. Create pie chart
echo '{
  "chart_type":"pie",
  "series":[
    {"name":"iPhone","value":200.5},
    {"name":"Mac","value":29.4},
    {"name":"iPad","value":28.3},
    {"name":"Wearables","value":37.0},
    {"name":"Services","value":85.2}
  ],
  "title":"Apple Revenue by Segment (FY2024, $B)",
  "format_y":"currency",
  "ticker":"AAPL"
}' | mf-chart-data
```

### Example 3: Growth Comparison (Bar Chart)

```bash
# 1. Calculate YoY growth rates using mf-calc-simple

# 2. Create bar chart
echo '{
  "chart_type":"bar",
  "series":[
    {"x":"2020","y":5.5},
    {"x":"2021","y":33.3},
    {"x":"2022","y":7.8},
    {"x":"2023","y":-2.8},
    {"x":"2024","y":2.0}
  ],
  "title":"Apple Annual Revenue Growth",
  "x_label":"Year",
  "y_label":"Growth Rate",
  "format_y":"percent",
  "ticker":"AAPL"
}' | mf-chart-data
```

## Best Practices

### ✅ Do's

- **Choose appropriate chart types**: Line for trends, bar for comparisons, pie for composition
- **Use descriptive titles**: "Apple Quarterly Revenue FY2024" not just "Revenue"
- **Format Y-axis correctly**: Currency for dollars, percent for rates
- **Keep labels short**: "Q1 2024" not "First Quarter of Fiscal Year 2024"
- **Provide context**: Include ticker symbol when relevant
- **Limit data points**: 4-20 points for optimal visualization

### ❌ Don'ts

- **Don't use line charts for discrete categories**: Use bar charts instead
- **Don't mix units**: Revenue (dollars) and shares (count) shouldn't be on same axis
- **Don't create overly busy charts**: Keep it simple and focused
- **Don't forget labels**: Always label axes and provide a title
- **Don't use pie charts for time-series**: Use line or area instead

## Testing Your Charts

### Quick Test (CLI)

```bash
# Test line chart
echo '{"chart_type":"line","series":[{"x":"Q1","y":100},{"x":"Q2","y":150}],"title":"Test Chart"}' | bin/mf-chart-data

# Expected output
{
  "ok": true,
  "result": {
    "chart": {...},
    "data_points": 2
  },
  "paths": ["/workspace/analysis/charts/..."]
}
```

### End-to-End Test (Agent)

1. Start the backend: `uvicorn agent_service.app:app --reload --port 5052`
2. Start the frontend: `cd frontend && npm run dev`
3. Ask the agent: "Show me Apple's revenue trend for the last 4 quarters as a chart"
4. Verify:
   - Chart renders with correct data
   - Hover tooltips work
   - Data table toggle works
   - Chart is saved to workspace

## Troubleshooting

### Chart doesn't render
- Check browser console for errors
- Verify Recharts is installed: `cd frontend && npm list recharts`
- Ensure data format matches chart type (x/y for line/bar, name/value for pie)

### Data formatting issues
- Verify `format_y` parameter is valid
- Check that Y values are numbers, not strings
- Ensure dates/labels are strings in X values

### Styling problems
- Check Tailwind classes are available
- Verify component is receiving `isExpanded` prop correctly
- Review browser DevTools for CSS conflicts

## Future Enhancements

Potential improvements:
- **Multiple series**: Support multiple lines/bars on same chart
- **Zoom/Pan**: Add zooming capability for dense time-series
- **Export**: Download chart as PNG/SVG
- **Themes**: Dark mode support, custom color schemes
- **Annotations**: Add markers, reference lines, or highlights
- **Real-time updates**: Streaming data updates to existing charts

## Summary

The chart visualization system provides a powerful, flexible way to present financial data beautifully. By combining:

1. **Backend validation** (mf-chart-data CLI)
2. **Frontend rendering** (ChartResult.tsx component)
3. **Agent intelligence** (system prompt guidance)

Users get **professional, interactive charts** that enhance understanding and engagement with financial analysis.

For questions or issues, refer to the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) or component documentation.

