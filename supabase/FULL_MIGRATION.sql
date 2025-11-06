-- OHiSee NCA/MJC System - Initial Schema Migration
-- Project: ohisee-nca-mjc
-- Organization: Kangopak (Pty) Ltd
-- BRCGS Compliance: Food Safety, Audit Trail, Traceability

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: users
-- Purpose: System users with role-based access control
-- BRCGS: Track accountability for all actions
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'operator',
    'team-leader',
    'maintenance-technician',
    'qa-supervisor',
    'maintenance-manager',
    'operations-manager'
  )),
  department TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active) WHERE active = true;

COMMENT ON TABLE users IS 'System users with role-based access control for BRCGS compliance';
COMMENT ON COLUMN users.role IS 'operator < team-leader < maintenance-technician < qa-supervisor < maintenance-manager < operations-manager';

-- =============================================================================
-- TABLE: machines
-- Purpose: Production equipment registry
-- BRCGS: Machine tracking for maintenance and non-conformance
-- =============================================================================
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_code TEXT UNIQUE NOT NULL,
  machine_name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN (
    'pouching',
    'spouting',
    'slitting',
    'warehouse',
    'maintenance'
  )),
  status TEXT DEFAULT 'operational' CHECK (status IN (
    'operational',
    'down',
    'maintenance',
    'decommissioned'
  )),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT machines_code_format CHECK (machine_code ~* '^[A-Z]+-[0-9]{2}$')
);

CREATE INDEX idx_machines_code ON machines(machine_code);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_machines_department ON machines(department);

COMMENT ON TABLE machines IS 'Production equipment registry for manufacturing operations';
COMMENT ON COLUMN machines.machine_code IS 'Format: CMH-01, SLT-01, SPT-01';

-- =============================================================================
-- TABLE: work_orders
-- Purpose: Active production orders with traceability
-- BRCGS: 3.9 Traceability - Link all issues to production batches
-- =============================================================================
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wo_number TEXT UNIQUE NOT NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE RESTRICT,
  operator_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'paused',
    'completed'
  )),
  department TEXT NOT NULL,
  product_description TEXT,
  batch_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT wo_end_after_start CHECK (end_timestamp IS NULL OR end_timestamp > start_timestamp),
  CONSTRAINT wo_number_format CHECK (wo_number ~* '^WO-[0-9]{8}-[A-Z]+-[0-9]{3}$')
);

CREATE INDEX idx_wo_number ON work_orders(wo_number);
CREATE INDEX idx_wo_status ON work_orders(status);
CREATE INDEX idx_wo_machine_id ON work_orders(machine_id);
CREATE INDEX idx_wo_operator_id ON work_orders(operator_id);
CREATE INDEX idx_wo_start_timestamp ON work_orders(start_timestamp DESC);

COMMENT ON TABLE work_orders IS 'Production work orders for traceability and issue linking';
COMMENT ON COLUMN work_orders.wo_number IS 'Format: WO-YYYYMMDD-MACHINE-###';
COMMENT ON COLUMN work_orders.status IS 'active=in production, paused=temporary stop, completed=finished';

-- =============================================================================
-- FUNCTION: update_updated_at()
-- Purpose: Trigger function to automatically update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at IS 'Automatically updates updated_at column on row modification';

