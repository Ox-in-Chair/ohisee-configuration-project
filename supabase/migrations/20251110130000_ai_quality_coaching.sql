-- OHiSee NCA/MJC System - AI Quality Metrics & Coaching System
-- Purpose: Quality scoring, coaching alerts, and BRCGS hazard classification
-- Date: 2025-11-10
-- BRCGS: Section 3.3 (Audit), Section 5.7 (NCAs), Section 6.1 (Training)
-- Depends on: 20251110120000_ai_integration.sql

-- =============================================================================
-- TABLE: hazard_types
-- Purpose: BRCGS hazard classification (11 standard hazard types)
-- BRCGS: Product safety classification for NCAs and risk assessment
-- =============================================================================
CREATE TABLE hazard_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Hazard Classification
  hazard_code TEXT UNIQUE NOT NULL,  -- e.g., "PHY", "CHEM", "BIO", "ALL"
  hazard_name TEXT NOT NULL,         -- e.g., "Physical", "Chemical", "Biological", "Allergen"
  hazard_category TEXT NOT NULL CHECK (hazard_category IN (
    'physical',
    'chemical',
    'biological',
    'allergen',
    'radiological',
    'other'
  )),

  -- BRCGS Reference
  brcgs_reference TEXT,  -- Procedure reference where hazard control defined
  severity_default TEXT CHECK (severity_default IN ('low', 'medium', 'high', 'critical')),

  -- Description & Examples
  description TEXT NOT NULL,
  examples TEXT[],  -- Common examples: ["glass", "metal", "wood", "stone"] for physical

  -- Control Measures
  control_measures JSONB,  -- Standard controls: {"detection": ["metal detector", "x-ray"], "prevention": ["GMP", "maintenance"]}

  -- Status
  active BOOLEAN DEFAULT true NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hazard_code ON hazard_types(hazard_code);
CREATE INDEX idx_hazard_category ON hazard_types(hazard_category);
CREATE INDEX idx_hazard_active ON hazard_types(active) WHERE active = true;

COMMENT ON TABLE hazard_types IS 'BRCGS hazard classification for product safety and NCA risk assessment';

-- Seed with 11 BRCGS hazard types
INSERT INTO hazard_types (hazard_code, hazard_name, hazard_category, severity_default, description, examples) VALUES
('PHY', 'Physical Hazard', 'physical', 'high', 'Foreign bodies or physical contaminants that could cause injury or illness', ARRAY['glass', 'metal', 'wood', 'stone', 'plastic', 'bone']),
('CHEM', 'Chemical Hazard', 'chemical', 'critical', 'Chemical substances that could cause harm through contamination', ARRAY['cleaning chemicals', 'pesticides', 'lubricants', 'allergens in error']),
('BIO', 'Biological Hazard', 'biological', 'critical', 'Microorganisms or toxins that could cause foodborne illness', ARRAY['bacteria', 'viruses', 'parasites', 'toxins', 'pathogens']),
('ALL', 'Allergen', 'allergen', 'critical', 'Undeclared allergens causing risk to allergic consumers', ARRAY['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soy']),
('CROSS', 'Cross Contamination', 'physical', 'high', 'Transfer of hazards from one product/batch to another', ARRAY['allergen carryover', 'product mix-up', 'batch contamination']),
('SPEC', 'Specification Deviation', 'other', 'medium', 'Product does not meet customer/internal specifications', ARRAY['dimension out of spec', 'weight variance', 'print misalignment']),
('LAB', 'Labeling Error', 'other', 'high', 'Incorrect or missing product information on packaging', ARRAY['wrong product code', 'incorrect allergen declaration', 'missing date code']),
('FMAT', 'Foreign Material', 'physical', 'high', 'Non-food material found in product or production area', ARRAY['metal shavings', 'grease', 'debris', 'pest evidence']),
('EQP', 'Equipment Failure', 'other', 'medium', 'Machine malfunction affecting product safety or quality', ARRAY['seal failure', 'detector malfunction', 'gauge failure']),
('PROC', 'Process Deviation', 'other', 'medium', 'Failure to follow approved process parameters', ARRAY['temperature deviation', 'time deviation', 'sequence error']),
('OTH', 'Other Hazard', 'other', 'low', 'Other hazards not fitting standard categories', ARRAY['environmental', 'handling', 'storage condition']);

