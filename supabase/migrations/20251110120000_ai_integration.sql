-- OHiSee NCA/MJC System - AI Integration Schema
-- Purpose: Enable AI-assisted form completion with BRCGS Section 3 compliance
-- Date: 2025-11-10
-- BRCGS: Section 3.6 Document Control, Section 3.3 Audit Trail

-- =============================================================================
-- EXTENSION: pgvector for embeddings (if using semantic search)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- TABLE: knowledge_base_documents
-- Purpose: Track all procedure documents in AI knowledge base
-- BRCGS: Section 3.6 Document Control - Only one current version per document
-- =============================================================================
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Document Identification (aligned with Master List 3.6F1)
  document_number TEXT NOT NULL,  -- e.g., "5.7", "3.9", "5.7F1"
  document_name TEXT NOT NULL,    -- e.g., "Control of Non-Conforming Product"
  document_type TEXT NOT NULL CHECK (document_type IN (
    'procedure',
    'form_template',
    'work_instruction',
    'policy',
    'training',
    'record'
  )),

  -- Version Control (BRCGS CRITICAL)
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'current',      -- Active, AI should reference
    'superseded',   -- Old version, AI should NOT reference
    'draft',        -- Under development, AI should NOT reference
    'obsolete'      -- Withdrawn, AI should NOT reference
  )),
  revised_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  review_due_date DATE,

  -- BRCGS Section Reference
  brcgs_section TEXT,  -- e.g., "3.6", "3.9", "5.7"
  brcgs_standard TEXT DEFAULT 'BRCGS Packaging Issue 7',

  -- Document Content (for AI embedding)
  full_text TEXT NOT NULL,
  summary TEXT,
  key_requirements JSONB,  -- Structured key points for AI retrieval

  -- Integration Context
  integration_points TEXT[],  -- Related procedures ["3.3", "3.9", "3.10"]
  form_sections TEXT[],       -- Relevant form sections ["Section 3", "Section 8"]

  -- AI Usage Metadata
  embedding_vector VECTOR(1536),  -- OpenAI ada-002 or similar (1536 dimensions)
  chunk_strategy TEXT CHECK (chunk_strategy IN ('full', 'section', 'paragraph')),
  search_keywords TEXT[],

  -- Audit Trail
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_ai_reference TIMESTAMPTZ,  -- Track when AI last cited this document
  reference_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints (BRCGS CRITICAL: Only ONE current version)
  CONSTRAINT kb_current_version_unique UNIQUE (document_number, status)
    WHERE status = 'current',
  CONSTRAINT kb_effective_after_revised CHECK (effective_date >= revised_date)
);

-- =============================================================================
-- INDEXES: Optimized for AI retrieval and compliance queries
-- =============================================================================
CREATE INDEX idx_kb_status ON knowledge_base_documents(status)
  WHERE status = 'current';
CREATE INDEX idx_kb_document_number ON knowledge_base_documents(document_number);
CREATE INDEX idx_kb_brcgs_section ON knowledge_base_documents(brcgs_section);
CREATE INDEX idx_kb_document_type ON knowledge_base_documents(document_type);
CREATE INDEX idx_kb_effective_date ON knowledge_base_documents(effective_date DESC);

-- Vector similarity search index (requires pgvector extension)
CREATE INDEX idx_kb_embedding ON knowledge_base_documents
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE knowledge_base_documents IS
  'BRCGS Section 3.6 compliant document registry for AI knowledge base';
COMMENT ON COLUMN knowledge_base_documents.status IS
  'AI must ONLY reference documents with status=current';
COMMENT ON COLUMN knowledge_base_documents.embedding_vector IS
  'Vector embeddings for semantic search (RAG architecture), 1536 dimensions for OpenAI ada-002';
COMMENT ON CONSTRAINT kb_current_version_unique ON knowledge_base_documents IS
  'BRCGS Section 3.6: Ensures only ONE current version per document number';

