-- ============================================================================
-- Performance & Index Optimization Tests
-- Purpose: Validate index coverage and query performance optimization
-- BRCGS: Ensure system can handle production load with <50ms query response
-- ============================================================================

BEGIN;
SELECT plan(53); -- Total number of tests

-- ============================================================================
-- TEST SUITE 1: MJC Table - Basic Index Existence (12 tests)
-- ============================================================================

-- Test 1.1: Index on job_card_number (unique lookups)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_number',
  'MJC should have index on job_card_number for fast lookups'
);

-- Test 1.2: Index on status (workflow filtering)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_status',
  'MJC should have index on status for workflow queries'
);

-- Test 1.3: Index on urgency (priority filtering)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_urgency',
  'MJC should have index on urgency for priority sorting'
);

-- Test 1.4: Index on maintenance_category (reactive vs planned)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_maintenance_category',
  'MJC should have index on maintenance_category for filtering'
);

-- Test 1.5: Index on created_at (chronological queries)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_created_at',
  'MJC should have index on created_at for date range queries'
);

-- Test 1.6: Index on date (reporting queries)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_date',
  'MJC should have index on date for daily reports'
);

-- Test 1.7: Foreign key index on wo_id (traceability)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_wo_id',
  'MJC should have index on wo_id for work order queries'
);

-- Test 1.8: Foreign key index on raised_by_user_id
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_raised_by_user_id',
  'MJC should have index on raised_by_user_id for user filtering'
);

-- Test 1.9: Foreign key index on created_by
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_created_by',
  'MJC should have index on created_by for audit queries'
);

-- Test 1.10: Foreign key index on assigned_to
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_assigned_to',
  'MJC should have index on assigned_to for technician workload'
);

-- Test 1.11: Foreign key index on machine_id
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_machine_id',
  'MJC should have index on machine_id for machine history'
);

-- Test 1.12: Partial index on machine_status='down' (CRITICAL)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_machine_status',
  'MJC should have partial index on machine_status=down for alerts'
);

-- ============================================================================
-- TEST SUITE 2: MJC Table - Partial Workflow Indexes (3 tests)
-- ============================================================================

-- Test 2.1: Partial index for temporary repairs (14-day tracking)
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_temporary_repair',
  'MJC should have partial index on temporary_repair=true for closeout tracking'
);

-- Test 2.2: Partial index for awaiting-clearance workflow
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_awaiting_clearance',
  'MJC should have partial index on status=awaiting-clearance for QA queue'
);

-- Test 2.3: Partial index for overdue temporary repairs
SELECT has_index(
  'public',
  'mjcs',
  'idx_mjc_overdue_temporary',
  'MJC should have partial index on overdue temporary repairs for compliance alerts'
);

-- ============================================================================
-- TEST SUITE 3: NCA Table - Basic Index Existence (11 tests)
-- ============================================================================

-- Test 3.1: Index on nca_number (unique lookups)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_number',
  'NCA should have index on nca_number for fast lookups'
);

-- Test 3.2: Index on status (workflow filtering)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_status',
  'NCA should have index on status for workflow queries'
);

-- Test 3.3: Index on nc_type (classification filtering)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_nc_type',
  'NCA should have index on nc_type for categorization'
);

-- Test 3.4: Index on created_at (chronological queries)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_created_at',
  'NCA should have index on created_at for date range queries'
);

-- Test 3.5: Index on date (reporting queries)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_date',
  'NCA should have index on date for daily reports'
);

-- Test 3.6: Foreign key index on wo_id (traceability)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_wo_id',
  'NCA should have index on wo_id for work order queries'
);

-- Test 3.7: Foreign key index on raised_by_user_id
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_raised_by_user_id',
  'NCA should have index on raised_by_user_id for user filtering'
);

-- Test 3.8: Foreign key index on created_by
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_created_by',
  'NCA should have index on created_by for audit queries'
);

-- Test 3.9: Partial index on machine_status='down' (CRITICAL)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_machine_status',
  'NCA should have partial index on machine_status=down for production impact'
);

-- Test 3.10: Partial index on cross_contamination=true (CRITICAL)
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_cross_contamination',
  'NCA should have partial index on cross_contamination=true for food safety'
);

-- Test 3.11: Partial index for active drafts
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_active_drafts',
  'NCA should have partial index on status=draft for incomplete work'
);

