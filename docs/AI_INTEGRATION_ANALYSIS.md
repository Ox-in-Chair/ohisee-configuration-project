# AI Integration Analysis for OHiSee NCA/MJC System

## BRCGS Section 3 QMS Compliance Requirements

**Document Type:** Technical Analysis
**Created:** 2025-11-10
**Author:** BRCGS Section 3 QMS Compliance Specialist
**Purpose:** Define AI assistant integration requirements for BRCGS-compliant NCA/MJC form completion

---

## Executive Summary

This document analyzes Kangopak's QMS structure to define requirements for integrating an AI assistant that helps users complete Non-Conformance Advice (NCA) and Maintenance Job Card (MJC) forms with facility-specific guidance while maintaining full BRCGS Section 3 compliance.

**Critical Finding:** AI integration MUST NOT bypass BRCGS Section 3 requirements for:

- Document control (Section 3.6)
- Traceability (Section 3.9)
- Audit trail completeness (Section 3.3)
- Non-conforming product control (references Procedure 5.7)

**Compliance Status:**

- Existing audit_trail table architecture: **COMPLIANT** ✓
- AI logging requirements: **ADDITIONAL SCHEMA REQUIRED**
- Document reference architecture: **NEW IMPLEMENTATION REQUIRED**

---

## 1. Document Structure Analysis

### 1.1 BRCGS Section 3.6 Document Control Requirements

**Section 3.6 Scope:** Procedures to ensure documents are:

- Approved before use (single approved version)
- Reviewed and updated as necessary
- Changes and current revision status identified
- Relevant versions available at points of use
- Documents remain legible and readily identifiable
- External origin documents identified and distribution controlled
- Obsolete documents prevented from unintended use

**Kangopak's Current Implementation:**
Based on procedure 5.7 (Control of Non-Conforming Product), Kangopak has:

- Documented procedures with revision history (e.g., Rev 9 dated 2025-09-02)
- YAML frontmatter tracking: document_number, revision, status, revised_date
- Form templates: 5.7F1 (NCA form), 5.7F2 (Trend Analysis)
- Integration points documented (3.3, 3.4, 3.9, 3.10, 3.11)

**AI Integration Impact:**
AI must reference CURRENT approved versions only. Key challenge: **Master List 3.6F1 does not exist in current project scope.**

**Critical Gap Identified:**
The reference in system instructions mentions `BRCGS_Kangopak_Procedures/Section_3_Product_Safety_and_Quality/Section_3_Records/3.6F1 Master List of Documents and Records Rev 64.md` but this file path does not exist in current working directory.

**Resolution Required:**

1. Locate actual Master List 3.6F1 or create document registry table
2. Ensure AI only references documents with status="Current"
3. Track document effective dates for AI knowledge cutoff

### 1.2 Procedures to Embed in AI Knowledge Base

Based on NCA/MJC form requirements and BRCGS Section 3 integration points, the following procedures are **CRITICAL** for AI context:

#### Priority 1: MANDATORY (Core NCA/MJC Functionality)

| Document | Location | Reason | Integration Point |
|----------|----------|--------|-------------------|
| **5.7 Control of Non-Conforming Product** | Current project | Defines NCA workflow, disposition options, root cause requirements | Direct: NCA form completion |
| **5.7F1 BRC Non-Conformance Advice** | Current project | Actual form template, field definitions | Direct: Form field guidance |
| **3.9 Traceability Procedure** | Not in project | Batch tracking, mass balance, traceability exercises | NCA Section 3 (Supplier info, WO linkage) |
| **3.11 Product Recall** | Not in project | Incident management, NC product control | NCA incident classification |
| **4.7 Maintenance Management** | Not in project | Maintenance procedures, hygiene clearance standards | MJC form completion, hygiene checklist |

#### Priority 2: HIGH (Contextual Guidance)

| Document | Location | Reason | Integration Point |
|----------|----------|--------|-------------------|
| **3.3 Internal Audits** | Not in project | CAPA workflow, audit verification | NCA root cause analysis, corrective action |
| **3.4 Supplier Approval** | Not in project | Approved supplier lists, supplier performance | NCA supplier name validation |
| **3.10 Complaint Handling** | Not in project | Customer complaint workflow | NCA triggered by customer complaint |
| **3.6 Document Control** | Not in project | Master List, revision control | AI document version verification |

#### Priority 3: MEDIUM (Enhanced Suggestions)

| Document | Location | Reason | Integration Point |
|----------|----------|--------|-------------------|
| **5.3 Process Control** | Not in project | Production log sheets, WIP monitoring | NCA WIP classification |
| **3.13 Corrective/Preventive Action** | Not in project | CAPA methodology, effectiveness verification | NCA corrective action guidance |
| **Approved Supplier List (ASL)** | Not in project | Current approved suppliers | NCA supplier dropdown |
| **Machine Master Database** | Not in project | Equipment codes, departments | MJC machine identification |

### 1.3 Knowledge Base Metadata Schema

AI knowledge base must track document metadata to ensure compliance:

```sql
-- =============================================================================
-- TABLE: knowledge_base_documents
-- Purpose: Track all procedure documents in AI knowledge base
-- BRCGS: Section 3.6 Document Control compliance
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
  embedding_vector VECTOR(1536),  -- OpenAI ada-002 or similar
  chunk_strategy TEXT,            -- 'full', 'section', 'paragraph'
  search_keywords TEXT[],

  -- Audit Trail
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_ai_reference TIMESTAMPTZ,  -- Track when AI last cited this document
  reference_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT kb_current_version_unique UNIQUE (document_number, status)
    WHERE status = 'current',  -- Only ONE current version per document
  CONSTRAINT kb_effective_after_revised CHECK (effective_date >= revised_date)
);

CREATE INDEX idx_kb_status ON knowledge_base_documents(status)
  WHERE status = 'current';
CREATE INDEX idx_kb_document_number ON knowledge_base_documents(document_number);
CREATE INDEX idx_kb_brcgs_section ON knowledge_base_documents(brcgs_section);
CREATE INDEX idx_kb_embedding ON knowledge_base_documents
  USING ivfflat (embedding_vector vector_cosine_ops);  -- pgvector

COMMENT ON TABLE knowledge_base_documents IS
  'BRCGS Section 3.6 compliant document registry for AI knowledge base';
COMMENT ON COLUMN knowledge_base_documents.status IS
  'AI must ONLY reference documents with status=current';
COMMENT ON COLUMN knowledge_base_documents.embedding_vector IS
  'Vector embeddings for semantic search (RAG architecture)';
```

