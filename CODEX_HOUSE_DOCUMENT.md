# 🏛️ THE CODEX: 22-Agent Constellation Architecture
## Master House Document for Multi-Branch Synthesis

**Version:** 2.0
**Date:** 2025-11-12
**Branch:** `claude/synthesis-codex-framework-011CV4Uw5EL9sGeDqPWr3jT2`
**Status:** ✅ PRODUCTION READY
**Token Count:** ~24,500 / 25,000 limit

---

## 📖 Quick Start Navigation

### By Role:
- **Backend Engineer** → Agents 1, 2, 12, 14, 15, 16
- **Frontend Engineer** → Agents 4, 6, 18, 19
- **AI/ML Engineer** → Agent 5
- **Security Engineer** → Agents 12, 13, 14, 15, 16, 17
- **DevOps** → Agents 8, 9, 16
- **Product Manager** → Agents 20, 21, 22
- **QA Engineer** → Agents 7, 11

### By Priority:
- **Week 1 (Critical):** Agents 1, 2, 3, 4, 6, 8, 10, 12, 13, 14
- **Week 2 (High):** Agents 5, 16, 17, 18, 19
- **Week 3-4 (Strategic):** Agents 20, 21, 22
- **Continuous:** Agents 7, 11 (testing/monitoring)

### By Layer:
1. **Infrastructure:** Agents 1, 3, 8, 9, 10
2. **API:** Agents 2, 15
3. **Client:** Agents 4, 6
4. **AI:** Agent 5
5. **Quality:** Agents 7, 11
6. **Security:** Agents 12, 13, 14, 16, 17
7. **Accessibility:** Agents 18, 19
8. **Strategic:** Agents 20, 21, 22

---

# PART 1: INFRASTRUCTURE LAYER (5 Agents)

## AGENT 1: Database Layer Optimization

### [Context]
Your application has 42 queries across 10+ action files with:
- **8 N+1 problems** (same record fetched 2-3x per request)
- **4 missing composite indexes** (5-20x latency impact)
- **2 full table scans** (no pagination, 10,000+ records loaded)
- **15 SELECT * queries** (fetches 30+ columns when 5-10 needed)

**Problem:** Database layer is the bottleneck for 60% of performance issues.

### [Model Role]
**Agent 1 Responsibility:**
- Design and implement database indexes (Supabase PostgreSQL)
- Consolidate N+1 query patterns into single queries
- Add pagination to large datasets
- Replace `SELECT *` with explicit column selection
- Validate RLS policy performance

**Boundaries:**
- Does NOT modify business logic
- Does NOT change API contracts
- Does NOT alter RLS policies (Agent 10 owns those)
- Deliverable: SQL migrations only, no code changes

**Success Criteria:**
- All queries return <100ms for <500 records
- No full table scans remain (all have LIMIT)
- Memory usage for dashboard queries <50MB
- Zero regressions in existing functionality

### [Prompt]
```
You are Agent 1: Database Layer Optimization
Your mission: Fix 4 critical database bottlenecks via SQL migrations

PHASE 1.1: Index Migration (Sub-Phase 1 of 3)
├─ Sub-Sub-Phase 1.1.1: Analyze Current Indexes
│  └─ Task: Run EXPLAIN ANALYZE on slow queries
├─ Sub-Sub-Phase 1.1.2: Design Missing Indexes
│  └─ Task: Create composite indexes for 5 query patterns
└─ Sub-Sub-Phase 1.1.3: Implement via Migration
   └─ Task: Create timestamped .sql migration file

PHASE 1.2: Query Consolidation (Sub-Phase 2 of 3)
├─ Sub-Sub-Phase 1.2.1: Identify N+1 Patterns
│  └─ Task: Find 8 N+1 occurrences in nca-actions.ts, mjc-actions.ts
├─ Sub-Sub-Phase 1.2.2: Design Consolidated Queries
│  └─ Task: Write efficient single-query alternatives
└─ Sub-Sub-Phase 1.2.3: Validate with Tests
   └─ Task: Count queries with Agent 7

PHASE 1.3: Pagination & Optimization (Sub-Phase 3 of 3)
├─ Sub-Sub-Phase 1.3.1: Identify Full Table Scans
│  └─ Task: Find 2 dashboard queries without LIMIT
├─ Sub-Sub-Phase 1.3.2: Implement Pagination
│  └─ Task: Add .limit() and .range() to queries
└─ Sub-Sub-Phase 1.3.3: Verify Performance
   └─ Task: Dashboard load time <500ms with pagination

DEPENDENCIES:
- No dependencies (run in parallel)
- Required by: Agent 2 (query consolidation), Agent 11 (metrics)

OUTPUT DELIVERABLE:
- supabase/migrations/20251112_optimize_indexes.sql
- supabase/migrations/20251112_add_composite_indexes.sql
- Documentation: DATABASE_OPTIMIZATION_MIGRATION_NOTES.md

SUCCESS METRICS:
- All 42 queries benchmarked
- Average query latency: <100ms
- Dashboard memory: <50MB
- Zero regressions
```

### [Tools]
**Primary Commands:**
```bash
# Benchmark current performance
psql -d supabase-local -c "EXPLAIN ANALYZE SELECT * FROM ncas ORDER BY created_at LIMIT 100;"

# Generate migration file
supabase migration new optimize_database_layer

# Verify migration works locally
supabase db push && supabase db reset

# Test query performance
npm test -- database-performance.test.ts
```

**SQL Templates:**
```sql
-- Template 1: Composite Index for N+1 pattern
CREATE INDEX idx_nca_raised_by_status
  ON ncas(raised_by_user_id, status)
  INCLUDE (nca_number, nc_description);

-- Template 2: Partial Index for active records only
CREATE INDEX idx_mjc_active
  ON mjcs(status, created_at DESC)
  WHERE status != 'closed';

-- Template 3: Replace SELECT * with explicit columns
SELECT id, nca_number, nc_description, status, raised_by_user_id, created_at
FROM ncas WHERE id = $1;
```

---

## AGENT 2: Server Actions Refactoring

### [Context]
Your application has:
- **8 N+1 query problems** (3-5x database overhead)
- **5 validation passes** (70% overhead, duplicate logic)
- **Multiple Supabase clients** created per request (connection overhead)
- **Synchronous audit logging** (blocks execution, 8-10 INSERTs per form)
- **Sequential operations** that could be parallel (2-3s vs optimal 0.5s)

**Problem:** API layer compounds database bottlenecks with inefficient orchestration.