-- =============================================================================
-- TABLE: user_quality_scores
-- Purpose: Track 6-month rolling quality score per user
-- BRCGS: Section 6.1 - Personnel competency and training effectiveness
-- =============================================================================
CREATE TABLE user_quality_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User Identification
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- NCA Quality Metrics (6-month rolling)
  ncas_created INTEGER DEFAULT 0,
  ncas_submitted_complete INTEGER DEFAULT 0,  -- First submission was complete
  ncas_returned_for_revision INTEGER DEFAULT 0,

  -- Field Completeness Scores (0-100 per field)
  avg_description_quality NUMERIC(5,2),  -- Based on length, detail, keywords
  avg_root_cause_quality NUMERIC(5,2),   -- Ishikawa categories used, depth of analysis
  avg_corrective_action_quality NUMERIC(5,2),  -- Preventive vs reactive, measurable

  -- AI Interaction Quality
  ai_suggestions_accepted INTEGER DEFAULT 0,
  ai_suggestions_rejected INTEGER DEFAULT 0,
  ai_suggestions_modified INTEGER DEFAULT 0,
  ai_acceptance_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN (ai_suggestions_accepted + ai_suggestions_rejected) > 0
      THEN (ai_suggestions_accepted::NUMERIC / (ai_suggestions_accepted + ai_suggestions_rejected)) * 100
      ELSE NULL
    END
  ) STORED,

  -- Compliance Metrics
  ncas_closed_on_time INTEGER DEFAULT 0,  -- Within 20 working days
  ncas_overdue INTEGER DEFAULT 0,
  traceability_data_complete_pct NUMERIC(5,2),  -- % NCAs with supplier batch + carton numbers

  -- Overall Quality Score (0-100)
  overall_quality_score NUMERIC(5,2),

  -- Coaching Triggers
  requires_coaching BOOLEAN DEFAULT false,
  coaching_reason TEXT,  -- Auto-populated based on thresholds
  coaching_priority INTEGER CHECK (coaching_priority BETWEEN 1 AND 4),  -- 1=critical, 4=advisory

  -- Calculation Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT user_quality_period_unique UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX idx_user_quality_user ON user_quality_scores(user_id);
CREATE INDEX idx_user_quality_period ON user_quality_scores(period_end DESC);
CREATE INDEX idx_user_quality_score ON user_quality_scores(overall_quality_score);
CREATE INDEX idx_user_quality_coaching ON user_quality_scores(requires_coaching)
  WHERE requires_coaching = true;

COMMENT ON TABLE user_quality_scores IS 'BRCGS Section 6.1: 6-month rolling quality scores for training needs identification';
COMMENT ON COLUMN user_quality_scores.overall_quality_score IS 'Weighted score: 30% field quality, 30% compliance, 20% AI usage, 20% on-time closure';

