# MarketDataCard Redesign - Atomic, Specific Cards

## Problem Analysis

### Current Issues with MarketDataCard
1. **Too Large** - Single massive card with 4 tabs (Overview, Fundamentals, Analysts, Files)
2. **Too Generic** - Tries to show everything regardless of what was actually fetched
3. **Information Overload** - User can't quickly see what the agent accomplished
4. **Not Specific** - Doesn't reflect the actual CLI tool call parameters
5. **Tabs Feel Empty** - Most tab content is just placeholders saying "View data →"

### Current Card Size
```
┌─────────────────────────────────────────────────────┐
│ 📊 AAPL          Complete                           │
│ Market data for AAPL                                │
│                                                      │
│ Fields: 14    Time: 13.9s    Size: 536KB           │
│                                                      │
│ ┌─────────┬─────────────┬──────────┬──────────┐    │
│ │Overview │Fundamentals │ Analysts │ Files 15 │    │ ← 4 Tabs
│ └─────────┴─────────────┴──────────┴──────────┘    │
│                                                      │
│ Price History                                       │
│ View price data →                                   │
│                                                      │
│ Market Cap     P/E Ratio                           │
│ View data      View ratios                         │
│                                                      │
│ 💡 Fetched 14 data types for AAPL in 13.9s        │
└─────────────────────────────────────────────────────┘
```
**Height:** ~400px  
**Issues:** Tabs don't show content, just links. Takes up entire viewport.

---

## Redesign Philosophy

### Core Principles
1. **One Card = One Concept** - Each card shows ONE type of data
2. **Show What Was Fetched** - Card reflects actual CLI parameters
3. **Compact & Scannable** - Key metrics visible at a glance
4. **Expandable Details** - Click to see more, but defaults to compact
5. **Visual Hierarchy** - Most important info largest/first

### Atomic Card Breakdown

Instead of ONE big card, create MULTIPLE small cards based on what was actually fetched:

```
User: "Pull market data for AAPL"
Agent: mf-market-get with fields=["profile", "quote", "fundamentals", "key_metrics"]

Result: 4 Small Cards appear:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Profile Card │ │ Quote Card   │ │ Fundmtls Card│ │ Metrics Card │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Each card is ~100-150px tall, shows key info, clickable for details.

---

## New Card Types

### 1. **ProfileCard** (Company Overview)
**Size:** Compact (100px)  
**Trigger:** When `fields` includes `"profile"`

```
┌─────────────────────────────────────────┐
│ 🏢 Apple Inc.                    AAPL   │
│ Technology · $2.8T Market Cap           │
│ Cupertino, CA · Founded 1976            │
│ View full profile →                     │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Company name & ticker
- Sector & market cap
- Location & founded date
- Expand button for full description

---

### 2. **QuoteCard** (Real-time Price)
**Size:** Compact (120px)  
**Trigger:** When `fields` includes `"quote"`

```
┌─────────────────────────────────────────┐
│ 💹 AAPL Quote                            │
│                                          │
│     $178.25         +2.45 (1.39%)       │
│     ────────        ↑                   │
│                                          │
│ Vol: 52.3M  │ Avg: 58.1M  │ P/E: 29.2  │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Current price (large)
- Change $ and % (color-coded)
- Volume, average volume, P/E ratio
- Sparkline of today's price (optional)

---

### 3. **FundamentalsCard** (Financial Statements)
**Size:** Medium (180px)  
**Trigger:** When `fields` includes `"fundamentals"`

```
┌─────────────────────────────────────────┐
│ 📊 Fundamentals         Q3 2024         │
│                                          │
│ Revenue        $94.9B    +6.1% YoY      │
│ Net Income     $23.6B    +11.0% YoY     │
│ Op Cash Flow   $27.5B    +15.2% YoY     │
│ FCF            $25.1B    +18.7% YoY     │
│                                          │
│ 8 quarters available · View trends →    │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Latest quarter date
- Top 4 metrics (Revenue, Net Income, OCF, FCF)
- YoY growth rates
- Quarter count & expand option

---

### 4. **MetricsCard** (Key Ratios)
**Size:** Compact (130px)  
**Trigger:** When `fields` includes `"key_metrics"`

