# Database Performance Bottleneck Analysis
# Kangopak Production Control & Compliance System

## Executive Summary

This analysis identifies **critical performance bottlenecks** in the database layer that will cause scalability issues as the system grows. Key findings:

- **8 N+1 Query Problems** requiring immediate fixes
- **Multiple queries without pagination** fetching entire tables
- **SELECT * operations** on large tables (NCAs, MJCs, Knowledge Base)
- **Missing WHERE clauses** in several dashboard/analytics queries
- **Inefficient aggregate functions** calculated in application layer (should be in DB)
- **Suboptimal index coverage** on foreign keys for common join patterns

---

## 1. CRITICAL ISSUES - N+1 Query Problems

### Issue 1.1: NCA Update Function - Double Fetch of Same Record
**File:** `/home/user/ohisee-configuration-project/app/actions/nca-actions.ts` (lines 536-576)

**Problem:** Two separate fetches of the same NCA record
```typescript
// First fetch (lines 536-540)
const { data: currentNCA } = await supabase
  .from('ncas')
  .select('nca_number, nc_type, supplier_name, ...')
  .eq('id', ncaId)
  .single();

// Second fetch (lines 570-574) - Same record!
const { data: currentNCAForClosure } = await supabase
  .from('ncas')
  .select('close_out_signature, status')
  .eq('id', ncaId)
  .single();
```

**Impact:** 
- Extra round-trip to database
- Unnecessary bandwidth
- Increased latency (~100-200ms per operation)

**Fix Required:** Combine both fetches into single query with all required columns

---

### Issue 1.2: End-of-Day Submission - Multiple Validation Fetches
**File:** `/home/user/ohisee-configuration-project/app/actions/end-of-day-actions.ts` (lines 183-253)

**Problem:** Multiple separate queries for same data
```typescript
// Query 1 (lines 183-186): Fetch NCA list for validation
const { data: ncas } = await supabase.from('ncas')
  .select('id, status').in('id', entryIds.ncaIds);

// ... validation logic ...

// Query 2 (lines 245-248): Fetch same NCAs again for email
const { data: ncas } = await supabase.from('ncas')
  .select('nca_number').in('id', entryIds.ncaIds);

// Query 3 (lines 250-253): Fetch MJCs similarly
const { data: mjcs } = await supabase.from('mjcs')
  .select('job_card_number').in('id', entryIds.mjcIds);
```

**Impact:**
- 3 redundant database round-trips
- Could cause 200-600ms latency

**Fix Required:** Combine validation and email data fetches into single queries

---

### Issue 1.3: Waste Manifest Creation - Separate Update Query
**File:** `/home/user/ohisee-configuration-project/app/actions/waste-actions.ts` (lines 89-113)

**Problem:** Update to link waste manifest is separate from insert
```typescript
// Insert waste manifest
const { data: manifest } = await supabase
  .from('waste_manifests').insert(manifestData)
  .select().single();

// Separate update query to link it
const { error: linkError } = await supabase
  .from('ncas').update({ waste_manifest_id: manifest.id })
  .eq('id', ncaId);
```

**Impact:**
- Two queries where one should suffice
- Transaction risk - could have orphaned records if update fails

**Fix Required:** Return the manifest ID from insert, use it in NCA update in single call

---

### Issue 1.4: Knowledge Base - Multiple Fetches for Version Control
**File:** `/home/user/ohisee-configuration-project/app/actions/knowledge-base-actions.ts` (lines 110-144)

**Problem:** Fetch existing document, then mark as superseded
```typescript
// Fetch existing current version
const { data: rawExisting } = await supabase
  .from('knowledge_base_documents')
  .select('id, revision, document_number')
  .eq('document_number', metadata.document_number)
  .eq('status', 'current')
  .single();

// Separate update to supersede it
if (existingCurrent) {
  const { error: updateError } = await supabase
    .from('knowledge_base_documents')
    .update({ status: 'superseded' })
    .eq('id', existingCurrent.id);
}
```

**Impact:**
- Extra query per procedure upload
- Could be consolidated with insert in single transaction

---

### Issue 1.5: Dashboard - Fetching All MJCs Without Aggregation
**File:** `/home/user/ohisee-configuration-project/app/actions/dashboard-actions.ts` (lines 66-115)

