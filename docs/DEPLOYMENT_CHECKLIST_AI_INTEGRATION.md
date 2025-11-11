# AI Integration Database Deployment Checklist

**System:** OHiSee NCA/MJC Operations Intelligence Centre
**Deployment Type:** AI-Assisted Form Completion with BRCGS Compliance
**Date:** 2025-11-10
**Environment:** Development → Staging → Production

---

## Pre-Deployment Validation

### 1. Environment Verification

- [ ] **PostgreSQL version:** 14+ installed and running
- [ ] **pgvector extension:** Available and compatible
- [ ] **Supabase CLI:** Latest version installed (`supabase --version`)
- [ ] **Database connection:** Supabase project URL and service role key configured
- [ ] **Backup created:** Full database backup taken and verified restorable

**Commands:**
```bash
# Check PostgreSQL version
psql --version  # Should be 14.x or higher

# Verify Supabase connection
supabase db remote connect

# Create backup
pg_dump -h [host] -U [user] -d [database] > backup_pre_ai_integration_$(date +%Y%m%d).sql
```

---

### 2. Dependency Verification

- [ ] **Existing migrations applied:**
  - `20251106101800_initial_schema.sql` ✓
  - `20251106101900_ncas_table.sql` ✓
  - `20251106102000_mjcs_table.sql` ✓
  - `20251106102100_audit_trail.sql` ✓
  - `20251106102200_rls_policies.sql` ✓
  - `20251106102300_seed_data.sql` ✓

- [ ] **Required tables exist:**
  - `users` (with `role` column)
  - `ncas` (with `supplier_name`, `wo_id` columns)
  - `mjcs` table
  - `work_orders` table (with `machine_id`)
  - `machines` table
  - `audit_trail` table

- [ ] **Required functions exist:**
  - `update_updated_at()` trigger function

**Verification Query:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'ncas', 'mjcs', 'work_orders', 'machines', 'audit_trail')
ORDER BY table_name;
-- Should return 6 rows
```

---

### 3. Code Review

- [ ] **Migration 1 reviewed:** `20251110120000_ai_integration.sql`
  - UNIQUE constraint on `(document_number, status='current')` ✓
  - RLS policies defined ✓
  - Functions use SECURITY DEFINER ✓
  - No static method calls ✓

- [ ] **Migration 2 reviewed:** `20251110130000_ai_quality_coaching.sql`
  - Generated columns use STORED strategy ✓
  - Check constraints on score ranges ✓
  - Coaching alert auto-numbering ✓
  - 11 hazard types seeded ✓

- [ ] **Tests reviewed:** `20251110_ai_integration_tests.sql`
  - 50 pgTAP tests cover critical paths ✓

- [ ] **Rollback script reviewed:** `20251110_ROLLBACK_ai_integration.sql`
  - Safe to run in dev/test environments ✓

---

## Deployment Steps - Development Environment

### Step 1: Apply Migration 1 (Foundation)

```bash
cd ohisee-reports
supabase migration up --file 20251110120000_ai_integration.sql
```

**Expected Output:**
```
Applying migration 20251110120000_ai_integration.sql...
Migration applied successfully.
```

**Verification:**
```sql
-- Should return 3 new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('knowledge_base_documents', 'ai_assistance_log', 'suppliers');
```

- [ ] **Tables created:** `knowledge_base_documents`, `ai_assistance_log`, `suppliers`
- [ ] **Views created:** `supplier_performance_summary`, `nca_traceability_context`
- [ ] **Functions created:** `log_ai_interaction()`, `update_ai_interaction_outcome()`
- [ ] **No errors in migration output**

---

### Step 2: Apply Migration 2 (Quality & Coaching)

```bash
supabase migration up --file 20251110130000_ai_quality_coaching.sql
```

**Verification:**
```sql
-- Should return 11 hazard types
SELECT COUNT(*) FROM hazard_types WHERE active = true;

-- Verify hazard types
SELECT hazard_code, hazard_name, hazard_category
FROM hazard_types
ORDER BY hazard_code;
```

- [ ] **Tables created:** `hazard_types`, `user_quality_scores`, `nca_quality_scores`, `ai_effectiveness_metrics`, `coaching_alerts`
- [ ] **11 hazard types seeded** (PHY, CHEM, BIO, ALL, CROSS, SPEC, LAB, FMAT, EQP, PROC, OTH)
- [ ] **Functions created:** `calculate_user_quality_score()`, `generate_coaching_alert_number()`
- [ ] **Triggers created:** Coaching alert auto-numbering, updated_at triggers
- [ ] **No errors in migration output**

---

### Step 3: Run pgTAP Tests

```bash
supabase test db
```

**Expected Output:**
```
Running tests...
1..50
ok 1 - knowledge_base_documents table should exist
ok 2 - Should have id column
...
ok 50 - Alert number should be auto-generated in COACH-YYYY-NNNN format
All tests passed (50/50)
```

- [ ] **50/50 tests pass**
- [ ] **0 failures**
- [ ] **No warnings or errors**

**If tests fail:**
1. Review test output for specific failure
2. Check migration logs for partial application
3. Run rollback script
4. Fix issue and retry

---

### Step 4: Manual Validation

#### 4.1 Test UNIQUE Constraint (BRCGS Critical)

```sql
-- Should succeed: First current version
INSERT INTO knowledge_base_documents (
  document_number, document_name, document_type, revision, status,
  revised_date, effective_date, full_text
) VALUES (
  'TEST-001', 'Test Procedure', 'procedure', 1, 'current',
  CURRENT_DATE, CURRENT_DATE, 'Test content'
);

