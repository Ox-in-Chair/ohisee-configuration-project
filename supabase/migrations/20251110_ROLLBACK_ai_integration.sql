-- ROLLBACK SCRIPT: AI Integration Schema
-- WARNING: This destroys all AI interaction history and quality metrics
-- Only use in development/testing environments
-- Date: 2025-11-10

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- This script rolls back BOTH migrations:
-- 1. 20251110130000_ai_quality_coaching.sql
-- 2. 20251110120000_ai_integration.sql
--
-- Usage:
--   psql -d your_database -f 20251110_ROLLBACK_ai_integration.sql
--
-- OR via Supabase CLI:
--   supabase db reset (resets entire database)
--
-- IMPORTANT: Do NOT run in production unless absolutely necessary
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Disable RLS before dropping tables
-- =============================================================================
ALTER TABLE IF EXISTS coaching_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_effectiveness_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nca_quality_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_quality_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hazard_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_assistance_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS knowledge_base_documents DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: Drop RLS Policies (Migration 2)
-- =============================================================================
DROP POLICY IF EXISTS "Management can manage coaching alerts" ON coaching_alerts;
DROP POLICY IF EXISTS "Management can view all coaching alerts" ON coaching_alerts;
DROP POLICY IF EXISTS "Users can view own coaching alerts" ON coaching_alerts;

DROP POLICY IF EXISTS "Management can view AI metrics" ON ai_effectiveness_metrics;

DROP POLICY IF EXISTS "Users can view NCA quality scores" ON nca_quality_scores;

DROP POLICY IF EXISTS "Management can view all quality scores" ON user_quality_scores;
DROP POLICY IF EXISTS "Users can view own quality scores" ON user_quality_scores;

DROP POLICY IF EXISTS "Users can view hazard types" ON hazard_types;

-- =============================================================================
-- STEP 3: Drop Triggers (Migration 2)
-- =============================================================================
DROP TRIGGER IF EXISTS coaching_alert_number_trigger ON coaching_alerts;
DROP TRIGGER IF EXISTS coaching_alerts_updated_at ON coaching_alerts;
DROP TRIGGER IF EXISTS ai_metrics_updated_at ON ai_effectiveness_metrics;
DROP TRIGGER IF EXISTS nca_quality_updated_at ON nca_quality_scores;
DROP TRIGGER IF EXISTS user_quality_updated_at ON user_quality_scores;
DROP TRIGGER IF EXISTS hazard_types_updated_at ON hazard_types;

-- =============================================================================
-- STEP 4: Drop Functions (Migration 2)
-- =============================================================================
DROP FUNCTION IF EXISTS set_coaching_alert_number();
DROP FUNCTION IF EXISTS generate_coaching_alert_number();
DROP FUNCTION IF EXISTS calculate_user_quality_score(UUID, DATE, DATE);

-- =============================================================================
-- STEP 5: Drop Tables (Migration 2)
-- =============================================================================
DROP TABLE IF EXISTS coaching_alerts CASCADE;
DROP TABLE IF EXISTS ai_effectiveness_metrics CASCADE;
DROP TABLE IF EXISTS nca_quality_scores CASCADE;
DROP TABLE IF EXISTS user_quality_scores CASCADE;
DROP TABLE IF EXISTS hazard_types CASCADE;

-- =============================================================================
-- STEP 6: Drop RLS Policies (Migration 1)
-- =============================================================================
DROP POLICY IF EXISTS "Management can modify suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can view suppliers" ON suppliers;

DROP POLICY IF EXISTS "QA/Management can view all AI interactions" ON ai_assistance_log;
DROP POLICY IF EXISTS "Users can view own AI interactions" ON ai_assistance_log;

DROP POLICY IF EXISTS "QA/Management can view all versions" ON knowledge_base_documents;
DROP POLICY IF EXISTS "Users can view current procedures" ON knowledge_base_documents;