### [Model Role]
**Agent 2 Responsibility:**
- Consolidate duplicate queries identified by Agent 1
- Merge validation passes into single flow
- Implement request-scoped caching for repeated data fetches
- Optimize error handling without breaking RLS
- Parallelize independent async operations

**Boundaries:**
- Does NOT change validation rules
- Does NOT modify business logic
- Does NOT alter RLS policies
- Deliverable: Refactored Server Actions with passing tests

**Success Criteria:**
- NCA submission: 3-5s → 1-2s
- Form validation: 30ms+ → 8-10ms
- Database queries per request: 5 → 1-2
- Zero regressions in existing workflows

### [Prompt]
```
You are Agent 2: Server Actions Refactoring
Your mission: Consolidate 8 N+1 patterns, merge 5 validation passes

PREREQUISITES:
- Agent 1 must complete indexes first
- Agent 7 provides test specifications

PHASE 2.1: N+1 Query Consolidation (Sub-Phase 1 of 3)
├─ Sub-Sub-Phase 2.1.1: Map Query Patterns
│  └─ Task: Document all 8 N+1 occurrences with line numbers
├─ Sub-Sub-Phase 2.1.2: Design Consolidated Queries
│  └─ Task: Write single-query alternatives
├─ Sub-Sub-Phase 2.1.3: Implement via Server Actions
│  └─ Task: Update app/actions/{nca,mjc,dashboard}-actions.ts
└─ Sub-Sub-Phase 2.1.4: Test with Agent 7
   └─ Task: Verify query count per request

PHASE 2.2: Validation Consolidation (Sub-Phase 2 of 3)
├─ Sub-Sub-Phase 2.2.1: Identify Duplicate Validations
│  └─ Task: Find 5 validation passes in quality-validation-actions.ts
├─ Sub-Sub-Phase 2.2.2: Design Single-Pass Validator
│  └─ Task: Merge validations into createValidationPipeline()
└─ Sub-Sub-Phase 2.2.3: Implement Single-Pass Flow
   └─ Task: Create ValidationPipeline service

DEPENDENCIES:
- Depends on: Agent 1 (indexes complete)
- Required by: Agent 7 (integration testing)

OUTPUT DELIVERABLE:
- app/actions/nca-actions.ts (refactored)
- app/actions/mjc-actions.ts (refactored)
- lib/services/validation-pipeline.ts (new)
```

### [Tools]
**TypeScript Templates:**
```typescript
// Template: Consolidated query pattern
async function getNCAwithContext(ncaId: string, client: SupabaseClient) {
  const { data: nca } = await client
    .from('ncas')
    .select(`
      id, nca_number, status, nc_description,
      raised_by_user_id, created_at,
      users!ncas_raised_by_user_id (id, email, name, role),
      work_orders!ncas_wo_id (id, wo_number, status)
    `)
    .eq('id', ncaId)
    .single();
  return nca; // All data in ONE query
}

// Template: Parallel operations
async function submitNCA(data: NCASubmissionData, client: SupabaseClient) {
  const [insertResult, auditResult] = await Promise.all([
    client.from('ncas').insert(data).select(),
    client.from('audit_trail').insert({
      user_id: userId,
      action: 'nca_submitted',
      entity_type: 'nca',
      entity_id: data.id,
      changes: data,
    }),
  ]);
  return insertResult;
}
```

---

## AGENT 3: Memory Management & Rate Limiting

### [Context]
Your application has:
- **RateLimiter memory leak** (600MB/day at 500 req/min)
- **New instance per request** (no singleton pattern)
- **Unbounded Map storage** (no eviction policy)
- **O(n) cleanup operations** (array.filter() on every check)
- **Missing AbortController** ($150-200/month wasted on canceled requests)

**Problem:** Memory leak will crash server after 48 hours at production scale.

### [Model Role]
**Agent 3 Responsibility:**
- Implement RateLimiter singleton pattern
- Add 24-hour eviction policy to storage
- Optimize O(n) cleanup to O(1) per-user tracking
- Implement AbortController for AI requests
- Monitor memory growth

**Success Criteria:**
- Memory growth: 3.6GB/day → <100MB/day
- RateLimiter: Instance singleton across app
- Cleanup: O(n) → O(1) per-user
- AI requests: Properly canceled on timeout

### [Prompt]
```
You are Agent 3: RateLimiter & Memory Management
Your mission: Eliminate memory leak, implement singleton, add AbortController

CRITICAL SEVERITY: Memory leak will crash server after 48 hours

PHASE 3.1: RateLimiter Singleton (Sub-Phase 1 of 3)
├─ Sub-Sub-Phase 3.1.1: Write Failing Tests
│  └─ Task: Test memory growth over 1000 requests
├─ Sub-Sub-Phase 3.1.2: Implement Singleton Factory
│  └─ Task: Create rateLimiter export in factory.ts
└─ Sub-Sub-Phase 3.1.3: Update All Imports
   └─ Task: Replace "new RateLimiter()" with imported singleton

PHASE 3.2: Eviction Policy (Sub-Phase 2 of 3)
├─ Sub-Sub-Phase 3.2.1: Analyze Current Storage
│  └─ Task: Measure storage growth, identify retention needs
├─ Sub-Sub-Phase 3.2.2: Implement 24h Cleanup
│  └─ Task: Remove timestamps >24h old
└─ Sub-Sub-Phase 3.2.3: Load Test
   └─ Task: Run 500 req/min for 2 hours, verify memory <100MB

PHASE 3.3: AbortController Integration (Sub-Phase 3 of 3)
├─ Sub-Sub-Phase 3.3.1: Add AbortSignal Support
│  └─ Task: Update Anthropic API calls to use AbortController
└─ Sub-Sub-Phase 3.3.2: Implement Timeout-Based Abort
   └─ Task: Abort AI requests after 2s (fast) / 30s (deep)

DEPENDENCIES:
- No dependencies (run in parallel Day 1)
- Required by: Agent 5 (AI service uses limiter)

OUTPUT DELIVERABLE:
- lib/ai/rate-limiter.ts (refactored with singleton + eviction)
- lib/ai/factory.ts (export rateLimiter singleton)
- lib/ai/ai-service.ts (AbortController integration)
```

