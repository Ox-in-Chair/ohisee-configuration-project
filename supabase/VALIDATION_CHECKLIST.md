# OHiSee NCA/MJC System - Database Validation Checklist

**Run these checks after applying migrations to verify schema correctness**

## Pre-Deployment Checks

### 1. Environment Variables
```bash
# Verify all required environment variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
echo $SUPABASE_SERVICE_ROLE_KEY

# Expected format:
# NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Status:** [ ] PASS / [ ] FAIL

---

### 2. Migration Files Present
```bash
ls -la supabase/migrations/

# Should show:
# 20251106101800_initial_schema.sql
# 20251106101900_ncas_table.sql
# 20251106102000_mjcs_table.sql
# 20251106102100_audit_trail.sql
# 20251106102200_rls_policies.sql
# 20251106102300_seed_data.sql
```

**Status:** [ ] PASS / [ ] FAIL

---

### 3. TypeScript Types Generated
```bash
ls -la types/

# Should show:
# database.ts
```

**Status:** [ ] PASS / [ ] FAIL

---

## Database Schema Validation

### 4. Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: audit_trail, machines, mjcs, ncas, users, work_orders
```

**Expected Count:** 6 tables
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 5. Columns Present (Critical Tables)

**NCAs Table:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ncas'
ORDER BY ordinal_position;

-- Critical columns:
-- id (uuid), nca_number (text), wo_id (uuid)
-- nc_type, nc_description, machine_status
-- cross_contamination, hygiene_clearance_signature
-- status, created_at, updated_at
```

**Expected Columns:** 50+ columns
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

**MJCs Table:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mjcs'
ORDER BY ordinal_position;

-- Critical columns:
-- id (uuid), job_card_number (text), wo_id (uuid)
-- machine_status, urgency, temporary_repair
-- hygiene_checklist (jsonb), hygiene_clearance_signature (jsonb)
-- status, created_at, updated_at
```

**Expected Columns:** 40+ columns
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 6. Check Constraints
```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'ncas'::regclass
ORDER BY conname;

-- Expected constraints:
-- nca_description_min_length (CHECK char_length >= 100)
-- nca_machine_down_requires_timestamp
-- nca_cross_contamination_requires_tracking
-- nca_rework_requires_instruction
-- nca_closed_requires_closeout
```

**Status:** [ ] PASS / [ ] FAIL

---

### 7. Foreign Key Constraints
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Expected: All FK constraints with delete_rule = RESTRICT or SET NULL
```

**Status:** [ ] PASS / [ ] FAIL

---

### 8. Indexes Created
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Critical indexes:
-- idx_nca_number (ncas.nca_number)
-- idx_nca_status (ncas.status)
-- idx_mjc_number (mjcs.job_card_number)
-- idx_mjc_urgency (mjcs.urgency)
-- idx_wo_number (work_orders.wo_number)
```

**Expected Indexes:** 30+ indexes
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 9. Functions Created
```sql
SELECT proname, pronargs
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- Expected functions:
-- generate_nca_number() → 0 args
-- generate_mjc_number() → 0 args
-- validate_hygiene_checklist(jsonb) → 1 arg
-- update_updated_at() → 0 args
-- log_audit_trail() → 0 args
-- user_has_role(text[]) → 1 arg
-- can_close_nca() → 0 args
-- can_grant_hygiene_clearance() → 0 args
```

**Expected Functions:** 11 functions
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 10. Triggers Created
```sql
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- ncas_updated_at (BEFORE UPDATE)
-- ncas_audit_trail (AFTER INSERT/UPDATE/DELETE)
-- ncas_machine_down_alert (AFTER INSERT/UPDATE)
-- mjcs_updated_at (BEFORE UPDATE)
-- mjcs_audit_trail (AFTER INSERT/UPDATE/DELETE)
-- mjcs_hygiene_clearance (AFTER INSERT/UPDATE)
-- mjcs_prevent_incomplete_clearance (BEFORE UPDATE)
```

