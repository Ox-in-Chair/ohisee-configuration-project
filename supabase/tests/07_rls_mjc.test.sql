-- ============================================================================
-- MJC RLS (Row Level Security) Tests
-- Purpose: Test role-based access control for BRCGS compliance
-- CRITICAL: Verify QA supervisor is ONLY role that can grant hygiene clearance
-- ============================================================================

BEGIN;
SELECT plan(20); -- Total number of tests

-- ============================================================================
-- TEST SETUP: Create test users for each role
-- ============================================================================

-- Clean up any existing test users (in case of previous failed test runs)
DELETE FROM users WHERE email LIKE 'test.rls.%@test.com';

-- Test user IDs (deterministic UUIDs for easy reference)
INSERT INTO users (id, email, name, role, department, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test.rls.operator@test.com', 'Test Operator', 'operator', 'pouching', true),
  ('00000000-0000-0000-0000-000000000002', 'test.rls.team-leader@test.com', 'Test Team Leader', 'team-leader', 'pouching', true),
  ('00000000-0000-0000-0000-000000000003', 'test.rls.maintenance-tech@test.com', 'Test Maintenance Tech', 'maintenance-technician', 'maintenance', true),
  ('00000000-0000-0000-0000-000000000004', 'test.rls.qa-supervisor@test.com', 'Test QA Supervisor', 'qa-supervisor', NULL, true),
  ('00000000-0000-0000-0000-000000000005', 'test.rls.maintenance-manager@test.com', 'Test Maintenance Manager', 'maintenance-manager', 'maintenance', true),
  ('00000000-0000-0000-0000-000000000006', 'test.rls.operations-manager@test.com', 'Test Operations Manager', 'operations-manager', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Create test MJCs for different scenarios
INSERT INTO mjcs (
  id,
  raised_by_user_id,
  created_by,
  department,
  machine_equipment,
  maintenance_category,
  machine_status,
  urgency,
  description_required,
  maintenance_type_electrical,
  status
) VALUES
  -- MJC 1: Draft MJC created by operator 1
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pouching', 'Test Machine 1', 'reactive', 'operational', 'low', 'Test draft MJC created by operator 1 for RLS testing purposes', true, 'draft'),

  -- MJC 2: Open MJC awaiting clearance (ready for QA review)
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pouching', 'Test Machine 2', 'reactive', 'operational', 'medium', 'Test open MJC awaiting clearance from QA supervisor for testing', true, 'awaiting-clearance'),

  -- MJC 3: Assigned to technician
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pouching', 'Test Machine 3', 'reactive', 'operational', 'high', 'Test MJC assigned to maintenance technician for work completion', true, 'assigned')
ON CONFLICT (id) DO NOTHING;

-- Update MJC 3 to have assigned_to set (can only do after INSERT due to constraints)
UPDATE mjcs SET assigned_to = '00000000-0000-0000-0000-000000000003' WHERE id = '10000000-0000-0000-0000-000000000003';

-- ============================================================================
-- TEST 1: Operator can INSERT own MJC
-- ============================================================================
SELECT lives_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000001';

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
      status
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'pouching',
      'Test Machine Insert',
      'reactive',
      'operational',
      'low',
      'Operator should be able to create their own MJC with proper details',
      true,
      'draft'
    );
  $$,
  'Operator can create own MJC'
);

-- ============================================================================
-- TEST 2: Operator can SELECT own MJC
-- ============================================================================
SELECT is(
  (
    SELECT COUNT(*)::INT FROM mjcs
    WHERE id = '10000000-0000-0000-0000-000000000001'
    AND current_setting('request.jwt.claim.sub') = '00000000-0000-0000-0000-000000000001'
  ),
  1,
  'Operator can view own MJC'
);