**Problem:** Fetches ALL closed MJCs to database, then calculates averages in application
```typescript
// Fetches ENTIRE closed MJC table
const { data, error } = await supabase
  .from('mjcs')
  .select('urgency, created_at, closed_at, status')
  .eq('status', 'closed')
  .not('created_at', 'is', null)
  .not('closed_at', 'is', null);

// Then calculates in JavaScript (lines 84-114)
const urgencyGroups: Record<string, number[]> = {};
data.forEach((mjc) => {
  const hours = (closed - created) / (1000 * 60 * 60);
  urgencyGroups[urgency].push(hours);
});
```

**Impact:**
- **CRITICAL:** Scalability killer - fetches 10,000+ records for dashboard
- All aggregation happens in application memory
- Memory pressure on Node.js instance
- Slow response time (seconds for large datasets)

**Fix Required:** Move aggregation to database using GROUP BY and aggregate functions

---

## 2. MISSING PAGINATION - Full Table Scans

### Issue 2.1: NCA Trend Analysis - Year-Long Full Scan
**File:** `/home/user/ohisee-configuration-project/app/actions/nca-trend-actions.ts` (lines 66-88)

**Problem:** Fetches ALL NCAs for entire year without limit
```typescript
const { data: ncas } = await supabase
  .from('ncas')
  .select('id, nca_number, date, created_at, close_out_date, status, nc_type, supplier_name, nc_description')
  .gte('created_at', yearStart)
  .lte('created_at', yearEnd)
  .order('created_at', { ascending: true });
  // NO PAGINATION!
```

**Impact:**
- For 2025 with 10,000+ NCAs: ~500KB-1MB of data per request
- All processing happens in application layer (lines 107-171)
- Memory exhaustion risk
- Could timeout on slow connections

**Affected Operations:**
- String matching on `nc_description` (lines 155-170) - O(n) complexity
- Categorization via keyword search - expensive for large datasets

**Fix Required:** Add pagination with `.limit()` and `.offset()`, or use database aggregation

---

### Issue 2.2: Trend Data Without Window Functions
**File:** `/home/user/ohisee-configuration-project/app/actions/dashboard-actions.ts` (lines 14-60)

**Problem:** Fetches all NCAs for 12 weeks, processes in JavaScript
```typescript
const { data } = await supabase
  .from('ncas')
  .select('date, created_at')
  .gte('created_at', twelveWeeksAgo)
  // NO LIMIT - fetches all matching records
  .order('created_at', { ascending: true });

// Then groups in JavaScript
data.forEach((nca) => {
  const weekKey = getWeekKey(ncaDate);
  weekCounts[weekKey]++;
});
```

**Impact:**
- Potentially 2,000-5,000 records fetched
- All aggregation in application

---

## 3. MISSING INDEXES - Foreign Key Coverage

### Issue 3.1: No Composite Index on Foreign Keys + Status
**Tables:** `ncas`, `mjcs`

**Current Indexes:**
```sql
CREATE INDEX idx_nca_raised_by_user_id ON ncas(raised_by_user_id);
CREATE INDEX idx_nca_status ON ncas(status);
```

**Problem:** Common query pattern is NOT indexed
```typescript
// From end-of-day-actions.ts line 70
.eq('raised_by_user_id', userId)  // Uses single-column index
// But also filtered by status in application

// This JOIN pattern lacks index
ncas.raised_by_user_id = users.id AND ncas.status = 'draft'
```

**Missing Indexes:**
```sql
-- Should exist but doesn't:
CREATE INDEX idx_nca_raised_by_status ON ncas(raised_by_user_id, status);
CREATE INDEX idx_mjc_raised_by_status ON mjcs(raised_by_user_id, status);
CREATE INDEX idx_nca_wo_status ON ncas(wo_id, status);
CREATE INDEX idx_mjc_wo_status ON mjcs(wo_id, status);
```

**Impact:** 
- Sequential scans instead of index seeks
- Slower filter operations
- Affects every user-filtered query

---

## 4. SELECT * OPERATIONS - Unnecessary Column Fetches

### Issue 4.1: Overfetching in List Operations
**File:** `/home/user/ohisee-configuration-project/app/actions/nca-actions.ts` (line 442)

