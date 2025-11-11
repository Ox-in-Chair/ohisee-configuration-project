# Apply Phase 7 Migration - Quick Guide

**Migration File**: `supabase/migrations/20251110170000_phase7_advanced_ai.sql`

## Method 1: Supabase Dashboard SQL Editor (Recommended)

1. **Go to Supabase SQL Editor:**
   - URL: https://supabase.com/dashboard/project/fpmnfokvcdqhbsawvyjh/sql

2. **Copy Migration SQL:**
   - Open file: `ohisee-reports/supabase/migrations/20251110170000_phase7_advanced_ai.sql`
   - Copy entire contents

3. **Paste and Run:**
   - Click "+ New query" in SQL Editor
   - Paste the SQL
   - Click "Run" button

4. **Verify Success:**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('policy_versions', 'agent_audit_log', 'decision_traces');
   
   -- Check functions created
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('get_policy_version', 'log_agent_decision', 'create_decision_trace');
   
   -- Test function
   SELECT get_policy_version();
   ```

## Method 2: Using Script (If Direct DB Access Available)

```bash
cd ohisee-reports
npx tsx scripts/apply-phase7-migration.ts
```

## Method 3: Supabase CLI

```bash
cd ohisee-reports
supabase db push
```

## What This Migration Creates

### Tables:
- `policy_versions` - Policy rule versioning
- `agent_audit_log` - Multi-agent validation audit trail
- `decision_traces` - Complete decision traces for explainable AI

### Functions:
- `get_policy_version()` - Get current active policy version
- `log_agent_decision()` - Log agent validation decisions
- `create_decision_trace()` - Create decision traces

### Indexes:
- Performance indexes on all tables

## Post-Migration: Initialize Default Policy

After migration, initialize the default policy:

```sql
INSERT INTO policy_versions (version, status, rules, changelog)
VALUES (
  '1.0.0',
  'active',
  '[]'::jsonb,
  '["Initial policy version"]'::jsonb
);
```

## Verification Checklist

- [ ] Tables created (3 tables)
- [ ] Functions created (3 functions)
- [ ] Indexes created
- [ ] Default policy initialized
- [ ] `get_policy_version()` returns '1.0.0'
- [ ] No errors in Supabase logs

## Troubleshooting

**Error: "relation already exists"**
- This is OK - tables already exist, migration is idempotent

**Error: "permission denied"**
- Ensure you're using service role key, not anon key
- Check RLS policies allow access

**Error: "function does not exist"**
- Some functions may require direct database access
- Use Supabase Dashboard SQL Editor instead