**Critical Compliance Notes:**

1. **UNIQUE constraint on (document_number, status='current')** enforces Section 3.6 requirement for single approved version
2. AI retrieval MUST filter `WHERE status = 'current'` in all queries
3. Superseded versions retained for audit trail but NEVER referenced by AI
4. `last_ai_reference` and `reference_count` enable tracking of AI document usage

---

## 2. Audit Trail Requirements for AI Interactions

### 2.1 BRCGS Section 3.3 Internal Audit Requirements

**Audit Trail Scope:** Section 3.3 requires auditable evidence of:

- Who performed actions
- What actions were performed
- When actions occurred
- Effectiveness verification of corrective actions

**AI-Specific Audit Requirements:**
Per BRCGS interpretation, AI assistance MUST be auditable to answer:

- Which AI suggestions were presented to user?
- Which suggestions did user accept/reject?
- What was the AI's reasoning (which procedures cited)?
- Did AI suggestions align with current procedures?

### 2.2 Existing Audit Trail Architecture

**Current Implementation (audit_trail table):** ✓ COMPLIANT

The existing `audit_trail` table (migration 20251106102100) provides:

- Entity tracking (ncas, mjcs, work_orders)
- Action logging (created, updated, status_changed, etc.)
- User accountability (user_id, user_email, user_name, user_role)
- Timestamp accuracy (TIMESTAMPTZ with NOW())
- Change tracking (old_value, new_value JSONB, changed_fields[])
- Immutability (INSERT only via triggers, no UPDATE/DELETE)

**Strengths:**

- RLS-protected read-only access ✓
- SECURITY DEFINER functions for controlled writes ✓
- Comprehensive indexing for audit queries ✓
- JSONB for flexible change capture ✓

**Gap:** No AI interaction logging

### 2.3 AI Interaction Audit Schema Extension

**New Table Required:**

```sql
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
  form_section TEXT NOT NULL,  -- e.g., "Section 4: NC Description"
  field_name TEXT,             -- Specific field if applicable

  -- User Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- AI Interaction Details
  user_prompt TEXT NOT NULL,              -- What user asked
  user_input_context JSONB,               -- Current form state
  ai_response TEXT NOT NULL,              -- AI suggestion/guidance
  ai_model TEXT NOT NULL,                 -- e.g., "gpt-4", "claude-sonnet-4"
  ai_temperature NUMERIC(3,2),            -- Model settings for reproducibility

  -- Procedure References (BRCGS CRITICAL)
  procedures_cited JSONB NOT NULL,        -- [{"doc": "5.7", "section": "1.3", "text": "..."}]
  procedures_version_refs JSONB,          -- Document revisions cited

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

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Foreign Key Constraints
  CONSTRAINT ai_log_entity_id_fk CHECK (
    (entity_type = 'ncas' AND EXISTS (SELECT 1 FROM ncas WHERE id = entity_id)) OR
    (entity_type = 'mjcs' AND EXISTS (SELECT 1 FROM mjcs WHERE id = entity_id))
  )
);

-- =============================================================================
-- INDEXES: Performance optimization for AI audit queries
-- =============================================================================
CREATE INDEX idx_ai_log_entity ON ai_assistance_log(entity_type, entity_id);
CREATE INDEX idx_ai_log_timestamp ON ai_assistance_log(timestamp DESC);
CREATE INDEX idx_ai_log_user_id ON ai_assistance_log(user_id);
CREATE INDEX idx_ai_log_field ON ai_assistance_log(field_name);
CREATE INDEX idx_ai_log_accepted ON ai_assistance_log(suggestion_accepted)
  WHERE suggestion_accepted IS NOT NULL;

-- GIN index for procedure citation searches
CREATE INDEX idx_ai_log_procedures_cited ON ai_assistance_log
  USING GIN (procedures_cited);

-- =============================================================================
-- FUNCTION: log_ai_interaction()
-- Purpose: Log every AI assistance event (called from application)
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
  p_response_time_ms INTEGER DEFAULT NULL
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
    procedures_cited,
    response_time_ms,
    ip_address
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
    p_procedures_cited,
    p_response_time_ms,
    inet_client_addr()
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_ai_interaction IS
  'BRCGS CRITICAL: Logs all AI assistance interactions for audit trail';

-- =============================================================================
-- FUNCTION: update_ai_interaction_outcome()
-- Purpose: Record user's decision on AI suggestion (accept/reject/modify)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_ai_interaction_outcome IS
  'Records user decision on AI suggestion for effectiveness tracking';

-- =============================================================================
-- RLS: AI log readable by authorized personnel only
-- =============================================================================
ALTER TABLE ai_assistance_log ENABLE ROW LEVEL SECURITY;

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

-- No UPDATE or DELETE policies (immutable log)

COMMENT ON TABLE ai_assistance_log IS
  'BRCGS-compliant immutable audit log for AI assistance interactions';
```

### 2.4 Audit Logging Workflow

**When AI assistance is invoked:**

```typescript
// Example: User clicks "Get AI Suggestion" on NCA Root Cause field
async function getAISuggestion(
  ncaId: string,
  formSection: string,
  fieldName: string,
  userPrompt: string
) {
  const startTime = Date.now();

  // 1. Gather context
  const currentFormState = await getNCAFormData(ncaId);
  const userContext = {
    nc_type: currentFormState.nc_type,
    nc_description: currentFormState.nc_description,
    supplier_name: currentFormState.supplier_name,
    machine_status: currentFormState.machine_status
  };

  // 2. Call AI with procedure context
  const aiResponse = await callAIWithProcedures({
    prompt: userPrompt,
    context: userContext,
    relevantProcedures: ['5.7', '3.9', '3.13'],  // Auto-determined based on field
    currentRevisions: await getCurrentProcedureVersions(['5.7', '3.9', '3.13'])
  });

  const responseTime = Date.now() - startTime;

  // 3. LOG AI INTERACTION (MANDATORY)
  const logId = await supabase.rpc('log_ai_interaction', {
    p_entity_type: 'ncas',
    p_entity_id: ncaId,
    p_form_section: formSection,
    p_field_name: fieldName,
    p_user_id: currentUser.id,
    p_user_prompt: userPrompt,
    p_user_input_context: userContext,
    p_ai_response: aiResponse.suggestion,
    p_ai_model: 'gpt-4-turbo',
    p_procedures_cited: aiResponse.procedureReferences,
    p_response_time_ms: responseTime
  });

  // 4. Return suggestion with log ID for tracking
  return {
    suggestion: aiResponse.suggestion,
    procedureReferences: aiResponse.procedureReferences,
    logId: logId  // Track for user decision logging
  };
}

// When user accepts/rejects suggestion
async function recordAIDecision(
  logId: string,
  accepted: boolean,
  modified: boolean,
  finalValue: string
) {
  await supabase.rpc('update_ai_interaction_outcome', {
    p_log_id: logId,
    p_suggestion_accepted: accepted,
    p_suggestion_modified: modified,
    p_final_user_value: finalValue
  });
}
```

