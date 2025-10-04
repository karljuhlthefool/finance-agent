# Generative UI - Files Inventory

Quick reference for all files related to the generative UI system.

---

## Backend Files (Python)

### Core Server
- ✅ `agent_service/app.py` (486 lines) - FastAPI server, event streaming, tool detection
- ✅ `agent_service/settings.py` (56 lines) - Agent SDK configuration
- ✅ `agent_service/hooks.py` - Agent lifecycle hooks
- ✅ `agent_service/tools_cli.py` - MCP server for CLI tools

### Agent
- ✅ `src/agent.py` (264 lines) - CLI agent runner
- ✅ `src/prompts/agent_system.py` (530 lines) - Comprehensive system prompt with GenUI guidance
- ✅ `src/hooks.py` - Agent hooks implementation

### CLI Tools (11 tools in `bin/`)
- ✅ `bin/mf-market-get` - FMP market data (38 data types)
- ✅ `bin/mf-estimates-get` - CapIQ analyst estimates
- ✅ `bin/mf-documents-get` - SEC filings
- ✅ `bin/mf-filing-extract` - Extract sections/search filings
- ✅ `bin/mf-qa` - LLM document Q&A
- ✅ `bin/mf-calc-simple` - Calculations
- ✅ `bin/mf-valuation-basic-dcf` - DCF valuation
- ✅ `bin/mf-doc-diff` - Document comparison
- ✅ `bin/mf-extract-json` - JSON extraction
- ✅ `bin/mf-json-inspect` - JSON schema preview
- ✅ `bin/mf-report-save` - Save reports

---

## Frontend Files (TypeScript/React)

### Core Application
- ✅ `frontend/app/page.tsx` (465 lines) - Main chat interface with tool state management
- ✅ `frontend/app/api/chat/route.ts` (161 lines) - Stream transformation, tool tracking
- ✅ `frontend/app/layout.tsx` - Root layout with WorkspaceProvider
- ✅ `frontend/app/globals.css` - Global styles

### Context & Hooks
- ✅ `frontend/lib/workspace-context.tsx` (122 lines) - Workspace state, file reading
- ✅ `frontend/lib/use-resizable.tsx` - Resizable panel hook

---

## Card Components (20 components)

### Tool Call Cards
- ✅ `frontend/components/cards/ToolCallCard.tsx` (84 lines)
  - Shows tool invocation intent
  - Color-coded by tool type
  - Displays key parameters

### Result Cards - Specialized
- ✅ `frontend/components/cards/MarketDataCards.tsx` (130 lines)
  - Loads multiple data files
  - Renders summary + profile + quote
  
- ✅ `frontend/components/cards/ValuationCard.tsx` (204 lines)
  - Scenario tabs (Bear/Base/Bull)
  - Fair value vs current price
  - Waterfall chart
  
- ✅ `frontend/components/cards/CalculationCard.tsx` (176 lines)
  - Growth metrics
  - Sparklines
  - Trend badges
  
- ✅ `frontend/components/cards/QACard.tsx` (222 lines)
  - Document Q&A results
  - Structured + unstructured output
  - Token usage + cost display
  
- ✅ `frontend/components/cards/EstimatesCard.tsx` (200 lines)
  - Analyst estimates
  - Metric display
  - CapIQ source badge

### Result Cards - Supporting
- ✅ `frontend/components/cards/FilingExtractCard.tsx`
- ✅ `frontend/components/cards/ReportCard.tsx`
- ✅ `frontend/components/cards/LogsCard.tsx`
- ✅ `frontend/components/cards/GenericToolCard.tsx` (103 lines)
  - Fallback for unknown tools
  - Clickable file paths
  - Collapsible JSON

### Compact Cards (for MarketDataCards)
- ✅ `frontend/components/cards/CompactSummaryCard.tsx` (42 lines)
- ✅ `frontend/components/cards/CompactProfileCard.tsx`
- ✅ `frontend/components/cards/CompactQuoteCard.tsx`
- ✅ `frontend/components/cards/CompactDataCard.tsx`

### Full Display Cards
- ✅ `frontend/components/cards/ProfileCard.tsx`
- ✅ `frontend/components/cards/QuoteCard.tsx`
- ✅ `frontend/components/cards/SummaryCard.tsx`
- ✅ `frontend/components/cards/FundamentalsCard.tsx`
- ✅ `frontend/components/cards/MetricsCard.tsx`
- ✅ `frontend/components/cards/PriceHistoryCard.tsx`

---

## Agent Components (5 components)

- ✅ `frontend/components/agent/AgentThinkingBubble.tsx` (50 lines)
  - Animated dots
  - Optional plan steps
  
