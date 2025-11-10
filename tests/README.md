# Integration Tests

## Overview

Integration tests verify the complete OHiSee NCA/MJC system by testing against a live Supabase database with real database operations, triggers, RLS policies, and business logic.

## Test Structure

```
tests/
├── integration/           # Integration tests (run against live DB)
│   ├── mjc-workflow.test.ts
│   └── nca-workflow.test.ts
├── helpers/              # Test utilities
│   └── supabase-test-client.ts
├── setup-integration-tests.ts  # Global test setup
└── README.md            # This file
```

## Setup

### 1. Environment Configuration

Ensure `.env.local` exists with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

**SECURITY WARNING**: The service role key bypasses RLS. NEVER commit `.env.local` to git. Only use in test environment.

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Database Schema

Ensure your Supabase database has the latest schema:

```bash
npm run test:db  # Run pgTAP tests to verify schema
```

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Watch Mode (re-run on file changes)

```bash
npm run test:integration:watch
```

### With Coverage Report

```bash
npm run test:integration:coverage
```

### Run Specific Test File

```bash
npx jest tests/integration/mjc-workflow.test.ts
```

## Writing Integration Tests

### Test Structure Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestClient } from '../helpers/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

describe('Feature Name', () => {
  let supabase: SupabaseClient<Database>;
  let testUserId: string;
  let testResourceId: string;

  beforeAll(async () => {
    // Create test client with service role
    supabase = createTestClient();

    // Create test data
    const { data: user } = await supabase
      .from('users')
      .insert({
        email: 'test@example.com',
        name: 'Test User',
        role: 'operator',
        department: 'pouching',
      })
      .select('id')
      .single();

    testUserId = user!.id;
  });

  afterAll(async () => {
    // CRITICAL: Always cleanup test data
    await supabase.from('users').delete().eq('id', testUserId);
  });

  it('should perform database operation', async () => {
    // Arrange
    const testData = { /* ... */ };

    // Act
    const { data, error } = await supabase
      .from('table_name')
      .insert(testData)
      .select()
      .single();

    // Assert
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.field).toBe(expectedValue);
  });
});
```

### Best Practices

1. **Always Cleanup**: Use `afterAll()` to delete test data. Test data left in database causes test pollution.

2. **Use Service Role Carefully**: Service role bypasses RLS. Only use for testing, never in production.

3. **Isolated Tests**: Each test should be independent. Don't rely on test execution order.

4. **Descriptive Names**: Use clear test names that describe the scenario.

5. **Test Real Workflows**: Test complete user journeys, not just individual operations.

6. **Verify Triggers**: Integration tests verify database triggers (audit logs, auto-generated fields, etc.).

7. **Test RLS Policies**: Create separate clients with different user contexts to test RLS.

8. **Use Type Safety**: Import types from `types/database` for full TypeScript support.

## Helpers

### `createTestClient()`

Creates a Supabase client with service role privileges:

```typescript
import { createTestClient } from '../helpers/supabase-test-client';

const supabase = createTestClient();
```

### `verifyConnection()`

Verifies database connection is working:

```typescript
import { verifyConnection } from '../helpers/supabase-test-client';

const isConnected = await verifyConnection(supabase);
```

### `createAndVerifyTestClient()`

Creates client and verifies connection in one call:

```typescript
import { createAndVerifyTestClient } from '../helpers/supabase-test-client';

const supabase = await createAndVerifyTestClient();
```

## Common Patterns

### Creating Test Users

```typescript
const { data: operator } = await supabase
  .from('users')
  .insert({
    email: 'operator@test.com',
    name: 'Test Operator',
    role: 'operator',
    department: 'pouching',
  })
  .select()
  .single();
```

### Creating Test Machines

```typescript
const { data: machine } = await supabase
  .from('machines')
  .insert({
    machine_code: 'TEST-M001',
    machine_name: 'Test Pouching Line 1',
    department: 'pouching',
    status: 'operational',
  })
  .select()
  .single();
```

### Testing MJC Workflow

```typescript
// 1. Create MJC (status: draft)
const { data: mjc } = await supabase.from('mjcs').insert({
  raised_by_user_id: operatorId,
  created_by: operatorId,
  department: 'pouching',
  machine_equipment: 'Pouching Line 1',
  maintenance_category: 'reactive',
  machine_status: 'down',
  urgency: 'high',
  description_required: 'Machine not starting',
}).select().single();

// 2. Submit MJC (status: open)
await supabase.from('mjcs').update({
  status: 'open',
  submitted_at: new Date().toISOString(),
}).eq('id', mjc.id);

// 3. Assign to technician (status: assigned)
await supabase.from('mjcs').update({
  status: 'assigned',
  assigned_to: technicianId,
}).eq('id', mjc.id);

// 4. Complete maintenance (status: awaiting-clearance)
await supabase.from('mjcs').update({
  status: 'awaiting-clearance',
  maintenance_performed: 'Replaced motor relay',
  work_completed_at: new Date().toISOString(),
}).eq('id', mjc.id);

// 5. Grant hygiene clearance (status: closed)
await supabase.from('mjcs').update({
  status: 'closed',
  hygiene_clearance_at: new Date().toISOString(),
  closed_at: new Date().toISOString(),
}).eq('id', mjc.id);
```

### Verifying Audit Trail

```typescript
const { data: auditLogs } = await supabase
  .from('audit_trail')
  .select('*')
  .eq('entity_type', 'mjc')
  .eq('entity_id', mjc.id)
  .order('timestamp', { ascending: true });

expect(auditLogs).toHaveLength(5); // created + 4 updates
expect(auditLogs[0].action).toBe('created');
expect(auditLogs[1].action).toBe('status_changed');
```

## Troubleshooting

### Tests Timeout

Increase timeout in `jest.integration.config.js`:

```javascript
testTimeout: 60000, // 60 seconds
```

### Connection Errors

Verify environment variables:

```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### RLS Errors

Service role should bypass RLS. If you get RLS errors, verify you're using `createTestClient()` and not the regular client.

### Foreign Key Violations

Ensure test data is created in correct order:
1. Users
2. Machines
3. Work Orders
4. NCAs/MJCs

### Test Pollution

If tests fail due to existing data, cleanup test data:

```sql
-- Run in Supabase SQL Editor (DANGEROUS - only on test DB)
DELETE FROM audit_trail WHERE user_email LIKE '%@test.com';
DELETE FROM mjcs WHERE raised_by_user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
DELETE FROM ncas WHERE raised_by_user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
DELETE FROM users WHERE email LIKE '%@test.com';
```

## Coverage Requirements

Integration tests must maintain minimum coverage:

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

View coverage report:

```bash
npm run test:integration:coverage
open coverage/integration/lcov-report/index.html
```

## CI/CD Integration

Integration tests can run in CI/CD pipelines with Supabase test project:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
  run: npm run test:integration
```

## Additional Resources

- [Supabase Testing Docs](https://supabase.com/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Configuration](https://kulshekhar.github.io/ts-jest/)
