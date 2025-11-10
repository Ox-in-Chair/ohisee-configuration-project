-- ============================================================================
-- NCA RLS Policy Tests
-- Purpose: Validate Row Level Security policies for NCAs table
-- BRCGS: Section 5.7 Control of Non-Conforming Product - Role-based access control
-- ============================================================================

BEGIN;
SELECT plan(22); -- Total number of tests

-- ============================================================================
-- SETUP: Create test users for each role
-- ============================================================================

-- Test user IDs (deterministic UUIDs for testing)
INSERT INTO users (id, email, name, role, department, active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'operator1@test.com', 'Operator One', 'operator', 'production', true),
  ('00000000-0000-0000-0000-000000000002', 'operator2@test.com', 'Operator Two', 'operator', 'packing', true),
  ('00000000-0000-0000-0000-000000000003', 'teamlead1@test.com', 'Team Leader One', 'team-leader', 'production', true),
  ('00000000-0000-0000-0000-000000000004', 'teamlead2@test.com', 'Team Leader Two', 'team-leader', 'packing', true),
  ('00000000-0000-0000-0000-000000000005', 'qa1@test.com', 'QA Supervisor One', 'qa-supervisor', NULL, true),
  ('00000000-0000-0000-0000-000000000006', 'opsmgr1@test.com', 'Operations Manager One', 'operations-manager', NULL, true),
  ('00000000-0000-0000-0000-000000000007', 'mainttech1@test.com', 'Maintenance Tech One', 'maintenance-technician', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Test machines
INSERT INTO machines (id, name, machine_number, department, active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Test Machine 1', 'TM-001', 'production', true),
  ('10000000-0000-0000-0000-000000000002', 'Test Machine 2', 'TM-002', 'packing', true)
ON CONFLICT (id) DO NOTHING;

-- Test work orders
INSERT INTO work_orders (id, wo_number, machine_id, operator_id, start_timestamp, status, department) VALUES
  ('20000000-0000-0000-0000-000000000001', 'WO-20251110-PROD-001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NOW(), 'active', 'production'),
  ('20000000-0000-0000-0000-000000000002', 'WO-20251110-PACK-001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', NOW(), 'active', 'packing')
ON CONFLICT (id) DO NOTHING;

-- Test NCAs
INSERT INTO ncas (
  id, nca_number, wo_id, raised_by_user_id, created_by,
  nc_type, nc_product_description, nc_description,
  machine_status, status
) VALUES
  -- NCA created by operator1 in production department
  (
    '30000000-0000-0000-0000-000000000001',
    'NCA-2025-00000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'raw-material',
    'Test product description for NCA 1',
    'This is a detailed test description that must be at least 100 characters long to satisfy the BRCGS minimum length requirement for non-conformance descriptions',
    'operational',
    'draft'
  ),
  -- NCA created by operator2 in packing department
  (
    '30000000-0000-0000-0000-000000000002',
    'NCA-2025-00000002',
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'finished-goods',
    'Test product description for NCA 2',
    'This is another detailed test description that must be at least 100 characters long to satisfy the BRCGS minimum length requirement for non-conformance descriptions',
    'operational',
    'submitted'
  ),
  -- NCA for testing close-out (in production)
  (
    '30000000-0000-0000-0000-000000000003',
    'NCA-2025-00000003',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'wip',
    'Test product for close-out testing',
    'This is a test NCA for close-out validation that must be at least 100 characters long to satisfy the BRCGS minimum length requirement for non-conformance descriptions',
    'operational',
    'under-review'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST SUITE 1: RLS is Enabled (1 test)
-- ============================================================================

SELECT has_table('public', 'ncas', 'NCAs table should exist');

-- ============================================================================
-- TEST SUITE 2: SELECT Permissions (5 tests)
-- ============================================================================

-- Test 2.1: Operator can SELECT own NCA
SELECT results_eq(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
    SELECT id FROM ncas WHERE id = '30000000-0000-0000-0000-000000000001';
  $$,
  $$VALUES ('30000000-0000-0000-0000-000000000001'::uuid)$$,
  'Operator should be able to view their own NCA'
);

-- Test 2.2: Operator CANNOT SELECT other operator's NCA
SELECT is_empty(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
    SELECT id FROM ncas WHERE id = '30000000-0000-0000-0000-000000000002';
  $$,
  'Operator should NOT be able to view other operator NCAs'
);

-- Test 2.3: Team leader can SELECT department NCAs
SELECT results_eq(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000003';
    SELECT id FROM ncas WHERE wo_id = '20000000-0000-0000-0000-000000000001' ORDER BY id;
  $$,
  $$VALUES
    ('30000000-0000-0000-0000-000000000001'::uuid),
    ('30000000-0000-0000-0000-000000000003'::uuid)
  $$,
  'Team leader should be able to view NCAs from their department'
);

-- Test 2.4: Team leader CANNOT SELECT other department NCAs
SELECT is_empty(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000003';
    SELECT id FROM ncas WHERE wo_id = '20000000-0000-0000-0000-000000000002';
  $$,
  'Team leader should NOT be able to view NCAs from other departments'
);

-- Test 2.5: QA supervisor can SELECT all NCAs
SELECT results_eq(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000005';
    SELECT COUNT(*)::int FROM ncas;
  $$,
  $$VALUES (3)$$,
  'QA supervisor should be able to view all NCAs'
);

-- ============================================================================
-- TEST SUITE 3: INSERT Permissions (3 tests)
-- ============================================================================

-- Test 3.1: Operator can INSERT own NCA
PREPARE insert_own_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
  INSERT INTO ncas (
    wo_id, raised_by_user_id, created_by,
    nc_type, nc_product_description, nc_description, machine_status
  ) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'incident',
    'Test insert product',
    'This is a test insert description that must be at least 100 characters long to satisfy the BRCGS minimum length requirement for non-conformance',
    'operational'
  );

SELECT lives_ok(
  'insert_own_nca',
  'Operator should be able to insert their own NCA'
);

-- Test 3.2: Operator CANNOT INSERT NCA with different created_by
PREPARE insert_other_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
  INSERT INTO ncas (
    wo_id, raised_by_user_id, created_by,
    nc_type, nc_product_description, nc_description, machine_status
  ) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'incident',
    'Test unauthorized insert',
    'This is a test insert description that must be at least 100 characters long to satisfy the BRCGS minimum length requirement for non-conformance',
    'operational'
  );

SELECT throws_ok(
  'insert_other_nca',
  '42501',
  NULL,
  'Operator should NOT be able to insert NCA for another user'
);

-- Test 3.3: QA supervisor CANNOT insert NCAs (only operators can raise NCAs)
PREPARE qa_insert_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000005';
  INSERT INTO ncas (
    wo_id, raised_by_user_id, created_by,
    nc_type, nc_product_description, nc_description, machine_status
  ) VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000005',
    'incident',
    'Test QA insert',
    'This is a test QA insert description that must be at least 100 characters long to satisfy the BRCGS minimum length requirement for non-conformance',
    'operational'
  );

SELECT throws_ok(
  'qa_insert_nca',
  '42501',
  NULL,
  'QA supervisor should NOT be able to insert NCAs directly'
);

-- ============================================================================
-- TEST SUITE 4: UPDATE Permissions - Operator (3 tests)
-- ============================================================================

-- Test 4.1: Operator can UPDATE own draft NCA
PREPARE operator_update_draft AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
  UPDATE ncas
  SET nc_product_description = 'Updated product description'
  WHERE id = '30000000-0000-0000-0000-000000000001' AND status = 'draft';

SELECT lives_ok(
  'operator_update_draft',
  'Operator should be able to update their own draft NCA'
);

-- Test 4.2: Operator CANNOT UPDATE own submitted NCA
PREPARE operator_update_submitted AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000002';
  UPDATE ncas
  SET nc_product_description = 'Trying to update submitted NCA'
  WHERE id = '30000000-0000-0000-0000-000000000002' AND status = 'submitted';

SELECT throws_ok(
  'operator_update_submitted',
  '42501',
  NULL,
  'Operator should NOT be able to update submitted NCA'
);

-- Test 4.3: Operator CANNOT close NCAs (BRCGS CRITICAL)
PREPARE operator_close_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
  UPDATE ncas
  SET
    status = 'closed',
    close_out_by = 'Operator One',
    close_out_signature = '{"type": "login", "name": "Operator One", "timestamp": "2025-11-10T10:00:00Z"}',
    close_out_date = CURRENT_DATE
  WHERE id = '30000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  'operator_close_nca',
  '42501',
  NULL,
  'BRCGS CRITICAL: Operator should NOT be able to close NCAs'
);

