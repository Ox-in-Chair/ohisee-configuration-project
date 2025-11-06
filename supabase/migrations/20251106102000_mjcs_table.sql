-- OHiSee NCA/MJC System - MJCs Table
-- BRCGS Compliance: Maintenance Job Card Register with Hygiene Clearance
-- All 11 sections from MANIFEST including 10-item hygiene checklist
-- Critical: QA-only hygiene clearance signature required before production resume

-- =============================================================================
-- TABLE: mjcs (Maintenance Job Card Register)
-- Purpose: Track all maintenance activities with hygiene clearance workflow
-- BRCGS: 4.10 Maintenance, 5.7 Hygiene Standards, Audit Trail
-- =============================================================================
CREATE TABLE mjcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_number TEXT UNIQUE NOT NULL DEFAULT generate_mjc_number(),

  -- Foreign Keys (Traceability)
  wo_id UUID REFERENCES work_orders(id) ON DELETE RESTRICT,
  raised_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Section 1: Job Card Identification (Auto-populated)
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'HH24:MI'),
  department TEXT NOT NULL CHECK (department IN (
    'pouching',
    'spouting',
    'slitting',
    'warehouse',
    'maintenance'
  )),

  -- Section 2: Machine/Equipment
  machine_equipment TEXT NOT NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,

  -- Section 3: Maintenance Type & Classification
  maintenance_category TEXT NOT NULL CHECK (maintenance_category IN (
    'reactive',
    'planned'
  )),
  maintenance_type_electrical BOOLEAN DEFAULT false,
  maintenance_type_mechanical BOOLEAN DEFAULT false,
  maintenance_type_pneumatical BOOLEAN DEFAULT false,
  maintenance_type_other TEXT,

  -- Section 4: Machine Status & Urgency (BRCGS CRITICAL)
  machine_status TEXT NOT NULL CHECK (machine_status IN ('down', 'operational')),
  urgency TEXT NOT NULL CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
  machine_down_since TIMESTAMPTZ,
  estimated_downtime INTEGER, -- minutes

  -- Section 5: Temporary Repair (14-day close out requirement)
  temporary_repair BOOLEAN NOT NULL DEFAULT false,
  close_out_due_date DATE,

  -- Section 6: Maintenance Description
  description_required TEXT NOT NULL,
  description_attachments JSONB, -- [{filename, url, size, type}]

  -- Section 7: Maintenance Performed (Technician Only)
  maintenance_performed TEXT,
  maintenance_technician TEXT,
  maintenance_signature JSONB, -- {type: 'login', name, timestamp, ip}
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,

  -- Section 8: Additional Comments
  additional_comments TEXT,

  -- Section 9: Hygiene Checklist (BRCGS CRITICAL - 10 items)
  hygiene_checklist JSONB, -- Array of 10 items: [{item, verified: boolean, notes}]
  hygiene_checklist_completed_by TEXT,
  hygiene_checklist_completed_at TIMESTAMPTZ,

  -- Section 10: Hygiene Clearance Signature (QA Only - BRCGS CRITICAL)
  hygiene_clearance_comments TEXT,
  hygiene_clearance_by TEXT,
  hygiene_clearance_signature JSONB,
  hygiene_clearance_at TIMESTAMPTZ,

  -- Section 11: Status & Closure (Read-only)
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'open',
    'assigned',
    'in-progress',
    'awaiting-clearance',
    'closed'
  )),

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  submitted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT mjc_description_min_length CHECK (char_length(description_required) >= 50),
  CONSTRAINT mjc_machine_down_requires_timestamp CHECK (
    machine_status = 'operational' OR machine_down_since IS NOT NULL
  ),
  CONSTRAINT mjc_temporary_repair_requires_due_date CHECK (
    temporary_repair = false OR close_out_due_date IS NOT NULL
  ),
  CONSTRAINT mjc_maintenance_performed_requires_fields CHECK (
    status NOT IN ('in-progress', 'awaiting-clearance', 'closed') OR (
      maintenance_performed IS NOT NULL AND
      maintenance_technician IS NOT NULL AND
      maintenance_signature IS NOT NULL
    )
  ),
  CONSTRAINT mjc_hygiene_clearance_requires_signature CHECK (
    status != 'closed' OR (
      hygiene_clearance_by IS NOT NULL AND
      hygiene_clearance_signature IS NOT NULL AND
      hygiene_clearance_at IS NOT NULL
    )
  ),
  CONSTRAINT mjc_work_timestamps CHECK (
    work_completed_at IS NULL OR work_started_at IS NULL OR work_completed_at > work_started_at
  ),
  CONSTRAINT mjc_at_least_one_maintenance_type CHECK (
    maintenance_type_electrical = true OR
    maintenance_type_mechanical = true OR
    maintenance_type_pneumatical = true OR
    maintenance_type_other IS NOT NULL
  )
);

