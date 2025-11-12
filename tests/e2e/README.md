# E2E Testing with Stagehand

Comprehensive end-to-end tests for the Kangopak Production Control and Compliance System using **Stagehand** - an AI-powered browser automation framework built on Playwright.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [AI Fallback Strategy](#ai-fallback-strategy)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is Stagehand?

Stagehand is an AI-powered browser automation framework that combines traditional selector-based testing with AI-driven element discovery. When a `data-testid` selector can't find an element, Stagehand uses Claude AI to intelligently locate elements using natural language descriptions.

### Test Coverage

Our E2E test suite covers:

1. **Authentication Workflows** - Login, logout, session management, role-based access
2. **NCA Workflows** - Creation, validation, quality analysis, status updates, machine down flows
3. **MJC Workflows** - Creation, hygiene checklist, clearance, temporary repairs
4. **Dashboard Workflows** - Production metrics, filters, charts, navigation
5. **Integration Workflows** - Cross-feature flows, NCA-MJC linkage, supplier tracking

### Test Statistics

- **Total Test Files**: 5
- **Total Test Cases**: 50+
- **Average Test Duration**: 30-60 seconds per test
- **Full Suite Duration**: ~30-45 minutes

---

## Architecture

### Directory Structure

```
tests/e2e/
├── config.ts              # Test configuration and environment settings
├── fixtures.ts            # Setup/teardown helpers, test context management
├── helpers.ts             # Reusable test utilities and workflows
├── README.md              # This documentation
└── workflows/             # Test suites organized by feature
    ├── auth.test.ts       # Authentication tests
    ├── nca.test.ts        # NCA workflow tests
    ├── mjc.test.ts        # MJC workflow tests
    ├── dashboard.test.ts  # Dashboard tests
    └── integration.test.ts # Cross-feature integration tests
```

### Configuration Files

- **jest.e2e.config.js** - Jest configuration for E2E tests
- **jest.e2e.setup.js** - Test environment initialization
- **.env.e2e.example** - Example environment variables

### Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Test Suite (Jest)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Fixtures    │  │   Helpers    │  │   Config     │     │
│  │  (setup)     │  │  (actions)   │  │  (settings)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                    Stagehand Framework                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Hybrid Selector Strategy:                           │  │
│  │  1. Try data-testid (fast, reliable)                │  │
│  │  2. Fall back to AI detection (smart, flexible)     │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Playwright Browser                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup

### Prerequisites

- Node.js 18+
- npm 8+
- Running Supabase instance (local or cloud)
- Test user accounts configured

### Installation

Dependencies are already installed via:

```bash
npm install --legacy-peer-deps
```

This installs:
- `@browserbasehq/stagehand` - AI-powered browser automation
- `playwright` - Browser automation engine
- `@playwright/test` - Playwright test runner

### Environment Configuration

1. Copy environment example:

```bash
cp .env.e2e.example .env.local
```

2. Configure required variables:

```env
# Application
E2E_BASE_URL=http://localhost:3008

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test Users
E2E_OPERATOR_EMAIL=test.operator@kangopak.com
E2E_OPERATOR_PASSWORD=TestPassword123!
```

3. Create test users in Supabase:

```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES
  ('test.operator@kangopak.com', crypt('TestPassword123!', gen_salt('bf')), NOW()),
  ('test.teamleader@kangopak.com', crypt('TestPassword123!', gen_salt('bf')), NOW()),
  ('test.qa@kangopak.com', crypt('TestPassword123!', gen_salt('bf')), NOW());

-- Update roles
UPDATE users SET role = 'operator' WHERE email = 'test.operator@kangopak.com';
UPDATE users SET role = 'team-leader' WHERE email = 'test.teamleader@kangopak.com';
UPDATE users SET role = 'qa-supervisor' WHERE email = 'test.qa@kangopak.com';
```

---

## Running Tests

### Start Development Server

E2E tests require a running application instance:

```bash
npm run dev
```

Wait for server to start on port 3008.

### Run All E2E Tests

```bash
# Headless mode (default)
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode (headed + slow motion + verbose)
npm run test:e2e:debug

# With video recording
npm run test:e2e:video
```

### Run Specific Test Suite

```bash
# Authentication tests only
npm run test:e2e -- tests/e2e/workflows/auth.test.ts

# NCA tests only
npm run test:e2e -- tests/e2e/workflows/nca.test.ts

# MJC tests only
npm run test:e2e -- tests/e2e/workflows/mjc.test.ts
```

### Run Single Test

```bash
npm run test:e2e -- tests/e2e/workflows/nca.test.ts -t "should create a new NCA"
```

### Local Testing (Auto-start Server)

```bash
# Starts dev server, runs tests, then stops server
npm run test:e2e:local
```

---

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestContext, destroyTestContext, captureFailureScreenshot } from '../fixtures';
import { login, navigateTo, clickButton, typeIntoField } from '../helpers';