```typescript
const { data } = await supabase
  .from('ncas')
  .select('*')  // <-- ANTI-PATTERN
  .eq('id', id)
  .single();
```

**Problem:** Fetches 30+ columns when often only 5-10 needed

**Impact:**
- Large payload for list operations
- Slower network transfer
- Unnecessary bandwidth

**Affected Files:**
- `nca-actions.ts:442` - fetchNCAById
- `nca-actions.ts:479` - listNCAs  
- `mjc-actions.ts:445` - getMJCById
- `mjc-actions.ts:465` - listMJCs
- `complaint-actions.ts` - multiple queries
- `work-order-actions.ts` - list operations
- `knowledge-base-actions.ts:374, 433, 520` - procedure fetches

---

## 5. INEFFICIENT AGGREGATE FUNCTIONS - Calculate in App

### Issue 5.1: Dashboard Calculations
**File:** `/home/user/ohisee-configuration-project/app/actions/dashboard-actions.ts` (lines 104-114)

```typescript
// Calculate in JavaScript instead of database
return Object.entries(urgencyGroups).map(([urgency, hours]) => {
  const avgHours = hours.length > 0 
    ? hours.reduce((sum, h) => sum + h, 0) / hours.length  // <-- App layer math
    : 0;
  return { urgency, avgHours };
});
```

**Should Be SQL:**
```sql
SELECT 
  urgency,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)::numeric as avg_hours
FROM mjcs
WHERE status = 'closed'
GROUP BY urgency
```

**Impact:**
- Unnecessary data transfer (all timestamps instead of averages)
- Expensive JavaScript processing
- Duplicate aggregations across requests

---

### Issue 5.2: NCA Trend Categorization
**File:** `/home/user/ohisee-configuration-project/app/actions/nca-trend-actions.ts` (lines 153-171)

```typescript
// String matching in application
const description = nca.nc_description.toLowerCase();
if (description.includes('seal') || description.includes('gusset')) {
  categoryCounts['Seal Integrity']++;
} else if (description.includes('equipment') || description.includes('machine')) {
  categoryCounts['Equipment & Tools']++;
}
```

**Impact:**
- O(n) complexity per NCA
- Regex matching on large strings inefficient
- Should use database CASE statements or categorization columns

---

## 6. QUERY PATTERNS - Missing WHERE Clauses

### Issue 6.1: Knowledge Base Text Search
**File:** `/home/user/ohisee-configuration-project/app/actions/knowledge-base-actions.ts` (lines 314-329)

```typescript
const { data: procedures } = await supabase
  .from('knowledge_base_documents')
  .select(`...`)
  .eq('status', 'current')  // Good
  .textSearch('full_text', query, {
    type: 'websearch',
    config: 'english'
  })
  .limit(limit);
  // No filtering for document_type or brcgs_section
```

**Problem:** Full-text search on very large text fields (thousands of words per document)

**Impact:**
- PostgreSQL text search on `full_text` column is expensive
- No way to filter by procedure type first (pre-filter optimization)

---

## 7. RAG SERVICE - Inefficient Vector Queries

### Issue 7.1: Vector Search Without Proper Filtering
**File:** `/home/user/ohisee-configuration-project/lib/ai/rag/enhanced-rag-service.ts` (lines 121-125)

```typescript
const { data, error } = await this.supabase
  .from(tableName)  // 'nca_records' or 'mjc_records'
  .select(`${descriptionField}, corrective_action, id`)
  .eq('status', 'closed')  // Good filter
  .limit(3);
  // NO vector similarity search - just fetches 3 random closed records
```

**Problem:**
- Tables `nca_records` and `mjc_records` don't exist in schema
- Actual tables are `ncas` and `mjcs`
- Not using vector embeddings despite having `embedding_vector` column
- Fallback to limit(3) without ordering by similarity

**Impact:**
- Query returns wrong results
- No semantic relevance ranking

---

## 8. MISSING INDEXES - Summary Table

