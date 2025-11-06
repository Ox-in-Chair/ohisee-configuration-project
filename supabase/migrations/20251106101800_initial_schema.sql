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
