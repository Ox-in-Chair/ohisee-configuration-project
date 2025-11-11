/**
 * Quality Enforcement Rules Migration
 * Database-level constraints and triggers for quality enforcement
 * Acts as a safety net to ensure minimum content quality standards
 * 
 * These rules enforce:
 * - Minimum content length based on NC type
 * - Pattern checks for vague language
 * - Required keyword/format detection (times, quantities, batch numbers)
 * - Procedure reference validation
 */

-- ============================================================================
-- Helper Function: Check for vague language patterns
-- ============================================================================
CREATE OR REPLACE FUNCTION check_vague_language(text_content TEXT, min_length INTEGER DEFAULT 50)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if text contains vague phrases without sufficient detail
  IF text_content ILIKE '%bad%' AND LENGTH(text_content) < min_length THEN
    RETURN FALSE;
  END IF;
  
  IF text_content ILIKE '%broken%' AND LENGTH(text_content) < min_length THEN
    RETURN FALSE;
  END IF;
  
  IF text_content ILIKE '%issue%' AND LENGTH(text_content) < min_length THEN
    RETURN FALSE;
  END IF;
  
  IF text_content ILIKE '%problem%' AND LENGTH(text_content) < min_length THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Get minimum length requirement based on NC type
-- ============================================================================
CREATE OR REPLACE FUNCTION get_nc_description_min_length(nc_type TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE nc_type
    WHEN 'raw-material' THEN RETURN 120;
    WHEN 'finished-goods' THEN RETURN 150;
    WHEN 'wip' THEN RETURN 130;
    WHEN 'incident' THEN RETURN 200;
    WHEN 'other' THEN RETURN 100;
    ELSE RETURN 100;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Validation Function: NC Description Quality
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_nc_description_quality()
RETURNS TRIGGER AS $$
DECLARE
  min_length INTEGER;
  vague_check BOOLEAN;
BEGIN
  -- Skip validation if description is NULL or empty
  IF NEW.nc_description IS NULL OR LENGTH(TRIM(NEW.nc_description)) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get minimum length requirement based on NC type
  min_length := get_nc_description_min_length(NEW.nc_type);
  
  -- Check minimum length
  IF LENGTH(NEW.nc_description) < min_length THEN
    RAISE EXCEPTION 'Description must be at least % characters for % non-conformances. Please include: what happened, when, where, quantity affected, batch/carton numbers, and immediate actions taken.'
      USING ERRCODE = '23514',
            HINT = format('Minimum length required: %s characters. Current length: %s', min_length, LENGTH(NEW.nc_description));
  END IF;
  
  -- Check for vague language
  vague_check := check_vague_language(NEW.nc_description, min_length);
  IF NOT vague_check THEN
    RAISE EXCEPTION 'Description too vague. Please provide specific details instead of generic terms like "bad" or "broken". Include measurements, quantities, times, and specific locations.'
      USING ERRCODE = '23514',
            HINT = 'Example: Instead of "bad product", describe "Seal integrity failure - side seal temperature 5°C below specification at 14:30 in Finishing Area 2"';
  END IF;
  
  -- Special requirement for incidents: must include time
  IF NEW.nc_type = 'incident' AND NEW.nc_description !~* '\d{1,2}:\d{2}' THEN
    RAISE EXCEPTION 'Incident descriptions must include the time of occurrence (e.g., "at 14:30" or "on 10-Oct at 15:00").'
      USING ERRCODE = '23514',
            HINT = 'Per BRCGS 5.7 Section 2.1, incident reports must document the time of occurrence.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Validation Function: Root Cause Analysis Depth
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_root_cause_depth()
RETURNS TRIGGER AS $$
DECLARE
  why_count INTEGER;
  sentence_count INTEGER;
BEGIN
  -- Skip validation if root cause is NULL or empty (optional field)
  IF NEW.root_cause_analysis IS NULL OR LENGTH(TRIM(NEW.root_cause_analysis)) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Count "why" questions/statements (case-insensitive)
  SELECT COUNT(*) INTO why_count
  FROM regexp_split_to_table(NEW.root_cause_analysis, '\s+') AS word
  WHERE word ~* '\b(why|because|due to|caused by|result of|reason)\b';
  
  -- Count sentences
  SELECT array_length(string_to_array(NEW.root_cause_analysis, '.'), 1) INTO sentence_count;
  IF sentence_count IS NULL THEN
    sentence_count := 1;
  END IF;
  
  -- Check for shallow responses (single sentence, no depth)
  IF sentence_count <= 1 AND why_count < 2 THEN
    RAISE EXCEPTION 'Root cause analysis is too shallow. Use the 5-Why method: Why did this happen? → [cause]. Why? → [deeper cause]. Why? → [root cause]. Aim for at least 3 layers of analysis.'
      USING ERRCODE = '23514',
            HINT = 'Example: "Why did delamination occur? → Adhesive temperature too low. Why? → Heater malfunction. Why? → Sensor drift. Why? → Calibration overdue by 3 weeks."';
  END IF;
  
  -- Check for generic statements without sufficient depth
  IF (NEW.root_cause_analysis ~* '\b(operator error|human error|mistake|fault)\b' OR
      NEW.root_cause_analysis ~* '\b(machine (issue|problem|broken|failure))\b' OR
      NEW.root_cause_analysis ~* '\b(bad|wrong|incorrect)\b') AND why_count < 3 THEN
    RAISE EXCEPTION 'Root cause analysis is too generic. Please be more specific. Instead of "operator error", explain: Why did the operator make the error? Was training adequate? Was the procedure clear? Continue asking "why" until you identify the true root cause.'
      USING ERRCODE = '23514',
            HINT = 'Instead of "operator error", use: "Operator did not follow first-off checklist → Checklist not visibly posted at machine → Housekeeping procedure does not include checklist positioning verification"';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Validation Function: Corrective Action Specificity
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_corrective_action_specificity()
RETURNS TRIGGER AS $$
DECLARE
  action_count INTEGER;
  has_procedure_ref BOOLEAN;
  has_verification BOOLEAN;
  has_timeline BOOLEAN;
BEGIN
  -- Skip validation if corrective action is NULL or empty (optional field)
  IF NEW.corrective_action IS NULL OR LENGTH(TRIM(NEW.corrective_action)) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Count action verbs
  SELECT COUNT(*) INTO action_count
  FROM regexp_split_to_table(NEW.corrective_action, '\s+') AS word
  WHERE word ~* '\b(will|must|shall|implement|add|update|verify|check|train|calibrate|replace|install|modify|create|establish|conduct|perform|review)\b';
  
  -- Check for procedure references
  has_procedure_ref := NEW.corrective_action ~* '\b(SOP|BRCGS|procedure|section|5\.\d+|3\.\d+|2\.\d+|5\.7|5\.3|5\.6)\b';
  
  -- Check for verification method
  has_verification := NEW.corrective_action ~* '\b(verify|check|confirm|validate|monitor|review|audit|inspect|test)\b';
  
  -- Check for timeline
  has_timeline := NEW.corrective_action ~* '\b(within|by|due|deadline|target|schedule|next|weekly|monthly|daily|immediately|within \d+ days?|by \d{1,2}-\w{3})\b';
  
  -- Build error message for missing requirements
  IF action_count < 2 THEN
    RAISE EXCEPTION 'Corrective action needs more detail: Include at least 2 specific actions (e.g., "1) Calibrate sensors. 2) Update procedure.")'
      USING ERRCODE = '23514',
            HINT = 'Example: "1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6."';
  END IF;
  
  IF NOT has_procedure_ref THEN
    RAISE EXCEPTION 'Corrective action needs more detail: Reference relevant procedures (e.g., "as per SOP 5.7" or "BRCGS Section 5.3")'
      USING ERRCODE = '23514',
            HINT = 'Example: "Update maintenance schedule per BRCGS 5.6 Calibration Procedure"';
  END IF;
  
  IF NOT has_verification THEN
    RAISE EXCEPTION 'Corrective action needs more detail: Include a verification method (e.g., "QA will verify on next batch")'
      USING ERRCODE = '23514',
            HINT = 'Example: "QA will verify effectiveness on next batch (due 10-Oct)"';
  END IF;
  
  IF NOT has_timeline THEN
    RAISE EXCEPTION 'Corrective action needs more detail: Include a timeline for verification (e.g., "due 10-Oct" or "within 5 days")'
      USING ERRCODE = '23514',
            HINT = 'Example: "QA will verify on next batch (due 10-Oct)"';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Trigger for NC Description validation
DROP TRIGGER IF EXISTS trig_validate_nc_description_quality ON nca_records;
CREATE TRIGGER trig_validate_nc_description_quality
  BEFORE INSERT OR UPDATE ON nca_records
  FOR EACH ROW
  WHEN (NEW.nc_description IS NOT NULL)
  EXECUTE FUNCTION validate_nc_description_quality();

-- Trigger for Root Cause Analysis validation
DROP TRIGGER IF EXISTS trig_validate_root_cause_depth ON nca_records;
CREATE TRIGGER trig_validate_root_cause_depth
  BEFORE INSERT OR UPDATE ON nca_records
  FOR EACH ROW
  WHEN (NEW.root_cause_analysis IS NOT NULL AND LENGTH(TRIM(NEW.root_cause_analysis)) > 0)
  EXECUTE FUNCTION validate_root_cause_depth();

-- Trigger for Corrective Action validation
DROP TRIGGER IF EXISTS trig_validate_corrective_action_specificity ON nca_records;
CREATE TRIGGER trig_validate_corrective_action_specificity
  BEFORE INSERT OR UPDATE ON nca_records
  FOR EACH ROW
  WHEN (NEW.corrective_action IS NOT NULL AND LENGTH(TRIM(NEW.corrective_action)) > 0)
  EXECUTE FUNCTION validate_corrective_action_specificity();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON FUNCTION validate_nc_description_quality() IS 
  'Validates NC description meets minimum length requirements based on NC type and checks for vague language patterns. Enforces BRCGS 5.7.2 compliance.';

COMMENT ON FUNCTION validate_root_cause_depth() IS 
  'Validates root cause analysis uses 5-Why method with sufficient depth. Prevents generic statements like "operator error" without deeper analysis.';

COMMENT ON FUNCTION validate_corrective_action_specificity() IS 
  'Validates corrective action includes specific actions, procedure references, verification methods, and timelines. Enforces BRCGS 5.7 Section 5 compliance.';

COMMENT ON FUNCTION get_nc_description_min_length(TEXT) IS 
  'Returns minimum character length requirement for NC description based on NC type: raw-material=120, finished-goods=150, wip=130, incident=200, other=100.';

COMMENT ON FUNCTION check_vague_language(TEXT, INTEGER) IS 
  'Checks if text contains vague language patterns (bad, broken, issue, problem) without sufficient detail. Returns FALSE if text is too vague.';

