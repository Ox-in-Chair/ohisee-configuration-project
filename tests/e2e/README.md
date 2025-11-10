# NCA Register E2E Tests - Stagehand

Natural language E2E tests for NCA Register filtering, sorting, and search interactions using Browserbase Stagehand.

## Overview

These tests validate the interactive features of the NCA Register table:

- **Filtering** - Status filters (all, open, closed, investigation, pending_approval)
- **Search** - Search across NCA number and descriptions with debouncing
- **Sorting** - Sort by NCA number, status, type, and created date
- **Navigation** - Click rows to view NCA details
- **Combined Operations** - Filter + Search + Sort together

## Test Architecture

### Stagehand Natural Language Testing

All tests use Stagehand's AI-powered natural language automation:

```typescript
// Natural language action
await page.act('Filter the NCAs to show only open status');

// Natural language observation
const data = await page.extract({
  instruction: 'Get the statuses of all visible NCAs',
  schema: z.object({ statuses: z.array(z.string()) }),
});
```

**Benefits:**
- No brittle CSS selectors
- Tests read like user stories
- AI handles DOM complexity
- Self-healing when UI changes

## Prerequisites

### 1. Environment Variables

Create or verify `.env.local` contains:

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3008

# OpenAI API Key (required for Stagehand)
OPENAI_API_KEY=sk-...

# Stagehand Configuration (optional - for cloud testing)
BROWSERBASE_API_KEY=bb_live_...
BROWSERBASE_PROJECT_ID=...
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Server must be running on `http://localhost:3008` before running tests.

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run NCA Interactions Tests Only

```bash
npm run test:e2e:nca-interactions
```

### Run with Browser Visible (Headed Mode)

```bash
npm run test:e2e:headed
```

### Run with Playwright UI (Interactive)

```bash
npm run test:e2e:ui
```

### Run Specific Test Suite

```bash
# Filter tests only
npx playwright test --grep "Filter Interactions"

# Search tests only
npx playwright test --grep "Search Interactions"

# Sort tests only
npx playwright test --grep "Sort Interactions"
```

## Test Suites

### 1. Filter Interactions (6 tests)

Tests status filtering:

- Filter by Open status
- Filter by Closed status
- Filter by Investigation status
- Show all NCAs (clear filter)
- Clear filters button functionality
- Filter persistence during other operations

**Natural Language Examples:**

```typescript
await page.act('Filter the NCAs to show only open status');
await page.act('Change the filter to show all NCAs');
await page.act('Clear all filters and show all NCAs');
```

### 2. Search Interactions (4 tests)

Tests search functionality:

- Search by NCA number
- Search across descriptions
- Handle no results gracefully
- Debounced search (300ms delay)

**Natural Language Examples:**

```typescript
await page.act('Search for NCA number NCA-2025-001');
await page.act('Search for NCAs with "defect" in the description');
await page.act('Type "NCA" in the search box');
```

### 3. Sort Interactions (5 tests)

Tests column sorting:

- Sort by created date (ascending/descending)
- Sort by NCA number
- Sort by status
- Toggle sort direction (click same column twice)

**Natural Language Examples:**

```typescript
await page.act('Sort the table by created date descending (newest first)');
await page.act('Sort the table by NCA number');
await page.act('Sort the table by created date again to reverse the order');
```

### 4. Row Navigation (2 tests)

Tests table row interactions:

- Click row to navigate to detail page
- Hover state highlighting

**Natural Language Examples:**

```typescript
await page.act('Click the first NCA row to view details');
await page.act('Hover over the first NCA row');
```

### 5. Combined Interactions (3 tests)

Tests multiple features together:

- Filter + Search
- Filter + Search + Sort
- State persistence across operations

**Natural Language Examples:**

```typescript
await page.act('Filter to show only open NCAs');
await page.act('Search for NCAs containing "material"');
await page.act('Sort by created date descending');
```

## Test Data

Tests use **mock data** defined in `app/nca-register/page.tsx`:

- 10 NCAs with varied statuses (open, closed, investigation, pending_approval)
- Multiple NC types (Raw Material, Finished Goods, Work in Progress)
- Realistic descriptions for search testing
- Date range for sort testing

**Production Note:** Replace mock data with Supabase queries.

## Expected Test Results (TDD Phase)

### Phase 1: RED (Current)

All tests SHOULD FAIL initially because:

- Filter dropdown not implemented yet
- Search input not implemented yet
- Sort controls not implemented yet
- Clear filters button not implemented yet

**Expected Errors:**

```
Error: Cannot find filter element
Error: Cannot find search input
Error: Cannot find sort button
Error: Cannot find clear filters button
```

### Phase 2: GREEN (After Implementation)

After implementing the NCA table component with filters:

- All 20 tests should PASS
- Test coverage ≥ 95%
- TypeScript compilation clean
- No console errors

### Phase 3: VERIFY

Confirm:

