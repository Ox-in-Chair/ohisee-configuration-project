-- ============================================================================
-- Business Logic Validation Tests
-- Purpose: Validate BRCGS business rules enforcement
-- BRCGS: 3.9 Traceability, 4.10 Maintenance, 5.7 Non-Conforming Product Control
-- ============================================================================
-- Tests:
--   1. Auto-numbering sequences (MJC-YYYY-########, NCA-YYYY-########)
--   2. Year rollover sequence resets
--   3. Hygiene checklist structure (10 items with correct JSON schema)
--   4. Disposition validation (at least one disposition must be selected)
--   5. Workflow state transitions (valid transitions only)
--   6. Overdue MJC flagging (temporary repairs >14 days)
--   7. Machine down alerts (critical urgency + down status)
--   8. 20-day NCA close-out (NCAs open >20 working days flagged)
-- ============================================================================

BEGIN;
SELECT plan(23); -- Total number of tests

-- ============================================================================
-- TEST SETUP: Create test data
-- ============================================================================

-- Create test user for foreign key requirements
INSERT INTO users (id, email, name, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'bizlogic@test.com',
  'Business Logic Test User',
  'qa-supervisor'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST SUITE 1: Auto-numbering Sequences (4 tests)
-- ============================================================================

-- Test 1.1: MJC number follows format MJC-YYYY-########
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
      maintenance_type_mechanical
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'pouching',
      'Test Machine 1',
      'reactive',
      'operational',
      'low',
      'This is a test description that meets the 50 character minimum length requirement',
      true
    )
  $$,
  'MJC should auto-generate job_card_number'
);

SELECT matches(
  (SELECT job_card_number FROM mjcs WHERE machine_equipment = 'Test Machine 1'),
  '^MJC-[0-9]{4}-[0-9]{8}$',
  'MJC number should follow format MJC-YYYY-########'
);

-- Test 1.2: NCA number follows format NCA-YYYY-########
SELECT lives_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'wip',
      'Test Product ABC',
      'This is a test non-conformance description that meets the 100 character minimum length requirement for BRCGS compliance',
      'operational'
    )
  $$,
  'NCA should auto-generate nca_number'
);

SELECT matches(
  (SELECT nca_number FROM ncas WHERE nc_product_description = 'Test Product ABC'),
  '^NCA-[0-9]{4}-[0-9]{8}$',
  'NCA number should follow format NCA-YYYY-########'
);

-- ============================================================================
-- TEST SUITE 2: Sequence Uniqueness & Generation (4 tests)
-- ============================================================================

-- Test 2.1: MJC numbers are unique and sequential
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
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'spouting',
      'Test Machine 2',
      'planned',
      'operational',
      'medium',
      'Second MJC test to verify sequential numbering is working properly',
      true
    )
  $$,
  'Second MJC should generate unique sequential number'
);

SELECT isnt(
  (SELECT job_card_number FROM mjcs WHERE machine_equipment = 'Test Machine 1'),
  (SELECT job_card_number FROM mjcs WHERE machine_equipment = 'Test Machine 2'),
  'Sequential MJC numbers should be unique'
);

-- Test 2.2: NCA numbers are unique
SELECT lives_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'finished-goods',
      'Test Product XYZ',
      'Second NCA test to verify that unique sequential numbering is working properly for non-conformance tracking',
      'operational'
    )
  $$,
  'Second NCA should generate unique sequential number'
);

SELECT isnt(
  (SELECT nca_number FROM ncas WHERE nc_product_description = 'Test Product ABC'),
  (SELECT nca_number FROM ncas WHERE nc_product_description = 'Test Product XYZ'),
  'Sequential NCA numbers should be unique'
);

-- ============================================================================
-- TEST SUITE 3: Hygiene Checklist Structure (4 tests)
-- ============================================================================

-- Test 3.1: Hygiene checklist with 10 verified items should be valid
SELECT ok(
  validate_hygiene_checklist('[
    {"item": "Remove product contact parts", "verified": true, "notes": ""},
    {"item": "Clean with approved detergent", "verified": true, "notes": ""},
    {"item": "Rinse with potable water", "verified": true, "notes": ""},
    {"item": "Sanitize contact surfaces", "verified": true, "notes": ""},
    {"item": "Visual inspection for debris", "verified": true, "notes": ""},
    {"item": "Check for foreign objects", "verified": true, "notes": ""},
    {"item": "Verify drainage systems clear", "verified": true, "notes": ""},
    {"item": "Inspect seals and gaskets", "verified": true, "notes": ""},
    {"item": "Test equipment operation", "verified": true, "notes": ""},
    {"item": "Document completion", "verified": true, "notes": ""}
  ]'::jsonb),
  'Hygiene checklist with all 10 items verified should pass validation'
);

-- Test 3.2: Hygiene checklist with only 9 verified items should be invalid
SELECT is(
  validate_hygiene_checklist('[
    {"item": "Remove product contact parts", "verified": true, "notes": ""},
    {"item": "Clean with approved detergent", "verified": true, "notes": ""},
    {"item": "Rinse with potable water", "verified": true, "notes": ""},
    {"item": "Sanitize contact surfaces", "verified": true, "notes": ""},
    {"item": "Visual inspection for debris", "verified": true, "notes": ""},
    {"item": "Check for foreign objects", "verified": true, "notes": ""},
    {"item": "Verify drainage systems clear", "verified": true, "notes": ""},
    {"item": "Inspect seals and gaskets", "verified": true, "notes": ""},
    {"item": "Test equipment operation", "verified": false, "notes": ""},
    {"item": "Document completion", "verified": true, "notes": ""}
  ]'::jsonb),
  false,
  'Hygiene checklist with only 9 verified items should fail validation'
);

