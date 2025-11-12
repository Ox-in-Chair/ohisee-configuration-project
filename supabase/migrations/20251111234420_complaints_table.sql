-- OHiSee NCA System - Complaints Table
-- PRD Enhancement: Complaint Handling Integration
-- BRCGS: 3.10 Complaint Handling

-- =============================================================================
-- TABLE: complaints (Customer Complaint Register)
-- Purpose: Track customer complaints and link to NCAs
-- BRCGS: 3.10 Complaint Handling, Form 3.10F2
-- =============================================================================
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_number TEXT UNIQUE NOT NULL DEFAULT generate_complaint_number(),
  
  -- Complaint Details
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  complaint_date DATE NOT NULL DEFAULT CURRENT_DATE,
  complaint_received_via TEXT CHECK (complaint_received_via IN ('phone', 'email', 'in-person', 'other')),
  complaint_description TEXT NOT NULL,
  complaint_type TEXT CHECK (complaint_type IN ('quality', 'safety', 'legality', 'delivery', 'other')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  
  -- Investigation
  investigation_status TEXT NOT NULL DEFAULT 'pending' CHECK (investigation_status IN (
    'pending',
    'investigating',
    'valid',
    'invalid',
    'closed'
  )),
  investigation_notes TEXT,
  root_cause_analysis TEXT,
  corrective_action TEXT,
  corrective_action_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  
  -- Link to NCA (if supplier issue)
  linked_nca_id UUID REFERENCES ncas(id) ON DELETE SET NULL,
  
  -- Closure
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  closure_notes TEXT,
  cycle_time_days INTEGER, -- Calculated: closed_at - complaint_date (working days)
  
  -- Audit Fields
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT complaint_description_min_length CHECK (char_length(complaint_description) >= 20)
);

-- Function to generate complaint numbers
CREATE SEQUENCE IF NOT EXISTS complaint_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  complaint_num TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Reset sequence on year change
  IF NOT EXISTS (
    SELECT 1 FROM complaints
    WHERE complaint_number LIKE 'COMP-' || current_year || '-%'
  ) THEN
    ALTER SEQUENCE complaint_number_seq RESTART WITH 1;
  END IF;
  
  next_number := nextval('complaint_number_seq');
  complaint_num := 'COMP-' || current_year || '-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN complaint_num;
END;
$$ LANGUAGE plpgsql;

-- Add complaint_id to ncas table
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_name ON complaints(customer_name);
CREATE INDEX IF NOT EXISTS idx_complaints_investigation_status ON complaints(investigation_status);
CREATE INDEX IF NOT EXISTS idx_complaints_linked_nca_id ON complaints(linked_nca_id);
CREATE INDEX IF NOT EXISTS idx_ncas_complaint_id ON ncas(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_date ON complaints(complaint_date);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_complaints_updated_at();

-- Add comments
COMMENT ON TABLE complaints IS 'Customer Complaint Register (Form 3.10F2) - Links to NCAs when supplier issue identified';
COMMENT ON COLUMN complaints.linked_nca_id IS 'Reference to NCA created from this complaint (when supplier issue)';
COMMENT ON COLUMN ncas.complaint_id IS 'Reference to complaint that generated this NCA';
COMMENT ON COLUMN complaints.cycle_time_days IS 'Working days from complaint_date to closed_at (max 20 per BRCGS 3.10)';