-- Should FAIL: Duplicate current version (unique_violation)
INSERT INTO knowledge_base_documents (
  document_number, document_name, document_type, revision, status,
  revised_date, effective_date, full_text
) VALUES (
  'TEST-001', 'Test Procedure Rev 2', 'procedure', 2, 'current',
  CURRENT_DATE, CURRENT_DATE, 'Updated content'
);
-- Expected error: duplicate key value violates unique constraint "kb_current_version_unique"

-- Cleanup
DELETE FROM knowledge_base_documents WHERE document_number = 'TEST-001';
```

- [ ] **UNIQUE constraint enforced** (second insert fails)

---

#### 4.2 Test AI Interaction Logging

```sql
-- Get a real user ID
SELECT id, email FROM users LIMIT 1;

-- Get a real NCA ID
SELECT id, nca_number FROM ncas ORDER BY created_at DESC LIMIT 1;

-- Test log_ai_interaction function
SELECT log_ai_interaction(
  'ncas',
  '[NCA_ID from above]',
  'Section 9: Root Cause Analysis',
  'root_cause_analysis',
  '[USER_ID from above]',
  'Suggest root cause for raw material defect',
  '{"nc_type": "raw-material"}'::jsonb,
  'Likely root cause: Supplier quality control failure per Procedure 5.7 Rev 9',
  'gpt-4-turbo-preview',
  '[{"doc": "5.7", "revision": 9, "section": "1.3"}]'::jsonb,
  0.7,
  1250,
  'test-session-' || gen_random_uuid()::text
);

-- Verify log entry created
SELECT
  entity_type,
  form_section,
  user_email,
  ai_model,
  procedures_cited,
  suggestion_accepted
FROM ai_assistance_log
ORDER BY created_at DESC
LIMIT 1;
```

- [ ] **Function executes without error**
- [ ] **Log entry visible in ai_assistance_log**
- [ ] **User details populated (email, name, role)**
- [ ] **procedures_cited is valid JSONB**

---

#### 4.3 Test Coaching Alert Auto-Numbering

```sql
-- Get a real user ID
SELECT id, name FROM users WHERE role = 'operator' LIMIT 1;

-- Create coaching alert
INSERT INTO coaching_alerts (
  user_id, user_name, user_role, alert_tier,
  trigger_reason, recommended_actions, response_due_date
) VALUES (
  '[USER_ID from above]',
  '[NAME from above]',
  'operator',
  2,
  'Test alert for deployment validation',
  'Review NCA completion procedures',
  CURRENT_DATE + INTERVAL '2 days'
);

-- Verify alert_number auto-generated
SELECT alert_number, alert_tier, alert_priority, overdue
FROM coaching_alerts
ORDER BY created_at DESC
LIMIT 1;
-- Expected: COACH-2025-0001 (or next sequence)

-- Cleanup
DELETE FROM coaching_alerts WHERE trigger_reason = 'Test alert for deployment validation';
```

- [ ] **Alert number auto-generated** (COACH-YYYY-NNNN format)
- [ ] **alert_priority generated correctly** based on tier
- [ ] **overdue calculated correctly** (false if not past due date)

---

#### 4.4 Test RLS Policies

```sql
-- Test as regular user (should only see own AI logs)
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "[USER_ID]"}';

-- User should see own logs only
SELECT COUNT(*) FROM ai_assistance_log WHERE user_id = '[USER_ID]';

-- User should NOT see other users' logs
SELECT COUNT(*) FROM ai_assistance_log WHERE user_id != '[USER_ID]';
-- Expected: 0 rows

RESET ROLE;
```

- [ ] **RLS policies enforced correctly**

---

### Step 5: Upload BRCGS Procedures

Priority 1 procedures (minimum for MVP):

- [ ] **Procedure 5.7** - Control of Non-Conforming Product (Rev 9)
  - File location: `docs/5.7 Control of non conforming product.md`
  - Upload with embeddings generation

- [ ] **Form 5.7F1** - BRC Non-Conformance Advice
  - File location: `docs/5.7F1 BRC Non Conformance Advice.md`
  - Upload as `document_type='form_template'`

**Upload Script:**
```typescript
// See docs/AI_INTEGRATION_QUICK_START.md for full implementation
import { uploadProcedure } from './utils/uploadProcedure';