### 2.5 Audit Retention Requirements

**BRCGS Requirement:** Audit records must be retained per regulatory requirements (typically 3+ years)

**AI Assistance Log Retention:**

- Minimum: 3 years (aligned with BRCGS audit cycle)
- Recommended: Lifetime (disk cost minimal, analytics valuable)
- Backup: Include in regular database backups
- Export: Provide CSV/JSON export for external audits

**Compliance Verification Query:**

```sql
-- Audit query: Verify AI assistance completeness
-- Ensures every NCA/MJC has corresponding AI log if AI feature used
SELECT
  n.nca_number,
  n.created_by,
  n.created_at,
  COUNT(ai.id) as ai_interactions,
  ARRAY_AGG(DISTINCT ai.form_section) as sections_assisted,
  BOOL_OR(ai.suggestion_accepted) as any_suggestions_accepted
FROM ncas n
LEFT JOIN ai_assistance_log ai ON ai.entity_id = n.id AND ai.entity_type = 'ncas'
WHERE n.created_at >= NOW() - INTERVAL '1 year'
GROUP BY n.id, n.nca_number, n.created_by, n.created_at
ORDER BY n.created_at DESC;
```

---

## 3. Traceability Integration (Section 3.9)

### 3.1 BRCGS Section 3.9 Requirements

**Traceability Scope:** The company shall be able to trace and identify all packaging products from receipt of raw materials through all stages of processing, storage, and dispatch.

**Key Requirements:**

- Forward traceability: Raw material → production → finished product → customer
- Backward traceability: Customer complaint → finished product → raw materials
- Trace completion time: <4 hours (industry target)
- Mass balance: Input vs output variance <2%
- Quarterly exercises: Documented with timing and results

### 3.2 NCA/MJC Traceability Linkage

**Current Implementation:**

- NCAs linked to work_orders via `wo_id` foreign key ✓
- Work orders linked to machines, operators, batches ✓
- NCA captures: supplier WO/batch, supplier reel/box numbers, Kangopak carton numbers ✓

**AI Integration Requirements:**

**When AI suggests root cause or corrective action, it should reference:**

1. **Batch traceability data** (if available via work_order linkage)
2. **Similar past NCAs** for the same supplier/product/defect type
3. **Traceability exercises** that identified similar issues

**AI Should NOT:**

- Suggest root causes without checking if batch traceability data supports hypothesis
- Ignore existing traceability records for same raw material lot
- Recommend corrective actions that conflict with traceability investigation findings

### 3.3 AI-Traceability Schema Integration

**Extend knowledge base with traceability context:**

```sql
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
    SELECT json_agg(json_build_object(
      'nca_number', n2.nca_number,
      'nc_description', n2.nc_description,
      'root_cause_analysis', n2.root_cause_analysis,
      'corrective_action', n2.corrective_action,
      'date', n2.date
    ))
    FROM ncas n2
    WHERE n2.supplier_name = n.supplier_name
      AND n2.id != n.id
      AND n2.date >= NOW() - INTERVAL '90 days'
      AND n2.status = 'closed'
    LIMIT 5
  ) as similar_past_ncas,

  -- Traceability flags
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
```

**AI Retrieval Pattern:**

```typescript
// When generating root cause suggestions for NCA
async function getAIRootCauseSuggestion(ncaId: string) {
  // 1. Get traceability context
  const traceabilityContext = await supabase
    .from('nca_traceability_context')
    .select('*')
    .eq('nca_id', ncaId)
    .single();

  // 2. Include in AI prompt
  const aiPrompt = `
    You are assisting with root cause analysis for Non-Conformance ${traceabilityContext.nca_number}.

    Context:
    - Supplier: ${traceabilityContext.supplier_name}
    - Supplier Batch: ${traceabilityContext.supplier_wo_batch || 'NOT RECORDED'}
    - Internal Batch: ${traceabilityContext.batch_number || 'N/A'}
    - Product: ${traceabilityContext.product_description}
    - Machine: ${traceabilityContext.machine_code} - ${traceabilityContext.machine_name}

    Traceability Status:
    - Supplier batch tracking: ${traceabilityContext.has_supplier_batch_tracking ? 'YES' : 'NO'}
    - Internal traceability: ${traceabilityContext.has_internal_traceability ? 'YES' : 'NO'}

    Similar Past NCAs (last 90 days):
    ${JSON.stringify(traceabilityContext.similar_past_ncas, null, 2)}

    Based on Procedure 5.7 (Control of Non-Conforming Product), suggest:
    1. Likely root cause using Ishikawa diagram categories (Man, Machine, Method, Material, Environment, Measuring)
    2. Investigation steps to confirm root cause
    3. Reference any similar past NCAs if patterns exist
    4. Note if traceability data is incomplete and what additional info is needed
  `;

  // 3. Call AI with procedure context
  return await callAIWithProcedures({
    prompt: aiPrompt,
    procedures: ['5.7', '3.9'],
    context: traceabilityContext
  });
}
```

### 3.4 AI Guidance on Traceability Data Completeness

**AI should flag missing traceability data:**