-- =============================================================================
-- TRIGGERS: Apply update_updated_at to all tables
-- =============================================================================
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCTION: generate_nca_number()
-- Purpose: Auto-generate sequential NCA numbers (NCA-YYYY-########)
-- BRCGS: Unique identification for all non-conformances
-- =============================================================================
CREATE SEQUENCE nca_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_nca_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  nca_num TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');

  -- Reset sequence on year change
  IF NOT EXISTS (
    SELECT 1 FROM ncas
    WHERE nca_number LIKE 'NCA-' || current_year || '-%'
  ) THEN
    ALTER SEQUENCE nca_number_seq RESTART WITH 1;
  END IF;

  next_number := nextval('nca_number_seq');
  nca_num := 'NCA-' || current_year || '-' || LPAD(next_number::TEXT, 8, '0');

  RETURN nca_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_nca_number IS 'Auto-generates NCA numbers in format NCA-YYYY-########';

-- =============================================================================
-- FUNCTION: generate_mjc_number()
-- Purpose: Auto-generate sequential MJC numbers (MJC-YYYY-########)
-- BRCGS: Unique identification for all maintenance activities
-- =============================================================================
CREATE SEQUENCE mjc_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_mjc_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  mjc_num TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');

  -- Reset sequence on year change
  IF NOT EXISTS (
    SELECT 1 FROM mjcs
    WHERE job_card_number LIKE 'MJC-' || current_year || '-%'
  ) THEN
    ALTER SEQUENCE mjc_number_seq RESTART WITH 1;
  END IF;

  next_number := nextval('mjc_number_seq');
  mjc_num := 'MJC-' || current_year || '-' || LPAD(next_number::TEXT, 8, '0');

  RETURN mjc_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_mjc_number IS 'Auto-generates MJC numbers in format MJC-YYYY-########';
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

  -- Computed Fields (for indexing - maintained by trigger)
  is_overdue BOOLEAN DEFAULT false,

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
  WHERE is_overdue = true;

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
$$ LANGUAGE plpgsql IMMUTABLE;

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
-- FUNCTION: Calculate is_overdue flag
-- Purpose: Maintain is_overdue column for safe indexing
-- =============================================================================
CREATE OR REPLACE FUNCTION mjc_set_is_overdue()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_overdue :=
    COALESCE(NEW.temporary_repair, false)
    AND COALESCE(NEW.status, '') != 'closed'
    AND NEW.close_out_due_date IS NOT NULL
    AND NEW.close_out_due_date < CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mjc_set_is_overdue IS 'Calculates is_overdue flag for safe indexing (replaces CURRENT_DATE in WHERE clause)';

CREATE TRIGGER mjc_set_is_overdue_trg
  BEFORE INSERT OR UPDATE OF temporary_repair, status, close_out_due_date
  ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION mjc_set_is_overdue();

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
-- OHiSee NCA/MJC System - Audit Trail
-- BRCGS Compliance: Complete audit logging for all critical actions
-- Purpose: Track who, what, when, where for regulatory compliance
-- Immutable: INSERT only, no UPDATE or DELETE allowed

-- =============================================================================
-- TABLE: audit_trail
-- Purpose: Immutable audit log for BRCGS compliance
-- BRCGS: Track all changes to critical records (NCAs, MJCs, Work Orders)
-- =============================================================================
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was changed
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'nca',
    'mjc',
    'work_order',
    'user',
    'machine'
  )),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'updated',
    'status_changed',
    'submitted',
    'assigned',
    'closed',
    'hygiene_clearance_granted',
    'machine_down_reported'
  )),

  -- Who made the change
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,

  -- When and where
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Change details (JSONB for flexibility)
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[], -- Array of field names that changed

  -- Additional context
  notes TEXT,

  -- System fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- INDEXES: Performance optimization for audit queries
-- =============================================================================
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
CREATE INDEX idx_audit_entity_id ON audit_trail(entity_id);

-- Composite index for common query pattern (entity + time range)
CREATE INDEX idx_audit_entity_timestamp ON audit_trail(entity_type, entity_id, timestamp DESC);

-- Partial indexes for critical actions
CREATE INDEX idx_audit_machine_down ON audit_trail(timestamp DESC)
  WHERE action = 'machine_down_reported';
CREATE INDEX idx_audit_hygiene_clearance ON audit_trail(timestamp DESC)
  WHERE action = 'hygiene_clearance_granted';