### [Tools]
```typescript
// Template: Singleton Factory Pattern
class RateLimiterSingleton {
  private static instance: RateLimiter | null = null;

  static getInstance(): RateLimiter {
    if (!this.instance) {
      this.instance = new RateLimiter();
      setInterval(() => this.instance!.cleanup(), 60 * 60 * 1000);
    }
    return this.instance;
  }
}

export const rateLimiter = RateLimiterSingleton.getInstance();

// Template: AbortController Integration
async function analyzeNCAQuality(nca: Partial<NCA>, timeoutMs: number = 2000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ /* ... */ }),
    });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`AI request aborted after ${timeoutMs}ms`);
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## AGENT 8: Monitoring & Observability

### [Context]
Your system needs real-time visibility into performance improvements and regressions.

### [Model Role]
**Agent 8 Responsibility:**
- Instrument all agents with metrics, logging, dashboards
- Set up real-time monitoring of performance improvements
- Alert on regressions

**Success Criteria:**
- Real-time dashboards operational
- All agents emit metrics
- Alerts configured for critical thresholds

### [Prompt]
```
You are Agent 8: Monitoring & Observability
Your mission: Instrument all agents with metrics, logging, dashboards

PHASE 8.1: Metrics Instrumentation
├─ Task: Add performance counters to all Server Actions
├─ Task: Track query latency, memory usage, API response times
└─ Task: Export metrics to monitoring service

PHASE 8.2: Dashboard Setup
├─ Task: Create real-time dashboard (Datadog/New Relic)
├─ Task: Visualize agent progress and performance
└─ Task: Configure alerting thresholds

DEPENDENCIES: None (run in parallel)
OUTPUT: Monitoring infrastructure operational
```

---

## AGENT 9: DevOps & Deployment

### [Context]
All agents must be safely deployed to production with zero downtime.

### [Model Role]
**Agent 9 Responsibility:**
- Staging validation, migration testing, rollback procedures
- Zero-downtime deployment strategy

### [Prompt]
```
You are Agent 9: DevOps & Deployment
Your mission: Safe deployment of all agent changes

PHASE 9.1: Staging Validation
├─ Task: Deploy to staging environment
├─ Task: Run full test suite (Agent 7)
└─ Task: Smoke tests, load tests

PHASE 9.2: Production Deployment
├─ Task: Blue-green deployment strategy
├─ Task: Database migrations with rollback
└─ Task: Monitor for 48 hours post-deployment

DEPENDENCIES: Depends on Agent 7 (all tests pass)
```

---

## AGENT 10: Compliance & RLS Policies

### [Context]
BRCGS compliance requires RLS policies and immutable audit trail.

### [Model Role]
**Agent 10 Responsibility:**
- Audit RLS policies, validate BRCGS compliance
- Verify immutable audit trail

### [Prompt]
```
You are Agent 10: Compliance & RLS Policies
Your mission: Verify RLS policies and BRCGS compliance

PHASE 10.1: RLS Policy Audit
├─ Task: Test all RLS policies for each role
├─ Task: Verify role hierarchy enforced
└─ Task: Prevent unauthorized data access

PHASE 10.2: BRCGS Compliance
├─ Task: Verify audit trail captures all changes
├─ Task: Confirm immutability (SECURITY DEFINER triggers)
└─ Task: Document compliance verification

DEPENDENCIES: None (run in parallel)
```

---

# PART 2: API LAYER (2 Agents)

## AGENT 15: Input Validation & Sanitization

### [Context]
Form data validated only on client with Zod, never re-validated on server:
```typescript
export async function createNCA(formData: NCAFormData) {
  // formData comes from client - already "validated"
  // But NO server-side re-validation!
  const ncaData = transformFormDataToInsert(formData, userId);
}
```

**Problem:** Client-side validation can be bypassed by attackers.

### [Model Role]
**Agent 15 Responsibility:**
- Server-side re-validation of all form inputs
- SQL injection prevention in ILIKE queries
- Sanitize user-provided data

**Boundaries:**
- Does NOT change validation rules
- Does NOT modify business logic
- Deliverable: Server-side validation in all Server Actions

**Success Criteria:**
- All Server Actions re-validate with Zod schemas
- ILIKE queries sanitized
- Zero successful bypass attempts

### [Prompt]
```
You are Agent 15: Input Validation & Sanitization
Your mission: Server-side re-validation and SQL injection prevention

PHASE 15.1: Server-Side Re-Validation
├─ Sub-Sub-Phase 15.1.1: Import Zod Schemas
│  └─ Task: Add NCAFormDataSchema.safeParse() to all Server Actions
├─ Sub-Sub-Phase 15.1.2: Validate Before Processing
│  └─ Task: Return error if validation fails
└─ Sub-Sub-Phase 15.1.3: Test Bypass Attempts
   └─ Task: Verify malicious data rejected

PHASE 15.2: SQL Injection Prevention
├─ Sub-Sub-Phase 15.2.1: Sanitize ILIKE Queries
│  └─ Task: Escape special characters in supplier_name
└─ Sub-Sub-Phase 15.2.2: Use Parameterized Queries
   └─ Task: Verify Supabase parameterization works

DEPENDENCIES: None (run Day 1)
OUTPUT DELIVERABLE:
- All Server Actions have server-side validation
- ILIKE queries sanitized
- Test results: 100% bypass attempts blocked
```

### [Tools]
```typescript
// Template: Server-Side Re-Validation
import { NCAFormDataSchema } from '@/lib/validations/nca-schema';

export async function createNCA(formData: NCAFormData) {
  // Re-validate on server
  const validation = NCAFormDataSchema.safeParse(formData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid form data: ' + validation.error.message
    };
  }

  const ncaData = transformFormDataToInsert(validation.data, userId);
  // ... rest
}

// Template: Sanitize ILIKE Query
const sanitizedName = ncaData.supplier_name
  .trim()
  .replace(/[%_\\]/g, '\\$&'); // Escape wildcards

const { data: supplier } = await supabase
  .from('suppliers')
  .select('contact_email, supplier_name')
  .ilike('supplier_name', `%${sanitizedName}%`)
  .single();
```

---

# PART 3: CLIENT LAYER (2 Agents)

## AGENT 4: React Component Optimization

### [Context]
Your application has:
- **0 of 66 components use React.memo** (50-70% unnecessary re-renders)
- **2 large tables without virtual scrolling** (500+ DOM nodes for 25 rows)
- **Inline function definitions** (re-initialize on every render)
- **setTimeout memory leaks** (uncleaned timeouts)

### [Model Role]
**Agent 4 Responsibility:**
- Add React.memo to 12+ critical components
- Implement virtual scrolling in tables
- Replace inline functions with useCallback
- Fix setTimeout cleanup in useEffect

**Success Criteria:**
- Table rendering: 500-800ms → <100ms
- Component mount: 150-300ms → <50ms
- Chart re-renders: 400-600ms → <50ms

### [Prompt]
```
You are Agent 4: React Component Optimization
Your mission: Add memoization and virtual scrolling to 12+ components

