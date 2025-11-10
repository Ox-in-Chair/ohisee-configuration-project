-- ============================================================================
-- MJC Trigger and Function Tests
-- Purpose: Test BRCGS-critical triggers and functions for MJC workflow
-- Tests validate auto-calculations, hygiene checklist validation, and audit trails
-- ============================================================================

BEGIN;
SELECT plan(20); -- Total number of tests

-- Create test user for foreign key requirements
INSERT INTO users (id, email, full_name, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'trigger-test@test.com',
  'Trigger Test User',
  'operator'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST GROUP 1: calculate_mjc_due_date() - Auto-calculate 14-day deadline
-- BRCGS CRITICAL: Temporary repairs must be closed out within 14 days
-- ============================================================================

-- Test 1.1: temporary_repair=true with NULL close_out_due_date auto-calculates
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
      temporary_repair,
      close_out_due_date,
      maintenance_type_electrical
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'pouching',
      'Test Machine Auto Due Date',
      'reactive',
      'operational',
      'low',
      'Testing temporary repair auto-calculates due date correctly',
      true, -- temporary_repair = true
      NULL, -- Should auto-calculate to CURRENT_DATE + 14 days
      true
    )
  $$,
  'Temporary repair with NULL due date should auto-calculate'
);

-- Test 1.2: Verify the auto-calculated due date is exactly 14 days from today
SELECT is(
  (SELECT close_out_due_date FROM mjcs
   WHERE description_required = 'Testing temporary repair auto-calculates due date correctly'),
  CURRENT_DATE + INTERVAL '14 days',
  'Auto-calculated due date should be exactly 14 days from today'
);

-- Test 1.3: temporary_repair=false should NOT auto-calculate due date
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
      temporary_repair,
      close_out_due_date,
      maintenance_type_electrical
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'pouching',
      'Test Machine No Temp Repair',
      'reactive',
      'operational',
      'low',
      'Testing non-temporary repair does not auto-calculate date',
      false, -- temporary_repair = false
      NULL, -- Should remain NULL
      true
    )
  $$,
  'Non-temporary repair should not auto-calculate due date'
);

-- Test 1.4: Verify NULL close_out_due_date when temporary_repair=false
SELECT is(
  (SELECT close_out_due_date FROM mjcs
   WHERE description_required = 'Testing non-temporary repair does not auto-calculate date'),
  NULL,
  'Non-temporary repair should have NULL due date'
);

-- Test 1.5: Manual due date should NOT be overwritten by trigger
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
      temporary_repair,
      close_out_due_date,
      maintenance_type_electrical
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'pouching',
      'Test Machine Manual Due Date',
      'reactive',
      'operational',
      'low',
      'Testing manual due date is not overwritten by trigger logic',
      true, -- temporary_repair = true
      CURRENT_DATE + INTERVAL '7 days', -- Manual override
      true
    )
  $$,
  'Temporary repair with manual due date should not be overwritten'
);

-- Test 1.6: Verify manual due date is preserved
SELECT is(
  (SELECT close_out_due_date FROM mjcs
   WHERE description_required = 'Testing manual due date is not overwritten by trigger logic'),
  CURRENT_DATE + INTERVAL '7 days',
  'Manual due date should be preserved and not overwritten'
);

-- ============================================================================
-- TEST GROUP 2: validate_hygiene_checklist(jsonb) - All 10 items verified
-- BRCGS CRITICAL: Cannot grant clearance unless ALL 10 items verified
-- ============================================================================

-- Test 2.1: All 10 items verified should return TRUE
SELECT is(
  validate_hygiene_checklist('[
    {"item": "Area cleaned", "verified": true},
    {"item": "Tools sanitized", "verified": true},
    {"item": "No debris", "verified": true},
    {"item": "No contamination", "verified": true},
    {"item": "Surfaces wiped", "verified": true},
    {"item": "Equipment checked", "verified": true},
    {"item": "Safety verified", "verified": true},
    {"item": "Documentation complete", "verified": true},
    {"item": "QA inspection passed", "verified": true},
    {"item": "Ready for production", "verified": true}
  ]'::jsonb),
  true,
  'All 10 items verified should return TRUE'
);

-- Test 2.2: Only 9 items verified should return FALSE (BRCGS violation)
SELECT is(
  validate_hygiene_checklist('[
    {"item": "Area cleaned", "verified": true},
    {"item": "Tools sanitized", "verified": true},
    {"item": "No debris", "verified": true},
    {"item": "No contamination", "verified": true},
    {"item": "Surfaces wiped", "verified": true},
    {"item": "Equipment checked", "verified": true},
    {"item": "Safety verified", "verified": true},
    {"item": "Documentation complete", "verified": true},
    {"item": "QA inspection passed", "verified": true},
    {"item": "Ready for production", "verified": false}
  ]'::jsonb),
  false,
  'Only 9 items verified should return FALSE'
);

