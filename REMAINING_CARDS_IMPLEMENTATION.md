# Remaining Cards Implementation Complete

## Summary

Successfully implemented the three remaining specialized UI cards for common CLI tools:
1. **QACard** - for `mf-qa` tool
2. **FilingExtractCard** - for `mf-filing-extract` tool  
3. **EstimatesCard** - for `mf-estimates-get` tool

## Components Created

### 1. QACard (`frontend/components/cards/QACard.tsx`)

**Purpose:** Display results from the LLM-powered document Q&A tool (`mf-qa`)

**Key Features:**
- Shows instruction/question being asked
- Displays model used (Haiku vs Sonnet) with cost-aware badges
- Handles both structured (JSON schema) and unstructured (markdown) outputs
- Expandable/collapsible for long answers
- Shows processing metrics: chunks, tokens, cost, time
- Links to saved answer files
- Cost-aware color coding (green < $0.10, yellow < $0.50, orange > $0.50)

**Data Flow:**
```typescript
{
  toolCall: {
    tool_id: string;
    cli_tool: "mf-qa";
    metadata: {
      instruction: string;           // Question asked
      model: string;                 // "claude-3-5-haiku-latest" | "claude-3-5-sonnet-latest"
      document_paths: string[];      // Docs analyzed
      output_schema?: any;           // Optional structured output schema
    }
  };
  result: {
    ok: boolean;
    result: any;                     // JSON or string answer
    paths: string[];                 // Saved answer files
    metrics: {
      chunks: number;                // Document chunks processed
      t_ms: number;
      bytes: number;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;              // Actual LLM cost
    }
  }
}
```

**UI Highlights:**
- **Insight Bubble:** Summarizes analysis (e.g., "Analyzed 3 chunks from 45KB using Haiku")
- **Answer Display:** 
  - Structured: Shows key-value pairs with expand for full JSON
  - Unstructured: Markdown/text with show more/less toggle
- **Metrics Footer:** Token counts, processing time, and cost badge

---

### 2. FilingExtractCard (`frontend/components/cards/FilingExtractCard.tsx`)

**Purpose:** Display results from SEC filing extraction tool (`mf-filing-extract`)

**Key Features:**
- Supports 3 modes: `extract_sections`, `search_keywords`, `search_regex`
- Mode-specific icons and badges
- Shows extracted section status (found/not found)
- Expandable sections to view saved file paths
- Keyword/pattern display for search modes
- Match count for regex searches

**Data Flow:**
```typescript
{
  toolCall: {
    tool_id: string;
    cli_tool: "mf-filing-extract";
    metadata: {
      mode: "extract_sections" | "search_keywords" | "search_regex";
      sections?: string[];           // e.g., ["mda", "risk_factors"]
      keywords?: string[];           // e.g., ["artificial intelligence"]
      pattern?: string;              // Regex pattern
      filing_path: string;           // Path to filing
    }
  };
  result: {
    ok: boolean;
    result: Record<string, string | null>;  // Section name → file path
    paths: string[];                        // All saved files
  }
}
```

**UI Highlights:**
- **Mode Icons:**
  - 📑 Section Extraction (blue)
  - 🔍 Keyword Search (green)
  - 🔎 Pattern Search (purple)
- **Section Display:** Collapsible list showing which sections were found
- **Search Results:** Shows match count and saved file paths
- **Filing Info:** Extracts ticker and form type from path (e.g., "AAPL 10-K")

---

### 3. EstimatesCard (`frontend/components/cards/EstimatesCard.tsx`)

**Purpose:** Display analyst estimates from CapIQ (`mf-estimates-get`)

**Key Features:**
- Shows metric being fetched (Revenue, EPS, EBITDA, etc.)
- Displays forecast horizon (years forward/past)
- CapIQ data source badge
- Grid layout for key parameters
- Placeholder for future sparkline visualization

**Data Flow:**
```typescript
{
  toolCall: {
    tool_id: string;
    cli_tool: "mf-estimates-get";
    metadata: {
      ticker: string;                // e.g., "AAPL"
      metric: string;                // "revenue" | "eps" | "ebitda"
      years_future: number;          // Default: 5
      years_past: number;            // Default: 0
      currency: string;              // "original" | "usd"
    }
  };
  result: {
    ok: boolean;
    result: {
      estimates: string;             // Path to saved estimates JSON
    };
    paths: string[];
    metrics: {
      t_ms: number;
    }
  }
}
```

