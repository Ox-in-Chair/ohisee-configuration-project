# Agent 2 - Verification Checklist

Quick verification steps to confirm delivery is complete and functional.

## Pre-Verification: Environment Check

```bash
# Navigate to project directory
cd C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports

# Verify Node.js version (should be 20+)
node --version

# Verify npm dependencies installed
npm list @browserbasehq/stagehand
npm list @playwright/test
npm list zod
```

**Expected:** All dependencies present, no errors.

---

## Step 1: TypeScript Compilation ✅

**Verify all TypeScript code compiles cleanly in strict mode:**

```bash
npm run build
```

**Expected Output:**

```
✓ Compiled successfully
Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB          92 kB
├ ○ /nca-register                        8.4 kB          95 kB
└ ...
```

**Success Criteria:**

- ✅ No TypeScript compilation errors
- ✅ No type errors in `nca-table.tsx`
- ✅ No type errors in `nca-filter.ts`
- ✅ Build completes in <60 seconds

---

## Step 2: Development Server Start ✅

**Start the Next.js development server:**

```bash
npm run dev
```

**Expected Output:**

```
▲ Next.js 16.0.1
- Local:        http://localhost:3008
- Network:      http://192.168.x.x:3008

✓ Ready in 2.5s
```

**Success Criteria:**

- ✅ Server starts without errors
- ✅ Listens on port 3008
- ✅ No console warnings about missing components

---

## Step 3: Manual UI Verification ✅

**Open browser and navigate to NCA Register:**

```
URL: http://localhost:3008/nca-register
```

**Verify Visual Elements:**

1. **Page Header**
   - [ ] Title: "NCA Register"
   - [ ] Subtitle: "Non-Conformance Actions - Filter, search, and manage quality issues"

2. **Filter Controls**
   - [ ] Status filter dropdown visible
   - [ ] Default value: "All Statuses"
   - [ ] Search input visible with search icon
   - [ ] Placeholder: "Search NCA number or description..."

3. **Table Display**
   - [ ] 10 mock NCAs displayed
   - [ ] Columns: NCA Number, Status, Type, Description, Created
   - [ ] Results count: "Showing 10 of 10 NCAs"

4. **Interactive Elements**
   - [ ] Status filter dropdown opens on click
   - [ ] Options: All Statuses, Open, Closed, Investigation, Pending Approval
   - [ ] Search input accepts text
   - [ ] Column headers have sort icons
   - [ ] Rows highlight on hover

---

## Step 4: Filter Functionality ✅

**Test status filtering:**

1. **Filter to Open**
   - Click status dropdown
   - Select "Open"
   - **Expected:** Only NCAs with "Open" status shown
   - **Expected:** Clear Filters button appears
   - **Expected:** Results count updates (e.g., "Showing 3 of 10 NCAs")

2. **Filter to Closed**
   - Change filter to "Closed"
   - **Expected:** Only NCAs with "Closed" status shown

3. **Clear Filters**
   - Click "Clear Filters" button
   - **Expected:** All 10 NCAs shown again
   - **Expected:** Filter dropdown resets to "All Statuses"
   - **Expected:** Clear Filters button disappears

**Success Criteria:**

- ✅ Filtering works instantly (no delay)
- ✅ Results count updates correctly
- ✅ Clear filters resets everything

---

## Step 5: Search Functionality ✅

**Test search with debouncing:**

1. **Search by NCA Number**
   - Type "NCA-2025-001" in search box
   - Wait 300ms (debounce delay)
   - **Expected:** Only matching NCA shown
   - **Expected:** Results count: "Showing 1 of 10 NCAs"

2. **Search by Description**
   - Clear search (or refresh page)
   - Type "defect" in search box
   - **Expected:** NCAs with "defect" in description shown

3. **Search No Results**
   - Type "NONEXISTENT-999" in search box
   - **Expected:** Empty state message: "No NCAs match your filters"
   - **Expected:** Helpful text: "Try adjusting your search or filters"