-- =============================================================================
-- TABLE: ai_assistance_log
-- Purpose: Audit trail for all AI interactions with NCA/MJC forms
-- BRCGS: Section 3.3 compliance - track AI suggestions and user decisions
-- =============================================================================
CREATE TABLE ai_assistance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What triggered AI assistance
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ncas', 'mjcs')),
  entity_id UUID NOT NULL,  -- NCA or MJC id
  form_section TEXT NOT NULL,  -- e.g., "Section 4: NC Description", "Section 9: Root Cause"
  field_name TEXT,             -- Specific field if applicable (e.g., "nc_description", "root_cause_analysis")

  -- User Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- AI Interaction Details
  user_prompt TEXT NOT NULL,              -- What user asked / context sent to AI
  user_input_context JSONB,               -- Current form state snapshot
  ai_response TEXT NOT NULL,              -- AI suggestion/guidance provided
  ai_model TEXT NOT NULL,                 -- e.g., "gpt-4-turbo-preview", "claude-sonnet-4"
  ai_temperature NUMERIC(3,2),            -- Model temperature for reproducibility

  -- Procedure References (BRCGS CRITICAL)
  procedures_cited JSONB NOT NULL,        -- [{"doc": "5.7", "revision": 9, "section": "1.3", "text": "..."}]
  procedures_version_refs JSONB,          -- Full version metadata for audit

  -- User Decision
  suggestion_accepted BOOLEAN,            -- Did user accept suggestion?
  suggestion_modified BOOLEAN,            -- Did user modify before accepting?
  final_user_value TEXT,                  -- What user actually entered

  -- Quality Metrics
  suggestion_quality_rating INTEGER CHECK (suggestion_quality_rating BETWEEN 1 AND 5),
  user_feedback TEXT,

  -- Timing
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  response_time_ms INTEGER,  -- AI latency tracking

  -- System Context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL

  -- No foreign key constraint on entity_id to avoid circular dependency
  -- Validation done in application layer
);

-- =============================================================================
-- INDEXES: Performance optimization for AI audit queries
-- =============================================================================
CREATE INDEX idx_ai_log_entity ON ai_assistance_log(entity_type, entity_id);
CREATE INDEX idx_ai_log_timestamp ON ai_assistance_log(timestamp DESC);
CREATE INDEX idx_ai_log_user_id ON ai_assistance_log(user_id);
CREATE INDEX idx_ai_log_field ON ai_assistance_log(field_name);
CREATE INDEX idx_ai_log_session ON ai_assistance_log(session_id);
CREATE INDEX idx_ai_log_accepted ON ai_assistance_log(suggestion_accepted)
  WHERE suggestion_accepted IS NOT NULL;

-- GIN index for procedure citation searches
CREATE INDEX idx_ai_log_procedures_cited ON ai_assistance_log
  USING GIN (procedures_cited);
CREATE INDEX idx_ai_log_user_context ON ai_assistance_log
  USING GIN (user_input_context);

COMMENT ON TABLE ai_assistance_log IS
  'BRCGS-compliant immutable audit log for AI assistance interactions';
COMMENT ON COLUMN ai_assistance_log.procedures_cited IS
  'JSONB array of procedures cited by AI with version tracking for audit trail';
COMMENT ON COLUMN ai_assistance_log.suggestion_accepted IS
  'User decision tracking - NULL until user makes decision';

