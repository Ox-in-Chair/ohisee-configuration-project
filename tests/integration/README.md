# MJC Workflow Integration Tests

Comprehensive TypeScript integration tests for the Maintenance Job Card (MJC) lifecycle using Supabase JS client.

## Test Coverage

### Complete MJC Lifecycle
1. **Draft Creation** - Operator creates MJC with auto-generated `MJC-YYYY-########` number
2. **Manager Assignment** - Manager assigns MJC to maintenance technician → `status: 'assigned'`
3. **Work Start** - Technician begins work → `status: 'in-progress'`, `work_started_at` set
4. **Work Completion** - Technician completes maintenance → `status: 'awaiting-clearance'`, `work_completed_at` set
5. **QA Clearance** - QA supervisor verifies all 10 hygiene checklist items → `status: 'closed'`, `hygiene_clearance_at` set
6. **Audit Trail** - Every step populates audit trail with user, timestamp, and change details

## Test Suite (13 Tests)

### Success Path Tests
- `should create draft MJC with auto-generated number` - Creates draft MJC, verifies number format MJC-2025-00000001
- `should auto-calculate 14-day due date for temporary repairs` - Temporary repair flag triggers 14-day deadline  
- `should transition from draft to open when submitted` - Draft to Open transition sets submitted_at
- `should assign MJC to maintenance technician` - Manager assigns to technician
- `should start work and set work_started_at timestamp` - Technician starts work
- `should complete maintenance with required fields` - Technician completes with signature
- `should grant hygiene clearance and close MJC with complete checklist` - QA grants clearance
- `should track complete audit trail for full workflow` - Full lifecycle creates 5+ audit entries

### Constraint Validation Tests
- `should prevent closing without hygiene clearance` - Constraint violation: mjc_hygiene_clearance_requires_signature
- `should prevent closing with incomplete hygiene checklist` - BRCGS VIOLATION error
- `should enforce minimum description length constraint` - Constraint violation: mjc_description_min_length
- `should require maintenance signature before closing` - Constraint violation: mjc_maintenance_performed_requires_fields  
- `should validate work_completed_at is after work_started_at` - Constraint violation: mjc_work_timestamps

## Running the Tests

```bash
# Run all tests
npm test

# Run only MJC workflow tests
npm test tests/integration/mjc-workflow.test.ts

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Configuration

### Environment Variables
Tests require `.env.local` with:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Jest Configuration  
- **File**: `jest.config.js`
- **Preset**: ts-jest
- **Environment**: node
- **Timeout**: 30 seconds

## Test Data Management

### Setup (beforeAll)
- Creates unique test users for each run using `Date.now()` timestamp
- Roles: operator, maintenance-technician, qa-supervisor, maintenance-manager  
- Creates test machine with code `TST-NN`

### Cleanup (afterAll)
- Deletes all MJCs created by test users
- Deletes test users and machines
- Ensures no orphaned data

### Isolation (beforeEach)
- Cleans up any leftover MJCs from previous test
- Ensures each test starts with clean state