-- ============================================================================
-- TEST SUITE 5: UPDATE Permissions - Team Leader (3 tests)
-- ============================================================================

-- Test 5.1: Team leader can UPDATE department NCAs for concession
PREPARE teamlead_update_concession AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000003';
  UPDATE ncas
  SET
    concession_team_leader = 'Team Leader One',
    concession_signature = '{"type": "login", "name": "Team Leader One", "timestamp": "2025-11-10T10:00:00Z"}'
  WHERE id = '30000000-0000-0000-0000-000000000003' AND status = 'under-review';

SELECT lives_ok(
  'teamlead_update_concession',
  'Team leader should be able to update NCAs in their department for concession signature'
);

-- Test 5.2: Team leader CANNOT UPDATE other department NCAs
PREPARE teamlead_update_other_dept AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000003';
  UPDATE ncas
  SET concession_notes = 'Trying to update other department'
  WHERE id = '30000000-0000-0000-0000-000000000002';

SELECT throws_ok(
  'teamlead_update_other_dept',
  '42501',
  NULL,
  'Team leader should NOT be able to update NCAs from other departments'
);

-- Test 5.3: Team leader CANNOT close NCAs (BRCGS CRITICAL)
PREPARE teamlead_close_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000003';
  UPDATE ncas
  SET
    status = 'closed',
    close_out_by = 'Team Leader One',
    close_out_signature = '{"type": "login", "name": "Team Leader One", "timestamp": "2025-11-10T10:00:00Z"}',
    close_out_date = CURRENT_DATE
  WHERE id = '30000000-0000-0000-0000-000000000003';

