-- Add relocation notes field to NCAs table
-- Allows documenting relocation reasons after disposition (e.g., "Palletise for supplier")

-- =============================================================================
-- ADD COLUMN: Relocation Notes
-- =============================================================================
ALTER TABLE ncas
  ADD COLUMN IF NOT EXISTS relocation_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN ncas.relocation_notes IS 
'Notes documenting relocation of NC goods after disposition (e.g., "Palletise for supplier", "Move to holding area")';

-- =============================================================================
-- INDEX: Performance optimization for filtering by relocation notes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nca_relocation_notes ON ncas(relocation_notes) 
WHERE relocation_notes IS NOT NULL;