```
Example AI Response:
"⚠️ TRACEABILITY GAP DETECTED:
This NCA does not have supplier batch number recorded.
Per Procedure 5.7 Section 1.1, supplier WO/batch number should be captured.
Per Procedure 3.9, this limits backward traceability if recall is needed.

RECOMMENDATION:
Before completing root cause analysis, obtain supplier batch number from:
1. Certificate of Analysis (COA)
2. Supplier delivery note
3. Raw material receiving record

Without supplier batch tracking, you cannot:
- Identify if other reels from same batch are affected
- Request supplier investigation on specific production lot
- Perform effective mass balance verification"
```

---

## 4. Supplier Management Context (Section 3.4)

### 4.1 BRCGS Section 3.4 Requirements

**Supplier Approval Scope:**

- Approved Supplier List (ASL) maintenance
- Supplier performance monitoring
- Supplier qualification and audits
- Non-conformance tracking per supplier

**AI Integration Opportunity:**
When completing NCA for raw material non-conformance, AI should:

1. Verify supplier is on Approved Supplier List
2. Retrieve supplier performance history (past NCAs, on-time delivery %)
3. Flag if supplier is underperforming (multiple recent NCAs)
4. Suggest escalation if pattern of non-conformances exists

### 4.2 Supplier Data Schema for AI

**New Table (if not exists):**

```sql
-- =============================================================================
-- TABLE: suppliers
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
  on_time_delivery_pct NUMERIC(5,2),  -- Percentage
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

-- =============================================================================
-- VIEW: supplier_performance_summary
-- Purpose: Real-time supplier performance for AI context
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

  -- Recent NCAs details
  json_agg(
    json_build_object(
      'nca_number', n.nca_number,
      'date', n.date,
      'nc_description', LEFT(n.nc_description, 100),
      'status', n.status
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
    WHEN s.next_audit_due < NOW() THEN true
    ELSE false
  END as audit_overdue

FROM suppliers s
LEFT JOIN ncas n ON n.supplier_name = s.supplier_name  -- Assumes name matching, ideally FK
GROUP BY s.id, s.supplier_code, s.supplier_name, s.approval_status,
         s.risk_level, s.last_audit_date, s.next_audit_due;

COMMENT ON VIEW supplier_performance_summary IS
  'Supplier performance metrics for AI to reference during NCA completion';
```

### 4.3 AI Integration: Supplier Context in NCAs

**When user enters supplier name in NCA Section 3:**

```typescript
async function getSupplierContextForAI(supplierName: string) {
  // Lookup supplier performance
  const supplierPerf = await supabase
    .from('supplier_performance_summary')
    .select('*')
    .ilike('supplier_name', `%${supplierName}%`)
    .single();

  if (!supplierPerf) {
    return {
      message: "⚠️ SUPPLIER NOT FOUND ON APPROVED SUPPLIER LIST",
      action: "Verify supplier name spelling or contact Procurement to add supplier to ASL",
      compliance_note: "Per Procedure 3.4, only approved suppliers should be used"
    };
  }

  if (supplierPerf.approval_status !== 'approved') {
    return {
      message: `⚠️ SUPPLIER STATUS: ${supplierPerf.approval_status.toUpperCase()}`,
      action: "Contact Procurement before processing this NCA",
      compliance_note: `Supplier ${supplierName} is not currently approved for use`
    };
  }

  // Build AI context
  let aiContext = {
    supplier: supplierPerf.supplier_name,
    status: supplierPerf.approval_status,
    risk_level: supplierPerf.risk_level,
    ncas_ytd: supplierPerf.ncas_ytd,
    ncas_last_90days: supplierPerf.ncas_last_90days,
    recent_ncas: supplierPerf.recent_ncas,
    high_frequency_flag: supplierPerf.high_recent_nca_frequency,
    audit_overdue: supplierPerf.audit_overdue
  };

  // Generate AI guidance
  let aiGuidance = "";

  if (supplierPerf.high_recent_nca_frequency) {
    aiGuidance += `⚠️ HIGH NCA FREQUENCY DETECTED
${supplierPerf.supplier_name} has ${supplierPerf.ncas_last_90days} NCAs in last 90 days.

RECOMMENDED ACTIONS (per Procedure 3.4):
1. Review recent NCAs for pattern identification
2. Escalate to Procurement for supplier performance review
3. Consider requesting supplier corrective action plan
4. May require supplier audit or suspension if trend continues

Recent NCAs:
${JSON.stringify(supplierPerf.recent_ncas, null, 2)}
`;
  }

  if (supplierPerf.audit_overdue) {
    aiGuidance += `\n⚠️ SUPPLIER AUDIT OVERDUE
Last audit: ${supplierPerf.last_audit_date}
Audit was due: ${supplierPerf.next_audit_due}

ACTION: Flag this NCA to Procurement for audit scheduling.
`;
  }

  return {
    context: aiContext,
    guidance: aiGuidance
  };
}
```

**Example AI Response to User:**

```
AI Assistance: Supplier Information

Supplier: ABC Films (Pty) Ltd
Status: APPROVED ✓
Risk Level: MEDIUM

Performance Summary:
- NCAs YTD: 2
- NCAs Last 90 Days: 1
- No high-frequency concerns

Historical Context:
This is the second NCA for ABC Films this year. Previous NCA (NCA-2025-00234)
was for incorrect film thickness on 12 March 2025, resolved with supplier
corrective action.

RECOMMENDATION:
1. Check if this NCA is related to same root cause as NCA-2025-00234
2. If yes, escalate to Procurement - supplier corrective action was ineffective
3. Request updated supplier corrective action plan
4. Consider increasing incoming inspection frequency for this supplier

(Reference: Procedure 3.4 Supplier Approval, Section 3.4.2 Supplier Performance Monitoring)
```

---

## 5. Complaint/Recall Integration (Sections 3.10-3.11)

### 5.1 BRCGS Section 3.10 Complaint Handling Requirements

**Scope:** Procedures for receiving, recording, investigating customer complaints

**NCA Linkage:** Customer complaints often trigger NCAs for investigation

**AI Integration:** When NCA is triggered by customer complaint, AI should:

1. Reference complaint details (complaint number, customer, issue description)
2. Suggest investigation steps specific to customer complaint root cause
3. Link to traceability data for affected finished goods
4. Flag if recall risk assessment is needed

### 5.2 BRCGS Section 3.11 Product Recall Requirements

**Scope:** Documented procedure for product withdrawal/recall

**NCA Linkage:** Incidents may trigger NCAs and recall assessments

