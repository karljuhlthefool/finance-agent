# Complete UI/UX Implementation Plan
## Making Agent Tool Processing Fully Transparent

Based on research of AI SDK (including RSC, `createStreamableUI`, and `onToolCall` patterns) and analysis of your CLI tools, here's the comprehensive plan to create an optimal, Bloomberg Terminal-level UX.

---

## 🎯 Core Objective

**Create a real-time, visually rich interface where users always know:**
1. What the agent is thinking/planning
2. Which tools are being called (with what arguments)
3. Progress of each tool execution
4. Results as they stream in
5. Agent's interpretation and insights

---

## 📚 Key AI SDK Patterns Discovered

### 1. **AI SDK Client-Side Patterns (What We're Using)**
```typescript
// Current approach: useChat + data annotations
const { messages, data } = useChat({
  api: '/api/chat',
  onToolCall: async ({ toolCall }) => {
    // Client-side tool execution (optional)
    // We handle tool calls server-side, so this is for display only
  }
})

// Data annotations: 2:[{...}]\n format
// Captured in `data` array, separate from message content
```

**Advantages**:
- ✅ Works with Claude Agent SDK (our backend)
- ✅ Real-time streaming of custom metadata
- ✅ Separate channel for UI updates vs text

**Limitations**:
- ❌ Can't stream React components from server (RSC requires server actions)
- ✅ Solution: We render components client-side based on streamed data

### 2. **AI SDK RSC Patterns (Alternative, More Advanced)**
```typescript
// Server-side streaming UI (requires server actions)
import { createStreamableUI } from 'ai/rsc'

async function serverAction() {
  const ui = createStreamableUI()
  
  // Stream UI updates
  ui.update(<LoadingCard />)
  const data = await fetchData()
  ui.update(<DataCard data={data} />)
  ui.done()
  
  return ui.value
}
```

**Note**: This requires Next.js server actions. Our current architecture uses Claude Agent SDK backend (FastAPI) → Next.js frontend, so we'll stick with client-side rendering based on streamed data annotations.

---

## 🏗️ Architecture

### Current Flow (What We Built)
```
Claude Agent SDK (Python)
  ↓ Emits events
Agent Service (FastAPI)
  ↓ Converts to NDJSON stream
API Route (route.ts)
  ↓ Formats as AI SDK data annotations
useChat Hook
  ↓ Captures in `data` array
Frontend Components
  ↓ Render based on cli_tool type
```

### Enhanced Flow (What We're Building)
```
Claude Agent SDK
  ↓ Emits: tool-start, tool-progress, tool-result, agent-thinking
Agent Service
  ↓ Enriches with: metadata, estimates, context
API Route
  ↓ Streams: Multiple data annotations per tool
useChat
  ↓ Manages: Tool state machine (loading → progress → result)
UI Orchestrator
  ↓ Routes to: Specialized components
  ↓ Shows: Progress indicators, live updates, insights
Specialized Cards
  ↓ Display: Rich visualizations, interactions, quick actions
```

---

## 🎨 Complete UI Component Hierarchy

### **Level 1: Core Layout Components**

#### 1.1 `ChatContainer`
- **Purpose**: Main container with optimal layout
- **Features**:
  - Responsive grid (desktop: 2-col, tablet: 1-col)
  - Smooth scroll to bottom
  - Keyboard shortcuts (Cmd+K to focus input)
  
#### 1.2 `AgentThinkingBubble` ⭐ NEW
- **Purpose**: Show agent's reasoning before tool calls
- **Trigger**: When agent is "thinking" (between user input and first tool)
- **Design**:
  ```tsx
  <ThinkingBubble>
    <AnimatedDots />
    <ThinkingText>
      "Analyzing TSLA request... I'll need to:
      1. Fetch market data (prices, fundamentals)
      2. Calculate growth metrics
      3. Run DCF valuation"
    </ThinkingText>
  </ThinkingBubble>
  ```

