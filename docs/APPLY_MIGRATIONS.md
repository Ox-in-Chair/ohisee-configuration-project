# Apply AI Integration Migrations

## Quick Fix: Apply Migrations via Supabase Dashboard

The `knowledge_base_documents` table doesn't exist yet. You need to apply the database migrations.

### Option 1: Use Supabase Dashboard (Fastest - 2 minutes)

1. **Go to Supabase SQL Editor:**
   https://supabase.com/dashboard/project/fpmnfokvcdqhbsawvyjh/sql

2. **Apply Migration 1 - AI Integration:**
   - Click "+ New query"
   - Copy contents from: `ohisee-reports/supabase/migrations/20251110120000_ai_integration.sql`
   - Paste into SQL editor
   - Click "Run"

3. **Apply Migration 2 - AI Quality Coaching:**
   - Click "+ New query"
   - Copy contents from: `ohisee-reports/supabase/migrations/20251110130000_ai_quality_coaching.sql`
   - Paste into SQL editor
   - Click "Run"

4. **Verify Tables Created:**
   - Go to: https://supabase.com/dashboard/project/fpmnfokvcdqhbsawvyjh/editor
   - Check for these tables:
     - ✅ `knowledge_base_documents`
     - ✅ `ai_assistance_log`
     - ✅ `nca_quality_scores`
     - ✅ `mjc_quality_scores`
     - ✅ `user_quality_scores`
     - ✅ `coaching_alerts`
     - ✅ `hazard_types`

5. **Upload Procedures:**
   ```bash
   cd ohisee-reports
   npm run upload-kangopak
   ```

### Option 2: Use Supabase CLI (If installed)

```bash
cd ohisee-reports
supabase db push
```

### Option 3: Manual SQL Execution (Copy-Paste)

**Migration 1 (AI Integration):**
Location: `ohisee-reports/supabase/migrations/20251110120000_ai_integration.sql`

Creates:
- `knowledge_base_documents` table (for procedures)
- `ai_assistance_log` table (audit trail)
- `suppliers` table (Approved Supplier List)
- pgvector extension for RAG search
- RLS policies

**Migration 2 (AI Quality Coaching):**
Location: `ohisee-reports/supabase/migrations/20251110130000_ai_quality_coaching.sql`

Creates:
- `nca_quality_scores` table
- `mjc_quality_scores` table
- `user_quality_scores` table (6-month rolling average)
- `coaching_alerts` table (4-tier alert system)
- `hazard_types` table (11 BRCGS hazard types)
- Triggers and functions

---

## Why This Failed

The upload script tried to insert into `knowledge_base_documents`, but that table doesn't exist yet because migrations haven't been applied to your Supabase instance.

## After Migrations Applied

Once migrations are applied, run:

```bash
npm run upload-kangopak
```

This will upload all 50+ Kangopak procedures to the knowledge base, and the AI assistant will work correctly.

---

## Troubleshooting

### Error: "relation already exists"

This is fine - means the table is already created. Continue with next migration.

### Error: "permission denied"

Make sure you're using the service_role key (not anon key) in `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Verify Migrations Applied

Run this SQL in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'knowledge_base_documents',
    'ai_assistance_log',
    'nca_quality_scores'
  );
```

Should return 3 rows if migrations applied successfully.
