# AI Integration - Developer Quick Reference Card

**1-Page Cheat Sheet | Keep This Handy During Development**

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Apply migrations
cd ohisee-reports
supabase migration up --file 20251110120000_ai_integration.sql
supabase migration up --file 20251110130000_ai_quality_coaching.sql

# 2. Verify
psql -f supabase/migrations/VERIFY_AI_INTEGRATION.sql

# 3. Run tests
supabase test db
# Expected: 50/50 pass
```

---

## 📊 Core Tables (What They Do)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `knowledge_base_documents` | BRCGS procedures for AI | `document_number`, `status`, `embedding_vector` |
| `ai_assistance_log` | Audit trail for AI interactions | `user_id`, `ai_response`, `procedures_cited`, `suggestion_accepted` |
| `suppliers` | Approved Supplier List | `supplier_name`, `approval_status`, `nca_count_ytd` |
| `user_quality_scores` | 6-month rolling quality | `overall_quality_score`, `requires_coaching` |
| `nca_quality_scores` | Per-NCA field quality | `description_score`, `root_cause_score`, `overall_nca_score` |
| `coaching_alerts` | Tiered coaching system | `alert_tier`, `trigger_reason`, `status` |
| `hazard_types` | BRCGS hazard classification | `hazard_code`, `hazard_name` (11 types seeded) |

---

## 🔑 Critical Database Rules

### 1. BRCGS 3.6 Compliance (UNIQUE Constraint)
**RULE:** Only ONE current version per document number
**Enforced by:** `UNIQUE (document_number, status) WHERE status='current'`

```sql
-- ✅ This works: First current version
INSERT INTO knowledge_base_documents (document_number, status, ...)
VALUES ('5.7', 'current', ...);

-- ❌ This FAILS: Duplicate current version (unique_violation)
INSERT INTO knowledge_base_documents (document_number, status, ...)
VALUES ('5.7', 'current', ...);

-- ✅ This works: Supersede old, insert new
UPDATE knowledge_base_documents SET status='superseded' WHERE document_number='5.7';
INSERT INTO knowledge_base_documents (document_number, status, ...) VALUES ('5.7', 'current', ...);
```

### 2. AI Logging (MANDATORY)
**RULE:** EVERY AI interaction MUST be logged
**Function:** `log_ai_interaction()`

```typescript
// ✅ Correct: Log BEFORE returning suggestion to user
const logId = await supabase.rpc('log_ai_interaction', {
  p_entity_type: 'ncas',
  p_entity_id: ncaId,
  p_user_id: userId,
  p_ai_response: suggestion,
  p_procedures_cited: procedureRefs
});

return { suggestion, logId };  // Return logId for decision tracking

// ❌ WRONG: Returning suggestion without logging (BRCGS violation)
return { suggestion };
```

### 3. User Decision Tracking
**RULE:** Update log with user decision (accept/reject/modify)
**Function:** `update_ai_interaction_outcome()`

```typescript
// When user clicks Accept/Reject/Edit
await supabase.rpc('update_ai_interaction_outcome', {
  p_log_id: logId,
  p_suggestion_accepted: true,  // or false
  p_suggestion_modified: false,
  p_final_user_value: userEnteredText
});
```

---

## 🔍 Essential Queries

### Get Current Procedures for AI
```sql
SELECT document_number, document_name, full_text, embedding_vector
FROM knowledge_base_documents
WHERE status = 'current'  -- CRITICAL: Only current versions
  AND document_number IN ('5.7', '3.9', '3.13');
```

### Check for Superseded Citations (Should be 0)
```sql
-- BRCGS CRITICAL: Run daily
SELECT COUNT(*) FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(procedures_cited) AS p
    JOIN knowledge_base_documents kb ON kb.document_number = p->>'doc'
    WHERE kb.status = 'superseded'
  );
