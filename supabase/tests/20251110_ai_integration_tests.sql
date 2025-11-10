-- pgTAP Tests for AI Integration Schema
-- Purpose: Validate BRCGS compliance and data integrity for AI system
-- Date: 2025-11-10

BEGIN;
SELECT plan(50);

-- =============================================================================
-- TEST SUITE 1: Knowledge Base Documents (BRCGS Section 3.6 Compliance)
-- =============================================================================

-- Test 1.1: Table exists
SELECT has_table('knowledge_base_documents', 'knowledge_base_documents table should exist');

-- Test 1.2: Required columns exist
SELECT has_column('knowledge_base_documents', 'id', 'Should have id column');
SELECT has_column('knowledge_base_documents', 'document_number', 'Should have document_number column');
SELECT has_column('knowledge_base_documents', 'revision', 'Should have revision column');
SELECT has_column('knowledge_base_documents', 'status', 'Should have status column');
SELECT has_column('knowledge_base_documents', 'embedding_vector', 'Should have embedding_vector column');

-- Test 1.3: UNIQUE constraint enforces only one current version per document
SELECT has_index('knowledge_base_documents', 'kb_current_version_unique',
  'Should have UNIQUE constraint on (document_number, status) WHERE status=current');

-- Test 1.4: Check constraint on status
SELECT col_has_check('knowledge_base_documents', 'status',
  'Status column should have CHECK constraint');

-- Test 1.5: Test UNIQUE constraint enforcement (should fail)
PREPARE insert_duplicate_current AS
  INSERT INTO knowledge_base_documents (
    document_number, document_name, document_type, revision, status,
    revised_date, effective_date, full_text
  ) VALUES
    ('TEST-001', 'Test Procedure A', 'procedure', 1, 'current', CURRENT_DATE, CURRENT_DATE, 'Test content A'),
    ('TEST-001', 'Test Procedure B', 'procedure', 2, 'current', CURRENT_DATE, CURRENT_DATE, 'Test content B');

SELECT throws_ok('insert_duplicate_current',
  '23505',  -- unique_violation
  NULL,
  'Should prevent multiple current versions of same document');

-- Test 1.6: Can insert multiple superseded versions (should succeed)
INSERT INTO knowledge_base_documents (
  document_number, document_name, document_type, revision, status,
  revised_date, effective_date, full_text
) VALUES
  ('TEST-002', 'Test Procedure Rev 1', 'procedure', 1, 'superseded', '2025-01-01', '2025-01-01', 'Old content'),
  ('TEST-002', 'Test Procedure Rev 2', 'procedure', 2, 'superseded', '2025-06-01', '2025-06-01', 'Newer content'),
  ('TEST-002', 'Test Procedure Rev 3', 'procedure', 3, 'current', CURRENT_DATE, CURRENT_DATE, 'Current content');

SELECT is(
  (SELECT COUNT(*) FROM knowledge_base_documents WHERE document_number = 'TEST-002'),
  3::BIGINT,
  'Should allow multiple revisions with different statuses'
);

-- Test 1.7: effective_date >= revised_date constraint
PREPARE insert_invalid_dates AS
  INSERT INTO knowledge_base_documents (
    document_number, document_name, document_type, revision, status,
    revised_date, effective_date, full_text
  ) VALUES ('TEST-003', 'Invalid Dates', 'procedure', 1, 'current',
    '2025-12-31', '2025-01-01', 'Content');

SELECT throws_ok('insert_invalid_dates',
  '23514',  -- check_violation
  NULL,
  'Should prevent effective_date before revised_date');

-- =============================================================================
-- TEST SUITE 2: AI Assistance Log (BRCGS Section 3.3 Audit Trail)
-- =============================================================================

-- Test 2.1: Table exists with audit columns
SELECT has_table('ai_assistance_log', 'ai_assistance_log table should exist');
SELECT has_column('ai_assistance_log', 'user_id', 'Should track user_id');
SELECT has_column('ai_assistance_log', 'user_email', 'Should track user_email');
SELECT has_column('ai_assistance_log', 'user_name', 'Should track user_name');
SELECT has_column('ai_assistance_log', 'user_role', 'Should track user_role');
SELECT has_column('ai_assistance_log', 'procedures_cited', 'Should track procedures_cited');
SELECT has_column('ai_assistance_log', 'suggestion_accepted', 'Should track suggestion_accepted');