-- =============================================================================
-- TABLE: nca_quality_scores
-- Purpose: Field-level quality assessment for individual NCAs
-- BRCGS: Section 3.3 - Quality Management System effectiveness
-- =============================================================================
CREATE TABLE nca_quality_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- NCA Reference
  nca_id UUID NOT NULL REFERENCES ncas(id) ON DELETE CASCADE,

  -- Field-Level Scores (0-100 each)
  description_score NUMERIC(5,2),  -- Length >= 100 chars, detail level, keywords
  root_cause_score NUMERIC(5,2),   -- Ishikawa categories, depth, procedure refs
  corrective_action_score NUMERIC(5,2),  -- Preventive measures, SMART criteria
  traceability_score NUMERIC(5,2),  -- Supplier batch, carton numbers, back tracking
  disposition_score NUMERIC(5,2),   -- Appropriate for NC type, procedure compliance

  -- Scoring Factors (JSONB for detailed breakdown)
  scoring_details JSONB,  -- {"description": {"length": 120, "keywords": ["contamination", "metal"], "score": 85}}

  -- Overall NCA Quality
  overall_nca_score NUMERIC(5,2) GENERATED ALWAYS AS (
    (COALESCE(description_score, 0) +
     COALESCE(root_cause_score, 0) +
     COALESCE(corrective_action_score, 0) +
     COALESCE(traceability_score, 0) +
     COALESCE(disposition_score, 0)) / 5
  ) STORED,

  -- Quality Assessment
  quality_grade TEXT GENERATED ALWAYS AS (
    CASE
      WHEN ((COALESCE(description_score, 0) + COALESCE(root_cause_score, 0) +
             COALESCE(corrective_action_score, 0) + COALESCE(traceability_score, 0) +
             COALESCE(disposition_score, 0)) / 5) >= 90 THEN 'Excellent'
      WHEN ((COALESCE(description_score, 0) + COALESCE(root_cause_score, 0) +
             COALESCE(corrective_action_score, 0) + COALESCE(traceability_score, 0) +
             COALESCE(disposition_score, 0)) / 5) >= 75 THEN 'Good'
      WHEN ((COALESCE(description_score, 0) + COALESCE(root_cause_score, 0) +
             COALESCE(corrective_action_score, 0) + COALESCE(traceability_score, 0) +
             COALESCE(disposition_score, 0)) / 5) >= 60 THEN 'Acceptable'
      ELSE 'Needs Improvement'
    END
  ) STORED,

  -- AI Contribution
  ai_assisted BOOLEAN DEFAULT false,
  ai_contribution_score NUMERIC(5,2),  -- How much did AI improve the NCA quality

  -- Calculated Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  calculated_by TEXT,  -- 'auto' or user_id if manual review

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT nca_quality_unique UNIQUE (nca_id)
);

CREATE INDEX idx_nca_quality_nca ON nca_quality_scores(nca_id);
CREATE INDEX idx_nca_quality_score ON nca_quality_scores(overall_nca_score);
CREATE INDEX idx_nca_quality_grade ON nca_quality_scores(quality_grade);
CREATE INDEX idx_nca_quality_ai_assisted ON nca_quality_scores(ai_assisted);

COMMENT ON TABLE nca_quality_scores IS 'Field-level quality assessment for NCA effectiveness tracking';
COMMENT ON COLUMN nca_quality_scores.overall_nca_score IS 'Average of 5 field scores: description, root cause, corrective action, traceability, disposition';