describe('My Feature Workflow', () => {
  let context;

  beforeEach(async () => {
    context = await createTestContext();
    // Log in before each test
    await login(context.stagehand, 'user@test.com', 'password');
  }, 45000);

  afterEach(async () => {
    await destroyTestContext(context);
  });

  it('should perform an action', async () => {
    try {
      const { stagehand } = context;

      await navigateTo(stagehand, '/my-page');
      await typeIntoField(stagehand, 'my-input', 'test value');
      await clickButton(stagehand, 'submit-button');

      expect(stagehand.page.url()).toContain('/success');
    } catch (error) {
      await captureFailureScreenshot(context.stagehand, 'test-name');
      throw error;
    }
  }, 60000);
});
```

### Using Helpers

Our helper functions implement the AI fallback strategy:

```typescript
import {
  navigateTo,        // Navigate to a route
  login,             // Log in user
  logout,            // Log out user
  typeIntoField,     // Type into input field
  clickButton,       // Click button
  selectRadio,       // Select radio button
  toggleCheckbox,    // Check/uncheck checkbox
  selectFromDropdown, // Select from dropdown
  waitForElement,    // Wait for element to appear
  isElementVisible,  // Check if element is visible
  getElementText,    // Get element text content
  createNCA,         // Create complete NCA
  createMJC,         // Create complete MJC
  waitForToast,      // Wait for notification
} from '../helpers';
```

### Test Context

Each test gets a `TestContext` object:

```typescript
interface TestContext {
  stagehand: Stagehand;           // Browser automation instance
  testUserId?: string;             // Created test user ID
  testDataIds: {
    ncas: string[];               // Created NCA IDs
    mjcs: string[];               // Created MJC IDs
    workOrders: string[];         // Created work order IDs
  };
}
```

Test data is automatically cleaned up after each test (unless `E2E_PRESERVE_DATA=true`).

---

## AI Fallback Strategy

### How It Works

Our tests use a **hybrid selector strategy**:

1. **Try `data-testid` first** (fast, reliable)
2. **Fall back to AI detection** if testid not found

### Implementation

```typescript
// Helper function with AI fallback
export async function clickButton(
  stagehand: Stagehand,
  testId: string,
  aiDescription?: string
): Promise<void> {
  const element = await findElementBy(stagehand, testId, aiDescription);

  if (element) {
    // Found by data-testid
    await element.click();
  }
  // If AI fallback was used, act() already clicked
}

// Usage in tests
await clickButton(
  stagehand,
  'submit-button',              // Try data-testid first
  'Click the submit button'     // AI fallback description
);
```

### When to Use AI Fallback

**Use AI fallback when:**
- Element may not have `data-testid` attribute
- Element is dynamically generated
- Selector might change between versions
- Testing legacy code without test attributes

**Prefer `data-testid` when:**
- You control the component
- Selector is stable
- Performance is critical

### AI Description Best Practices

Good AI descriptions are:
- **Action-oriented**: "Click the save button" not "The save button"
- **Specific**: "Click the blue submit button at the bottom" not "Click a button"
- **Context-aware**: "Select 'raw-material' from the NC Type radio group"

---

## Debugging

### Debug Mode

Run tests in debug mode to see browser and AI decisions:

```bash
npm run test:e2e:debug
```

This enables:
- Headed browser (visible)
- Slow motion (500ms delay between actions)
- AI debug logging
- Verbose Jest output

### Screenshots on Failure

Screenshots are automatically captured when tests fail:

```
test-results/
└── screenshots/
    └── test-name-1699999999999.png
```

### Video Recording

Enable video recording for all tests:

```bash
npm run test:e2e:video
```

Videos saved to: `test-results/videos/`

### Manual Debugging

Add breakpoints in your tests:

```typescript
it('should debug this test', async () => {
  const { stagehand } = context;

  await navigateTo(stagehand, '/nca/new');

  // Pause execution - browser stays open
  await stagehand.page.pause();

  // Continue with test...
});
```

### Inspect Element State

```typescript
// Log element properties
const element = await stagehand.page.locator('[data-testid="my-element"]');
console.log('Text:', await element.textContent());
console.log('Visible:', await element.isVisible());
console.log('Value:', await element.inputValue());

// Take screenshot of specific element
await element.screenshot({ path: 'element.png' });

