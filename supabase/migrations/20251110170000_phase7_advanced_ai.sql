-- Phase 7: Advanced AI Enhancements (2026-2027)
-- Multi-Agent System, Policy Versioning, Explainable AI Support
-- Date: 2025-11-10

-- =============================================================================
-- TABLE: policy_versions
-- Purpose: Track policy rule versions for adaptive policy versioning
-- =============================================================================
CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL UNIQUE,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_versions_status ON policy_versions(status) WHERE status = 'active';
CREATE INDEX idx_policy_versions_version ON policy_versions(version);

COMMENT ON TABLE policy_versions IS
  'Policy versioning for adaptive enforcement rules. Supports A/B testing and gradual rollouts.';

-- =============================================================================
-- TABLE: agent_audit_log
-- Purpose: Audit trail for multi-agent validation decisions
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('nca', 'mjc')),
  form_id UUID,
  user_id UUID REFERENCES auth.users(id),
  findings JSONB NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,
  conflicts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_audit_form ON agent_audit_log(form_type, form_id);
CREATE INDEX idx_agent_audit_user ON agent_audit_log(user_id);
CREATE INDEX idx_agent_audit_created ON agent_audit_log(created_at DESC);

COMMENT ON TABLE agent_audit_log IS
  'Audit trail for multi-agent validation system. Enables explainable AI and transparency.';

-- =============================================================================
-- TABLE: decision_traces
-- Purpose: Complete decision traces for explainable AI
-- =============================================================================
CREATE TABLE IF NOT EXISTS decision_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_type TEXT NOT NULL CHECK (form_type IN ('nca', 'mjc')),
  form_id UUID,
  user_id UUID REFERENCES auth.users(id),
  validation_result JSONB NOT NULL,
  explanations JSONB NOT NULL,
  agent_traces JSONB,
  policy_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decision_traces_form ON decision_traces(form_type, form_id);
CREATE INDEX idx_decision_traces_user ON decision_traces(user_id);
CREATE INDEX idx_decision_traces_policy ON decision_traces(policy_version);

COMMENT ON TABLE decision_traces IS
  'Complete decision traces for explainable AI. Used for user explanations and regulatory reports.';

-- =============================================================================
-- FUNCTION: get_policy_version
-- Purpose: Get current active policy version
-- =============================================================================
CREATE OR REPLACE FUNCTION get_policy_version()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_version TEXT;
BEGIN
  SELECT version INTO current_version
  FROM policy_versions
  WHERE status = 'active'
  ORDER BY effective_date DESC
  LIMIT 1;

  RETURN COALESCE(current_version, '1.0.0');
END;
$$;

COMMENT ON FUNCTION get_policy_version IS
  'Returns the current active policy version for validation and audit trails';

-- =============================================================================
-- FUNCTION: log_agent_decision
-- Purpose: Log multi-agent validation decision
-- =============================================================================
CREATE OR REPLACE FUNCTION log_agent_decision(
  p_agent_name TEXT,
  p_form_type TEXT,
  p_form_id UUID,
  p_user_id UUID,
  p_findings JSONB,
  p_execution_time_ms INTEGER,
  p_confidence REAL,
  p_reasoning TEXT DEFAULT NULL,
  p_conflicts JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO agent_audit_log (
    agent_name,
    form_type,
    form_id,
    user_id,
    findings,
    execution_time_ms,
    confidence,
    reasoning,
    conflicts
  ) VALUES (
    p_agent_name,
    p_form_type,
    p_form_id,
    p_user_id,
    p_findings,
    p_execution_time_ms,
    p_confidence,
    p_reasoning,
    p_conflicts
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

COMMENT ON FUNCTION log_agent_decision IS
  'Logs a multi-agent validation decision for audit and explainable AI purposes';

-- =============================================================================
-- FUNCTION: create_decision_trace
-- Purpose: Create complete decision trace for explainable AI
-- =============================================================================
CREATE OR REPLACE FUNCTION create_decision_trace(
  p_form_type TEXT,
  p_form_id UUID,
  p_user_id UUID,
  p_validation_result JSONB,
  p_explanations JSONB,
  p_agent_traces JSONB DEFAULT NULL,
  p_policy_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  trace_id UUID;
  effective_version TEXT;
BEGIN
  -- Use provided version or get current
  effective_version := COALESCE(p_policy_version, get_policy_version());

  INSERT INTO decision_traces (
    form_type,
    form_id,
    user_id,
    validation_result,
    explanations,
    agent_traces,
    policy_version
  ) VALUES (
    p_form_type,
    p_form_id,
    p_user_id,
    p_validation_result,
    p_explanations,
    p_agent_traces,
    effective_version
  )
  RETURNING id INTO trace_id;

  RETURN trace_id;
END;
$$;

COMMENT ON FUNCTION create_decision_trace IS
  'Creates a complete decision trace for explainable AI and regulatory reporting';