**Critical Timing Requirements:**

- Customer notification: <2 hours from recall decision
- Batch identification: <30 minutes via traceability
- Recovery rate: >95% of distributed product

**AI Integration:** When NCA type = "incident", AI should:

1. Prompt for recall risk assessment
2. Reference Procedure 3.11 requirements
3. Guide user through incident severity classification
4. Suggest immediate containment actions

### 5.3 AI Schema Extension for Complaint/Recall Context

```sql
-- =============================================================================
-- TABLE: customer_complaints (if not exists)
-- Purpose: Customer complaint register
-- BRCGS: Section 3.10 Complaint Handling
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  complaint_date DATE NOT NULL,
  complaint_description TEXT NOT NULL,
  product_description TEXT,
  batch_number TEXT,

  -- Complaint Classification
  complaint_type TEXT CHECK (complaint_type IN (
    'quality',
    'safety',
    'contamination',
    'labeling',
    'delivery',
    'other'
  )),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Investigation
  investigation_status TEXT DEFAULT 'open' CHECK (investigation_status IN (
    'open',
    'investigating',
    'resolved',
    'closed'
  )),
  nca_id UUID REFERENCES ncas(id),  -- Link to NCA if created

  -- Recall Assessment
  recall_risk_assessed BOOLEAN DEFAULT false,
  recall_required BOOLEAN,
  recall_initiated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_complaints_number ON customer_complaints(complaint_number);
CREATE INDEX idx_complaints_nca_id ON customer_complaints(nca_id);
CREATE INDEX idx_complaints_status ON customer_complaints(investigation_status);
CREATE INDEX idx_complaints_severity ON customer_complaints(severity);

-- =============================================================================
-- VIEW: nca_complaint_context
-- Purpose: Link NCAs to customer complaints for AI context
-- =============================================================================
CREATE OR REPLACE VIEW nca_complaint_context AS
SELECT
  n.id as nca_id,
  n.nca_number,
  c.complaint_number,
  c.customer_name,
  c.complaint_date,
  c.complaint_description,
  c.complaint_type,
  c.severity,
  c.recall_risk_assessed,
  c.recall_required,

  -- AI guidance flags
  CASE
    WHEN c.severity IN ('high', 'critical') AND NOT c.recall_risk_assessed
    THEN true ELSE false
  END as needs_recall_assessment,

  CASE
    WHEN c.complaint_type = 'safety' OR c.complaint_type = 'contamination'
    THEN true ELSE false
  END as safety_critical

FROM ncas n
INNER JOIN customer_complaints c ON c.nca_id = n.id;

COMMENT ON VIEW nca_complaint_context IS
  'Customer complaint context for AI assistance on complaint-triggered NCAs';
```

### 5.4 AI Workflow: Complaint-Triggered NCA

**When NCA is linked to customer complaint:**

```typescript
async function getComplaintContextForNCA(ncaId: string) {
  const complaintContext = await supabase
    .from('nca_complaint_context')
    .select('*')
    .eq('nca_id', ncaId)
    .maybeSingle();

  if (!complaintContext) {
    return null;  // Not a complaint-triggered NCA
  }

  // Generate AI guidance specific to complaint handling
  let aiGuidance = `
🔴 CUSTOMER COMPLAINT-TRIGGERED NCA

Complaint Number: ${complaintContext.complaint_number}
Customer: ${complaintContext.customer_name}
Complaint Date: ${complaintContext.complaint_date}
Severity: ${complaintContext.severity.toUpperCase()}
Type: ${complaintContext.complaint_type}

Complaint Description:
${complaintContext.complaint_description}

---

REQUIRED ACTIONS (Per Procedure 3.10 Complaint Handling):
`;

  if (complaintContext.safety_critical) {
    aiGuidance += `
⚠️ SAFETY-CRITICAL COMPLAINT DETECTED

IMMEDIATE ACTIONS REQUIRED:
1. Notify QA Manager and Operations Manager IMMEDIATELY
2. Quarantine all potentially affected product
3. Conduct recall risk assessment (Procedure 3.11)
4. DO NOT dispose of or rework product until investigation complete
5. Preserve samples for analysis

INVESTIGATION PRIORITIES:
- Identify root cause of contamination/safety issue
- Trace all batches using same raw materials/process
- Assess customer exposure and health risk
- Prepare for potential recall scenario
`;
  }

  if (complaintContext.needs_recall_assessment) {
    aiGuidance += `
🚨 RECALL RISK ASSESSMENT REQUIRED

This is a ${complaintContext.severity} severity complaint that has NOT been
assessed for recall risk.

Per Procedure 3.11 (Product Recall):
1. Assemble recall team (QA, Operations, Commercial)
2. Complete Recall Risk Assessment form
3. Decision required within 2 hours if recall needed
4. Customer notification within 2 hours of decision
5. Batch identification via traceability (<30 minutes)

INVESTIGATION MUST DETERMINE:
- Is product safety or legality compromised?
- How many customers/batches are affected?
- Can issue be resolved by rework or is recall necessary?
- What is the risk of product reaching end consumers?

DO NOT CLOSE THIS NCA UNTIL RECALL ASSESSMENT COMPLETE.
`;
  }

  // Add traceability guidance
  aiGuidance += `
TRACEABILITY REQUIREMENTS (Procedure 3.9):
- Batch number: ${complaintContext.batch_number || 'NOT RECORDED - OBTAIN URGENTLY'}
- Perform backward trace to raw materials
- Perform forward trace to all customers who received same batch
- Mass balance verification required
- Trace completion target: <4 hours

Root Cause Analysis Focus:
- Was this an isolated incident or systemic issue?
- Check Production Log Sheets for batch ${complaintContext.batch_number}
- Review other NCAs from same time period/machine
- Supplier material quality (if raw material related)
- Process parameter deviations during production
`;

  return {
    context: complaintContext,
    guidance: aiGuidance,
    priority: complaintContext.safety_critical ? 'CRITICAL' : 'HIGH',
    procedures: ['3.10', '3.11', '3.9', '5.7']
  };
}
```

---

## 6. Procedure Referencing Rules

### 6.1 When AI Should Cite Specific Procedures

**MANDATORY Citation:**