await uploadProcedure('./docs/5.7 Control of non conforming product.md', {
  document_number: '5.7',
  document_name: 'Control of Non-Conforming Product',
  document_type: 'procedure',
  revision: 9,
  brcgs_section: '5.7'
});

await uploadProcedure('./docs/5.7F1 BRC Non Conformance Advice.md', {
  document_number: '5.7F1',
  document_name: 'BRC Non-Conformance Advice Form',
  document_type: 'form_template',
  revision: 1,
  brcgs_section: '5.7'
});
```

**Verification:**
```sql
SELECT document_number, document_name, revision, status, LENGTH(full_text) as text_length
FROM knowledge_base_documents
WHERE status = 'current'
ORDER BY document_number;
-- Should show 5.7 and 5.7F1 with text_length > 0
```

---

### Step 6: Seed Supplier Data (Optional for MVP)

- [ ] **Import approved supplier list** (if available)
  - CSV format: supplier_code, supplier_name, approval_status
  - Use `COPY` command or bulk INSERT

**Example:**
```sql
INSERT INTO suppliers (supplier_code, supplier_name, supplier_type, approval_status, approved_date)
VALUES
  ('SUP001', 'ABC Films (Pty) Ltd', 'raw-material', 'approved', '2024-01-15'),
  ('SUP002', 'XYZ Packaging', 'packaging-material', 'approved', '2024-03-20');
```

---

## Deployment Steps - Staging Environment

### Pre-Staging Checklist

- [ ] **Dev environment validated** - All tests pass, procedures uploaded
- [ ] **Staging backup created**
- [ ] **Staging database connection verified**

### Staging Deployment

```bash
# Set staging environment
export SUPABASE_DB_URL="postgresql://[staging_connection_string]"

# Apply migrations
supabase migration up --file 20251110120000_ai_integration.sql
supabase migration up --file 20251110130000_ai_quality_coaching.sql

# Run tests
supabase test db
```

- [ ] **Migrations applied successfully**
- [ ] **All tests pass**
- [ ] **Manual validation completed** (steps 4.1-4.4)
- [ ] **Procedures uploaded**

### Staging Integration Testing

- [ ] **End-to-end test:** User creates NCA → clicks "AI Suggestion" → AI responds → user accepts
- [ ] **Performance test:** AI response time <3 seconds
- [ ] **Load test:** 10 concurrent AI requests handled successfully
- [ ] **Monitoring:** Check for errors in logs

---

## Deployment Steps - Production Environment

### Pre-Production Checklist

- [ ] **Staging validated for 48+ hours** with no critical issues
- [ ] **Production backup created and verified**
- [ ] **Rollback plan reviewed and approved**
- [ ] **Maintenance window scheduled** (recommended: low-traffic period)
- [ ] **Operations Manager approval obtained**
- [ ] **QA Supervisor approval obtained**

### Production Deployment

**Deployment Window:** [DATE/TIME] to [DATE/TIME]

#### 1. Pre-Deployment Announcement

- [ ] **Notify all users:** "System maintenance in progress, read-only mode for 30 minutes"
- [ ] **Set application to read-only mode** (if possible)

#### 2. Apply Migrations

```bash
# Set production environment
export SUPABASE_DB_URL="postgresql://[production_connection_string]"

# Apply Migration 1
supabase migration up --file 20251110120000_ai_integration.sql

# Verify Migration 1
psql -c "SELECT COUNT(*) FROM knowledge_base_documents;"
psql -c "SELECT COUNT(*) FROM ai_assistance_log;"

# Apply Migration 2
supabase migration up --file 20251110130000_ai_quality_coaching.sql

# Verify Migration 2
psql -c "SELECT COUNT(*) FROM hazard_types WHERE active = true;"
# Expected: 11
```

- [ ] **Migration 1 applied** without errors
- [ ] **Migration 2 applied** without errors
- [ ] **Database logs show no errors**

#### 3. Run Validation Tests

```bash
# Run pgTAP tests
supabase test db

# Expected: 50/50 tests pass
```

- [ ] **All tests pass**

#### 4. Upload Procedures

```bash
# Run procedure upload script
npm run upload-procedures