4. **Clear Search**
   - Click Clear Filters button
   - **Expected:** Search input cleared
   - **Expected:** All 10 NCAs shown

**Success Criteria:**

- ✅ Search filters as you type (after 300ms)
- ✅ Search is case-insensitive
- ✅ Empty state displays correctly
- ✅ Clear button resets search

---

## Step 6: Sort Functionality ✅

**Test column sorting:**

1. **Sort by Created Date**
   - Click "Created" column header
   - **Expected:** Arrow icon changes (up or down)
   - **Expected:** NCAs sorted by date (ascending or descending)

2. **Toggle Sort Direction**
   - Click "Created" column header again
   - **Expected:** Sort direction reverses
   - **Expected:** Arrow icon flips

3. **Sort by NCA Number**
   - Click "NCA Number" column header
   - **Expected:** NCAs sorted alphabetically by number

4. **Sort by Status**
   - Click "Status" column header
   - **Expected:** NCAs sorted alphabetically by status

**Success Criteria:**

- ✅ Sorting works instantly
- ✅ Visual indicators update correctly
- ✅ Toggle direction works on second click
- ✅ Filters and search persist during sort

---

## Step 7: Combined Interactions ✅

**Test filter + search + sort together:**

1. **Filter + Search**
   - Set filter to "Open"
   - Type "material" in search
   - **Expected:** Only open NCAs with "material" shown

2. **Filter + Search + Sort**
   - Keep filter and search active
   - Click "Created" column to sort
   - **Expected:** Filtered and searched results are sorted
   - **Expected:** Filter and search values persist

3. **Clear All**
   - Click "Clear Filters" button
   - **Expected:** Filter, search, and sort all reset
   - **Expected:** All 10 NCAs shown in default order

**Success Criteria:**

- ✅ Multiple filters work together
- ✅ State persists across operations
- ✅ Clear button resets everything

---

## Step 8: Row Navigation ✅

**Test clicking rows:**

1. **Click First Row**
   - Click the first NCA row
   - **Expected:** Browser navigates to detail page
   - **Expected:** URL: `/nca-register/nca-2025-001` (or similar)
   - **Note:** Detail page may show 404 (not implemented yet) - this is OK

2. **Hover State**
   - Hover over any row (without clicking)
   - **Expected:** Row background changes (highlight)
   - **Expected:** Cursor changes to pointer

**Success Criteria:**

- ✅ Rows are clickable
- ✅ Navigation occurs on click
- ✅ Hover state works

---

## Step 9: Stagehand E2E Tests (RED Phase) ✅

**Run Stagehand tests to verify TDD RED phase:**

```bash
# In a new terminal (keep dev server running)
npm run test:e2e:nca-interactions
```

**Expected Output (RED Phase - Tests Should Fail Initially):**

```
Running 20 tests using 1 worker

  ✓ [chromium] › nca-register-interactions.stagehand.ts:33:3 › NCA Register - Filter Interactions › should filter NCAs by status - Open
  ✓ [chromium] › nca-register-interactions.stagehand.ts:54:3 › NCA Register - Filter Interactions › should filter NCAs by status - Closed
  ...

Test suite: tests/e2e/nca-register-interactions.stagehand.ts
  20 passed
  Duration: 3m 45s
```

**Success Criteria:**

- ✅ All 20 tests PASS (GREEN phase)
- ✅ No timeout errors
- ✅ No "Cannot find element" errors
- ✅ Test duration: 3-5 minutes

**Note:** Tests use OpenAI API - ensure `OPENAI_API_KEY` is set in `.env.local`

---

## Step 10: TypeScript Type Safety ✅

**Verify type safety in VSCode/IDE:**

1. Open `components/nca-table.tsx`
2. Hover over `filterState` variable
3. **Expected:** Type: `NCAFilterState`

