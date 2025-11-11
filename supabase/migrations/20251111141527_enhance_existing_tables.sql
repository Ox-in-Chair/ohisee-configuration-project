-- Enhance Existing Tables for Knowledge Base Integration
-- Add columns for packaging materials, GMP violations, and benchmark comparisons
-- Date: 2025-11-11

-- =============================================================================
-- ENHANCE: ncas table
-- =============================================================================

-- Add packaging material reference (optional, for linking)
ALTER TABLE ncas 
ADD COLUMN IF NOT EXISTS packaging_material_id UUID REFERENCES packaging_materials(id);

-- Add GMP violation flags (JSONB for flexibility)
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS gmp_violation_flags JSONB DEFAULT '[]'::jsonb;

-- Add industry benchmark comparison (store comparison results)
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS industry_benchmark_comparison JSONB;

-- Add index for packaging material lookup
CREATE INDEX IF NOT EXISTS idx_ncas_packaging_material ON ncas(packaging_material_id) WHERE packaging_material_id IS NOT NULL;

COMMENT ON COLUMN ncas.packaging_material_id IS
  'Optional reference to packaging material if this NCA is related to packaging';
COMMENT ON COLUMN ncas.gmp_violation_flags IS
  'Array of GMP violation flags detected during validation';
COMMENT ON COLUMN ncas.industry_benchmark_comparison IS
  'Comparison results against industry benchmarks (response time, defect rates, etc)';

-- =============================================================================
-- ENHANCE: mjcs table
-- =============================================================================

-- Add industry benchmark comparison (store comparison results)
ALTER TABLE mjcs
ADD COLUMN IF NOT EXISTS industry_benchmark_comparison JSONB;

COMMENT ON COLUMN mjcs.industry_benchmark_comparison IS
  'Comparison results against industry benchmarks (response time, completion rates, etc)';

-- =============================================================================
-- ENHANCE: suppliers table
-- =============================================================================

-- Add packaging material certifications (array of material codes)
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS packaging_materials_approved TEXT[];

COMMENT ON COLUMN suppliers.packaging_materials_approved IS
  'Array of packaging material codes that this supplier is approved to supply';

-- =============================================================================
-- ENHANCE: knowledge_base_documents table
-- =============================================================================

-- Note: GMP standards will be added to existing knowledge_base_documents table
-- using document_type = 'gmp_standard'
-- No schema changes needed, just data population