#### 1.3 `ToolChainFlowVisualizer` ⭐ NEW
- **Purpose**: Show tool execution pipeline
- **Design**:
  ```tsx
  <FlowVisualizer>
    <ToolNode status="complete" icon="📊">
      mf-market-get
      <Badge>2.1s</Badge>
    </ToolNode>
    <Arrow />
    <ToolNode status="active" icon="🧮">
      mf-calc-simple
      <Progress value={65%} />
    </ToolNode>
    <Arrow />
    <ToolNode status="pending" icon="💰">
      mf-valuation
    </ToolNode>
  </FlowVisualizer>
  ```

#### 1.4 `SessionTimeline` ⭐ NEW
- **Purpose**: Left sidebar showing full session history
- **Features**:
  - Collapsible entries
  - Click to jump to tool card
  - "Rerun with different ticker" button
  - Export session button

### **Level 2: Tool Card Components** (Enhanced)

#### 2.1 `MarketDataCard` (Enhanced)
**Current**: Shows file list
**Enhanced**: Multi-tab data explorer

```tsx
<MarketDataCard ticker="TSLA" status="loading|active|complete">
  {/* Header with ticker badge and status */}
  <Header>
    <TickerBadge>TSLA</TickerBadge>
    <StatusIndicator status={status} />
    <QuickActions>
      <Action icon="📊">Chart</Action>
      <Action icon="🔍">Compare</Action>
      <Action icon="💬">Ask Agent</Action>
    </QuickActions>
  </Header>
  
  {/* Loading state: Show progress */}
  {status === 'loading' && (
    <ProgressGrid>
      <ProgressItem field="prices" status="fetching" />
      <ProgressItem field="fundamentals" status="fetching" />
      <ProgressItem field="ratios" status="pending" />
    </ProgressGrid>
  )}
  
  {/* Loaded state: Show tabs */}
  {status === 'complete' && (
    <Tabs>
      <Tab icon="📈" label="Overview">
        <PriceCard current={$446} change={-2.9%} />
        <MiniChart data={prices_5y} height={120} />
        <KeyMetrics pe={45} roe={15%} eps={$2.50} />
      </Tab>
      
      <Tab icon="💰" label="Fundamentals">
        <QuarterlyTrendChart metric="revenue" />
        <FinancialMetricsGrid />
      </Tab>
      
      <Tab icon="👥" label="Analysts">
        <ConsensusGauge buy={15} hold={8} sell={2} />
        <PriceTargetRange low={$180} avg={$270} high={$350} />
      </Tab>
      
      <Tab icon="📂" label="Files" count={14}>
        <FileGrid paths={paths} />
      </Tab>
    </Tabs>
  )}
  
  {/* Insight bubble from agent */}
  <InsightBubble type="observation">
    💡 TSLA trading at $446 (-2.9%). P/E of 45x above sector average.
  </InsightBubble>
</MarketDataCard>
```

#### 2.2 `ValuationCard` (Enhanced)
**Current**: Simple base case display
**Enhanced**: Interactive scenario explorer

```tsx
<ValuationCard ticker="TSLA" status={status}>
  {/* Scenario toggle */}
  <ScenarioSlider value={scenario} onChange={setScenario}>
    <Scenario name="Bear" value={$180} color="red" />
    <Scenario name="Base" value={$250} color="blue" active />
    <Scenario name="Bull" value={$320} color="green" />
  </ScenarioSlider>
  
  {/* Valuation breakdown */}
  <DCFWaterfall>
    {/* Animated waterfall chart */}
    <Bar label="Operating FCF" value={$45B} />
    <Bar label="Terminal Value" value={$120B} positive />
    <Bar label="Enterprise Value" value={$165B} total />
    <Bar label="Per Share" value={$250} final />
  </DCFWaterfall>
  
  {/* Current price comparison */}
  <ComparisonGauge>
    <Needle position="current" value={$446} label="Current" />
    <Needle position="fair" value={$250} label="Fair Value" />
    <UpsideLabel>Overvalued by 78%</UpsideLabel>
  </ComparisonGauge>
  
  {/* Expandable assumptions */}
  <AssumptionPanel expandable>
    <Assumption label="WACC" value={8.5%} editable />
    <Assumption label="Terminal Growth" value={2.5%} editable />
    <Button onClick={recalculate}>Recalculate</Button>
  </AssumptionPanel>
  
  <InsightBubble type="warning">
    ⚠️ Current price 78% above DCF fair value. High valuation risk.
  </InsightBubble>
</ValuationCard>
```

