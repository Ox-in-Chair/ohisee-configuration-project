-- OHiSee Temporary Repair Reminders Cron Schedule
-- Sets up daily cron job to send reminders for temporary repairs approaching 14-day BRCGS limit
-- Runs daily at 9:00 AM

-- =============================================================================
-- Enable Required Extensions
-- =============================================================================

-- Enable pg_cron for scheduling jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for making HTTP requests to Edge Functions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- Function to Call Edge Function
-- =============================================================================

-- Function that calls the send-reminders Edge Function
-- Uses Supabase's pg_net extension to make HTTP requests
CREATE OR REPLACE FUNCTION call_send_reminders_function()
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
  -- Get project URL from environment or use default
  -- In Supabase, the project URL is available via current_setting or environment
  project_url := current_setting('app.settings.supabase_url', true);
  
  -- If not set, use the default project URL (replace with your actual project ref)
  IF project_url IS NULL OR project_url = '' THEN
    project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  END IF;
  
  function_url := project_url || '/functions/v1/send-reminders';
  
  -- Get service role key from environment variable or secret
  -- In Supabase, this should be set via dashboard secrets or environment
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If service role key is not available, try to get it from vault
  -- Note: You'll need to set this via Supabase Dashboard > Settings > Database > Secrets
  IF service_role_key IS NULL OR service_role_key = '' THEN
    -- Try to get from vault (Supabase's secret management)
    BEGIN
      service_role_key := current_setting('vault.service_role_key', true);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Service role key not found. Please set it via Supabase Dashboard.';
        RETURN;
    END;
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
    RAISE WARNING 'Edge Function call returned status %: %', response_status, response_body;
  ELSE
    RAISE NOTICE 'Edge Function called successfully: %', response_body;
  END IF;
END;
$$;

-- =============================================================================
-- Schedule Cron Job
-- =============================================================================

-- Schedule the function to run daily at 9:00 AM
-- Cron format: minute hour day month weekday
-- '0 9 * * *' = 9:00 AM every day
SELECT cron.schedule(
  'send-temporary-repair-reminders',
  '0 9 * * *',  -- Daily at 9:00 AM
  $$SELECT call_send_reminders_function();$$
);

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON FUNCTION call_send_reminders_function() IS 
  'Calls the send-reminders Edge Function to process temporary repair reminders';

COMMENT ON EXTENSION pg_cron IS 
  'Enables scheduled cron jobs in PostgreSQL';

COMMENT ON EXTENSION pg_net IS 
  'Enables HTTP requests from PostgreSQL functions';

-- =============================================================================
-- Manual Setup Instructions
-- =============================================================================

-- NOTE: After applying this migration, you need to:
-- 1. Set the Supabase project URL (if not using default):
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--
-- 2. Set the service role key (required for Edge Function authentication):
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--
-- OR set these via Supabase Dashboard:
--    Settings > Database > Connection Pooling > Custom Connection Parameters
--
-- 3. Verify the cron job is scheduled:
--    SELECT * FROM cron.job WHERE jobname = 'send-temporary-repair-reminders';
--
-- 4. Test the function manually:
--    SELECT call_send_reminders_function();
--
-- 5. View cron job execution history:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-temporary-repair-reminders')
--    ORDER BY start_time DESC LIMIT 10;

