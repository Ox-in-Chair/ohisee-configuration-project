-- ============================================================================
-- MJC Schema Validation Tests
-- Purpose: Validate MJC table structure matches BRCGS requirements
-- BRCGS: Section 4.7 Maintenance, Section 5.7 Hygiene Standards
-- ============================================================================

BEGIN;
SELECT plan(50); -- Total number of tests

-- ============================================================================
-- TEST SUITE 1: Table Existence & Structure (5 tests)
-- ============================================================================

-- Test 1.1: MJC table exists
SELECT has_table('public', 'mjcs', 'MJC table should exist');

-- Test 1.2: MJC table has correct schema
SELECT has_pk('public', 'mjcs', 'MJC table should have a primary key');

-- Test 1.3: Table has standard audit columns
SELECT has_column('public', 'mjcs', 'created_at', 'MJC should have created_at timestamp');
SELECT has_column('public', 'mjcs', 'updated_at', 'MJC should have updated_at timestamp');

-- Test 1.4: Table is properly commented
SELECT col_not_null('public', 'mjcs', 'created_at', 'created_at should be NOT NULL');

-- ============================================================================
-- TEST SUITE 2: Primary & Foreign Keys (6 tests)
-- ============================================================================

-- Test 2.1: ID column is primary key
SELECT col_is_pk('public', 'mjcs', 'id', 'id should be the primary key');

-- Test 2.2: job_card_number is unique
SELECT col_is_unique('public', 'mjcs', 'job_card_number', 'job_card_number should be unique');

-- Test 2.3: Foreign key to work_orders
SELECT has_fk('public', 'mjcs', 'Foreign key to work_orders should exist');

-- Test 2.4: Foreign key to users (raised_by_user_id)
SELECT col_is_fk('public', 'mjcs', 'raised_by_user_id', 'raised_by_user_id should be a foreign key');

-- Test 2.5: Foreign key to users (created_by)
SELECT col_is_fk('public', 'mjcs', 'created_by', 'created_by should be a foreign key');

-- Test 2.6: Foreign key to users (assigned_to)
SELECT col_is_fk('public', 'mjcs', 'assigned_to', 'assigned_to should be a foreign key');

-- ============================================================================
-- TEST SUITE 3: Column Existence & Types (15 tests)
-- ============================================================================

-- Section 1: Job Card Identification
SELECT has_column('public', 'mjcs', 'job_card_number', 'Should have job_card_number column');
SELECT col_type_is('public', 'mjcs', 'job_card_number', 'text', 'job_card_number should be text');
SELECT has_column('public', 'mjcs', 'date', 'Should have date column');
SELECT has_column('public', 'mjcs', 'time', 'Should have time column');
SELECT has_column('public', 'mjcs', 'department', 'Should have department column');

-- Section 2: Machine/Equipment
SELECT has_column('public', 'mjcs', 'machine_equipment', 'Should have machine_equipment column');
SELECT has_column('public', 'mjcs', 'machine_id', 'Should have machine_id column');

-- Section 3: Maintenance Type
SELECT has_column('public', 'mjcs', 'maintenance_category', 'Should have maintenance_category column');
SELECT has_column('public', 'mjcs', 'maintenance_type_electrical', 'Should have maintenance_type_electrical column');
SELECT has_column('public', 'mjcs', 'maintenance_type_mechanical', 'Should have maintenance_type_mechanical column');

-- Section 4: Machine Status (BRCGS CRITICAL)
SELECT has_column('public', 'mjcs', 'machine_status', 'Should have machine_status column');
SELECT has_column('public', 'mjcs', 'urgency', 'Should have urgency column');
SELECT has_column('public', 'mjcs', 'machine_down_since', 'Should have machine_down_since column');

-- Section 5: Temporary Repair
SELECT has_column('public', 'mjcs', 'temporary_repair', 'Should have temporary_repair column');
SELECT has_column('public', 'mjcs', 'close_out_due_date', 'Should have close_out_due_date column');