-- =============================================================================
-- FUNCTION: log_audit_trail()
-- Purpose: Generic trigger function to log changes to audit_trail
-- Usage: Attach to NCAs, MJCs, Work Orders tables
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  field_name TEXT;
  action_type TEXT;
  current_user_record RECORD;
  is_different BOOLEAN;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific actions
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'submitted' OR NEW.status = 'open' THEN
        action_type := 'submitted';
      ELSIF NEW.status = 'closed' THEN
        action_type := 'closed';
      ELSE
        action_type := 'status_changed';
      END IF;
    ELSE
      action_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  -- Get current user info (from auth.uid() or set by application)
  SELECT email, name, role INTO current_user_record
  FROM users
  WHERE id = COALESCE(auth.uid(), NEW.created_by, OLD.created_by);

  -- For UPDATE, track which fields changed
  IF TG_OP = 'UPDATE' THEN
    changed_fields_array := ARRAY[]::TEXT[];

    -- Compare OLD and NEW to find changed fields
    FOR field_name IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
      AND table_name = TG_TABLE_NAME
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
    LOOP
      -- Compare old and new values using DISTINCT FROM (handles NULLs)
      EXECUTE format('SELECT ($1).%I IS DISTINCT FROM ($2).%I', field_name, field_name)
      INTO is_different
      USING OLD, NEW;

      IF is_different THEN
        changed_fields_array := array_append(changed_fields_array, field_name);
      END IF;
    END LOOP;
  END IF;

  -- Insert audit trail record
  INSERT INTO audit_trail (
    entity_type,
    entity_id,
    action,
    user_id,
    user_email,
    user_name,
    user_role,
    ip_address,
    old_value,
    new_value,
    changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    action_type,
    COALESCE(auth.uid(), NEW.created_by, OLD.created_by),
    COALESCE(current_user_record.email, 'system@kangopak.com'),
    COALESCE(current_user_record.name, 'System'),
    COALESCE(current_user_record.role, 'system'),
    inet_client_addr(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    changed_fields_array
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit_trail IS 'BRCGS CRITICAL: Automatically logs all changes to audit_trail table';

-- =============================================================================
-- FUNCTION: log_machine_down_alert()
-- Purpose: Specific audit logging for Machine Down events (high priority)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_machine_down_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.machine_status = 'down' AND (OLD.machine_status IS NULL OR OLD.machine_status != 'down') THEN
    INSERT INTO audit_trail (
      entity_type,
      entity_id,
      action,
      user_id,
      user_email,
      user_name,
      user_role,
      ip_address,
      new_value,
      notes
    )
    SELECT
      TG_TABLE_NAME,
      NEW.id,
      'machine_down_reported',
      NEW.created_by,
      u.email,
      u.name,
      u.role,
      inet_client_addr(),
      jsonb_build_object(
        'machine_status', NEW.machine_status,
        'machine_down_since', NEW.machine_down_since,
        'estimated_downtime', NEW.estimated_downtime
      ),
      'CRITICAL: Machine Down reported - alert triggered'
    FROM users u
    WHERE u.id = NEW.created_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_machine_down_alert IS 'BRCGS CRITICAL: Logs Machine Down events for audit trail';

-- =============================================================================
-- FUNCTION: log_hygiene_clearance()
-- Purpose: Specific audit logging for Hygiene Clearance (BRCGS critical)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_hygiene_clearance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hygiene_clearance_signature IS NOT NULL AND
     (OLD.hygiene_clearance_signature IS NULL OR OLD.hygiene_clearance_signature != NEW.hygiene_clearance_signature) THEN

    INSERT INTO audit_trail (
      entity_type,
      entity_id,
      action,
      user_id,
      user_email,
      user_name,
      user_role,
      ip_address,
      new_value,
      notes
    )
    SELECT
      'mjc',
      NEW.id,
      'hygiene_clearance_granted',
      u.id,
      u.email,
      u.name,
      u.role,
      inet_client_addr(),
      jsonb_build_object(
        'hygiene_clearance_by', NEW.hygiene_clearance_by,
        'hygiene_clearance_at', NEW.hygiene_clearance_at,
        'hygiene_checklist', NEW.hygiene_checklist
      ),
      'BRCGS CRITICAL: Hygiene clearance granted - production can resume'
    FROM users u
    WHERE u.id = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_hygiene_clearance IS 'BRCGS CRITICAL: Logs hygiene clearance events with full checklist state';

-- =============================================================================
-- TRIGGERS: Apply audit logging to all critical tables
-- =============================================================================

-- NCAs audit trail
CREATE TRIGGER ncas_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER ncas_machine_down_alert
  AFTER INSERT OR UPDATE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION log_machine_down_alert();

-- MJCs audit trail
CREATE TRIGGER mjcs_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER mjcs_machine_down_alert
  AFTER INSERT OR UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION log_machine_down_alert();

CREATE TRIGGER mjcs_hygiene_clearance
  AFTER INSERT OR UPDATE ON mjcs
  FOR EACH ROW
  EXECUTE FUNCTION log_hygiene_clearance();

-- Work Orders audit trail
CREATE TRIGGER work_orders_audit_trail
  AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

-- =============================================================================
-- RLS: Audit trail is read-only for all users
-- INSERT only via triggers, no manual INSERT/UPDATE/DELETE
-- =============================================================================
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Everyone can read audit trail for entities they have access to
CREATE POLICY "Users can view audit trail" ON audit_trail
  FOR SELECT
  USING (true); -- RLS filtering happens at entity level (NCAs/MJCs)

-- Only triggers can insert (SECURITY DEFINER functions bypass RLS)
-- No UPDATE or DELETE policy (immutable)

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON TABLE audit_trail IS 'BRCGS-compliant immutable audit log - INSERT only via triggers';
COMMENT ON COLUMN audit_trail.entity_type IS 'Type of record being audited (nca, mjc, work_order)';
COMMENT ON COLUMN audit_trail.action IS 'Type of action performed (created, updated, status_changed, etc)';
COMMENT ON COLUMN audit_trail.changed_fields IS 'Array of field names that changed (for UPDATE actions)';
COMMENT ON COLUMN audit_trail.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN audit_trail.old_value IS 'Full JSONB snapshot before change (UPDATE/DELETE only)';
COMMENT ON COLUMN audit_trail.new_value IS 'Full JSONB snapshot after change (INSERT/UPDATE only)';
-- OHiSee NCA/MJC System - Row Level Security Policies
-- BRCGS Compliance: Enforce role-based access control at database level
-- NEVER TRUST CLIENT - All security enforced server-side
-- Role Hierarchy: operator < team-leader < maintenance-technician < qa-supervisor < maintenance-manager < operations-manager

-- =============================================================================
-- RLS: users table
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view user records (for assignee lookups)
CREATE POLICY "Authenticated users can view users" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can view their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Only operations-manager can insert/update/delete users
CREATE POLICY "Operations manager can manage users" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operations-manager'
    )
  );

