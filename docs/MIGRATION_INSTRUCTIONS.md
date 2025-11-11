# Database Migration Instructions

## New Migrations to Apply

Two new migration files have been created that need to be applied to your Supabase database:

1. **`supabase/migrations/20251111_create_notifications_table.sql`** - Creates the notifications queue/logger table
2. **`supabase/migrations/20251111_add_register_indexes.sql`** - Adds performance indexes for NCA/MJC registers

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open each migration file and copy its contents
4. Paste into the SQL Editor
5. Click **Run** to execute

**Order of execution:**
1. First run: `20251111_create_notifications_table.sql`
2. Then run: `20251111_add_register_indexes.sql`

### Option 2: Supabase CLI

If you have Supabase CLI configured:

```bash
# Link to your project (if not already linked)
npx supabase link --project-ref fpmnfokvcdqhbsawvyjh

# Push migrations
npx supabase db push
```

### Option 3: Migration Script (Requires Access Token)

If you have a `SUPABASE_ACCESS_TOKEN` in your `.env.local`:

```bash
node scripts/apply-migrations.mjs
```

**Note:** The migration script requires a valid `SUPABASE_ACCESS_TOKEN`. Get it from:
https://supabase.com/dashboard/account/tokens

## Verification

After applying migrations, verify they were successful:

1. **Check notifications table exists:**
   ```sql
   SELECT * FROM notifications LIMIT 1;
   ```

2. **Check indexes were created:**
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE tablename IN ('ncas', 'mjcs', 'work_orders')
   ORDER BY tablename, indexname;
   ```

3. **Test query performance:**
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM ncas 
   WHERE status = 'open' 
   ORDER BY created_at DESC 
   LIMIT 25;
   ```

## What These Migrations Do

### 1. Notifications Table (`20251111_create_notifications_table.sql`)

Creates a table to track all notification attempts:
- Logs all email notifications sent
- Tracks delivery status (pending, sent, failed, retrying)
- Stores retry count and error messages
- Links notifications to related entities (NCA, MJC, etc.)
- Provides audit trail for BRCGS compliance

### 2. Register Indexes (`20251111_add_register_indexes.sql`)

Adds performance indexes on frequently filtered columns:
- **NCA indexes:** status, created_at, nca_number, machine_status, wo_id
- **MJC indexes:** status, urgency, created_at, job_card_number, machine_status, temporary_repair + due_date
- **Work Order indexes:** status, operator_id, created_at

**Performance target:** <200ms query time for 1000+ records

## Troubleshooting

### Migration Fails with "relation already exists"

If you see errors like "relation notifications already exists", the migration has already been applied. You can safely skip it.

### Index Creation Fails

If index creation fails, it's usually safe to continue. The `IF NOT EXISTS` clause prevents errors if indexes already exist.

### Need to Rollback

If you need to rollback:

1. **Drop notifications table:**
   ```sql
   DROP TABLE IF EXISTS notifications CASCADE;
   ```

2. **Drop indexes (if needed):**
   ```sql
   DROP INDEX IF EXISTS idx_ncas_status;
   DROP INDEX IF EXISTS idx_mjcs_status;
   -- ... etc
   ```

## Next Steps

After applying migrations:

1. ✅ Run tests: `npm test`
2. ✅ Test forms: Create NCA/MJC and verify notifications work
3. ✅ Test register pagination: Navigate to `/nca/register` and `/mjc/register`
4. ✅ Verify URL parameter sync: Apply filters and check URL updates
5. ✅ Test end-of-day submission: Submit end-of-day and verify email report