-- =============================================================================
-- STEP 7: Drop Views (Migration 1)
-- =============================================================================
DROP VIEW IF EXISTS nca_traceability_context CASCADE;
DROP VIEW IF EXISTS supplier_performance_summary CASCADE;

-- =============================================================================
-- STEP 8: Drop Functions (Migration 1)
-- =============================================================================
DROP FUNCTION IF EXISTS update_ai_interaction_outcome(UUID, BOOLEAN, BOOLEAN, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS log_ai_interaction(TEXT, UUID, TEXT, TEXT, UUID, TEXT, JSONB, TEXT, TEXT, JSONB, NUMERIC, INTEGER, TEXT);

-- =============================================================================
-- STEP 9: Drop Triggers (Migration 1)
-- =============================================================================
DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
DROP TRIGGER IF EXISTS kb_docs_updated_at ON knowledge_base_documents;

-- =============================================================================
-- STEP 10: Drop Indexes (Migration 1)
-- =============================================================================
-- knowledge_base_documents indexes
DROP INDEX IF EXISTS idx_kb_embedding;
DROP INDEX IF EXISTS idx_kb_effective_date;
DROP INDEX IF EXISTS idx_kb_document_type;
DROP INDEX IF EXISTS idx_kb_brcgs_section;
DROP INDEX IF EXISTS idx_kb_document_number;
DROP INDEX IF EXISTS idx_kb_status;

-- ai_assistance_log indexes
DROP INDEX IF EXISTS idx_ai_log_user_context;
DROP INDEX IF EXISTS idx_ai_log_procedures_cited;
DROP INDEX IF EXISTS idx_ai_log_accepted;
DROP INDEX IF EXISTS idx_ai_log_session;
DROP INDEX IF EXISTS idx_ai_log_field;
DROP INDEX IF EXISTS idx_ai_log_user_id;
DROP INDEX IF EXISTS idx_ai_log_timestamp;
DROP INDEX IF EXISTS idx_ai_log_entity;

-- suppliers indexes
DROP INDEX IF EXISTS idx_suppliers_risk;
DROP INDEX IF EXISTS idx_suppliers_status;
DROP INDEX IF EXISTS idx_suppliers_name;
DROP INDEX IF EXISTS idx_suppliers_code;

-- =============================================================================
-- STEP 11: Drop Tables (Migration 1)
-- =============================================================================
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS ai_assistance_log CASCADE;
DROP TABLE IF EXISTS knowledge_base_documents CASCADE;

-- =============================================================================
-- STEP 12: Drop pgvector extension (if installed only for this schema)
-- =============================================================================
-- IMPORTANT: Only uncomment if pgvector is NOT used elsewhere in database
-- DROP EXTENSION IF EXISTS vector;

-- =============================================================================
-- STEP 13: Clean up schema comments
-- =============================================================================
COMMENT ON SCHEMA public IS NULL;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- After rollback, verify tables are gone:
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'knowledge_base_documents',
      'ai_assistance_log',
      'suppliers',
      'hazard_types',
      'user_quality_scores',
      'nca_quality_scores',
      'ai_effectiveness_metrics',
      'coaching_alerts'
    );

  IF table_count > 0 THEN
    RAISE WARNING 'ROLLBACK INCOMPLETE: % AI integration tables still exist', table_count;
  ELSE
    RAISE NOTICE 'ROLLBACK COMPLETE: All AI integration tables removed';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- POST-ROLLBACK VERIFICATION
-- =============================================================================
-- Run these queries to verify clean rollback:
--
-- 1. Check for remaining tables
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name LIKE '%ai%' OR table_name LIKE '%knowledge%' OR table_name LIKE '%coaching%';
--
-- 2. Check for remaining functions
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name LIKE '%ai%' OR routine_name LIKE '%coaching%';
--
-- 3. Check for remaining views
-- SELECT table_name FROM information_schema.views
-- WHERE table_schema = 'public'
--   AND table_name LIKE '%traceability%' OR table_name LIKE '%supplier%';
--
-- Expected result: 0 rows for all queries
-- =============================================================================