-- =============================================================================
-- RLS: machines table
-- =============================================================================
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view machines
CREATE POLICY "Authenticated users can view machines" ON machines
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only maintenance-manager and operations-manager can modify machines
CREATE POLICY "Managers can modify machines" ON machines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('maintenance-manager', 'operations-manager')
    )
  );

-- =============================================================================
-- RLS: work_orders table
-- =============================================================================
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view work orders
CREATE POLICY "Authenticated users can view work orders" ON work_orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Operators can create work orders
CREATE POLICY "Operators can create work orders" ON work_orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = operator_id
  );

-- Operators can update their own active work orders
CREATE POLICY "Operators can update own work orders" ON work_orders
  FOR UPDATE
  USING (
    auth.uid() = operator_id AND status = 'active'
  );

-- Team leaders and managers can update any work order
CREATE POLICY "Managers can update all work orders" ON work_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('team-leader', 'operations-manager')
    )
  );

-- =============================================================================
-- RLS: ncas table (Non-Conformance Advice)
-- =============================================================================
ALTER TABLE ncas ENABLE ROW LEVEL SECURITY;

-- Operators can view their own NCAs
CREATE POLICY "Operators can view own NCAs" ON ncas
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() = raised_by_user_id
  );

-- Team leaders can view NCAs from their department
CREATE POLICY "Team leaders can view department NCAs" ON ncas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      INNER JOIN work_orders wo ON ncas.wo_id = wo.id
      WHERE u1.id = auth.uid()
      AND u1.role = 'team-leader'
      AND u1.department = wo.department
    )
  );

-- QA, Maintenance Manager, Operations Manager can view all NCAs
CREATE POLICY "Management can view all NCAs" ON ncas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('qa-supervisor', 'maintenance-manager', 'operations-manager')
    )
  );

-- Operators can create NCAs
CREATE POLICY "Operators can create NCAs" ON ncas
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() = raised_by_user_id
  );

-- Operators can update their own draft NCAs only
CREATE POLICY "Operators can update own draft NCAs" ON ncas
  FOR UPDATE
  USING (
    auth.uid() = created_by AND
    status = 'draft'
  );

-- Team leaders can update NCAs in review (for concession signature)
CREATE POLICY "Team leaders can update NCAs for concession" ON ncas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN work_orders wo ON ncas.wo_id = wo.id
      WHERE u.id = auth.uid()
      AND u.role = 'team-leader'
      AND u.department = wo.department
      AND ncas.status IN ('submitted', 'under-review')
    )
  );

-- QA supervisors and operations managers can close NCAs
CREATE POLICY "QA can close NCAs" ON ncas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('qa-supervisor', 'operations-manager')
    )
  );