-- Test 2.3: NULL checklist should return FALSE
SELECT is(
  validate_hygiene_checklist(NULL),
  false,
  'NULL checklist should return FALSE'
);

-- Test 2.4: Empty array should return FALSE
SELECT is(
  validate_hygiene_checklist('[]'::jsonb),
  false,
  'Empty checklist array should return FALSE'
);

-- Test 2.5: Fewer than 10 items (even if all verified) should return FALSE
SELECT is(
  validate_hygiene_checklist('[
    {"item": "Area cleaned", "verified": true},
    {"item": "Tools sanitized", "verified": true},
    {"item": "No debris", "verified": true}
  ]'::jsonb),
  false,
  'Fewer than 10 items should return FALSE even if all verified'
);

-- ============================================================================
-- TEST GROUP 3: prevent_incomplete_clearance() - Block closure if incomplete
-- BRCGS CRITICAL: Cannot close MJC without complete hygiene checklist
-- ============================================================================

-- First create a test MJC for closure tests
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
  status,
  hygiene_checklist
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'pouching',
  'Test Machine Clearance',
  'reactive',
  'operational',
  'low',
  'Testing hygiene clearance validation before allowing closure',
  true,
  'awaiting-clearance',
  '[
    {"item": "Area cleaned", "verified": true},
    {"item": "Tools sanitized", "verified": true},
    {"item": "No debris", "verified": true},
    {"item": "No contamination", "verified": true},
    {"item": "Surfaces wiped", "verified": true},
    {"item": "Equipment checked", "verified": true},
    {"item": "Safety verified", "verified": true},
    {"item": "Documentation complete", "verified": true},
    {"item": "QA inspection passed", "verified": false},
    {"item": "Ready for production", "verified": false}
  ]'::jsonb
);

-- Test 3.1: Closing MJC with incomplete checklist should FAIL
SELECT throws_ok(
  $$
    UPDATE mjcs SET
      status = 'closed',
      hygiene_clearance_by = 'QA Manager',
      hygiene_clearance_signature = '{"type": "login", "name": "QA Manager"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE description_required = 'Testing hygiene clearance validation before allowing closure'
  $$,
  'P0001', -- RAISE EXCEPTION error code
  'BRCGS VIOLATION: Cannot grant hygiene clearance - all 10 checklist items must be verified',
  'Closing MJC with incomplete checklist should throw BRCGS violation'
);

-- Update the test MJC to have complete checklist
UPDATE mjcs SET
  hygiene_checklist = '[
    {"item": "Area cleaned", "verified": true},
    {"item": "Tools sanitized", "verified": true},
    {"item": "No debris", "verified": true},
    {"item": "No contamination", "verified": true},
    {"item": "Surfaces wiped", "verified": true},
    {"item": "Equipment checked", "verified": true},
    {"item": "Safety verified", "verified": true},
    {"item": "Documentation complete", "verified": true},
    {"item": "QA inspection passed", "verified": true},
    {"item": "Ready for production", "verified": true}
  ]'::jsonb
WHERE description_required = 'Testing hygiene clearance validation before allowing closure';

-- Test 3.2: Closing MJC with complete checklist should SUCCEED
SELECT lives_ok(
  $$
    UPDATE mjcs SET
      status = 'closed',
      hygiene_clearance_by = 'QA Manager',
      hygiene_clearance_signature = '{"type": "login", "name": "QA Manager"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE description_required = 'Testing hygiene clearance validation before allowing closure'
  $$,
  'Closing MJC with complete checklist should succeed'
);

-- ============================================================================
-- TEST GROUP 4: set_mjc_submitted_at() - Set timestamp on draft→open
-- Audit trail requirement: Track when MJC officially submitted
-- ============================================================================

-- Create draft MJC
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
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'pouching',
  'Test Machine Submit Timestamp',
  'reactive',
  'operational',
  'low',
  'Testing submitted_at timestamp is set when transitioning draft to open',
  true,
  'draft'
);

-- Test 4.1: submitted_at should be NULL for draft status
SELECT is(
  (SELECT submitted_at FROM mjcs
   WHERE description_required = 'Testing submitted_at timestamp is set when transitioning draft to open'),
  NULL,
  'Draft MJC should have NULL submitted_at'
);