#### 2.3 `CalculationCard` (Enhanced)
**Current**: Generic JSON display
**Enhanced**: Visual growth/delta display

```tsx
<CalculationCard operation="growth_yoy" ticker="TSLA">
  {/* Operation badge */}
  <Header>
    <Icon>🧮</Icon>
    <Title>Year-over-Year Growth Analysis</Title>
  </Header>
  
  {/* Growth sparklines */}
  <MetricGrid>
    <MetricRow label="Revenue Growth">
      <Sparkline data={[51%, 19%, 0.9%]} trend="down" />
      <CurrentValue>+0.9%</CurrentValue>
      <TrendBadge>⚠️ Decelerating</TrendBadge>
    </MetricRow>
    
    <MetricRow label="Net Income Growth">
      <Sparkline data={[128%, 19%, -52%]} trend="down" />
      <CurrentValue>-52.5%</CurrentValue>
      <TrendBadge>🔴 Declining</TrendBadge>
    </MetricRow>
    
    <MetricRow label="Cash Flow Growth">
      <Sparkline data={[26%, 51%, 12.6%]} trend="mixed" />
      <CurrentValue>+12.6%</CurrentValue>
      <TrendBadge>🟡 Mixed</TrendBadge>
    </MetricRow>
  </MetricGrid>
  
  {/* Comparison bars */}
  <ComparisonSection>
    <ComparisonBar>
      <Bar label="TSLA" value={0.9%} color="blue" />
      <Bar label="Sector Avg" value={18%} color="gray" />
      <Bar label="Top Quartile" value={25%} color="green" />
    </ComparisonBar>
  </ComparisonSection>
  
  <InsightBubble type="observation">
    💡 Revenue growth decelerated sharply from 51% (2022) to 0.9% (2024). 
    This may pressure valuation multiples.
  </InsightBubble>
</CalculationCard>
```

#### 2.4 `QACard` ⭐ NEW
**For**: `mf-qa` tool (LLM-powered Q&A)

```tsx
<QACard>
  {/* Question display */}
  <Question>
    "What are the key risks in TSLA's latest 10-K?"
  </Question>
  
  {/* Processing steps (show while loading) */}
  <ProcessingSteps>
    <Step status="done" icon="✓">
      Loaded 10-K filing (2.5MB)
    </Step>
    <Step status="done" icon="✓">
      Split into 8 chunks
    </Step>
    <Step status="active" icon="⏳">
      Analyzing chunk 5/8...
      <ProgressBar value={62.5%} />
    </Step>
    <Step status="pending" icon="○">
      Synthesizing final answer
    </Step>
  </ProcessingSteps>
  
  {/* Streaming answer (word-by-word) */}
  <Answer streaming>
    <StreamingText>
      Tesla faces several material risks:
      
      1. **Production Scaling** - Meeting ambitious...
      2. **Regulatory Compliance** - Increasing scrutiny...
      3. **Competition** - Traditional OEMs accelerating...
    </StreamingText>
    
    {/* Citations appear as answer streams */}
    <CitationList>
      <Citation 
        page={45} 
        excerpt="production capacity limitations..."
        onClick={() => openFiling(45)}
      />
      <Citation 
        page={67} 
        excerpt="regulatory requirements in Europe..."
        onClick={() => openFiling(67)}
      />
    </CitationList>
  </Answer>
  
  {/* Cost badge */}
  <Footer>
    <CostBadge>
      <Icon>💰</Icon>
      <Amount>$0.12</Amount>
      <Details>24K input + 850 output tokens</Details>
    </CostBadge>
    
    <ModelBadge>
      claude-3-5-sonnet-latest
    </ModelBadge>
  </Footer>
  
  {/* Follow-up suggestions */}
  <FollowUpSuggestions>
    <Suggestion onClick={() => ask(...)}>
      How have these risks changed YoY?
    </Suggestion>
    <Suggestion onClick={() => ask(...)}>
      What mitigations are in place?
    </Suggestion>
  </FollowUpSuggestions>
</QACard>
```

#### 2.5 `FilingExtractCard` ⭐ NEW
**For**: `mf-filing-extract` tool