- Tests pass consistently (run 3x)
- Natural language interactions work
- No hardcoded selectors
- Debounced search working (300ms)

## Debugging

### View Test in Browser

```bash
npm run test:e2e:headed
```

### Use Playwright UI Mode

```bash
npm run test:e2e:ui
```

Features:
- Step through tests
- View DOM inspector
- Time travel debugging
- Network inspector

### Enable Stagehand Verbose Logging

Tests already configured with `verbose: 1`:

```typescript
const stagehand = new Stagehand({
  env: 'LOCAL',
  modelName: 'gpt-4o',
  modelClientOptions: {
    apiKey: OPENAI_API_KEY,
  },
  verbose: 1, // Shows AI decision-making
});
```

Logs show:
- AI's interpretation of instructions
- DOM elements considered
- Actions taken
- Confidence scores

### Common Issues

**Test times out:**

- Check dev server is running (`npm run dev`)
- Verify OpenAI API key is valid
- Increase timeout in test configuration

**Cannot find element:**

- Verify `data-testid` attributes match implementation
- Check element is visible (not `display: none`)
- Use Playwright UI to inspect DOM

**Debounce test fails:**

- Adjust debounce timing in test (currently 300ms)
- Check implementation debounce matches test expectation

## Performance

### Test Execution Time

- Single test: ~5-10 seconds (includes AI processing)
- Full suite (20 tests): ~3-5 minutes
- Parallel execution: Supported (Playwright default)

### Cost (OpenAI API)

- ~2,000 tokens per test (act + extract)
- 20 tests ≈ 40,000 tokens
- Cost: ~$0.60 per full test run (gpt-4o pricing)
- Recommended: Use during CI/CD, not on every save

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          NEXT_PUBLIC_APP_URL: http://localhost:3008
```

## Coverage Goals

- **Test Coverage:** ≥ 95% of interactive features
- **User Workflows:** All primary user journeys tested
- **Edge Cases:** No results, invalid filters, empty states
- **Performance:** Debounced search validated
- **Accessibility:** Focus states, keyboard navigation (future)

## Next Steps

### Phase 2: GREEN Implementation

1. Implement `components/nca-table.tsx` with:
   - Status filter dropdown (shadcn/ui Select)
   - Search input with debouncing (300ms)
   - Sortable column headers
   - Clear filters button

2. Add TypeScript interfaces in `lib/types/nca-filter.ts`:
   - `NCAFilterState` interface
   - `NCAStatus` type
   - `SortColumn` and `SortDirection` types

3. Implement filter/sort/search logic:
   - React hooks for state management
   - Client-side filtering (MVP)
   - Memoized filtering for performance

### Phase 3: VERIFY

1. Run tests: `npm run test:e2e:nca-interactions`
2. Verify all 20 tests pass
3. Check TypeScript compilation: `npm run build`
4. Confirm test coverage: Review Playwright report

## Support

**Issues:**

- Stagehand not finding elements → Check natural language clarity
- Tests flaky → Add explicit waits or use `waitForTimeout`
- OpenAI rate limits → Reduce test frequency or batch tests

**Documentation:**

- Stagehand: https://docs.stagehand.dev
- Playwright: https://playwright.dev
- OpenAI API: https://platform.openai.com/docs

## Architecture Notes

### Why Stagehand?

Traditional E2E tests break when:
- CSS classes change (Tailwind refactoring)
- DOM structure changes (component updates)
- Element IDs change (refactoring)

Stagehand tests are resilient because:
- AI understands user intent ("Filter to open NCAs")
- No hardcoded selectors (AI finds elements)
- Self-healing (adapts to UI changes)

### Test-Driven Development (TDD)

This test suite follows strict TDD:

1. **RED** - Write failing tests first (describe desired behavior)
2. **GREEN** - Implement minimal code to pass tests
3. **REFACTOR** - Optimize while keeping tests green
4. **VERIFY** - Confirm tests pass consistently

**Benefits:**

- Forces clear requirements
- Prevents over-engineering
- Provides regression protection
- Documents expected behavior

## File Structure

```
ohisee-reports/
├── tests/
│   └── e2e/
│       ├── README.md (this file)
│       └── nca-register-interactions.stagehand.ts (20 tests)
├── components/
│   ├── nca-table.tsx (implementation)
│   └── ui/
│       ├── select.tsx (shadcn/ui)
│       ├── input.tsx (shadcn/ui)
│       └── table.tsx (shadcn/ui)
├── lib/
│   └── types/
│       └── nca-filter.ts (TypeScript interfaces)
├── app/
│   └── nca-register/
│       └── page.tsx (demo page with mock data)
├── playwright.config.ts (Playwright configuration)
└── package.json (test scripts)
```

---

**Status:** RED Phase (Tests failing - implementation pending)

**Next Action:** Run `npm run test:e2e:nca-interactions` to verify tests fail as expected
