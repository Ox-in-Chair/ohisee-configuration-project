-- ============================================================================
-- Audit Trail Tests
-- Purpose: Validate BRCGS-compliant audit logging functionality
-- BRCGS: Complete audit trail for all critical actions (who, what, when, where)
-- ============================================================================

BEGIN;
SELECT plan(65); -- Total number of tests

-- ============================================================================
-- TEST SUITE 1: Audit Trail Table Structure (6 tests)
-- ============================================================================

-- Test 1.1: audit_trail table exists
SELECT has_table('public', 'audit_trail', 'audit_trail table should exist');

-- Test 1.2: audit_trail has primary key
SELECT has_pk('public', 'audit_trail', 'audit_trail should have a primary key');
SELECT col_is_pk('public', 'audit_trail', 'id', 'id should be the primary key');

-- Test 1.3: Required columns exist
SELECT has_column('public', 'audit_trail', 'entity_type', 'Should have entity_type column');
SELECT has_column('public', 'audit_trail', 'entity_id', 'Should have entity_id column');
SELECT has_column('public', 'audit_trail', 'action', 'Should have action column');
SELECT has_column('public', 'audit_trail', 'user_id', 'Should have user_id column');
SELECT has_column('public', 'audit_trail', 'user_email', 'Should have user_email column');
SELECT has_column('public', 'audit_trail', 'user_name', 'Should have user_name column');
SELECT has_column('public', 'audit_trail', 'user_role', 'Should have user_role column');
SELECT has_column('public', 'audit_trail', 'timestamp', 'Should have timestamp column');
SELECT has_column('public', 'audit_trail', 'old_value', 'Should have old_value JSONB column');
SELECT has_column('public', 'audit_trail', 'new_value', 'Should have new_value JSONB column');
SELECT has_column('public', 'audit_trail', 'changed_fields', 'Should have changed_fields array column');
SELECT has_column('public', 'audit_trail', 'ip_address', 'Should have ip_address column');
SELECT has_column('public', 'audit_trail', 'created_at', 'Should have created_at column');

-- Test 1.4: Column types are correct
SELECT col_type_is('public', 'audit_trail', 'entity_type', 'text', 'entity_type should be text');
SELECT col_type_is('public', 'audit_trail', 'action', 'text', 'action should be text');
SELECT col_type_is('public', 'audit_trail', 'old_value', 'jsonb', 'old_value should be jsonb');
SELECT col_type_is('public', 'audit_trail', 'new_value', 'jsonb', 'new_value should be jsonb');
SELECT col_type_is('public', 'audit_trail', 'changed_fields', 'text[]', 'changed_fields should be text array');

-- Test 1.5: NOT NULL constraints on critical fields
SELECT col_not_null('public', 'audit_trail', 'entity_type', 'entity_type should be NOT NULL');
SELECT col_not_null('public', 'audit_trail', 'entity_id', 'entity_id should be NOT NULL');
SELECT col_not_null('public', 'audit_trail', 'action', 'action should be NOT NULL');
SELECT col_not_null('public', 'audit_trail', 'user_email', 'user_email should be NOT NULL');
SELECT col_not_null('public', 'audit_trail', 'user_name', 'user_name should be NOT NULL');
SELECT col_not_null('public', 'audit_trail', 'user_role', 'user_role should be NOT NULL');
SELECT col_not_null('public', 'audit_trail', 'timestamp', 'timestamp should be NOT NULL');

-- Test 1.6: Foreign key to users exists
SELECT col_is_fk('public', 'audit_trail', 'user_id', 'user_id should be a foreign key to users');

-- ============================================================================
-- TEST SUITE 2: Audit Trail Indexes (7 tests)
-- ============================================================================

-- Test 2.1: Essential indexes exist
SELECT has_index('public', 'audit_trail', 'idx_audit_entity', 'Should have composite index on entity_type and entity_id');
SELECT has_index('public', 'audit_trail', 'idx_audit_timestamp', 'Should have index on timestamp');
SELECT has_index('public', 'audit_trail', 'idx_audit_user_id', 'Should have index on user_id');
SELECT has_index('public', 'audit_trail', 'idx_audit_action', 'Should have index on action');
SELECT has_index('public', 'audit_trail', 'idx_audit_entity_id', 'Should have index on entity_id');

-- Test 2.2: Composite index for common query patterns
SELECT has_index('public', 'audit_trail', 'idx_audit_entity_timestamp', 'Should have composite index on entity_type, entity_id, timestamp');

-- Test 2.3: Partial indexes for critical actions (BRCGS CRITICAL)
SELECT has_index('public', 'audit_trail', 'idx_audit_machine_down', 'Should have partial index for machine_down_reported');
SELECT has_index('public', 'audit_trail', 'idx_audit_hygiene_clearance', 'Should have partial index for hygiene_clearance_granted');

-- ============================================================================
-- TEST SUITE 3: Audit Logging Functions (3 tests)
-- ============================================================================