```tsx
<FilingExtractCard filing="10-K" date="2024-11-01">
  {/* Mode selector */}
  <ModeSelector value={mode} onChange={setMode}>
    <Mode value="sections">Extract Sections</Mode>
    <Mode value="search">Search Keywords</Mode>
    <Mode value="regex">Regex Search</Mode>
  </ModeSelector>
  
  {/* Section extraction results */}
  {mode === 'sections' && (
    <SectionGrid>
      <SectionCard name="MD&A" size="45KB" status="extracted">
        <Preview>
          Management's Discussion reveals revenue growth 
          deceleration driven by...
        </Preview>
        <Actions>
          <Button onClick={() => openFull()}>Read Full</Button>
          <Button onClick={() => summarize()}>Summarize</Button>
          <Button onClick={() => compareYoY()}>Compare YoY</Button>
        </Actions>
      </SectionCard>
      
      <SectionCard name="Risk Factors" size="23KB" status="extracted">
        <RiskHighlight>
          <RiskBadge severity="high">18 risks identified</RiskBadge>
          <TopRisks>
            <Risk severity="high">Production scaling</Risk>
            <Risk severity="medium">Regulatory</Risk>
            <Risk severity="medium">Supply chain</Risk>
          </TopRisks>
        </RiskHighlight>
      </SectionCard>
      
      <SectionCard name="Business" size="67KB" status="extracted" />
    </SectionGrid>
  )}
  
  {/* Keyword search results */}
  {mode === 'search' && (
    <SearchResults>
      <SearchQuery>
        Keywords: "artificial intelligence", "machine learning", "AI"
      </SearchQuery>
      
      <HeatMap filing={filing} keywords={keywords} />
      
      <MatchList>
        <Match page={23} score={95}>
          ...leveraging <mark>AI and machine learning</mark> 
          for autonomous driving...
        </Match>
        <Match page={45} score={87}>
          ...<mark>AI</mark>-driven features in FSD Beta...
        </Match>
      </MatchList>
    </SearchResults>
  )}
</FilingExtractCard>
```

#### 2.6 `EstimatesCard` ⭐ NEW
**For**: `mf-estimates-get` tool

```tsx
<EstimatesCard ticker="TSLA" metric="revenue">
  {/* Consensus timeline chart */}
  <ConsensusChart>
    <Line 
      label="High Estimate" 
      data={highEstimates} 
      color="green-light" 
      dash 
    />
    <Line 
      label="Consensus" 
      data={consensus} 
      color="blue" 
      bold 
    />
    <Line 
      label="Low Estimate" 
      data={lowEstimates} 
      color="red-light" 
      dash 
    />
    <Line 
      label="Actual" 
      data={actuals} 
      color="black" 
      markers 
    />
  </ConsensusChart>
  
  {/* Recent revisions */}
  <RevisionTracker>
    <Revision date="2025-10-01" direction="up">
      <Analyst>Goldman Sachs</Analyst>
      <Change>$95B → $105B (+11%)</Change>
      <Reason>Strong Q3 delivery numbers</Reason>
    </Revision>
    <Revision date="2025-09-28" direction="down">
      <Analyst>Morgan Stanley</Analyst>
      <Change>$110B → $102B (-7%)</Change>
      <Reason>Margin pressure concerns</Reason>
    </Revision>
  </RevisionTracker>
  
  {/* Beat/miss history */}
  <BeatMissHistory>
    <Quarter q="Q1 2024" actual={$25.5B} estimate={$23.2B} beat={+10%} />
    <Quarter q="Q2 2024" actual={$24.9B} estimate={$26.1B} miss={-4.6%} />
    <Quarter q="Q3 2024" actual={$27.2B} estimate={$25.8B} beat={+5.4%} />
  </BeatMissHistory>
  
  <InsightBubble type="mixed">
    📊 Consensus estimates showing divergence. Range widened 
    from $8B to $25B, indicating high uncertainty.
  </InsightBubble>
</EstimatesCard>
```

### **Level 3: Micro-Components**

#### 3.1 `InsightBubble` ⭐ NEW
**Purpose**: Agent-generated contextual insights
**Types**: `observation`, `warning`, `action`, `success`

