-- AI Integration Schema Verification Script
-- Run this AFTER applying both migrations to verify correctness
-- Expected: All checks pass with "PASS" status
-- Date: 2025-11-10

\set QUIET on
\set ON_ERROR_STOP on

\echo '========================================='
\echo 'AI Integration Schema Verification'
\echo 'Date: 2025-11-10'
\echo '========================================='
\echo ''

-- =============================================================================
-- SECTION 1: Table Existence Checks
-- =============================================================================
\echo '1. TABLE EXISTENCE CHECKS'
\echo '-------------------------'

DO $$
DECLARE
  table_count INTEGER;
  expected_tables TEXT[] := ARRAY[
    'knowledge_base_documents',
    'ai_assistance_log',
    'suppliers',
    'hazard_types',
    'user_quality_scores',
    'nca_quality_scores',
    'ai_effectiveness_metrics',
    'coaching_alerts'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY expected_tables
  LOOP
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND tables.table_name = table_name;

    IF table_count = 1 THEN
      RAISE NOTICE '✓ PASS: Table % exists', table_name;
    ELSE
      RAISE EXCEPTION '✗ FAIL: Table % does not exist', table_name;
    END IF;
  END LOOP;
END $$;

\echo ''

-- =============================================================================
-- SECTION 2: View Existence Checks
-- =============================================================================
\echo '2. VIEW EXISTENCE CHECKS'
\echo '------------------------'

DO $$
DECLARE
  view_count INTEGER;
  expected_views TEXT[] := ARRAY[
    'supplier_performance_summary',
    'nca_traceability_context'
  ];
  view_name TEXT;
BEGIN
  FOREACH view_name IN ARRAY expected_views
  LOOP
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = view_name;

    IF view_count = 1 THEN
      RAISE NOTICE '✓ PASS: View % exists', view_name;
    ELSE
      RAISE EXCEPTION '✗ FAIL: View % does not exist', view_name;
    END IF;
  END LOOP;
END $$;

\echo ''

-- =============================================================================
-- SECTION 3: Function Existence Checks
-- =============================================================================
\echo '3. FUNCTION EXISTENCE CHECKS'
\echo '----------------------------'

DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- log_ai_interaction()
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'log_ai_interaction';

  IF func_count >= 1 THEN
    RAISE NOTICE '✓ PASS: Function log_ai_interaction() exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Function log_ai_interaction() does not exist';
  END IF;

  -- update_ai_interaction_outcome()
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'update_ai_interaction_outcome';

  IF func_count >= 1 THEN
    RAISE NOTICE '✓ PASS: Function update_ai_interaction_outcome() exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Function update_ai_interaction_outcome() does not exist';
  END IF;

  -- calculate_user_quality_score()
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'calculate_user_quality_score';

  IF func_count >= 1 THEN
    RAISE NOTICE '✓ PASS: Function calculate_user_quality_score() exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Function calculate_user_quality_score() does not exist';
  END IF;

  -- generate_coaching_alert_number()
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'generate_coaching_alert_number';

  IF func_count >= 1 THEN
    RAISE NOTICE '✓ PASS: Function generate_coaching_alert_number() exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Function generate_coaching_alert_number() does not exist';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- SECTION 4: BRCGS CRITICAL - UNIQUE Constraint Check (Section 3.6)
-- =============================================================================
\echo '4. BRCGS SECTION 3.6 COMPLIANCE CHECK'
\echo '-------------------------------------'
\echo 'Testing UNIQUE constraint: Only ONE current version per document'
\echo ''

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Check if UNIQUE constraint exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'knowledge_base_documents'
      AND c.conname = 'kb_current_version_unique'
      AND c.contype = 'u'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✓ PASS: UNIQUE constraint kb_current_version_unique exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: UNIQUE constraint kb_current_version_unique does not exist';
  END IF;

  -- Test constraint enforcement
  BEGIN
    -- Insert first current version (should succeed)
    INSERT INTO knowledge_base_documents (
      document_number, document_name, document_type, revision, status,
      revised_date, effective_date, full_text
    ) VALUES (
      'VERIFY-001', 'Verification Test Procedure', 'procedure', 1, 'current',
      CURRENT_DATE, CURRENT_DATE, 'Test content 1'
    );

    -- Try to insert duplicate current version (should fail)
    INSERT INTO knowledge_base_documents (
      document_number, document_name, document_type, revision, status,
      revised_date, effective_date, full_text
    ) VALUES (
      'VERIFY-001', 'Verification Test Procedure Rev 2', 'procedure', 2, 'current',
      CURRENT_DATE, CURRENT_DATE, 'Test content 2'
    );

    -- If we reach here, constraint failed
    RAISE EXCEPTION '✗ FAIL: UNIQUE constraint not enforced - duplicate current version allowed';

  EXCEPTION
    WHEN unique_violation THEN
      -- This is expected behavior
      RAISE NOTICE '✓ PASS: UNIQUE constraint enforced - duplicate current version rejected';

      -- Cleanup
      DELETE FROM knowledge_base_documents WHERE document_number = 'VERIFY-001';
  END;
END $$;

\echo ''

-- =============================================================================
-- SECTION 5: Hazard Types Seed Data Check
-- =============================================================================
\echo '5. HAZARD TYPES SEED DATA CHECK'
\echo '-------------------------------'

DO $$
DECLARE
  hazard_count INTEGER;
  expected_hazards TEXT[] := ARRAY['PHY', 'CHEM', 'BIO', 'ALL', 'CROSS', 'SPEC', 'LAB', 'FMAT', 'EQP', 'PROC', 'OTH'];
  hazard_code TEXT;
  code_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO hazard_count
  FROM hazard_types
  WHERE active = true;

  IF hazard_count = 11 THEN
    RAISE NOTICE '✓ PASS: 11 hazard types seeded';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Expected 11 hazard types, found %', hazard_count;
  END IF;

  -- Verify specific hazard codes
  FOREACH hazard_code IN ARRAY expected_hazards
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM hazard_types WHERE hazard_types.hazard_code = hazard_code AND active = true
    ) INTO code_exists;

    IF code_exists THEN
      RAISE NOTICE '  ✓ Hazard type % exists', hazard_code;
    ELSE
      RAISE EXCEPTION '✗ FAIL: Hazard type % not found', hazard_code;
    END IF;
  END LOOP;