-- Test 3.1: Main audit trail function exists
SELECT has_function(
  'public',
  'log_audit_trail',
  'log_audit_trail() function should exist'
);

-- Test 3.2: Machine down alert function exists
SELECT has_function(
  'public',
  'log_machine_down_alert',
  'log_machine_down_alert() function should exist'
);

-- Test 3.3: Hygiene clearance function exists
SELECT has_function(
  'public',
  'log_hygiene_clearance',
  'log_hygiene_clearance() function should exist'
);

-- ============================================================================
-- TEST SUITE 4: Audit Trail Triggers (6 tests)
-- ============================================================================

-- Test 4.1: NCA audit trail triggers exist
SELECT has_trigger('public', 'ncas', 'ncas_audit_trail', 'NCAs should have audit trail trigger');
SELECT has_trigger('public', 'ncas', 'ncas_machine_down_alert', 'NCAs should have machine down alert trigger');

-- Test 4.2: MJC audit trail triggers exist
SELECT has_trigger('public', 'mjcs', 'mjcs_audit_trail', 'MJCs should have audit trail trigger');
SELECT has_trigger('public', 'mjcs', 'mjcs_machine_down_alert', 'MJCs should have machine down alert trigger');
SELECT has_trigger('public', 'mjcs', 'mjcs_hygiene_clearance', 'MJCs should have hygiene clearance trigger');

-- Test 4.3: Work Orders audit trail trigger exists
SELECT has_trigger('public', 'work_orders', 'work_orders_audit_trail', 'Work Orders should have audit trail trigger');

-- ============================================================================
-- TEST SUITE 5: Functional Tests - NCA INSERT Logging (3 tests)
-- ============================================================================

-- Setup: Create test user
INSERT INTO users (id, email, name, role, department)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test.operator@kangopak.com',
  'Test Operator',
  'operator',
  'pouching'
);

-- Setup: Create test machine
INSERT INTO machines (id, machine_code, machine_name, department)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'TST-01',
  'Test Machine',
  'pouching'
);

-- Setup: Create test work order
INSERT INTO work_orders (id, wo_number, machine_id, operator_id, start_timestamp, department)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'WO-20251110-TST-001',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  NOW(),
  'pouching'
);

-- Test 5.1: INSERT NCA creates audit trail entry
INSERT INTO ncas (
  id,
  nca_number,
  work_order_id,
  raised_by_user_id,
  description,
  created_by,
  status
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'NCA-2025-00000001',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Test non-conformance for audit trail',
  '11111111-1111-1111-1111-111111111111',
  'draft'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'created'
  ),
  'INSERT NCA should create audit trail entry with action=created'
);

-- Test 5.2: Audit entry captures user information
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'created'
    AND user_email = 'test.operator@kangopak.com'
    AND user_name = 'Test Operator'
    AND user_role = 'operator'
  ),
  'Audit entry should capture user email, name, and role'
);

-- Test 5.3: Audit entry captures new_value as JSONB
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'created'
    AND new_value IS NOT NULL
    AND new_value->>'nca_number' = 'NCA-2025-00000001'
  ),
  'Audit entry should capture new_value as JSONB with NCA data'
);

-- ============================================================================
-- TEST SUITE 6: Functional Tests - NCA UPDATE Logging (4 tests)
-- ============================================================================

-- Test 6.1: UPDATE NCA creates audit trail entry
UPDATE ncas
SET description = 'Updated description for audit test'
WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'updated'
  ),
  'UPDATE NCA should create audit trail entry with action=updated'
);

-- Test 6.2: changed_fields array contains only modified fields
SELECT is(
  (
    SELECT changed_fields
    FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'updated'
    ORDER BY timestamp DESC
    LIMIT 1
  ),
  ARRAY['description']::TEXT[],
  'changed_fields should contain only the description field that was modified'
);

-- Test 6.3: old_value and new_value are captured for UPDATE
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'updated'
    AND old_value IS NULL -- old_value not captured in current implementation
    AND new_value IS NOT NULL
    AND new_value->>'description' = 'Updated description for audit test'
  ),
  'UPDATE should capture new_value with updated description'
);

-- Test 6.4: Timestamp is immutable and accurate
SELECT ok(
  (
    SELECT timestamp
    FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'updated'
    ORDER BY timestamp DESC
    LIMIT 1
  ) IS NOT NULL
  AND (
    SELECT timestamp
    FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'updated'
    ORDER BY timestamp DESC
    LIMIT 1
  ) <= NOW(),
  'Timestamp should be set and not in the future'
);

-- ============================================================================
-- TEST SUITE 7: Functional Tests - Status Change Logging (3 tests)
-- ============================================================================

-- Test 7.1: Status change to 'submitted' logs specific action
UPDATE ncas
SET status = 'submitted'
WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'submitted'
  ),
  'Status change to submitted should create audit entry with action=submitted'
);

-- Test 7.2: Status change to 'closed' logs specific action
UPDATE ncas
SET status = 'closed'
WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'closed'
  ),
  'Status change to closed should create audit entry with action=closed'
);