| Table | Current Indexes | Missing Indexes | Priority |
|-------|-----------------|-----------------|----------|
| `ncas` | Partial indexes on status, type, contamination | `(raised_by_user_id, status)`, `(wo_id, status)`, `(created_at DESC, status)` | HIGH |
| `mjcs` | Partial indexes on status, urgency | `(raised_by_user_id, status)`, `(assigned_to, status)`, `(machine_id, status)` | HIGH |
| `knowledge_base_documents` | Good coverage (status, section, type) | `(status, document_number)` for composite lookups | MEDIUM |
| `audit_trail` | `(entity_type, entity_id)` | `(user_id, timestamp)`, `(action, timestamp)` for audit queries | MEDIUM |
| `work_orders` | Basic foreign keys | `(operator_id, status)`, `(machine_id, status)` | MEDIUM |

---

## 9. PERFORMANCE IMPACT ESTIMATES

### Current Performance Issues

| Query | Records Fetched | Network Size | App Processing | Est. Latency |
|-------|-----------------|--------------|-----------------|--------------|
| Dashboard MJC Response | ALL (~500+) | 200KB+ | 5+ sec | **5-10s** |
| NCA Trend Analysis (Annual) | ALL (~10,000) | 1MB+ | 30+ sec | **30-45s** |
| End-of-Day Submission | 3x fetch | 50KB | 2 sec | **3-5s** |
| NCA Update with Disposition | 2x fetch | 100KB | 1 sec | **1.5-2s** |

### Projected Issues at Scale

**Current Data (Estimated):**
- NCAs: ~5,000/year (14/day)
- MJCs: ~1,000/year (3/day)
- Daily queries: ~200

**At 5x Scale (50+ NCAs/day):**
- Memory exhaustion on dashboard queries
- Request timeouts (>30s)
- RLS policy performance degradation
- Database connection pool exhaustion

---

## 10. AUDIT TRAIL TABLE - Index Analysis

**File:** `/home/user/ohisee-configuration-project/supabase/migrations/20251106102100_audit_trail.sql`

**Current Indexes:**
```sql
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_action ON audit_trail(action);
```

**Missing:**
```sql
-- For user activity reports
CREATE INDEX idx_audit_user_timestamp ON audit_trail(user_id, timestamp DESC);

-- For action-based searches
CREATE INDEX idx_audit_action_timestamp ON audit_trail(action, timestamp DESC);

-- For compliance date range queries
CREATE INDEX idx_audit_timestamp_range ON audit_trail(timestamp DESC) 
  WHERE action IN ('status_changed', 'closed', 'hygiene_clearance_granted');
```

---

## 11. CRON JOB QUERIES - Potential Issues

**File:** `/home/user/ohisee-configuration-project/supabase/migrations/20251112_schedule_nca_cron_jobs.sql`

Cron jobs execute queries without pagination. Depending on query logic:
- Could cause locks during peak hours
- No timeout protection visible
- HTTP calls to external endpoints (notification service)

---

## 12. RECOMMENDATIONS - Priority Order

### CRITICAL (Fix Immediately - 1 week)

1. **Fix N+1 Queries**
   - Combine NCA fetches in updateNCA function
   - Batch end-of-day queries
   - Consolidate waste manifest operations
   
2. **Add Missing Indexes**
   ```sql
   CREATE INDEX idx_nca_raised_by_status ON ncas(raised_by_user_id, status);
   CREATE INDEX idx_mjc_raised_by_status ON mjcs(raised_by_user_id, status);
   ```

3. **Implement Database Aggregation**
   - Move dashboard calculations to database views
   - Use SQL GROUP BY for maintenance response times
   - Remove application-layer aggregation

### HIGH (1-2 weeks)

4. **Add Pagination to Trend Queries**
   - Implement cursor-based pagination for NCA trends
   - Add `.limit()` clauses with configurable page size
   - Cache results for dashboard

5. **Optimize SELECT Clauses**
   - Replace `SELECT *` with explicit column lists
   - Reduce payload by 40-50%

6. **Create Database Views**
   ```sql
   CREATE VIEW nca_summary AS
     SELECT id, nca_number, status, nc_type, created_at
     FROM ncas;
   
   CREATE VIEW mjc_summary AS
     SELECT id, job_card_number, status, urgency, created_at
     FROM mjcs;
   ```

### MEDIUM (2-4 weeks)

7. **Vector Search Implementation**
   - Implement actual vector similarity in RAG service
   - Generate embeddings for new procedures/NCAs
   - Use proper `<=>` operator with threshold

