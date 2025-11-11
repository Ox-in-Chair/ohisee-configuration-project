# Complete Deployment Guide - All Phases

**Date**: 2025-11-10  
**Status**: Ready for Full Deployment

## Overview

This guide covers the complete deployment of all 7 phases of the Content Model Policy Engine, including all Phase 7 advanced AI enhancements.

---

## Pre-Deployment Checklist

### 1. Code Status ✅

- [x] All Phase 1-7 code complete
- [x] All features integrated
- [x] Configuration file created (`lib/config/phase7-config.ts`)
- [x] All components updated
- [x] All hooks updated
- [x] All server actions updated
- [x] TypeScript compilation clean
- [x] No linting errors

### 2. Database Migrations

**Required Migrations** (in order):

1. **Base System** (if not already applied):
   - `20251110120000_ai_integration.sql`
   - `20251110130000_ai_quality_coaching.sql`
   - `20251110140000_rag_search_functions.sql`
   - `20251110150000_quality_enforcement_rules.sql`
   - `20251110160000_enforcement_logging.sql`

2. **Phase 7** (NEW):
   - `20251110170000_phase7_advanced_ai.sql` ⚠️ **APPLY THIS NOW**

### 3. Apply Phase 7 Migration

**Option A: Supabase Dashboard (Recommended)**

1. Go to: <https://supabase.com/dashboard/project/fpmnfokvcdqhbsawvyjh/sql>
2. Click "+ New query"
3. Copy entire contents of: `ohisee-reports/supabase/migrations/20251110170000_phase7_advanced_ai.sql`
4. Paste and click "Run"
5. Verify success (see verification queries below)

**Option B: Migration Script**

```bash
cd ohisee-reports
npx tsx scripts/apply-phase7-migration.ts
```

**Verification Queries:**

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('policy_versions', 'agent_audit_log', 'decision_traces');

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_policy_version', 'log_agent_decision', 'create_decision_trace');

-- Test function
SELECT get_policy_version(); -- Should return '1.0.0' if no policy set
```

**Initialize Default Policy:**

```sql
INSERT INTO policy_versions (version, status, rules, changelog)
VALUES (
  '1.0.0',
  'active',
  '[]'::jsonb,
  '["Initial policy version"]'::jsonb
)
ON CONFLICT (version) DO NOTHING;
```

### 4. Environment Variables

**Required** (already in `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fpmnfokvcdqhbsawvyjh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

**Optional** (Phase 7 - all enabled by default):

```bash
# All Phase 7 features enabled by default
# Set to 'false' to disable specific features
PHASE7_ENABLED=true
PHASE7_MULTI_AGENT=true
PHASE7_RAG=true
PHASE7_USER_GUIDED=true
PHASE7_ADAPTIVE_POLICY=true
PHASE7_EXPLAINABLE_AI=true
```

### 5. Dependencies

**New Dependencies Added:**

- `@radix-ui/react-collapsible` ✅ (installed)

**Verify Installation:**

```bash
cd ohisee-reports
npm install
```

---

## Testing

### Run All Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Performance tests
npx jest tests/performance

# Build test
npm run build
```

### Test Phase 7 Features

1. **Multi-Agent Validation:**
   - Submit NCA form with incomplete data
   - Verify multiple agents analyze submission
   - Check `agent_audit_log` table for entries

2. **Enhanced RAG:**
   - Click "Get Help" on any field
   - Verify suggestions include procedure references
   - Check RAG context retrieval

3. **Explainable AI:**
   - Submit form with validation errors
   - Click "Why?" links next to requirements
   - Verify explanations appear

4. **Decision Traces:**
   - Submit any form
   - Check `decision_traces` table
   - Verify trace includes explanations

---

## Build & Deploy

### 1. Build Verification

```bash
cd ohisee-reports
npm run build
```

**Expected Output:**

- ✅ No TypeScript errors
- ✅ No build errors
- ✅ All pages compile successfully

### 2. Staging Deployment

```bash
# Merge to staging branch
git checkout staging
git merge main

# Deploy to staging
# (Follow your deployment process)
```

**Post-Deployment Verification:**

- [ ] All pages load
- [ ] NCA form works
- [ ] Validation works
- [ ] "Get Help" works
- [ ] Quality gate appears
- [ ] Explainable AI "Why?" links work
- [ ] No console errors

### 3. Production Deployment

```bash
# Merge to main branch
git checkout main
git merge staging