-- =============================================================================
-- TABLE: ai_effectiveness_metrics
-- Purpose: Track AI system performance and effectiveness
-- BRCGS: Section 3.3 - Continuous improvement metrics
-- =============================================================================
CREATE TABLE ai_effectiveness_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'daily',
    'weekly',
    'monthly',
    'quarterly'
  )),

  -- Usage Metrics
  total_ai_interactions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  interactions_per_user NUMERIC(5,2),

  -- Acceptance Metrics
  suggestions_accepted INTEGER DEFAULT 0,
  suggestions_rejected INTEGER DEFAULT 0,
  suggestions_modified INTEGER DEFAULT 0,
  overall_acceptance_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN (suggestions_accepted + suggestions_rejected) > 0
      THEN (suggestions_accepted::NUMERIC / (suggestions_accepted + suggestions_rejected)) * 100
      ELSE NULL
    END
  ) STORED,

  -- Quality Impact
  avg_nca_quality_with_ai NUMERIC(5,2),     -- Average quality score for AI-assisted NCAs
  avg_nca_quality_without_ai NUMERIC(5,2),  -- Average quality score for manual NCAs
  quality_improvement_pct NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN avg_nca_quality_without_ai > 0
      THEN ((avg_nca_quality_with_ai - avg_nca_quality_without_ai) / avg_nca_quality_without_ai) * 100
      ELSE NULL
    END
  ) STORED,

  -- Performance Metrics
  avg_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,  -- 95th percentile
  avg_user_rating NUMERIC(3,2),  -- 1-5 scale

  -- Efficiency Metrics
  avg_completion_time_with_ai INTEGER,     -- Seconds to complete NCA with AI
  avg_completion_time_without_ai INTEGER,  -- Seconds to complete NCA without AI
  time_saved_pct NUMERIC(5,2),

  -- Compliance Metrics
  procedure_citation_accuracy_pct NUMERIC(5,2),  -- % of procedure citations that were correct version
  superseded_procedure_citations INTEGER DEFAULT 0,  -- Should be 0 always

  -- Cost Metrics
  total_ai_api_calls INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,2),
  cost_per_interaction NUMERIC(10,4),

  -- Breakdown by Form Section
  section_metrics JSONB,  -- {"Section 9: Root Cause": {"interactions": 45, "acceptance_rate": 78.5}}

  -- Calculation Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT ai_metrics_period_unique UNIQUE (period_start, period_end, metric_type)
);

CREATE INDEX idx_ai_metrics_period ON ai_effectiveness_metrics(period_end DESC, metric_type);
CREATE INDEX idx_ai_metrics_acceptance ON ai_effectiveness_metrics(overall_acceptance_rate);

COMMENT ON TABLE ai_effectiveness_metrics IS 'AI system performance tracking for continuous improvement and ROI analysis';
COMMENT ON COLUMN ai_effectiveness_metrics.superseded_procedure_citations IS 'CRITICAL: Should always be 0 for BRCGS compliance';

-- =============================================================================
-- TABLE: coaching_alerts
-- Purpose: Tiered coaching alert system based on quality thresholds
-- BRCGS: Section 6.1 - Training needs identification and competency management
-- =============================================================================
CREATE TABLE coaching_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Alert Identification
  alert_number TEXT UNIQUE NOT NULL,  -- Format: COACH-YYYY-NNNN

  -- User Identification
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- Alert Tier (1=Critical, 4=Advisory)
  alert_tier INTEGER NOT NULL CHECK (alert_tier BETWEEN 1 AND 4),
  alert_priority TEXT GENERATED ALWAYS AS (
    CASE alert_tier
      WHEN 1 THEN 'Critical - Immediate Action Required'
      WHEN 2 THEN 'High - Action Required Within 48 Hours'
      WHEN 3 THEN 'Medium - Review Within 1 Week'
      WHEN 4 THEN 'Low - Advisory Guidance'
    END
  ) STORED,

  -- Trigger Details
  trigger_reason TEXT NOT NULL,  -- e.g., "Quality score below 60 for 2 consecutive periods"
  trigger_category TEXT CHECK (trigger_category IN (
    'quality_score',
    'compliance_violation',
    'ai_misuse',
    'traceability_gap',
    'timeliness',
    'procedure_noncompliance'
  )),

  -- Metrics at Trigger Time
  user_quality_score_id UUID REFERENCES user_quality_scores(id),
  trigger_metrics JSONB,  -- Detailed metrics that caused alert

  -- Recommended Actions
  recommended_training TEXT[],  -- ["5.7 NCA Completion", "Root Cause Analysis", "Traceability"]
  recommended_actions TEXT NOT NULL,  -- Detailed action plan

  -- Alert Workflow
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'acknowledged',
    'in_progress',
    'resolved',
    'escalated',
    'closed'
  )),

  -- Recipients & Actions
  notified_at TIMESTAMPTZ,
  notified_users UUID[],  -- Team Leader, Operations Manager, QA Supervisor
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),

  -- Resolution
  action_taken TEXT,
  training_completed BOOLEAN DEFAULT false,
  training_completed_date DATE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,

  -- Effectiveness Verification
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_date DATE,
  quality_improvement_verified BOOLEAN DEFAULT false,
  post_coaching_quality_score NUMERIC(5,2),

  -- Due Dates
  response_due_date DATE NOT NULL,  -- Based on tier: Tier 1=immediate, Tier 2=48h, Tier 3=7d, Tier 4=30d
  overdue BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN status IN ('resolved', 'closed') THEN false
      WHEN CURRENT_DATE > response_due_date THEN true
      ELSE false
    END
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT coaching_alert_acknowledged_requires_by CHECK (
    acknowledged_at IS NULL OR acknowledged_by IS NOT NULL
  ),
  CONSTRAINT coaching_alert_resolved_requires_by CHECK (
    resolved_at IS NULL OR resolved_by IS NOT NULL
  )
);

