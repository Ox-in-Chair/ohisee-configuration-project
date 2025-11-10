# Agent 2 - Quick Start Guide

Fast-track guide to run and verify NCA Register interactive features.

## 30-Second Quick Start

```bash
# Navigate to project
cd C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports

# Start dev server (Terminal 1)
npm run dev

# Run E2E tests (Terminal 2 - after server starts)
npm run test:e2e:nca-interactions

# Open in browser
start http://localhost:3008/nca-register
```

**Expected:** 20 Stagehand tests pass, UI fully functional.

---

## 2-Minute Verification

### 1. Visual Check (30 seconds)

Open: `http://localhost:3008/nca-register`

**You should see:**

- 10 NCAs in table
- Status filter dropdown (top left)
- Search box with search icon
- Column headers with sort icons
- "Showing 10 of 10 NCAs" count

### 2. Interaction Check (60 seconds)

**Filter:**
1. Click status dropdown → Select "Open"
2. Result: Only open NCAs shown, "Clear Filters" button appears

**Search:**
1. Type "NCA-2025-001" in search box
2. Wait 300ms (debounce)
3. Result: Single matching NCA shown

**Sort:**
1. Click "Created" column header
2. Result: Arrow icon appears, table sorts

**Clear:**
1. Click "Clear Filters" button
2. Result: All filters reset, 10 NCAs shown

### 3. Test Execution (30 seconds)

```bash
npm run test:e2e:nca-interactions
```

**Expected Output:**

```
Running 20 tests using 1 worker
  20 passed (3m 45s)
```

---

## Troubleshooting (If Something Fails)

### Dev Server Won't Start

```bash
# Check if port 3008 is in use
netstat -ano | findstr :3008

# Kill process if needed (replace PID)
taskkill /PID <PID> /F

# Restart server
npm run dev
```

### E2E Tests Timeout

```bash
# Verify OpenAI API key is set
echo $env:OPENAI_API_KEY

# If missing, add to .env.local
OPENAI_API_KEY=sk-...

# Restart tests
npm run test:e2e:nca-interactions
```

### TypeScript Errors

```bash
# Reinstall dependencies
npm install

# Clear Next.js cache
rmdir .next /s /q

# Rebuild
npm run build
```

### UI Not Displaying Correctly

```bash
# Hard refresh browser
Ctrl + Shift + R

# Check browser console for errors
F12 → Console tab

# Verify all components exist
ls components/nca-table.tsx
ls components/ui/table.tsx
ls lib/types/nca-filter.ts
```

---

## What's Delivered

**20 Stagehand E2E Tests:**
- 6 filter tests
- 4 search tests
- 5 sort tests
- 2 navigation tests
- 3 combined interaction tests

**Interactive NCA Table:**
- Status filter dropdown (5 options)
- Search with 300ms debounce
- Sortable columns (NCA #, Status, Type, Created)
- Clear filters button
- Click rows to navigate
- Hover states

**TypeScript Types:**
- `NCAFilterState` interface
- `NCAData` interface
- `NCAStatus` type
- `SortColumn` and `SortDirection` types
- Utility functions for filtering/sorting

**Documentation:**
- E2E test README (452 lines)
- Delivery summary (comprehensive)
- Verification checklist
- This quick-start guide

---

## File Locations

```
tests/e2e/nca-register-interactions.stagehand.ts  (E2E tests)
tests/e2e/README.md                               (Test guide)
components/nca-table.tsx                          (Main component)
components/ui/table.tsx                           (Table UI)
lib/types/nca-filter.ts                           (TypeScript types)
app/nca-register/page.tsx                         (Demo page)
AGENT_2_DELIVERY_SUMMARY.md                       (Full documentation)
AGENT_2_VERIFICATION.md                           (Detailed checklist)
AGENT_2_QUICK_START.md                            (This file)
```

---

## Test Execution Commands

```bash
# All E2E tests
npm run test:e2e

# NCA interactions only
npm run test:e2e:nca-interactions

# Watch test execution (headed mode)
npm run test:e2e:headed

# Interactive debugging (Playwright UI)
npm run test:e2e:ui

# Specific test pattern
npx playwright test --grep "Filter Interactions"
```

---

## Success Criteria Checklist

- [ ] Dev server starts on port 3008
- [ ] UI displays 10 mock NCAs
- [ ] Status filter works instantly
- [ ] Search debounces (300ms delay)
- [ ] Column sorting works
- [ ] Clear filters button appears/works
- [ ] Row click navigates to detail
- [ ] 20 Stagehand tests pass
- [ ] TypeScript compiles cleanly
- [ ] No console errors/warnings

**If all checked:** ✅ Delivery VERIFIED

---

## Next Integration Steps

1. **Connect to Supabase** (Agent 1 coordination)
   - Replace mock data with real NCA queries
   - Add real-time subscriptions

2. **Detail Page** (Agent 4 coordination)
   - Implement `/nca-register/[slug]` route
   - Display full NCA details

3. **Advanced Features** (Future)
   - Pagination (100+ NCAs)
   - Export to CSV
   - Saved filters

---

## Support

**Issues with tests?**
- Check `tests/e2e/README.md` for detailed debugging

**Issues with components?**
- Check `AGENT_2_DELIVERY_SUMMARY.md` for architecture details

**Questions?**
- See `AGENT_2_VERIFICATION.md` for step-by-step verification

---

**Ready to go?** Run the 30-second quick start at the top of this file!