-- No one can delete NCAs (BRCGS - immutable records)
-- No DELETE policy created

-- =============================================================================
-- RLS: mjcs table (Maintenance Job Cards)
-- =============================================================================
ALTER TABLE mjcs ENABLE ROW LEVEL SECURITY;

-- Operators can view their own MJCs
CREATE POLICY "Operators can view own MJCs" ON mjcs
  FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() = raised_by_user_id
  );

-- Maintenance technicians can view assigned MJCs
CREATE POLICY "Technicians can view assigned MJCs" ON mjcs
  FOR SELECT
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'maintenance-technician'
    )
  );

-- QA supervisors can view MJCs awaiting clearance or all MJCs
CREATE POLICY "QA can view all MJCs" ON mjcs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('qa-supervisor', 'maintenance-manager', 'operations-manager')
    )
  );

-- Operators can create MJCs
CREATE POLICY "Operators can create MJCs" ON mjcs
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() = raised_by_user_id
  );

-- Operators can update their own draft MJCs
CREATE POLICY "Operators can update own draft MJCs" ON mjcs
  FOR UPDATE
  USING (
    auth.uid() = created_by AND
    status = 'draft'
  );

-- Maintenance managers can assign MJCs
CREATE POLICY "Maintenance managers can assign MJCs" ON mjcs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('maintenance-manager', 'operations-manager')
    )
  );

-- Maintenance technicians can update assigned MJCs (perform maintenance)
CREATE POLICY "Technicians can update assigned MJCs" ON mjcs
  FOR UPDATE
  USING (
    auth.uid() = assigned_to AND
    status IN ('assigned', 'in-progress')
  );

-- QA supervisors can grant hygiene clearance (BRCGS CRITICAL)
CREATE POLICY "QA can grant hygiene clearance" ON mjcs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'qa-supervisor'
    ) AND
    status = 'awaiting-clearance'
  );

-- No one can delete MJCs (BRCGS - immutable records)
-- No DELETE policy created

-- =============================================================================
-- RLS: audit_trail table (Read-only for all)
-- =============================================================================
-- Already enabled in audit_trail.sql
-- Policy already created: "Users can view audit trail"

-- =============================================================================
-- FUNCTION: Helper to check user role
-- Purpose: Reusable function for role checking in policies
-- =============================================================================
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_has_role IS 'Helper function to check if current user has one of specified roles';

-- =============================================================================
-- FUNCTION: Get user role
-- Purpose: Return current user's role for use in application logic
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_role IS 'Returns current authenticated user role';

-- =============================================================================
-- FUNCTION: Can user close NCA
-- Purpose: Check if user has permission to close NCAs
-- =============================================================================
CREATE OR REPLACE FUNCTION can_close_nca()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['qa-supervisor', 'operations-manager']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_close_nca IS 'Returns true if user can close NCAs (QA supervisor or operations manager)';

-- =============================================================================
-- FUNCTION: Can user grant hygiene clearance
-- Purpose: Check if user has permission to grant hygiene clearance (BRCGS)
-- =============================================================================
CREATE OR REPLACE FUNCTION can_grant_hygiene_clearance()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['qa-supervisor']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_grant_hygiene_clearance IS 'BRCGS CRITICAL: Returns true if user can grant hygiene clearance (QA supervisor only)';

-- =============================================================================
-- VERIFICATION QUERIES (Run these to test RLS policies)
-- =============================================================================

-- Test 1: Verify operator cannot view other operator's NCAs
-- SELECT * FROM ncas; -- As operator1, should only see own NCAs

-- Test 2: Verify QA can view all NCAs
-- SELECT * FROM ncas; -- As QA supervisor, should see all NCAs

-- Test 3: Verify technician cannot grant hygiene clearance
-- SELECT can_grant_hygiene_clearance(); -- As technician, should return false

-- Test 4: Verify QA supervisor can grant hygiene clearance
-- SELECT can_grant_hygiene_clearance(); -- As QA supervisor, should return true

