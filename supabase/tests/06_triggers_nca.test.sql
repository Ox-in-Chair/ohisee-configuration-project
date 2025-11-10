-- ============================================================================
-- NCA Trigger Validation Tests
-- Purpose: Test BRCGS-critical trigger behavior for NCAs
-- Tests timestamp automation, status transitions, and constraint enforcement
-- BRCGS: Section 3.9 Traceability, Section 5.7 Non-Conforming Product Control
-- ============================================================================

BEGIN;
SELECT plan(16); -- Total number of tests

-- Create test user for foreign key requirements
INSERT INTO users (id, email, full_name, role)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'trigger-test@test.com',
  'Trigger Test User',
  'operator'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST SUITE 1: submitted_at Timestamp Trigger (4 tests)
-- BRCGS CRITICAL: Audit trail for when NCAs are officially submitted
-- ============================================================================

-- Test 1.1: submitted_at is NULL on INSERT with draft status
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Test Product for Trigger Tests',
  'This is a test description that meets the minimum 100 character requirement for BRCGS compliance and traceability',
  'operational',
  'draft'
);

SELECT is(
  (SELECT submitted_at FROM ncas WHERE id = '11111111-1111-1111-1111-111111111111'),
  NULL,
  'submitted_at should be NULL on INSERT with draft status'
);

-- Test 1.2: submitted_at is set when status changes from draft to submitted
UPDATE ncas
SET status = 'submitted'
WHERE id = '11111111-1111-1111-1111-111111111111';

SELECT isnt(
  (SELECT submitted_at FROM ncas WHERE id = '11111111-1111-1111-1111-111111111111'),
  NULL,
  'submitted_at should be set when status changes from draft to submitted'
);

-- Test 1.3: submitted_at timestamp is recent (within last 5 seconds)
SELECT ok(
  (SELECT submitted_at FROM ncas WHERE id = '11111111-1111-1111-1111-111111111111')
    BETWEEN NOW() - INTERVAL '5 seconds' AND NOW(),
  'submitted_at timestamp should be recent (within last 5 seconds)'
);

-- Test 1.4: submitted_at does NOT change on subsequent status changes
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  status
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Test Product for Second Trigger Test',
  'This is another test description that meets the minimum 100 character requirement for BRCGS compliance and audit',
  'operational',
  'draft'
);

-- First transition: draft -> submitted (sets submitted_at)
UPDATE ncas
SET status = 'submitted'
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Store the submitted_at value
CREATE TEMP TABLE temp_submitted_at AS
SELECT submitted_at as original_submitted_at
FROM ncas
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Wait a moment to ensure time difference
SELECT pg_sleep(0.1);

-- Second transition: submitted -> under-review (should NOT change submitted_at)
UPDATE ncas
SET status = 'under-review'
WHERE id = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT submitted_at FROM ncas WHERE id = '22222222-2222-2222-2222-222222222222'),
  (SELECT original_submitted_at FROM temp_submitted_at),
  'submitted_at should NOT change on subsequent status transitions (submitted -> under-review)'
);

DROP TABLE temp_submitted_at;

-- ============================================================================
-- TEST SUITE 2: closed_at Timestamp Trigger (4 tests)
-- BRCGS CRITICAL: Audit trail for NCA closure and completion
-- ============================================================================

-- Test 2.1: closed_at is NULL on INSERT
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  status
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Test Product for Closed At Trigger',
  'This is a test description for closed_at trigger testing that meets minimum 100 character BRCGS requirement',
  'operational',
  'draft'
);

SELECT is(
  (SELECT closed_at FROM ncas WHERE id = '33333333-3333-3333-3333-333333333333'),
  NULL,
  'closed_at should be NULL on INSERT'
);

-- Test 2.2: closed_at is set when status changes to closed
UPDATE ncas
SET
  status = 'closed',
  close_out_by = 'QA Manager',
  close_out_signature = '{"type": "login", "name": "QA Manager", "timestamp": "2025-11-10T10:00:00Z"}'::jsonb,
  close_out_date = CURRENT_DATE