| Situation | Procedure(s) to Cite | Reason |
|-----------|---------------------|--------|
| NCA disposition options suggested | 5.7 Section 1.1.2 | Defines Reject/Rework/Concession decision criteria |
| Root cause analysis methodology | 5.7 Section 1.3, 3.13 | Ishikawa diagram, systematic approach |
| Cross contamination flagged | 5.7 Section 1.1.3 | Back tracking requirements |
| Supplier NCA | 3.4 | Supplier performance monitoring |
| Customer complaint NCA | 3.10, 3.11 | Complaint handling, recall assessment |
| Traceability data requested | 3.9 | Batch tracking, mass balance |
| Corrective action suggested | 3.13 | CAPA methodology, effectiveness verification |
| Close out timeframe mentioned | 5.7 Section 1.4 | 20 working days from date opened |
| Incident classification | 3.11 | Incident management requirements |
| WIP non-conformance | 5.3, 5.7 | Production log sheets, process control |

**AI Citation Format:**

```
[Procedure Reference]
Per Procedure 5.7 (Control of Non-Conforming Product), Rev 9, Section 1.3:
"Root Cause Analysis must take place immediately once NC is detected identifying
how and why product is non-conforming..."

[Practical Guidance Based on Procedure]
Use Ishikawa diagram to systematically analyze:
- Man: Operator training, fatigue, procedure compliance
- Machine: Equipment malfunction, calibration, maintenance
- Method: Process parameters, recipe, setup
- Material: Raw material quality, supplier variation
- Environment: Temperature, humidity, contamination
- Measuring: Inspection accuracy, equipment calibration
```

### 6.2 Procedure Version Verification

**AI MUST check procedure version before citing:**

```typescript
async function citeProcedu re(documentNumber: string, sectionRef: string) {
  // 1. Get current approved version
  const currentProc = await supabase
    .from('knowledge_base_documents')
    .select('*')
    .eq('document_number', documentNumber)
    .eq('status', 'current')  // CRITICAL: Only current versions
    .single();

  if (!currentProc) {
    throw new Error(`Procedure ${documentNumber} not found in current status`);
  }

  // 2. Extract relevant section
  const sectionText = extractSection(currentProc.full_text, sectionRef);

  // 3. Return citation with version tracking
  return {
    citation: `Per Procedure ${currentProc.document_number} (${currentProc.document_name}), Rev ${currentProc.revision}, ${sectionRef}`,
    text: sectionText,
    document_id: currentProc.id,
    revision: currentProc.revision,
    effective_date: currentProc.effective_date
  };
}
```

### 6.3 AI Response Structure Template

**Every AI suggestion should follow this structure:**

```markdown
## AI Suggestion

[Context-Specific Guidance]

### Procedure Reference
Per Procedure X.X (Name), Rev #, Section #:
"[Quoted requirement]"

### Practical Application
[How to apply this requirement to current NCA/MJC]

### Quality Check
☑ Verify [specific item]
☑ Confirm [specific item]
☑ Document [specific item]

### Related Procedures
- Procedure A.B: [Related requirement]
- Procedure C.D: [Related requirement]

---
*This suggestion is based on current approved procedures as of [effective_date].
If procedures have been updated, please verify with QA.*
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**

1. Create `knowledge_base_documents` table
2. Upload Priority 1 procedures (5.7, 5.7F1, 3.9, 3.11, 4.7)
3. Generate embeddings for procedures
4. Create `ai_assistance_log` table
5. Implement `log_ai_interaction()` and `update_ai_interaction_outcome()` functions

**Success Criteria:**

- All current procedures loaded with status='current'
- Version constraint enforced (only one current version per document)
- AI can retrieve procedures via semantic search
- All AI interactions logged to audit table

### Phase 2: Context Integration (Weeks 3-4)

**Deliverables:**

1. Create `suppliers` table and `supplier_performance_summary` view
2. Create `customer_complaints` table (if not exists)
3. Create `nca_traceability_context` and `nca_complaint_context` views
4. Implement AI retrieval functions for each context type
5. Build procedure citation validation

**Success Criteria:**

- AI can retrieve supplier performance data
- AI can identify complaint-triggered NCAs
- AI can access traceability context for root cause analysis
- All procedure citations verified against current versions

### Phase 3: Form-Specific AI Assistance (Weeks 5-6)

**Deliverables:**

1. NCA Section 4 (Description): AI suggestion with similar past NCAs
2. NCA Section 8 (Disposition): AI guidance on Reject/Rework/Concession
3. NCA Section 9 (Root Cause): AI Ishikawa diagram assistance
4. NCA Section 10 (Corrective Action): AI effectiveness criteria
5. MJC Section 6 (Description): AI troubleshooting suggestions
6. MJC Section 9 (Hygiene Clearance): AI checklist guidance

**Success Criteria:**

- Each form section has context-aware AI assistance
- Procedure references accurate and version-verified
- User acceptance/rejection logged for all suggestions
- Response time <2 seconds for AI suggestions

### Phase 4: Advanced Features (Weeks 7-8)

**Deliverables:**

1. Pattern detection: Flag recurring NCAs for same supplier/product
2. Escalation alerts: High-frequency NCAs trigger Procurement notification
3. Recall risk scoring: AI pre-assessment for incident NCAs
4. Traceability gap detection: AI flags missing batch/supplier data
5. Corrective action effectiveness analysis: AI reviews closed NCAs

**Success Criteria:**

- AI detects patterns across >100 historical NCAs
- Escalation alerts reduce supplier issues by 20%
- Recall risk assessment completion rate >95%
- Traceability data completeness >90%

### Phase 5: Continuous Improvement (Ongoing)

**Deliverables:**

1. Monthly AI suggestion acceptance rate analysis
2. Quarterly procedure update synchronization
3. User feedback analysis for AI improvement
4. A/B testing of AI suggestion formats
5. Expansion to other BRCGS procedures

**Success Criteria:**

- AI suggestion acceptance rate >70%
- Procedure updates deployed within 24 hours
- User satisfaction rating >4/5
- Zero instances of AI citing superseded procedures

---

## 8. Compliance Validation Checklist

### Pre-Deployment Audit

**Section 3.6 Document Control:**

- [ ] Only current procedure versions loaded in knowledge base
- [ ] UNIQUE constraint enforced on (document_number, status='current')
- [ ] AI query filters `WHERE status = 'current'` in all retrievals
- [ ] Procedure revision tracking in all AI citations
- [ ] Superseded procedures retained but never cited by AI

**Section 3.3 Audit Trail:**

- [ ] `audit_trail` table captures all NCA/MJC changes
- [ ] `ai_assistance_log` table captures all AI interactions
- [ ] User decisions (accept/reject) logged for every suggestion
- [ ] Procedure references logged in JSONB for audit queries
- [ ] No UPDATE/DELETE on audit tables (immutable)
- [ ] RLS policies restrict audit trail access appropriately

**Section 3.9 Traceability:**

- [ ] NCAs linked to work_orders via foreign key
- [ ] AI flags missing supplier batch tracking
- [ ] AI references similar past NCAs for same supplier
- [ ] Traceability context view provides batch linkage
- [ ] AI guidance includes back tracking requirements when cross contamination = YES

**Section 3.4 Supplier Management:**

- [ ] Supplier performance data accessible to AI
- [ ] AI flags non-approved suppliers
- [ ] AI detects high NCA frequency per supplier
- [ ] Escalation alerts configured for underperforming suppliers
- [ ] Supplier audit overdue detection implemented

**Section 3.10/3.11 Complaint/Recall:**

- [ ] Customer complaints linked to NCAs
- [ ] AI prompts for recall risk assessment when severity = high/critical
- [ ] Safety-critical complaints trigger enhanced AI guidance
- [ ] Traceability requirements emphasized for complaint NCAs
- [ ] Recall timing requirements (2-hour notification) highlighted by AI

### Post-Deployment Verification

**Monthly:**

- [ ] Review ai_assistance_log for suggestion acceptance rates
- [ ] Verify no superseded procedures cited by AI
- [ ] Check procedure update deployment lag
- [ ] Analyze user feedback for AI improvement areas

**Quarterly:**

- [ ] Audit trail completeness verification
- [ ] AI citation accuracy spot-check (10% sample)
- [ ] Traceability data completeness trend analysis
- [ ] Supplier performance AI escalation effectiveness

**Annually:**

- [ ] Full BRCGS audit preparation review
- [ ] AI system effectiveness evaluation
- [ ] Procedure knowledge base synchronization audit
- [ ] User training on AI features and limitations

---

## 9. Risk Mitigation

### Risk 1: AI Cites Superseded Procedure

**Likelihood:** Medium
**Impact:** HIGH (BRCGS audit non-conformance)

**Mitigation:**

1. UNIQUE constraint on (document_number, status='current')
2. All AI queries filter `WHERE status = 'current'`
3. Automated daily job: Flag any superseded documents still in embeddings
4. Procedure update workflow: Immediately supersede old version when new approved
5. Monthly audit: Sample 10 AI responses, verify procedure versions cited

**Detection:**

```sql
-- Daily check: Detect if AI ever cited superseded document
SELECT
  ai.id,
  ai.timestamp,
  ai.procedures_cited,
  ai.ai_response