```
┌─────────────────────────────────────────┐
│ 📈 Key Metrics          Annual 2024     │
│                                          │
│ P/E: 29.2  │  P/B: 45.8  │  ROE: 147.4%│
│ P/S: 7.8   │  D/E: 1.97  │  ROA: 28.3% │
│                                          │
│ 10 years available · Compare →          │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Period (Annual/Quarter + Year)
- 6 most important ratios in grid
- Historical data count
- Compare button

---

### 5. **PriceHistoryCard** (Historical Prices)
**Size:** Medium (160px)  
**Trigger:** When `fields` includes `"prices"`

```
┌─────────────────────────────────────────┐
│ 💰 Price History        2Y Range        │
│                                          │
│     [Sparkline chart showing 2yr trend] │
│                                          │
│ Low: $124.17  │  High: $199.62          │
│ Current: $178.25  │  52W: $164.08       │
│                                          │
│ 504 days · View chart →                 │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Time range (2Y, 5Y, etc.)
- Sparkline/mini chart
- High/low/current prices
- 52-week average
- Expand to full chart

---

### 6. **AnalystCard** (Analyst Recommendations)
**Size:** Compact (120px)  
**Trigger:** When `fields` includes `"analyst_recs"` or `"price_target"`

```
┌─────────────────────────────────────────┐
│ 👥 Analyst Consensus                    │
│                                          │
│ Buy: 23  │  Hold: 8  │  Sell: 2        │
│ ████████████▓▓▓░░                       │
│                                          │
│ Target: $195  │  Upside: +9.4%         │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Buy/Hold/Sell counts
- Visual bar showing distribution
- Price target & upside potential
- Latest updates

---

### 7. **GrowthCard** (Growth Rates)
**Size:** Medium (150px)  
**Trigger:** When `fields` includes `"growth"`

```
┌─────────────────────────────────────────┐
│ 📈 Growth Rates         5Y Average      │
│                                          │
│ Revenue        8.9% ▓▓▓▓▓▓▓▓░░          │
│ Net Income    12.3% ▓▓▓▓▓▓▓▓▓▓▓░        │
│ EPS           14.7% ▓▓▓▓▓▓▓▓▓▓▓▓▓░      │
│ FCF           11.2% ▓▓▓▓▓▓▓▓▓▓░░        │
│                                          │
│ View quarterly trends →                 │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Period (5Y, 3Y, etc.)
- 4 key growth metrics
- Visual bars for quick comparison
- Link to detailed trends

---

### 8. **SegmentsCard** (Revenue Breakdown)
**Size:** Medium (170px)  
**Trigger:** When `fields` includes `"segments_product"` or `"segments_geo"`

```
┌─────────────────────────────────────────┐
│ 🗂️ Revenue Segments     Product Mix     │
│                                          │
│ iPhone       $200.6B  ████████████░░░   │
│ Services      $85.2B  ████░░░░░░░░░░   │
│ Mac           $40.2B  ██░░░░░░░░░░░░   │
│ iPad          $28.3B  █░░░░░░░░░░░░░   │
│ Other         $39.8B  ██░░░░░░░░░░░░   │
│                                          │
│ FY 2024 · Switch to Geographic →        │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Segment type (Product/Geographic)
- Top segments with revenue
- Visual bars showing proportion
- Toggle to switch views

---

### 9. **SummaryCard** (Overall Metrics)
**Size:** Small (80px)  
**Always Shown** - Replaces the InsightBubble

```
┌─────────────────────────────────────────┐
│ 📦 Data Fetched                         │
│ 14 datasets · 13.9s · 536KB · FMP      │
└─────────────────────────────────────────┘
```

**Key Data Shown:**
- Count of datasets
- Fetch time
- Data size
- Source (FMP/CapIQ/SEC)

---

## Layout Strategy

### Vertical Flow with Card Grid
```
┌────────────────────────────────────────────────────┐
│ Tool Chain: market-get (1.0s)                     │
├────────────────────────────────────────────────────┤
│                                                     │
│ ┌────────────────┐ ┌────────────────┐             │
│ │ SummaryCard    │ │ ProfileCard    │             │  ← Row 1: Context
│ └────────────────┘ └────────────────┘             │
│                                                     │
│ ┌────────────────┐ ┌────────────────┐             │
│ │ QuoteCard      │ │ MetricsCard    │             │  ← Row 2: Current State
│ └────────────────┘ └────────────────┘             │
│                                                     │
│ ┌────────────────────────────────────┐             │
│ │ FundamentalsCard                   │             │  ← Row 3: Financials
│ └────────────────────────────────────┘             │
│                                                     │
│ ┌────────────────┐ ┌────────────────┐             │
│ │ GrowthCard     │ │ AnalystCard    │             │  ← Row 4: Trends
│ └────────────────┘ └────────────────┘             │
│                                                     │
│ ┌────────────────────────────────────┐             │
│ │ PriceHistoryCard                   │             │  ← Row 5: History
│ └────────────────────────────────────┘             │
│                                                     │
│ ┌────────────────────────────────────┐             │
│ │ SegmentsCard                       │             │  ← Row 6: Breakdown
│ └────────────────────────────────────┘             │
└────────────────────────────────────────────────────┘
```

**Advantages:**
- Scan quickly from top to bottom
- Related cards grouped (Current State, Trends, etc.)
- Each card self-contained
- Easy to skip irrelevant cards
- Total height: ~800px for all cards vs 400px for one massive card
- But each card individually much smaller!

---

## Implementation Plan

### Phase 1: Create Atomic Components
1. Create new files:
   - `ProfileCard.tsx` (80 lines)
   - `QuoteCard.tsx` (90 lines)
   - `FundamentalsCard.tsx` (120 lines)
   - `MetricsCard.tsx` (100 lines)
   - `PriceHistoryCard.tsx` (110 lines)
   - `AnalystCard.tsx` (100 lines)
   - `GrowthCard.tsx` (110 lines)
   - `SegmentsCard.tsx` (130 lines)
   - `SummaryCard.tsx` (60 lines)

### Phase 2: Update Routing Logic
Modify `page.tsx` `renderToolCard()`:

```typescript
case 'mf-market-get':
  const fields = metadata?.fields || []
  return (
    <div key={toolId} className="space-y-2">
      {/* Always show summary */}
      <SummaryCard 
        count={fields.length}
        time={result?.metrics?.t_ms}
        size={result?.metrics?.bytes}
      />
      
      {/* Conditional cards based on fields */}
      {fields.includes('profile') && <ProfileCard data={...} />}
      {fields.includes('quote') && <QuoteCard data={...} />}
      {fields.includes('fundamentals') && <FundamentalsCard data={...} />}
      {fields.includes('key_metrics') && <MetricsCard data={...} />}
      {fields.includes('prices') && <PriceHistoryCard data={...} />}
      {(fields.includes('analyst_recs') || fields.includes('price_target')) && 
        <AnalystCard data={...} />}
      {fields.includes('growth') && <GrowthCard data={...} />}
      {(fields.includes('segments_product') || fields.includes('segments_geo')) && 
        <SegmentsCard data={...} />}
    </div>
  )
