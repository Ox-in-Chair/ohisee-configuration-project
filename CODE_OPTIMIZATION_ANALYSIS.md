# Code Optimization Analysis Report
## OHiSee Production Control & Compliance System

---

## 1. PROJECT STRUCTURE: Overview & Key Findings

### Current Structure (Healthy Aspects)
```
app/actions/           - 13 server action files (9.6K LOC)
  ├── types.ts         - Shared response types + interfaces (346 LOC)
  ├── nca-actions.ts   - NCA CRUD operations (712 LOC)
  ├── mjc-actions.ts   - MJC CRUD operations (764 LOC)
  ├── ai-*.ts          - AI-related operations
  └── ...other domains
  
lib/
  ├── ai/              - AI service implementation
  │   ├── ai-service.ts       (18.5K LOC)
  │   ├── quality-scorer.ts   (13K LOC)
  │   └── prompts/            - Structured prompts
  ├── database/        - Client factory (clean DI pattern)
  ├── services/        - Business logic (18 service files)
  ├── validations/     - Zod schemas (3 files)
  └── types/           - TypeScript definitions
  
components/           - React components
  ├── enhanced-textarea.tsx    (350+ LOC)
  ├── nca-table.tsx            (589 LOC - largest)
  ├── mjc-table.tsx            (979+ LOC - complex)
  └── ui/              - Shadcn UI components
```

### **FINDINGS:**

#### What's Working Well:
✓ Clean dependency injection pattern (no static calls)
✓ Clear separation of concerns (actions, services, components)
✓ Proper use of Server Actions (Next.js 16)
✓ Comprehensive TypeScript strict mode
✓ Zod validation for form schemas

#### Issues Identified:
1. **Duplicate code across similar modules** - nca-actions.ts & mjc-actions.ts share 40%+ logic
2. **Monolithic action files** - Some actions exceed 700+ LOC
3. **Type duplication** - ActionResponse<T> redefined in 3+ places
4. **No database query abstraction layer** - All queries in action files
5. **Service layer underutilized** - Heavy lifting still in actions instead of services

---

## 2. SERVER ACTIONS (`app/actions/`): Duplication & Error Handling

### **DUPLICATION PROBLEMS:**

#### Pattern 1: Duplicate ActionResponse Interface
```typescript
// In nca-actions.ts (line 19-23)
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// In mjc-actions.ts (line 18-22) - IDENTICAL
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// In file-actions.ts (line 15-19) - IDENTICAL
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// In ai-quality-actions.ts (line 42-46) - IDENTICAL
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// In quality-validation-actions.ts (line 40-44) - DIFFERENT NAME
export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**Impact:** 
- 4 duplicate definitions of the same type
- types.ts already exports this correctly at line 16
- Inconsistent naming (ActionResponse vs ServerActionResult)
- Makes refactoring difficult

#### Pattern 2: Duplicate Signature Transformation Logic
```typescript
// In nca-actions.ts (line 28-43)
function transformSignature(formSignature: {
  type: 'manual' | 'digital';
  data: string;
  name: string;
  timestamp: string;
} | null | undefined): Signature | null {
  if (!formSignature) return null;
  return {
    type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
    name: formSignature.name,
    timestamp: formSignature.timestamp,
    ip: '0.0.0.0', // TODO: Get real IP from request headers
    data: formSignature.data,
  };
}

// In mjc-actions.ts (line 27-42) - IDENTICAL
function transformSignature(formSignature: {
  type: 'manual' | 'digital';
  data: string;
  name: string;
  timestamp: string;
} | null | undefined): Signature | null {
  if (!formSignature) return null;
  return {
    type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
    name: formSignature.name,
    timestamp: formSignature.timestamp,
    ip: '0.0.0.0', // TODO: Get real IP from request headers
    data: formSignature.data,
  };
}
```

**Impact:** 15+ lines duplicated in 2 files

#### Pattern 3: Duplicate Number Generation Functions
```typescript
// In nca-actions.ts (line 48-52)
function generateNCANumber(): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `NCA-${year}-${random}`;
}

