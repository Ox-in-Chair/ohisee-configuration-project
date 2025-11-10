-- OHiSee NCA/MJC System - RAG Search Functions
-- Purpose: Enable semantic search for procedures and similar cases
-- Date: 2025-11-10
-- Dependencies: pgvector extension, knowledge_base_documents table

-- =============================================================================
-- FUNCTION: search_procedures
-- Purpose: Vector similarity search over BRCGS procedures
-- Used by: KnowledgeBaseService.searchProcedures()
-- =============================================================================
CREATE OR REPLACE FUNCTION search_procedures(
  query_embedding vector(1536),
  match_limit integer DEFAULT 5,
  match_threshold real DEFAULT 0.5
)
RETURNS TABLE (
  procedure_number text,
  content text,
  similarity real
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.document_number as procedure_number,
    kb.full_text as content,
    (1 - (kb.embedding_vector <=> query_embedding))::real as similarity
  FROM knowledge_base_documents kb
  WHERE
    kb.status = 'current' -- Only search current procedures
    AND kb.embedding_vector IS NOT NULL
    AND (1 - (kb.embedding_vector <=> query_embedding)) > match_threshold
  ORDER BY kb.embedding_vector <=> query_embedding
  LIMIT match_limit;
END;
$$;

COMMENT ON FUNCTION search_procedures IS
  'RAG function: Semantic search over current BRCGS procedures using vector embeddings';

-- =============================================================================
-- FUNCTION: search_similar_cases
-- Purpose: Vector similarity search over historical NCA/MJC records
-- Used by: KnowledgeBaseService.findSimilarCases()
-- =============================================================================
CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding vector(1536),
  case_type text,
  match_limit integer DEFAULT 3,
  match_threshold real DEFAULT 0.6,
  min_quality_score integer DEFAULT 75
)
RETURNS TABLE (
  id uuid,
  description text,
  corrective_action text,
  similarity real
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF case_type = 'nca' THEN
    -- Search NCAs
    RETURN QUERY
    SELECT
      n.id,
      n.nc_description as description,
      n.corrective_action,
      (1 - (n.embedding_vector <=> query_embedding))::real as similarity
    FROM ncas n
    LEFT JOIN nca_quality_scores nqs ON n.id = nqs.nca_id
    WHERE
      n.status = 'closed' -- Only learn from closed cases
      AND n.embedding_vector IS NOT NULL
      AND (1 - (n.embedding_vector <=> query_embedding)) > match_threshold
      AND COALESCE(nqs.total_score, 100) >= min_quality_score -- High quality only
    ORDER BY n.embedding_vector <=> query_embedding
    LIMIT match_limit;
  ELSIF case_type = 'mjc' THEN
    -- Search MJCs
    RETURN QUERY
    SELECT
      m.id,
      m.description_required as description,
      m.corrective_action,
      (1 - (m.embedding_vector <=> query_embedding))::real as similarity
    FROM mjcs m
    LEFT JOIN mjc_quality_scores mqs ON m.id = mqs.mjc_id
    WHERE
      m.status = 'closed' -- Only learn from closed cases
      AND m.embedding_vector IS NOT NULL
      AND (1 - (m.embedding_vector <=> query_embedding)) > match_threshold
      AND COALESCE(mqs.total_score, 100) >= min_quality_score -- High quality only
    ORDER BY m.embedding_vector <=> query_embedding
    LIMIT match_limit;
  ELSE
    RAISE EXCEPTION 'Invalid case_type: must be nca or mjc';
  END IF;
END;
$$;

COMMENT ON FUNCTION search_similar_cases IS
  'RAG function: Semantic search over historical NCA/MJC records for similar cases (closed, high-quality only)';

-- =============================================================================
-- ALTER TABLES: Add embedding_vector columns if not exists
-- =============================================================================

-- Add embedding_vector to ncas table (for search_similar_cases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='ncas' AND column_name='embedding_vector'
  ) THEN
    ALTER TABLE ncas ADD COLUMN embedding_vector vector(1536);
    CREATE INDEX idx_ncas_embedding ON ncas USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
    COMMENT ON COLUMN ncas.embedding_vector IS 'Vector embedding of nc_description for semantic search (1536 dimensions for OpenAI ada-002)';
  END IF;
END $$;

-- Add embedding_vector to mjcs table (for search_similar_cases)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='mjcs' AND column_name='embedding_vector'
  ) THEN
    ALTER TABLE mjcs ADD COLUMN embedding_vector vector(1536);
    CREATE INDEX idx_mjcs_embedding ON mjcs USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
    COMMENT ON COLUMN mjcs.embedding_vector IS 'Vector embedding of description_required for semantic search (1536 dimensions for OpenAI ada-002)';
  END IF;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS: Allow service role to execute functions
-- =============================================================================
GRANT EXECUTE ON FUNCTION search_procedures TO service_role;
GRANT EXECUTE ON FUNCTION search_procedures TO authenticated;

GRANT EXECUTE ON FUNCTION search_similar_cases TO service_role;
GRANT EXECUTE ON FUNCTION search_similar_cases TO authenticated;

-- =============================================================================
-- TEST QUERIES: Verify functions work (uncomment to test manually)
-- =============================================================================

-- Test search_procedures with zero vector (should return results if embeddings exist)
-- SELECT * FROM search_procedures(
--   query_embedding := array_fill(0::real, ARRAY[1536])::vector(1536),
--   match_limit := 3,
--   match_threshold := 0.0
-- );

-- Test search_similar_cases
-- SELECT * FROM search_similar_cases(
--   query_embedding := array_fill(0::real, ARRAY[1536])::vector(1536),
--   case_type := 'nca',
--   match_limit := 3,
--   match_threshold := 0.0,
--   min_quality_score := 75
-- );

-- =============================================================================
-- COMPLETION LOG
-- =============================================================================
COMMENT ON FUNCTION search_procedures IS
  'RAG Search Functions Deployed: 2025-11-10 - Enables semantic search for procedures and similar cases using pgvector';