```

### Phase 3: Delete Old MarketDataCard
- Remove `MarketDataCard.tsx` (247 lines → 9 files × ~100 lines)
- More code but MUCH better UX

### Phase 4: Add Expand Functionality
- Each card has "View more →" button
- Opens modal or navigates to `/data/{ticker}/{field}`
- Can load actual data from workspace files
- Show full tables, charts, timeseries

---

## Benefits of Atomic Design

### User Experience
✅ **Faster Scanning** - See key metrics in 2 seconds  
✅ **Less Overwhelming** - Bite-sized information chunks  
✅ **Clear Hierarchy** - Most important data first  
✅ **Flexible** - Only shows what was actually fetched  
✅ **Expandable** - Can deep-dive when needed  

### Developer Experience
✅ **Easier to Maintain** - Each card is independent  
✅ **Easier to Test** - Test one card at a time  
✅ **Reusable** - Cards can be used in different contexts  
✅ **Composable** - Mix and match cards  
✅ **Type-Safe** - Each card has specific props  

### Performance
✅ **Lazy Loading** - Can load cards progressively  
✅ **Smaller Bundle** - Only import cards that are used  
✅ **Better Caching** - Cache individual card data  
✅ **Faster Renders** - React can skip unchanged cards  

---

## Design System

### Card Shell (All Cards)
```typescript
interface BaseCardProps {
  isLoading?: boolean
  error?: string
  onExpand?: () => void
  className?: string
}

// All cards share:
- Rounded border
- Subtle shadow on hover
- Loading skeleton
- Error state (red border)
- Expand button (bottom right)
- Icon + title (top left)
```

### Color Coding
- **Profile/Quote** → Blue (current state)
- **Fundamentals** → Green (financials)
- **Metrics/Ratios** → Purple (analytics)
- **Growth/Trends** → Orange (performance)
- **Analyst** → Indigo (sentiment)
- **Price History** → Blue (markets)
- **Segments** → Teal (breakdown)

### Typography
- **Card Title:** 14px semibold
- **Primary Value:** 20px bold (prices, main metrics)
- **Secondary Value:** 14px regular
- **Labels:** 12px medium, text-gray-600
- **Expand Button:** 11px, text-blue-600

---

## Migration Path

1. ✅ Create all 9 new atomic cards
2. ✅ Update `page.tsx` routing to use new cards
3. ✅ Test with real data (mf-market-get)
4. ✅ Delete old MarketDataCard.tsx
5. ✅ Update GENUI_IMPLEMENTATION docs
6. ✅ Celebrate smaller, better UI! 🎉

---

**Expected Outcome:**
- 70% reduction in perceived card size
- 300% increase in information density
- 100% better scannability
- Happier users! 😊