-- Expected: 0 (if >0, immediate investigation required)
```

### AI Acceptance Rate
```sql
SELECT
  (COUNT(*) FILTER (WHERE suggestion_accepted = true)::NUMERIC /
   NULLIF(COUNT(*), 0)) * 100 as acceptance_rate_pct
FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE
  AND suggestion_accepted IS NOT NULL;
```

### Supplier Performance Context for AI
```sql
SELECT
  supplier_name,
  approval_status,
  ncas_last_90days,
  high_recent_nca_frequency,
  recent_ncas
FROM supplier_performance_summary
WHERE supplier_name ILIKE '%' || :supplierName || '%';
```

### NCA Traceability Context for AI
```sql
SELECT
  nca_number,
  supplier_name,
  wo_number,
  machine_code,
  similar_past_ncas,
  has_supplier_batch_tracking
FROM nca_traceability_context
WHERE nca_id = :ncaId;
```

---

## 🎯 Generated Columns (Auto-Calculated)

**user_quality_scores:**
- `ai_acceptance_rate` = `(accepted / (accepted + rejected)) * 100`

**nca_quality_scores:**
- `overall_nca_score` = Average of 5 field scores
- `quality_grade` = Excellent (≥90) | Good (≥75) | Acceptable (≥60) | Needs Improvement

**coaching_alerts:**
- `alert_priority` = Based on `alert_tier` (1-4)
- `overdue` = `CURRENT_DATE > response_due_date` AND `status` NOT IN ('resolved', 'closed')

**ai_effectiveness_metrics:**
- `overall_acceptance_rate` = `(accepted / total) * 100`
- `quality_improvement_pct` = `((with_ai - without_ai) / without_ai) * 100`

---

## 🔐 RLS Quick Reference

| Table | Who Can Read | Who Can Write |
|-------|--------------|---------------|
| `knowledge_base_documents` | All users (status='current'), Management (all) | Service role only |
| `ai_assistance_log` | Self, Management | Service role via functions |
| `suppliers` | All users | Management only |
| `user_quality_scores` | Self, Management | Service role via functions |
| `coaching_alerts` | Self, Management | Management only |

---

## ⚡ Performance Tips

### 1. Vector Search (pgvector)
```sql
-- Use IVFFlat index for fast similarity search
SELECT document_number, document_name
FROM knowledge_base_documents
WHERE status = 'current'
ORDER BY embedding_vector <-> :queryEmbedding::vector
LIMIT 5;
-- Target: <50ms
```

### 2. Batch Quality Score Calculation
```sql
-- Calculate quality scores for all users (monthly job)
SELECT calculate_user_quality_score(
  user_id,
  DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months',
  CURRENT_DATE
)
FROM users
WHERE role IN ('operator', 'team-leader');
```

### 3. Materialized View Refresh (if slow)
```sql
-- If supplier_performance_summary slow, materialize it
CREATE MATERIALIZED VIEW supplier_performance_summary_mat AS
  SELECT * FROM supplier_performance_summary;

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_performance_summary_mat;
```

---

## 🐛 Common Issues & Fixes

### Issue: "duplicate key value violates unique constraint"
**Cause:** Trying to insert 2nd current version of same document
**Fix:** Supersede old version first
```sql
UPDATE knowledge_base_documents
SET status = 'superseded', updated_at = NOW()
WHERE document_number = '5.7' AND status = 'current';
```

### Issue: AI suggestions slow (>5s)
**Cause:** Large procedure text, no vector index
**Fix:**
1. Limit procedure text to 2000 chars in prompt
2. Verify IVFFlat index exists: `\di idx_kb_embedding`
3. Cache embeddings in application layer

### Issue: RLS prevents function execution
**Cause:** Function not SECURITY DEFINER
**Fix:** Functions already SECURITY DEFINER, check user authentication

### Issue: Coaching alert number not generating
**Cause:** Trigger not firing
**Fix:** Check trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'coaching_alert_number_trigger';
```

---

## 📈 Monitoring (Daily Checks)