# Tag release
git tag -a v2.2.0-phase7 -m "Phase 7: Advanced AI Enhancements"

# Deploy to production
# (Follow your deployment process)
```

---

## Post-Deployment Monitoring

### 1. Database Monitoring

**Check Agent Audit Logs:**

```sql
SELECT 
  agent_name,
  COUNT(*) as total_decisions,
  AVG(execution_time_ms) as avg_execution_time,
  AVG(confidence) as avg_confidence
FROM agent_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name;
```

**Check Decision Traces:**

```sql
SELECT 
  form_type,
  COUNT(*) as total_traces,
  COUNT(DISTINCT user_id) as unique_users
FROM decision_traces
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY form_type;
```

**Check Policy Versions:**

```sql
SELECT version, status, effective_date, created_at
FROM policy_versions
ORDER BY effective_date DESC;
```

### 2. Application Monitoring

- Monitor error logs for Phase 7 components
- Check validation response times (<100ms target)
- Monitor agent execution times
- Check for any "Why?" component errors
- Verify RAG retrieval performance

### 3. User Feedback

- Monitor user interactions with "Why?" links
- Track "Get Help" usage
- Monitor validation pass/fail rates
- Check manager approval requests

---

## Rollback Plan

If critical issues occur:

### Quick Disable (No Code Change)

Set environment variable:

```bash
PHASE7_ENABLED=false
```

This disables all Phase 7 features while keeping code in place.

### Full Rollback

1. **Revert Code:**

   ```bash
   git revert <commit-hash>
   ```

2. **Database Rollback** (if needed):

   ```sql
   -- Only if absolutely necessary
   DROP TABLE IF EXISTS decision_traces CASCADE;
   DROP TABLE IF EXISTS agent_audit_log CASCADE;
   DROP TABLE IF EXISTS policy_versions CASCADE;
   
   DROP FUNCTION IF EXISTS create_decision_trace CASCADE;
   DROP FUNCTION IF EXISTS log_agent_decision CASCADE;
   DROP FUNCTION IF EXISTS get_policy_version CASCADE;
   ```

---

## Documentation Updates

### Updated Documentation

- [x] `DEPLOYMENT_CHECKLIST_PHASE7.md` - Phase 7 deployment guide
- [x] `APPLY_PHASE7_MIGRATION.md` - Migration instructions
- [x] `docs/PHASE_7_ADVANCED_AI_ENHANCEMENTS.md` - Complete Phase 7 guide
- [x] `PHASE_7_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- [ ] **Update main README.md** (see below)

### README Updates Needed

Update `ohisee-reports/README.md` to include:

1. Phase 7 features overview
2. Configuration options
3. Migration instructions
4. Testing instructions

---

## Success Criteria

✅ All migrations applied  
✅ All tests passing  
✅ Build successful  
✅ All Phase 7 features enabled  
✅ Multi-agent validation working  
✅ Enhanced RAG working  
✅ Explainable AI working  
✅ Decision traces being created  
✅ Zero visible AI references  
✅ Performance targets met  
✅ No runtime errors

---

## Support & Troubleshooting

### Common Issues

**Issue: "Collapsible component not found"**

- Solution: `npm install @radix-ui/react-collapsible --legacy-peer-deps`

**Issue: "Policy version function not found"**

- Solution: Verify migration applied, check `get_policy_version()` exists

**Issue: "Agent audit log table not found"**

- Solution: Apply Phase 7 migration

**Issue: "Multi-agent validation not working"**

- Solution: Check `PHASE7_MULTI_AGENT=true` in environment

### Getting Help

1. Check error logs
2. Verify database migration applied
3. Check environment variables
4. Review `DEPLOYMENT_CHECKLIST_PHASE7.md`
5. Check `APPLY_PHASE7_MIGRATION.md`

---

## Next Steps After Deployment

1. **Monitor Performance**: Track validation times, agent execution
2. **Collect Analytics**: Monitor agent audit logs, decision traces
3. **User Training**: Brief users on "Why?" links (optional)
4. **Policy Refinement**: Use adaptive policy analytics to refine rules
5. **Fine-Tuning**: When ready, integrate fine-tuned models

---

**Ready for Deployment**: ✅ All systems go!