SELECT throws_ok(
  'teamlead_close_nca',
  '42501',
  NULL,
  'BRCGS CRITICAL: Team leader should NOT be able to close NCAs'
);

-- ============================================================================
-- TEST SUITE 6: UPDATE Permissions - QA Supervisor (2 tests)
-- ============================================================================

-- Test 6.1: QA supervisor CAN close NCAs (BRCGS CRITICAL)
PREPARE qa_close_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000005';
  UPDATE ncas
  SET
    status = 'closed',
    close_out_by = 'QA Supervisor One',
    close_out_signature = '{"type": "login", "name": "QA Supervisor One", "timestamp": "2025-11-10T10:00:00Z"}',
    close_out_date = CURRENT_DATE
  WHERE id = '30000000-0000-0000-0000-000000000003';

SELECT lives_ok(
  'qa_close_nca',
  'BRCGS CRITICAL: QA supervisor MUST be able to close NCAs'
);

-- Test 6.2: QA supervisor can UPDATE any NCA field
PREPARE qa_update_any_field AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000005';
  UPDATE ncas
  SET root_cause_analysis = 'QA root cause analysis added'
  WHERE id = '30000000-0000-0000-0000-000000000001';

SELECT lives_ok(
  'qa_update_any_field',
  'QA supervisor should be able to update any NCA field'
);

-- ============================================================================
-- TEST SUITE 7: UPDATE Permissions - Operations Manager (1 test)
-- ============================================================================

-- Test 7.1: Operations manager CAN close NCAs (BRCGS CRITICAL)
PREPARE opsmgr_close_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000006';
  UPDATE ncas
  SET
    status = 'closed',
    close_out_by = 'Operations Manager One',
    close_out_signature = '{"type": "login", "name": "Operations Manager One", "timestamp": "2025-11-10T10:00:00Z"}',
    close_out_date = CURRENT_DATE
  WHERE id = '30000000-0000-0000-0000-000000000001';

SELECT lives_ok(
  'opsmgr_close_nca',
  'BRCGS CRITICAL: Operations manager MUST be able to close NCAs'
);

-- ============================================================================
-- TEST SUITE 8: DELETE Permissions - Immutable Records (2 tests)
-- ============================================================================

-- Test 8.1: Operator CANNOT DELETE NCAs
PREPARE operator_delete_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
  DELETE FROM ncas WHERE id = '30000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  'operator_delete_nca',
  '42501',
  NULL,
  'BRCGS CRITICAL: Operator should NOT be able to delete NCAs (immutable records)'
);

-- Test 8.2: QA supervisor CANNOT DELETE NCAs
PREPARE qa_delete_nca AS
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000005';
  DELETE FROM ncas WHERE id = '30000000-0000-0000-0000-000000000002';

SELECT throws_ok(
  'qa_delete_nca',
  '42501',
  NULL,
  'BRCGS CRITICAL: QA supervisor should NOT be able to delete NCAs (immutable records)'
);

-- ============================================================================
-- TEST SUITE 9: Helper Functions (2 tests)
-- ============================================================================

-- Test 9.1: can_close_nca() returns true for QA supervisor
SELECT results_eq(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000005';
    SELECT can_close_nca();
  $$,
  $$VALUES (true)$$,
  'can_close_nca() should return true for QA supervisor'
);

-- Test 9.2: can_close_nca() returns false for operator
SELECT results_eq(
  $$
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claims.sub TO '00000000-0000-0000-0000-000000000001';
    SELECT can_close_nca();
  $$,
  $$VALUES (false)$$,
  'can_close_nca() should return false for operator'
);

SELECT * FROM finish();
ROLLBACK;