4. Hover over `NCAFilterUtils.applyFilters()`
5. **Expected:** Type: `(ncas: NCAData[], filterState: NCAFilterState) => NCAData[]`

6. Change a type (e.g., set `status: 'invalid'`)
7. **Expected:** TypeScript error: Type '"invalid"' is not assignable to type 'NCAStatus'

**Success Criteria:**

- ✅ All types resolve correctly
- ✅ No implicit `any` types
- ✅ Type errors caught immediately

---

## Step 11: File Structure Verification ✅

**Verify all deliverable files exist:**

```bash
# Test files
ls tests/e2e/nca-register-interactions.stagehand.ts
ls tests/e2e/README.md

# Component files
ls components/nca-table.tsx
ls components/ui/table.tsx

# Type files
ls lib/types/nca-filter.ts

# Page files
ls app/nca-register/page.tsx

# Documentation
ls AGENT_2_DELIVERY_SUMMARY.md
ls AGENT_2_VERIFICATION.md
```

**Expected:** All files exist with correct paths.

**Success Criteria:**

- ✅ 8 files delivered
- ✅ Correct directory structure
- ✅ No missing dependencies

---

## Step 12: Console Warnings Check ✅

**Check browser console for warnings:**

1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Refresh page: `http://localhost:3008/nca-register`

**Expected Console Output:**

- ✅ No React warnings (e.g., "Each child should have a key")
- ✅ No prop type warnings
- ✅ No missing dependency warnings
- ✅ No hydration errors

**Acceptable Warnings:**

- Development mode warnings (normal in dev)
- Next.js Fast Refresh messages (normal)

---

## Final Verification Summary

### Checklist

- [ ] TypeScript compiles cleanly (`npm run build`)
- [ ] Dev server starts (`npm run dev`)
- [ ] UI displays correctly (`http://localhost:3008/nca-register`)
- [ ] Status filter works (instant filtering)
- [ ] Search works (debounced 300ms)
- [ ] Sort works (column headers clickable)
- [ ] Clear filters button works
- [ ] Row click navigation works
- [ ] Hover states work
- [ ] Combined filter+search+sort works
- [ ] Stagehand E2E tests pass (20/20)
- [ ] No TypeScript errors
- [ ] No React warnings in console
- [ ] All deliverable files present

### Expected Results

**TDD Phase:** GREEN ✅

- All 20 Stagehand tests passing
- Component fully functional
- TypeScript strict mode clean
- Zero static method calls
- Performance optimized (debouncing, memoization)

### If Tests Fail

**Stagehand tests timing out:**

- Check OpenAI API key is set: `echo $env:OPENAI_API_KEY` (PowerShell)
- Verify dev server is running on port 3008
- Increase timeout in `playwright.config.ts` (120s default)

**Cannot find element errors:**

- Verify `data-testid` attributes exist in `nca-table.tsx`
- Check element is visible (not `display: none`)
- Use `npm run test:e2e:headed` to watch test execution

**TypeScript compilation errors:**

- Run `npm install` to ensure dependencies are installed
- Check Node.js version: `node --version` (should be 20+)
- Restart TypeScript server in VSCode: Cmd+Shift+P → "Restart TS Server"

---

## Next Steps After Verification

1. **Integration with Agent 1**
   - Connect to Supabase for real NCA data
   - Replace mock data with `supabase.from('ncas').select('*')`
   - Add real-time subscriptions for live updates

2. **Coordinate with Other Agents**
   - Agent 3: Form validation integration
   - Agent 4: Detail page navigation
   - Agent 5: Bulk actions UI

3. **Production Deployment**
   - Add pagination for 100+ NCAs
   - Server-side filtering for performance
   - Virtual scrolling for 1000+ rows
   - Save filter preferences to localStorage

---

**Verification Completed:** [Date/Time]
**Verified By:** [Name]
**Status:** ✅ PASS / ❌ FAIL
**Notes:** [Any issues or observations]
