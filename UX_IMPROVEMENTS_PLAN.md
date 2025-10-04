# UX Improvements Implementation Plan

## Remaining Issues to Fix

1. **Tool Chain Collapsing** - Show only latest tool by default
2. **Compact Card Design** - Reduce vertical space  
3. **Remove Redundant Text** - Eliminate unnecessary hints
4. **Expand/Collapse Individual Tools** - For viewing args/results

---

## Current Architecture Analysis

### Tool Rendering (page.tsx lines 124-131)
```typescript
{message.role === 'assistant' && (
  <div className="space-y-2">
    {Object.keys(tools).map((toolId) => (
      <ToolCard key={toolId} toolId={toolId} />
    ))}
  </div>
)}
```

**Problem:** All tools are rendered unconditionally in a flat list.

### Tool State (tool-store.ts)
- Tools stored in `Record<string, ToolState>`
- No concept of tool "groups" or "chains"
- `isExpanded` exists but not used for collapsing

---

## Implementation Strategy

### 1. Tool Chain Grouping Component

**Create: `ToolChainGroup.tsx`**
- Groups tools by assistant message
- Tracks which tools belong together
- Shows only latest tool by default
- Collapse button to reveal all tools

```typescript
interface ToolChainGroupProps {
  toolIds: string[]  // All tools in this chain
  messageId: string  // Parent message ID
}
```

### 2. Compact Card Redesign

**Target Heights:**
- Intent: 40px (inline, brief flash)
- Executing: 50-60px (slim progress bar, no extra text)
- Complete (collapsed): 45px (tool name + checkmark)
- Complete (expanded): Auto (full result)
- Error: 50px (tool name + error indicator)

**Changes:**
- Remove all hint texts ("This might take a moment...")
- Slim down padding (p-3 → p-2)
- Compact ToolHeader (smaller font, tighter spacing)
- Progress bar only (no status text during execution)

### 3. Individual Tool Expand/Collapse

**Update tool-store.ts:**
- Add `toggleExpanded(toolId)` action (already exists!)
- ResultCard should respect `isExpanded` state

**ResultCard Changes:**
- Collapsed: Show tool name + summary line + "Show details ▼"
- Expanded: Show full result with all data

### 4. Remove Redundant Hints

**ExecutionCard.tsx (lines 107-121):**
- DELETE all elapsed time hints
- Keep only status (e.g., "Executing...")
- Remove "This might take a moment" text

---

## Implementation Order

1. ✅ **Remove redundant hints** (quickest, immediate improvement)
2. ✅ **Compact card design** (reduce sizes, padding, remove cruft)
3. ✅ **Individual tool expand/collapse** (use existing isExpanded state)
4. ✅ **Tool chain grouping** (group tools, show latest only)

---

## Code Changes Needed

### Files to Modify:
1. `ExecutionCard.tsx` - Remove hints, compact layout
2. `ResultCard.tsx` - Add collapsed/expanded views
3. `IntentCard.tsx` - Make more compact
4. `ToolHeader.tsx` - Smaller, tighter
5. `ToolBody.tsx` - Less padding
6. `page.tsx` - Wrap tools in ToolChainGroup
7. `tool-store.ts` - Ensure toggleExpanded works

### New Files to Create:
1. `ToolChainGroup.tsx` - Group + collapse logic

---

## Design Specifications

### Compact ExecutionCard
```
┌─────────────────────────────────────┐
│ 📊 Market Data • AAPL  ⏱ 2.3s  ●  │  ← 45px height
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░   │  ← Progress only
└─────────────────────────────────────┘
```

### Compact ResultCard (Collapsed)
```
┌─────────────────────────────────────┐
│ 📊 Market Data • AAPL  3.1s  ✓     │  ← 45px height
│ 13 files retrieved • Show details ▼│
└─────────────────────────────────────┘
```

### Compact ResultCard (Expanded)
```
┌─────────────────────────────────────┐
│ 📊 Market Data • AAPL  3.1s  ✓     │
│ ─────────────────────────────────── │
│ 📁 Files (13)                       │
│   • AAPL/quote.json                 │
│   • AAPL/fundamentals.json          │
│   ... (all files)                   │
│                                     │
│ Hide details ▲                      │
└─────────────────────────────────────┘
```

### Tool Chain Group
```
┌─ Tool Chain (3 tools) ──────────────┐
│                                      │
│ 📊 Market Data • AAPL  3.1s  ✓      │  ← Latest tool (always visible)
│                                      │
│ ┌─ Show 2 previous tools ▼ ─────┐  │  ← Collapse button
│ │                               │  │
│ │ 🔧 Read File  0.2s  ✓         │  │
│ │ 🔧 Read File  0.1s  ✓         │  │
│ └───────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## Testing Plan

After implementation:
1. Test with single tool call
2. Test with multiple sequential tools (3-5)
3. Verify collapsed state shows only latest
4. Verify expand/collapse works for each tool
5. Verify expand reveals previous tools in chain
6. Check that cards are visually compact
7. Ensure no redundant hint text appears

---

## Success Criteria

- ✅ Only latest tool visible by default in a chain
- ✅ All tool cards < 60px height when collapsed
- ✅ No "This might take a moment..." or similar hints
- ✅ Click to expand individual tools for details
- ✅ Click to show all previous tools in chain
- ✅ Smooth animations for expand/collapse
- ✅ Clean, minimal UI