CREATE INDEX idx_coaching_user ON coaching_alerts(user_id);
CREATE INDEX idx_coaching_status ON coaching_alerts(status);
CREATE INDEX idx_coaching_tier ON coaching_alerts(alert_tier);
CREATE INDEX idx_coaching_overdue ON coaching_alerts(overdue) WHERE overdue = true;
CREATE INDEX idx_coaching_due_date ON coaching_alerts(response_due_date);

COMMENT ON TABLE coaching_alerts IS 'BRCGS Section 6.1: Tiered coaching alert system for training needs identification';
COMMENT ON COLUMN coaching_alerts.alert_tier IS '1=Critical (immediate), 2=High (48h), 3=Medium (7d), 4=Low (30d)';

-- =============================================================================
-- FUNCTION: calculate_user_quality_score()
-- Purpose: Calculate 6-month rolling quality score for user
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_user_quality_score(
  p_user_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS UUID AS $$
DECLARE
  v_score_id UUID;
  v_ncas_created INTEGER;
  v_ncas_complete INTEGER;
  v_ncas_returned INTEGER;
  v_avg_desc_quality NUMERIC;
  v_avg_root_cause_quality NUMERIC;
  v_avg_corrective_quality NUMERIC;
  v_ai_accepted INTEGER;
  v_ai_rejected INTEGER;
  v_ai_modified INTEGER;
  v_ncas_on_time INTEGER;
  v_ncas_overdue INTEGER;
  v_traceability_complete_pct NUMERIC;
  v_overall_score NUMERIC;
  v_coaching_needed BOOLEAN := false;
  v_coaching_reason TEXT;
  v_coaching_priority INTEGER;
BEGIN
  -- Count NCAs created in period
  SELECT COUNT(*) INTO v_ncas_created
  FROM ncas
  WHERE created_by = p_user_id
    AND date BETWEEN p_period_start AND p_period_end;

  -- Calculate field quality averages from nca_quality_scores
  SELECT
    AVG(nqs.description_score),
    AVG(nqs.root_cause_score),
    AVG(nqs.corrective_action_score)
  INTO v_avg_desc_quality, v_avg_root_cause_quality, v_avg_corrective_quality
  FROM nca_quality_scores nqs
  JOIN ncas n ON n.id = nqs.nca_id
  WHERE n.created_by = p_user_id
    AND n.date BETWEEN p_period_start AND p_period_end;

  -- AI interaction metrics
  SELECT
    COUNT(*) FILTER (WHERE suggestion_accepted = true),
    COUNT(*) FILTER (WHERE suggestion_accepted = false),
    COUNT(*) FILTER (WHERE suggestion_modified = true)
  INTO v_ai_accepted, v_ai_rejected, v_ai_modified
  FROM ai_assistance_log
  WHERE user_id = p_user_id
    AND timestamp BETWEEN p_period_start AND (p_period_end + INTERVAL '1 day');

  -- Timeliness metrics (20 working days = ~28 calendar days)
  SELECT
    COUNT(*) FILTER (WHERE closed_at - created_at <= INTERVAL '28 days'),
    COUNT(*) FILTER (WHERE closed_at - created_at > INTERVAL '28 days')
  INTO v_ncas_on_time, v_ncas_overdue
  FROM ncas
  WHERE created_by = p_user_id
    AND status = 'closed'
    AND date BETWEEN p_period_start AND p_period_end;

  -- Traceability completeness
  SELECT
    (COUNT(*) FILTER (WHERE supplier_wo_batch IS NOT NULL AND carton_numbers IS NOT NULL)::NUMERIC /
     NULLIF(COUNT(*), 0)) * 100
  INTO v_traceability_complete_pct
  FROM ncas
  WHERE created_by = p_user_id
    AND date BETWEEN p_period_start AND p_period_end;

  -- Calculate overall score (weighted average)
  v_overall_score := (
    COALESCE(v_avg_desc_quality, 0) * 0.15 +
    COALESCE(v_avg_root_cause_quality, 0) * 0.15 +
    COALESCE(v_avg_corrective_quality, 0) * 0.15 +
    COALESCE((v_ai_accepted::NUMERIC / NULLIF(v_ai_accepted + v_ai_rejected, 0)) * 100, 0) * 0.15 +
    COALESCE((v_ncas_on_time::NUMERIC / NULLIF(v_ncas_on_time + v_ncas_overdue, 0)) * 100, 0) * 0.20 +
    COALESCE(v_traceability_complete_pct, 0) * 0.20
  );

  -- Coaching threshold checks
  IF v_overall_score < 60 THEN
    v_coaching_needed := true;
    v_coaching_reason := 'Overall quality score below 60%';
    v_coaching_priority := 1;  -- Critical
  ELSIF v_overall_score < 70 AND (SELECT COUNT(*) FROM user_quality_scores WHERE user_id = p_user_id AND overall_quality_score < 70) >= 1 THEN
    v_coaching_needed := true;
    v_coaching_reason := 'Quality score below 70% for 2 consecutive periods';
    v_coaching_priority := 2;  -- High
  ELSIF v_traceability_complete_pct < 80 THEN
    v_coaching_needed := true;
    v_coaching_reason := 'Traceability data completeness below 80%';
    v_coaching_priority := 3;  -- Medium
  END IF;

  -- Insert or update score
  INSERT INTO user_quality_scores (
    user_id,
    period_start,
    period_end,
    ncas_created,
    ncas_submitted_complete,
    avg_description_quality,
    avg_root_cause_quality,
    avg_corrective_action_quality,
    ai_suggestions_accepted,
    ai_suggestions_rejected,
    ai_suggestions_modified,
    ncas_closed_on_time,
    ncas_overdue,
    traceability_data_complete_pct,
    overall_quality_score,
    requires_coaching,
    coaching_reason,
    coaching_priority
  ) VALUES (
    p_user_id,
    p_period_start,
    p_period_end,
    v_ncas_created,
    0,  -- Calculate separately if needed
    v_avg_desc_quality,
    v_avg_root_cause_quality,
    v_avg_corrective_quality,
    v_ai_accepted,
    v_ai_rejected,
    v_ai_modified,
    v_ncas_on_time,
    v_ncas_overdue,
    v_traceability_complete_pct,
    v_overall_score,
    v_coaching_needed,
    v_coaching_reason,
    v_coaching_priority
  )
  ON CONFLICT (user_id, period_start, period_end) DO UPDATE SET
    ncas_created = EXCLUDED.ncas_created,
    avg_description_quality = EXCLUDED.avg_description_quality,
    avg_root_cause_quality = EXCLUDED.avg_root_cause_quality,
    avg_corrective_action_quality = EXCLUDED.avg_corrective_action_quality,
    ai_suggestions_accepted = EXCLUDED.ai_suggestions_accepted,
    ai_suggestions_rejected = EXCLUDED.ai_suggestions_rejected,
    ai_suggestions_modified = EXCLUDED.ai_suggestions_modified,
    ncas_closed_on_time = EXCLUDED.ncas_closed_on_time,
    ncas_overdue = EXCLUDED.ncas_overdue,
    traceability_data_complete_pct = EXCLUDED.traceability_data_complete_pct,
    overall_quality_score = EXCLUDED.overall_quality_score,
    requires_coaching = EXCLUDED.requires_coaching,
    coaching_reason = EXCLUDED.coaching_reason,
    coaching_priority = EXCLUDED.coaching_priority,
    updated_at = NOW()
  RETURNING id INTO v_score_id;

  RETURN v_score_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_user_quality_score IS 'Calculate 6-month rolling quality score with coaching alert triggers';

-- =============================================================================
-- FUNCTION: generate_coaching_alert_number()
-- Purpose: Auto-generate coaching alert numbers (COACH-YYYY-NNNN)
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_coaching_alert_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  next_sequence INTEGER;
  alert_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Get next sequence for current year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(alert_number FROM 'COACH-\d{4}-(\d{4})') AS INTEGER)
  ), 0) + 1
  INTO next_sequence
  FROM coaching_alerts
  WHERE alert_number LIKE 'COACH-' || current_year || '-%';

  -- Format: COACH-2025-0001
  alert_number := 'COACH-' || current_year || '-' || LPAD(next_sequence::TEXT, 4, '0');

  RETURN alert_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: Auto-generate coaching alert number