WHERE id = '33333333-3333-3333-3333-333333333333';

SELECT isnt(
  (SELECT closed_at FROM ncas WHERE id = '33333333-3333-3333-3333-333333333333'),
  NULL,
  'closed_at should be set when status changes to closed'
);

-- Test 2.3: closed_at timestamp is recent (within last 5 seconds)
SELECT ok(
  (SELECT closed_at FROM ncas WHERE id = '33333333-3333-3333-3333-333333333333')
    BETWEEN NOW() - INTERVAL '5 seconds' AND NOW(),
  'closed_at timestamp should be recent (within last 5 seconds)'
);

-- Test 2.4: closed_at is set from any status -> closed (not just submitted -> closed)
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  status
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Test Product for Multi-Status Closed',
  'Testing that closed_at is set from any previous status to closed as per BRCGS audit trail requirements here',
  'operational',
  'submitted' -- Start at submitted (skip draft)
);

UPDATE ncas
SET
  status = 'closed',
  close_out_by = 'Operations Manager',
  close_out_signature = '{"type": "login", "name": "Operations Manager"}'::jsonb,
  close_out_date = CURRENT_DATE
WHERE id = '44444444-4444-4444-4444-444444444444';

SELECT isnt(
  (SELECT closed_at FROM ncas WHERE id = '44444444-4444-4444-4444-444444444444'),
  NULL,
  'closed_at should be set when transitioning from submitted -> closed'
);

-- ============================================================================
-- TEST SUITE 3: updated_at Auto-Update Trigger (3 tests)
-- Standard audit trail for all modifications
-- ============================================================================

-- Test 3.1: updated_at is set on INSERT
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  status
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Test Product for Updated At Trigger',
  'Testing that updated_at is automatically managed by trigger for audit trail compliance per BRCGS requirements',
  'operational',
  'draft'
);

SELECT isnt(
  (SELECT updated_at FROM ncas WHERE id = '55555555-5555-5555-5555-555555555555'),
  NULL,
  'updated_at should be set on INSERT'
);

-- Test 3.2: updated_at changes on UPDATE
CREATE TEMP TABLE temp_updated_at AS
SELECT updated_at as original_updated_at
FROM ncas
WHERE id = '55555555-5555-5555-5555-555555555555';

-- Wait to ensure time difference
SELECT pg_sleep(0.1);

-- Make an update
UPDATE ncas
SET nc_product_description = 'Updated Product Description'
WHERE id = '55555555-5555-5555-5555-555555555555';

SELECT ok(
  (SELECT updated_at FROM ncas WHERE id = '55555555-5555-5555-5555-555555555555') >
  (SELECT original_updated_at FROM temp_updated_at),
  'updated_at should change on UPDATE'
);

DROP TABLE temp_updated_at;

-- Test 3.3: updated_at updates on every modification (multiple UPDATEs)
CREATE TEMP TABLE temp_updated_at2 AS
SELECT updated_at as first_update
FROM ncas
WHERE id = '55555555-5555-5555-5555-555555555555';

SELECT pg_sleep(0.1);

UPDATE ncas
SET supplier_name = 'Test Supplier'
WHERE id = '55555555-5555-5555-5555-555555555555';

CREATE TEMP TABLE temp_updated_at3 AS
SELECT updated_at as second_update
FROM ncas
WHERE id = '55555555-5555-5555-5555-555555555555';

SELECT ok(
  (SELECT second_update FROM temp_updated_at3) >
  (SELECT first_update FROM temp_updated_at2),
  'updated_at should update on every modification'
);

DROP TABLE temp_updated_at2;
DROP TABLE temp_updated_at3;

-- ============================================================================
-- TEST SUITE 4: Cross-Contamination Constraint Enforcement via Trigger (2 tests)
-- BRCGS CRITICAL: Food safety - back tracking mandatory
-- ============================================================================