```tsx
<InsightBubble type="observation" icon="💡">
  Revenue growth decelerated from 51% to 0.9% over 2 years.
</InsightBubble>

<InsightBubble type="warning" icon="⚠️">
  P/E ratio of 80x is elevated vs historical average (45x).
</InsightBubble>

<InsightBubble type="action" icon="🎯">
  Consider comparing with RIVN and LCID using compare tool.
</InsightBubble>
```

#### 3.2 `ProgressIndicator` ⭐ NEW
**Purpose**: Show tool execution progress

```tsx
// Indeterminate (unknown duration)
<ProgressIndicator type="indeterminate">
  Fetching market data...
</ProgressIndicator>

// Determinate (known progress)
<ProgressIndicator type="determinate" value={65} max={100}>
  Processing 5/8 chunks...
</ProgressIndicator>

// With sub-steps
<ProgressIndicator type="steps">
  <Step status="done">Fetch prices</Step>
  <Step status="active">Calculate metrics</Step>
  <Step status="pending">Generate report</Step>
</ProgressIndicator>
```

#### 3.3 `MiniChart` Components
**Purpose**: Inline data visualizations

```tsx
// Sparkline (tiny trend line)
<Sparkline data={[10, 12, 15, 14, 18]} color="green" />

// Mini bar chart
<MiniBarChart data={[{label: 'Q1', value: 25}, ...]} />

// Mini line chart
<MiniLineChart data={prices} height={80} />

// Gauge
<Gauge value={75} max={100} color="blue" label="75%" />
```

---

## 🔄 State Management

### Tool State Machine
```typescript
type ToolState = 
  | { status: 'pending', toolId: string, cli_tool: string, metadata: any }
  | { status: 'starting', toolId: string, cli_tool: string, metadata: any, startTime: number }
  | { status: 'progress', toolId: string, cli_tool: string, metadata: any, progress: number }
  | { status: 'complete', toolId: string, cli_tool: string, result: any, duration: number }
  | { status: 'error', toolId: string, cli_tool: string, error: string }

// Transitions:
// pending → starting (when tool-start received)
// starting → progress (when progress updates received)  
// progress → complete (when tool-result received)
// * → error (when tool-error received)
```

### Global State Context
```typescript
const SessionContext = {
  toolCalls: Map<string, ToolState>,
  insights: InsightBubble[],
  timeline: TimelineEntry[],
  activeToolChain: string[],
}
```

---

## 📡 Enhanced Backend Events

### Current Events
```json
{
  "type": "data",
  "event": "agent.tool-start",
  "tool_id": "xyz",
  "cli_tool": "mf-market-get",
  "metadata": {"ticker": "TSLA", "fields": [...]}
}

{
  "type": "data",
  "event": "agent.tool-result",
  "tool_id": "xyz",
  "result": {...}
}
```

### NEW Events to Add

#### 1. **Agent Thinking Event**
```json
{
  "type": "data",
  "event": "agent.thinking",
  "message": "Analyzing TSLA request. I'll fetch market data, calculate growth, and run a DCF valuation.",
  "plan": ["mf-market-get", "mf-calc-simple", "mf-valuation-basic-dcf"]
}
```

#### 2. **Tool Progress Event**
```json
{
  "type": "data",
  "event": "agent.tool-progress",
  "tool_id": "xyz",
  "progress": 65,
  "message": "Fetched 9/14 fields..."
}
```

#### 3. **Agent Insight Event**
```json
{
  "type": "data",
  "event": "agent.insight",
  "insight_type": "observation|warning|action",
  "message": "Revenue growth decelerated from 51% to 0.9% over 2 years.",
  "context": {"ticker": "TSLA", "metric": "revenue_growth"}
}
```

#### 4. **Tool Chain Event**
```json
{
  "type": "data",
  "event": "agent.tool-chain",
  "chain": ["tool-id-1", "tool-id-2", "tool-id-3"],
  "current_index": 1
}
```

---

## 🎯 Implementation Phases

### **Phase 1: Enhanced Core Cards** (Week 1, 20-25 hours)
**Goal**: Make existing tools shine

1. **MarketDataCard Multi-Tab Enhancement** (8h)
   - Build tab navigation system
   - Create Overview tab with mini price chart
   - Create Fundamentals tab with trend chart
   - Create Analysts tab with consensus gauge
   - Wire up with real data from TSLA results

