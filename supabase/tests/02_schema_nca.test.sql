-- ============================================================================
-- NCA Schema Validation Tests
-- Purpose: Validate NCA table structure matches BRCGS requirements
-- BRCGS: Section 3.9 Traceability, Section 5.7 Control of Non-Conforming Product
-- ============================================================================

BEGIN;
SELECT plan(50); -- Total number of tests

-- ============================================================================
-- TEST SUITE 1: Table Existence & Structure (5 tests)
-- ============================================================================

-- Test 1.1: NCA table exists
SELECT has_table('public', 'ncas', 'NCA table should exist');

-- Test 1.2: NCA table has correct schema
SELECT has_pk('public', 'ncas', 'NCA table should have a primary key');

-- Test 1.3: Table has standard audit columns
SELECT has_column('public', 'ncas', 'created_at', 'NCA should have created_at timestamp');
SELECT has_column('public', 'ncas', 'updated_at', 'NCA should have updated_at timestamp');

-- Test 1.4: Table is properly structured
SELECT col_not_null('public', 'ncas', 'created_at', 'created_at should be NOT NULL');

-- ============================================================================
-- TEST SUITE 2: Primary & Foreign Keys (5 tests)
-- ============================================================================

-- Test 2.1: ID column is primary key
SELECT col_is_pk('public', 'ncas', 'id', 'id should be the primary key');

-- Test 2.2: nca_number is unique
SELECT col_is_unique('public', 'ncas', 'nca_number', 'nca_number should be unique');

-- Test 2.3: Foreign key to work_orders
SELECT has_fk('public', 'ncas', 'Foreign key to work_orders should exist');

-- Test 2.4: Foreign key to users (raised_by_user_id)
SELECT col_is_fk('public', 'ncas', 'raised_by_user_id', 'raised_by_user_id should be a foreign key');

-- Test 2.5: Foreign key to users (created_by)
SELECT col_is_fk('public', 'ncas', 'created_by', 'created_by should be a foreign key');

-- ============================================================================
-- TEST SUITE 3: Column Existence & Types (16 tests)
-- ============================================================================

-- Section 1: NCA Identification
SELECT has_column('public', 'ncas', 'nca_number', 'Should have nca_number column');
SELECT col_type_is('public', 'ncas', 'nca_number', 'text', 'nca_number should be text');
SELECT has_column('public', 'ncas', 'date', 'Should have date column');
SELECT has_column('public', 'ncas', 'time', 'Should have time column');

-- Section 2: NC Classification
SELECT has_column('public', 'ncas', 'nc_type', 'Should have nc_type column');
SELECT has_column('public', 'ncas', 'nc_type_other', 'Should have nc_type_other column');

-- Section 3: Supplier & Product Information
SELECT has_column('public', 'ncas', 'supplier_name', 'Should have supplier_name column');
SELECT has_column('public', 'ncas', 'nc_product_description', 'Should have nc_product_description column');
SELECT has_column('public', 'ncas', 'sample_available', 'Should have sample_available column');
SELECT has_column('public', 'ncas', 'quantity', 'Should have quantity column');

-- Section 4: NC Description (BRCGS CRITICAL - minimum 100 chars)
SELECT has_column('public', 'ncas', 'nc_description', 'Should have nc_description column');
SELECT col_type_is('public', 'ncas', 'nc_description', 'text', 'nc_description should be text');

-- Section 5: Machine Status
SELECT has_column('public', 'ncas', 'machine_status', 'Should have machine_status column');
SELECT has_column('public', 'ncas', 'machine_down_since', 'Should have machine_down_since column');

-- Section 7: Cross-Contamination (BRCGS CRITICAL)
SELECT has_column('public', 'ncas', 'cross_contamination', 'Should have cross_contamination column');
SELECT has_column('public', 'ncas', 'back_tracking_completed', 'Should have back_tracking_completed column');

-- ============================================================================
-- TEST SUITE 4: Disposition Columns (BRCGS CRITICAL - 7 tests)
-- ============================================================================

SELECT has_column('public', 'ncas', 'disposition_reject', 'Should have disposition_reject column');
SELECT has_column('public', 'ncas', 'disposition_rework', 'Should have disposition_rework column');
SELECT has_column('public', 'ncas', 'disposition_concession', 'Should have disposition_concession column');
SELECT has_column('public', 'ncas', 'disposition_discard', 'Should have disposition_discard column');
SELECT has_column('public', 'ncas', 'disposition_uplift', 'Should have disposition_uplift column');
SELECT has_column('public', 'ncas', 'disposition_credit', 'Should have disposition_credit column');
SELECT has_column('public', 'ncas', 'rework_instruction', 'Should have rework_instruction column');

