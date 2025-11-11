# NCA Cron Jobs Setup Guide

**Procedure 5.7: Automated Daily and Weekly NCA Management**

This guide explains how to set up and verify the cron jobs for NCA management automation.

---

## Overview

Three cron jobs have been configured to automate NCA management tasks:

1. **Daily: Update NCA Overdue Status** (8:00 AM)
   - Updates `is_overdue` flag for NCAs past their 20 working day due date
   - Edge Function: `update-nca-overdue`

2. **Daily: Send NCA Daily Reminder** (9:00 AM)
   - Sends daily reminder to Warehouse Team Leader for new NCAs
   - Edge Function: `send-nca-daily-reminder`
   - Procedure 5.7: Daily NCA book check

3. **Weekly: Send Weekly NCA Review** (Monday 8:00 AM)
   - Sends weekly review report to Commercial Manager
   - Edge Function: `send-weekly-nca-review`
   - Procedure 5.7: Weekly NCA Register review

---

## Prerequisites

1. **Supabase Project** with Edge Functions enabled
2. **Service Role Key** stored in `app_config` table
3. **Edge Functions Deployed**:
   - `update-nca-overdue`
   - `send-nca-daily-reminder`
   - `send-weekly-nca-review`

---

## Setup Steps

### Step 1: Apply Database Migration

Run the migration to create the cron job functions and schedules:

```sql
-- Apply the migration
-- File: supabase/migrations/20251112_schedule_nca_cron_jobs.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Service Role Key

Ensure the service role key is stored in the `app_config` table:

```sql
-- Check if service role key exists
SELECT key, description, updated_at 
FROM app_config 
WHERE key = 'service_role_key';

-- If not found, insert it:
INSERT INTO app_config (key, value, description)
VALUES (
  'service_role_key',
  'your-service-role-key-here',
  'Service role key for Edge Function authentication'
)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

**Note:** Get your service role key from:
- Supabase Dashboard > Settings > API > Service Role Key

### Step 3: Deploy Edge Functions

Deploy the Edge Functions to Supabase:

```bash
# Deploy all Edge Functions
supabase functions deploy update-nca-overdue
supabase functions deploy send-nca-daily-reminder
supabase functions deploy send-weekly-nca-review
```

Or deploy all at once:
```bash
supabase functions deploy
```

### Step 4: Verify Cron Jobs Are Scheduled

Check that the cron jobs are scheduled:

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname IN (
  'update-nca-overdue-status',
  'send-nca-daily-reminder',
  'send-weekly-nca-review'
)
ORDER BY jobname;
```

Expected output:
- `update-nca-overdue-status` - Schedule: `0 8 * * *` (Daily at 8:00 AM)
- `send-nca-daily-reminder` - Schedule: `0 9 * * *` (Daily at 9:00 AM)
- `send-weekly-nca-review` - Schedule: `0 8 * * 1` (Monday at 8:00 AM)

---

## Testing

### Test Functions Manually

Test each function manually before relying on cron:

```sql
-- Test Update NCA Overdue Status
SELECT call_update_nca_overdue_function();

-- Test Send NCA Daily Reminder
SELECT call_send_nca_daily_reminder_function();

-- Test Send Weekly NCA Review
SELECT call_send_weekly_nca_review_function();
```

### Test Edge Functions Directly

You can also test the Edge Functions directly via HTTP:

```bash
# Test Update NCA Overdue Status
curl -X POST https://your-project.supabase.co/functions/v1/update-nca-overdue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Test Send NCA Daily Reminder
curl -X POST https://your-project.supabase.co/functions/v1/send-nca-daily-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Test Send Weekly NCA Review
curl -X POST https://your-project.supabase.co/functions/v1/send-weekly-nca-review \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## Monitoring

### View Cron Job Execution History

Check the execution history for all NCA cron jobs:

```sql
SELECT 
  j.jobname,
  j.schedule,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message,
  jr.job_pid
FROM cron.job j
LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE j.jobname IN (
  'update-nca-overdue-status',
  'send-nca-daily-reminder',
  'send-weekly-nca-review'
)
ORDER BY jr.start_time DESC
LIMIT 50;
```

### Check for Failed Jobs

Find failed cron job executions:

```sql
SELECT 
  j.jobname,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message
FROM cron.job j
JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE j.jobname IN (
  'update-nca-overdue-status',
  'send-nca-daily-reminder',
  'send-weekly-nca-review'
)
AND jr.status = 'failed'
ORDER BY jr.start_time DESC;
```

### View Recent Executions

Get the most recent execution for each job:

```sql
SELECT DISTINCT ON (j.jobname)
  j.jobname,
  j.schedule,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
WHERE j.jobname IN (
  'update-nca-overdue-status',
  'send-nca-daily-reminder',
  'send-weekly-nca-review'
)
ORDER BY j.jobname, jr.start_time DESC;
```

---

## Troubleshooting

### Issue: Cron Job Not Running

**Check if pg_cron extension is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not enabled:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Check if cron jobs are active:**
```sql
SELECT jobname, active FROM cron.job 
WHERE jobname IN (
  'update-nca-overdue-status',
  'send-nca-daily-reminder',
  'send-weekly-nca-review'
);
```

If `active = false`, the job won't run. Check the `nodename` and `nodeport` settings.

### Issue: Edge Function Returns 401/403

**Verify service role key is correct:**
```sql
SELECT key, LENGTH(value) as key_length, updated_at 
FROM app_config 
WHERE key = 'service_role_key';
```

**Check Edge Function logs:**
- Supabase Dashboard > Edge Functions > [Function Name] > Logs

### Issue: Edge Function Returns 500

**Check Edge Function logs for errors:**
- Supabase Dashboard > Edge Functions > [Function Name] > Logs

**Verify database functions exist:**
```sql
-- Check if update_nca_overdue_status function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'update_nca_overdue_status';
```

### Issue: Email Notifications Not Sending

**Note:** The Edge Functions currently return data but don't send emails directly. To enable email sending:

1. **Option 1:** Integrate Resend or SMTP directly in Edge Functions
2. **Option 2:** Have Edge Functions call a server action that uses the notification service

**Current Status:**
- Edge Functions collect and return data
- Email sending needs to be integrated (see TODOs in Edge Function code)

---

## Modifying Cron Schedules

### Change Schedule

To change when a cron job runs:

```sql
-- Unschedule the existing job
SELECT cron.unschedule('update-nca-overdue-status');

-- Schedule with new time (e.g., 10:00 AM instead of 8:00 AM)
SELECT cron.schedule(
  'update-nca-overdue-status',
  '0 10 * * *',  -- Daily at 10:00 AM
  $$SELECT call_update_nca_overdue_function();$$
);
```

### Cron Schedule Format

Cron format: `minute hour day month weekday`

Examples:
- `0 8 * * *` - Daily at 8:00 AM
- `0 9 * * *` - Daily at 9:00 AM
- `0 8 * * 1` - Monday at 8:00 AM
- `0 8 * * 5` - Friday at 8:00 AM
- `0 0 1 * *` - First day of every month at midnight
- `0 0 * * 1` - Every Monday at midnight

---

## Unschedule Jobs

To remove a cron job:

```sql
-- Unschedule a specific job
SELECT cron.unschedule('update-nca-overdue-status');
SELECT cron.unschedule('send-nca-daily-reminder');
SELECT cron.unschedule('send-weekly-nca-review');

-- Or unschedule all NCA jobs
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'update-nca-overdue-status',
  'send-nca-daily-reminder',
  'send-weekly-nca-review'
);
```

---

## Next Steps

1. **Deploy Edge Functions** to Supabase
2. **Test functions manually** to verify they work
3. **Monitor cron job execution** for the first few days
4. **Integrate email sending** in Edge Functions (currently returns data only)
5. **Set up alerting** for failed cron jobs (optional)

---

## Related Files

- **Migration:** `supabase/migrations/20251112_schedule_nca_cron_jobs.sql`
- **Edge Functions:**
  - `supabase/functions/update-nca-overdue/index.ts`
  - `supabase/functions/send-nca-daily-reminder/index.ts`
  - `supabase/functions/send-weekly-nca-review/index.ts`
- **Services:**
  - `lib/services/nca-overdue-service.ts`
  - `lib/services/nca-daily-reminder-service.ts`
  - `lib/services/nca-weekly-review-service.ts`

---

**Last Updated:** 2025-11-12  
**Procedure Reference:** 5.7 Control of Non-Conforming Product

