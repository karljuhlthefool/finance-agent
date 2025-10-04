# Quick Test Guide

## 🚀 How to Test the New UI

### 1. Start the Servers

**Terminal 1 - Backend:**
```bash
cd /Users/karl/work/claude_finance_py
source venv/bin/activate
python -m uvicorn agent_service.app:app --host 127.0.0.1 --port 5052 --reload
```

**Terminal 2 - Frontend:**
```bash
cd /Users/karl/work/claude_finance_py/frontend
npm run dev
```

### 2. Open Browser
Navigate to: `http://localhost:3000`

### 3. Test Queries

**Test 1: Market Data (Working)**
```
"Get market data for Apple"
```
Expected: See tool card flow through phases

**Test 2: Simple Query**
```
"Get quote for MSFT"
```
Expected: Compact market data display

**Test 3: Multiple Fields**
```
"Get quote and profile for GOOGL"
```
Expected: Both fields shown in result

---

## 📊 What to Look For

### Phase 1: Intent (< 200ms)
- [ ] Card appears immediately
- [ ] Shows tool icon (📊)
- [ ] Shows tool name ("Market Data")
- [ ] Shows ticker
- [ ] Gray/blue border
- [ ] "Preparing..." message

### Phase 2: Execution (2-4 seconds)
- [ ] Blue gradient background
- [ ] Animated dots (bouncing)
- [ ] Progress bar (indeterminate)
- [ ] Status message changes:
  - "Preparing request..."
  - "Executing command..."
  - "Processing data..."
- [ ] Elapsed time updates (e.g., "2.1s")
- [ ] Pulsing status badge (●)

### Phase 3: Complete
- [ ] Green gradient background
- [ ] Checkmark status badge (✓)
- [ ] Shows compact summary:
  - 💹 Price + change + percent
  - 🏢 Company name
- [ ] "Show More ▼" button visible
- [ ] File paths in footer (clickable)

### Phase 3b: Expanded
- [ ] Click "Show More"
- [ ] See detailed sections:
  - Quote Details (High, Low, Volume, Mkt Cap)
  - Company Info (Sector, CEO, Employees, Website)
- [ ] "Show Less ▲" button

### Interactions
- [ ] Click file path → Opens workspace panel
- [ ] Hover file path → Shows full path tooltip
- [ ] Click expand button → Toggles details
- [ ] Multiple tools → Each has own card

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot connect to backend"
**Fix**: Make sure backend is running on port 5052
```bash
# Check if it's running
curl http://127.0.0.1:5052/health

# Should return: {"status":"ok","service":"claude-finance-agent"}
```

### Issue: Tool card doesn't appear
**Check**:
1. Open browser DevTools (F12)
2. Look for console errors
3. Check Network tab for `/api/chat` request
4. Verify events are streaming

### Issue: No data in result card
**Check**:
1. Look for workspace files created
2. Open workspace panel
3. Check if files exist at paths shown
4. Console might show "Failed to load" errors

### Issue: Animations are janky
**Fix**:
- Check CPU usage
- Try in different browser
- Disable browser extensions
- Check if other heavy apps running

---

## 🎨 Visual Checklist

### Colors
- [ ] Intent: Light gray/blue
- [ ] Executing: Blue gradient
- [ ] Complete: Green gradient
- [ ] Error: Red gradient

### Typography
- [ ] Headers: 14px, semibold
- [ ] Body: 12-13px, regular
- [ ] Metrics: 11px, medium
- [ ] Code/paths: 11px, monospace

### Spacing
- [ ] Card padding: 12px
- [ ] Gap between cards: 8px
- [ ] Gap between sections: 12px
- [ ] Border radius: 8px

### Animations
- [ ] Fade in: 200ms
- [ ] Phase transition: 200ms
- [ ] Expand/collapse: 300ms
- [ ] Dots bouncing: Staggered
- [ ] Progress bar: Smooth

---

## 📝 Feedback Template

When testing, note:

**✅ What Works Well:**
- 

**❌ What Doesn't Work:**
- 

**💡 Suggestions:**
- 

**🎨 Visual Feedback:**
- Colors:
- Spacing:
- Animations:
- Typography:

**🚀 Priority Changes:**
1. 
2. 
3. 

---

## 🔧 Quick Fixes You Can Try

### Change Colors
Edit `frontend/components/tool-cards/phases/ResultCard.tsx`:
```tsx
// Line 55: Change from green to blue
className="border-blue-200 bg-gradient-to-br from-blue-50 to-white"
```

### Adjust Timing
Edit `frontend/components/agent/ToolCard.tsx`:
```tsx
// Line 33: Change from 150ms to 0ms for instant execution
setTimeout(() => {
  setPhase(event.tool_id, 'executing')
}, 0) // Was 150
```

### Disable Animations
Edit `frontend/components/agent/ToolCard.tsx`:
```tsx
// Comment out motion wrapper (lines 55-61)
// Just return renderPhase() directly
return renderPhase()
```

---

## 🎯 Success Criteria

This checkpoint is successful if:

1. **Visual Flow**: You can see the tool card go through all phases
2. **Data Display**: Market data shows quote + profile info
3. **Interactions**: Clicking expand/collapse and file paths works
4. **No Errors**: Console is clean (no red errors)
5. **Smooth UX**: Animations are pleasant, not distracting
6. **Readable**: All text is clear and makes sense

---

## 📞 Next Steps After Testing

**If it works well:**
- Document what you like
- Request any tweaks to colors/spacing
- Approve to continue to Phase 2 (more tools)

**If there are issues:**
- Screenshot the problem
- Note what you expected vs what happened
- Check console for errors
- Share feedback

**Either way:**
- Your feedback guides the next implementation phase!
- We'll iterate until it feels right
- Then build out more tool visualizations

---

**Ready to test!** 🚀

