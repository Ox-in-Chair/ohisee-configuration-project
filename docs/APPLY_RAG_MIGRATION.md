# Apply RAG Search Functions Migration

## ⚠️ CRITICAL: AI Assistant won't work without these functions

The AI assistant is timing out because `search_procedures()` and `search_similar_cases()` database functions are missing.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/fpmnfokvcdqhbsawvyjh/sql

### Step 2: Copy the Migration SQL

Open this file:
```
ohisee-reports/supabase/migrations/20251110140000_rag_search_functions.sql
```

### Step 3: Paste and Run

1. Click "+ New query" in Supabase SQL Editor
2. Paste the entire contents of the migration file
3. Click "Run"

### Step 4: Verify

The migration creates:
- ✅ `search_procedures()` function - searches BRCGS procedures by vector similarity
- ✅ `search_similar_cases()` function - finds similar historical NCAs/MJCs
- ✅ Adds `embedding_vector` columns to `ncas` and `mjcs` tables
- ✅ Creates vector indexes for fast similarity search

### Step 5: Test AI Assistant

After applying the migration:

1. Open: http://localhost:3008/nca/new
2. Click "Get AI Help" in the NC Description field
3. Modal should appear within 2 seconds (no more timeout!)
4. AI should reference Kangopak procedures (e.g., "5.7", "3.9")

---

## What This Fixes

**Before (Current Issue):**
```
Error searching procedures: Could not find the function public.search_procedures()
Error searching similar cases: Could not find the function public.search_similar_cases()
AI suggestion generation failed: AI request exceeded 2000ms
```

**After (With Functions):**
- AI retrieves relevant BRCGS procedures using semantic search
- AI finds similar historical cases with successful outcomes
- Suggestions returned in <2s with procedure references
- 232 Kangopak procedures available for AI context

---

## Technical Details

The migration file contains:

### Function 1: `search_procedures()`

```sql
CREATE OR REPLACE FUNCTION search_procedures(
  query_embedding vector(1536),
  match_limit integer DEFAULT 5,
  match_threshold real DEFAULT 0.5
)
RETURNS TABLE (
  procedure_number text,
  content text,
  similarity real
)
```

Uses pgvector cosine similarity search over `knowledge_base_documents.embedding_vector`

### Function 2: `search_similar_cases()`

```sql
CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding vector(1536),
  case_type text,
  match_limit integer DEFAULT 3,
  match_threshold real DEFAULT 0.6,
  min_quality_score integer DEFAULT 75
)
RETURNS TABLE (
  id uuid,
  description text,
  corrective_action text,
  similarity real
)
```

Searches `ncas` or `mjcs` tables for similar closed cases with high quality scores.

---

## Alternative: Manual SQL Execution

If you prefer, you can run these two commands directly in the SQL Editor:

**Command 1: Create search_procedures function**

```sql
CREATE OR REPLACE FUNCTION search_procedures(
  query_embedding vector(1536),
  match_limit integer DEFAULT 5,
  match_threshold real DEFAULT 0.5
)
RETURNS TABLE (
  procedure_number text,
  content text,
  similarity real
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.document_number as procedure_number,
    kb.full_text as content,
    (1 - (kb.embedding_vector <=> query_embedding))::real as similarity
  FROM knowledge_base_documents kb
  WHERE
    kb.status = 'current'
    AND kb.embedding_vector IS NOT NULL
    AND (1 - (kb.embedding_vector <=> query_embedding)) > match_threshold
  ORDER BY kb.embedding_vector <=> query_embedding
  LIMIT match_limit;
END;
$$;
```

**Command 2: Create search_similar_cases function**

```sql
CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding vector(1536),
  case_type text,
  match_limit integer DEFAULT 3,
  match_threshold real DEFAULT 0.6,
  min_quality_score integer DEFAULT 75
)
RETURNS TABLE (
  id uuid,
  description text,
  corrective_action text,
  similarity real
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF case_type = 'nca' THEN
    RETURN QUERY
    SELECT
      n.id,
      n.nc_description as description,
      n.corrective_action,
      (1 - (n.embedding_vector <=> query_embedding))::real as similarity
    FROM ncas n
    LEFT JOIN nca_quality_scores nqs ON n.id = nqs.nca_id
    WHERE
      n.status = 'closed'
      AND n.embedding_vector IS NOT NULL
      AND (1 - (n.embedding_vector <=> query_embedding)) > match_threshold
      AND COALESCE(nqs.total_score, 100) >= min_quality_score
    ORDER BY n.embedding_vector <=> query_embedding
    LIMIT match_limit;
  ELSIF case_type = 'mjc' THEN
    RETURN QUERY
    SELECT
      m.id,
      m.description_required as description,
      m.corrective_action,
      (1 - (m.embedding_vector <=> query_embedding))::real as similarity
    FROM mjcs m
    LEFT JOIN mjc_quality_scores mqs ON m.id = mqs.mjc_id
    WHERE
      m.status = 'closed'
      AND m.embedding_vector IS NOT NULL
      AND (1 - (m.embedding_vector <=> query_embedding)) > match_threshold
      AND COALESCE(mqs.total_score, 100) >= min_quality_score
    ORDER BY m.embedding_vector <=> query_embedding
    LIMIT match_limit;
  ELSE
    RAISE EXCEPTION 'Invalid case_type: must be nca or mjc';
  END IF;
END;
$$;
```

---

## After Migration: Next Steps

Once functions are applied and verified:

1. ✅ 232 Kangopak procedures uploaded and searchable
2. ✅ RAG search functions operational
3. ✅ AI assistant ready for production use
4. 🎯 Production deployment

The AI integration is complete once this migration is applied!
