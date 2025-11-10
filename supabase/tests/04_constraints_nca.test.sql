-- ============================================================================
-- NCA Constraint Validation Tests
-- Purpose: Test that constraints actually enforce BRCGS Section 5.7 requirements
-- Tests expect INSERT/UPDATE to FAIL when violating constraints
-- ============================================================================

BEGIN;
SELECT plan(17); -- Total number of tests

-- Create test user for foreign key requirements
INSERT INTO users (id, email, full_name, role)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  'nca-test@test.com',
  'NCA Test User',
  'operator'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST 1: Description Minimum Length (BRCGS CRITICAL - 100 characters)
-- ============================================================================

-- Test 1.1: Short description should FAIL
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Too short', -- Less than 100 characters
      'operational'
    )
  $$,
  '23514', -- CHECK constraint violation
  NULL,
  'NCA description less than 100 characters should fail'
);

-- Test 1.2: 99-character description should FAIL
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      '123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789', -- 99 chars
      'operational'
    )
  $$,
  '23514',
  NULL,
  'NCA description with 99 characters should fail'
);

-- Test 1.3: 100-character description should SUCCEED
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
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      '1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890', -- 100 chars
      'operational'
    )
  $$,
  'NCA description with exactly 100 characters should succeed'
);

-- ============================================================================
-- TEST 2: Machine Down Requires Timestamp (BRCGS CRITICAL)
-- ============================================================================

-- Test 2.1: Machine down without timestamp should FAIL
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status,
      machine_down_since
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Machine is down but no timestamp is provided which violates BRCGS requirements for proper tracking and traceability',
      'down', -- Machine is down
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
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status,
      machine_down_since
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Machine is down with proper timestamp provided which meets BRCGS requirements for tracking production impacts correctly',
      'down',
      NOW() -- Timestamp provided - SHOULD SUCCEED
    )
  $$,
  'Machine down with timestamp should succeed'
);

-- ============================================================================
-- TEST 3: Cross-Contamination Requires Back Tracking (BRCGS CRITICAL)
-- ============================================================================

-- Test 3.1: Cross-contamination TRUE without back tracking should FAIL
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
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Cross contamination detected but back tracking not completed which is a BRCGS violation requiring immediate action',
      'operational',
      true, -- Cross-contamination detected
      NULL, -- Missing back tracking person - SHOULD FAIL
      NULL,
      false
    )
  $$,
  '23514',
  NULL,
  'Cross-contamination without back tracking person should fail'
);

-- Test 3.2: Cross-contamination TRUE with incomplete back tracking should FAIL
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
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Cross contamination detected with person assigned but tracking not marked complete which violates BRCGS requirements',
      'operational',
      true,
      'John Doe',
      '{"type": "login", "name": "John Doe"}'::jsonb,
      false -- Not completed - SHOULD FAIL
    )
  $$,
  '23514',
  NULL,
  'Cross-contamination with incomplete back tracking should fail'
);

-- Test 3.3: Cross-contamination TRUE with complete back tracking should SUCCEED
SELECT lives_ok(
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
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Cross contamination detected and complete back tracking performed meeting all BRCGS requirements for food safety',
      'operational',
      true,
      'Jane Smith',
      '{"type": "login", "name": "Jane Smith", "timestamp": "2025-11-10T10:00:00Z"}'::jsonb,
      true -- Completed - SHOULD SUCCEED
    )
  $$,
  'Cross-contamination with complete back tracking should succeed'
);

-- Test 3.4: No cross-contamination can skip back tracking
SELECT lives_ok(
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
      back_tracking_completed
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'No cross contamination detected so back tracking is not required per BRCGS Section 5.7 immediate correction procedures',
      'operational',
      false, -- No cross-contamination
      NULL, -- Back tracking not required - SHOULD SUCCEED
      false
    )
  $$,
  'No cross-contamination allows NULL back tracking fields'
);

-- ============================================================================
-- TEST 4: Rework Disposition Requires Instruction
-- ============================================================================

-- Test 4.1: Rework TRUE without instruction should FAIL
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
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Product requires rework but no instruction provided which violates BRCGS requirement for documented rework procedures',
      'operational',
      true, -- Rework selected
      NULL -- Missing instruction - SHOULD FAIL
    )
  $$,
  '23514',
  NULL,
  'Rework disposition without instruction should fail'
);

-- Test 4.2: Rework TRUE with instruction should SUCCEED
SELECT lives_ok(
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
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'wip',
      'Test Product',
      'Product requires rework with clear instruction provided meeting BRCGS requirement for documented rework procedures',
      'operational',
      true,
      'Re-run through quality control station, verify seal integrity, re-label with corrected batch code'
    )
  $$,
  'Rework disposition with instruction should succeed'
);

-- ============================================================================
-- TEST 5: Closed Status Requires Close Out Fields (BRCGS CRITICAL)
-- ============================================================================

-- Test 5.1: Closed status without close out should FAIL
SELECT throws_ok(
  $$
    UPDATE ncas SET
      status = 'closed',
      close_out_by = NULL,
      close_out_signature = NULL,
      close_out_date = NULL
    WHERE id = (
      SELECT id FROM ncas
      WHERE nc_description = '1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'
      LIMIT 1
    )
  $$,
  '23514',
  NULL,
  'Closed status without close out fields should fail'
);

-- Test 5.2: Closed status with complete close out should SUCCEED
SELECT lives_ok(
  $$
    UPDATE ncas SET
      status = 'closed',
      close_out_by = 'QA Manager',
      close_out_signature = '{"type": "login", "name": "QA Manager"}'::jsonb,
      close_out_date = CURRENT_DATE
    WHERE id = (
      SELECT id FROM ncas
      WHERE nc_description = 'Machine is down with proper timestamp provided which meets BRCGS requirements for tracking production impacts correctly'
      LIMIT 1
    )
  $$,
  'Closed status with complete close out should succeed'
);

-- ============================================================================
-- TEST 6: NC Type "other" Requires Explanation
-- ============================================================================

-- Test 6.1: nc_type = 'other' without explanation should FAIL
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_type_other,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'other', -- Type is "other"
      NULL, -- Missing explanation - SHOULD FAIL
      'Test Product',
      'Non conformance type is specified as other but no explanation provided which makes tracking and analysis impossible',
      'operational'
    )
  $$,
  '23514',
  NULL,
  'NC type "other" without explanation should fail'
);

-- Test 6.2: nc_type = 'other' with explanation should SUCCEED
SELECT lives_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_type_other,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'other',
      'Logistics delivery timing issue', -- Explanation provided - SHOULD SUCCEED
      'Test Product',
      'Non conformance type is specified as other with clear explanation provided enabling proper tracking and analysis',
      'operational'
    )
  $$,
  'NC type "other" with explanation should succeed'
);

-- ============================================================================
-- TEST 7: NC Type Check Constraint
-- ============================================================================

-- Test 7.1: Invalid nc_type should FAIL
SELECT throws_ok(
  $$
    INSERT INTO ncas (
      raised_by_user_id,
      created_by,
      nc_type,
      nc_product_description,
      nc_description,
      machine_status
    ) VALUES (
      '88888888-8888-8888-8888-888888888888',
      '88888888-8888-8888-8888-888888888888',
      'invalid-type', -- Not in CHECK constraint list
      'Test Product',
      'Testing invalid NC type which should fail because it is not in the predefined list of valid non conformance types',
      'operational'
    )
  $$,
  '23514',
  NULL,
  'Invalid nc_type should fail'
);

SELECT * FROM finish();
ROLLBACK; -- Rollback all test data
