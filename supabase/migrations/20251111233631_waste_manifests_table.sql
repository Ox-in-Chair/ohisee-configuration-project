-- OHiSee NCA System - Waste Manifest Integration
-- PRD Enhancement: Waste Manifest (Form 4.10F1) creation and linking
-- BRCGS: 4.10 Waste Management

-- =============================================================================
-- TABLE: waste_manifests (Waste Manifest Register)
-- Purpose: Track waste disposal linked to NCAs with disposition = Discard
-- BRCGS: 4.10 Waste Management, Form 4.10F1
-- =============================================================================
CREATE TABLE IF NOT EXISTS waste_manifests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manifest_number TEXT UNIQUE NOT NULL DEFAULT generate_waste_manifest_number(),
  
  -- Link to NCA
  nca_id UUID REFERENCES ncas(id) ON DELETE RESTRICT,
  
  -- Waste Details (from Form 4.10F1)
  waste_description TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  waste_type TEXT NOT NULL CHECK (waste_type IN ('hazardous', 'non-hazardous', 'recyclable', 'organic', 'trademarked')),
  specialized_storage TEXT,
  document_reference TEXT,
  physical_quantity NUMERIC(10, 2) NOT NULL,
  quantity_unit TEXT CHECK (quantity_unit IN ('kg', 'units', 'meters', 'boxes', 'pallets')) DEFAULT 'kg',
  service_provider TEXT,
  disposal_certificate TEXT,
  disposal_date DATE,
  
  -- Audit Fields
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for NCA lookups
CREATE INDEX IF NOT EXISTS idx_waste_manifests_nca_id ON waste_manifests(nca_id);
CREATE INDEX IF NOT EXISTS idx_waste_manifests_manifest_number ON waste_manifests(manifest_number);

-- Function to generate waste manifest numbers
CREATE SEQUENCE IF NOT EXISTS waste_manifest_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_waste_manifest_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  manifest_num TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Reset sequence on year change
  IF NOT EXISTS (
    SELECT 1 FROM waste_manifests
    WHERE manifest_number LIKE 'WM-' || current_year || '-%'
  ) THEN
    ALTER SEQUENCE waste_manifest_number_seq RESTART WITH 1;
  END IF;
  
  next_number := nextval('waste_manifest_number_seq');
  manifest_num := 'WM-' || current_year || '-' || LPAD(next_number::TEXT, 8, '0');
  
  RETURN manifest_num;
END;
$$ LANGUAGE plpgsql;

-- Add waste_manifest_id to ncas table
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS waste_manifest_id UUID REFERENCES waste_manifests(id) ON DELETE SET NULL;

-- Create index for reverse lookup
CREATE INDEX IF NOT EXISTS idx_ncas_waste_manifest_id ON ncas(waste_manifest_id);

-- Add comments
COMMENT ON TABLE waste_manifests IS 'Waste Manifest Register (Form 4.10F1) - Links to NCAs with disposition = Discard';
COMMENT ON COLUMN waste_manifests.nca_id IS 'Reference to NCA that generated this waste manifest entry';
COMMENT ON COLUMN waste_manifests.manifest_number IS 'Auto-generated manifest number (WM-YYYY-########)';
COMMENT ON COLUMN ncas.waste_manifest_id IS 'Reference to waste manifest if disposition includes discard';