-- =============================================================================
-- TABLE: suppliers (if not exists)
-- Purpose: Approved Supplier List with performance tracking
-- BRCGS: Section 3.4 Supplier Approval and Management
-- =============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Supplier Identification
  supplier_code TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_type TEXT NOT NULL CHECK (supplier_type IN (
    'raw-material',
    'packaging-material',
    'service-provider'
  )),

  -- Approval Status
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'approved',
    'conditional',  -- Approved with restrictions
    'suspended',    -- Temporarily suspended
    'rejected'
  )),
  approved_date DATE,
  approval_valid_until DATE,

  -- Contact Information
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,

  -- Performance Metrics (auto-calculated from NCAs, deliveries)
  nca_count_ytd INTEGER DEFAULT 0,
  nca_count_last_12mo INTEGER DEFAULT 0,
  on_time_delivery_pct NUMERIC(5,2),  -- Percentage 0.00-100.00
  quality_rating NUMERIC(3,2) CHECK (quality_rating BETWEEN 1.0 AND 5.0),

  -- Risk Assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  last_audit_date DATE,
  next_audit_due DATE,

  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT supplier_approved_requires_date CHECK (
    approval_status != 'approved' OR approved_date IS NOT NULL
  )
);

CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX idx_suppliers_status ON suppliers(approval_status)
  WHERE approval_status = 'approved';
CREATE INDEX idx_suppliers_risk ON suppliers(risk_level)
  WHERE risk_level IN ('high', 'critical');

COMMENT ON TABLE suppliers IS 'BRCGS Section 3.4: Approved Supplier List with performance tracking';
COMMENT ON COLUMN suppliers.approval_status IS 'Only approved suppliers should be used per BRCGS Section 3.4';