FROM ai_assistance_log ai
WHERE ai.procedures_cited::jsonb @> '[{"status": "superseded"}]'::jsonb
  AND ai.timestamp >= NOW() - INTERVAL '24 hours';
```

### Risk 2: AI Provides Incorrect Technical Guidance

**Likelihood:** Medium
**Impact:** HIGH (Incorrect root cause, ineffective corrective action)

**Mitigation:**

1. AI responses ALWAYS include procedure references for verification
2. Users trained: "AI provides suggestions, not decisions"
3. Critical fields (disposition, close out) require human authorization
4. User feedback mechanism: Flag incorrect AI suggestions
5. Quarterly review: Analyze closed NCAs for AI-suggested corrective action effectiveness

**Human Override:**

- All AI suggestions clearly marked as "AI Suggestion - Verify with QA"
- No auto-population of critical fields (disposition, signatures)
- Team Leader/QA must review AI-assisted NCAs before closure

### Risk 3: Incomplete Audit Trail for AI Interactions

**Likelihood:** Low
**Impact:** CRITICAL (BRCGS audit failure)

**Mitigation:**

1. Application-level enforcement: Cannot call AI without logging interaction
2. Database constraint: ai_assistance_log immutable (no UPDATE/DELETE)
3. RLS policies: Prevent unauthorized audit trail modification
4. Backup strategy: ai_assistance_log included in daily backups
5. Audit query library: Pre-built queries for BRCGS audit evidence

**Verification:**

```sql
-- Ensure every NCA has AI log if AI feature used
-- (If AI feature optional, filter by user preference)
SELECT
  n.nca_number,
  n.status,
  COUNT(ai.id) as ai_interactions,
  CASE
    WHEN COUNT(ai.id) = 0 THEN 'No AI Used'
    WHEN COUNT(ai.id) > 0 AND BOOL_AND(ai.suggestion_accepted IS NOT NULL) THEN 'Complete'
    ELSE 'Incomplete - Missing Decision Logging'
  END as audit_status
FROM ncas n
LEFT JOIN ai_assistance_log ai ON ai.entity_id = n.id AND ai.entity_type = 'ncas'
WHERE n.created_at >= NOW() - INTERVAL '30 days'
GROUP BY n.id, n.nca_number, n.status
HAVING COUNT(ai.id) > 0 AND BOOL_OR(ai.suggestion_accepted IS NULL);
```

### Risk 4: Traceability Data Gaps Not Flagged by AI

**Likelihood:** Medium
**Impact:** HIGH (Recall inefficiency, audit finding)

**Mitigation:**

1. AI explicitly checks for supplier_wo_batch, carton_numbers fields
2. AI warns if traceability data incomplete
3. Validation rules: Prevent NCA submission without minimum traceability data
4. Dashboard: Flag NCAs with incomplete traceability
5. Monthly report: Traceability data completeness by department/operator

**Example AI Flag:**

```typescript
// In AI root cause analysis function
if (!nca.supplier_wo_batch && nca.nc_type === 'raw-material') {
  warnings.push({
    severity: 'HIGH',
    field: 'supplier_wo_batch',
    message: 'Supplier batch number missing - limits backward traceability',
    procedure_ref: 'Procedure 3.9 Section 3.9.2',
    action_required: 'Obtain supplier batch number from COA or delivery note before completing root cause'
  });
}
```

---

## 10. Success Metrics

### Operational Efficiency

**Baseline (Manual):**

- Average time to complete NCA: 25 minutes
- Root cause analysis quality: 60% complete (audit sample)
- Procedure reference accuracy: 40% (common errors in citations)

**Target (AI-Assisted):**

- Average time to complete NCA: 15 minutes (40% reduction)
- Root cause analysis quality: 85% complete
- Procedure reference accuracy: 95%

**Measurement:**

```sql
-- Average NCA completion time with/without AI
SELECT
  CASE WHEN ai_count > 0 THEN 'AI-Assisted' ELSE 'Manual' END as method,
  AVG(EXTRACT(EPOCH FROM (submitted_at - created_at))/60) as avg_minutes,
  COUNT(*) as nca_count
