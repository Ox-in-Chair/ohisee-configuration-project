# Database Migration Instructions

## Overview
This document provides instructions for applying the OHiSee NCA/MJC database migrations to your Supabase project.

## Method 1: Manual SQL Editor (Recommended)

### Step 1: Access Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **fpmnfokvcdqhbsawvyjh**
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute Full Migration
1. Open the file: `supabase/FULL_MIGRATION.sql` (57KB)
2. Copy the entire file contents
3. Paste into the SQL Editor
4. Click **Run** button

### Step 3: Verify Tables Created
After running the migration, verify the following tables exist:

**Core Tables:**
- `users` - System users with role-based access
- `machines` - Production equipment registry
- `work_orders` - Active production orders
- `ncas` - Non-Conformance Advice records
- `mjcs` - Maintenance Job Card records
- `audit_log` - Comprehensive audit trail

**Verification Query:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected output: 6 tables (users, machines, work_orders, ncas, mjcs, audit_log)

### Step 4: Verify Functions Created
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

Expected functions:
- `generate_nca_number()` - Auto-generates NCA-YYYY-########
- `generate_mjc_number()` - Auto-generates MJC-YYYY-########
- `update_updated_at()` - Auto-updates timestamp triggers
- `log_table_changes()` - Audit trail logging
- `validate_hygiene_checklist()` - Validates all 10 items checked

### Step 5: Verify RLS Policies
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: 20+ RLS policies across all tables

### Step 6: Test Auto-Numbering
```sql
-- Test NCA number generation
SELECT generate_nca_number();
-- Expected: NCA-2025-00000001

-- Test MJC number generation
SELECT generate_mjc_number();
-- Expected: MJC-2025-00000001
```

---

## Method 2: Individual Migration Files (Alternative)

If the full migration fails, execute files individually in this order:

1. `20251106101800_initial_schema.sql` - Users, machines, work orders
2. `20251106101900_ncas_table.sql` - NCA table with validation
3. `20251106102000_mjcs_table.sql` - MJC table with hygiene checklist
4. `20251106102100_audit_trail.sql` - Comprehensive audit logging
5. `20251106102200_rls_policies.sql` - Row Level Security policies
6. `20251106102300_seed_data.sql` - Test data for development

**How to execute:**
1. Copy contents of first file
2. Paste into SQL Editor
3. Click **Run**
4. Wait for "Success"
5. Repeat for next file

---

## Method 3: Supabase CLI (If Configured)

If you have Supabase CLI installed and linked:

```bash
cd ohisee-reports
supabase db push
```

**Note:** This requires prior setup with `supabase login` and `supabase link --project-ref fpmnfokvcdqhbsawvyjh`

---

## Troubleshooting

### Error: "relation ncas does not exist"
**Cause:** Migration 2 failed because migration 1 didn't complete
**Fix:** Execute migrations in order, ensuring each completes successfully

### Error: "permission denied"
**Cause:** Not using service role or insufficient permissions
**Fix:** Ensure you're logged into Supabase dashboard as project owner

### Error: "duplicate key value violates unique constraint"
**Cause:** Migration already partially applied
**Fix:**
```sql
-- Check existing tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- If tables exist, drop them and restart
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS mjcs CASCADE;
DROP TABLE IF EXISTS ncas CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Then re-run FULL_MIGRATION.sql
```

### Error: "function generate_nca_number() does not exist"
**Cause:** Migration 1 (initial_schema.sql) didn't complete
**Fix:** Re-run migration 1 only, then continue with migration 2

---

## Post-Migration Verification

### 1. Test NCA Form Submission
1. Navigate to http://localhost:3008/nca/new
2. Fill out form
3. Click **Submit**
4. Verify success message with NCA number

### 2. Test MJC Form Submission
1. Navigate to http://localhost:3008/mjc/new
2. Fill out form including all 10 hygiene checks
3. Click **Submit**
4. Verify success message with MJC number

### 3. Verify Database Records
```sql
-- Check NCA records
SELECT nca_number, nc_type, status, created_at
FROM ncas
ORDER BY created_at DESC
LIMIT 5;

-- Check MJC records
SELECT mjc_number, machine_status, status, created_at
FROM mjcs
ORDER BY created_at DESC
LIMIT 5;

-- Check audit log
SELECT table_name, operation, changed_at
FROM audit_log
ORDER BY changed_at DESC
LIMIT 10;
```

---

## Seed Data (Optional)

The migration includes seed data with:
- 6 test users (operator, team-leader, qa-supervisor, etc.)
- 5 test machines (CMH-01, SLT-01, SPT-01, SPT-02, CMH-02)
- 2 active work orders

**To skip seed data:**
Execute only migrations 1-5, skip migration 6 (seed_data.sql)

**To add your own users:**
```sql
INSERT INTO users (email, name, role, department)
VALUES
  ('your.email@kangopak.co.za', 'Your Name', 'operator', 'pouching'),
  ('qa.supervisor@kangopak.co.za', 'QA Name', 'qa-supervisor', 'quality');
```

---

## Architecture Compliance

✅ **Zero static method calls** - All database access via injected Supabase client
✅ **Row Level Security** - 20+ policies enforcing data isolation
✅ **Audit trail** - All changes logged to audit_log table
✅ **Auto-numbering** - NCA/MJC numbers auto-generated with year reset
✅ **Referential integrity** - Foreign keys with CASCADE/RESTRICT rules
✅ **Data validation** - CHECK constraints, regex validation, conditional logic

---

## Next Steps After Migration

1. ✅ Test forms: http://localhost:3008/nca/new
2. ✅ Test forms: http://localhost:3008/mjc/new
3. ✅ Run scaffolding tests: `npm run test`
4. ⏳ Implement file upload component
5. ⏳ Add authentication and role-based access
6. ⏳ Create NCA/MJC registers (list views)

---

## Support

If migrations fail after following these instructions:
1. Check Supabase project status (https://status.supabase.com/)
2. Verify you're using the correct project (fpmnfokvcdqhbsawvyjh)
3. Ensure you have project owner permissions
4. Check Supabase logs for detailed error messages

---

**Database Schema Documentation:** See `supabase/README.md`
**Validation Checklist:** See `supabase/VALIDATION_CHECKLIST.md`
**Database Setup Summary:** See `DATABASE_SETUP_SUMMARY.md`