**Expected Triggers:** 15+ triggers
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

---

## RLS Policy Validation

### 11. RLS Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All tables should have rowsecurity = TRUE
```

**Expected:** All 6 tables have RLS enabled
**Status:** [ ] PASS / [ ] FAIL

---

### 12. RLS Policies Count
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected policies per table:
-- users: 3 policies
-- machines: 2 policies
-- work_orders: 4 policies
-- ncas: 6 policies
-- mjcs: 7 policies
-- audit_trail: 1 policy
```

**Expected Policies:** 20+ policies
**Actual Count:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 13. Critical RLS Policies Present
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ncas', 'mjcs')
ORDER BY tablename, policyname;

-- Critical NCA policies:
-- "Operators can view own NCAs"
-- "Operators can update own draft NCAs"
-- "QA can close NCAs"

-- Critical MJC policies:
-- "Technicians can view assigned MJCs"
-- "Technicians can update assigned MJCs"
-- "QA can grant hygiene clearance"
```

**Status:** [ ] PASS / [ ] FAIL

---

## Function Testing

### 14. NCA Number Generation
```sql
SELECT generate_nca_number();

-- Expected format: NCA-2025-00000001
-- Run again: NCA-2025-00000002
```

**Result 1:** _______________________
**Result 2:** _______________________
**Status:** [ ] PASS / [ ] FAIL

---

### 15. MJC Number Generation
```sql
SELECT generate_mjc_number();

-- Expected format: MJC-2025-00000001
-- Run again: MJC-2025-00000002
```

**Result 1:** _______________________
**Result 2:** _______________________
**Status:** [ ] PASS / [ ] FAIL

---

### 16. Hygiene Checklist Validation (All Verified)
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

-- Expected: true
```

**Result:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 17. Hygiene Checklist Validation (Incomplete)
```sql
SELECT validate_hygiene_checklist('[
  {"item": "Test 1", "verified": true},
  {"item": "Test 2", "verified": false}
]'::jsonb);

-- Expected: false
```

**Result:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 18. User Role Check
```sql
SELECT user_has_role(ARRAY['qa-supervisor', 'operations-manager']);

-- Expected: true or false (depending on current user)
```

**Result:** _______
**Status:** [ ] PASS / [ ] FAIL

---

## Seed Data Validation (If Applied)

### 19. Users Seeded
```sql
SELECT COUNT(*), role FROM users GROUP BY role ORDER BY role;

-- Expected:
-- operator: 1
-- team-leader: 1
-- maintenance-technician: 1
-- qa-supervisor: 1
-- maintenance-manager: 1
-- operations-manager: 1
-- Total: 6 users
```

**Total Users:** _______
**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED

---

### 20. Machines Seeded
```sql
SELECT machine_code, machine_name, status FROM machines ORDER BY machine_code;

-- Expected:
-- CMH-01: Pouching Machine Line 1 (operational)
-- CMH-02: Pouching Machine Line 2 (down)
-- SLT-01: Slitter Rewinder (operational)
```

**Total Machines:** _______
**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED

---

### 21. Work Orders Seeded
```sql
SELECT wo_number, status FROM work_orders ORDER BY wo_number;

-- Expected:
-- WO-20251105-SLT-007 (completed)
-- WO-20251105-CMH-015 (paused)
-- WO-20251106-CMH-001 (active)
```

**Total Work Orders:** _______
**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED

---

### 22. Sample NCA Seeded
```sql
SELECT nca_number, status, nc_type FROM ncas;

-- Expected:
-- NCA-2025-00000001 (draft, wip)
```

**Total NCAs:** _______
**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED

---

### 23. Sample MJC Seeded
```sql
SELECT job_card_number, status, urgency, machine_status FROM mjcs;

-- Expected:
-- MJC-2025-00000001 (open, critical, down)
```

**Total MJCs:** _______
**Status:** [ ] PASS / [ ] FAIL / [ ] SKIPPED

---

## BRCGS Compliance Checks

