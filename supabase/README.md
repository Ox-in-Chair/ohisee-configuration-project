# OHiSee NCA/MJC System - Database Migrations

**Organization:** Kangopak (Pty) Ltd
**Compliance:** BRCGS Food Safety Certified
**Database:** Supabase PostgreSQL (South Africa)

---

## Migration Files

### 1. `20251106101800_initial_schema.sql`
**Creates:**
- `users` table with 6 roles (operator → operations-manager)
- `machines` table with status tracking
- `work_orders` table with traceability
- Auto-increment functions: `generate_nca_number()`, `generate_mjc_number()`
- Trigger function: `update_updated_at()`

**Key Features:**
- UUID primary keys on all tables
- `created_at` and `updated_at` on all tables
- Foreign key constraints with `ON DELETE RESTRICT`
- Proper indexes for performance
- Email format validation
- Machine code format validation (CMH-01, SLT-01)
- WO number format validation (WO-YYYYMMDD-MACHINE-###)

### 2. `20251106101900_ncas_table.sql`
**Creates:**
- `ncas` table with all 11 sections from BRCGS specification
- Auto-generated NCA numbers (NCA-YYYY-########)
- Comprehensive check constraints:
  - NC description minimum 100 characters
  - Machine Down requires timestamp
  - Cross-contamination requires back tracking verification
  - Rework disposition requires instruction
  - Close out requires signature
- Triggers for `submitted_at` and `closed_at` timestamps
- Performance indexes (status, wo_id, machine_status, etc.)

**BRCGS Critical Fields:**
- `machine_status` = 'down' triggers alert
- `cross_contamination` = true requires back tracking
- `close_out_signature` required before status = 'closed'

### 3. `20251106102000_mjcs_table.sql`
**Creates:**
- `mjcs` table with all 11 sections including hygiene checklist
- Auto-generated MJC numbers (MJC-YYYY-########)
- Hygiene checklist JSONB array (10 items)
- Check constraints:
  - Description minimum 50 characters
  - Machine Down requires timestamp
  - Temporary repair auto-calculates due date (TODAY + 14 days)
  - Maintenance performed requires technician signature
  - Hygiene clearance requires ALL 10 items verified
- Function: `validate_hygiene_checklist()` enforces BRCGS compliance
- Trigger: `prevent_incomplete_clearance()` blocks clearance if checklist incomplete
- Partial indexes for workflow states (awaiting-clearance, overdue repairs)

**BRCGS Critical Fields:**
- `machine_status` = 'down' + `urgency` = 'critical' triggers alert
- `hygiene_checklist` must have ALL 10 items verified
- `hygiene_clearance_signature` QA-only, required before production resume
- `temporary_repair` = true auto-sets `close_out_due_date` = TODAY + 14 days

### 4. `20251106102100_audit_trail.sql`
**Creates:**
- `audit_trail` table (immutable, INSERT-only)
- Function: `log_audit_trail()` generic audit logging
- Function: `log_machine_down_alert()` specific Machine Down tracking
- Function: `log_hygiene_clearance()` BRCGS hygiene clearance tracking
- Triggers on `ncas`, `mjcs`, `work_orders` for automatic audit logging

**Audit Fields:**
- Who: `user_id`, `user_email`, `user_name`, `user_role`
- What: `action`, `changed_fields`, `old_value`, `new_value`
- When: `timestamp`
- Where: `ip_address`, `user_agent`

**BRCGS Compliance:**
- All changes logged automatically (no manual INSERT)
- Immutable records (no UPDATE/DELETE)
- IP address tracking for security
- 3+ year retention required

### 5. `20251106102200_rls_policies.sql`
**Creates:**
- Row-Level Security policies for all tables
- Helper functions: `user_has_role()`, `get_user_role()`, `can_close_nca()`, `can_grant_hygiene_clearance()`

**RLS Policies:**

**Users:**
- All authenticated users can view users (for lookups)
- Only operations-manager can modify users

**Machines:**
- All authenticated users can view machines
- Only maintenance-manager and operations-manager can modify

**Work Orders:**
- All authenticated users can view work orders
- Operators can create and update their own active work orders
- Team leaders and managers can update any work order

**NCAs:**
- Operators can view/edit their own draft NCAs
- Team leaders can view department NCAs
- QA/Management can view all NCAs
- Only QA supervisor and operations manager can close NCAs
- NO DELETE (BRCGS immutable records)

**MJCs:**
- Operators can view/edit their own draft MJCs
- Maintenance technicians can view assigned MJCs
- QA supervisors can view all MJCs
- Maintenance managers can assign MJCs
- Technicians can update assigned MJCs (perform maintenance)
- **BRCGS CRITICAL:** Only QA supervisors can grant hygiene clearance
- NO DELETE (BRCGS immutable records)

**Audit Trail:**
- All users can view audit trail (read-only)
- INSERT only via triggers (SECURITY DEFINER)
- NO UPDATE or DELETE

### 6. `20251106102300_seed_data.sql`
**Creates:**
- 6 test users (one per role)
- 3 machines (CMH-01, CMH-02, SLT-01)
- 3 work orders (1 active, 1 paused, 1 completed)
- 1 draft NCA
- 1 open MJC with Machine Down status
- Pre-populated hygiene checklist (10 items, none verified)

**DO NOT RUN IN PRODUCTION** - Development/Testing only

---

## Running Migrations

### Local Development (Supabase CLI)

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to remote project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push

# Or apply specific migration
supabase migration up --file 20251106101800_initial_schema.sql
```

### Production Deployment

```bash
# Apply all migrations
supabase db push --db-url postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Verify migrations applied
supabase migration list --remote
```

### Manual Application (psql)

```bash
# Connect to database
psql postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Apply migration
\i supabase/migrations/20251106101800_initial_schema.sql
\i supabase/migrations/20251106101900_ncas_table.sql
\i supabase/migrations/20251106102000_mjcs_table.sql
\i supabase/migrations/20251106102100_audit_trail.sql
\i supabase/migrations/20251106102200_rls_policies.sql
\i supabase/migrations/20251106102300_seed_data.sql
```

---

## Validation Checks

Run these queries after applying migrations to verify everything is correct:

### 1. Verify Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Should return: audit_trail, machines, mjcs, ncas, users, work_orders
```

### 2. Verify RLS Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- rowsecurity should be TRUE for all tables
```

### 3. Verify Functions Created
```sql
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
-- Should include: generate_nca_number, generate_mjc_number, validate_hygiene_checklist, etc.
```

### 4. Verify Triggers Created
```sql
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
-- Should show triggers for updated_at, audit_trail, hygiene_clearance, etc.
```

### 5. Verify Indexes Created
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
-- Should include idx_nca_number, idx_mjc_status, etc.
```

### 6. Test NCA Number Generation
```sql
SELECT generate_nca_number();
-- Should return: NCA-2025-00000001
```

### 7. Test MJC Number Generation
```sql
SELECT generate_mjc_number();
-- Should return: MJC-2025-00000001
```

### 8. Test Hygiene Checklist Validation
```sql
SELECT validate_hygiene_checklist('[
  {"item": "Test 1", "verified": true},
  {"item": "Test 2", "verified": true},
  {"item": "Test 3", "verified": true},
  {"item": "Test 4", "verified": true},
  {"item": "Test 5", "verified": true},
  {"item": "Test 6", "verified": true},
  {"item": "Test 7", "verified": true},
  {"item": "Test 8", "verified": true},
  {"item": "Test 9", "verified": true},
  {"item": "Test 10", "verified": true}
]'::jsonb);
-- Should return: true

SELECT validate_hygiene_checklist('[
  {"item": "Test 1", "verified": true},
  {"item": "Test 2", "verified": false}
]'::jsonb);
-- Should return: false
```

### 9. Verify Seed Data (if applied)
```sql
SELECT COUNT(*) FROM users; -- Should return 6
SELECT COUNT(*) FROM machines; -- Should return 3
SELECT COUNT(*) FROM work_orders; -- Should return 3
SELECT COUNT(*) FROM ncas; -- Should return 1
SELECT COUNT(*) FROM mjcs; -- Should return 1
```

### 10. Test RLS Policies (requires authentication)
```sql
-- As operator, should only see own NCAs
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "10000000-0000-0000-0000-000000000001"}';
SELECT COUNT(*) FROM ncas; -- Should return 1 (own NCA only)

-- As QA supervisor, should see all NCAs
SET LOCAL "request.jwt.claims" = '{"sub": "10000000-0000-0000-0000-000000000004"}';
SELECT COUNT(*) FROM ncas; -- Should return all NCAs
```

---

## Common Issues

### Issue: RLS policies blocking queries
**Solution:** Ensure you're calling Supabase functions from authenticated context (auth.uid() must return valid user)

### Issue: Foreign key constraint violations
**Solution:** Insert parent records first (users, machines, work_orders) before child records (ncas, mjcs)

### Issue: Check constraint violations
**Solution:** Verify data matches enum values (e.g., role must be one of 6 allowed values)

### Issue: Sequence not resetting annually
**Solution:** NCA/MJC number functions check for existing records and reset sequence automatically

### Issue: Hygiene clearance blocked
**Solution:** Ensure ALL 10 hygiene checklist items have `verified: true` before attempting clearance

---

## Rollback Procedures

**IMPORTANT:** Supabase does not support automatic rollback. Create manual down migrations if needed.

### Example Rollback (20251106102300_seed_data.sql)
```sql
-- Remove seed data
DELETE FROM ncas WHERE id = '40000000-0000-0000-0000-000000000001';
DELETE FROM mjcs WHERE id = '50000000-0000-0000-0000-000000000001';
DELETE FROM work_orders WHERE id IN (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003'
);
DELETE FROM machines WHERE id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003'
);
DELETE FROM users WHERE id LIKE '10000000-0000-0000-0000-%';
```

### Full Schema Rollback (DESTRUCTIVE - Use with caution)
```sql
-- Drop all tables (cascades to dependent objects)
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS mjcs CASCADE;
DROP TABLE IF EXISTS ncas CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_nca_number CASCADE;
DROP FUNCTION IF EXISTS generate_mjc_number CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS validate_hygiene_checklist CASCADE;
DROP FUNCTION IF EXISTS log_audit_trail CASCADE;
DROP FUNCTION IF EXISTS log_machine_down_alert CASCADE;
DROP FUNCTION IF EXISTS log_hygiene_clearance CASCADE;
DROP FUNCTION IF EXISTS user_has_role CASCADE;
DROP FUNCTION IF EXISTS get_user_role CASCADE;
DROP FUNCTION IF EXISTS can_close_nca CASCADE;
DROP FUNCTION IF EXISTS can_grant_hygiene_clearance CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS nca_number_seq CASCADE;
DROP SEQUENCE IF EXISTS mjc_number_seq CASCADE;
```

---

## Architecture Notes

### Dependency Injection (NO STATIC CALLS)
All database operations MUST use injected Supabase client:

```typescript
// ✅ CORRECT - Dependency injection
export async function getNCA(client: SupabaseClient, id: string) {
  return await client.from('ncas').select('*').eq('id', id).single();
}

// ❌ WRONG - Static call
import { supabase } from '@/lib/supabase';
export async function getNCA(id: string) {
  return await supabase.from('ncas').select('*').eq('id', id).single();
}
```

### Server Components vs Client Components
- **Server Components:** Fetch data server-side using service role client
- **Client Components:** Use client-side Supabase client via context
- **Server Actions:** Use service role client for mutations with proper validation

### RLS Enforcement
- RLS enforced at database level (NEVER trust client)
- All policies use `auth.uid()` for current user
- Service role bypasses RLS (use with caution)

---

## Support

**Database Administrator:** David Wilson (Operations Manager)
**Email:** david.wilson@kangopak.com
**Supabase Project:** ohisee-nca-mjc (South Africa region)
**BRCGS Compliance Officer:** Sarah Williams (QA Supervisor)