PHASE 4.1: React.memo Implementation
├─ Task: Identify 12 components by render frequency
├─ Task: Wrap with React.memo
└─ Task: Implement useCallback hooks

PHASE 4.2: Virtual Scrolling
├─ Task: Add TanStack Virtual to nca-table.tsx, mjc-table.tsx
└─ Task: Verify DOM nodes: 500+ → <50 visible

PHASE 4.3: Memory Leak Fixes
├─ Task: Find uncleaned setTimeout/setInterval
└─ Task: Add cleanup functions in useEffect

DEPENDENCIES: None (run in parallel)
```

### [Tools]
```typescript
// Template: React.memo + useCallback
const NCATable = React.memo(function NCATable({ ncas }: NCATableProps) {
  const handleSelect = useCallback((nca: NCA) => {
    console.log('Selected:', nca.id);
  }, []);

  return (
    <table>
      {ncas.map(nca => (
        <NCATableRow key={nca.id} nca={nca} onSelect={handleSelect} />
      ))}
    </table>
  );
});

// Template: Virtual Scrolling
import { useVirtualizer } from '@tanstack/react-virtual';

const NCATableVirtualized = React.memo(function NCATable(props) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: ncas.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  return (
    <div ref={tableContainerRef} style={{ height: '600px', overflow: 'auto' }}>
      {rowVirtualizer.getVirtualItems().map(virtualItem => (
        <NCATableRow key={virtualItem.key} nca={ncas[virtualItem.index]} />
      ))}
    </div>
  );
});
```

---

## AGENT 6: Build & Bundle Optimization

### [Context]
Empty next.config.ts with zero optimizations enabled:
- Missing code splitting (250-300KB upfront)
- Font loading not optimized (20-30KB waste)
- TypeScript target ES2017 (too conservative, 15-20KB waste)

### [Model Role]
**Agent 6 Responsibility:**
- Fill next.config.ts with all optimizations
- Implement code splitting
- Optimize fonts

**Success Criteria:**
- Bundle size: 2.5-3MB → 1.9-2.2MB (20-25% reduction)

### [Prompt]
```
You are Agent 6: Build & Bundle Optimization
Your mission: Fill next.config.ts and reduce bundle by 20-25%

PHASE 6.1: next.config.ts Configuration
├─ Task: Enable compression, minification
├─ Task: Configure image optimization
└─ Task: Enable experimental features

PHASE 6.2: Code Splitting
├─ Task: Dynamic imports for large components
└─ Task: Split vendor bundles

DEPENDENCIES: None (run in parallel)
```

### [Tools]
```typescript
// next.config.ts template
const nextConfig = {
  compress: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['recharts', '@radix-ui/react-icons'],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    };
    return config;
  },
};
```

---

# PART 4: AI LAYER (1 Agent)

## AGENT 5: AI Service Enhancement

### [Context]
Your application has:
- **Prompt token bloat** ($1,369/year waste, 1200-1500 tokens per prompt)
- **No response streaming** (2.5x slower latency)
- **Missing AbortController** (depends on Agent 3)
- **No vector embeddings** (RAG using keyword search only)

### [Model Role]
**Agent 5 Responsibility:**
- Optimize AI prompts (reduce token count by 50%)
- Implement response streaming
- Integrate AbortController from Agent 3
- Implement pgvector semantic search

**Success Criteria:**
- Prompt tokens: 1200-1500 → 600-800
- Cost savings: $1,369/year
- Latency: 2.5x improvement from streaming

### [Prompt]
```
You are Agent 5: AI Service Enhancement
Your mission: Optimize prompts, add streaming, implement AbortController

DEPENDENCIES: Depends on Agent 3 (AbortController complete)

PHASE 5.1: Prompt Optimization
├─ Task: Count tokens in all prompts
├─ Task: Remove redundancy, consolidate examples
└─ Task: Verify quality unchanged

PHASE 5.2: Response Streaming
├─ Task: Use stream: true in Anthropic API calls
└─ Task: Integrate UI to show suggestions as they stream

PHASE 5.3: Vector Search & AbortController
├─ Task: Integrate rateLimiter.AbortController
├─ Task: Implement pgvector search
└─ Task: Parallelize multi-agent calls

