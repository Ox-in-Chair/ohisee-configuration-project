-- Update segregation area enum values
-- Change from: area-a, area-b, labeled, other
-- To: raw-materials, wip, finished-goods, other

-- =============================================================================
-- UPDATE EXISTING DATA: Map old values to new values
-- =============================================================================
UPDATE ncas
SET segregation_area = CASE
  WHEN segregation_area = 'area-a' THEN 'raw-materials'
  WHEN segregation_area = 'area-b' THEN 'wip'
  WHEN segregation_area = 'labeled' THEN 'finished-goods'
  WHEN segregation_area = 'other' THEN 'other'
  ELSE segregation_area
END
WHERE segregation_area IN ('area-a', 'area-b', 'labeled', 'other');

-- =============================================================================
-- DROP OLD CHECK CONSTRAINT (if exists)
-- =============================================================================
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ncas_segregation_area_check'
  ) THEN
    ALTER TABLE ncas DROP CONSTRAINT ncas_segregation_area_check;
  END IF;
END $$;

-- =============================================================================
-- ADD NEW CHECK CONSTRAINT: Updated segregation area values
-- =============================================================================
ALTER TABLE ncas
ADD CONSTRAINT ncas_segregation_area_check 
CHECK (segregation_area IS NULL OR segregation_area IN ('raw-materials', 'wip', 'finished-goods', 'other'));

-- Add comment
COMMENT ON CONSTRAINT ncas_segregation_area_check ON ncas IS 
'Ensures segregation_area is one of: raw-materials, wip, finished-goods, other';