# Verify
psql -c "SELECT document_number, status FROM knowledge_base_documents WHERE status = 'current';"
```

- [ ] **Procedures uploaded successfully**
- [ ] **Embeddings generated**

#### 5. Smoke Testing

- [ ] **Log in as test operator**
- [ ] **Create test NCA**
- [ ] **Request AI suggestion on Section 9 (Root Cause)**
- [ ] **Verify AI responds within 3 seconds**
- [ ] **Verify procedure citations accurate**
- [ ] **Accept suggestion**
- [ ] **Verify log entry in ai_assistance_log**
- [ ] **Delete test NCA**

#### 6. Production Cutover

- [ ] **Remove read-only mode**
- [ ] **Announce to users:** "AI assistance now available in NCA/MJC forms"
- [ ] **Monitor for 1 hour** - check error logs, response times

---

## Post-Deployment Monitoring

### Day 1 Monitoring (Critical)

- [ ] **Check for superseded procedure citations** (should be 0)
```sql
SELECT COUNT(*) FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(procedures_cited) AS p
    JOIN knowledge_base_documents kb ON kb.document_number = p->>'doc'
    WHERE kb.status != 'current'
  );
```

- [ ] **Check AI acceptance rate** (target >50% day 1)
```sql
SELECT
  (COUNT(*) FILTER (WHERE suggestion_accepted = true)::NUMERIC /
   NULLIF(COUNT(*), 0)) * 100 as acceptance_rate_pct
FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE
  AND suggestion_accepted IS NOT NULL;
```

- [ ] **Check average response time** (target <3 seconds)
```sql
SELECT AVG(response_time_ms) as avg_ms
FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE;
```

- [ ] **Check for application errors** in logs
- [ ] **User feedback collection** - Any complaints about AI?

---

### Week 1 Review

- [ ] **Usage metrics:**
  - Total AI interactions
  - Unique users
  - Most used form sections

```sql
SELECT
  form_section,
  COUNT(*) as interactions,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(response_time_ms) as avg_response_ms
FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY form_section
ORDER BY interactions DESC;
```

- [ ] **Quality metrics:**
  - NCA quality score comparison (AI-assisted vs manual)
  - Traceability completeness trend

- [ ] **Issue tracking:**
  - Any procedure citation errors?
  - Any performance issues?
  - User feedback summary

- [ ] **Schedule monthly review meeting** with Operations Manager and QA Supervisor

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Database migration fails partially
- Critical errors in production (>10% request failure rate)
- Data corruption detected
- BRCGS compliance violation (superseded procedures cited)

### Rollback Execution (DEVELOPMENT/STAGING ONLY)

```bash
# Run rollback script
psql -d [database] -f 20251110_ROLLBACK_ai_integration.sql

# Verify rollback
psql -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%ai%' OR table_name LIKE '%coaching%';"
# Expected: 0 rows
```

- [ ] **Rollback script executed**
- [ ] **All AI tables removed**
- [ ] **Application still functional** (NCAs/MJCs work without AI)

### Rollback Execution (PRODUCTION)

**DO NOT use automated rollback script in production.** Manual rollback required:

1. **Disable AI features** in application (feature flag)
2. **Contact Database Architect** for manual rollback guidance
3. **Preserve ai_assistance_log data** for audit trail (export to CSV)
4. **Drop new tables individually** with approval

---

## Success Criteria

### Deployment Success

- [ ] ✅ All migrations applied without errors
- [ ] ✅ 50/50 pgTAP tests pass
- [ ] ✅ UNIQUE constraint prevents duplicate current procedures
- [ ] ✅ AI interactions logged to ai_assistance_log
- [ ] ✅ Coaching alerts auto-generate COACH-YYYY-NNNN numbers
- [ ] ✅ RLS policies enforced correctly
- [ ] ✅ Procedures uploaded with embeddings

### Week 1 Success

- [ ] 📊 AI acceptance rate >50%
- [ ] ⚡ Average response time <3 seconds
- [ ] 🛡️ Zero superseded procedure citations
- [ ] 👥 >20 unique users using AI assistance
- [ ] 📈 NCA quality scores improved vs baseline
- [ ] ⚠️ <5 user-reported issues

### Month 1 Success

- [ ] 📊 AI acceptance rate >70%
- [ ] ⚡ Average response time <2 seconds
- [ ] 📈 NCA completion time reduced by 20%
- [ ] 📈 Traceability completeness >90%
- [ ] 👨‍🏫 <10 coaching alerts generated
- [ ] ✅ QA Manager approves for continued use

---

## Contacts & Escalation

**Database Issues:**
- Database Architect: [contact]
- Supabase Support: support@supabase.com

**BRCGS Compliance:**
- QA Manager: [contact]
- Operations Manager: [contact]

**Application Issues:**
- Development Team Lead: [contact]

**Escalation Path:**
1. Development Team Lead (first 30 min)
2. Operations Manager (30-60 min)
3. Database Architect + QA Manager (>60 min or data integrity risk)

---

**Deployment Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** ✅ Ready for Deployment
**Approved By:**
- [ ] Database Architect: ________________ Date: ______
- [ ] QA Manager: ________________ Date: ______
- [ ] Operations Manager: ________________ Date: ______