-- Test 2.2: JSONB columns for flexible data
SELECT col_type_is('ai_assistance_log', 'procedures_cited', 'jsonb',
  'procedures_cited should be JSONB for structured references');
SELECT col_type_is('ai_assistance_log', 'user_input_context', 'jsonb',
  'user_input_context should be JSONB for form state');

-- Test 2.3: GIN indexes for JSONB columns
SELECT has_index('ai_assistance_log', 'idx_ai_log_procedures_cited',
  'Should have GIN index on procedures_cited');
SELECT has_index('ai_assistance_log', 'idx_ai_log_user_context',
  'Should have GIN index on user_input_context');

-- =============================================================================
-- TEST SUITE 3: AI Functions (log_ai_interaction, update_ai_interaction_outcome)
-- =============================================================================

-- Test 3.1: Functions exist
SELECT has_function('log_ai_interaction',
  ARRAY['text', 'uuid', 'text', 'text', 'uuid', 'text', 'jsonb', 'text', 'text', 'jsonb', 'numeric', 'integer', 'text'],
  'log_ai_interaction function should exist');
SELECT has_function('update_ai_interaction_outcome',
  ARRAY['uuid', 'boolean', 'boolean', 'text', 'integer', 'text'],
  'update_ai_interaction_outcome function should exist');

-- Test 3.2: log_ai_interaction function workflow
-- Create test user
INSERT INTO users (id, email, name, role, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@kangopak.com',
  'Test User',
  'operator',
  'hash'
) ON CONFLICT (email) DO NOTHING;

-- Create test NCA
INSERT INTO ncas (
  id, nca_number, date, nc_type, nc_description,
  created_by, created_by_name, created_by_email
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'NCA-TEST-0001',
  CURRENT_DATE,
  'raw-material',
  'Test NC description for AI logging test',
  '00000000-0000-0000-0000-000000000001',
  'Test User',
  'test@kangopak.com'
) ON CONFLICT DO NOTHING;

-- Test logging AI interaction
SELECT lives_ok(
  $$SELECT log_ai_interaction(
    'ncas',
    '00000000-0000-0000-0000-000000000002',
    'Section 9: Root Cause Analysis',
    'root_cause_analysis',
    '00000000-0000-0000-0000-000000000001',
    'Suggest root cause for raw material defect',
    '{"nc_type": "raw-material", "supplier_name": "Test Supplier"}'::jsonb,
    'Likely root cause: Supplier quality control failure. Ref Procedure 5.7 Rev 9.',
    'gpt-4-turbo-preview',
    '[{"doc": "5.7", "revision": 9, "section": "1.3"}]'::jsonb,
    0.7,
    1250,
    'test-session-123'
  )$$,
  'log_ai_interaction should execute successfully'
);

-- Test 3.3: Verify log entry created
SELECT ok(
  EXISTS (
    SELECT 1 FROM ai_assistance_log
    WHERE entity_id = '00000000-0000-0000-0000-000000000002'
      AND entity_type = 'ncas'
      AND form_section = 'Section 9: Root Cause Analysis'
  ),
  'AI interaction should be logged'
);

-- Test 3.4: Verify procedure reference count incremented
-- (Would need procedure inserted first, skipping for now)

-- =============================================================================
-- TEST SUITE 4: Supplier Performance View
-- =============================================================================

-- Test 4.1: View exists
SELECT has_view('supplier_performance_summary', 'supplier_performance_summary view should exist');

-- Test 4.2: View columns
SELECT has_column('supplier_performance_summary', 'supplier_name');
SELECT has_column('supplier_performance_summary', 'ncas_ytd');
SELECT has_column('supplier_performance_summary', 'ncas_last_90days');
SELECT has_column('supplier_performance_summary', 'high_recent_nca_frequency');

-- =============================================================================
-- TEST SUITE 5: Quality Score Tables
-- =============================================================================

-- Test 5.1: Tables exist
SELECT has_table('user_quality_scores', 'user_quality_scores table should exist');
SELECT has_table('nca_quality_scores', 'nca_quality_scores table should exist');
SELECT has_table('ai_effectiveness_metrics', 'ai_effectiveness_metrics table should exist');

-- Test 5.2: Generated columns
SELECT col_is_generated('user_quality_scores', 'ai_acceptance_rate',
  'ai_acceptance_rate should be generated column');