-- =============================================================================
-- INDEXES: Performance optimization
-- =============================================================================
CREATE INDEX idx_mjc_number ON mjcs(job_card_number);
CREATE INDEX idx_mjc_status ON mjcs(status);
CREATE INDEX idx_mjc_wo_id ON mjcs(wo_id);
CREATE INDEX idx_mjc_raised_by_user_id ON mjcs(raised_by_user_id);
CREATE INDEX idx_mjc_created_by ON mjcs(created_by);
CREATE INDEX idx_mjc_assigned_to ON mjcs(assigned_to);
CREATE INDEX idx_mjc_created_at ON mjcs(created_at DESC);
CREATE INDEX idx_mjc_date ON mjcs(date DESC);
CREATE INDEX idx_mjc_urgency ON mjcs(urgency);
CREATE INDEX idx_mjc_machine_status ON mjcs(machine_status) WHERE machine_status = 'down';
CREATE INDEX idx_mjc_maintenance_category ON mjcs(maintenance_category);
CREATE INDEX idx_mjc_machine_id ON mjcs(machine_id);

-- Partial indexes for workflow states
CREATE INDEX idx_mjc_temporary_repair ON mjcs(close_out_due_date, status)
  WHERE temporary_repair = true AND status != 'closed';
CREATE INDEX idx_mjc_awaiting_clearance ON mjcs(created_at DESC)
  WHERE status = 'awaiting-clearance';
CREATE INDEX idx_mjc_overdue_temporary ON mjcs(close_out_due_date)
  WHERE temporary_repair = true AND status != 'closed' AND close_out_due_date < CURRENT_DATE;

-- =============================================================================
-- TRIGGER: Auto-update updated_at
-- =============================================================================
CREATE TRIGGER mjcs_updated_at
  BEFORE UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TRIGGER: Set submitted_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION set_mjc_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'open' THEN
    NEW.submitted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mjc_set_submitted_at
  BEFORE UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION set_mjc_submitted_at();

-- =============================================================================
-- TRIGGER: Set closed_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION set_mjc_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'closed' AND NEW.status = 'closed' THEN
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mjc_set_closed_at
  BEFORE UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION set_mjc_closed_at();

-- =============================================================================
-- TRIGGER: Auto-calculate temporary repair due date (14 days from today)
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_mjc_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.temporary_repair = true AND NEW.close_out_due_date IS NULL THEN
    NEW.close_out_due_date = CURRENT_DATE + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mjc_calculate_due_date
  BEFORE INSERT OR UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_mjc_due_date();

-- =============================================================================
-- FUNCTION: Validate hygiene checklist (all 10 items must be verified)
-- BRCGS CRITICAL: Cannot grant clearance unless ALL items verified
-- =============================================================================
CREATE OR REPLACE FUNCTION validate_hygiene_checklist(checklist JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  item JSONB;
  verified_count INTEGER := 0;
BEGIN
  IF checklist IS NULL THEN
    RETURN false;
  END IF;

  -- Count verified items
  FOR item IN SELECT * FROM jsonb_array_elements(checklist)
  LOOP
    IF (item->>'verified')::BOOLEAN = true THEN
      verified_count := verified_count + 1;
    END IF;
  END LOOP;

  -- All 10 items must be verified
  RETURN verified_count = 10;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_hygiene_checklist IS 'BRCGS CRITICAL: Validates all 10 hygiene checklist items are verified';

-- =============================================================================
-- TRIGGER: Prevent hygiene clearance if checklist incomplete
-- =============================================================================
CREATE OR REPLACE FUNCTION prevent_incomplete_clearance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND NEW.hygiene_clearance_signature IS NOT NULL THEN
    IF NOT validate_hygiene_checklist(NEW.hygiene_checklist) THEN
      RAISE EXCEPTION 'BRCGS VIOLATION: Cannot grant hygiene clearance - all 10 checklist items must be verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mjc_prevent_incomplete_clearance
  BEFORE UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_incomplete_clearance();

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON TABLE mjcs IS 'BRCGS-compliant Maintenance Job Card register with hygiene clearance workflow';
COMMENT ON COLUMN mjcs.job_card_number IS 'Auto-generated format: MJC-YYYY-########';
COMMENT ON COLUMN mjcs.machine_status IS 'CRITICAL: Triggers alert if "down" + urgency "critical"';
COMMENT ON COLUMN mjcs.urgency IS 'critical=<2h, high=<4h, medium=<24h, low=planned';
COMMENT ON COLUMN mjcs.temporary_repair IS 'If true, auto-calculates close_out_due_date = TODAY + 14 days';
COMMENT ON COLUMN mjcs.hygiene_checklist IS 'BRCGS CRITICAL: Array of 10 items, ALL must be verified before clearance';
COMMENT ON COLUMN mjcs.hygiene_clearance_signature IS 'BRCGS CRITICAL: QA-only, required before production resume';
COMMENT ON COLUMN mjcs.status IS 'draft → open → assigned → in-progress → awaiting-clearance → closed';
