# Test Helpers

Comprehensive TypeScript utilities for testing the OHiSee NCA/MJC system with Supabase.

## Overview

These test helpers provide:
- **Supabase Test Client**: Authenticated client with service role for integration tests
- **Test Data Factory**: Generate valid test data that passes all database constraints
- **Cleanup Utilities**: Automated cleanup to maintain clean test database

## Files

- `supabase-test-client.ts` - Supabase client configuration for tests
- `test-data-factory.ts` - Factory functions for test data generation
- `cleanup-utils.ts` - Cleanup and verification utilities
- `index.ts` - Centralized exports
- `example-usage.test.ts` - Complete examples demonstrating usage patterns

## Quick Start

```typescript
import {
  createTestClient,
  createTestUser,
  createTestMJC,
  cleanupTestData,
} from './tests/helpers';

// 1. Create Supabase client
const supabase = createTestClient();

// 2. Generate test data
const user = createTestUser({ role: 'operator' });
const mjc = createTestMJC(user.id!);

// 3. Insert data
const { data } = await supabase.from('mjcs').insert(mjc).select().single();

// 4. Clean up after test
await cleanupTestData(supabase, {
  mjcIds: [data!.id],
  userIds: [user.id!],
});
```

## Detailed Usage

### 1. Supabase Test Client

```typescript
import { createTestClient, verifyConnection } from './tests/helpers';

// Basic usage
const client = createTestClient();

// With verification
const verifiedClient = await createAndVerifyTestClient();

// Check connection
const isConnected = await verifyConnection(client);
```

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Security Notes:**
- Service role key bypasses RLS (Row Level Security)
- ONLY use in test environment
- Never commit service role key to version control

### 2. Test Data Factory

#### User Creation

```typescript
import { createTestUser, createTestUsersByRole } from './tests/helpers';

// Single user
const operator = createTestUser({
  role: 'operator',
  department: 'pouching'
});

// All roles
const usersByRole = createTestUsersByRole();
const qaSuper = usersByRole['qa-supervisor'];
```

#### MJC Creation

```typescript
import { createTestMJC } from './tests/helpers';

const mjc = createTestMJC(userId, {
  department: 'maintenance',
  urgency: 'critical',
  machine_status: 'down',
  maintenance_type_electrical: true,
});

// Description automatically meets 50 char minimum
console.log(mjc.description_required.length); // >= 50
```

#### NCA Creation

```typescript
import { createTestNCA } from './tests/helpers';

const nca = createTestNCA(userId, {
  nc_type: 'finished-goods',
  machine_status: 'down',
  cross_contamination: true,
});

// Description automatically meets 100 char minimum
console.log(nca.nc_description.length); // >= 100
```

#### Hygiene Checklist (BRCGS)

```typescript
import { createHygieneChecklist } from './tests/helpers';

// All unverified
const checklist = createHygieneChecklist(false);
console.log(checklist.length); // 10 items

// All verified
const verifiedChecklist = createHygieneChecklist(true);
console.log(verifiedChecklist[0].verified); // true
```

#### Complete Scenarios

```typescript
import { createTestScenario } from './tests/helpers';

// Creates user + machine + work order + MJC with linked IDs
const scenario = createTestScenario();

// Insert in order
await supabase.from('users').insert(scenario.user);
await supabase.from('machines').insert(scenario.machine);
await supabase.from('work_orders').insert(scenario.workOrder);
await supabase.from('mjcs').insert(scenario.mjc);
```

### 3. Cleanup Utilities

#### Basic Cleanup

```typescript
import { cleanupTestData } from './tests/helpers';

const result = await cleanupTestData(supabase, {
  mjcIds: ['uuid-1', 'uuid-2'],
  ncaIds: ['uuid-3'],
  userIds: ['uuid-4'],
});

console.log(result.success); // true
console.log(result.deletedCounts); // { mjcs: 2, ncas: 1, ... }
console.log(result.errors); // []
```

**Deletion Order (Critical):**
1. MJCs (child of work_orders, machines, users)
2. NCAs (child of work_orders, users)
3. Work Orders (child of machines, users)
4. Machines
5. Users

This order prevents foreign key constraint violations.

#### Cleanup by Timestamp

```typescript
import { cleanupTestDataAfterTimestamp } from './tests/helpers';

// Delete all data created after specific time
const result = await cleanupTestDataAfterTimestamp(
  supabase,
  '2025-01-01T00:00:00Z'
);
```

#### Cleanup All Test Data

```typescript
import { cleanupAllTestData } from './tests/helpers';

// Finds all users with test email pattern and deletes their data
const result = await cleanupAllTestData(supabase);
```

#### Verify Cleanup

```typescript
import { verifyCleanup } from './tests/helpers';

const isClean = await verifyCleanup(supabase, {
  mjcIds: ['uuid-1'],
  userIds: ['uuid-2'],
});

console.log(isClean); // true if all deleted
```

## Test Patterns

### Pattern 1: Simple Test with Cleanup

```typescript
import { describe, test, afterAll } from '@jest/globals';
import { createTestClient, createTestUser, cleanupTestData } from './tests/helpers';

describe('My Test Suite', () => {
  const supabase = createTestClient();
  const testIds = { userIds: [] };

  afterAll(async () => {
    await cleanupTestData(supabase, testIds);
  });

  test('should create user', async () => {
    const user = createTestUser();
    const { data } = await supabase.from('users').insert(user).select().single();
    testIds.userIds.push(data!.id);

    // Assertions...
  });
});
```

