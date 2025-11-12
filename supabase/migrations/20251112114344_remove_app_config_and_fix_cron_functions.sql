-- Remove app_config table and fix cron functions to work without it
--
-- SECURITY FIX: Storing service role keys in the database is a security anti-pattern.
-- Edge Functions should use their own environment variables for authentication.
--
-- This migration:
-- 1. Drops the app_config table (already dropped, this is for rollforward safety)
-- 2. Updates cron functions to call Edge Functions without passing service role key
-- 3. Edge Functions will use SUPABASE_SERVICE_ROLE_KEY from their environment

-- =============================================================================
-- Drop app_config table (if it still exists)
-- =============================================================================

DROP TABLE IF EXISTS app_config CASCADE;

-- =============================================================================
-- Fix: Call Update NCA Overdue Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_update_nca_overdue_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/update-nca-overdue';

  -- Make HTTP POST request to Edge Function
  -- Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from environment
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Log the result
  IF http_response.status_code != 200 THEN
    RAISE WARNING 'Update NCA Overdue Edge Function returned status %: %',
      http_response.status_code,
      http_response.content;
  ELSE
    RAISE NOTICE 'Update NCA Overdue Edge Function called successfully: %',
      http_response.content;
  END IF;
END;
$$;

-- =============================================================================
-- Fix: Call Send NCA Daily Reminder Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_send_nca_daily_reminder_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/send-nca-daily-reminder';

  -- Make HTTP POST request to Edge Function
  -- Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from environment
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Log the result
  IF http_response.status_code != 200 THEN
    RAISE WARNING 'Send NCA Daily Reminder Edge Function returned status %: %',
      http_response.status_code,
      http_response.content;
  ELSE
    RAISE NOTICE 'Send NCA Daily Reminder Edge Function called successfully: %',
      http_response.content;
  END IF;
END;
$$;

-- =============================================================================
-- Fix: Call Send Weekly NCA Review Edge Function
-- =============================================================================

CREATE OR REPLACE FUNCTION call_send_weekly_nca_review_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/send-weekly-nca-review';

  -- Make HTTP POST request to Edge Function
  -- Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from environment
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Log the result
  IF http_response.status_code != 200 THEN
    RAISE WARNING 'Send Weekly NCA Review Edge Function returned status %: %',
      http_response.status_code,
      http_response.content;
  ELSE
    RAISE NOTICE 'Send Weekly NCA Review Edge Function called successfully: %',
      http_response.content;
  END IF;
END;
$$;

-- =============================================================================
-- Fix: Call Send Reminders Function (from MJC temporary repairs)
-- =============================================================================

CREATE OR REPLACE FUNCTION call_send_reminders_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  function_url TEXT;
  http_response RECORD;
BEGIN
  -- Get project URL
  project_url := 'https://fpmnfokvcdqhbsawvyjh.supabase.co';
  function_url := project_url || '/functions/v1/send-reminders';

  -- Make HTTP POST request to Edge Function
  -- Edge Function will use its own SUPABASE_SERVICE_ROLE_KEY from environment
  SELECT * INTO http_response
  FROM pg_net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Log the result
  IF http_response.status_code != 200 THEN
    RAISE WARNING 'Edge Function call returned status %: %',
      http_response.status_code,
      http_response.content;
  ELSE
    RAISE NOTICE 'Edge Function called successfully: %',
      http_response.content;
  END IF;
END;
$$;

-- =============================================================================
-- Update function comments
-- =============================================================================

COMMENT ON FUNCTION call_update_nca_overdue_function() IS
  'Calls update-nca-overdue Edge Function (Procedure 5.7). Edge Function uses its own service role key from environment.';

COMMENT ON FUNCTION call_send_nca_daily_reminder_function() IS
  'Calls send-nca-daily-reminder Edge Function (Procedure 5.7). Edge Function uses its own service role key from environment.';

COMMENT ON FUNCTION call_send_weekly_nca_review_function() IS
  'Calls send-weekly-nca-review Edge Function (Procedure 5.7). Edge Function uses its own service role key from environment.';

COMMENT ON FUNCTION call_send_reminders_function() IS
  'Calls send-reminders Edge Function for temporary repair reminders. Edge Function uses its own service role key from environment.';

-- =============================================================================
-- Verification Query
-- =============================================================================

-- To verify the functions were updated, run:
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname LIKE 'call_%function'
-- AND prosrc NOT LIKE '%app_config%';
--
-- All four functions should appear (no references to app_config)