END $$;

\echo ''

-- =============================================================================
-- SECTION 6: Index Existence Checks
-- =============================================================================
\echo '6. INDEX EXISTENCE CHECKS'
\echo '-------------------------'

DO $$
DECLARE
  critical_indexes TEXT[] := ARRAY[
    'idx_kb_status',
    'idx_kb_document_number',
    'idx_kb_embedding',
    'idx_ai_log_entity',
    'idx_ai_log_timestamp',
    'idx_ai_log_procedures_cited',
    'idx_user_quality_coaching',
    'idx_coaching_overdue'
  ];
  index_name TEXT;
  index_exists BOOLEAN;
BEGIN
  FOREACH index_name IN ARRAY critical_indexes
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = index_name
    ) INTO index_exists;

    IF index_exists THEN
      RAISE NOTICE '✓ PASS: Index % exists', index_name;
    ELSE
      RAISE EXCEPTION '✗ FAIL: Index % does not exist', index_name;
    END IF;
  END LOOP;
END $$;

\echo ''

-- =============================================================================
-- SECTION 7: RLS Policy Checks
-- =============================================================================
\echo '7. RLS POLICY CHECKS'
\echo '--------------------'

DO $$
DECLARE
  tables_with_rls TEXT[] := ARRAY[
    'knowledge_base_documents',
    'ai_assistance_log',
    'suppliers',
    'hazard_types',
    'user_quality_scores',
    'nca_quality_scores',
    'ai_effectiveness_metrics',
    'coaching_alerts'
  ];
  table_name TEXT;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  FOREACH table_name IN ARRAY tables_with_rls
  LOOP
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name;

    IF rls_enabled THEN
      RAISE NOTICE '✓ PASS: RLS enabled on %', table_name;
    ELSE
      RAISE EXCEPTION '✗ FAIL: RLS not enabled on %', table_name;
    END IF;

    -- Check if policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_name;

    IF policy_count > 0 THEN
      RAISE NOTICE '  ✓ % policies exist for %', policy_count, table_name;
    ELSE
      RAISE EXCEPTION '✗ FAIL: No policies found for %', table_name;
    END IF;
  END LOOP;
END $$;

\echo ''

-- =============================================================================
-- SECTION 8: Generated Column Checks
-- =============================================================================
\echo '8. GENERATED COLUMN CHECKS'
\echo '--------------------------'

DO $$
DECLARE
  gen_count INTEGER;