-- ============================================================================
-- TEST SUITE 4: Hygiene Checklist Columns (BRCGS CRITICAL - 4 tests)
-- ============================================================================

SELECT has_column('public', 'mjcs', 'hygiene_checklist', 'Should have hygiene_checklist JSONB column');
SELECT col_type_is('public', 'mjcs', 'hygiene_checklist', 'jsonb', 'hygiene_checklist should be jsonb type');
SELECT has_column('public', 'mjcs', 'hygiene_clearance_by', 'Should have hygiene_clearance_by column');
SELECT has_column('public', 'mjcs', 'hygiene_clearance_signature', 'Should have hygiene_clearance_signature column');

-- ============================================================================
-- TEST SUITE 5: Status Workflow Column (2 tests)
-- ============================================================================

SELECT has_column('public', 'mjcs', 'status', 'Should have status column');
SELECT col_has_default('public', 'mjcs', 'status', 'status should have default value');

-- ============================================================================
-- TEST SUITE 6: NOT NULL Constraints (5 tests)
-- ============================================================================

SELECT col_not_null('public', 'mjcs', 'job_card_number', 'job_card_number should be NOT NULL');
SELECT col_not_null('public', 'mjcs', 'raised_by_user_id', 'raised_by_user_id should be NOT NULL');
SELECT col_not_null('public', 'mjcs', 'machine_equipment', 'machine_equipment should be NOT NULL');
SELECT col_not_null('public', 'mjcs', 'description_required', 'description_required should be NOT NULL');
SELECT col_not_null('public', 'mjcs', 'status', 'status should be NOT NULL');

-- ============================================================================
-- TEST SUITE 7: Indexes (6 tests)
-- ============================================================================

SELECT has_index('public', 'mjcs', 'idx_mjc_number', 'Should have index on job_card_number');
SELECT has_index('public', 'mjcs', 'idx_mjc_status', 'Should have index on status');
SELECT has_index('public', 'mjcs', 'idx_mjc_urgency', 'Should have index on urgency');
SELECT has_index('public', 'mjcs', 'idx_mjc_machine_status', 'Should have partial index on machine_status=down');
SELECT has_index('public', 'mjcs', 'idx_mjc_temporary_repair', 'Should have index on temporary repairs');
SELECT has_index('public', 'mjcs', 'idx_mjc_awaiting_clearance', 'Should have index on awaiting-clearance status');

-- ============================================================================
-- TEST SUITE 8: Functions & Triggers (4 tests)
-- ============================================================================

-- Test 8.1: validate_hygiene_checklist function exists (BRCGS CRITICAL)
SELECT has_function(
  'public',
  'validate_hygiene_checklist',
  ARRAY['jsonb'],
  'validate_hygiene_checklist(jsonb) function should exist'
);

-- Test 8.2: calculate_mjc_due_date function exists
SELECT has_function(
  'public',
  'calculate_mjc_due_date',
  'calculate_mjc_due_date() function should exist'
);

-- Test 8.3: prevent_incomplete_clearance trigger exists (BRCGS CRITICAL)
SELECT has_trigger('public', 'mjcs', 'mjc_prevent_incomplete_clearance', 'Should have trigger preventing incomplete clearance');

-- Test 8.4: Auto-update updated_at trigger exists
SELECT has_trigger('public', 'mjcs', 'mjcs_updated_at', 'Should have trigger for updated_at');

-- ============================================================================
-- TEST SUITE 9: Check Constraints (3 tests)
-- ============================================================================

-- Test 9.1: Description minimum length constraint
SELECT has_check('public', 'mjcs', 'mjc_description_min_length', 'Should have constraint on description minimum length');

-- Test 9.2: Machine down requires timestamp constraint
SELECT has_check('public', 'mjcs', 'mjc_machine_down_requires_timestamp', 'Should have constraint requiring timestamp when machine down');

-- Test 9.3: Hygiene clearance requires signature constraint
SELECT has_check('public', 'mjcs', 'mjc_hygiene_clearance_requires_signature', 'Should have constraint requiring signature for clearance');

SELECT * FROM finish();
ROLLBACK;