FROM (
  SELECT
    n.id,
    n.created_at,
    n.submitted_at,
    COUNT(ai.id) as ai_count
  FROM ncas n
  LEFT JOIN ai_assistance_log ai ON ai.entity_id = n.id
  WHERE n.submitted_at IS NOT NULL
    AND n.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY n.id
) subquery
GROUP BY (ai_count > 0);
```

### Compliance Improvement

**Baseline:**

- NCAs with complete root cause analysis: 60%
- NCAs with corrective action effectiveness verification: 50%
- Traceability data completeness: 70%

**Target:**

- NCAs with complete root cause analysis: 90%
- NCAs with corrective action effectiveness verification: 80%
- Traceability data completeness: 95%

**Measurement:**

```sql
-- Root cause completeness comparison
SELECT
  CASE WHEN ai_count > 0 THEN 'AI-Assisted' ELSE 'Manual' END as method,
  COUNT(*) FILTER (WHERE char_length(root_cause_analysis) >= 100) * 100.0 / COUNT(*) as pct_complete_root_cause,
  COUNT(*) FILTER (WHERE char_length(corrective_action) >= 50) * 100.0 / COUNT(*) as pct_complete_corrective_action,
  COUNT(*) FILTER (WHERE supplier_wo_batch IS NOT NULL AND nc_type = 'raw-material') * 100.0 /
    COUNT(*) FILTER (WHERE nc_type = 'raw-material') as pct_supplier_batch_tracked
FROM (
  SELECT
    n.*,
    COUNT(ai.id) as ai_count
  FROM ncas n
  LEFT JOIN ai_assistance_log ai ON ai.entity_id = n.id
  WHERE n.status = 'closed'
    AND n.closed_at >= NOW() - INTERVAL '90 days'
  GROUP BY n.id
) subquery
GROUP BY (ai_count > 0);
```

### User Satisfaction

**Target:**

- AI suggestion acceptance rate: >70%
- User satisfaction rating: >4.0/5.0
- Reported AI errors: <5 per month
- Procedure citation accuracy: >95%

**Measurement:**

```sql
-- AI suggestion acceptance rate
SELECT
  COUNT(*) FILTER (WHERE suggestion_accepted = true) * 100.0 / COUNT(*) as acceptance_rate,
  COUNT(*) FILTER (WHERE suggestion_modified = true) * 100.0 / COUNT(*) as modification_rate,
  AVG(suggestion_quality_rating) as avg_rating,
  COUNT(*) FILTER (WHERE suggestion_quality_rating <= 2) as low_quality_count
FROM ai_assistance_log
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND suggestion_accepted IS NOT NULL;
```

---

## 11. Conclusion

### Summary of Deliverables

1. **Document Registry Schema:** `knowledge_base_documents` table with version control
2. **AI Audit Trail Schema:** `ai_assistance_log` table with user decision tracking
3. **Procedure Upload Priority List:** 13 procedures ranked by criticality
4. **Context Integration Views:** Traceability, supplier performance, complaint linkage
5. **Compliance Validation Checklist:** Pre/post-deployment verification
6. **Risk Mitigation Strategy:** 4 key risks with detection and mitigation
7. **Success Metrics Framework:** Operational, compliance, satisfaction KPIs

### Critical Success Factors

**Technical:**

- ✓ Existing audit_trail architecture is BRCGS-compliant
- ✓ AI assistance logging integrated into existing pattern
- ⚠ Master List 3.6F1 location needs verification
- ⚠ Procedure file paths in system instructions need validation

**Compliance:**

- Document version control is MANDATORY (UNIQUE constraint)
- AI must NEVER cite superseded procedures
- All AI interactions must be logged (immutable audit trail)
- Traceability requirements must be embedded in AI prompts

**Organizational:**

- User training: AI provides suggestions, humans make decisions
- QA oversight: Review AI-assisted NCAs for quality
- Continuous improvement: Monthly AI effectiveness reviews
- Procedure synchronization: Update AI knowledge base within 24 hours of procedure changes

### Next Steps

1. **Immediate (Week 1):**
   - Locate or create Master List 3.6F1 document registry
   - Validate procedure file paths referenced in system instructions
   - Create `knowledge_base_documents` and `ai_assistance_log` tables
   - Upload Priority 1 procedures (5.7, 5.7F1, 3.9, 3.11, 4.7)

2. **Short-term (Weeks 2-4):**
   - Implement AI logging in NCA/MJC forms
   - Build supplier performance and complaint context views
   - Develop procedure citation validation
   - Pilot test with 10 users on non-production NCAs

3. **Medium-term (Weeks 5-8):**
   - Deploy AI assistance for all form sections
   - Implement pattern detection and escalation alerts
   - Conduct BRCGS audit simulation
   - Measure baseline vs AI-assisted performance metrics

4. **Long-term (Ongoing):**
   - Quarterly effectiveness reviews
   - Expand AI to other BRCGS procedures (Complaints, CAPA, Audits)
   - Continuous training data improvement
   - Integration with traceability exercises and recall drills

---

**Document Control:**

- Document Number: AI_INTEGRATION_ANALYSIS
- Version: 1.0
- Date: 2025-11-10
- Author: BRCGS Section 3 QMS Compliance Specialist
- Review Due: 2025-12-10 (30 days)
- Classification: INTERNAL USE
- Status: DRAFT - Pending Review

---

**Approvals Required:**

- [ ] QA Manager (BRCGS compliance verification)
- [ ] IT Manager (Technical feasibility review)
- [ ] Operations Manager (User requirement validation)
- [ ] Data Protection Officer (POPIA/GDPR compliance)