```sql
-- 1. Superseded citations (CRITICAL - should be 0)
SELECT COUNT(*) FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE AND [superseded procedure check];

-- 2. AI acceptance rate (target >70%)
SELECT AVG(suggestion_accepted::int) * 100 FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE;

-- 3. Avg response time (target <2000ms)
SELECT AVG(response_time_ms) FROM ai_assistance_log
WHERE timestamp >= CURRENT_DATE;

-- 4. Overdue coaching alerts
SELECT COUNT(*) FROM coaching_alerts WHERE overdue = true;
```

---

## 🔄 Common Operations

### Upload New Procedure
```typescript
await supabase.from('knowledge_base_documents').insert({
  document_number: '5.7',
  document_name: 'Control of Non-Conforming Product',
  document_type: 'procedure',
  revision: 9,
  status: 'current',
  revised_date: '2025-09-02',
  effective_date: '2025-09-02',
  brcgs_section: '5.7',
  full_text: procedureText,
  embedding_vector: await generateEmbedding(procedureText)
});
```

### Update Procedure (New Revision)
```typescript
// Step 1: Supersede old
await supabase.from('knowledge_base_documents')
  .update({ status: 'superseded' })
  .eq('document_number', '5.7')
  .eq('status', 'current');

// Step 2: Insert new
await supabase.from('knowledge_base_documents').insert({
  document_number: '5.7',
  revision: 10,  // Increment
  status: 'current',
  // ... other fields
});
```

### Calculate User Quality Score
```typescript
await supabase.rpc('calculate_user_quality_score', {
  p_user_id: userId,
  p_period_start: '2025-01-01',
  p_period_end: '2025-06-30'
});

// Check result
const { data } = await supabase
  .from('user_quality_scores')
  .select('overall_quality_score, requires_coaching')
  .eq('user_id', userId)
  .single();
```

---

## 🎓 TypeScript Types (Quick Copy-Paste)

```typescript
// AI Interaction Log
interface AIInteractionLog {
  id: string;
  entity_type: 'ncas' | 'mjcs';
  entity_id: string;
  form_section: string;
  field_name: string | null;
  user_id: string;
  user_prompt: string;
  ai_response: string;
  ai_model: string;
  procedures_cited: ProcedureReference[];
  suggestion_accepted: boolean | null;
  suggestion_modified: boolean | null;
  final_user_value: string | null;
  timestamp: string;
}

interface ProcedureReference {
  doc: string;
  revision: number;
  section: string;
  text: string;
}

// User Quality Score
interface UserQualityScore {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  overall_quality_score: number;
  ai_acceptance_rate: number;  // Generated
  requires_coaching: boolean;
  coaching_reason: string | null;
  coaching_priority: number | null;
}

// Coaching Alert
interface CoachingAlert {
  id: string;
  alert_number: string;
  user_id: string;
  alert_tier: 1 | 2 | 3 | 4;
  alert_priority: string;  // Generated
  trigger_reason: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  overdue: boolean;  // Generated
  response_due_date: string;
}
```

---

## 📞 Emergency Contacts

**Database Issue:** Database Architect
**BRCGS Compliance:** QA Manager
**Application Bug:** Development Team Lead

**Escalation:** Dev Team (30 min) → Ops Manager (60 min) → DBA + QA (data risk)

---

## ✅ Pre-Deployment Checklist (5 Minutes)

- [ ] Migrations applied: `supabase migration up`
- [ ] Verification passed: `psql -f VERIFY_AI_INTEGRATION.sql`
- [ ] Tests passed: `supabase test db` (50/50)
- [ ] UNIQUE constraint enforced (try duplicate current insert)
- [ ] Procedure uploaded (at least 5.7)
- [ ] AI logging tested (check `ai_assistance_log` after test interaction)
- [ ] RLS verified (user sees own logs only)

---

**Keep This Card Handy | Version 1.0 | 2025-11-10**
