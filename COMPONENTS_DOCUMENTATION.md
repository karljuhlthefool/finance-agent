# Frontend Components Documentation

**Date:** October 3, 2025
**Total Components:** 33
**Used Components:** 19 (58%)
**Unused Components:** 14 (42%)

---

## 📊 **Component Usage Overview**

### 🎯 **Currently Used (19/33 - 58%)**

#### **Card Components (9/19)**
- ✅ **ToolCallCard** - NEW: Shows tool execution during runtime
- ✅ **MarketDataCards** - Smart router for market data visualization
- ✅ **GenericToolCard** - Fallback for unhandled tool results
- ✅ **ValuationCard** - DCF valuation scenarios
- ✅ **CalculationCard** - Growth calculations with sparklines
- ✅ **QACard** - Document Q&A results
- ✅ **FilingExtractCard** - SEC filing extraction results
- ✅ **EstimatesCard** - Analyst estimates data
- ✅ **LogsCard** - System logs display

#### **Agent Components (3/4)**
- ✅ **ToolChainFlow** - Tool execution visualization (DISABLED)
- ✅ **AgentThinkingBubble** - Shows agent thinking state
- ✅ **SessionTimeline** - Session history and metrics
- ❌ **InsightBubble** - NOT DIRECTLY USED (used within cards)

#### **Workspace Components (3/3)**
- ✅ **WorkspacePanel** - Main workspace interface
- ✅ **FileTree** - File system navigation
- ✅ **FileViewer** - File content display

#### **Chart Components (2/4)**
- ✅ **Sparkline** - Tiny trend charts
- ✅ **Gauge** - Progress/value indicators
- ✅ **Waterfall** - DCF value breakdown charts
- ❌ **MiniLineChart** - NOT USED

#### **UI Components (2/4)**
- ✅ **Badge** - Status indicators and labels
- ✅ **Tooltip** - Hover information display
- ❌ **ProgressIndicator** - NOT DIRECTLY USED (used within cards)
- ❌ **Tabs** - NOT USED

---

## ❌ **Unused Components (14/33 - 42%)**

### **Legacy Card Components (7/14)**
- ❌ **MarketDataCard.tsx.OLD** - Old monolithic card (replaced by MarketDataCards)
- ❌ **FundamentalsCard** - Replaced by CompactDataCard in MarketDataCards
- ❌ **MetricsCard** - Replaced by CompactDataCard in MarketDataCards
- ❌ **PriceHistoryCard** - Replaced by CompactDataCard in MarketDataCards
- ❌ **ProfileCard** - Replaced by CompactProfileCard in MarketDataCards
- ❌ **QuoteCard** - Replaced by CompactQuoteCard in MarketDataCards
- ❌ **SummaryCard** - Replaced by CompactSummaryCard in MarketDataCards

### **Unused Chart Components (2/4)**
- ❌ **MiniLineChart** - Created but never integrated
- ❌ **Waterfall** - Created but not currently used in active cards

### **Unused UI Components (2/4)**
- ❌ **ProgressIndicator** - Used only in old MarketDataCard
- ❌ **Tabs** - Used only in old MarketDataCard

### **Unused Agent Components (1/4)**
- ❌ **InsightBubble** - Used within cards but not directly imported in main app

### **Unused Workspace Components (0/3)**
All workspace components are actively used.

---

## 📁 **Component Directory Structure**

```
frontend/components/
├── cards/           # 21 total, 14 used, 7 unused
├── agent/           # 4 total, 3 used, 1 unused
├── charts/          # 4 total, 2 used, 2 unused
├── ui/              # 4 total, 2 used, 2 unused
└── workspace/       # 3 total, 3 used, 0 unused
```

---

## 🔍 **Detailed Component Analysis**

### **🎯 Active Card Components**