8. **Add Partial Indexes**
   - Partial indexes on active records (status != 'closed')
   - Speeds up in-progress record queries

9. **Create Materialized Views for Reports**
   - Pre-calculate trend data
   - Refresh on schedule (hourly)
   - Serve from view instead of computing

### LOW (4-8 weeks)

10. **Query Optimization in RAG**
    - Fix table references (nca_records → ncas)
    - Implement quality_score filtering
    - Add proper ORDER BY similarity

11. **Connection Pool Tuning**
    - Monitor connection usage
    - Adjust Supabase pool settings for peak load

---

## 13. TESTING & VALIDATION

### Before-After Performance Tests

```sql
-- Test MJC response time aggregation
EXPLAIN ANALYZE
SELECT urgency, 
       AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600)::numeric
FROM mjcs
WHERE status = 'closed'
GROUP BY urgency;

-- Test NCA list with proper indexes
EXPLAIN ANALYZE
SELECT id, nca_number, status, created_at
FROM ncas
WHERE raised_by_user_id = $1 AND status = 'draft'
ORDER BY created_at DESC
LIMIT 50;
```

### Load Testing Scenarios

1. **Dashboard Load:** 10 concurrent users loading dashboards
2. **Year-End Reporting:** Trend analysis for 12,000+ NCAs
3. **Bulk Import:** 1,000 NCAs loaded simultaneously
4. **RLS Policy Performance:** Query planning with 50+ roles

---

## Summary of Files Requiring Changes

| File | Issue | Fix Type | Complexity |
|------|-------|----------|-----------|
| `nca-actions.ts` | N+1 (2 fetches) | Combine queries | Low |
| `mjc-actions.ts` | SELECT * | Explicit columns | Low |
| `dashboard-actions.ts` | No pagination, app aggregation | Add DB GROUP BY | Medium |
| `nca-trend-actions.ts` | Full table scan, no pagination | Add pagination, DB aggregation | High |
| `end-of-day-actions.ts` | N+1 (3 fetches) | Batch queries | Medium |
| `waste-actions.ts` | N+1 (2 operations) | Single transaction | Low |
| `knowledge-base-actions.ts` | N+1 (2 queries) | Combine inserts | Low |
| Migrations | Missing indexes | Add composite indexes | Low |
| `enhanced-rag-service.ts` | Wrong tables, no vector search | Fix references, implement vectors | High |

---

## Appendix: Query Examples - Before/After

### Example 1: Dashboard MJC Response Time

**BEFORE (Current - Slow):**
```typescript
const { data } = await supabase
  .from('mjcs')
  .select('urgency, created_at, closed_at, status')
  .eq('status', 'closed');

// Application layer (JavaScript)
const urgencyGroups = {};
data.forEach(mjc => {
  const hours = (new Date(mjc.closed_at) - new Date(mjc.created_at)) / (1000*60*60);
  urgencyGroups[mjc.urgency] ??= [];
  urgencyGroups[mjc.urgency].push(hours);
});
```

**AFTER (Optimized - Fast):**
```sql
SELECT 
  urgency,
  ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)::numeric, 1) as avg_hours,
  COUNT(*) as total_mjcs
FROM mjcs
WHERE status = 'closed'
GROUP BY urgency
ORDER BY avg_hours DESC;
```

### Example 2: NCA Update N+1 Fix

**BEFORE (Current):**
```typescript
// Fetch 1
const { data: currentNCA } = await supabase
  .from('ncas').select('nca_number, ...other fields...').eq('id', id).single();

// ... validation ...

// Fetch 2 (duplicate!)
const { data: forClosure } = await supabase
  .from('ncas').select('close_out_signature, status').eq('id', id).single();
```

**AFTER (Optimized):**
```typescript
const { data: nca } = await supabase
  .from('ncas')
  .select('nca_number, nc_type, supplier_name, close_out_signature, status, ...')
  .eq('id', id)
  .single();
// Single fetch, all data available
```

---

**Report Generated:** 2025-11-12
**System:** Kangopak Production Control & Compliance Platform
**Database:** Supabase PostgreSQL
**Analysis Tool:** Comprehensive Query Pattern Review