-- ============================================================================
-- TEST SUITE 4: NCA Table - Partial Workflow Indexes (1 test)
-- ============================================================================

-- Test 4.1: Partial index for under-review workflow
SELECT has_index(
  'public',
  'ncas',
  'idx_nca_under_review',
  'NCA should have partial index on status=under-review for review queue'
);

-- ============================================================================
-- TEST SUITE 5: Supporting Tables - Foreign Key Indexes (9 tests)
-- ============================================================================

-- Test 5.1: Users table - role index
SELECT has_index(
  'public',
  'users',
  'idx_users_role',
  'Users should have index on role for permission checks'
);

-- Test 5.2: Users table - email index (login lookups)
SELECT has_index(
  'public',
  'users',
  'idx_users_email',
  'Users should have index on email for authentication'
);

-- Test 5.3: Users table - partial index on active=true
SELECT has_index(
  'public',
  'users',
  'idx_users_active',
  'Users should have partial index on active=true for user lists'
);

-- Test 5.4: Machines table - machine_code index
SELECT has_index(
  'public',
  'machines',
  'idx_machines_code',
  'Machines should have index on machine_code for lookups'
);

-- Test 5.5: Machines table - status index
SELECT has_index(
  'public',
  'machines',
  'idx_machines_status',
  'Machines should have index on status for operational filtering'
);

-- Test 5.6: Machines table - department index
SELECT has_index(
  'public',
  'machines',
  'idx_machines_department',
  'Machines should have index on department for organizational queries'
);

-- Test 5.7: Work orders table - wo_number index
SELECT has_index(
  'public',
  'work_orders',
  'idx_wo_number',
  'Work orders should have index on wo_number for lookups'
);

-- Test 5.8: Work orders table - status index
SELECT has_index(
  'public',
  'work_orders',
  'idx_wo_status',
  'Work orders should have index on status for active/completed filtering'
);

-- Test 5.9: Work orders table - machine_id foreign key index
SELECT has_index(
  'public',
  'work_orders',
  'idx_wo_machine_id',
  'Work orders should have index on machine_id for machine queries'
);

-- ============================================================================
-- TEST SUITE 6: Additional Work Order Indexes (2 tests)
-- ============================================================================

-- Test 6.1: Work orders table - operator_id foreign key index
SELECT has_index(
  'public',
  'work_orders',
  'idx_wo_operator_id',
  'Work orders should have index on operator_id for operator queries'
);

-- Test 6.2: Work orders table - start_timestamp index
SELECT has_index(
  'public',
  'work_orders',
  'idx_wo_start_timestamp',
  'Work orders should have index on start_timestamp for chronological queries'
);

-- ============================================================================
-- TEST SUITE 7: Partial Index Condition Verification (4 tests)
-- BRCGS CRITICAL: Verify partial indexes only cover expected rows
-- ============================================================================

-- Test 7.1: MJC machine_status partial index only covers 'down' status
SELECT results_eq(
  $$
    SELECT COUNT(*)::INTEGER
    FROM mjcs
    WHERE machine_status != 'down'
      AND ctid IN (
        SELECT unnest(
          string_to_array(
            pg_get_indexdef(
              (SELECT indexrelid FROM pg_stat_user_indexes WHERE indexrelname = 'idx_mjc_machine_status')
            ),
            ' '
          )
        )::tid
      )
  $$,
  ARRAY[0],
  'MJC idx_mjc_machine_status should only index machine_status=down rows'
);

-- Test 7.2: NCA machine_status partial index only covers 'down' status
-- Note: This test verifies the partial index concept exists
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'ncas'
   AND indexname = 'idx_nca_machine_status')
  LIKE '%WHERE%machine_status%down%',
  'NCA idx_nca_machine_status should have WHERE clause for machine_status=down'
);

-- Test 7.3: NCA cross_contamination partial index definition
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'ncas'
   AND indexname = 'idx_nca_cross_contamination')
  LIKE '%WHERE%cross_contamination%true%',
  'NCA idx_nca_cross_contamination should have WHERE clause for cross_contamination=true'
);

-- Test 7.4: MJC temporary repair partial index condition
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'mjcs'
   AND indexname = 'idx_mjc_temporary_repair')
  LIKE '%WHERE%temporary_repair%true%',
  'MJC idx_mjc_temporary_repair should have WHERE clause for temporary_repair=true'
);

