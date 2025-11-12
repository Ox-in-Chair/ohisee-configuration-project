-- OHiSee NCA System - Classification and Procedure Revision Enhancement
-- PRD Enhancement: Add supplier-based/kangopak-based classification and procedure revision tracking
-- BRCGS: 5.7 Control of Non-Conforming Product

-- =============================================================================
-- ADD CLASSIFICATION AND PROCEDURE REVISION FIELDS TO NCAS TABLE
-- =============================================================================

-- Add nc_origin field for supplier-based/kangopak-based classification
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS nc_origin TEXT CHECK (nc_origin IN (
  'supplier-based',
  'kangopak-based',
  'joint-investigation'
));

-- Add procedure reference fields
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS procedure_reference TEXT DEFAULT '5.7';

ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS procedure_revision TEXT DEFAULT 'Rev 9';

ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS procedure_revision_date DATE DEFAULT CURRENT_DATE;

-- Add constraint: Raw Material NCAs must be supplier-based
-- This will be enforced at the application level, but we add a check constraint for data integrity
CREATE OR REPLACE FUNCTION check_raw_material_origin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nc_type = 'raw-material' AND NEW.nc_origin IS NOT NULL AND NEW.nc_origin != 'supplier-based' THEN
    RAISE EXCEPTION 'Raw Material NCAs must be supplier-based. Current value: %', NEW.nc_origin;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce raw material = supplier-based rule
DROP TRIGGER IF EXISTS enforce_raw_material_origin ON ncas;
CREATE TRIGGER enforce_raw_material_origin
  BEFORE INSERT OR UPDATE ON ncas
  FOR EACH ROW
  WHEN (NEW.nc_type = 'raw-material')
  EXECUTE FUNCTION check_raw_material_origin();

-- Add comment explaining the fields
COMMENT ON COLUMN ncas.nc_origin IS 'Classification of non-conformance origin: supplier-based, kangopak-based, or joint-investigation';
COMMENT ON COLUMN ncas.procedure_reference IS 'Procedure reference number (e.g., 5.7) - locked on record creation';
COMMENT ON COLUMN ncas.procedure_revision IS 'Procedure revision (e.g., Rev 9) - locked on record creation';
COMMENT ON COLUMN ncas.procedure_revision_date IS 'Date of procedure revision - locked on record creation';

-- Update existing records with default values
UPDATE ncas
SET 
  procedure_reference = COALESCE(procedure_reference, '5.7'),
  procedure_revision = COALESCE(procedure_revision, 'Rev 9'),
  procedure_revision_date = COALESCE(procedure_revision_date, CURRENT_DATE)
WHERE procedure_reference IS NULL OR procedure_revision IS NULL OR procedure_revision_date IS NULL;

-- Set default nc_origin for existing raw-material NCAs
UPDATE ncas
SET nc_origin = 'supplier-based'
WHERE nc_type = 'raw-material' AND nc_origin IS NULL;


