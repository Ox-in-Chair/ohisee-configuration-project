# Quick Test Commands - MJC Register

## Setup (First Time Only)

```bash
# Install dependencies
npm install

# Create .env.local from example
cp .env.local.example .env.local

# Add your environment variables to .env.local
```

## Development Workflow

### 1. Start Dev Server
```bash
npm run dev
# Opens on http://localhost:3008
```

### 2. Run Unit Tests
```bash
# Run once
npm test components/__tests__/mjc-table.test.tsx

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### 3. Run Stagehand E2E Tests

**Basic Run**:
```bash
npm run test:playwright -- tests/e2e/mjc-register-interactions.stagehand.ts
```

**Debug Mode (UI)**:
```bash
npm run test:playwright:ui
```

**Headed Mode (See Browser)**:
```bash
npm run test:playwright:headed -- tests/e2e/mjc-register-interactions.stagehand.ts
```

**Run Single Test**:
```bash
npm run test:playwright -- -g "filter MJCs to show only high urgency"
```

### 4. View Test Results
```bash
# Open HTML report
npx playwright show-report

# View coverage report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

## TDD Workflow

### RED Phase (Write Failing Tests)
```bash
# 1. Write new test in mjc-register-interactions.stagehand.ts
# 2. Run test - should FAIL
npm run test:playwright:headed -- tests/e2e/mjc-register-interactions.stagehand.ts
```

### GREEN Phase (Implement Feature)
```bash
# 1. Implement feature in components/mjc-table.tsx
# 2. Run test - should PASS
npm run test:playwright -- tests/e2e/mjc-register-interactions.stagehand.ts
```

### REFACTOR Phase (Optimize)
```bash
# 1. Refactor code
# 2. Run all tests to ensure nothing broke
npm test
npm run test:playwright
```

## Quick Checks

**TypeScript Compilation**:
```bash
npx tsc --noEmit
```

**Lint Check**:
```bash
npm run lint
```

**Build Check**:
```bash
npm run build
```

## Debugging Failed Tests

**View Screenshots**:
```bash
# Location: test-results/<test-name>/test-failed-1.png
```

**Enable Verbose Logging**:
Edit test file and change:
```typescript
verbose: 1  // Standard logging
verbose: 2  // Detailed logging
```

**Run Specific Test**:
```bash
npm run test:playwright -- -g "specific test name"
```

## CI/CD Commands

**Full Test Suite (CI)**:
```bash
# Run all tests in sequence
npm run build
npm run lint
npm test
npm run test:playwright
```

## Common Issues

**Port Already in Use**:
```bash
# Kill process on port 3008
# Windows:
netstat -ano | findstr :3008
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3008 | xargs kill -9
```

**Stagehand Times Out**:
```bash
# Increase timeout in test file:
test.setTimeout(90000); // 90 seconds
```

**Tests Pass Locally But Fail in CI**:
```bash
# Run tests in CI mode locally:
CI=true npm run test:playwright
```

## Performance

- Unit tests: ~3 seconds
- E2E tests: ~95 seconds (15 tests)
- Full suite: ~2 minutes

## Resources

- [Full E2E Test Documentation](tests/e2e/MJC_REGISTER_E2E_TESTS.md)
- [Implementation Summary](AGENT_4_IMPLEMENTATION_SUMMARY.md)
- [Stagehand Docs](https://docs.stagehand.dev)
- [Playwright Docs](https://playwright.dev)
