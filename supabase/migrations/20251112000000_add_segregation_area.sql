-- Add segregation area tracking to NCAs table
-- Procedure 5.7: Segregation into non-conforming warehouse area or clear labeling

-- =============================================================================
-- ADD COLUMNS: Segregation Area Tracking
-- =============================================================================
ALTER TABLE ncas
  ADD COLUMN IF NOT EXISTS segregation_area TEXT,
  ADD COLUMN IF NOT EXISTS segregation_area_other TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ncas.segregation_area IS 'Location where non-conforming product is segregated (Procedure 5.7)';
COMMENT ON COLUMN ncas.segregation_area_other IS 'Custom segregation area description if "Other" selected';

-- =============================================================================
-- INDEX: Performance optimization for filtering by segregation area
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nca_segregation_area ON ncas(segregation_area) WHERE segregation_area IS NOT NULL;

