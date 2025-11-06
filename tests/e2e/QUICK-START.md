# Stagehand E2E Tests - Quick Start Guide

## Prerequisites

1. Server running on http://localhost:3008
2. Stagehand installed (already in package.json)

## Run All Tests

```bash
# Start server first
npm run dev

# In another terminal, run tests
npx playwright test tests/e2e/*.stagehand.spec.ts
```

## Run Specific Tests

```bash
# NCA workflow tests
npx playwright test tests/e2e/005-nca-complete-workflow.stagehand.spec.ts

# MJC workflow tests
npx playwright test tests/e2e/006-mjc-complete-workflow.stagehand.spec.ts

# Validation tests
npx playwright test tests/e2e/007-validation-scenarios.stagehand.spec.ts
```

## Run with Visual Feedback

```bash
# UI Mode (recommended for development)
npx playwright test --ui

# Headed Mode (see browser)
npx playwright test --headed tests/e2e/*.stagehand.spec.ts

# Debug Mode (step through tests)
npx playwright test --debug tests/e2e/005-nca-complete-workflow.stagehand.spec.ts
```

## Run Specific Test by Name

```bash
# Run single test by description
npx playwright test -g "should complete full NCA form submission"

# Run all character counter tests
npx playwright test -g "character counter"

# Run all hygiene checklist tests
npx playwright test -g "hygiene"
```

## PowerShell Script (Windows)

```powershell
# Simple run
.\tests\e2e\run-stagehand-tests.ps1

# With options
.\tests\e2e\run-stagehand-tests.ps1 -Headed
.\tests\e2e\run-stagehand-tests.ps1 -UI
.\tests\e2e\run-stagehand-tests.ps1 -Debug
```

## Test Coverage

- **38 total tests**
- **NCA Form**: 18 tests (workflows + validation)
- **MJC Form**: 17 tests (workflows + validation)
- **Cross-Form**: 3 tests (consistency)

## Expected Results

All tests should PASS when:
- Server is running on port 3008
- Forms are accessible at /nca/new and /mjc/new
- Validation rules are correctly implemented
- Character counters work properly
- Conditional fields appear/hide correctly
- Hygiene checklist tracking functions

## Troubleshooting

**Tests timeout?**
- Check server is running
- Increase timeout in playwright.config.ts

**Tests fail randomly?**
- Run with --headed to see what's happening
- Check for race conditions
- Add wait statements if needed

**Can't find elements?**
- Verify data-testid attributes exist in forms
- Check form structure hasn't changed
- Use --debug mode to inspect DOM

## Documentation

- **Full Documentation**: `tests/e2e/README-STAGEHAND-TESTS.md`
- **Implementation Summary**: `STAGEHAND-TEST-SUMMARY.md`
- **Test Files**: `tests/e2e/00*-*.stagehand.spec.ts`

## Quick Commands Cheat Sheet

```bash
# Run everything
npx playwright test tests/e2e/*.stagehand.spec.ts

# Visual mode
npx playwright test --ui

# Watch specific test
npx playwright test tests/e2e/005-nca-complete-workflow.stagehand.spec.ts --headed

# Debug mode
npx playwright test --debug

# Generate report
npx playwright test tests/e2e/*.stagehand.spec.ts --reporter=html

# Show report
npx playwright show-report
```

## Next Steps After Tests Pass

1. Review test coverage gaps
2. Add additional edge case tests
3. Implement natural language actions (Stagehand AI)
4. Add performance benchmarks
5. Set up CI/CD integration

---

**Ready to test?** Start the server and run: `npx playwright test --ui`