-- ============================================================================
-- TEST SUITE 5: Root Cause & Corrective Action (2 tests)
-- ============================================================================

SELECT has_column('public', 'ncas', 'root_cause_analysis', 'Should have root_cause_analysis column');
SELECT has_column('public', 'ncas', 'corrective_action', 'Should have corrective_action column');

-- ============================================================================
-- TEST SUITE 6: Close Out Columns (3 tests)
-- ============================================================================

SELECT has_column('public', 'ncas', 'close_out_by', 'Should have close_out_by column');
SELECT has_column('public', 'ncas', 'close_out_signature', 'Should have close_out_signature column');
SELECT has_column('public', 'ncas', 'close_out_date', 'Should have close_out_date column');

-- ============================================================================
-- TEST SUITE 7: Status Workflow Column (2 tests)
-- ============================================================================

SELECT has_column('public', 'ncas', 'status', 'Should have status column');
SELECT col_has_default('public', 'ncas', 'status', 'status should have default value');

-- ============================================================================
-- TEST SUITE 8: NOT NULL Constraints (6 tests)
-- ============================================================================

SELECT col_not_null('public', 'ncas', 'nca_number', 'nca_number should be NOT NULL');
SELECT col_not_null('public', 'ncas', 'raised_by_user_id', 'raised_by_user_id should be NOT NULL');
SELECT col_not_null('public', 'ncas', 'nc_product_description', 'nc_product_description should be NOT NULL');
SELECT col_not_null('public', 'ncas', 'nc_description', 'nc_description should be NOT NULL');
SELECT col_not_null('public', 'ncas', 'machine_status', 'machine_status should be NOT NULL');
SELECT col_not_null('public', 'ncas', 'status', 'status should be NOT NULL');

-- ============================================================================
-- TEST SUITE 9: Check Constraints (6 tests)
-- ============================================================================

-- Test 9.1: Description minimum length constraint (BRCGS CRITICAL)
SELECT has_check('public', 'ncas', 'nca_description_min_length', 'Should have constraint on description minimum 100 characters');

-- Test 9.2: Machine down requires timestamp constraint
SELECT has_check('public', 'ncas', 'nca_machine_down_requires_timestamp', 'Should have constraint requiring timestamp when machine down');

-- Test 9.3: Cross-contamination requires tracking constraint (BRCGS CRITICAL)
SELECT has_check('public', 'ncas', 'nca_cross_contamination_requires_tracking', 'Should have constraint requiring back tracking for cross-contamination');

-- Test 9.4: Rework requires instruction constraint
SELECT has_check('public', 'ncas', 'nca_rework_requires_instruction', 'Should have constraint requiring instruction when rework selected');

-- Test 9.5: Closed status requires close out constraint
SELECT has_check('public', 'ncas', 'nca_closed_requires_closeout', 'Should have constraint requiring close out fields when closed');

-- Test 9.6: NC type other requires explanation
SELECT has_check('public', 'ncas', 'nca_nc_type_other_required', 'Should have constraint requiring explanation when nc_type is "other"');

-- ============================================================================
-- TEST SUITE 10: Indexes (5 tests)
-- ============================================================================

SELECT has_index('public', 'ncas', 'idx_nca_number', 'Should have index on nca_number');
SELECT has_index('public', 'ncas', 'idx_nca_status', 'Should have index on status');
SELECT has_index('public', 'ncas', 'idx_nca_machine_status', 'Should have partial index on machine_status=down');
SELECT has_index('public', 'ncas', 'idx_nca_cross_contamination', 'Should have partial index on cross_contamination=true');
SELECT has_index('public', 'ncas', 'idx_nca_nc_type', 'Should have index on nc_type');

-- ============================================================================
-- TEST SUITE 11: Triggers (3 tests)
-- ============================================================================

-- Test 11.1: Auto-update updated_at trigger exists
SELECT has_trigger('public', 'ncas', 'ncas_updated_at', 'Should have trigger for updated_at');

-- Test 11.2: Set submitted_at trigger exists
SELECT has_trigger('public', 'ncas', 'nca_set_submitted_at', 'Should have trigger for submitted_at timestamp');

-- Test 11.3: Set closed_at trigger exists
SELECT has_trigger('public', 'ncas', 'nca_set_closed_at', 'Should have trigger for closed_at timestamp');

SELECT * FROM finish();
ROLLBACK;
