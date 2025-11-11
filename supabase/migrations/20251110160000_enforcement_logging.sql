/**
 * Enforcement Logging Migration
 * Tracks submission attempts and enforcement actions for adaptive quality control
 * Supports progressive escalation and pattern detection
 */

-- ============================================================================
-- TABLE: enforcement_log
-- Purpose: Track validation attempts and enforcement actions per form submission
-- ============================================================================
CREATE TABLE enforcement_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Form Context
  form_type TEXT NOT NULL CHECK (form_type IN ('nca', 'mjc')),
  form_id UUID, -- NCA or MJC ID (nullable for draft attempts)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Attempt Tracking
  attempt_number INTEGER NOT NULL DEFAULT 1,
  enforcement_level TEXT NOT NULL CHECK (enforcement_level IN ('soft', 'moderate', 'strict', 'manager-approval')),
  
  -- Validation Results
  validation_result JSONB NOT NULL, -- Full validation result snapshot
  issues_found JSONB NOT NULL, -- Array of validation issues
  requirements_missing JSONB, -- Array of missing requirements
  errors_blocking JSONB, -- Array of blocking errors
  
  -- Enforcement Actions
  action_taken TEXT NOT NULL CHECK (action_taken IN (
    'hint_shown',
    'requirement_promoted',
    'error_escalated',
    'manager_approval_required',
    'submission_blocked',
    'submission_allowed'
  )),
  
  -- Manager Approval (if applicable)
  manager_approval_requested BOOLEAN DEFAULT FALSE,
  manager_approval_justification TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  manager_approved_at TIMESTAMPTZ,
  manager_approval_notes TEXT,
  
  -- Pattern Detection
  persistent_issues JSONB, -- Issues that appeared in multiple attempts
  content_pattern_detected TEXT, -- Pattern analysis result
  
  -- Timing
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES: Performance optimization
-- ============================================================================
CREATE INDEX idx_enforcement_user_form ON enforcement_log(user_id, form_type, form_id);
CREATE INDEX idx_enforcement_attempt ON enforcement_log(form_id, attempt_number);
CREATE INDEX idx_enforcement_timestamp ON enforcement_log(timestamp DESC);
CREATE INDEX idx_enforcement_level ON enforcement_log(enforcement_level);
CREATE INDEX idx_enforcement_manager_approval ON enforcement_log(manager_approval_requested, manager_approved_at);

-- ============================================================================
-- FUNCTION: log_enforcement_action()
-- Purpose: Log an enforcement action for audit and pattern analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION log_enforcement_action(
  p_form_type TEXT,
  p_form_id UUID,
  p_user_id UUID,
  p_attempt_number INTEGER,
  p_enforcement_level TEXT,
  p_validation_result JSONB,
  p_issues_found JSONB,
  p_action_taken TEXT,
  p_requirements_missing JSONB DEFAULT NULL,
  p_errors_blocking JSONB DEFAULT NULL,
  p_manager_approval_requested BOOLEAN DEFAULT FALSE,
  p_justification TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  previous_attempts INTEGER;
  persistent_issues JSONB;
BEGIN
  -- Count previous attempts for this form
  SELECT COUNT(*) INTO previous_attempts
  FROM enforcement_log
  WHERE form_id = p_form_id AND user_id = p_user_id;
  
  -- Detect persistent issues (appeared in previous attempts)
  IF previous_attempts > 0 THEN
    WITH previous_issues AS (
      SELECT jsonb_array_elements(issues_found) AS issue
      FROM enforcement_log
      WHERE form_id = p_form_id AND user_id = p_user_id
    ),
    current_issues AS (
      SELECT jsonb_array_elements(p_issues_found) AS issue
    )
    SELECT jsonb_agg(DISTINCT ci.issue) INTO persistent_issues
    FROM current_issues ci
    INNER JOIN previous_issues pi ON ci.issue->>'field' = pi.issue->>'field'
      AND ci.issue->>'message' = pi.issue->>'message';
  END IF;
  
  -- Insert enforcement log entry
  INSERT INTO enforcement_log (
    form_type,
    form_id,
    user_id,
    attempt_number,
    enforcement_level,
    validation_result,
    issues_found,
    requirements_missing,
    errors_blocking,
    action_taken,
    manager_approval_requested,
    manager_approval_justification,
    persistent_issues
  ) VALUES (
    p_form_type,
    p_form_id,
    p_user_id,
    p_attempt_number,
    p_enforcement_level,
    p_validation_result,
    p_issues_found,
    p_requirements_missing,
    p_errors_blocking,
    p_action_taken,
    p_manager_approval_requested,
    p_justification,
    persistent_issues
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: get_user_enforcement_pattern()
-- Purpose: Analyze user's enforcement pattern for management reporting
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_enforcement_pattern(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_attempts BIGINT,
  average_attempts_per_form NUMERIC,
  frequent_issues JSONB,
  escalation_triggered_count BIGINT,
  last_attempt_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_attempts,
    CASE
      WHEN COUNT(DISTINCT form_id) > 0
      THEN COUNT(*)::NUMERIC / COUNT(DISTINCT form_id)
      ELSE COUNT(*)::NUMERIC
    END AS average_attempts_per_form,
    (
      SELECT jsonb_agg(jsonb_build_object('field', field, 'count', count))
      FROM (
        SELECT
          issue->>'field' AS field,
          COUNT(*) AS count
        FROM enforcement_log,
        jsonb_array_elements(issues_found) AS issue
        WHERE user_id = p_user_id
          AND timestamp >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY issue->>'field'
        ORDER BY count DESC
        LIMIT 5
      ) AS top_issues
    ) AS frequent_issues,
    COUNT(*) FILTER (WHERE enforcement_level = 'manager-approval')::BIGINT AS escalation_triggered_count,
    MAX(timestamp) AS last_attempt_date
  FROM enforcement_log
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: record_manager_approval()
-- Purpose: Record manager approval decision
-- ============================================================================
CREATE OR REPLACE FUNCTION record_manager_approval(
  p_log_id UUID,
  p_manager_id UUID,
  p_approved BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE enforcement_log
  SET
    manager_id = p_manager_id,
    manager_approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END,
    manager_approval_notes = p_notes,
    action_taken = CASE WHEN p_approved THEN 'submission_allowed' ELSE 'submission_blocked' END
  WHERE id = p_log_id
    AND manager_approval_requested = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE enforcement_log IS 
  'Tracks validation attempts and enforcement actions for adaptive quality control. Supports progressive escalation and pattern detection.';

COMMENT ON FUNCTION log_enforcement_action IS 
  'Logs an enforcement action with validation results. Automatically detects persistent issues across attempts.';

COMMENT ON FUNCTION get_user_enforcement_pattern IS 
  'Analyzes user enforcement patterns for management reporting. Returns statistics on attempts, frequent issues, and escalations.';

COMMENT ON FUNCTION record_manager_approval IS 
  'Records manager approval decision for submissions requiring approval. Updates action_taken and approval timestamp.';

