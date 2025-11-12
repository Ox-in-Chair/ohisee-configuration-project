-- OHiSee NCA System - MJC-NCA Bidirectional Linking
-- PRD Enhancement: Maintenance Job Card integration with NCAs
-- BRCGS: 4.7 Maintenance, 5.7 Non-Conforming Product Control

-- =============================================================================
-- ADD BIDIRECTIONAL LINKING BETWEEN MJCs AND NCAs
-- =============================================================================

-- Add linked_nca_id to mjcs table
ALTER TABLE mjcs
ADD COLUMN IF NOT EXISTS linked_nca_id UUID REFERENCES ncas(id) ON DELETE SET NULL;

-- Add linked_mjc_id to ncas table
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS linked_mjc_id UUID REFERENCES mjcs(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_mjcs_linked_nca_id ON mjcs(linked_nca_id);
CREATE INDEX IF NOT EXISTS idx_ncas_linked_mjc_id ON ncas(linked_mjc_id);

-- Add comments
COMMENT ON COLUMN mjcs.linked_nca_id IS 'Reference to NCA that triggered this maintenance job card (equipment-related root cause)';
COMMENT ON COLUMN ncas.linked_mjc_id IS 'Reference to maintenance job card created from this NCA (equipment-related issues)';