**UI Highlights:**
- **Metric Icons:** 💰 Revenue, 📈 EPS, 💵 EBITDA, etc.
- **Summary Grid:** Shows data source, metric type, horizon, currency
- **Insight Bubble:** "Retrieved consensus Revenue estimates for AAPL covering 5 years from CapIQ"
- **CapIQ Badge:** Green success badge indicating data source
- **Future Enhancement:** Ready for sparkline trend visualization when estimates data is loaded

---

## Integration with Frontend

Updated `frontend/app/page.tsx` to:

1. **Import new cards:**
```typescript
import { QACard } from '@/components/cards/QACard'
import { FilingExtractCard } from '@/components/cards/FilingExtractCard'
import { EstimatesCard } from '@/components/cards/EstimatesCard'
```

2. **Route tool calls to appropriate cards:**
```typescript
case 'mf-qa':
  return <QACard toolCall={...} result={...} isLoading={...} />
  
case 'mf-filing-extract':
  return <FilingExtractCard toolCall={...} result={...} isLoading={...} />
  
case 'mf-estimates-get':
  return <EstimatesCard toolCall={...} result={...} isLoading={...} />
```

## Backend Requirements

For these cards to work properly, the backend (`agent_service/app.py`) needs to emit events with `cli_tool` and `metadata` fields:

```python
# Tool start event
{
  "type": "data",
  "event": "agent.tool-start",
  "tool_id": "unique-id",
  "cli_tool": "mf-qa",           # CLI tool name
  "metadata": {                   # Parsed from echo JSON
    "instruction": "...",
    "model": "claude-3-5-haiku-latest",
    "document_paths": [...]
  }
}

# Tool result event
{
  "type": "data",
  "event": "agent.tool-result",
  "tool_id": "unique-id",
  "cli_tool": "mf-qa",
  "result": {
    "ok": true,
    "result": {...},
    "paths": [...],
    "metrics": {...}
  }
}
```

## Tool CLI Patterns Detected

The backend should detect these patterns in Bash tool calls:

```bash
# mf-qa
echo '{"instruction":"Summarize risks","document_paths":[...]}' | .../bin/mf-qa

# mf-filing-extract
echo '{"mode":"extract_sections","sections":["mda"],"filing_path":"..."}' | .../bin/mf-filing-extract

# mf-estimates-get  
echo '{"ticker":"AAPL","metric":"revenue","years_future":5}' | .../bin/mf-estimates-get
```

## User Experience Enhancements

### QACard
- ✅ Cost transparency - shows actual LLM costs
- ✅ Model selection - highlights cheap vs expensive models
- ✅ Answer formatting - handles both structured and unstructured outputs
- ✅ Token visibility - helps users understand context usage

### FilingExtractCard
- ✅ Mode clarity - clear visual distinction between extraction modes
- ✅ Section status - immediately see which sections were found
- ✅ Search feedback - shows match counts for keyword/regex searches
- ✅ Path management - links to saved extracted content

### EstimatesCard
- ✅ Data provenance - CapIQ badge for trust/credibility
- ✅ Forecast clarity - shows time horizon (5Y forward, etc.)
- ✅ Metric formatting - user-friendly metric names (Revenue vs "revenue")
- ✅ Ready for visualization - structured for future sparkline integration

## Status

✅ **All three cards implemented and integrated**
✅ **Import statements fixed** (using named exports)
✅ **Tool routing configured** in page.tsx
✅ **Data flow documented** for each card type

## Next Steps (Optional)

1. **Backend Enhancement:** Add CLI tool detection logic to parse `echo JSON | tool` patterns
2. **Data Loading:** For estimates card, fetch and display actual consensus numbers as sparklines
3. **QA Visualization:** Add citation highlighting or document chunk references
4. **Filing Extract:** Add preview snippets for extracted sections (first 200 chars)
5. **Error Handling:** Add retry buttons for failed tool calls

## Testing Recommendations

Test each card with:

### QACard
```
User: "Analyze the risk factors from AAPL's latest 10-K"
→ Agent uses mf-filing-extract then mf-qa
→ QACard should show: model, chunks, tokens, cost, and answer
```

### FilingExtractCard
```
User: "Extract MD&A and Risk Factors from AAPL 10-K"
→ Agent uses mf-filing-extract with mode=extract_sections
→ Card shows which sections found, with expand for file paths
```

### EstimatesCard  
```
User: "Get revenue estimates for TSLA"
→ Agent uses mf-estimates-get
→ Card shows CapIQ data, 5Y forward horizon, metric type
```

---

**Implementation Date:** October 2, 2025  
**Status:** Complete ✅