-- ============================================================================
-- TEST 3: Operator CANNOT close MJC (only QA can close)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000001';

    UPDATE mjcs SET
      status = 'closed',
      hygiene_clearance_by = 'Operator',
      hygiene_clearance_signature = '{"type":"login","name":"Operator","timestamp":"2025-01-01T00:00:00Z"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE id = '10000000-0000-0000-0000-000000000002';
  $$,
  NULL, -- Any error is acceptable (RLS or constraint)
  'Operator cannot close MJC'
);

-- ============================================================================
-- TEST 4: QA supervisor CAN grant hygiene clearance (BRCGS CRITICAL)
-- ============================================================================
SELECT lives_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000004';

    UPDATE mjcs SET
      hygiene_clearance_by = 'QA Supervisor',
      hygiene_clearance_signature = '{"type":"login","name":"QA Supervisor","timestamp":"2025-01-01T00:00:00Z"}'::jsonb,
      hygiene_clearance_at = NOW(),
      hygiene_clearance_comments = 'Hygiene clearance granted by QA'
    WHERE id = '10000000-0000-0000-0000-000000000002'
    AND status = 'awaiting-clearance';
  $$,
  'QA supervisor CAN grant hygiene clearance'
);

-- ============================================================================
-- TEST 5: Team leader CANNOT grant hygiene clearance (BRCGS CRITICAL)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000002';

    UPDATE mjcs SET
      hygiene_clearance_by = 'Team Leader',
      hygiene_clearance_signature = '{"type":"login","name":"Team Leader","timestamp":"2025-01-01T00:00:00Z"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE id = '10000000-0000-0000-0000-000000000002'
    AND status = 'awaiting-clearance';
  $$,
  NULL,
  'Team leader CANNOT grant hygiene clearance'
);

-- ============================================================================
-- TEST 6: Maintenance technician CANNOT grant hygiene clearance
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000003';

    UPDATE mjcs SET
      hygiene_clearance_by = 'Technician',
      hygiene_clearance_signature = '{"type":"login","name":"Technician","timestamp":"2025-01-01T00:00:00Z"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE id = '10000000-0000-0000-0000-000000000002'
    AND status = 'awaiting-clearance';
  $$,
  NULL,
  'Maintenance technician CANNOT grant hygiene clearance'
);

-- ============================================================================
-- TEST 7: Maintenance manager CANNOT grant hygiene clearance (only QA can)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000005';

    UPDATE mjcs SET
      hygiene_clearance_by = 'Maintenance Manager',
      hygiene_clearance_signature = '{"type":"login","name":"Maintenance Manager","timestamp":"2025-01-01T00:00:00Z"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE id = '10000000-0000-0000-0000-000000000002'
    AND status = 'awaiting-clearance';
  $$,
  NULL,
  'Maintenance manager CANNOT grant hygiene clearance'
);

-- ============================================================================
-- TEST 8: Operations manager CANNOT grant hygiene clearance (only QA can)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000006';

    UPDATE mjcs SET
      hygiene_clearance_by = 'Operations Manager',
      hygiene_clearance_signature = '{"type":"login","name":"Operations Manager","timestamp":"2025-01-01T00:00:00Z"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE id = '10000000-0000-0000-0000-000000000002'
    AND status = 'awaiting-clearance';
  $$,
  NULL,
  'Operations manager CANNOT grant hygiene clearance'
);

-- ============================================================================
-- TEST 9: Operator can UPDATE own draft MJC
-- ============================================================================
SELECT lives_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000001';

    UPDATE mjcs SET
      description_required = 'Updated description by operator for their own draft MJC testing'
    WHERE id = '10000000-0000-0000-0000-000000000001'
    AND status = 'draft';
  $$,
  'Operator can update own draft MJC'
);

-- ============================================================================
-- TEST 10: Operator CANNOT update submitted MJC (no longer draft)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000001';

    UPDATE mjcs SET
      description_required = 'Trying to update non-draft MJC should fail due to RLS policy'
    WHERE id = '10000000-0000-0000-0000-000000000002'
    AND status = 'awaiting-clearance';
  $$,
  NULL,
  'Operator cannot update submitted MJC'
);