BEGIN
  -- Check user_quality_scores.ai_acceptance_rate
  SELECT COUNT(*) INTO gen_count
  FROM information_schema.columns
  WHERE table_name = 'user_quality_scores'
    AND column_name = 'ai_acceptance_rate'
    AND is_generated = 'ALWAYS';

  IF gen_count = 1 THEN
    RAISE NOTICE '✓ PASS: user_quality_scores.ai_acceptance_rate is generated column';
  ELSE
    RAISE EXCEPTION '✗ FAIL: user_quality_scores.ai_acceptance_rate is not generated';
  END IF;

  -- Check nca_quality_scores.overall_nca_score
  SELECT COUNT(*) INTO gen_count
  FROM information_schema.columns
  WHERE table_name = 'nca_quality_scores'
    AND column_name = 'overall_nca_score'
    AND is_generated = 'ALWAYS';

  IF gen_count = 1 THEN
    RAISE NOTICE '✓ PASS: nca_quality_scores.overall_nca_score is generated column';
  ELSE
    RAISE EXCEPTION '✗ FAIL: nca_quality_scores.overall_nca_score is not generated';
  END IF;

  -- Check coaching_alerts.alert_priority
  SELECT COUNT(*) INTO gen_count
  FROM information_schema.columns
  WHERE table_name = 'coaching_alerts'
    AND column_name = 'alert_priority'
    AND is_generated = 'ALWAYS';

  IF gen_count = 1 THEN
    RAISE NOTICE '✓ PASS: coaching_alerts.alert_priority is generated column';
  ELSE
    RAISE EXCEPTION '✗ FAIL: coaching_alerts.alert_priority is not generated';
  END IF;

  -- Check coaching_alerts.overdue
  SELECT COUNT(*) INTO gen_count
  FROM information_schema.columns
  WHERE table_name = 'coaching_alerts'
    AND column_name = 'overdue'
    AND is_generated = 'ALWAYS';

  IF gen_count = 1 THEN
    RAISE NOTICE '✓ PASS: coaching_alerts.overdue is generated column';
  ELSE
    RAISE EXCEPTION '✗ FAIL: coaching_alerts.overdue is not generated';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- SECTION 9: Trigger Checks
-- =============================================================================
\echo '9. TRIGGER CHECKS'
\echo '-----------------'

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  -- Check coaching_alert_number_trigger
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'coaching_alert_number_trigger'
    AND event_object_table = 'coaching_alerts';

  IF trigger_count = 1 THEN
    RAISE NOTICE '✓ PASS: coaching_alert_number_trigger exists';
  ELSE
    RAISE EXCEPTION '✗ FAIL: coaching_alert_number_trigger does not exist';
  END IF;

  -- Check updated_at triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE '%_updated_at'
    AND event_manipulation = 'UPDATE';

  IF trigger_count >= 5 THEN
    RAISE NOTICE '✓ PASS: % updated_at triggers exist', trigger_count;
  ELSE
    RAISE EXCEPTION '✗ FAIL: Expected at least 5 updated_at triggers, found %', trigger_count;
  END IF;
END $$;

\echo ''

-- =============================================================================
-- SECTION 10: Check Constraint Validation
-- =============================================================================
\echo '10. CHECK CONSTRAINT VALIDATION'
\echo '-------------------------------'

DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Verify status CHECK constraint on knowledge_base_documents
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'knowledge_base_documents'
    AND c.contype = 'c'
    AND c.conname LIKE '%status%';

  IF constraint_count >= 1 THEN
    RAISE NOTICE '✓ PASS: status CHECK constraint exists on knowledge_base_documents';
  ELSE
    RAISE EXCEPTION '✗ FAIL: status CHECK constraint missing on knowledge_base_documents';
  END IF;

  -- Verify alert_tier CHECK constraint on coaching_alerts
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'coaching_alerts'
    AND c.contype = 'c'
    AND c.conname LIKE '%alert_tier%';

  IF constraint_count >= 1 THEN
    RAISE NOTICE '✓ PASS: alert_tier CHECK constraint exists on coaching_alerts';
  ELSE
    RAISE EXCEPTION '✗ FAIL: alert_tier CHECK constraint missing on coaching_alerts';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- SECTION 11: JSONB Column Validation
-- =============================================================================
\echo '11. JSONB COLUMN VALIDATION'
\echo '---------------------------'

DO $$
DECLARE
  jsonb_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO jsonb_count
  FROM information_schema.columns
  WHERE table_name = 'ai_assistance_log'
    AND data_type = 'jsonb'
    AND column_name IN ('procedures_cited', 'user_input_context');

  IF jsonb_count = 2 THEN
    RAISE NOTICE '✓ PASS: ai_assistance_log has 2 JSONB columns';
  ELSE
    RAISE EXCEPTION '✗ FAIL: Expected 2 JSONB columns in ai_assistance_log, found %', jsonb_count;
  END IF;
END $$;

\echo ''

-- =============================================================================
-- SECTION 12: Vector Extension Check
-- =============================================================================
\echo '12. VECTOR EXTENSION CHECK'
\echo '--------------------------'

DO $$
DECLARE
  vector_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO vector_exists;

  IF vector_exists THEN
    RAISE NOTICE '✓ PASS: pgvector extension installed';
  ELSE
    RAISE WARNING '⚠ WARNING: pgvector extension not installed (required for embeddings)';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
\echo '========================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================='
\echo ''
\echo 'All checks passed! AI Integration schema is ready for use.'
\echo ''
\echo 'Next steps:'
\echo '1. Upload BRCGS procedures (5.7, 5.7F1) to knowledge_base_documents'
\echo '2. Run pgTAP tests: supabase test db'
\echo '3. Integration testing with application'
\echo '4. Performance validation (response time < 3s)'
\echo ''
\echo 'For detailed deployment instructions, see:'
\echo '  DEPLOYMENT_CHECKLIST_AI_INTEGRATION.md'
\echo ''
