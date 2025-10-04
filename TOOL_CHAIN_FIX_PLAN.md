# Tool Chain UI Fix - Implementation Plan

## Issues Identified

1. **Tools stuck in "executing" phase** - Not transitioning to "complete"
2. **All tools visible at once** - Should show only latest by default
3. **Cards too large** - Need compact design
4. **Redundant status text** - "Long-running operation..." not useful

## Root Cause Analysis

### Why tools aren't completing:
- `agent.tool-result` events ARE being sent from backend
- Frontend route.ts IS forwarding them as `2:[{...}]` data annotations
- BUT: Frontend page.tsx might not be receiving them properly
- Possible issue: AI SDK `useChat` data prop timing or parsing

### Proposed Solution:
1. Add extensive console logging to trace event flow
2. Verify `data` array in `useChat` is updating
3. Check if `setResult` is actually being called
4. Ensure Zustand store is updating correctly

## Implementation Strategy

### Phase 1: Fix Completion State (CRITICAL)
- [x] Add debug logging to route.ts
- [ ] Add debug logging to page.tsx useEffect
- [ ] Verify setResult updates store correctly
- [ ] Test with single tool call

### Phase 2: Tool Chain Grouping
- [ ] Create ToolChainGroup component
- [ ] Group tools by message/session
- [ ] Show only latest tool by default
- [ ] Add "Show N previous tools" button

### Phase 3: Compact Card Design  
- [ ] Redesign IntentCard (slim inline)
- [ ] Redesign ExecutionCard (compact progress)
- [ ] Redesign ResultCard (preview only)
- [ ] Add expand/collapse per tool

### Phase 4: UX Polish
- [ ] Remove redundant hint texts
- [ ] Add smooth animations for expand/collapse
- [ ] Improve visual hierarchy
- [ ] Add tool argument preview in header

## New Component Structure

```
ToolChainGroup (per assistant message)
├── Latest Tool (always visible)
│   ├── ToolCard (compact)
│   │   ├── Phase: Intent | Executing | Complete
│   │   └── Expandable for args/results
│   └── Collapse/Expand button
└── Previous Tools (collapsed by default)
    ├── ToolCard 1
    ├── ToolCard 2
    └── ToolCard N
```

## Compact Card Sizes

- Intent: 40px height (single line)
- Executing: 60px height (progress bar)
- Complete (collapsed): 50px height (summary line)
- Complete (expanded): Auto (full result)

## Next Steps

1. Fix completion state first
2. Test thoroughly with one tool
3. Then implement grouping/collapsing
4. Finally polish UI/UX