-- ============================================================================
-- TEST SUITE 8: Index Type Verification (3 tests)
-- Ensure DESC indexes for chronological sorting
-- ============================================================================

-- Test 8.1: MJC created_at uses DESC for recent-first queries
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'mjcs'
   AND indexname = 'idx_mjc_created_at')
  LIKE '%DESC%',
  'MJC idx_mjc_created_at should use DESC for recent-first sorting'
);

-- Test 8.2: MJC date uses DESC for recent-first queries
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'mjcs'
   AND indexname = 'idx_mjc_date')
  LIKE '%DESC%',
  'MJC idx_mjc_date should use DESC for recent-first sorting'
);

-- Test 8.3: NCA created_at uses DESC for recent-first queries
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'ncas'
   AND indexname = 'idx_nca_created_at')
  LIKE '%DESC%',
  'NCA idx_nca_created_at should use DESC for recent-first sorting'
);

-- ============================================================================
-- TEST SUITE 9: Composite Index Coverage (3 tests)
-- Verify multi-column indexes for complex queries
-- ============================================================================

-- Test 9.1: MJC temporary repair index covers (close_out_due_date, status)
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'mjcs'
   AND indexname = 'idx_mjc_temporary_repair')
  LIKE '%close_out_due_date%status%',
  'MJC idx_mjc_temporary_repair should be composite index on (close_out_due_date, status)'
);

-- Test 9.2: Verify overdue temporary repair index covers close_out_due_date
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'mjcs'
   AND indexname = 'idx_mjc_overdue_temporary')
  LIKE '%close_out_due_date%',
  'MJC idx_mjc_overdue_temporary should cover close_out_due_date for date comparisons'
);

-- Test 9.3: Verify overdue index has complex WHERE clause
SELECT ok(
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename = 'mjcs'
   AND indexname = 'idx_mjc_overdue_temporary')
  LIKE '%temporary_repair%close_out_due_date%CURRENT_DATE%',
  'MJC idx_mjc_overdue_temporary should filter on temporary_repair AND overdue date'
);

-- ============================================================================
-- TEST SUITE 10: Foreign Key Index Coverage (5 tests)
-- CRITICAL: Every foreign key MUST have a supporting index for JOIN performance
-- ============================================================================

-- Test 10.1: All MJC foreign keys have indexes
SELECT results_eq(
  $$
    SELECT COUNT(DISTINCT a.attname)::INTEGER
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
      AND c.conrelid = 'mjcs'::regclass
      AND EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND a.attnum = ANY(i.indkey)
      )
  $$,
  $$
    SELECT COUNT(DISTINCT a.attname)::INTEGER
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
      AND c.conrelid = 'mjcs'::regclass
  $$,
  'All MJC foreign keys should have supporting indexes'
);

-- Test 10.2: All NCA foreign keys have indexes
SELECT results_eq(
  $$
    SELECT COUNT(DISTINCT a.attname)::INTEGER
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
      AND c.conrelid = 'ncas'::regclass
      AND EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND a.attnum = ANY(i.indkey)
      )
  $$,
  $$
    SELECT COUNT(DISTINCT a.attname)::INTEGER
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
      AND c.conrelid = 'ncas'::regclass
  $$,
  'All NCA foreign keys should have supporting indexes'
);

-- Test 10.3: Work orders foreign keys have indexes
SELECT results_eq(
  $$
    SELECT COUNT(DISTINCT a.attname)::INTEGER
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
      AND c.conrelid = 'work_orders'::regclass
      AND EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND a.attnum = ANY(i.indkey)
      )
  $$,
  $$
    SELECT COUNT(DISTINCT a.attname)::INTEGER
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'
      AND c.conrelid = 'work_orders'::regclass
  $$,
  'All work_orders foreign keys should have supporting indexes'
);

-- Test 10.4: Verify idx_mjc_wo_id exists on mjcs.wo_id foreign key
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'mjcs'::regclass
      AND a.attname = 'wo_id'
      AND c.relname = 'idx_mjc_wo_id'
  ),
  'MJC wo_id foreign key should have idx_mjc_wo_id index'
);

-- Test 10.5: Verify idx_nca_wo_id exists on ncas.wo_id foreign key
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'ncas'::regclass
      AND a.attname = 'wo_id'
      AND c.relname = 'idx_nca_wo_id'
  ),
  'NCA wo_id foreign key should have idx_nca_wo_id index'
);

SELECT * FROM finish();
ROLLBACK;
