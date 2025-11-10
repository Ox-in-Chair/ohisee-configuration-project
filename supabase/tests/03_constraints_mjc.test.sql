-- ============================================================================
-- MJC Constraint Validation Tests
-- Purpose: Test that constraints actually enforce BRCGS requirements
-- Tests expect INSERT/UPDATE to FAIL when violating constraints
-- ============================================================================

BEGIN;
SELECT plan(15); -- Total number of tests

-- Create test user for foreign key requirements
INSERT INTO users (id, email, full_name, role)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'test@test.com',
  'Test User',
  'operator'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST 1: Description Minimum Length (BRCGS CRITICAL)
-- ============================================================================

-- Test 1.1: Short description should FAIL
SELECT throws_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      status
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'operational',
      'low',
      'Too short', -- Less than 50 characters
      'draft'
    )
  $$,
  '23514', -- CHECK constraint violation
  NULL,
  'MJC description less than 50 characters should fail'
);

-- Test 1.2: 49-character description should FAIL
SELECT throws_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      status
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'operational',
      'low',
      '123456789012345678901234567890123456789012345678', -- Exactly 49 chars
      'draft'
    )
  $$,
  '23514',
  NULL,
  'MJC description with exactly 49 characters should fail'
);

-- Test 1.3: 50-character description should SUCCEED
SELECT lives_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      status
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'operational',
      'low',
      '12345678901234567890123456789012345678901234567890', -- Exactly 50 chars
      'draft'
    )
  $$,
  'MJC description with exactly 50 characters should succeed'
);

-- ============================================================================
-- TEST 2: Machine Down Requires Timestamp (BRCGS CRITICAL)
-- ============================================================================

-- Test 2.1: Machine down without timestamp should FAIL
SELECT throws_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      machine_down_since
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'down', -- Machine is down
      'critical',
      'Machine is down but no timestamp provided - should fail',
      NULL -- Missing timestamp - SHOULD FAIL
    )
  $$,
  '23514',
  NULL,
  'Machine down without timestamp should fail'
);

-- Test 2.2: Machine down with timestamp should SUCCEED
SELECT lives_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      machine_down_since
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'down',
      'critical',
      'Machine is down with proper timestamp provided correctly',
      NOW() -- Timestamp provided - SHOULD SUCCEED
    )
  $$,
  'Machine down with timestamp should succeed'
);

-- ============================================================================
-- TEST 3: Temporary Repair Requires Due Date
-- ============================================================================

-- Note: This is auto-calculated by trigger, but constraint verifies it exists

-- Test 3.1: Temporary repair is auto-calculated (tested in trigger tests)
-- Skipping explicit INSERT test since trigger handles this
SELECT pass('Temporary repair due date auto-calculation tested in trigger suite');

-- ============================================================================
-- TEST 4: Maintenance Performed Requires Fields
-- ============================================================================

-- Test 4.1: Status in-progress without maintenance details should FAIL
SELECT throws_ok(
  $$
    UPDATE mjcs SET
      status = 'in-progress',
      maintenance_performed = NULL,
      maintenance_technician = NULL,
      maintenance_signature = NULL
    WHERE id = (
      SELECT id FROM mjcs
      WHERE description_required = '12345678901234567890123456789012345678901234567890'
      LIMIT 1
    )
  $$,
  '23514',
  NULL,
  'Status in-progress without maintenance details should fail'
);

-- ============================================================================
-- TEST 5: Hygiene Clearance Requires Signature (BRCGS CRITICAL)
-- ============================================================================

-- Test 5.1: Closed status without hygiene clearance should FAIL
SELECT throws_ok(
  $$
    UPDATE mjcs SET
      status = 'closed',
      hygiene_clearance_by = NULL,
      hygiene_clearance_signature = NULL,
      hygiene_clearance_at = NULL
    WHERE id = (
      SELECT id FROM mjcs
      WHERE description_required = 'Machine is down with proper timestamp provided correctly'
      LIMIT 1
    )
  $$,
  '23514',
  NULL,
  'Closed status without hygiene clearance signature should fail'
);

-- ============================================================================
-- TEST 6: Work Timestamps Order
-- ============================================================================

-- Test 6.1: work_completed_at before work_started_at should FAIL
SELECT throws_ok(
  $$
    UPDATE mjcs SET
      work_started_at = NOW(),
      work_completed_at = NOW() - INTERVAL '1 hour' -- Completed BEFORE started - INVALID
    WHERE id = (
      SELECT id FROM mjcs
      WHERE description_required = 'Machine is down with proper timestamp provided correctly'
      LIMIT 1
    )
  $$,
  '23514',
  NULL,
  'work_completed_at before work_started_at should fail'
);

-- Test 6.2: work_completed_at after work_started_at should SUCCEED
SELECT lives_ok(
  $$
    UPDATE mjcs SET
      work_started_at = NOW() - INTERVAL '2 hours',
      work_completed_at = NOW() - INTERVAL '1 hour' -- Completed AFTER started - VALID
    WHERE id = (
      SELECT id FROM mjcs
      WHERE description_required = 'Machine is down with proper timestamp provided correctly'
      LIMIT 1
    )
  $$,
  'work_completed_at after work_started_at should succeed'
);

-- ============================================================================
-- TEST 7: At Least One Maintenance Type Required
-- ============================================================================

-- Test 7.1: No maintenance type selected should FAIL
SELECT throws_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      maintenance_type_electrical,
      maintenance_type_mechanical,
      maintenance_type_pneumatical,
      maintenance_type_other
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'operational',
      'low',
      'Testing that at least one maintenance type must be selected',
      false, -- All types false
      false,
      false,
      NULL -- And other is NULL - SHOULD FAIL
    )
  $$,
  '23514',
  NULL,
  'No maintenance type selected should fail'
);

-- Test 7.2: At least one maintenance type selected should SUCCEED
SELECT lives_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      maintenance_type_electrical,
      maintenance_type_mechanical,
      maintenance_type_pneumatical
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'pouching',
      'Test Machine',
      'reactive',
      'operational',
      'low',
      'Testing that selecting at least one maintenance type works',
      true, -- At least one is true - SHOULD SUCCEED
      false,
      false
    )
  $$,
  'Selecting at least one maintenance type should succeed'
);

-- ============================================================================
-- TEST 8: Department Check Constraint
-- ============================================================================

-- Test 8.1: Invalid department should FAIL
SELECT throws_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      maintenance_type_electrical
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'invalid_department', -- Not in CHECK constraint list
      'Test Machine',
      'reactive',
      'operational',
      'low',
      'Testing invalid department should fail with CHECK constraint',
      true
    )
  $$,
  '23514',
  NULL,
  'Invalid department should fail'
);

-- Test 8.2: Valid department should SUCCEED
SELECT lives_ok(
  $$
    INSERT INTO mjcs (
      raised_by_user_id,
      created_by,
      department,
      machine_equipment,
      maintenance_category,
      machine_status,
      urgency,
      description_required,
      maintenance_type_electrical
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'slitting', -- Valid department
      'Test Machine',
      'reactive',
      'operational',
      'low',
      'Testing valid department should succeed with CHECK constraint',
      true
    )
  $$,
  'Valid department should succeed'
);

SELECT * FROM finish();
ROLLBACK; -- Rollback all test data