-- Test 4.2: Transitioning draft→open should set submitted_at
SELECT lives_ok(
  $$
    UPDATE mjcs SET status = 'open'
    WHERE description_required = 'Testing submitted_at timestamp is set when transitioning draft to open'
  $$,
  'Transitioning draft to open should succeed'
);

-- Test 4.3: submitted_at should now be set
SELECT isnt(
  (SELECT submitted_at FROM mjcs
   WHERE description_required = 'Testing submitted_at timestamp is set when transitioning draft to open'),
  NULL,
  'submitted_at should be set after draft→open transition'
);

-- Test 4.4: submitted_at should be recent (within last 5 seconds)
SELECT ok(
  (SELECT submitted_at FROM mjcs
   WHERE description_required = 'Testing submitted_at timestamp is set when transitioning draft to open')
  >= NOW() - INTERVAL '5 seconds',
  'submitted_at should be recent timestamp'
);

-- ============================================================================
-- TEST GROUP 5: set_mjc_closed_at() - Set timestamp on any→closed
-- Audit trail requirement: Track when MJC officially closed
-- ============================================================================

-- Create open MJC for closure testing
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
  status,
  hygiene_checklist
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'pouching',
  'Test Machine Close Timestamp',
  'reactive',
  'operational',
  'low',
  'Testing closed_at timestamp is set when transitioning to closed',
  true,
  'awaiting-clearance',
  '[
    {"item": "Area cleaned", "verified": true},
    {"item": "Tools sanitized", "verified": true},
    {"item": "No debris", "verified": true},
    {"item": "No contamination", "verified": true},
    {"item": "Surfaces wiped", "verified": true},
    {"item": "Equipment checked", "verified": true},
    {"item": "Safety verified", "verified": true},
    {"item": "Documentation complete", "verified": true},
    {"item": "QA inspection passed", "verified": true},
    {"item": "Ready for production", "verified": true}
  ]'::jsonb
);

-- Test 5.1: closed_at should be NULL before closing
SELECT is(
  (SELECT closed_at FROM mjcs
   WHERE description_required = 'Testing closed_at timestamp is set when transitioning to closed'),
  NULL,
  'Open MJC should have NULL closed_at'
);

-- Test 5.2: Transitioning to closed should set closed_at
SELECT lives_ok(
  $$
    UPDATE mjcs SET
      status = 'closed',
      hygiene_clearance_by = 'QA Manager',
      hygiene_clearance_signature = '{"type": "login", "name": "QA Manager"}'::jsonb,
      hygiene_clearance_at = NOW()
    WHERE description_required = 'Testing closed_at timestamp is set when transitioning to closed'
  $$,
  'Transitioning to closed should succeed'
);

-- Test 5.3: closed_at should now be set
SELECT isnt(
  (SELECT closed_at FROM mjcs
   WHERE description_required = 'Testing closed_at timestamp is set when transitioning to closed'),
  NULL,
  'closed_at should be set after transition to closed'
);

-- ============================================================================
-- TEST GROUP 6: mjcs_updated_at trigger - Auto-update updated_at
-- Audit trail requirement: Track last modification time
-- ============================================================================

-- Create MJC for update timestamp testing
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
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'pouching',
  'Test Machine Updated At',
  'reactive',
  'operational',
  'low',
  'Testing updated_at timestamp auto-updates on every UPDATE operation',
  true,
  'draft'
);

-- Test 6.1: Capture initial updated_at
SELECT ok(
  (SELECT updated_at FROM mjcs
   WHERE description_required = 'Testing updated_at timestamp auto-updates on every UPDATE operation')
  IS NOT NULL,
  'updated_at should be set on INSERT'
);

-- Wait a moment and update
SELECT pg_sleep(0.1);

-- Test 6.2: updated_at should change after UPDATE
SELECT lives_ok(
  $$
    UPDATE mjcs SET urgency = 'high'
    WHERE description_required = 'Testing updated_at timestamp auto-updates on every UPDATE operation'
  $$,
  'UPDATE should succeed and trigger updated_at refresh'
);

-- Test 6.3: Verify updated_at changed (should be more recent than created_at by at least 0.05 seconds)
SELECT ok(
  (SELECT updated_at > created_at + INTERVAL '0.05 seconds' FROM mjcs
   WHERE description_required = 'Testing updated_at timestamp auto-updates on every UPDATE operation'),
  'updated_at should be more recent than created_at after UPDATE'
);

SELECT * FROM finish();
ROLLBACK; -- Rollback all test data