// Log page HTML
console.log(await stagehand.page.content());
```

### Common Issues

**Test times out waiting for element:**
```typescript
// Increase timeout for slow operations
await waitForElement(stagehand, 'my-element', 30000); // 30 seconds
```

**AI fallback not working:**
- Check `ANTHROPIC_API_KEY` is set
- Verify `E2E_ENABLE_AI=true`
- Check AI description is clear and specific

**Authentication fails:**
- Verify test users exist in database
- Check credentials in `.env.local`
- Ensure RLS policies allow test user access

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: supabase/postgres
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Install Playwright browsers
        run: npx playwright install chromium

      - name: Setup Supabase
        run: npx supabase start

      - name: Run migrations
        run: npx supabase db push

      - name: Seed test data
        run: npm run db:seed:test

      - name: Start application
        run: npm run dev &
        env:
          NODE_ENV: test

      - name: Wait for application
        run: npx wait-on http://localhost:3008 -t 60000

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3008
          E2E_SCREENSHOT: true
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-screenshots
          path: test-results/screenshots/

      - name: Upload videos
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-videos
          path: test-results/videos/
```

### Environment Secrets

Configure in GitHub repository settings:
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Test user credentials

---

## Best Practices

### 1. Isolate Tests

Each test should be independent:
```typescript
beforeEach(async () => {
  // Fresh context for each test
  context = await createTestContext();
});

afterEach(async () => {
  // Clean up test data
  await destroyTestContext(context);
});
```

### 2. Use Meaningful Test IDs

```tsx
// Good
<button data-testid="submit-nca-button">Submit</button>

// Bad
<button data-testid="btn1">Submit</button>
```

### 3. Wait for State Changes

```typescript
// Wait for navigation
await stagehand.page.waitForURL('**/nca/**', { timeout: 10000 });

// Wait for element
await waitForElement(stagehand, 'success-message');

// Wait for network idle
await stagehand.page.waitForLoadState('networkidle');
```

### 4. Handle Flaky Tests

```typescript
// Retry failed assertions
await expect(async () => {
  const text = await getElementText(stagehand, 'status');
  expect(text).toBe('Success');
}).toPass({ timeout: 10000 });
```

### 5. Test User Journeys, Not Implementation

Focus on what users do, not how the code works:

```typescript
// Good - user journey
it('should create and submit an NCA', async () => {
  await createNCA(stagehand, { ncDescription: 'Test' });
  expect(stagehand.page.url()).toContain('/nca/');
});

// Bad - implementation details
it('should call createNCA action and update database', async () => {
  // Don't test internal implementation in E2E
});
```

### 6. Group Related Tests

```typescript
describe('NCA Creation', () => {
  describe('Validation', () => {
    it('should validate description length');
    it('should validate required fields');
  });

  describe('Quality Analysis', () => {
    it('should run inline analysis');
    it('should show quality gate');
  });
});
```

---

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check Node.js version matches CI
- Verify all environment variables are set
- Ensure database is seeded correctly
- Clear browser cache: `npx playwright cache clear`

### Browser Crashes

- Reduce parallel test execution: `maxWorkers: 1` (already set)
- Increase memory: `NODE_OPTIONS=--max-old-space-size=4096`
- Update Playwright: `npm update playwright @playwright/test`

### Slow Tests

- Use `data-testid` instead of AI fallback when possible
- Reduce waits: Only wait when necessary
- Run in headless mode (faster)
- Parallelize test suites (different files)

### Authentication Issues

If tests fail with "Unauthorized":

1. Verify test users exist:
```sql
SELECT * FROM users WHERE email LIKE 'test.%@kangopak.com';
```

2. Check RLS policies allow test users
3. Ensure auth tokens are valid
4. Clear browser storage: `await stagehand.page.context().clearCookies()`

### Database Conflicts

If tests fail with database errors:

- Run migrations: `npx supabase db push`
- Reset database: `npx supabase db reset`
- Check RLS policies are not blocking operations
- Ensure service role key has full access

---

## Resources

- **Stagehand Docs**: https://docs.stagehand.dev
- **Playwright Docs**: https://playwright.dev
- **Jest Docs**: https://jestjs.io
- **BRCGS Compliance**: See `docs/kangopak-procedures/`

---

## Support

For questions or issues:
1. Check this documentation
2. Review test examples in `tests/e2e/workflows/`
3. Check console output for specific errors
4. Review screenshots in `test-results/screenshots/`

---

**Last Updated**: 2025-11-12
**Test Framework**: Stagehand 3.0.1 + Playwright 1.56.1
**Total Tests**: 50+
**Status**: ✅ Ready for Production