### Pattern 2: Complete Scenario Test

```typescript
test('should handle complete workflow', async () => {
  const scenario = createTestScenario();

  // Insert in dependency order
  const { data: user } = await supabase.from('users').insert(scenario.user).select().single();
  const { data: machine } = await supabase.from('machines').insert(scenario.machine).select().single();

  // Update work order with actual IDs
  const workOrder = {
    ...scenario.workOrder,
    operator_id: user!.id,
    machine_id: machine!.id,
  };
  const { data: wo } = await supabase.from('work_orders').insert(workOrder).select().single();

  // Update MJC with actual IDs
  const mjc = {
    ...scenario.mjc,
    wo_id: wo!.id,
    machine_id: machine!.id,
  };
  const { data: mjcResult } = await supabase.from('mjcs').insert(mjc).select().single();

  // Track for cleanup
  testIds.userIds.push(user!.id);
  testIds.machineIds.push(machine!.id);
  testIds.workOrderIds.push(wo!.id);
  testIds.mjcIds.push(mjcResult!.id);

  // Assertions...
});
```

### Pattern 3: Batch Operations

```typescript
import { createTestUsers, createTestMJCs } from './tests/helpers';

test('should handle batch inserts', async () => {
  // Create 10 operators
  const users = createTestUsers(10, 'operator');
  const { data: insertedUsers } = await supabase.from('users').insert(users).select();

  // Create 50 MJCs for first user
  const mjcs = createTestMJCs(insertedUsers![0].id, 50);
  const { data: insertedMJCs } = await supabase.from('mjcs').insert(mjcs).select();

  // Track for cleanup
  testIds.userIds.push(...insertedUsers!.map(u => u.id));
  testIds.mjcIds.push(...insertedMJCs!.map(m => m.id));

  // Assertions...
});
```

## Database Constraints

Test data factory functions automatically handle:

### MJC Constraints
- `description_required` >= 50 characters
- At least one maintenance type must be true
- `machine_status` in ('down', 'operational')
- `urgency` in ('critical', 'high', 'medium', 'low')

### NCA Constraints
- `nc_description` >= 100 characters
- `machine_status` in ('down', 'operational')
- `nc_type` in ('raw-material', 'finished-goods', 'wip', 'incident', 'other')

### User Constraints
- `email` must be unique
- `role` must be valid UserRole
- `department` must be valid Department

### Hygiene Checklist
- Must have exactly 10 items (BRCGS compliance)
- Each item has: `item` (string), `verified` (boolean), `notes` (optional string)

## TypeScript Types

All helpers are fully typed with strict TypeScript:

```typescript
import type {
  TestUserOptions,
  TestMJCOptions,
  TestNCAOptions,
  TestScenario,
  CleanupResult,
  TestDataIds,
} from './tests/helpers';

// Full type safety
const user: UserInsert = createTestUser();
const mjc: MJCInsert = createTestMJC(userId);
const result: CleanupResult = await cleanupTestData(supabase, testIds);
```

## Error Handling

All helpers throw descriptive errors:

```typescript
try {
  const client = createTestClient();
} catch (error) {
  console.error('Missing Supabase credentials');
}

try {
  await cleanupTestData(supabase, testIds);
} catch (error) {
  console.error('Cleanup failed:', error.message);
}
```

## Performance Considerations

- **Batch Operations**: Use `createTestUsers()`, `createTestMJCs()` for bulk data
- **Cleanup**: Run cleanup in `afterAll()`, not after each test
- **Connection Pooling**: Reuse same Supabase client across tests
- **Timestamps**: Factory functions use `Date.now()` for unique test data

## Security Checklist

- [ ] Service role key is in `.env.local` (not committed)
- [ ] Tests only run against test database (not production)
- [ ] All test data uses test email patterns (`test-*@test.com`)
- [ ] Cleanup runs after every test suite
- [ ] No sensitive data in test data

## Troubleshooting

### "Missing Supabase credentials"
- Ensure `.env.local` exists with `SUPABASE_SERVICE_ROLE_KEY`
- Run `dotenv -e .env.local -- <command>` if needed

### Foreign Key Constraint Violations
- Cleanup must delete in correct order (see cleanup-utils.ts)
- Ensure child records deleted before parents

### "Failed to connect to Supabase"
- Check network connection
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Confirm service role key is valid

### Test Data Not Cleaning Up
- Verify `afterAll()` hook is running
- Check `testIds` tracking is complete
- Use `verifyCleanup()` to debug

## Examples

See `example-usage.test.ts` for complete working examples of:
1. Simple user creation
2. MJC creation with user
3. NCA creation with validation
4. Complete test scenario
5. Hygiene checklist (BRCGS)
6. Update operations
7. Query with filters

## Contributing

When adding new factories:
1. Match database constraints exactly
2. Provide full TypeScript types
3. Document minimum lengths/requirements
4. Add example to `example-usage.test.ts`
5. Update this README

## Version

**Version**: 1.0.0
**Last Updated**: 2025-01-10