#### **ToolCallCard** (NEW - CRITICAL)
```typescript
// Shows tool execution during runtime
// Usage: Renders immediately when tool starts
// Purpose: Clean visualization of what tool is running
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `cards/ToolCallCard.tsx`
- **Usage**: Main app `page.tsx`
- **Purpose**: Shows tool execution with parameters
- **Example**: "📊 Market Data Ticker: AAPL Fields: 14"

#### **MarketDataCards** (REFACTORED - CRITICAL)
```typescript
// Smart router component for market data
// Replaces old MarketDataCard.tsx.OLD
// Uses Compact* components for clean UI
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `cards/MarketDataCards.tsx`
- **Usage**: Main app `page.tsx`
- **Purpose**: Orchestrates display of market data cards
- **Components Used**: CompactSummaryCard, CompactProfileCard, CompactQuoteCard, CompactDataCard

#### **GenericToolCard** (FALLBACK)
```typescript
// Collapsible tool result display
// Used for tools without specialized cards
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `cards/GenericToolCard.tsx`
- **Usage**: Main app `page.tsx`
- **Purpose**: Fallback for unhandled tool results

### **🎯 Active Agent Components**

#### **ToolChainFlow** (DISABLED)
```typescript
// Tool execution pipeline visualization
// Currently disabled in main app (line 377: false &&)
```
- **Status**: ✅ IMPORTED but DISABLED
- **Location**: `agent/ToolChainFlow.tsx`
- **Usage**: Main app `page.tsx` (disabled)
- **Purpose**: Visual tool execution flow

#### **AgentThinkingBubble** (ACTIVE)
```typescript
// Shows when agent is processing/thinking
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `agent/AgentThinkingBubble.tsx`
- **Usage**: Main app `page.tsx`
- **Purpose**: Real-time thinking indicator

#### **SessionTimeline** (ACTIVE)
```typescript
// Session history and performance metrics
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `agent/SessionTimeline.tsx`
- **Usage**: Main app `page.tsx`
- **Purpose**: Shows session history and tool performance

### **🎯 Active Chart Components**

#### **Sparkline** (USED)
```typescript
// Tiny trend line charts for data visualization
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `charts/Sparkline.tsx`
- **Usage**: CalculationCard, PriceHistoryCard, EstimatesCard
- **Purpose**: Show trend data in compact form

