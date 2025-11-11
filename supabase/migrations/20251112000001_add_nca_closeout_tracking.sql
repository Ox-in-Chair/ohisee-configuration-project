-- Add 20 working day close-out tracking to NCAs table
-- Procedure 5.7: NCAs must be closed out within 20 working days from date opened

-- =============================================================================
-- FUNCTION: Calculate working days (excludes weekends)
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_working_days(start_date DATE, days_to_add INTEGER)
RETURNS DATE AS $$
DECLARE
  current_date DATE := start_date;
  days_added INTEGER := 0;
  days_to_skip INTEGER := days_to_add;
BEGIN
  WHILE days_to_skip > 0 LOOP
    -- Skip weekends (Saturday = 6, Sunday = 0)
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      days_to_skip := days_to_skip - 1;
    END IF;
    
    IF days_to_skip > 0 THEN
      current_date := current_date + INTERVAL '1 day';
    END IF;
  END LOOP;
  
  RETURN current_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- ADD COLUMNS: Close-out tracking
-- =============================================================================
ALTER TABLE ncas
  ADD COLUMN IF NOT EXISTS close_out_due_date DATE,
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false;

-- Calculate close_out_due_date for existing NCAs (20 working days from created_at)
UPDATE ncas
SET close_out_due_date = calculate_working_days(created_at::DATE, 20)
WHERE close_out_due_date IS NULL AND status != 'closed';

-- =============================================================================
-- FUNCTION: Auto-calculate close_out_due_date on insert
-- =============================================================================
CREATE OR REPLACE FUNCTION set_nca_close_out_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set close_out_due_date to 20 working days from created_at
  IF NEW.close_out_due_date IS NULL THEN
    NEW.close_out_due_date := calculate_working_days(NEW.created_at::DATE, 20);
  END IF;
  
  -- Update is_overdue flag
  IF NEW.status != 'closed' AND NEW.close_out_due_date < CURRENT_DATE THEN
    NEW.is_overdue := true;
  ELSE
    NEW.is_overdue := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: Auto-set close_out_due_date on insert
-- =============================================================================
DROP TRIGGER IF EXISTS nca_set_close_out_due_date ON ncas;
CREATE TRIGGER nca_set_close_out_due_date
  BEFORE INSERT OR UPDATE ON ncas
  FOR EACH ROW
  EXECUTE FUNCTION set_nca_close_out_due_date();

-- =============================================================================
-- FUNCTION: Update is_overdue flag (for daily checks)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_nca_overdue_status()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE ncas
  SET is_overdue = true
  WHERE status != 'closed'
    AND close_out_due_date < CURRENT_DATE
    AND is_overdue = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES: Performance optimization
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nca_close_out_due_date ON ncas(close_out_due_date) WHERE status != 'closed';
CREATE INDEX IF NOT EXISTS idx_nca_is_overdue ON ncas(is_overdue) WHERE is_overdue = true;

-- =============================================================================
-- COMMENTS: Documentation
-- =============================================================================
COMMENT ON COLUMN ncas.close_out_due_date IS '20 working days from created_at (Procedure 5.7)';
COMMENT ON COLUMN ncas.is_overdue IS 'True if close_out_due_date has passed and status is not closed';

