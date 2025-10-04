# Modern Tool Card Redesign Plan

## Design Principles (Inspired by Shadcn UI & Modern AI Interfaces)

### 1. Visual Hierarchy
- **Subtle, not bold**: Muted colors (slate-200 borders instead of green-200)
- **Shadow depth**: Very subtle shadows for layering (shadow-xs or ring-1)
- **Minimal borders**: 1px instead of 2px

### 2. Compact Spacing
- **Reduced padding**: px-2 py-1 (instead of px-3 py-2)
- **Tighter line-height**: leading-tight, leading-none
- **Smaller fonts**: text-[9px] to text-[11px] range
- **Minimal gaps**: gap-1 instead of gap-2

### 3. Typography
- **Font weights**: Medium (500) for labels, Normal (400) for content
- **Color palette**:
  - Labels: text-slate-700
  - Values: text-slate-600
  - Metadata: text-slate-500/text-slate-400
  
### 4. Interactive States
- **Hover**: Very subtle bg change (hover:bg-slate-50)
- **Active/Focus**: Ring instead of border change
- **Transitions**: transition-all duration-150 (fast, snappy)

### 5. Status Indicators
- **Success**: Minimal green accent (not full green card)
- **Error**: Minimal red accent
- **Loading**: Subtle animation, no bright colors

## Implementation Strategy

### Phase 1: Update Color Palette
- Replace green-* with slate-*
- Add accent colors only for status
- Use ring-1 ring-slate-200 instead of thick borders

### Phase 2: Compact Spacing
- Reduce all padding by 50%
- Tighter gaps between elements
- Smaller font sizes

### Phase 3: Polish Details
- Add subtle hover effects
- Smooth transitions
- Better icon sizing

### Phase 4: File Links
- Style as inline badges/chips
- Blue-600 text with hover:underline
- Very compact presentation

