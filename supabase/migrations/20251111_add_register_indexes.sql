-- OHiSee Register Optimization Indexes
-- Add indexes on frequently filtered columns for performance
-- Target: <200ms query time for 1000+ records

-- =============================================================================
-- NCA Register Indexes
-- =============================================================================

-- Index on status (most common filter)
CREATE INDEX IF NOT EXISTS idx_ncas_status ON ncas(status);

-- Index on created_at (default sorting)
CREATE INDEX IF NOT EXISTS idx_ncas_created_at ON ncas(created_at DESC);

-- Index on nca_number (search and sorting)
CREATE INDEX IF NOT EXISTS idx_ncas_nca_number ON ncas(nca_number);

-- Composite index for status + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_ncas_status_created_at ON ncas(status, created_at DESC);

-- Index on machine_status (filter for machine down alerts)
CREATE INDEX IF NOT EXISTS idx_ncas_machine_status ON ncas(machine_status);

-- Index on wo_id (work order linking)
CREATE INDEX IF NOT EXISTS idx_ncas_wo_id ON ncas(wo_id) WHERE wo_id IS NOT NULL;

-- Full-text search index on description fields (if using PostgreSQL full-text search)
-- CREATE INDEX IF NOT EXISTS idx_ncas_description_fts ON ncas USING gin(to_tsvector('english', nc_description || ' ' || nc_product_description));

-- =============================================================================
-- MJC Register Indexes
-- =============================================================================

-- Index on status (most common filter)
CREATE INDEX IF NOT EXISTS idx_mjcs_status ON mjcs(status);

-- Index on urgency (filter for critical jobs)
CREATE INDEX IF NOT EXISTS idx_mjcs_urgency ON mjcs(urgency);

-- Index on created_at (default sorting)
CREATE INDEX IF NOT EXISTS idx_mjcs_created_at ON mjcs(created_at DESC);

-- Index on job_card_number (search and sorting)
CREATE INDEX IF NOT EXISTS idx_mjcs_job_card_number ON mjcs(job_card_number);

-- Composite index for status + urgency (common query pattern)
CREATE INDEX IF NOT EXISTS idx_mjcs_status_urgency ON mjcs(status, urgency);

-- Composite index for status + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_mjcs_status_created_at ON mjcs(status, created_at DESC);

-- Index on machine_status (filter for machine down alerts)
CREATE INDEX IF NOT EXISTS idx_mjcs_machine_status ON mjcs(machine_status);

-- Index on temporary_repair + close_out_due_date (temporary repair reminders)
CREATE INDEX IF NOT EXISTS idx_mjcs_temp_repair_due_date ON mjcs(temporary_repair, close_out_due_date) 
  WHERE temporary_repair = true AND close_out_due_date IS NOT NULL;

-- Index on wo_id (work order linking)
CREATE INDEX IF NOT EXISTS idx_mjcs_wo_id ON mjcs(wo_id) WHERE wo_id IS NOT NULL;

-- =============================================================================
-- Work Order Indexes
-- =============================================================================

-- Index on status (filter for active work orders)
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- Index on operator_id (filter by operator)
CREATE INDEX IF NOT EXISTS idx_work_orders_operator_id ON work_orders(operator_id);

-- Index on created_at (default sorting)
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at DESC);

-- Composite index for operator + status (common query pattern)
CREATE INDEX IF NOT EXISTS idx_work_orders_operator_status ON work_orders(operator_id, status);

-- =============================================================================
-- Performance Notes
-- =============================================================================

-- These indexes should improve query performance for:
-- 1. Filtered register views (status, urgency, etc.)
-- 2. Sorted lists (created_at DESC)
-- 3. Search queries (nca_number, job_card_number)
-- 4. Work order linking (wo_id)
-- 5. Temporary repair reminders (temporary_repair + close_out_due_date)

-- Monitor query performance with:
-- EXPLAIN ANALYZE SELECT ... FROM ncas WHERE status = 'open' ORDER BY created_at DESC LIMIT 25;