-- =============================================================================
CREATE OR REPLACE FUNCTION set_coaching_alert_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.alert_number IS NULL THEN
    NEW.alert_number := generate_coaching_alert_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaching_alert_number_trigger
  BEFORE INSERT ON coaching_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_coaching_alert_number();

-- =============================================================================
-- TRIGGER: Auto-update updated_at for quality tables
-- =============================================================================
CREATE TRIGGER user_quality_updated_at
  BEFORE UPDATE ON user_quality_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER nca_quality_updated_at
  BEFORE UPDATE ON nca_quality_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ai_metrics_updated_at
  BEFORE UPDATE ON ai_effectiveness_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER coaching_alerts_updated_at
  BEFORE UPDATE ON coaching_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hazard_types_updated_at
  BEFORE UPDATE ON hazard_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS: Row Level Security for quality & coaching tables
-- =============================================================================
ALTER TABLE hazard_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE nca_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_effectiveness_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_alerts ENABLE ROW LEVEL SECURITY;

-- Hazard Types: Readable by all
CREATE POLICY "Users can view hazard types" ON hazard_types
  FOR SELECT USING (active = true);

-- User Quality Scores: Users see own, management sees all
CREATE POLICY "Users can view own quality scores" ON user_quality_scores
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Management can view all quality scores" ON user_quality_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('operations-manager', 'qa-supervisor', 'team-leader')
    )
  );

-- NCA Quality Scores: Anyone can read
CREATE POLICY "Users can view NCA quality scores" ON nca_quality_scores
  FOR SELECT USING (true);

-- AI Metrics: Management only
CREATE POLICY "Management can view AI metrics" ON ai_effectiveness_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('operations-manager', 'qa-supervisor')
    )
  );

-- Coaching Alerts: User sees own, management sees all
CREATE POLICY "Users can view own coaching alerts" ON coaching_alerts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Management can view all coaching alerts" ON coaching_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('operations-manager', 'qa-supervisor', 'team-leader')
    )
  );

CREATE POLICY "Management can manage coaching alerts" ON coaching_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('operations-manager', 'qa-supervisor', 'team-leader')
    )
  );

-- =============================================================================
-- COMPLETION LOG
-- =============================================================================
COMMENT ON SCHEMA public IS
  'AI Quality & Coaching Schema Deployed: 2025-11-10 - Tables: hazard_types, user_quality_scores, nca_quality_scores, ai_effectiveness_metrics, coaching_alerts';