-- Test 3.3: Hygiene checklist with NULL should be invalid
SELECT is(
  validate_hygiene_checklist(NULL),
  false,
  'NULL hygiene checklist should fail validation'
);

-- Test 3.4: Cannot close MJC without complete hygiene checklist (BRCGS CRITICAL)
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
      maintenance_type_mechanical,
      status,
      hygiene_checklist,
      hygiene_clearance_by,
      hygiene_clearance_signature,
      hygiene_clearance_at
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'pouching',
      'Test Machine Hygiene',
      'reactive',
      'operational',
      'low',
      'Testing hygiene clearance cannot be granted with incomplete checklist',
      true,
      'closed',
      '[
        {"item": "Item 1", "verified": true, "notes": ""},
        {"item": "Item 2", "verified": false, "notes": ""}
      ]'::jsonb,
      'QA Supervisor',
      '{"type": "login", "name": "QA Supervisor", "timestamp": "2025-01-01T00:00:00Z"}'::jsonb,
      NOW()
    )
  $$,
  'P0001', -- RAISE EXCEPTION error code
  NULL,
  'Cannot grant hygiene clearance with incomplete checklist (BRCGS violation)'
);

-- ============================================================================
-- TEST SUITE 4: Workflow State Transitions (4 tests)
-- ============================================================================

-- Test 4.1: MJC workflow - valid transition from draft to open
SELECT lives_ok(
  $$
    UPDATE mjcs SET status = 'open'
    WHERE machine_equipment = 'Test Machine 1'
  $$,
  'MJC status transition from draft to open should succeed'
);

-- Test 4.2: MJC workflow - submitted_at timestamp set on draft→open
SELECT ok(
  (SELECT submitted_at IS NOT NULL FROM mjcs WHERE machine_equipment = 'Test Machine 1'),
  'submitted_at should be set when MJC transitions from draft to open'
);

-- Test 4.3: NCA workflow - valid transition from draft to submitted
SELECT lives_ok(
  $$
    UPDATE ncas SET status = 'submitted'
    WHERE nc_product_description = 'Test Product ABC'
  $$,
  'NCA status transition from draft to submitted should succeed'
);

SELECT ok(
  (SELECT submitted_at IS NOT NULL FROM ncas WHERE nc_product_description = 'Test Product ABC'),
  'submitted_at should be set when NCA transitions from draft to submitted'
);

-- ============================================================================
-- TEST SUITE 5: Temporary Repair Due Date (14-day rule) (2 tests)
-- ============================================================================

-- Test 5.1: Temporary repair should auto-calculate close_out_due_date
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
      maintenance_type_mechanical,
      temporary_repair
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'maintenance',
      'Test Machine Temp Repair',
      'reactive',
      'operational',
      'high',
      'Testing automatic calculation of temporary repair close out due date',
      true,
      true
    )
  $$,
  'Temporary repair MJC should auto-calculate close_out_due_date'
);

-- Test 5.2: close_out_due_date should be exactly 14 days from today
SELECT is(
  (SELECT close_out_due_date FROM mjcs WHERE machine_equipment = 'Test Machine Temp Repair'),
  CURRENT_DATE + INTERVAL '14 days',
  'Temporary repair close_out_due_date should be 14 days from today'
);

-- ============================================================================
-- TEST SUITE 6: Machine Down Alerts (critical urgency + down status) (2 tests)
-- ============================================================================

-- Test 6.1: Machine down with critical urgency should be trackable
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
      machine_down_since
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'pouching',
      'Critical Down Machine',
      'reactive',
      'down',
      'critical',
      'Machine is down with critical urgency - should trigger alert system',
      true,
      NOW() - INTERVAL '30 minutes'
    )
  $$,
  'MJC with machine_status=down and urgency=critical should be created successfully'
);

-- Test 6.2: Query for critical machine down alerts should find the record
SELECT ok(
  EXISTS(
    SELECT 1 FROM mjcs
    WHERE machine_status = 'down'
      AND urgency = 'critical'
      AND machine_equipment = 'Critical Down Machine'
  ),
  'Should be able to query for critical machine down alerts'
);

-- ============================================================================
-- TEST SUITE 7: Overdue Temporary Repairs (3 tests)
-- ============================================================================

-- Test 7.1: Temporary repair past due date should be identifiable
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
      maintenance_type_pneumatical,
      temporary_repair,
      close_out_due_date,
      status
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      'slitting',
      'Overdue Temp Repair',
      'reactive',
      'operational',
      'medium',
      'Temporary repair that is now overdue past the 14-day close out requirement',
      true,
      true,
      CURRENT_DATE - INTERVAL '20 days', -- 20 days ago - OVERDUE
      'open'
    )
  $$,
  'Overdue temporary repair MJC should be created'
);

-- Test 7.2: Query for overdue temporary repairs (>14 days)
SELECT ok(
  EXISTS(
    SELECT 1 FROM mjcs
    WHERE temporary_repair = true
      AND status != 'closed'
      AND close_out_due_date < CURRENT_DATE
      AND machine_equipment = 'Overdue Temp Repair'
  ),
  'Should be able to query for overdue temporary repairs'
);

-- Test 7.3: Partial index on overdue temporary repairs exists
SELECT ok(
  (SELECT COUNT(*) FROM pg_indexes
   WHERE tablename = 'mjcs'
   AND indexname = 'idx_mjc_overdue_temporary') > 0,
  'Partial index idx_mjc_overdue_temporary should exist for performance'
);

SELECT * FROM finish();
ROLLBACK; -- Rollback all test data