-- =============================================================================
-- TRIGGER: Auto-update updated_at for new tables
-- =============================================================================
CREATE TRIGGER kb_docs_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCTION: log_ai_interaction()
-- Purpose: Log every AI assistance event (called from application)
-- BRCGS: Section 3.3 - Complete audit trail for AI interactions
-- =============================================================================
CREATE OR REPLACE FUNCTION log_ai_interaction(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_form_section TEXT,
  p_field_name TEXT,
  p_user_id UUID,
  p_user_prompt TEXT,
  p_user_input_context JSONB,
  p_ai_response TEXT,
  p_ai_model TEXT,
  p_procedures_cited JSONB,
  p_ai_temperature NUMERIC DEFAULT 0.7,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  current_user_record RECORD;
BEGIN
  -- Get user details
  SELECT email, name, role INTO current_user_record
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert AI interaction log
  INSERT INTO ai_assistance_log (
    entity_type,
    entity_id,
    form_section,
    field_name,
    user_id,
    user_email,
    user_name,
    user_role,
    user_prompt,
    user_input_context,
    ai_response,
    ai_model,
    ai_temperature,
    procedures_cited,
    response_time_ms,
    ip_address,
    session_id
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_form_section,
    p_field_name,
    p_user_id,
    current_user_record.email,
    current_user_record.name,
    current_user_record.role,
    p_user_prompt,
    p_user_input_context,
    p_ai_response,
    p_ai_model,
    p_ai_temperature,
    p_procedures_cited,
    p_response_time_ms,
    inet_client_addr(),
    COALESCE(p_session_id, gen_random_uuid()::TEXT)
  )
  RETURNING id INTO log_id;

  -- Update procedure reference count
  UPDATE knowledge_base_documents
  SET
    reference_count = reference_count + 1,
    last_ai_reference = NOW()
  WHERE document_number IN (
    SELECT jsonb_array_elements(p_procedures_cited)->>'doc'
  );

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_ai_interaction IS
  'BRCGS CRITICAL: Logs all AI assistance interactions for Section 3.3 audit trail';

-- =============================================================================
-- FUNCTION: update_ai_interaction_outcome()
-- Purpose: Record user's decision on AI suggestion (accept/reject/modify)
-- BRCGS: Section 3.3 - Track effectiveness of AI suggestions
-- =============================================================================
CREATE OR REPLACE FUNCTION update_ai_interaction_outcome(
  p_log_id UUID,
  p_suggestion_accepted BOOLEAN,
  p_suggestion_modified BOOLEAN,
  p_final_user_value TEXT,
  p_quality_rating INTEGER DEFAULT NULL,
  p_user_feedback TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_assistance_log
  SET
    suggestion_accepted = p_suggestion_accepted,
    suggestion_modified = p_suggestion_modified,
    final_user_value = p_final_user_value,
    suggestion_quality_rating = p_quality_rating,
    user_feedback = p_user_feedback
  WHERE id = p_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AI log entry not found: %', p_log_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_ai_interaction_outcome IS
  'Records user decision on AI suggestion for effectiveness tracking';

-- =============================================================================
-- VIEW: supplier_performance_summary
-- Purpose: Real-time supplier performance for AI context
-- BRCGS: Section 3.4 - Supplier performance monitoring
-- =============================================================================
CREATE OR REPLACE VIEW supplier_performance_summary AS
SELECT
  s.id,
  s.supplier_code,
  s.supplier_name,
  s.approval_status,
  s.risk_level,

  -- NCA counts
  COUNT(DISTINCT n.id) FILTER (
    WHERE n.date >= DATE_TRUNC('year', NOW())
  ) as ncas_ytd,

  COUNT(DISTINCT n.id) FILTER (
    WHERE n.date >= NOW() - INTERVAL '12 months'
  ) as ncas_last_12mo,

  COUNT(DISTINCT n.id) FILTER (
    WHERE n.date >= NOW() - INTERVAL '90 days'
  ) as ncas_last_90days,

  -- Recent NCAs details for AI context
  jsonb_agg(
    jsonb_build_object(
      'nca_number', n.nca_number,
      'date', n.date,
      'nc_description', LEFT(n.nc_description, 100) || '...',
      'status', n.status,
      'root_cause', LEFT(n.root_cause_analysis, 100)
    ) ORDER BY n.date DESC
  ) FILTER (WHERE n.date >= NOW() - INTERVAL '90 days') as recent_ncas,

  -- Performance flags
  CASE
    WHEN COUNT(n.id) FILTER (WHERE n.date >= NOW() - INTERVAL '90 days') >= 3
    THEN true ELSE false
  END as high_recent_nca_frequency,

  s.last_audit_date,
  s.next_audit_due,
  CASE
    WHEN s.next_audit_due < CURRENT_DATE THEN true
    ELSE false
  END as audit_overdue

FROM suppliers s
LEFT JOIN ncas n ON n.supplier_name = s.supplier_name
GROUP BY s.id, s.supplier_code, s.supplier_name, s.approval_status,
         s.risk_level, s.last_audit_date, s.next_audit_due;

COMMENT ON VIEW supplier_performance_summary IS
  'Supplier performance metrics for AI to reference during NCA completion';

-- =============================================================================
-- VIEW: nca_traceability_context
-- Purpose: Provide AI with traceability context for NCA suggestions
-- BRCGS: Section 3.9 - Link NCAs to batch traceability data
-- =============================================================================
CREATE OR REPLACE VIEW nca_traceability_context AS
SELECT
  n.id as nca_id,
  n.nca_number,
  n.nc_type,
  n.supplier_name,
  n.supplier_wo_batch,
  n.carton_numbers,
  n.nc_description,

  -- Work Order Context
  wo.wo_number,
  wo.batch_number,
  wo.product_description,

  -- Machine Context
  m.machine_code,
  m.machine_name,
  m.department,

  -- Related NCAs (same supplier/product in last 90 days)
  (
    SELECT jsonb_agg(jsonb_build_object(
      'nca_number', n2.nca_number,
      'date', n2.date,
      'nc_description', LEFT(n2.nc_description, 150),
      'root_cause_analysis', LEFT(n2.root_cause_analysis, 150),
      'corrective_action', LEFT(n2.corrective_action, 150),
      'status', n2.status
    ) ORDER BY n2.date DESC)
    FROM ncas n2
    WHERE n2.supplier_name = n.supplier_name
      AND n2.id != n.id
      AND n2.date >= NOW() - INTERVAL '90 days'
      AND n2.status = 'closed'
    LIMIT 5
  ) as similar_past_ncas,

  -- Traceability completeness flags
  CASE
    WHEN n.supplier_wo_batch IS NOT NULL THEN true
    ELSE false
  END as has_supplier_batch_tracking,

  CASE
    WHEN n.carton_numbers IS NOT NULL THEN true
    ELSE false
  END as has_internal_traceability

FROM ncas n
LEFT JOIN work_orders wo ON n.wo_id = wo.id
LEFT JOIN machines m ON wo.machine_id = m.id;

COMMENT ON VIEW nca_traceability_context IS
  'Traceability context for AI to reference when suggesting root cause/corrective action';

-- =============================================================================
-- RLS: Row Level Security for new tables
-- =============================================================================
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Knowledge Base: Readable by all authenticated users (only current versions for AI)
CREATE POLICY "Users can view current procedures" ON knowledge_base_documents
  FOR SELECT
  USING (status = 'current');

CREATE POLICY "QA/Management can view all versions" ON knowledge_base_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('qa-supervisor', 'operations-manager')
    )
  );