#### **Gauge** (USED)
```typescript
// Progress/value indicators
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `charts/Gauge.tsx`
- **Usage**: ValuationCard, EstimatesCard
- **Purpose**: Show value comparisons and progress

#### **Waterfall** (CREATED but UNUSED)
```typescript
// DCF value breakdown visualization
```
- **Status**: ❌ CREATED but NOT USED
- **Location**: `charts/Waterfall.tsx`
- **Usage**: Created for ValuationCard but not integrated
- **Purpose**: Show DCF calculation breakdown

#### **MiniLineChart** (CREATED but UNUSED)
```typescript
// Small line charts for trend data
```
- **Status**: ❌ CREATED but NOT USED
- **Location**: `charts/MiniLineChart.tsx`
- **Usage**: Created for old MarketDataCard but never used
- **Purpose**: Alternative to Sparkline for trend data

### **🎯 Active UI Components**

#### **Badge** (HEAVILY USED)
```typescript
// Status indicators and labels
// Used throughout cards for status, categories, etc.
```
- **Status**: ✅ HEAVILY USED
- **Location**: `ui/Badge.tsx`
- **Usage**: All card components, ToolChainFlow
- **Purpose**: Status indicators, categories, labels

#### **Tooltip** (USED)
```typescript
// Hover information display
```
- **Status**: ✅ ACTIVELY USED
- **Location**: `ui/Tooltip.tsx`
- **Usage**: FilingExtractCard, EstimatesCard, QACard
- **Purpose**: Show additional info on hover

#### **ProgressIndicator** (USED INDIRECTLY)
```typescript
// Loading state indicators
```
- **Status**: ✅ USED in old MarketDataCard
- **Location**: `ui/ProgressIndicator.tsx`
- **Usage**: Only in old MarketDataCard.tsx.OLD
- **Purpose**: Show loading progress

#### **Tabs** (USED INDIRECTLY)
```typescript
// Tabbed content interface
```
- **Status**: ✅ USED in old MarketDataCard
- **Location**: `ui/Tabs.tsx`
- **Usage**: Only in old MarketDataCard.tsx.OLD
- **Purpose**: Tabbed content organization

---

## 🗑️ **Cleanup Recommendations**

### **Safe to Delete (7 components)**
1. **MarketDataCard.tsx.OLD** - Completely replaced by MarketDataCards
2. **FundamentalsCard.tsx** - Replaced by CompactDataCard
3. **MetricsCard.tsx** - Replaced by CompactDataCard
4. **PriceHistoryCard.tsx** - Replaced by CompactDataCard
5. **ProfileCard.tsx** - Replaced by CompactProfileCard
6. **QuoteCard.tsx** - Replaced by CompactQuoteCard
7. **SummaryCard.tsx** - Replaced by CompactSummaryCard

### **Consider Removing (4 components)**
1. **MiniLineChart.tsx** - Not used, Sparkline serves same purpose
2. **Waterfall.tsx** - Not integrated, could be added to ValuationCard
3. **ProgressIndicator.tsx** - Only used in old card, not needed for new system
4. **Tabs.tsx** - Only used in old card, new cards don't need tabs

### **Keep for Future (3 components)**
1. **InsightBubble.tsx** - Used within cards, good for future features
2. **ToolChainFlow.tsx** - Currently disabled but useful for debugging
3. **SessionTimeline.tsx** - Good for performance monitoring

---

## 📈 **Component Usage Statistics**

| Category | Total | Used | Unused | Usage % |
|----------|-------|------|--------|---------|
| Cards | 21 | 14 | 7 | 67% |
| Agent | 4 | 3 | 1 | 75% |
| Charts | 4 | 2 | 2 | 50% |
| UI | 4 | 2 | 2 | 50% |
| Workspace | 3 | 3 | 0 | 100% |
| **TOTAL** | **33** | **19** | **14** | **58%** |

---

## 🔄 **Migration Status**

### **Completed Migrations**:
- ✅ **MarketDataCard** → **MarketDataCards** (atomic design)
- ✅ **SummaryCard** → **CompactSummaryCard**
- ✅ **ProfileCard** → **CompactProfileCard**
- ✅ **QuoteCard** → **CompactQuoteCard**
- ✅ **PriceHistoryCard** → **CompactDataCard**
- ✅ **FundamentalsCard** → **CompactDataCard**
- ✅ **MetricsCard** → **CompactDataCard**

### **Pending Migrations**:
- ⚠️ **Waterfall** → Integrate into ValuationCard
- ⚠️ **MiniLineChart** → Replace Sparkline where appropriate
- ⚠️ **InsightBubble** → Use in more card types

---

## 🎯 **Component Health Score**

### **Excellent (90%+ Usage)**:
- Workspace components (100%)
- Agent components (75%)

### **Good (50-90% Usage)**:
- Card components (67%)
- Chart components (50%)
- UI components (50%)

### **Needs Attention (<50% Usage)**:
- None currently

---

## 🚀 **Future Development Recommendations**

### **High Priority**:
1. **Integrate Waterfall chart** into ValuationCard for better DCF visualization
2. **Clean up unused legacy cards** (7 components safe to delete)
3. **Consider removing unused chart/UI components** (4 components)

### **Medium Priority**:
1. **Expand InsightBubble usage** across more card types
2. **Add MiniLineChart** as alternative to Sparkline where appropriate
3. **Enable ToolChainFlow** for debugging when needed

### **Low Priority**:
1. **Archive old MarketDataCard.tsx.OLD** for reference
2. **Document component APIs** for future developers

---

## 📝 **Component API Summary**

### **Card Components API**:
```typescript
// ToolCallCard
<ToolCallCard toolName={string} cliTool={string} metadata={object} />

// MarketDataCards
<MarketDataCards toolId={string} metadata={object} result={object} />

// GenericToolCard
<GenericToolCard tool={string} payload={object} />
```

### **Agent Components API**:
```typescript
// ToolChainFlow (disabled)
<ToolChainFlow tools={array} />

// AgentThinkingBubble
<AgentThinkingBubble message={string} />

// SessionTimeline
<SessionTimeline history={array} />
```

### **Chart Components API**:
```typescript
// Sparkline
<Sparkline data={array} color={string} height={number} />

// Gauge
<Gauge value={number} max={number} color={string} />
```

---

**Summary**: 58% of components are actively used. 7 legacy cards can be safely deleted, 4 unused components should be considered for removal, and 3 components should be kept for future development.

