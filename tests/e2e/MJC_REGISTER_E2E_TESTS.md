# MJC Register E2E Tests - Stagehand Implementation

## Overview

This directory contains End-to-End (E2E) tests for the MJC Register filtering, sorting, and search interactions using **Browserbase Stagehand** - an AI-powered browser automation framework.

## What is Stagehand?

Stagehand uses natural language to interact with web applications, making tests more readable and maintainable. Instead of brittle CSS selectors, you write tests like:

```typescript
await page.act('filter MJCs to show only high urgency items');
await page.act('search for MJC number MJC-2025-001');
```

## Test Files

- `mjc-register-interactions.stagehand.ts` - Comprehensive E2E tests for MJC filtering/sorting/search

## Setup

### 1. Install Dependencies

```bash
npm install
```

Required packages (already in package.json):
- `@browserbasehq/stagehand` - AI-powered browser automation
- `@playwright/test` - Test runner and browser control
- `zod` - Schema validation for extracted data

### 2. Environment Variables

Stagehand runs in LOCAL mode by default (no API keys required). For enhanced AI capabilities, optionally add to `.env.local`:

```bash
# Optional - for enhanced Stagehand AI capabilities
OPENAI_API_KEY=sk-...
# Or use Anthropic (already configured for main app)
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Start Development Server

Stagehand tests require the application to be running:

```bash
npm run dev
# Application will start on http://localhost:3008
```

## Running Tests

### Run All Stagehand Tests

```bash
npm run test:playwright -- tests/e2e/*.stagehand.ts
```

### Run Specific Test File

```bash
npm run test:playwright -- tests/e2e/mjc-register-interactions.stagehand.ts
```

### Run with UI (Debug Mode)

```bash
npm run test:playwright:ui
```

### Run in Headed Mode (See Browser)

```bash
npm run test:playwright:headed -- tests/e2e/mjc-register-interactions.stagehand.ts
```

## Test Coverage

### Filtering Tests
- ✅ Filter by status (open, in_progress, completed, closed)
- ✅ Filter by urgency level (critical, high, medium, low)
- ✅ Filter by maintenance type (electrical, mechanical, pneumatical, other)
- ✅ Filter by machine status (down, operational)
- ✅ Filter by temporary repair flag
- ✅ Combine multiple filters simultaneously

### Search Tests
- ✅ Search by MJC number
- ✅ Search by machine/equipment ID
- ✅ Search by description text
- ✅ Search across multiple fields
- ✅ Debounced search (300ms delay)

### Sorting Tests
- ✅ Sort by date created (newest/oldest first)
- ✅ Sort by MJC number (alphanumeric)
- ✅ Sort by urgency level (critical → low)
- ✅ Sort by status
- ✅ Toggle sort direction (asc/desc)

### UX Tests
- ✅ Clear all filters
- ✅ Empty state when no results
- ✅ Filter persistence after navigation
- ✅ Active filter count indicator
- ✅ Keyboard navigation (accessibility)

## Test Architecture

### Natural Language Interactions

Stagehand tests use `act()` for actions and `extract()` for data validation:

```typescript
// Action: Tell Stagehand what to do
await page.act('filter MJCs to show only high urgency items');

// Extraction: Get structured data for validation
const results = await page.extract({
  instruction: 'get all visible MJC entries with their urgency levels',
  schema: z.object({
    mjcs: z.array(
      z.object({
        mjc_number: z.string(),
        urgency_level: z.string(),
      })
    ),
  }),
});

// Assertion: Verify results
expect(results.mjcs.every(mjc => mjc.urgency_level === 'high')).toBe(true);
```

### Data Validation with Zod

All extracted data uses Zod schemas for type safety:

```typescript
const schema = z.object({
  mjc_number: z.string(),
  urgency_level: z.string(),
  status: z.string(),
});
```

## TDD Workflow

These tests follow **strict TDD** (Test-Driven Development):

### Phase 1: RED (Write Failing Tests)
1. Write Stagehand tests using natural language
2. Run tests - they MUST FAIL (features don't exist yet)
3. Verify test failures are clear and expected

### Phase 2: GREEN (Implement Features)
1. Implement minimal filtering/sorting/search logic
2. Add React hooks for state management
3. Add UI controls (dropdowns, search input, toggles)
4. Run tests until they pass

### Phase 3: REFACTOR (Optimize)
1. Improve code quality without changing behavior
2. Run tests to ensure nothing broke
3. Add performance optimizations (debouncing, memoization)

## Test Data

Tests use mock MJC data defined in the test file:

```typescript
const mockMJCs = [
  {
    mjc_number: 'MJC-2025-001',
    urgency_level: 'high',
    status: 'open',
    // ...
  },
  // ...
];
```

**Production**: Replace mock data with actual Supabase queries.

## Debugging Failed Tests

### 1. Enable Verbose Logging

In test file, set `verbose: 1` (or higher):

```typescript
const stagehand = new Stagehand({
  env: 'LOCAL',
  verbose: 2, // More detailed logs
  debugDom: true, // Show DOM state
});
```

### 2. View Screenshots

Failed tests automatically capture screenshots:

```bash
# Screenshots saved to:
test-results/<test-name>/test-failed-1.png
```

### 3. View Test Report

```bash
npx playwright show-report
```

### 4. Run Single Test

```bash
npm run test:playwright -- -g "filter MJCs to show only high urgency"
```

## Common Issues

### Issue: Stagehand times out waiting for element

**Solution**: Check data-testid attributes match exactly:
```tsx
<Select data-testid="mjc-urgency-filter">
```

### Issue: Natural language action fails

**Solution**: Make instructions more specific:
```typescript
// Too vague
await page.act('filter by urgency');

// Better
await page.act('click on the urgency filter dropdown and select "high"');
```

### Issue: Tests pass locally but fail in CI

**Solution**: Ensure consistent test data and increase timeouts:
```typescript
test.setTimeout(90000); // 90 seconds for CI
```

## Performance

- Average test execution: ~5-10 seconds per test
- Full suite: ~2-3 minutes
- Parallel execution: Supported (configure in playwright.config.ts)

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pre-deployment checks
- Nightly builds

```yaml
# Example GitHub Actions workflow
- name: Run Stagehand E2E Tests
  run: |
    npm run dev &
    sleep 10
    npm run test:playwright -- tests/e2e/*.stagehand.ts
```

## Maintenance

### When to Update Tests

- Adding new filter types
- Changing filter UI components
- Modifying search behavior
- Adding new sort options

### Test Stability

Stagehand tests are more stable than traditional E2E tests because:
- No brittle CSS selectors
- AI adapts to minor UI changes
- Natural language is self-documenting

## Resources

- [Stagehand Documentation](https://docs.stagehand.dev)
- [Playwright Documentation](https://playwright.dev)
- [Zod Documentation](https://zod.dev)

## Support

For issues or questions:
1. Check test output and screenshots
2. Review Stagehand documentation
3. Contact development team lead
