-- OHiSee NCA/MJC System - NCAs Table
-- BRCGS Compliance: Non-Conformance Advice Register
-- All 11 sections from MANIFEST
-- Audit trail, traceability, data integrity

-- =============================================================================
-- TABLE: ncas (Non-Conformance Advice Register)
-- Purpose: Digital register for all non-conformances with full traceability
-- BRCGS: 3.9 Traceability, 5.7 Non-Conforming Product Control
-- =============================================================================
CREATE TABLE ncas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nca_number TEXT UNIQUE NOT NULL DEFAULT generate_nca_number(),

  -- Foreign Keys (Traceability)
  wo_id UUID REFERENCES work_orders(id) ON DELETE RESTRICT,
  raised_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Section 1: NCA Identification (Auto-populated)
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'HH24:MI'),

  -- Section 2: NC Classification
  nc_type TEXT NOT NULL CHECK (nc_type IN (
    'raw-material',
    'finished-goods',
    'wip',
    'incident',
    'other'
  )),
  nc_type_other TEXT,

  -- Section 3: Supplier & Product Information
  supplier_name TEXT,
  nc_product_description TEXT NOT NULL,
  supplier_wo_batch TEXT,
  supplier_reel_box TEXT,
  sample_available BOOLEAN NOT NULL DEFAULT false,
  quantity NUMERIC(10, 2),
  quantity_unit TEXT CHECK (quantity_unit IN ('kg', 'units', 'meters', 'boxes', 'pallets')),
  carton_numbers TEXT,

  -- Section 4: NC Description (Minimum 100 characters)
  nc_description TEXT NOT NULL,

  -- Section 5: Machine Status (BRCGS CRITICAL - Production Impact)
  machine_status TEXT NOT NULL CHECK (machine_status IN ('down', 'operational')),
  machine_down_since TIMESTAMPTZ,
  estimated_downtime INTEGER, -- minutes

  -- Section 6: Out of Spec Concession
  concession_team_leader TEXT,
  concession_signature JSONB, -- {type: 'login', name, timestamp, ip}
  concession_notes TEXT,

  -- Section 7: Immediate Correction
  cross_contamination BOOLEAN NOT NULL DEFAULT false,
  back_tracking_person TEXT,
  back_tracking_signature JSONB,
  back_tracking_completed BOOLEAN DEFAULT false,
  hold_label_completed BOOLEAN NOT NULL DEFAULT false,
  nca_logged BOOLEAN NOT NULL DEFAULT true,

  -- Section 8: Disposition
  disposition_reject BOOLEAN DEFAULT false,
  disposition_credit BOOLEAN DEFAULT false,
  disposition_uplift BOOLEAN DEFAULT false,
  disposition_rework BOOLEAN DEFAULT false,
  disposition_concession BOOLEAN DEFAULT false,
  disposition_discard BOOLEAN DEFAULT false,
  rework_instruction TEXT,
  disposition_authorized_by TEXT,
  disposition_signature JSONB,

  -- Section 9: Root Cause Analysis
  root_cause_analysis TEXT,
  root_cause_attachments JSONB, -- [{filename, url, size, type}]

  -- Section 10: Corrective Action
  corrective_action TEXT,
  corrective_action_attachments JSONB,

  -- Section 11: Close Out (QA/Management only)
  close_out_by TEXT,
  close_out_signature JSONB,
  close_out_date DATE,

  -- System Fields
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'under-review',
    'closed'
  )),

  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  submitted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT nca_description_min_length CHECK (char_length(nc_description) >= 100),
  CONSTRAINT nca_machine_down_requires_timestamp CHECK (
    machine_status = 'operational' OR machine_down_since IS NOT NULL
  ),
  CONSTRAINT nca_cross_contamination_requires_tracking CHECK (
    cross_contamination = false OR (
      back_tracking_person IS NOT NULL AND
      back_tracking_signature IS NOT NULL AND
      back_tracking_completed = true
    )
  ),
  CONSTRAINT nca_rework_requires_instruction CHECK (
    disposition_rework = false OR rework_instruction IS NOT NULL
  ),
  CONSTRAINT nca_closed_requires_closeout CHECK (
    status != 'closed' OR (
      close_out_by IS NOT NULL AND
      close_out_signature IS NOT NULL AND
      close_out_date IS NOT NULL
    )
  ),
  CONSTRAINT nca_nc_type_other_required CHECK (
    nc_type != 'other' OR nc_type_other IS NOT NULL
  )
);

-- =============================================================================
-- INDEXES: Performance optimization
-- =============================================================================
CREATE INDEX idx_nca_number ON ncas(nca_number);
CREATE INDEX idx_nca_status ON ncas(status);
CREATE INDEX idx_nca_wo_id ON ncas(wo_id);
CREATE INDEX idx_nca_raised_by_user_id ON ncas(raised_by_user_id);
CREATE INDEX idx_nca_created_by ON ncas(created_by);
CREATE INDEX idx_nca_created_at ON ncas(created_at DESC);
CREATE INDEX idx_nca_date ON ncas(date DESC);
CREATE INDEX idx_nca_machine_status ON ncas(machine_status) WHERE machine_status = 'down';
CREATE INDEX idx_nca_nc_type ON ncas(nc_type);
CREATE INDEX idx_nca_cross_contamination ON ncas(cross_contamination) WHERE cross_contamination = true;

-- Partial indexes for active records (optimization)
CREATE INDEX idx_nca_active_drafts ON ncas(created_at DESC) WHERE status = 'draft';
CREATE INDEX idx_nca_under_review ON ncas(submitted_at DESC) WHERE status = 'under-review';

-- =============================================================================
-- TRIGGER: Auto-update updated_at
-- =============================================================================
CREATE TRIGGER ncas_updated_at
  BEFORE UPDATE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TRIGGER: Set submitted_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION set_nca_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    NEW.submitted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nca_set_submitted_at
  BEFORE UPDATE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION set_nca_submitted_at();

-- =============================================================================
-- TRIGGER: Set closed_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION set_nca_closed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'closed' AND NEW.status = 'closed' THEN
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nca_set_closed_at
  BEFORE UPDATE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION set_nca_closed_at();

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON TABLE ncas IS 'BRCGS-compliant Non-Conformance Advice register with full traceability';
COMMENT ON COLUMN ncas.nca_number IS 'Auto-generated format: NCA-YYYY-########';
COMMENT ON COLUMN ncas.machine_status IS 'CRITICAL: Triggers alert if "down"';
COMMENT ON COLUMN ncas.cross_contamination IS 'CRITICAL: Requires mandatory back tracking if true';
COMMENT ON COLUMN ncas.status IS 'draft → submitted → under-review → closed';
COMMENT ON COLUMN ncas.nc_description IS 'Minimum 100 characters required for BRCGS compliance';