- ✅ `frontend/components/agent/InsightBubble.tsx` (74 lines)
  - Color-coded types (observation/warning/action/success)
  - Icon + message
  
- ✅ `frontend/components/agent/ToolChainFlow.tsx` (148 lines)
  - Pipeline visualization (currently disabled)
  - Tool sequence display
  
- ✅ `frontend/components/agent/SessionTimeline.tsx`
  - Historical tool executions
  - Rerun functionality
  
- ✅ `frontend/components/agent/ClickablePaths.tsx`
  - Detects file paths in text
  - Makes them clickable

---

## UI Primitives (4 components)

- ✅ `frontend/components/ui/Badge.tsx` (18 lines)
- ✅ `frontend/components/ui/Tooltip.tsx`
- ✅ `frontend/components/ui/ProgressIndicator.tsx`
- ✅ `frontend/components/ui/Tabs.tsx`

---

## Chart Components (4 components)

- ✅ `frontend/components/charts/Sparkline.tsx` (90 lines)
  - Mini line charts
  - Trend visualization
  
- ✅ `frontend/components/charts/MiniLineChart.tsx`
- ✅ `frontend/components/charts/Gauge.tsx`
- ✅ `frontend/components/charts/Waterfall.tsx`

---

## Workspace Components (3 components)

- ✅ `frontend/components/workspace/WorkspacePanel.tsx` (160 lines)
  - Resizable panel
  - Tree/viewer split
  
- ✅ `frontend/components/workspace/FileTree.tsx`
  - Hierarchical file browser
  
- ✅ `frontend/components/workspace/FileViewer.tsx`
  - File content display
  - Syntax highlighting

---

## Configuration Files

- ✅ `frontend/package.json` - Dependencies
- ✅ `frontend/tsconfig.json` - TypeScript config
- ✅ `frontend/next.config.mjs` - Next.js config
- ✅ `frontend/postcss.config.mjs` - PostCSS config
- ✅ `.env.local` - Environment variables

---

## Documentation Files

- ✅ `GENERATIVE_UI_ARCHITECTURE_COMPLETE.md` - This complete architecture doc
- ✅ `GENERATIVE_UI_FILES_INVENTORY.md` - This file
- 📄 `GENUI_FINAL_SUCCESS_REPORT.md` - Previous iteration report
- 📄 `GENUI_COMPLETE_SUMMARY.md` - Previous summary
- 📄 `COMPONENTS_DOCUMENTATION.md` - Component docs
- 📄 `TESTING_RESULTS_FINAL.md` - Test results

---

## Old/Deprecated Files

These were created during iterative development and may have useful patterns:

- `frontend/components/cards/MarketDataCard.tsx.OLD` - Old implementation
- Various `GENUI_*.md` files - Previous iteration documentation
- `WORKSPACE_*.md` files - Workspace feature documentation

---

## File Count Summary

| Category | Count |
|----------|-------|
| Backend Python files | 7 |
| CLI Tools | 11 |
| Frontend core | 4 |
| Card components | 20 |
| Agent components | 5 |
| UI primitives | 4 |
| Chart components | 4 |
| Workspace components | 3 |
| **TOTAL** | **58 files** |

---

## Lines of Code Estimate

| Category | Estimated LOC |
|----------|---------------|
| Backend | ~1,500 |
| Frontend Core | ~750 |
| Card Components | ~2,500 |
| Supporting Components | ~800 |
| **TOTAL** | **~5,550 lines** |

(Excluding node_modules, dependencies, generated files)

---

## Key Directories

```
claude_finance_py/
├── agent_service/          # FastAPI backend
├── src/                    # Agent core + CLI wrappers
├── bin/                    # CLI tools (Python scripts)
├── frontend/
│   ├── app/               # Next.js app router
│   ├── components/
│   │   ├── cards/         # 20 card components
│   │   ├── agent/         # 5 agent components
│   │   ├── ui/            # 4 UI primitives
│   │   ├── charts/        # 4 chart components
│   │   └── workspace/     # 3 workspace components
│   └── lib/               # Hooks and context
└── runtime/
    └── workspace/         # Agent working directory
        ├── data/          # Market data, SEC filings
        ├── analysis/      # Calculations, diffs
        └── reports/       # Final reports
```

---

## Next Steps

1. **Read** `GENERATIVE_UI_ARCHITECTURE_COMPLETE.md` for full understanding
2. **Plan** new component architecture based on recommendations
3. **Design** simplified state management
4. **Implement** card registry pattern
5. **Add** TypeScript types
6. **Test** with component library (Storybook)

---

**Status**: Inventory complete
**Date**: 2025-10-03
**Purpose**: File reference before rebuild