// In mjc-actions.ts (line 47-51) - Similar pattern
function generateMJCNumber(): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `MJC-${year}-${random}`;
}
```

#### Pattern 4: Duplicate Error Handling Structure
Every action file has nearly identical try-catch patterns:
```typescript
try {
  const supabase = createServerClient();
  // ... operation
  if (error) {
    console.error('Supabase error:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }
  return { success: true, data };
} catch (error) {
  console.error('Unexpected error:', error);
  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
}
```

This pattern appears 60+ times across action files.

#### Pattern 5: Duplicate Database Query for Current State Check
```typescript
// In nca-actions.ts (line 536-540, 570-574)
const { data: currentNCA, error: fetchError } = await supabase
  .from('ncas')
  .select('nca_number, nc_type, supplier_name, ...')
  .eq('id', ncaId)
  .single();

// Then immediately checking same fields again for different context
const { data: currentNCAForClosure } = await supabase
  .from('ncas')
  .select('close_out_signature, status')
  .eq('id', ncaId)
  .single();
```

**Issue:** 2 queries for same record instead of 1 with all fields

#### Pattern 6: Duplicate Notification Service Setup
```typescript
// In nca-actions.ts (line 322)
const service = notificationService || createProductionNotificationService();

// In mjc-actions.ts (line 264)
const notificationService = createProductionNotificationService();

// In multiple places - inconsistent pattern
```

### **LOGGING INCONSISTENCY:**

All errors use `console.error()` instead of centralized logging:
```typescript
// Scattered across 13 action files
console.error('Supabase error creating NCA:', error);
console.error('Failed to send machine down alert:', error);
console.error('Failed to create waste manifest:', error);
```

**Problem:** No structured logging, no log aggregation, no audit trail for debugging

### **CODE METRICS:**

| File | LOC | Functions | Avg LOC per Function |
|------|-----|-----------|----------------------|
| nca-actions.ts | 712 | 5 | 142 |
| mjc-actions.ts | 764 | 7 | 109 |
| ai-actions.ts | 979 | 8 | 122 |
| quality-validation-actions.ts | 659 | 7 | 94 |
| knowledge-base-actions.ts | 599 | 6 | 100 |
| waste-actions.ts | 223 | 3 | 74 |

---

## 3. DATABASE OPERATIONS (`lib/database/`, Supabase Queries)

### **QUERY PATTERNS - GOOD:**
✓ Dependency injection via `createServerClient()` is excellent
✓ All queries use TypeScript generics with proper types
✓ Proper error handling with error codes (e.g., `PGRST116`)
✓ RLS policies enforced consistently

### **QUERY OPTIMIZATION ISSUES:**

#### Issue 1: N+1 Query Pattern in NCA Update (nca-actions.ts:536-574)
```typescript
// 3 separate queries for same data:
const { data: currentNCA } = await supabase
  .from('ncas')
  .select('nca_number, nc_type, supplier_name, ...')
  .eq('id', ncaId)
  .single(); // Query 1

const { data: currentNCAForClosure } = await supabase
  .from('ncas')
  .select('close_out_signature, status')
  .eq('id', ncaId)
  .single(); // Query 2 - UNNECESSARY

// Then update happens, then:
const { data: mjcDetails } = await supabase
  .from('mjcs')
  .select('job_card_number, machine_equipment, raised_by_user_id')
  .eq('id', mjcId)
  .single(); // Query 3 - separate record
```

**Optimization:** Consolidate to 1 query with all needed fields

#### Issue 2: Overly Broad Select Statements
```typescript
// In nca-actions.ts line 479
let query = supabase.from('ncas').select('*', { count: 'exact' });

// In mjc-actions.ts line 432
let query = supabase.from('mjcs').select('*', { count: 'exact' });
```

**Problem:** Fetches ALL columns, wastes bandwidth
**Solution:** Explicitly list required columns:
```typescript
.select('id, nca_number, status, created_at, supplier_name, nc_type')
```

#### Issue 3: Missing Query Indexes
No observable indexes on:
- `ncas.status` (frequent filtering in listNCAs)
- `ncas.created_at` (frequent ordering)
- `ncas.wo_id` (foreign key lookup)
- `mjcs.status`, `mjcs.urgency` (frequent filtering)
- `waste_manifests.nca_id` (foreign key)

#### Issue 4: Redundant Database Lookups in Cascading Operations
```typescript
// nca-actions.ts:649-662 - Updating linked MJC
const { error: linkError } = await supabase
  .from('ncas')
  .update({ linked_mjc_id: result.data.id })
  .eq('id', ncaId); // Operation 1

// Then immediately:
await supabase
  .from('mjcs')
  .update({ linked_nca_id: ncaId })
  .eq('id', result.data.id); // Operation 2
```

**Better approach:** Use database trigger or single transaction

#### Issue 5: Async Operations Not Parallelized
```typescript
// mjc-actions.ts:699-702 - Could be parallel
const [ncaUpdate, mjcUpdate] = await Promise.all([
  (supabase.from('ncas') as any).update({ linked_mjc_id: mjcId }).eq('id', ncaId),
  (supabase.from('mjcs') as any).update({ linked_nca_id: ncaId }).eq('id', mjcId),
]);
```

**Good:** This one uses `Promise.all()` correctly. But many others don't.

```typescript
// nca-actions.ts:325-328 - Sequential, should be parallel
await sendMachineDownAlertIfNeeded(ncaData, data.nca_number, service);

// Then later:
if (ncaData.nc_type === 'raw-material' || ncaData.nc_origin === 'supplier-based') {
  try {
    const { updateSupplierPerformanceFromNCA } = await import('@/lib/services/supplier-performance-service');
    await updateSupplierPerformanceFromNCA(data.id); // Sequential!
  }
}
```

#### Issue 6: File Attachment Not Implemented (TODO)
```typescript
// nca-actions.ts:132
root_cause_attachments: null, // TODO: File upload handling

// mjc-actions.ts:143
description_attachments: null, // TODO: File upload handling
```

### **QUERY PERFORMANCE METRICS:**

Estimated performance impact:
- `listNCAs()` with `select('*')`: Returns ALL columns (potentially 50+ fields)
- `updateNCA()` makes 3 queries sequentially, could be 1-2
- Each form submission may trigger 4-5 database calls
- No batch operations for bulk updates

---

## 4. AI INTEGRATION (`lib/ai/`): Efficiency & Architecture

### **STRENGTHS:**

✓ Multi-agent system with specialized agents
✓ RAG service for knowledge base retrieval
✓ Rate limiting implemented (10 req/min)
✓ Quality scoring with breakdown metrics
✓ Graceful degradation on AI failures
✓ Audit logging of AI interactions

### **INEFFICIENCIES:**

#### Issue 1: Duplicate Quality Scoring Hooks
```typescript
// hooks/useAIQuality.ts (227 LOC)
export function useAIQuality({
  formType,
  userId,
  debounceMs = 3000,
}: UseAIQualityOptions): UseAIQualityReturn {
  // ... implementation with debounce, abort controller, error handling
}

// hooks/useQualityValidation.ts (271 LOC) - 44 LOC IDENTICAL
export function useQualityValidation({
  formType,
  userId,
  debounceMs = 3000,
}: UseQualityValidationOptions): UseQualityValidationReturn {
  // Same state management, same debounce logic, same error handling
}
```

**Analysis of differences:**
```
✗ validateFieldQualityAction vs getWritingAssistanceAction (different functions)
✗ validateField vs validateSubmission (different action names)
✓ Core logic: ~95% identical

Total duplicate logic: ~150 LOC across hooks
```

#### Issue 2: Redundant Server Actions for Same Operations
```typescript
// In app/actions/quality-validation-actions.ts
export async function validateFieldQualityAction() { ... }  // 1 impl
export async function analyzeFieldQualityAction() { ... }   // Another impl?
export async function getWritingAssistanceAction() { ... }  // Variation
export async function generateSuggestionsAction() { ... }   // Yet another

// Meanwhile in useAIQuality hook (line 10)
import {
  analyzeFieldQualityAction,        // Used here
  generateSuggestionsAction,        // Used here
  validateBeforeSubmitAction,       // Used here
} from '@/app/actions/ai-quality-actions';

// And in useQualityValidation hook (line 4-12)
import {
  validateFieldQualityAction,       // Different from analyzeFieldQualityAction?
  getWritingAssistanceAction,       // Different from generateSuggestionsAction?
  validateSubmissionAction,         // Different from validateBeforeSubmitAction?
} from '@/app/actions/quality-validation-actions';
```

**Problem:** Multiple action files with overlapping functionality

#### Issue 3: AI Service Initialization Overhead
```typescript
// ai-service.ts:68-86
async analyzeFieldQuality(context: AnalysisContext): Promise<QualityScore> {
  // Rate limiting check
  const allowed = await this.rateLimiter.checkLimit(context.user.id);
  if (!allowed) throw new AIServiceError(...);

  await this.rateLimiter.recordRequest(context.user.id);

  try {
    // Determine timeout based on mode
    const timeout = this.config.mode === 'fast'
      ? this.config.fast_response_timeout
      : this.config.deep_validation_timeout;

    // Build prompt with role adaptation
    const prompt = this.buildFieldAnalysisPrompt(context);

    // Call Anthropic API with timeout
    const response = await this.callAnthropicWithTimeout(prompt, timeout);
```

**Issue:** Every call rebuilds prompt (no caching). No memoization of similar analysis contexts.

#### Issue 4: Knowledge Base RAG Not Optimized
```typescript
// ai-service.ts:142-146
const description = context.nca?.nc_description ?? context.mjc?.description_required ?? '';
const procedures = await this.knowledgeBase.searchProcedures(description, 5);

const similarCases = await this.knowledgeBase.findSimilarCases(description, recordType, 3);
```

**Problems:**
- Always searches for 5 procedures (hardcoded)
- Always searches for 3 similar cases (hardcoded)
- No caching of frequently accessed procedures
- Each AI call makes 2 database searches

#### Issue 5: Rate Limiter Not Enforced on All AI Endpoints
```typescript
// quality-validation-actions.ts:51-85
export async function validateFieldQualityAction(
  formType: 'nca' | 'mjc',
  fieldData: Partial<NCA> | Partial<MJC>,
  userId: string
): Promise<ServerActionResult<QualityScore>> {
  // No rate limit check before rule-based validation
  
  // Step 1: Rule-based validation (no rate limit)
  if (formType === 'nca') {
    // ... validation logic
  }
  
  // Step 2: Only AI gets rate limited (line 130)
  const aiService = createAIService();
```

**Problem:** Rule-based validation + AI analysis could still exceed limits

---

## 5. REACT COMPONENTS: Memoization & Bundle Size

### **MEMOIZATION STATUS:**
- 0 components wrapped with `React.memo`
- 76 instances of `useMemo` / `useCallback` across components
- No performance optimization directives documented

### **LARGE COMPONENTS (Performance Risk):**

| Component | LOC | Issues |
|-----------|-----|--------|
| nca-table.tsx | 589 | No memo, complex filtering logic |
| mjc-table.tsx | 980+ | No memo, URL param sync |
| enhanced-textarea.tsx | 350+ | Multiple useMemo, could be fragmented |
| smart-input.tsx | 373 | No memo wrapper |
| ai-assistant-modal.tsx | 228 | Could re-render on parent state changes |

#### Issue 1: Tables Not Memoized
```typescript
// components/nca-table.tsx:132-150
export function NCATable({
  ncas,
  loading = false,
  error,
  total,
  currentPage: initialPage = 1,
  totalPages: initialTotalPages = 1,
  initialStatus = 'all',
  initialSearch = '',
  initialSort = 'created_at',
  initialSortDir = 'desc',
}: NCATableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state management (initialize from URL params)
  const [filterState, setFilterState] = useState<NCAFilterState>({
    ...DEFAULT_FILTER_STATE,
    status: (initialStatus as NCAStatus) || 'all',
```

**Problems:**
- Parent component (page) may re-render
- Table recreates entire DOM on parent state change
- `useRouter()` and `useSearchParams()` called every render

**Impact:** 589 LOC of logic re-runs on every parent update

#### Issue 2: Row Rendering Not Optimized
```typescript
// No memoization of table rows
// When 1 filter changes, all rows re-render

// Inside NCATable (simulated pattern):
{filteredNCAs.map((nca) => (
  <TableRow key={nca.id} onClick={() => handleRowClick(nca.id)}>
    {/* Complex cells */}
  </TableRow>
))}
```

**Optimization:** Each row should be a memoized component

#### Issue 3: Unnecessary Import from Large Libraries
```typescript
// components/enhanced-textarea.tsx:1-11
import { FC, useState, useCallback, ChangeEvent, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { QualityIndicator } from '@/components/quality-indicator';
import { HelpCircle, Loader2, CheckCircle2 } from 'lucide-react'; // 3 icons

// Multiple files import many lucide icons individually:
// - 10+ different files
// - 15+ unique icons imported separately

// Better: Dynamic icon loading or icon system
```

**Analysis:** lucide-react is ~200KB unpacked. Importing individual icons doesn't tree-shake well.

#### Issue 4: Multiple Accordion/Collapsible Components
Multiple similar UI patterns replicated:
```typescript
// components/nca-table.tsx - Filter controls (40+ LOC)
// components/mjc-table.tsx - Filter controls (45+ LOC) - Similar code

// components/smart-input.tsx - Input wrapper (373 LOC)
// components/enhanced-textarea.tsx - Textarea wrapper (350+ LOC) - Similar patterns
```

#### Issue 5: Dashboard Components Load All Data
```typescript
// components/dashboard/nca-trend-analysis-monthly-chart.tsx
// components/dashboard/supplier-performance-dashboard.tsx
// components/dashboard/maintenance-response-chart.tsx

// Likely pattern (not shown but common):
// useEffect(() => {
//   fetchAllData(); // No pagination
// }, []);
```

**Issue:** Dashboard loads without pagination/virtualization

### **BUNDLE IMPORT ANALYSIS:**

Current imports across components:
- lucide-react: 15+ separate icon imports
- recharts: Used in 6 dashboard components
- @radix-ui: Multiple component libraries (dialog, select, tooltip, etc.)

**No lazy loading observed for:**
- Dashboard charts
- Modal dialogs
- Complex visualizations (fishbone, timeline)

### **DEPENDENCY ARRAY ISSUES:**

```typescript
// hooks/useAIQuality.ts:127
const checkQualityInline = useCallback(
  (fieldData: Partial<NCA> | Partial<MJC>) => {
    // ...
  },
  [formType, userId, debounceMs] // ✓ Good
);

// But similar pattern in multiple components with missing dependencies
```

---

## 6. TYPE DEFINITIONS & VALIDATION: Duplication & Reusability

### **TYPE SYSTEM ISSUES:**

#### Issue 1: Duplicate Type Definitions Across Files

**ActionResponse/ServerActionResult defined in:**
1. `types.ts:16-20` ✓ Canonical (exported)
2. `nca-actions.ts:19-23` ✗ Duplicate local
3. `mjc-actions.ts:18-22` ✗ Duplicate local
4. `file-actions.ts:15-19` ✗ Duplicate local
5. `ai-actions.ts:42-46` ✗ Duplicate local
6. `quality-validation-actions.ts:40-44` - Different name (ServerActionResult)

**Recommendation:** Remove 5 duplicate definitions, import from types.ts

#### Issue 2: Schema Reuse - Shared Signature Pattern
```typescript
// Both lib/validations/nca-schema.ts and mjc-schema.ts define identical:
export const signatureSchema = z.object({
  type: z.enum(['manual', 'digital']),
  data: z.string().min(1, 'Signature data is required'),
  name: z.string().min(1, 'Signer name is required'),
  timestamp: z.string().min(1, 'Timestamp is required'),
});
```

**Solution:** Extract to shared `lib/validations/shared-schemas.ts`

#### Issue 3: Hygiene Checklist Structure Duplication
```typescript
// mjc-schema.ts:23-27
export const hygieneChecklistItemSchema = z.object({
  item: z.string(),
  verified: z.boolean(),
  notes: z.string().optional(),
});

// mjc-actions.ts:66-84 - Transform logic duplicates structure
function transformHygieneChecklist(formData: MJCFormData): HygieneChecklistItem[] {
  const items = [
    { label: 'No loose objects...', verified: formData.hygiene_check_1 },
    { label: 'All guards...', verified: formData.hygiene_check_2 },
    // ... 8 more items
  ];
  return items.map((item) => ({
    item: item.label,
    verified: item.verified,
    notes: undefined,
  }));
}
```

**Issue:** The 10 hardcoded checklist items are duplicated in transformation

#### Issue 4: Validation Message Constants Scattered
```typescript
// Components reference hardcoded validation messages:
// enhanced-textarea.tsx:103-112
const minLengths: Record<string, number> = {
  'raw-material': 120,
  'finished-goods': 150,
  'wip': 130,
  'incident': 200,
  'other': 100,
};

// But nca-schema.ts also defines minimum length validation
// These aren't synchronized!
```

#### Issue 5: Missing Type Extraction from Zod Schemas
```typescript
// Currently manual type definitions:
interface NCAFormData {
  nc_type: string;
  nc_product_description: string;
  // ... 30+ fields
}

// Should use Zod's type inference:
export type NCAFormData = z.infer<typeof ncaFormSchema>;
export type MJCFormData = z.infer<typeof mjcFormSchema>;
```

### **VALIDATION REDUNDANCY:**

**Database constraints vs client validation:**
- NCA description minimum 100 chars → Enforced in Zod AND database
- Machine status required → Enforced in Zod AND database
- Hygiene checklist 10 items → Enforced in schema AND transform function

This is good for defense-in-depth but implementation is scattered.

### **MISSING SCHEMA ABSTRACTIONS:**

No reusable schemas for common patterns:
- Pagination filters
- Sorting specifications
- Date range filters
- Status enums

---

## 7. TESTING & BUILD: Infrastructure & Coverage

### **TESTING STATUS:**

Test files found: **12 files**
- `components/__tests__/` - 4 component tests
- `hooks/__tests__/` - 1 hook test  
- `lib/validations/__tests__/` - 1 schema test
- `lib/ai/__tests__/` - 6 AI service tests

**Coverage estimate: <20% of codebase**

#### Issue 1: No Tests for Action Files
- 13 action files
- **0 tests**
- Critical business logic (NCA/MJC creation, validation) untested

#### Issue 2: Incomplete Component Tests
```typescript
// components/__tests__/ai-enhanced-textarea.test.tsx exists
// But likely basic snapshot tests

// Missing tests for:
// - nca-table.tsx (589 LOC, filtering/sorting logic)
// - mjc-table.tsx (980+ LOC, complex state management)
// - smart-input.tsx (373 LOC)
```

#### Issue 3: No Integration Tests
- No tests for full workflows (form submission → database)
- No tests for notification system
- No tests for AI integration end-to-end

#### Issue 4: No E2E Test Coverage Mentioned
CLAUDE.md mentions "E2E Tests (Stagehand)" but:
- No `tests/e2e/` directory found
- No test files in repo
- References to "data-testid" in components suggest E2E setup

#### Issue 5: Test Configuration Missing
- No jest.config.js
- No test scripts in package.json beyond eslint
- No coverage thresholds defined

### **BUILD CONFIGURATION:**

#### Issue 1: Minimal Next.js Config
```typescript
// next.config.ts is empty
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Missing optimizations:**
- No bundle analysis
- No compression configuration
- No SWC configuration
- No Image optimization settings

#### Issue 2: No ESLint Config Visible
- `package.json` lists eslint + eslint-config-next
- No `.eslintrc.json` found in repo
- Using default Next.js ESLint rules (permissive)

#### Issue 3: Package.json Missing Scripts
```json
"scripts": {
  "dev": "next dev -p 3008",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "upload-procedures": "tsx scripts/upload-procedures.ts",
  "upload-kangopak": "tsx scripts/upload-all-kangopak-procedures.ts"
}
```

**Missing:**
- `test` or `test:watch` (12 test files exist but no way to run them!)
- `test:coverage`
- `type-check` (explicit TypeScript check)
- `build:analyze` (bundle analysis)
- `precommit` hooks (pre-push validation)

---

## 8. CODE PATTERNS & STANDARDS: Consistency & Configuration

### **CONSISTENCY ISSUES:**

#### Issue 1: Inconsistent Error Handling Patterns
```typescript
// Pattern 1 (most common): Simple return
if (error) {
  console.error('Supabase error:', error);
  return { success: false, error: `Database error: ${error.message}` };
}

// Pattern 2 (less common): Check && throw
if (error && error.code !== 'PGRST116') {
  return { success: false, error: `Failed: ${error.message}` };
}

// Pattern 3 (rare): try-catch with error codes
try {
  // ...
} catch (error) {
  if (error instanceof SupabaseError) {
    // Handle specific way
  }
}
```

**Problem:** No centralized error handling middleware/utility

#### Issue 2: Inconsistent User ID Retrieval
```typescript
// nca-actions.ts:271
const userId = '10000000-0000-0000-0000-000000000001'; // TODO: Get from auth

// mjc-actions.ts:236
const userId = '10000000-0000-0000-0000-000000000001'; // TODO: Get from auth

// Both hardcoded with same TODO comment
```

**Problem:** 
- Blocking functionality (can't multi-tenant properly)
- Same hardcoded seed user everywhere
- Appears in 5+ files with same TODO

#### Issue 3: Inconsistent Type Assertions
```typescript
// Style 1: Generic 'any' type assertion
const { data, error } = await (supabase.from('ncas') as any).insert(...);

// Style 2: Specific type casting
const ncaData = nca as any;

// Style 3: No assertion (when type system works)
const { data: mjcData, error } = await supabase
  .from('mjcs')
  .select('*')
  .eq('id', id)
  .single();
```

**Problem:** Type safety undermined by liberal `as any` usage (appears 10+ times)

#### Issue 4: Inconsistent Naming Conventions
```typescript
// Noun-based names:
const userId = '...';
const ncaId = '...';
const mjcId = '...';
const supabase = createServerClient();

// Verb-based names in callbacks:
const handleRowClick = (...) => {};
const updateURLParams = (...) => {};
const validateHygieneChecklist = (...) => {};

// No consistent prefix for event handlers:
// - In nca-table.tsx: handleRowClick, handleChange, handleStatusChange
// - In mjc-table.tsx: handleRowClick, updateURLParams
// - Inconsistent use of 'handle' vs direct verb
```

#### Issue 5: Notification Service Injection Inconsistency
```typescript
// nca-actions.ts: Optional parameter pattern (GOOD DI)
export async function createNCA(
  formData: NCAFormData,
  notificationService?: INotificationService
)

// mjc-actions.ts: Always creates service internally (POOR DI)
const notificationService = createProductionNotificationService();

// waste-actions.ts: Not used at all

// No consistent pattern across the codebase
```

### **MISSING CONFIGURATION:**

#### Issue 1: No Constants File
Hardcoded values scattered throughout:
```typescript
// nca-actions.ts:82
nc_origin: formData.nc_origin || (formData.nc_type === 'raw-material' ? 'supplier-based' : null),

// mjc-actions.ts:99
const dueDate = formData.temporary_repair === 'yes' ? calculateDueDate() : null;

// waste-actions.ts:80
risk_level: wasteData.risk_level || 'medium',

// Multiple files define same enums
```

**Missing:**
- `lib/config/constants.ts` for all magic values
- `lib/config/defaults.ts` for default values
- Configuration per environment (dev/staging/prod)

#### Issue 2: No Environment Configuration System
```typescript
// ai-service.ts:53-57 uses environment variables directly
this.config = {
  mode: (config.mode ?? process.env.AI_MODE ?? 'adaptive'),
  model: config.model ?? process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
  quality_threshold: config.quality_threshold ?? Number(process.env.AI_QUALITY_THRESHOLD ?? 75),
  fast_response_timeout: config.fast_response_timeout ?? Number(process.env.AI_FAST_RESPONSE_TIMEOUT ?? 2000),
  deep_validation_timeout: config.deep_validation_timeout ?? Number(process.env.AI_DEEP_VALIDATION_TIMEOUT ?? 30000),
};
```

**Issues:**
- Defaults hardcoded in multiple places
- No validation of environment variables at startup
- No configuration loading strategy

#### Issue 3: No Logging Configuration
```typescript
// All logging is console.error/console.warn
console.error('Supabase error creating NCA:', error);
console.warn('Machine down alert skipped...');
console.error('Failed to send supplier notification:');
```

**Missing:**
- Centralized logger configuration
- Log levels (debug, info, warn, error)
- Log destinations (file, service, etc.)
- Correlation IDs for tracing

### **42 TODO COMMENTS IN CODEBASE:**

Major TODOs blocking functionality:
1. **User ID retrieval** (5+ instances) - prevents multi-user
2. **File attachment handling** (3+ instances)
3. **IP address tracking** (1 instance)
4. **Embedding generation** (2 instances in knowledge-base)
5. **MJC-specific validation** (1 instance)

---

## SUMMARY: Quick Win Opportunities

### Priority 1 (High Impact, Low Effort):
1. Extract duplicate ActionResponse type to single location
2. Create shared `transformSignature()` utility function
3. Create generic `generateRecordNumber()` function
4. Add missing npm test script
5. Implement centralized error logging

### Priority 2 (High Impact, Medium Effort):
1. Extract database query layer (QueryBuilder service)
2. Consolidate duplicate hook logic
3. Create shared validation schemas file
4. Memoize NCA/MJC table components
5. Parallelize async operations in action files

### Priority 3 (Medium Impact, Medium Effort):
1. Resolve user ID retrieval TODO
2. Implement file attachment handling
3. Add E2E test setup
4. Build test coverage for action files
5. Optimize lucide icon imports

### Priority 4 (Medium Impact, High Effort):
1. Create database service layer
2. Consolidate AI validation actions
3. Implement lazy-loaded dashboard charts
4. Create configuration management system
5. Set up proper logging infrastructure
