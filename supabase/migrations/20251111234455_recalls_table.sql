-- OHiSee NCA System - Recalls Table
-- PRD Enhancement: Product Recall Flagging
-- BRCGS: 3.11 Product Recall

-- =============================================================================
-- TABLE: recalls (Product Recall Register)
-- Purpose: Track product recalls and flag affected NCAs
-- BRCGS: 3.11 Product Recall, Form 3.11F1
-- =============================================================================
CREATE TABLE IF NOT EXISTS recalls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_number TEXT UNIQUE NOT NULL DEFAULT generate_recall_number(),
  
  -- Recall Details
  recall_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recall_class TEXT NOT NULL CHECK (recall_class IN ('class-i', 'class-ii', 'class-iii')),
  recall_reason TEXT NOT NULL,
  product_description TEXT NOT NULL,
  product_code TEXT,
  
  -- Affected Batches/Lots
  batch_numbers TEXT[], -- Array of batch numbers
  carton_numbers TEXT[], -- Array of carton numbers
  supplier_reel_box TEXT[], -- Array of supplier reel/box numbers
  job_numbers TEXT[], -- Array of work order/job numbers
  
  -- Recall Actions
  customer_notification_date DATE,
  customer_notification_completed BOOLEAN DEFAULT false,
  stock_quarantined BOOLEAN DEFAULT false,
  distribution_stopped BOOLEAN DEFAULT false,
  authorities_notified BOOLEAN DEFAULT false,
  
  -- Post-Recall Review
  root_cause_analysis TEXT,
  corrective_action TEXT,
  post_recall_review_date DATE,
  review_completed BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',
    'in-progress',
    'completed',
    'closed'
  )),
  
  -- Affected NCAs (stored as JSONB array for flexibility)
  affected_nca_ids UUID[],
  
  -- Audit Fields
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  closed_at TIMESTAMPTZ
);

-- Function to generate recall numbers
CREATE SEQUENCE IF NOT EXISTS recall_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_recall_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  recall_num TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Reset sequence on year change
  IF NOT EXISTS (
    SELECT 1 FROM recalls
    WHERE recall_number LIKE 'RECALL-' || current_year || '-%'
  ) THEN
    ALTER SEQUENCE recall_number_seq RESTART WITH 1;
  END IF;
  
  next_number := nextval('recall_number_seq');
  recall_num := 'RECALL-' || current_year || '-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN recall_num;
END;
$$ LANGUAGE plpgsql;

-- Add recall fields to ncas table
ALTER TABLE ncas
ADD COLUMN IF NOT EXISTS recall_id UUID REFERENCES recalls(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recall_flagged BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recalls_recall_number ON recalls(recall_number);
CREATE INDEX IF NOT EXISTS idx_recalls_recall_date ON recalls(recall_date);
CREATE INDEX IF NOT EXISTS idx_recalls_status ON recalls(status);
CREATE INDEX IF NOT EXISTS idx_recalls_recall_class ON recalls(recall_class);
CREATE INDEX IF NOT EXISTS idx_ncas_recall_id ON ncas(recall_id);
CREATE INDEX IF NOT EXISTS idx_ncas_recall_flagged ON ncas(recall_flagged) WHERE recall_flagged = true;

-- GIN index for array searches
CREATE INDEX IF NOT EXISTS idx_recalls_batch_numbers ON recalls USING GIN(batch_numbers);
CREATE INDEX IF NOT EXISTS idx_recalls_carton_numbers ON recalls USING GIN(carton_numbers);
CREATE INDEX IF NOT EXISTS idx_recalls_supplier_reel_box ON recalls USING GIN(supplier_reel_box);
CREATE INDEX IF NOT EXISTS idx_recalls_job_numbers ON recalls USING GIN(job_numbers);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_recalls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalls_updated_at
  BEFORE UPDATE ON recalls
  FOR EACH ROW
  EXECUTE FUNCTION update_recalls_updated_at();

-- Add comments
COMMENT ON TABLE recalls IS 'Product Recall Register (Form 3.11F1) - Flags affected NCAs';
COMMENT ON COLUMN recalls.affected_nca_ids IS 'Array of NCA IDs affected by this recall';
COMMENT ON COLUMN ncas.recall_id IS 'Reference to recall that flagged this NCA';
COMMENT ON COLUMN ncas.recall_flagged IS 'True if this NCA has been flagged for recall';