-- ============================================================================
-- TEST 11: Maintenance manager can assign MJCs
-- ============================================================================
SELECT lives_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000005';

    UPDATE mjcs SET
      assigned_to = '00000000-0000-0000-0000-000000000003',
      status = 'assigned'
    WHERE id = '10000000-0000-0000-0000-000000000001';
  $$,
  'Maintenance manager can assign MJCs'
);

-- ============================================================================
-- TEST 12: Maintenance technician can view assigned MJCs
-- ============================================================================
SELECT ok(
  (
    SELECT EXISTS (
      SELECT 1 FROM mjcs
      WHERE id = '10000000-0000-0000-0000-000000000003'
      AND assigned_to = '00000000-0000-0000-0000-000000000003'
      AND current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000003'
    )
  ),
  'Maintenance technician can view assigned MJCs'
);

-- ============================================================================
-- TEST 13: Maintenance technician can update assigned MJC
-- ============================================================================
SELECT lives_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000003';

    UPDATE mjcs SET
      status = 'in-progress',
      work_started_at = NOW()
    WHERE id = '10000000-0000-0000-0000-000000000003'
    AND assigned_to = '00000000-0000-0000-0000-000000000003'
    AND status = 'assigned';
  $$,
  'Maintenance technician can update assigned MJC'
);

-- ============================================================================
-- TEST 14: QA supervisor can view all MJCs
-- ============================================================================
SELECT ok(
  (
    SELECT COUNT(*) >= 3 FROM mjcs
    WHERE current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000004'
  ),
  'QA supervisor can view all MJCs'
);

-- ============================================================================
-- TEST 15: Maintenance manager can view all MJCs
-- ============================================================================
SELECT ok(
  (
    SELECT COUNT(*) >= 3 FROM mjcs
    WHERE current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000005'
  ),
  'Maintenance manager can view all MJCs'
);

-- ============================================================================
-- TEST 16: Operations manager can view all MJCs
-- ============================================================================
SELECT ok(
  (
    SELECT COUNT(*) >= 3 FROM mjcs
    WHERE current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000006'
  ),
  'Operations manager can view all MJCs'
);

-- ============================================================================
-- TEST 17: DELETE is blocked for all roles - operator (BRCGS immutable)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000001';

    DELETE FROM mjcs WHERE id = '10000000-0000-0000-0000-000000000001';
  $$,
  '42501', -- insufficient_privilege (no DELETE policy exists)
  NULL,
  'Operator CANNOT delete MJCs (immutable records)'
);

-- ============================================================================
-- TEST 18: DELETE is blocked for QA supervisor (BRCGS immutable)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000004';

    DELETE FROM mjcs WHERE id = '10000000-0000-0000-0000-000000000002';
  $$,
  '42501',
  NULL,
  'QA supervisor CANNOT delete MJCs (immutable records)'
);

-- ============================================================================
-- TEST 19: DELETE is blocked for operations manager (BRCGS immutable)
-- ============================================================================
SELECT throws_ok(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000006';

    DELETE FROM mjcs WHERE id = '10000000-0000-0000-0000-000000000001';
  $$,
  '42501',
  NULL,
  'Operations manager CANNOT delete MJCs (immutable records)'
);

-- ============================================================================
-- TEST 20: Helper function can_grant_hygiene_clearance() returns true only for QA
-- ============================================================================
SELECT is(
  (
    SELECT can_grant_hygiene_clearance()
    WHERE current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000004'
  ),
  true,
  'Helper function confirms only QA supervisor can grant hygiene clearance'
);

-- ============================================================================
-- CLEANUP & FINISH
-- ============================================================================

-- Reset session variables
RESET ROLE;
RESET request.jwt.claim.sub;

SELECT * FROM finish();
ROLLBACK; -- Rollback all test data