2. **ValuationCard Scenario Slider** (6h)
   - Build scenario toggle UI
   - Create DCF waterfall visualization
   - Add current price comparison gauge
   - Make assumptions editable (client-side recalc)

3. **CalculationCard with Sparklines** (6h)
   - Build growth metric display with sparklines
   - Add trend badges (accelerating/decelerating)
   - Create comparison bars (vs sector avg)
   - Add YoY vs QoQ toggle

### **Phase 2: Transparency & Progress** (Week 2, 25-30 hours)
**Goal**: Make agent process fully visible

4. **AgentThinkingBubble** (4h)
   - Detect "thinking" state
   - Show agent's plan
   - Animated dots + estimated time

5. **ToolChainFlowVisualizer** (8h)
   - Build flow diagram component
   - Show tool sequence with statuses
   - Add progress indicators per tool
   - Make clickable (jump to tool card)

6. **Enhanced Progress Indicators** (5h)
   - Build ProgressIndicator components
   - Add to all tool cards
   - Show sub-steps where applicable
   - Add time estimates

7. **SessionTimeline Sidebar** (8h)
   - Build collapsible sidebar
   - Show chronological tool history
   - Add "rerun with X" buttons
   - Add export session feature

### **Phase 3: New Tool Cards** (Week 3, 25-30 hours)
**Goal**: Support all CLI tools

8. **QACard with Streaming** (10h)
   - Build processing steps UI
   - Implement word-by-word streaming display
   - Add citation list with click-to-open
   - Show cost badge and model info
   - Add follow-up suggestions

9. **FilingExtractCard** (8h)
   - Build section grid layout
   - Create heatmap visualization
   - Add keyword match highlighting
   - Build YoY comparison view

10. **EstimatesCard** (7h)
    - Build consensus timeline chart
    - Create revision tracker
    - Add beat/miss history
    - Show range divergence indicator

### **Phase 4: Intelligence & Polish** (Week 4, 20-25 hours)
**Goal**: Make it feel intelligent

11. **InsightBubble System** (8h)
    - Build insight bubble component
    - Wire up backend insight events
    - Add context-aware icon/color
    - Make dismissible/expandable

12. **Micro-interactions & Animations** (8h)
    - Add entrance animations (slide up + fade)
    - Number ticker effects
    - Hover previews on files
    - Success/error animations
    - Loading skeleton screens

13. **Quick Actions & Shortcuts** (4h)
    - Add quick action bars to all cards
    - Implement "Chart It" → opens mini modal
    - Implement "Compare" → multi-ticker mode
    - Implement "Ask Agent" → prefills question

---

## 📦 Component Library Structure

```
frontend/
├── components/
│   ├── cards/              # Tool-specific cards
│   │   ├── MarketDataCard.tsx ✅ (enhanced)
│   │   ├── ValuationCard.tsx ✅ (enhanced)
│   │   ├── CalculationCard.tsx ✅ (enhanced)
│   │   ├── QACard.tsx ⭐ NEW
│   │   ├── FilingExtractCard.tsx ⭐ NEW
│   │   ├── EstimatesCard.tsx ⭐ NEW
│   │   └── GenericToolCard.tsx (fallback)
│   │
│   ├── agent/              # Agent-specific UI
│   │   ├── AgentThinkingBubble.tsx ⭐ NEW
│   │   ├── ToolChainFlow.tsx ⭐ NEW
│   │   ├── InsightBubble.tsx ⭐ NEW
│   │   └── SessionTimeline.tsx ⭐ NEW
│   │
│   ├── charts/             # Visualization components
│   │   ├── Sparkline.tsx ⭐ NEW
│   │   ├── MiniLineChart.tsx ⭐ NEW
│   │   ├── MiniBarChart.tsx ⭐ NEW
│   │   ├── Gauge.tsx ⭐ NEW
│   │   ├── Waterfall.tsx ⭐ NEW
│   │   └── HeatMap.tsx ⭐ NEW
│   │
│   ├── ui/                 # Base UI primitives
│   │   ├── Tabs.tsx ⭐ NEW
│   │   ├── ProgressIndicator.tsx ⭐ NEW
│   │   ├── Badge.tsx ⭐ NEW
│   │   ├── Tooltip.tsx ⭐ NEW
│   │   └── Modal.tsx ⭐ NEW
│   │
│   └── layout/
│       ├── ChatContainer.tsx (enhanced)
│       └── Sidebar.tsx ⭐ NEW
│
├── hooks/
│   ├── useToolStates.ts ⭐ NEW
│   ├── useSessionTimeline.ts ⭐ NEW
│   └── useChartAnimation.ts ⭐ NEW
│
├── lib/
│   ├── tool-state-machine.ts ⭐ NEW
│   └── chart-utils.ts ⭐ NEW
│
└── contexts/
    └── SessionContext.tsx ⭐ NEW
```