### 24. Audit Trail Trigger Working
```sql
-- Create test NCA
INSERT INTO ncas (
  raised_by_user_id,
  created_by,
  nc_type,
  nc_product_description,
  nc_description,
  machine_status,
  hold_label_completed,
  nca_logged,
  status
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'wip',
  'Test product',
  'This is a test description that is definitely more than one hundred characters long to satisfy the minimum length constraint required by BRCGS compliance',
  'operational',
  true,
  true,
  'draft'
) RETURNING id;

-- Check audit trail created
SELECT COUNT(*) FROM audit_trail
WHERE entity_type = 'nca' AND action = 'created';

-- Expected: 1 new audit record
```

**Result:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 25. Machine Down Alert Logged
```sql
-- Update NCA to Machine Down
UPDATE ncas
SET machine_status = 'down',
    machine_down_since = NOW()
WHERE nca_number = 'NCA-2025-00000001';

-- Check machine down alert logged
SELECT COUNT(*) FROM audit_trail
WHERE action = 'machine_down_reported';

-- Expected: 1 machine down alert
```

**Result:** _______
**Status:** [ ] PASS / [ ] FAIL

---

### 26. Cross-Contamination Constraint Enforced
```sql
-- Attempt to set cross_contamination = true without back tracking
-- Should FAIL
UPDATE ncas
SET cross_contamination = true
WHERE nca_number = 'NCA-2025-00000001';

-- Expected: ERROR constraint violation
```

**Result:** ERROR: _______________________________
**Status:** [ ] PASS (constraint enforced) / [ ] FAIL

---

### 27. Hygiene Clearance Blocked (Incomplete Checklist)
```sql
-- Attempt to grant hygiene clearance with incomplete checklist
-- Should FAIL
UPDATE mjcs
SET status = 'closed',
    hygiene_clearance_signature = '{"type": "login", "name": "Test", "timestamp": "2025-11-06", "ip": "127.0.0.1"}'::jsonb
WHERE job_card_number = 'MJC-2025-00000001';

-- Expected: ERROR BRCGS VIOLATION
```

**Result:** ERROR: _______________________________
**Status:** [ ] PASS (clearance blocked) / [ ] FAIL

---

### 28. No DELETE on NCAs/MJCs (Immutable)
```sql
-- Attempt to delete NCA
-- Should FAIL (no DELETE policy)
DELETE FROM ncas WHERE nca_number = 'NCA-2025-00000001';

-- Expected: ERROR no policy allows DELETE
```

**Result:** ERROR: _______________________________
**Status:** [ ] PASS (delete blocked) / [ ] FAIL

---

## Performance Checks

### 29. Query Performance (NCAs)
```sql
EXPLAIN ANALYZE
SELECT * FROM ncas
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 25;

-- Expected: Index scan on idx_nca_active_drafts
-- Execution time: <50ms
```

**Execution Time:** _______ ms
**Index Used:** [ ] YES / [ ] NO
**Status:** [ ] PASS (<50ms) / [ ] FAIL

---

### 30. Query Performance (MJCs)
```sql
EXPLAIN ANALYZE
SELECT * FROM mjcs
WHERE status = 'awaiting-clearance'
ORDER BY created_at DESC;

-- Expected: Index scan on idx_mjc_awaiting_clearance
-- Execution time: <50ms
```

**Execution Time:** _______ ms
**Index Used:** [ ] YES / [ ] NO
**Status:** [ ] PASS (<50ms) / [ ] FAIL

---

## Summary

**Total Checks:** 30
**Passed:** _______
**Failed:** _______
**Skipped:** _______

**Overall Status:** [ ] READY FOR PRODUCTION / [ ] ISSUES FOUND

---

## Sign-Off

**Validated By:** _______________________________
**Date:** _______________________________
**Signature:** _______________________________

**BRCGS Compliance Reviewed By:** _______________________________
**Date:** _______________________________

---

## Notes

_Add any issues, warnings, or additional observations here:_