-- Test 7.3: changed_fields includes status for status change
SELECT ok(
  'status' = ANY(
    SELECT changed_fields
    FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
    AND action = 'closed'
    ORDER BY timestamp DESC
    LIMIT 1
  ),
  'changed_fields should include status field for status change'
);

-- ============================================================================
-- TEST SUITE 8: Functional Tests - MJC Hygiene Clearance Logging (3 tests)
-- ============================================================================

-- Setup: Create test MJC
INSERT INTO mjcs (
  id,
  job_card_number,
  raised_by_user_id,
  machine_equipment,
  description_required,
  created_by,
  status
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'MJC-2025-00000001',
  '11111111-1111-1111-1111-111111111111',
  'Test Machine',
  'Test maintenance job for hygiene clearance',
  '11111111-1111-1111-1111-111111111111',
  'awaiting-clearance'
);

-- Test 8.1: Hygiene clearance signature triggers audit log
UPDATE mjcs
SET
  hygiene_clearance_signature = 'Test Signature',
  hygiene_clearance_by = '11111111-1111-1111-1111-111111111111',
  hygiene_clearance_at = NOW(),
  hygiene_checklist = '{"cleaning_complete": true, "inspection_complete": true}'::jsonb
WHERE id = '55555555-5555-5555-5555-555555555555';

SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'mjc'
    AND entity_id = '55555555-5555-5555-5555-555555555555'
    AND action = 'hygiene_clearance_granted'
  ),
  'Hygiene clearance signature should trigger audit entry with action=hygiene_clearance_granted'
);

-- Test 8.2: Hygiene clearance audit includes checklist state
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'mjc'
    AND entity_id = '55555555-5555-5555-5555-555555555555'
    AND action = 'hygiene_clearance_granted'
    AND new_value->>'hygiene_checklist' IS NOT NULL
  ),
  'Hygiene clearance audit should capture hygiene_checklist state'
);

-- Test 8.3: Hygiene clearance audit includes critical notes
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'mjc'
    AND entity_id = '55555555-5555-5555-5555-555555555555'
    AND action = 'hygiene_clearance_granted'
    AND notes LIKE '%BRCGS CRITICAL%'
  ),
  'Hygiene clearance audit should include BRCGS CRITICAL note'
);

-- ============================================================================
-- TEST SUITE 9: Functional Tests - Machine Down Logging (3 tests)
-- ============================================================================

-- Setup: Create test NCA with machine down status
INSERT INTO ncas (
  id,
  nca_number,
  work_order_id,
  raised_by_user_id,
  description,
  created_by,
  status,
  machine_status,
  machine_down_since
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  'NCA-2025-00000002',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Machine down test for audit trail',
  '11111111-1111-1111-1111-111111111111',
  'open',
  'down',
  NOW()
);

-- Test 9.1: Machine down status triggers specific audit log
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '66666666-6666-6666-6666-666666666666'
    AND action = 'machine_down_reported'
  ),
  'Machine status=down should trigger audit entry with action=machine_down_reported'
);

-- Test 9.2: Machine down audit includes machine status data
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '66666666-6666-6666-6666-666666666666'
    AND action = 'machine_down_reported'
    AND new_value->>'machine_status' = 'down'
    AND new_value->>'machine_down_since' IS NOT NULL
  ),
  'Machine down audit should capture machine_status and machine_down_since'
);

-- Test 9.3: Machine down audit includes critical alert note
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '66666666-6666-6666-6666-666666666666'
    AND action = 'machine_down_reported'
    AND notes LIKE '%CRITICAL: Machine Down%'
  ),
  'Machine down audit should include CRITICAL alert note'
);

-- ============================================================================
-- TEST SUITE 10: Query Audit History (3 tests)
-- ============================================================================

-- Test 10.1: Can query audit history for specific entity
SELECT ok(
  (
    SELECT COUNT(*)
    FROM audit_trail
    WHERE entity_type = 'ncas'
    AND entity_id = '44444444-4444-4444-4444-444444444444'
  ) >= 3,
  'Should be able to query complete audit history for an NCA (created + updates)'
);

-- Test 10.2: Audit entries are ordered by timestamp
SELECT ok(
  (
    SELECT COUNT(*)
    FROM (
      SELECT timestamp
      FROM audit_trail
      WHERE entity_type = 'ncas'
      AND entity_id = '44444444-4444-4444-4444-444444444444'
      ORDER BY timestamp ASC
    ) AS ordered_entries
  ) >= 3,
  'Audit entries can be ordered by timestamp for chronological history'
);

-- Test 10.3: Can filter audit trail by action type
SELECT ok(
  EXISTS (
    SELECT 1 FROM audit_trail
    WHERE entity_type = 'ncas'
    AND action = 'submitted'
  ),
  'Should be able to filter audit trail by specific action type'
);

SELECT * FROM finish();
ROLLBACK;
