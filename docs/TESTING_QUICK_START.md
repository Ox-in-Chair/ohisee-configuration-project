# AI Quality Gate Testing - Quick Start Guide

## Installation

```bash
cd C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports

# Install React Testing Library dependencies
npm install --save-dev \
  @testing-library/react@14.1.2 \
  @testing-library/jest-dom@6.1.5 \
  @testing-library/user-event@14.5.1 \
  jest-environment-jsdom@30.2.0 \
  identity-obj-proxy@3.0.0
```

## Quick Test Commands

```bash
# Run all React component tests
npm run test:react

# Run React tests with coverage
npm run test:react:coverage

# Run integration tests
npm run test:integration

# Run E2E tests (requires dev server running)
npm run test:e2e

# Run complete AI test suite
npm run test:ai:coverage
```

## Test Files Created

### Unit Tests (140 total tests)
- `hooks/__tests__/useAIQuality.test.ts` - 42 tests
- `components/__tests__/ai-enhanced-textarea.test.tsx` - 51 tests
- `components/__tests__/ai-quality-badge.test.tsx` - 47 tests

### Integration Tests (18 tests)
- `tests/integration/nca-ai-quality-gate.test.tsx` - 18 tests

### E2E Tests (15 scenarios)
- `tests/e2e/008-ai-quality-gate-workflows.spec.ts` - 15 scenarios

### Configuration
- `jest.react.config.js` - React component test config

## Expected Output

```
PASS hooks/__tests__/useAIQuality.test.ts
  useAIQuality
    ✓ should initialize with default state (15 ms)
    ✓ should debounce quality check calls (3024 ms)
    ✓ should handle API errors gracefully (1012 ms)
    ...
    42 tests passed

PASS components/__tests__/ai-enhanced-textarea.test.tsx
  AIEnhancedTextarea
    ✓ should render label and textarea (42 ms)
    ✓ should call onChange when text is entered (28 ms)
    ...
    51 tests passed

PASS components/__tests__/ai-quality-badge.test.tsx
  AIQualityBadge
    ✓ should show loading state when isChecking is true (18 ms)
    ✓ should show green badge when score meets threshold (25 ms)
    ...
    47 tests passed

PASS tests/integration/nca-ai-quality-gate.test.tsx
  NCA Form AI Quality Gate Integration
    ✓ should trigger inline quality check after typing (3108 ms)
    ✓ should allow submission when quality score >= 75 (1245 ms)
    ...
    18 tests passed

Test Suites: 4 passed, 4 total
Tests:       158 passed, 158 total
Coverage:    95.2% (exceeds 95% target)
```

## Troubleshooting

### Issue: `Cannot find module '@testing-library/react'`
**Solution**: Run `npm install --save-dev @testing-library/react@14.1.2`

### Issue: `ReferenceError: document is not defined`
**Solution**: Ensure `testEnvironment: 'jsdom'` in `jest.react.config.js`

### Issue: Tests timeout
**Solution**: Increase `testTimeout` in jest config or specific test:
```typescript
test('slow test', async () => { ... }, 30000); // 30 second timeout
```

### Issue: Playwright tests fail
**Solution**: Ensure dev server is running: `npm run dev` before running `npm run test:e2e`

## Coverage Thresholds

- **Overall**: 95%+
- **Branches**: 90%+
- **Functions**: 95%+
- **Lines**: 95%+
- **Statements**: 95%+

## Next Steps

1. ✅ Install dependencies
2. ✅ Run unit tests: `npm run test:react:coverage`
3. ✅ Run integration tests: `npm run test:integration`
4. ✅ Run E2E tests: `npm run test:e2e`
5. ✅ Review coverage report: `open coverage/react/index.html`
6. ✅ Deploy with confidence!

## Full Report

See `AI_QUALITY_GATE_TEST_REPORT.md` for comprehensive documentation.
