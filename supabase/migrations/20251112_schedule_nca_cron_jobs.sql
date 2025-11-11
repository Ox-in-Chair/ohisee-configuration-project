-- OHiSee NCA Cron Jobs Schedule
-- Sets up daily and weekly cron jobs for NCA management
-- Procedure 5.7: Daily reminders and weekly reviews
--
-- Jobs:
-- 1. Daily: Update NCA Overdue Status (runs at 8:00 AM)
-- 2. Daily: Send NCA Daily Reminder to Warehouse Team Leader (runs at 9:00 AM)
-- 3. Weekly: Send Weekly NCA Review to Commercial Manager (runs Monday at 8:00 AM)

-- =============================================================================
-- Enable Required Extensions (if not already enabled)
-- =============================================================================

-- Enable pg_cron for scheduling jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for making HTTP requests to Edge Functions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- Function: Call Update NCA Overdue Status Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_update_nca_overdue_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  service_role_key TEXT;
  response_status INT;
  response_body TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL (hardcoded for now - update with your project URL)
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/update-nca-overdue';
  
  -- Get service role key from app_config table
  SELECT value INTO service_role_key
  FROM app_config
  WHERE key = 'service_role_key';
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key not found in app_config table. Please insert it.';
    RETURN;
  END IF;
  
  -- Make HTTP POST request to Edge Function
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    ),
    body := '{}'::jsonb
  );
  
  response_status := http_response.status_code;
  response_body := http_response.content;
  
  -- Log the result
  IF response_status != 200 THEN
    RAISE WARNING 'Update NCA Overdue Edge Function call returned status %: %', response_status, response_body;
  ELSE
    RAISE NOTICE 'Update NCA Overdue Edge Function called successfully: %', response_body;
  END IF;
END;
$$;

-- =============================================================================
-- Function: Call Send NCA Daily Reminder Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_send_nca_daily_reminder_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  service_role_key TEXT;
  response_status INT;
  response_body TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL (hardcoded for now - update with your project URL)
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/send-nca-daily-reminder';
  
  -- Get service role key from app_config table
  SELECT value INTO service_role_key
  FROM app_config
  WHERE key = 'service_role_key';
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key not found in app_config table. Please insert it.';
    RETURN;
  END IF;
  
  -- Make HTTP POST request to Edge Function
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    ),
    body := '{}'::jsonb
  );
  
  response_status := http_response.status_code;
  response_body := http_response.content;
  
  -- Log the result
  IF response_status != 200 THEN
    RAISE WARNING 'Send NCA Daily Reminder Edge Function call returned status %: %', response_status, response_body;
  ELSE
    RAISE NOTICE 'Send NCA Daily Reminder Edge Function called successfully: %', response_body;
  END IF;
END;
$$;

-- =============================================================================
-- Function: Call Send Weekly NCA Review Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_send_weekly_nca_review_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  service_role_key TEXT;
  response_status INT;
  response_body TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL (hardcoded for now - update with your project URL)
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/send-weekly-nca-review';
  
  -- Get service role key from app_config table
  SELECT value INTO service_role_key
  FROM app_config
  WHERE key = 'service_role_key';
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE WARNING 'Service role key not found in app_config table. Please insert it.';
    RETURN;
  END IF;
  
  -- Make HTTP POST request to Edge Function
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    ),
    body := '{}'::jsonb
  );
  
  response_status := http_response.status_code;
  response_body := http_response.content;
  
  -- Log the result
  IF response_status != 200 THEN
    RAISE WARNING 'Send Weekly NCA Review Edge Function call returned status %: %', response_status, response_body;
  ELSE
    RAISE NOTICE 'Send Weekly NCA Review Edge Function called successfully: %', response_body;
  END IF;
END;
$$;

-- =============================================================================
-- Schedule Cron Jobs
-- =============================================================================

-- 1. Daily: Update NCA Overdue Status
-- Runs daily at 8:00 AM to update is_overdue flag for NCAs past their due date
-- Cron format: minute hour day month weekday
-- '0 8 * * *' = 8:00 AM every day
SELECT cron.schedule(
  'update-nca-overdue-status',
  '0 8 * * *',  -- Daily at 8:00 AM
  $$SELECT call_update_nca_overdue_function();$$
);

-- 2. Daily: Send NCA Daily Reminder to Warehouse Team Leader
-- Runs daily at 9:00 AM to remind Warehouse Team Leader to check for new NCAs
-- Procedure 5.7: NCA book checked daily by Warehouse Team Leader
-- '0 9 * * *' = 9:00 AM every day
SELECT cron.schedule(
  'send-nca-daily-reminder',
  '0 9 * * *',  -- Daily at 9:00 AM
  $$SELECT call_send_nca_daily_reminder_function();$$
);

-- 3. Weekly: Send Weekly NCA Review to Commercial Manager
-- Runs weekly on Monday at 8:00 AM for weekly NCA Register review
-- Procedure 5.7: Weekly NCA Register review by Commercial Manager
-- '0 8 * * 1' = 8:00 AM every Monday (1 = Monday)
SELECT cron.schedule(
  'send-weekly-nca-review',
  '0 8 * * 1',  -- Weekly on Monday at 8:00 AM
  $$SELECT call_send_weekly_nca_review_function();$$
);

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON FUNCTION call_update_nca_overdue_function() IS 
  'Calls the update-nca-overdue Edge Function to update overdue status for NCAs (Procedure 5.7)';

COMMENT ON FUNCTION call_send_nca_daily_reminder_function() IS 
  'Calls the send-nca-daily-reminder Edge Function to send daily reminder to Warehouse Team Leader (Procedure 5.7)';

COMMENT ON FUNCTION call_send_weekly_nca_review_function() IS 
  'Calls the send-weekly-nca-review Edge Function to send weekly review to Commercial Manager (Procedure 5.7)';

-- =============================================================================
-- Manual Setup Instructions
-- =============================================================================

-- NOTE: After applying this migration, you need to:
-- 1. Ensure the service role key is stored in app_config table:
--    INSERT INTO app_config (key, value, description)
--    VALUES ('service_role_key', 'your-service-role-key', 'Service role key for Edge Function authentication')
--    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- 2. Update the project URL in the functions if different from default:
--    Edit the project_url variable in each function
--
-- 3. Verify the cron jobs are scheduled:
--    SELECT * FROM cron.job WHERE jobname IN (
--      'update-nca-overdue-status',
--      'send-nca-daily-reminder',
--      'send-weekly-nca-review'
--    );
--
-- 4. Test the functions manually:
--    SELECT call_update_nca_overdue_function();
--    SELECT call_send_nca_daily_reminder_function();
--    SELECT call_send_weekly_nca_review_function();
--
-- 5. View cron job execution history:
--    SELECT 
--      j.jobname,
--      j.schedule,
--      j.command,
--      jr.start_time,
--      jr.end_time,
--      jr.status,
--      jr.return_message
--    FROM cron.job j
--    LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
--    WHERE j.jobname IN (
--      'update-nca-overdue-status',
--      'send-nca-daily-reminder',
--      'send-weekly-nca-review'
--    )
--    ORDER BY jr.start_time DESC
--    LIMIT 20;
--
-- 6. To unschedule a job (if needed):
--    SELECT cron.unschedule('update-nca-overdue-status');
--    SELECT cron.unschedule('send-nca-daily-reminder');
--    SELECT cron.unschedule('send-weekly-nca-review');