---

## 🎨 Design System

### Color Palette by Tool Category
```css
/* Market Data */
--market-primary: #3B82F6;    /* Blue */
--market-gradient: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);

/* Valuation */
--valuation-primary: #8B5CF6; /* Purple */
--valuation-gradient: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);

/* Calculations */
--calc-primary: #10B981;       /* Green */
--calc-gradient: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);

/* Q&A / AI */
--qa-primary: #06B6D4;         /* Cyan */
--qa-gradient: linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%);

/* Filings */
--filing-primary: #F59E0B;     /* Orange */
--filing-gradient: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);

/* Estimates */
--estimate-primary: #EF4444;   /* Red */
--estimate-gradient: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
```

### Animation Timing
```css
--timing-fast: 150ms;       /* Quick feedback (hover, click) */
--timing-normal: 300ms;     /* Standard transitions */
--timing-slow: 500ms;       /* Large layout changes */
--timing-dramatic: 800ms;   /* Entrance animations */

--easing-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
--easing-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
--easing-accelerate: cubic-bezier(0.4, 0.0, 1, 1);
--easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Spacing Scale
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
```

---

## 🚀 Quick Start Implementation

### Priority 1: Visual Impact (First 2 days)
1. Build `Tabs` component
2. Enhance `MarketDataCard` with tabs
3. Add mini price chart
4. Test with TSLA data

**Result**: Immediate "wow" factor when users see rich market data display

### Priority 2: Transparency (Next 3 days)
1. Build `ToolChainFlowVisualizer`
2. Add `ProgressIndicator` to all cards
3. Implement `AgentThinkingBubble`

**Result**: Users always know what's happening

### Priority 3: Intelligence (Final 5 days)
1. Build `InsightBubble` system
2. Wire up backend insight events
3. Add sparklines to `CalculationCard`
4. Polish animations

**Result**: Agent feels smart and helpful

---

## 📊 Success Metrics

### User Experience
- **Transparency**: 100% of tool calls visible to user
- **Responsiveness**: UI updates within 100ms of data arrival
- **Clarity**: Users understand agent process without guesswork

### Technical
- **Performance**: < 16ms render time per component
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile**: Fully responsive on 375px+ screens

### Business
- **Engagement**: Users interact with tool cards (click files, toggle tabs)
- **Retention**: Users return to see session history
- **Trust**: Users trust agent's analysis due to transparency

---

## 🔧 Technical Considerations

### Performance
- Use React.memo for expensive chart components
- Virtualize long file lists
- Debounce sparkline animations
- Use CSS transforms for smooth animations

### Accessibility
- Keyboard navigation for all interactive elements
- ARIA labels for charts and progress indicators
- Screen reader announcements for status changes
- Focus management for modals and tabs

### Testing
- Unit tests for state machine logic
- Integration tests for tool state transitions
- E2E tests for complete user flows
- Visual regression tests for charts

---

## 🎯 Next Steps

**1. Review & Approve** (You decide)
- Review this plan
- Prioritize phases
- Approve component designs

**2. Start Building** (I implement)
- Begin with Phase 1 (Enhanced Core Cards)
- Work incrementally
- Test with real TSLA data at each step

**3. Iterate** (We collaborate)
- Get your feedback
- Refine designs
- Add polish

**Ready to start building? Which phase would you like me to tackle first?**

I recommend starting with **MarketDataCard Multi-Tab Enhancement** since it will have immediate visual impact and demonstrate the pattern for other cards!