-- AI Log: Users can view own interactions, QA/Management view all
CREATE POLICY "Users can view own AI interactions" ON ai_assistance_log
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "QA/Management can view all AI interactions" ON ai_assistance_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('qa-supervisor', 'operations-manager')
    )
  );

-- Suppliers: Readable by all authenticated users
CREATE POLICY "Users can view suppliers" ON suppliers
  FOR SELECT
  USING (true);

CREATE POLICY "Management can modify suppliers" ON suppliers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('operations-manager', 'qa-supervisor')
    )
  );

-- =============================================================================
-- AUDIT QUERIES: Pre-built queries for BRCGS audit evidence
-- =============================================================================

-- Query 1: Verify AI only cited current procedures
COMMENT ON TABLE ai_assistance_log IS
  'BRCGS Audit Query 1: SELECT DISTINCT procedures_cited FROM ai_assistance_log WHERE timestamp >= [audit_period_start]';

-- Query 2: AI suggestion acceptance rate by form section
COMMENT ON COLUMN ai_assistance_log.suggestion_accepted IS
  'BRCGS Audit Query 2: SELECT form_section, COUNT(*) FILTER (WHERE suggestion_accepted = true) * 100.0 / COUNT(*) as acceptance_rate FROM ai_assistance_log GROUP BY form_section';

-- Query 3: Verify procedure version synchronization
COMMENT ON COLUMN knowledge_base_documents.last_ai_reference IS
  'BRCGS Audit Query 3: SELECT document_number, revision, status, last_ai_reference FROM knowledge_base_documents WHERE status = superseded AND last_ai_reference > effective_date (should be EMPTY)';

-- =============================================================================
-- INITIAL DATA: Seed with Procedure 5.7 (if available)
-- =============================================================================
-- Note: Actual procedure upload done via application or separate data migration
-- This is placeholder structure for initial testing

/*
INSERT INTO knowledge_base_documents (
  document_number,
  document_name,
  document_type,
  revision,
  status,
  revised_date,
  effective_date,
  brcgs_section,
  full_text,
  summary
) VALUES (
  '5.7',
  'Control of Non-Conforming Product',
  'procedure',
  9,
  'current',
  '2025-09-02',
  '2025-09-02',
  '5.7',
  '[Full text of Procedure 5.7 would go here]',
  'Ensures out-of-specification product is clearly identified, labeled, and quarantined to prevent customer delivery through NCA system.'
);
*/

-- =============================================================================
-- COMPLETION LOG
-- =============================================================================
COMMENT ON SCHEMA public IS
  'AI Integration Schema Deployed: 2025-11-10 - Tables: knowledge_base_documents, ai_assistance_log, suppliers | Views: supplier_performance_summary, nca_traceability_context';