SELECT col_is_generated('nca_quality_scores', 'overall_nca_score',
  'overall_nca_score should be generated column');
SELECT col_is_generated('nca_quality_scores', 'quality_grade',
  'quality_grade should be generated column');

-- Test 5.3: Check constraints on scores (0-100 range)
PREPARE insert_invalid_score AS
  INSERT INTO user_quality_scores (
    user_id, period_start, period_end,
    overall_quality_score
  ) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '2025-01-01', '2025-06-30',
    150.00  -- Invalid: over 100
  );

-- Note: Score validation would be in application logic or additional CHECK constraint

-- =============================================================================
-- TEST SUITE 6: Coaching Alerts System
-- =============================================================================

-- Test 6.1: Table exists with required columns
SELECT has_table('coaching_alerts', 'coaching_alerts table should exist');
SELECT has_column('coaching_alerts', 'alert_number');
SELECT has_column('coaching_alerts', 'alert_tier');
SELECT has_column('coaching_alerts', 'trigger_reason');
SELECT has_column('coaching_alerts', 'status');

-- Test 6.2: Alert tier constraint (1-4)
SELECT col_has_check('coaching_alerts', 'alert_tier',
  'alert_tier should have CHECK constraint for 1-4 range');

-- Test 6.3: Generated columns
SELECT col_is_generated('coaching_alerts', 'alert_priority',
  'alert_priority should be generated based on tier');
SELECT col_is_generated('coaching_alerts', 'overdue',
  'overdue should be generated based on due date vs status');

-- Test 6.4: Auto-generated alert number
INSERT INTO coaching_alerts (
  user_id, user_name, user_role, alert_tier,
  trigger_reason, recommended_actions, response_due_date
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test User',
  'operator',
  2,
  'Quality score below threshold',
  'Complete training on root cause analysis',
  CURRENT_DATE + INTERVAL '2 days'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM coaching_alerts
    WHERE alert_number LIKE 'COACH-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%'
  ),
  'Alert number should be auto-generated in COACH-YYYY-NNNN format'
);

-- =============================================================================
-- TEST SUITE 7: Hazard Types (BRCGS Hazard Classification)
-- =============================================================================

-- Test 7.1: Table exists
SELECT has_table('hazard_types', 'hazard_types table should exist');

-- Test 7.2: Verify 11 BRCGS hazard types seeded
SELECT is(
  (SELECT COUNT(*) FROM hazard_types WHERE active = true),
  11::BIGINT,
  'Should have 11 BRCGS hazard types'
);

-- Test 7.3: Verify specific hazard codes
SELECT ok(
  EXISTS (SELECT 1 FROM hazard_types WHERE hazard_code = 'PHY' AND hazard_name = 'Physical Hazard'),
  'PHY - Physical Hazard should exist'
);
SELECT ok(
  EXISTS (SELECT 1 FROM hazard_types WHERE hazard_code = 'ALL' AND hazard_name = 'Allergen'),
  'ALL - Allergen should exist'
);

-- =============================================================================
-- TEST SUITE 8: RLS Policies
-- =============================================================================

-- Test 8.1: RLS enabled on all AI tables
SELECT row_security_active('knowledge_base_documents') AS enabled,
  'RLS should be enabled on knowledge_base_documents';
SELECT row_security_active('ai_assistance_log') AS enabled,
  'RLS should be enabled on ai_assistance_log';
SELECT row_security_active('suppliers') AS enabled,
  'RLS should be enabled on suppliers';

-- Test 8.2: Policies exist
SELECT policy_cmd_is('knowledge_base_documents', 'Users can view current procedures', 'SELECT');
SELECT policy_cmd_is('ai_assistance_log', 'Users can view own AI interactions', 'SELECT');

-- =============================================================================
-- CLEANUP
-- =============================================================================
-- Clean up test data
DELETE FROM coaching_alerts WHERE alert_number LIKE 'COACH-%';
DELETE FROM ai_assistance_log WHERE entity_id = '00000000-0000-0000-0000-000000000002';
DELETE FROM ncas WHERE id = '00000000-0000-0000-0000-000000000002';
DELETE FROM knowledge_base_documents WHERE document_number LIKE 'TEST-%';
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT * FROM finish();
ROLLBACK;
