-- Enhanced Knowledge Base Integration
-- Packaging Materials, Industry Benchmarks, Data Sync Log
-- Date: 2025-11-11

-- =============================================================================
-- TABLE: packaging_materials
-- Purpose: Store packaging material specifications, safety data, and compatibility
-- =============================================================================
CREATE TABLE IF NOT EXISTS packaging_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_code VARCHAR(50) UNIQUE NOT NULL,
  material_name TEXT NOT NULL,
  material_type TEXT CHECK (material_type IN ('film', 'laminate', 'pouch', 'reel', 'other')),
  specifications JSONB, -- {thickness, width, barrier_properties, etc}
  safety_data JSONB, -- {migration_limits, food_contact_approved, etc}
  supplier_certifications TEXT[], -- Array of certification codes
  migration_limits JSONB, -- {substance, limit_ppm, test_method}
  compatibility_matrix JSONB, -- {compatible_with: [], incompatible_with: []}
  brcgs_section TEXT, -- Reference to BRCGS section (e.g., '5.8')
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  embedding_vector vector(1536) -- For semantic search
);

CREATE INDEX idx_packaging_materials_code ON packaging_materials(material_code);
CREATE INDEX idx_packaging_materials_type ON packaging_materials(material_type);
CREATE INDEX idx_packaging_materials_active ON packaging_materials(active) WHERE active = true;
CREATE INDEX idx_packaging_materials_embedding ON packaging_materials USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

COMMENT ON TABLE packaging_materials IS
  'Packaging material specifications, safety data, and compatibility information for BRCGS compliance';

-- =============================================================================
-- TABLE: industry_benchmarks
-- Purpose: Store industry benchmark metrics for comparison and trend analysis
-- =============================================================================
CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_category TEXT CHECK (metric_category IN ('response_time', 'defect_rate', 'cost', 'quality_score', 'other')),
  industry_sector VARCHAR(50), -- 'packaging', 'food_manufacturing', etc
  benchmark_value NUMERIC NOT NULL,
  percentile_25 NUMERIC,
  percentile_50 NUMERIC, -- median
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  data_source VARCHAR(100),
  sample_size INTEGER,
  last_updated TIMESTAMPTZ DEFAULT now(),
  period_start DATE,
  period_end DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_industry_benchmarks_metric ON industry_benchmarks(metric_name, metric_category);
CREATE INDEX idx_industry_benchmarks_sector ON industry_benchmarks(industry_sector);
CREATE INDEX idx_industry_benchmarks_period ON industry_benchmarks(period_start, period_end);
CREATE INDEX idx_industry_benchmarks_active ON industry_benchmarks(active) WHERE active = true;

COMMENT ON TABLE industry_benchmarks IS
  'Industry benchmark metrics for comparison, trend analysis, and performance evaluation';

-- =============================================================================
-- TABLE: data_sync_log
-- Purpose: Track data synchronization from external sources (hybrid approach)
-- =============================================================================
CREATE TABLE IF NOT EXISTS data_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) CHECK (source_type IN ('brcgs', 'gmp', 'benchmark', 'supplier', 'packaging')),
  sync_type VARCHAR(20) CHECK (sync_type IN ('full', 'incremental')),
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'partial')),
  records_updated INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  sync_timestamp TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  metadata JSONB, -- Additional sync details
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_data_sync_log_source ON data_sync_log(source_type, sync_timestamp DESC);
CREATE INDEX idx_data_sync_log_status ON data_sync_log(status);
CREATE INDEX idx_data_sync_log_timestamp ON data_sync_log(sync_timestamp DESC);

COMMENT ON TABLE data_sync_log IS
  'Log of data synchronization operations from external sources (hybrid approach: curated base + optional live updates)';