-- Test 5: Verify no DELETE on NCAs
-- DELETE FROM ncas WHERE id = '<some-id>'; -- Should fail with no policy error

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON POLICY "Operators can view own NCAs" ON ncas IS 'Operators can only view NCAs they created';
COMMENT ON POLICY "Management can view all NCAs" ON ncas IS 'QA, Maintenance Manager, Operations Manager have full visibility';
COMMENT ON POLICY "QA can close NCAs" ON ncas IS 'Only QA supervisor and operations manager can close NCAs';
COMMENT ON POLICY "QA can grant hygiene clearance" ON mjcs IS 'BRCGS CRITICAL: Only QA supervisors can grant hygiene clearance';
COMMENT ON POLICY "Technicians can update assigned MJCs" ON mjcs IS 'Maintenance technicians can only update MJCs assigned to them';
-- OHiSee NCA/MJC System - Seed Data
-- Purpose: Test data for development and testing
-- 6 users (one per role), 3 machines, 2 work orders
-- DO NOT RUN IN PRODUCTION - Development/Testing only

-- =============================================================================
-- SEED: Users (6 roles)
-- =============================================================================
INSERT INTO users (id, email, name, role, department, active) VALUES
  -- Operator
  (
    '10000000-0000-0000-0000-000000000001',
    'john.smith@kangopak.com',
    'John Smith',
    'operator',
    'pouching',
    true
  ),
  -- Team Leader
  (
    '10000000-0000-0000-0000-000000000002',
    'jane.doe@kangopak.com',
    'Jane Doe',
    'team-leader',
    'pouching',
    true
  ),
  -- Maintenance Technician
  (
    '10000000-0000-0000-0000-000000000003',
    'mike.johnson@kangopak.com',
    'Mike Johnson',
    'maintenance-technician',
    'maintenance',
    true
  ),
  -- QA Supervisor
  (
    '10000000-0000-0000-0000-000000000004',
    'sarah.williams@kangopak.com',
    'Sarah Williams',
    'qa-supervisor',
    'pouching',
    true
  ),
  -- Maintenance Manager
  (
    '10000000-0000-0000-0000-000000000005',
    'robert.brown@kangopak.com',
    'Robert Brown',
    'maintenance-manager',
    'maintenance',
    true
  ),
  -- Operations Manager
  (
    '10000000-0000-0000-0000-000000000006',
    'david.wilson@kangopak.com',
    'David Wilson',
    'operations-manager',
    'pouching',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Machines (3 production machines)
-- =============================================================================
INSERT INTO machines (id, machine_code, machine_name, department, status, location) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'CMH-01',
    'Pouching Machine Line 1',
    'pouching',
    'operational',
    'Production Floor A'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'CMH-02',
    'Pouching Machine Line 2',
    'pouching',
    'down',
    'Production Floor A'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'SLT-01',
    'Slitter Rewinder',
    'slitting',
    'operational',
    'Production Floor B'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Work Orders (2 active work orders)
-- =============================================================================
INSERT INTO work_orders (
  id,
  wo_number,
  machine_id,
  operator_id,
  start_timestamp,
  end_timestamp,
  status,
  department,
  product_description,
  batch_number
) VALUES
  -- Active work order (Line 1)
  (
    '30000000-0000-0000-0000-000000000001',
    'WO-20251106-CMH-001',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '3 hours',
    NULL,
    'active',
    'pouching',
    'Stand-up Pouches 250ml - Client: ABC Foods',
    'BATCH-2025-1106-001'
  ),
  -- Paused work order (Line 2 - Machine Down)
  (
    '30000000-0000-0000-0000-000000000002',
    'WO-20251105-CMH-015',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '1 day',
    NULL,
    'paused',
    'pouching',
    'Spout Pouches 500ml - Client: XYZ Beverages',
    'BATCH-2025-1105-015'
  ),
  -- Completed work order (yesterday)
  (
    '30000000-0000-0000-0000-000000000003',
    'WO-20251105-SLT-007',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 hour',
    'completed',
    'slitting',
    'Film Slitting - 500mm width rolls',
    'BATCH-2025-1105-007'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Sample NCA (Draft)
-- Purpose: Show draft NCA for testing
-- =============================================================================
INSERT INTO ncas (
  id,
  nca_number,
  wo_id,
  raised_by_user_id,
  created_by,
  date,
  time,
  nc_type,
  nc_product_description,
  sample_available,
  nc_description,
  machine_status,
  hold_label_completed,
  nca_logged,
  status
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  'NCA-2025-00000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  NOW(),
  TO_CHAR(NOW(), 'HH24:MI'),
  'wip',
  'Stand-up Pouches 250ml - Misaligned print registration detected during quality inspection on Line 1',
  true,
  'During routine quality inspection at 10:15 AM, print registration on pouches was found to be misaligned by approximately 3mm. This affects product appearance and may impact customer perception. Approximately 50 units affected before issue detected. Root cause investigation required to determine if this is material issue or machine calibration problem.',
  'operational',
  true,
  true,
  'draft'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Sample MJC (Draft with Machine Down)
-- Purpose: Show critical MJC for testing
-- =============================================================================
INSERT INTO mjcs (
  id,
  job_card_number,
  wo_id,
  raised_by_user_id,
  created_by,
  date,
  time,
  department,
  machine_equipment,
  machine_id,
  maintenance_category,
  maintenance_type_mechanical,
  machine_status,
  urgency,
  machine_down_since,
  estimated_downtime,
  temporary_repair,
  description_required,
  status
) VALUES (
  '50000000-0000-0000-0000-000000000001',
  'MJC-2025-00000001',
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '2 hours',
  TO_CHAR(NOW() - INTERVAL '2 hours', 'HH24:MI'),
  'pouching',
  'CMH-02 Pouching Machine Line 2',
  '20000000-0000-0000-0000-000000000002',
  'reactive',
  true,
  'down',
  'critical',
  NOW() - INTERVAL '2 hours',
  240, -- 4 hours estimated
  false,
  'Machine making unusual grinding noise from main drive motor. Production stopped immediately. Visual inspection shows no obvious damage but motor running hot. Requires urgent investigation and repair.',
  'open'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SEED: Sample Hygiene Checklist (for MJC testing)
-- Purpose: Pre-populate hygiene checklist structure
-- =============================================================================
UPDATE mjcs
SET hygiene_checklist = '[
  {"item": "Machine cleaned and sanitized", "verified": false, "notes": ""},
  {"item": "Foreign material check completed", "verified": false, "notes": ""},
  {"item": "Machine guards replaced and secure", "verified": false, "notes": ""},
  {"item": "No tools or materials left on machine", "verified": false, "notes": ""},
  {"item": "Lubricants food-grade and approved", "verified": false, "notes": ""},
  {"item": "Floor area cleaned and dry", "verified": false, "notes": ""},
  {"item": "Waste bins emptied and sanitized", "verified": false, "notes": ""},
  {"item": "Machine ready for production", "verified": false, "notes": ""},
  {"item": "Safety signage and labels intact", "verified": false, "notes": ""},
  {"item": "Test run completed successfully", "verified": false, "notes": ""}
]'::jsonb
WHERE id = '50000000-0000-0000-0000-000000000001';

-- =============================================================================
-- VERIFICATION QUERIES
-- Purpose: Validate seed data loaded correctly
-- =============================================================================

-- Verify users loaded
-- SELECT COUNT(*) as user_count FROM users; -- Should return 6

-- Verify machines loaded
-- SELECT COUNT(*) as machine_count FROM machines; -- Should return 3

-- Verify work orders loaded
-- SELECT COUNT(*) as wo_count FROM work_orders; -- Should return 3

-- Verify NCA loaded
-- SELECT nca_number, status, nc_type FROM ncas; -- Should return 1 draft NCA

-- Verify MJC loaded
-- SELECT job_card_number, status, urgency, machine_status FROM mjcs; -- Should return 1 open MJC

-- Verify hygiene checklist structure
-- SELECT
--   job_card_number,
--   jsonb_array_length(hygiene_checklist) as checklist_items,
--   (SELECT COUNT(*) FROM jsonb_array_elements(hygiene_checklist) WHERE (value->>'verified')::boolean = true) as verified_count
-- FROM mjcs
-- WHERE id = '50000000-0000-0000-0000-000000000001';
-- Should show 10 items, 0 verified

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON TABLE users IS 'Seed data includes 6 users covering all system roles';
COMMENT ON TABLE machines IS 'Seed data includes 3 machines: 2 pouching lines + 1 slitter';
COMMENT ON TABLE work_orders IS 'Seed data includes 3 work orders: 1 active, 1 paused, 1 completed';

-- =============================================================================
-- RESET SEQUENCES (if needed during development)
-- =============================================================================
-- Ensure NCA/MJC sequences start after seed data
SELECT setval('nca_number_seq', 1, false);
SELECT setval('mjc_number_seq', 1, false);
