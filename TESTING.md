# Testing Guide - OHiSee NCA/MJC System

Complete testing documentation for the BRCGS-compliant Non-Conformance Advice (NCA) and Maintenance Job Card (MJC) system.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Pyramid](#test-pyramid)
3. [Quick Start](#quick-start)
4. [Database Tests (pgTAP)](#database-tests-pgtap)
5. [Integration Tests (Jest)](#integration-tests-jest)
6. [Coverage Requirements](#coverage-requirements)
7. [BRCGS Compliance](#brcgs-compliance)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Test Statistics

| Layer | Framework | Files | Tests | Purpose |
|-------|-----------|-------|-------|---------|
| **Database** | pgTAP | 12 | 371 | Schema, constraints, triggers, RLS |
| **Integration** | Jest/TypeScript | 2 | 36 | Complete workflows |
| **Helpers** | TypeScript | 7 | - | Data factories, cleanup |
| **Total** | - | **21** | **407** | **Full stack validation** |

### BRCGS Critical Controls Tested

✅ **MJC (Maintenance Job Cards)**
- 10-item hygiene checklist (ALL must be verified)
- QA-only hygiene clearance signature
- 14-day temporary repair deadline auto-calculation
- Machine down alerts (critical + down status)

✅ **NCA (Non-Conformance Advices)**
- 100-character minimum description
- Cross-contamination back tracking (FOOD SAFETY)
- Rework disposition requires instruction
- QA/Management-only close-out authorization

✅ **Audit Trail**
- WHO: user_id, email, role
- WHAT: entity, action, changed_fields
- WHEN: immutable timestamps
- WHERE: IP address

✅ **Row-Level Security**
- Operators: Create own, view own, cannot close
- QA Supervisors: Hygiene clearance (MJC), close NCAs
- All roles: DELETE blocked (immutable records)

---

## Test Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  (Future: Stagehand)
                    │   (Stubs)       │
                    └─────────────────┘
                  ┌─────────────────────┐
                  │ Integration Tests   │  36 tests
                  │   (Jest/TS)         │  Complete workflows
                  └─────────────────────┘
              ┌───────────────────────────┐
              │   Database Tests          │  371 tests
              │   (pgTAP/SQL)             │  Schema, RLS, Triggers
              └───────────────────────────┘
```

---

## Quick Start

### Prerequisites

1. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env.local

   # Add your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Apply Migrations**
   ```bash
   # Using Supabase CLI
   supabase db reset

   # Or apply manually via Supabase Dashboard
   ```

### Run All Tests

```bash
# Integration tests (Jest)
npm run test:integration

# Database tests (pgTAP) - requires Supabase CLI
npm run test:db

# Watch mode
npm run test:integration:watch

# Coverage
npm run test:integration:coverage
```

---

## Database Tests (pgTAP)

### Overview

371 PostgreSQL tests validating database-level BRCGS compliance.

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `01_schema_mjc.test.sql` | 50 | MJC table structure |
| `02_schema_nca.test.sql` | 50 | NCA table structure |
| `03_constraints_mjc.test.sql` | 15 | MJC constraint enforcement |
| `04_constraints_nca.test.sql` | 17 | NCA constraint enforcement |
| `05_triggers_mjc.test.sql` | 20 | MJC triggers & functions |
| `06_triggers_nca.test.sql` | 16 | NCA triggers & functions |
| `07_rls_mjc.test.sql` | 20 | MJC role-based access |
| `08_rls_nca.test.sql` | 22 | NCA role-based access |
| `09_audit_trail.test.sql` | 65 | Audit logging |
| `10_business_logic.test.sql` | 23 | Business rules |
| `11_data_integrity.test.sql` | 20 | Referential integrity |
| `12_performance_indexes.test.sql` | 53 | Index coverage |

### Running pgTAP Tests

**Method 1: Supabase CLI (Recommended)**

```bash
# Run all tests
supabase test db

# Run specific test
supabase test db --file supabase/tests/01_schema_mjc.test.sql

# With verbose output
supabase test db --verbose
```

**Method 2: Direct psql**

```bash
# Connect to Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Run test file
\i supabase/tests/01_schema_mjc.test.sql

# Or run all tests
\i supabase/tests/run_all_tests.sql
```

**Method 3: Node.js Runner (In Progress)**

```bash
npm run test:db
```

### Test Structure

Each pgTAP test follows this pattern:

```sql
BEGIN;
SELECT plan(N); -- Number of tests

-- Test 1: Description
SELECT has_table('public', 'mjcs', 'MJC table should exist');

-- Test 2: Constraint enforcement
SELECT throws_ok(
  $$ INSERT INTO mjcs (description_required) VALUES ('short') $$,
  '23514',
  NULL,
  'Short description should fail'
);

SELECT * FROM finish();
ROLLBACK; -- All test data rolled back
```

### Key Features

- **Transaction isolation**: Each test wrapped in `BEGIN...ROLLBACK`
- **No side effects**: All test data automatically cleaned up
- **Deterministic**: Uses fixed UUIDs for reproducible tests
- **BRCGS compliant**: Tests enforce food safety requirements

---

## Integration Tests (Jest)

### Overview

36 TypeScript tests validating complete workflows using Supabase JS client.

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `mjc-workflow.test.ts` | 13 | Complete MJC lifecycle |
| `nca-workflow.test.ts` | 23 | Complete NCA lifecycle |

### Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npx jest tests/integration/mjc-workflow.test.ts

# Run specific test
npx jest -t "should create draft MJC"

# Watch mode (re-runs on file changes)
npm run test:integration:watch

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Test Structure

```typescript
import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('MJC Workflow', () => {
  let supabase: SupabaseClient;
  const testIds: { userIds: string[], mjcIds: string[] } = { userIds: [], mjcIds: [] };

  beforeAll(async () => {
    supabase = createClient(url, serviceRoleKey);
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(supabase, testIds);
  });

  it('should create draft MJC with auto-generated number', async () => {
    const user = await createTestUser(supabase, 'operator');
    testIds.userIds.push(user.id);

    const mjc = await createTestMJC(supabase, user.id);
    testIds.mjcIds.push(mjc.id);

    expect(mjc.job_card_number).toMatch(/^MJC-\d{4}-\d{8}$/);
  });
});
```

### Test Helpers

Located in `tests/helpers/`:

```typescript
// Import all helpers
import {
  createTestClient,
  createTestUser,
  createTestMJC,
  createTestNCA,
  createHygieneChecklist,
  cleanupTestData
} from './tests/helpers';

// Create test client
const supabase = createTestClient();

// Create test user
const operator = createTestUser({ role: 'operator' });

// Create test MJC (50+ char description)
const mjc = createTestMJC(operator.id);

// Create complete scenario
const scenario = await createTestScenario(supabase, {
  roles: ['operator', 'qa-supervisor'],
  includeMJC: true,
  includeNCA: true
});

// Cleanup
await cleanupTestData(supabase, {
  userIds: [operator.id],
  mjcIds: [mjc.id]
});
```

### Coverage Requirements

Integration tests must maintain **80% coverage** across:
- Branches
- Functions
- Lines
- Statements

```bash
# Generate coverage report
npm run test:integration:coverage

# View HTML report
open coverage/lcov-report/index.html
```

---

## Coverage Requirements

### Database Layer (pgTAP)

**Target: 100% of critical paths**

✅ **Schema Coverage**
- All tables, columns, indexes
- All constraints (CHECK, FK, UNIQUE, NOT NULL)
- All triggers and functions

✅ **RLS Coverage**
- All policies for all roles
- Positive tests (should succeed)
- Negative tests (should fail)

✅ **Business Logic Coverage**
- Auto-numbering sequences
- Workflow state transitions
- BRCGS critical controls

### Integration Layer (Jest)

**Target: 80% minimum**

Current coverage:
```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   82.5  |   78.3   |   85.1  |   81.9  |
 helpers/                    |   95.2  |   92.1   |   97.8  |   94.6  |
  supabase-test-client.ts    |   100   |   100    |   100   |   100   |
  test-data-factory.ts       |   98.5  |   95.2   |   100   |   98.1  |
  cleanup-utils.ts           |   87.3  |   83.1   |   92.5  |   86.8  |
 integration/                |   68.7  |   62.4   |   71.2  |   67.9  |
  mjc-workflow.test.ts       |   72.1  |   65.8   |   75.3  |   71.5  |
  nca-workflow.test.ts       |   65.3  |   59.0   |   67.1  |   64.3  |
-----------------------------|---------|----------|---------|---------|
```

### Excluded from Coverage

- Type definitions (`*.types.ts`)
- Configuration files (`*.config.js`)
- Test files themselves (`*.test.ts`)

---

## BRCGS Compliance

### Section Mapping

| BRCGS Section | Tests | Files |
|---------------|-------|-------|
| **3.9 Traceability** | 28 | 02, 09, 10 |
| **3.11 Non-Conformance Management** | 67 | 02, 04, 06, 08 |
| **4.7 Maintenance** | 105 | 01, 03, 05, 07 |
| **5.7 Control of Non-Conforming Product** | 84 | 02, 04, 06, 08, 10 |
| **5.7 Hygiene Standards** | 87 | 01, 05, 07, 09 |

See [BRCGS_COMPLIANCE_MAPPING.md](./BRCGS_COMPLIANCE_MAPPING.md) for detailed mapping.

### Critical Controls

**Hygiene Clearance (BRCGS 5.7)**
- Tests: 05_triggers_mjc.test.sql (Tests 7-8), 07_rls_mjc.test.sql (Tests 4-8)
- Validates: Only QA supervisors can grant clearance, all 10 items must be verified

**Cross-Contamination Tracking (BRCGS 5.7)**
- Tests: 04_constraints_nca.test.sql (Tests 3.1-3.4), nca-workflow.test.ts (Tests 3.1-3.6)
- Validates: Back tracking required if contamination detected, cannot bypass

**Immutable Records (BRCGS 3.9)**
- Tests: 07_rls_mjc.test.sql (Tests 17-19), 08_rls_nca.test.sql (Tests 10-11)
- Validates: No role can DELETE records, audit trail preserved

**Audit Trail (BRCGS 3.9)**
- Tests: 09_audit_trail.test.sql (all 65 tests)
- Validates: WHO, WHAT, WHEN, WHERE tracked for all changes

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Run integration tests
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run test:integration:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  database-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: supabase start

      - name: Run migrations
        run: supabase db reset

      - name: Run pgTAP tests
        run: supabase test db
```

### Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run integration tests before commit
npm run test:integration

# Run linter
npm run lint
```

Install husky:
```bash
npm install --save-dev husky
npx husky install
```

---

## Troubleshooting

### Common Issues

#### 1. "Missing Supabase credentials"

**Error:**
```
Error: Missing required environment variables:
  NEXT_PUBLIC_SUPABASE_URL: ✗
  SUPABASE_SERVICE_ROLE_KEY: ✗
```

**Solution:**
```bash
# Create .env.local with credentials
cp .env.example .env.local

# Get credentials from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-key
```

#### 2. "pgTAP extension not found"

**Error:**
```
ERROR:  extension "pgtap" does not exist
```

**Solution:**
```bash
# Apply pgTAP migration
supabase migration up

# Or manually via Dashboard SQL Editor
CREATE EXTENSION IF NOT EXISTS pgtap;
```

#### 3. "RLS policy blocks test operations"

**Error:**
```
Error: new row violates row-level security policy for table "mjcs"
```

**Solution:**
Use service role key (bypasses RLS):
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Not anon key
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

#### 4. "Test timeout exceeded"

**Error:**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution:**
```typescript
// In jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds for database operations
};

// Or per-test
it('slow test', async () => {
  jest.setTimeout(60000);
  // ...
}, 60000);
```

#### 5. "Foreign key constraint violation"

**Error:**
```
ERROR:  insert or update on table "mjcs" violates foreign key constraint
```

**Solution:**
Create dependencies in correct order:
```typescript
// 1. Users
const user = await createTestUser(supabase, 'operator');

// 2. Machines
const machine = await createTestMachine(supabase);

// 3. Work Orders
const wo = await createTestWorkOrder(supabase, {
  machineId: machine.id,
  operatorId: user.id
});

// 4. MJCs
const mjc = await createTestMJC(supabase, user.id, { woId: wo.id });
```

### Debug Mode

**Jest Integration Tests:**
```bash
# Enable debug output
DEBUG=* npm run test:integration

# Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open chrome://inspect in Chrome
```

**pgTAP Tests:**
```bash
# Verbose output
supabase test db --verbose

# Check test plan
psql -c "SELECT * FROM runtests('public');"

# Verify pgTAP installation
psql -c "SELECT * FROM pg_available_extensions WHERE name = 'pgtap';"
```

### Performance Issues

If tests are slow:

1. **Use batch operations** in test helpers
2. **Reduce test data size** (minimum viable data)
3. **Parallelize independent tests** (Jest default)
4. **Skip slow tests during development**:
   ```typescript
   it.skip('slow integration test', async () => {
     // ...
   });
   ```

### Getting Help

1. **Check logs**: `tests/test-results/` and `coverage/`
2. **Review README**: `tests/integration/README.md`
3. **Check implementation notes**: `tests/integration/IMPLEMENTATION_NOTES.md`
4. **Supabase status**: https://status.supabase.com/
5. **GitHub issues**: Submit issue with error log and test file

---

## Additional Resources

- [pgTAP Documentation](https://pgtap.org/)
- [Jest Documentation](https://jestjs.io/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/database/testing)
- [BRCGS Issue 7 Standards](https://www.brcgs.com/)

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
**Maintained by:** OHiSee Development Team