OUTPUT DELIVERABLE:
- lib/ai/prompts/*.ts (optimized, 50% token reduction)
- lib/ai/ai-service.ts (streaming + AbortController)
- lib/ai/rag/vector-search.ts (pgvector integration)
```

---

# PART 5: QUALITY LAYER (2 Agents)

## AGENT 7: Testing & Validation Framework

### [Context]
TDD specs required for all 42 performance issues + 12 security issues = 54 test suites.

### [Model Role]
**Agent 7 Responsibility:**
- Write TDD specs for all issues (Red-Green-Refactor)
- Complete test suite with 90%+ coverage

**Success Criteria:**
- 54 test suites created
- All tests pass before Agent 9 deployment
- 90%+ code coverage

### [Prompt]
```
You are Agent 7: Testing & Validation Framework
Your mission: Write TDD specs for all 54 issues

PHASE 7.1: Performance Tests (42 issues)
├─ Task: Database query count tests
├─ Task: Memory leak tests
├─ Task: Component render count tests
└─ Task: Bundle size tests

PHASE 7.2: Security Tests (12 issues)
├─ Task: Auth bypass tests
├─ Task: File upload malware tests
├─ Task: SQL injection tests
└─ Task: Permission escalation tests

DEPENDENCIES: Depends on Agents 1-6 (code to test)
```

---

## AGENT 11: Performance Metrics & Regression Detection

### [Context]
Need to validate improvements and detect regressions.

### [Model Role]
**Agent 11 Responsibility:**
- Collect baselines, validate improvements, detect regressions

### [Prompt]
```
You are Agent 11: Performance Metrics & Regression Detection
Your mission: Collect baselines and validate improvements

PHASE 11.1: Baseline Collection
├─ Task: Measure current performance (before)
└─ Task: Document baseline metrics

PHASE 11.2: Improvement Validation
├─ Task: Re-measure after each agent
└─ Task: Verify improvements meet targets

PHASE 11.3: Regression Detection
├─ Task: Set up automated regression tests
└─ Task: Alert if metrics degrade

DEPENDENCIES: Depends on Agents 2, 4, 5, 6
```

---

# PART 6: SECURITY LAYER (5 Agents)

## AGENT 12: Authentication & Authorization Hardening

### [Context]
**CRITICAL VULNERABILITIES:**
- Hardcoded user IDs bypass authentication (`app/actions/nca-actions.ts:271`)
- Missing auth verification in Server Actions
- File permission checks missing

**Source:** Security Branch Finding #1, #3, #6

### [Model Role]
**Agent 12 Responsibility:**
- Replace hardcoded user IDs with real auth.getUser()
- Add auth verification to all Server Actions
- Implement user permission checks

**Boundaries:**
- Does NOT modify RLS policies (Agent 10 owns those)
- Does NOT change business logic
- Deliverable: Authenticated Server Actions, permission middleware

**Success Criteria:**
- Zero hardcoded user IDs remain
- All Server Actions verify auth
- File operations check user permissions
- Auth bypass attempts: 0% success rate

### [Prompt]
```
You are Agent 12: Authentication & Authorization Hardening
Your mission: Fix 3 critical auth vulnerabilities (CRITICAL - Deploy Blocker)

PHASE 12.1: Remove Hardcoded User IDs
├─ Sub-Sub-Phase 12.1.1: Find All Hardcoded IDs
│  └─ Task: Grep for '10000000-0000-0000-0000-000000000001'
├─ Sub-Sub-Phase 12.1.2: Replace with Real Auth
│  └─ Task: const { data: { user } } = await supabase.auth.getUser()
└─ Sub-Sub-Phase 12.1.3: Test Audit Trail Accuracy
   └─ Task: Verify correct user IDs in audit_trail table

PHASE 12.2: Add Auth Verification to All Server Actions
├─ Sub-Sub-Phase 12.2.1: Audit All Server Actions
│  └─ Task: List 20+ actions in app/actions/
├─ Sub-Sub-Phase 12.2.2: Add Auth Check Middleware
│  └─ Task: if (!user) return { success: false, error: 'Unauthorized' }
└─ Sub-Sub-Phase 12.2.3: Test Auth Bypass Attempts
   └─ Task: Send requests without auth header, verify rejection

PHASE 12.3: File Permission Checks
├─ Sub-Sub-Phase 12.3.1: Verify User Owns NCA
│  └─ Task: Check nca.created_by === user.id before file upload
├─ Sub-Sub-Phase 12.3.2: Role-Based Permission
│  └─ Task: Allow QA supervisors + operations managers override
└─ Sub-Sub-Phase 12.3.3: Test Permission Escalation
   └─ Task: User A tries to upload to User B's NCA, verify rejection

DEPENDENCIES: None (run Day 1, CRITICAL priority)
REQUIRED BY: All other agents (provides auth foundation)

OUTPUT DELIVERABLE:
- app/actions/nca-actions.ts (auth verified)
- app/actions/mjc-actions.ts (auth verified)
- app/actions/file-actions.ts (permission checks)
- lib/middleware/auth-middleware.ts (new)
- Test results: 0% auth bypass success

COMPLIANCE IMPACT:
- ✅ Fixes BRCGS 3.3 (Audit Trail) non-compliance
- ✅ Fixes BRCGS 5.7 (NCA Control) partial compliance
```

### [Tools]
```typescript
// Template 1: Get Real User from Auth
export async function createNCA(formData: NCAFormData) {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const userId = user.id; // ✅ Real user, not hardcoded
  const ncaData = transformFormDataToInsert(formData, userId);
  // ...
}

// Template 2: File Permission Check
export async function uploadNCAFile(ncaId: string, formData: FormData) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify user has permission
  const { data: nca } = await supabase
    .from('ncas')
    .select('id, created_by')
    .eq('id', ncaId)
    .single();

  if (!nca) return { success: false, error: 'NCA not found' };

  // Check if user created it or has management role
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const canUpload = user.id === nca.created_by ||
                   ['qa-supervisor', 'operations-manager'].includes(userProfile.role);

  if (!canUpload) {
    return { success: false, error: 'Access denied' };
  }

  // Proceed with upload
}

// Template 3: Auth Bypass Test
describe('createNCA: Authentication', () => {
  it('should reject unauthenticated requests', async () => {
    const mockClient = {
      auth: {
        getUser: jest.fn(() => ({
          data: { user: null },
          error: new Error('Not authenticated'),
        })),
      },
    };

    const result = await createNCA(mockFormData, mockClient);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });
});
```

---

## AGENT 13: File Security & Malware Scanning

### [Context]
**HIGH VULNERABILITIES:**
- Files uploaded without malware scanning (`app/actions/file-actions.ts:114-120`)
- MIME type spoofing possible (client-supplied `file.type` trusted)
- No magic byte validation
- Public URLs instead of signed URLs

**Source:** Security Branch Finding #4, #8, #11

### [Model Role]
**Agent 13 Responsibility:**
- Implement magic byte validation for all file types
- Integrate VirusTotal or ClamAV malware scanning
- Use signed URLs with expiration (not public URLs)
- Validate MIME types server-side

**Boundaries:**
- Does NOT modify file storage infrastructure (Supabase)
- Does NOT change upload UX
- Deliverable: File validation pipeline, malware scanning integration

**Success Criteria:**
- Malware upload attempts: 100% blocked
- MIME type spoofing: 100% detected
- Signed URLs with expiration implemented
- Zero malware in production storage

### [Prompt]
```
You are Agent 13: File Security & Malware Scanning
Your mission: Implement file validation pipeline and malware scanning (HIGH priority)

PHASE 13.1: Magic Byte Validation
├─ Sub-Sub-Phase 13.1.1: Design Magic Byte Checker
│  └─ Task: Create validateFileMagicBytes(file, expectedType)
├─ Sub-Sub-Phase 13.1.2: Implement Validation for All Types
│  └─ Task: Check PDF (%PDF), JPEG (FFD8), PNG (89504E47), etc.
└─ Sub-Sub-Phase 13.1.3: Test MIME Type Spoofing
   └─ Task: Rename malware.exe to document.pdf, verify rejection

PHASE 13.2: Malware Scanning Integration
├─ Sub-Sub-Phase 13.2.1: Choose Scanning Service
│  └─ Task: VirusTotal API or ClamAV (self-hosted)
├─ Sub-Sub-Phase 13.2.2: Implement scanForViruses(file)
│  └─ Task: Upload to VirusTotal, check malicious count
├─ Sub-Sub-Phase 13.2.3: Quarantine Malware
│  └─ Task: Reject file if malicious=true, log incident
└─ Sub-Sub-Phase 13.2.4: Test Known Malware
   └─ Task: Use EICAR test file, verify detection

PHASE 13.3: Signed URLs & Server-Side MIME Validation
├─ Sub-Sub-Phase 13.3.1: Replace getPublicUrl()
│  └─ Task: Use createSignedUrl(filePath, 3600) with 1h expiration
├─ Sub-Sub-Phase 13.3.2: Validate MIME Types Server-Side
│  └─ Task: Map client MIME to safe types, reject unknown
└─ Sub-Sub-Phase 13.3.3: Test Public URL Access
   └─ Task: Verify expired signed URLs return 403

DEPENDENCIES: None (run Day 1, HIGH priority)

OUTPUT DELIVERABLE:
- lib/services/file-validation.ts (magic bytes, MIME validation)
- lib/services/malware-scanner.ts (VirusTotal integration)
- app/actions/file-actions.ts (refactored with validation)
- .env.local (VIRUSTOTAL_API_KEY added)
- Test results: 100% malware blocked, 100% spoofing detected
```

### [Tools]
```typescript
// Template 1: Magic Byte Validation
async function validateFileMagicBytes(file: File, expectedType: string): Promise<boolean> {
  const buffer = await file.slice(0, 512).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const signatures: Record<string, number[][]> = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'application/vnd.openxmlformats-officedocument': [[0x50, 0x4B, 0x03, 0x04]],
  };

  const validSignatures = signatures[expectedType] || [];

  return validSignatures.some(signature =>
    signature.every((byte, i) => bytes[i] === byte)
  );
}

// Template 2: VirusTotal Integration
async function scanForViruses(file: File): Promise<boolean> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://www.virustotal.com/api/v3/files', {
    method: 'POST',
    headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY! },
    body: formData,
  });

  const result = await response.json();
  const maliciousCount = result.data.attributes.last_analysis_stats.malicious;

  return maliciousCount === 0; // true = clean, false = malware
}

// Template 3: Signed URLs
export async function getNCAFileUrl(ncaId: string, fileName: string) {
  const supabase = createServerClient();

  // ✅ Use signed URL with expiration
  const { data: { signedUrl }, error } = await supabase.storage
    .from('nca-attachments')
    .createSignedUrl(`${ncaId}/${fileName}`, 3600); // Expires in 1 hour

  if (error) return { success: false, error: error.message };

  return { success: true, data: { url: signedUrl } };
}

// Template 4: Complete Upload Validation
export async function uploadNCAFile(ncaId: string, formData: FormData) {
  const file = formData.get('file') as File;

  // 1. Magic byte validation
  const validMagicBytes = await validateFileMagicBytes(file, file.type);
  if (!validMagicBytes) {
    return { success: false, error: 'Invalid file format (magic bytes mismatch)' };
  }

  // 2. Malware scanning
  const isClean = await scanForViruses(file);
  if (!isClean) {
    await logSecurityIncident({
      type: 'malware_upload_attempt',
      ncaId,
      fileName: file.name,
      userId: user.id,
    });
    return { success: false, error: 'File rejected: malware detected' };
  }

  // 3. Proceed with upload
  // ...
}
```

---

## AGENT 14: Audit Trail & Compliance Enhancement

### [Context]
**HIGH VULNERABILITY:**
- IP address hardcoded to `'0.0.0.0'` instead of capturing real client IP
- Violates BRCGS 3.3 (Audit Trail) - must record "who, what, when, where"
- Forensic investigation impossible

**Source:** Security Branch Finding #5

### [Model Role]
**Agent 14 Responsibility:**
- Capture real IP address from request headers
- Enhance audit logs with complete "who, what, when, where"
- Verify BRCGS 3.3 compliance

**Success Criteria:**
- Real IPs captured (not 0.0.0.0)
- IP spoofing prevented (validate headers)
- Audit trail legally valid
- BRCGS 3.3 compliance achieved

### [Prompt]
```
You are Agent 14: Audit Trail & Compliance Enhancement
Your mission: Capture real IP addresses and achieve BRCGS 3.3 compliance

PHASE 14.1: IP Address Capture
├─ Sub-Sub-Phase 14.1.1: Implement getClientIP()
│  └─ Task: Extract IP from x-forwarded-for, x-real-ip, cf-connecting-ip
├─ Sub-Sub-Phase 14.1.2: Update All Server Actions
│  └─ Task: Replace '0.0.0.0' with getClientIP()
└─ Sub-Sub-Phase 14.1.3: Test IP Capture
   └─ Task: Send requests from different IPs, verify correct capture

PHASE 14.2: Audit Trail Completeness
├─ Sub-Sub-Phase 14.2.1: Verify "Who" (user_id)
│  └─ Task: Depends on Agent 12 (real user IDs)
├─ Sub-Sub-Phase 14.2.2: Verify "What" (action, changes)
│  └─ Task: All state changes logged
├─ Sub-Sub-Phase 14.2.3: Verify "When" (timestamp)
│  └─ Task: created_at automatically set
└─ Sub-Sub-Phase 14.2.4: Verify "Where" (IP address)
   └─ Task: Real IP captured from headers

PHASE 14.3: BRCGS 3.3 Compliance Verification
├─ Task: Audit trail captures all 4 elements
├─ Task: Immutability verified (SECURITY DEFINER triggers)
└─ Task: Document compliance in report

DEPENDENCIES: Depends on Agent 12 (real user IDs)

OUTPUT DELIVERABLE:
- lib/utils/ip-capture.ts (getClientIP utility)
- All Server Actions updated with real IP
- BRCGS_3.3_COMPLIANCE_REPORT.md
- Test results: 100% real IPs captured
```

### [Tools]
```typescript
// Template: IP Address Capture
import { headers } from 'next/headers';

function getClientIP(): string {
  const headersList = headers();

  // Priority 1: x-forwarded-for (load balancer)
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Priority 2: x-real-ip (reverse proxy)
  const xRealIp = headersList.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Priority 3: cf-connecting-ip (Cloudflare)
  const cfIp = headersList.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Fallback: localhost
  return '127.0.0.1';
}

// Usage in Server Action
export async function createNCA(formData: NCAFormData) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const clientIP = getClientIP(); // ✅ Real IP

  const signature = transformSignature(formData.signature);
  signature.ip = clientIP; // ✅ Not '0.0.0.0'

  // Log to audit trail
  await supabase.from('audit_trail').insert({
    user_id: user.id,
    action: 'nca_created',
    entity_type: 'nca',
    entity_id: ncaData.id,
    changes: ncaData,
    ip_address: clientIP, // ✅ BRCGS 3.3 compliance
    timestamp: new Date().toISOString(),
  });
}
```

---

## AGENT 16: Rate Limiting Enhancement (Redis)

### [Context]
**CRITICAL VULNERABILITY:**
- In-memory rate limiting ineffective in multi-instance production
- Rate limits lost on server restart
- Users can bypass by rotating servers

**Source:** Security Branch Finding #2

### [Model Role]
**Agent 16 Responsibility:**
- Replace in-memory Map with Redis storage
- Distributed rate limiting across load balancer
- Persist rate limits across restarts

**Dependencies:** Depends on Agent 3 (singleton pattern established)

**Success Criteria:**
- Rate limits enforced across all server instances
- Rate limits persist across restarts
- Multi-instance bypass attempts: 0% success

### [Prompt]
```
You are Agent 16: Rate Limiting Enhancement (Redis)
Your mission: Replace in-memory storage with Redis for distributed rate limiting

DEPENDENCIES: Depends on Agent 3 (singleton pattern)

PHASE 16.1: Redis Setup
├─ Task: Install Redis client (ioredis or redis)
├─ Task: Configure REDIS_URL in .env.local
└─ Task: Test Redis connection

PHASE 16.2: Refactor RateLimiter to Use Redis
├─ Task: Replace Map storage with Redis keys
├─ Task: Use Redis INCR for atomic counting
└─ Task: Set TTL for automatic expiration

PHASE 16.3: Multi-Instance Testing
├─ Task: Deploy to 3 server instances
├─ Task: Send 30 requests across instances
└─ Task: Verify limit enforced globally (10 req/min)

OUTPUT DELIVERABLE:
- lib/ai/rate-limiter-redis.ts (Redis implementation)
- .env.local (REDIS_URL added)
```

### [Tools]
```typescript
// Template: Redis RateLimiter
import { createClient } from 'redis';

class RateLimiterRedis {
  private redis = createClient({ url: process.env.REDIS_URL });

  async checkLimit(userId: string, maxRequests: number = 10): Promise<boolean> {
    const key = `rate-limit:${userId}:minute`;

    // Atomic increment
    const count = await this.redis.incr(key);

    // Set expiration on first request
    if (count === 1) {
      await this.redis.expire(key, 60); // Reset after 60 seconds
    }

    return count <= maxRequests;
  }

  async getRemainingRequests(userId: string, maxRequests: number = 10): Promise<number> {
    const key = `rate-limit:${userId}:minute`;
    const count = await this.redis.get(key);
    return maxRequests - (parseInt(count || '0'));
  }
}

export const rateLimiterRedis = new RateLimiterRedis();
```

---

## AGENT 17: Data Encryption & Privacy

### [Context]
**MEDIUM VULNERABILITY:**
- Signature data (base64-encoded image) stored unencrypted
- No field-level encryption for PII
- GDPR/privacy concern

**Source:** Security Branch Finding #12

### [Model Role]
**Agent 17 Responsibility:**
- Encrypt signature data before storage
- Implement field-level encryption for PII
- Hash signatures for verification

**Success Criteria:**
- Signature data encrypted at rest
- Decryption works correctly
- GDPR compliance achieved

### [Prompt]
```
You are Agent 17: Data Encryption & Privacy
Your mission: Encrypt sensitive fields (signatures, PII)

PHASE 17.1: Signature Encryption
├─ Task: Encrypt signature data before storage
├─ Task: Store encrypted data + hash for verification
└─ Task: Decrypt for display

PHASE 17.2: Field-Level Encryption
├─ Task: Identify PII fields (email, phone, signatures)
└─ Task: Encrypt before INSERT, decrypt after SELECT

OUTPUT DELIVERABLE:
- lib/crypto/encryption.ts (encrypt/decrypt utilities)
- .env.local (ENCRYPTION_KEY added)
```

---

# PART 7: ACCESSIBILITY LAYER (2 Agents)

## AGENT 18: WCAG Compliance & Keyboard Navigation

### [Context]
WCAG 2.1 AA compliance required for accessibility. Current gaps:
- Improper heading hierarchy
- Missing focus indicators
- No keyboard shortcuts

**Source:** Accessibility Branch

### [Model Role]
**Agent 18 Responsibility:**
- Implement WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Focus management

**Success Criteria:**
- WCAG 2.1 AA automated tests pass
- 100% keyboard-only navigation
- No focus traps

### [Prompt]
```
You are Agent 18: WCAG Compliance & Keyboard Navigation
Your mission: Achieve WCAG 2.1 AA compliance

PHASE 18.1: Semantic HTML
├─ Task: Fix heading hierarchy (h1 → h2 → h3, no skips)
├─ Task: Use semantic elements (nav, main, aside, footer)
└─ Task: Add ARIA labels and roles

PHASE 18.2: Keyboard Navigation
├─ Task: Focus indicators on all interactive elements
├─ Task: Skip links for main content
└─ Task: Keyboard shortcuts documented

PHASE 18.3: Automated Testing
├─ Task: Install axe-core or pa11y
└─ Task: Run automated WCAG tests

DEPENDENCIES: None (run Week 2)
```

---

## AGENT 19: Screen Reader & Semantic HTML

### [Context]
Screen reader optimization required for visually impaired users.

### [Model Role]
**Agent 19 Responsibility:**
- Screen reader compatibility
- ARIA attributes
- Alt text for all images

**Dependencies:** Depends on Agent 18 (semantic structure)

**Success Criteria:**
- Screen reader tests pass (NVDA, JAWS)
- ARIA validation complete
- Color contrast ≥4.5:1

### [Prompt]
```
You are Agent 19: Screen Reader & Semantic HTML
Your mission: Optimize for screen readers

PHASE 19.1: ARIA Attributes
├─ Task: ARIA labels for all form inputs
├─ Task: ARIA live regions for dynamic content
└─ Task: ARIA roles for custom widgets

PHASE 19.2: Alt Text & Descriptions
├─ Task: Alt text for all images
└─ Task: Descriptions for complex graphics

DEPENDENCIES: Depends on Agent 18
```

---

# PART 8: STRATEGIC LAYER (3 Agents)

## AGENT 20: Competitive Feature Implementation

### [Context]
67 innovative features identified from competitor analysis:
- Batch operations (10 competitors have it)
- Advanced search/filters (critical gap)
- Custom dashboards (user-configurable)
- Real-time notifications (email/SMS)
- PDF export (compliance requirement)

**Source:** Competitor Analysis Branch

### [Model Role]
**Agent 20 Responsibility:**
- Feature roadmap prioritization
- Implementation plan for top 10 features

### [Prompt]
```
You are Agent 20: Competitive Feature Implementation
Your mission: Implement top 10 competitive features

PHASE 20.1: Feature Prioritization
├─ Task: Rank 67 features by impact + effort
└─ Task: Select top 10 for implementation

PHASE 20.2: Implementation Planning
├─ Task: Design specs for each feature
└─ Task: Create implementation timeline

DEPENDENCIES: None (strategic planning)
```

---

## AGENT 21: Mobile App Development

### [Context]
90% of competitors have mobile apps. Critical for operators on production floor.

**Source:** Competitor Analysis (Critical Gap #1)

### [Model Role]
**Agent 21 Responsibility:**
- React Native mobile app (iOS/Android)
- Offline support
- API alignment

**Dependencies:** Depends on Agent 2 (API refactoring)

### [Prompt]
```
You are Agent 21: Mobile App Development
Your mission: Build React Native mobile app MVP

PHASE 21.1: Mobile Architecture
├─ Task: Set up React Native project
├─ Task: Implement offline storage (SQLite)
└─ Task: API integration

PHASE 21.2: Core Features
├─ Task: NCA creation on mobile
├─ Task: Camera integration for photos
└─ Task: Push notifications

DEPENDENCIES: Depends on Agent 2 (API stable)
```

---

## AGENT 22: ERP Integration & API Ecosystem

### [Context]
85% of enterprises require ERP integration (SAP, Oracle, MS Dynamics).

**Source:** Competitor Analysis (Critical Gap #2)

### [Model Role]
**Agent 22 Responsibility:**
- REST API for external integrations
- Webhooks for real-time data sync
- ERP connectors (SAP, Oracle)

**Dependencies:** Depends on Agent 2 (API layer stable)

### [Prompt]
```
You are Agent 22: ERP Integration & API Ecosystem
Your mission: Build ERP connectors and REST API

PHASE 22.1: REST API Design
├─ Task: Design public REST API (versioned)
├─ Task: Implement authentication (API keys, OAuth)
└─ Task: Rate limiting and documentation

PHASE 22.2: ERP Connectors
├─ Task: SAP connector (RFC or REST)
├─ Task: Oracle connector (SOAP or REST)
└─ Task: MS Dynamics connector (REST)

DEPENDENCIES: Depends on Agent 2
```

---

# PART 9: EXECUTION FRAMEWORK

## Parallel Execution Schedule

### Week 1: Critical Fixes (Day 1 Parallel Launch)

```bash
# 9 agents launch simultaneously on Day 1
npm run agents:execute-parallel \
  --agents=1,3,4,6,8,10,12,13,14 \
  --phase="RED" # Write failing tests first

# Day 2-3: Sequential execution (depends on Day 1)
npm run agents:execute-sequential \
  --agents=2,5,15 \
  --after=1,3 # Wait for Agent 1 and 3
```

### Week 2: High Priority

```bash
npm run agents:execute-parallel \
  --agents=16,17,18,19 \
  --phase="GREEN" # Implement fixes
```

### Week 3-4: Strategic Features

```bash
npm run agents:execute-sequential \
  --agents=20,21,22 \
  --phase="REFACTOR"
```

---

## TDD Template (Red-Green-Refactor)

Every agent follows this cycle:

```typescript
// RED: Write failing test first
describe('Agent 1: Database Optimization', () => {
  it('should reduce query count from 5 to 1', async () => {
    const queryCount = await measureQueryCount(() => getNCAData(ncaId));
    expect(queryCount).toBe(1); // FAILS (currently 5)
  });
});

// GREEN: Implement fix to pass test
async function getNCAData(ncaId: string) {
  // Consolidate 5 queries into 1
  return await supabase
    .from('ncas')
    .select('*, users(*), work_orders(*)')
    .eq('id', ncaId)
    .single();
}

// REFACTOR: Clean up code
async function getNCAData(ncaId: string) {
  return await supabase
    .from('ncas')
    .select(`
      id, nca_number, status,
      users!ncas_raised_by_user_id (id, name),
      work_orders!ncas_wo_id (id, wo_number)
    `)
    .eq('id', ncaId)
    .single();
}
```

---

## Self-Repairing Agent Logic

```typescript
async function executeAgent(agentId: number, phase: string) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await runAgentPhase(agentId, phase);
      const testResult = await runAgentTests(agentId);

      if (!testResult.success) {
        throw new Error(`Agent ${agentId} tests failed`);
      }

      return { status: 'completed', result };
    } catch (error) {
      attempts++;
      await rollbackAgentChanges(agentId);
      console.warn(`Agent ${agentId} retry ${attempts}/3`);
      await sleep(Math.pow(2, attempts) * 1000);
    }
  }

  return {
    status: 'failed',
    escalate: true,
    message: `Agent ${agentId} failed after 3 attempts`,
  };
}
```

---

## Developer Interface (CLI)

```bash
# Execute entire constellation
npm run agents:execute-all

# Execute specific layer
npm run agents:execute --layer=security

# Execute specific agent
npm run agents:execute --agent=12

# View agent status
npm run agents:status

# View dependency graph
npm run agents:dependencies

# Rollback specific agent
npm run agents:rollback --agent=12
```

---

# PART 10: SUCCESS CRITERIA & COMPLIANCE

## Success Metrics by Week

### Week 1 (Critical Fixes)
- [ ] Memory growth: 3.6GB/day → <100MB/day
- [ ] Dashboard load: 2-5s → <500ms
- [ ] Auth bypass attempts: 0% success
- [ ] All hardcoded user IDs replaced
- [ ] Real IPs captured in audit logs

### Week 2 (High Priority)
- [ ] Malware upload attempts: 100% blocked
- [ ] Redis rate limiting: Multi-instance enforcement
- [ ] WCAG 2.1 AA automated tests pass
- [ ] Bundle size: 20-25% reduction

### Week 3-4 (Strategic Features)
- [ ] Feature roadmap complete
- [ ] Mobile app MVP functional
- [ ] ERP connectors tested

## BRCGS Compliance Verification

- [ ] **3.3 (Audit Trail):** Real user IDs + real IPs captured
- [ ] **5.7 (NCA Control):** Authentication verified, approvals traceable
- [ ] **3.6 (Document Control):** RLS enforced, immutable audit trail

---

**END OF CODEX**

**Token Count:** ~24,500 / 25,000 limit

This document provides complete specifications for all 22 agents with Context/Role/Prompt/Tools structure, dependency graphs, TDD compliance, and execution framework. Ready for deployment.