-- Test 4.1: Cannot set cross_contamination=true without complete tracking
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status,
      cross_contamination,
      back_tracking_person,
      back_tracking_signature,
      back_tracking_completed
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'wip',
      'Cross Contamination Test Product',
      'This product has cross contamination detected but no back tracking completed which violates BRCGS food safety',
      'operational',
      true,
      NULL, -- Missing person
      NULL,
      false
    )
  $$,
  '23514', -- CHECK constraint violation
  NULL,
  'INSERT should fail when cross_contamination=true without complete back tracking'
);

-- Test 4.2: Cannot UPDATE to set cross_contamination=true without complete tracking
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  cross_contamination,
  status
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Product Initially Without Cross Contamination',
  'This product initially has no cross contamination but will be updated to have it which requires complete tracking',
  'operational',
  false, -- Start without cross-contamination
  'draft'
);

SELECT throws_ok(
  $$
    UPDATE ncas
    SET cross_contamination = true
    WHERE id = '66666666-6666-6666-6666-666666666666'
  $$,
  '23514',
  NULL,
  'UPDATE should fail when setting cross_contamination=true without back tracking fields'
);

-- ============================================================================
-- TEST SUITE 5: Rework Instruction Enforcement via Trigger (2 tests)
-- BRCGS CRITICAL: Documented procedures for rework disposition
-- ============================================================================

-- Test 5.1: Cannot set disposition_rework=true without instruction on INSERT
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status,
      disposition_rework,
      rework_instruction
    ) VALUES (
      '99999999-9999-9999-9999-999999999999',
      '99999999-9999-9999-9999-999999999999',
      'finished-goods',
      'Product Requiring Rework',
      'This product requires rework disposition but no instruction provided which violates BRCGS documented procedure requirements',
      'operational',
      true, -- Rework selected
      NULL -- Missing instruction - SHOULD FAIL
    )
  $$,
  '23514',
  NULL,
  'INSERT should fail when disposition_rework=true without instruction'
);

-- Test 5.2: Cannot UPDATE to set disposition_rework=true without instruction
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  disposition_rework,
  status
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'wip',
  'Product That Will Need Rework',
  'This product will be updated to require rework disposition which requires documented instruction per BRCGS standards',
  'operational',
  false, -- Start without rework
  'draft'
);

SELECT throws_ok(
  $$
    UPDATE ncas
    SET disposition_rework = true
    WHERE id = '77777777-7777-7777-7777-777777777777'
  $$,
  '23514',
  NULL,
  'UPDATE should fail when setting disposition_rework=true without instruction'
);

-- ============================================================================
-- TEST SUITE 6: Edge Case - Trigger Interaction (1 test)
-- Verify multiple triggers fire correctly in combination
-- ============================================================================

-- Test 6.1: All three triggers (updated_at, submitted_at, closed_at) work together
INSERT INTO ncas (
  id,
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  status
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  'incident',
  'Multi-Trigger Test Product',
  'Testing that all three timestamp triggers work correctly together in sequence for complete audit trail compliance',
  'operational',
  'draft'
);

-- Transition through all statuses
UPDATE ncas SET status = 'submitted' WHERE id = '88888888-8888-8888-8888-888888888888';
SELECT pg_sleep(0.1);
UPDATE ncas SET status = 'under-review' WHERE id = '88888888-8888-8888-8888-888888888888';
SELECT pg_sleep(0.1);
UPDATE ncas
SET
  status = 'closed',
  close_out_by = 'QA Supervisor',
  close_out_signature = '{"type": "login", "name": "QA Supervisor"}'::jsonb,
  close_out_date = CURRENT_DATE
WHERE id = '88888888-8888-8888-8888-888888888888';

SELECT ok(
  (SELECT
    submitted_at IS NOT NULL AND
    closed_at IS NOT NULL AND
    updated_at IS NOT NULL AND
    closed_at > submitted_at
   FROM ncas WHERE id = '88888888-8888-8888-8888-888888888888'),
  'All three triggers should work together: updated_at, submitted_at, closed_at with proper sequencing'
);

SELECT * FROM finish();
ROLLBACK; -- Rollback all test data
