# Server Actions API Documentation

## Overview

This directory contains Next.js 14 Server Actions that provide the API layer between the UI and backend services (AI Service, Database, Knowledge Base).

**Architecture Pattern:**
- **Zero static calls** - All dependencies injected via factory functions
- **Consistent responses** - `ActionResponse<T>` type for all actions
- **Graceful degradation** - Never block users on AI failures
- **BRCGS compliance** - Full audit logging per Section 3.3
- **RLS enforcement** - Uses `createServerClient()` for security

## Files

### Core Actions

- **`ai-actions.ts`** - AI quality gate and suggestion generation
- **`knowledge-base-actions.ts`** - Admin functions for BRCGS procedure management
- **`nca-actions.ts`** - NCA CRUD operations (existing)
- **`types.ts`** - Shared TypeScript type definitions

## AI Actions API

### NCA Quality Analysis

#### `analyzeNCAQualityInline(ncaData: Partial<NCA>)`

**Purpose:** Real-time quality feedback during form editing

**Performance:** <2 seconds (enforced by AI service timeout)

**Use Case:** Called every 5 seconds while user types in NCA form

**Returns:**
```typescript
ActionResponse<{
  score: number;        // 0-100
  suggestions: string[] // Actionable improvement tips
}>
```

**Example:**
```typescript
const result = await analyzeNCAQualityInline({
  nc_description: 'Machine breakdown on Line 3',
  nc_type: 'equipment',
  machine_status: 'down'
});

if (result.success) {
  console.log(`Quality score: ${result.data.score}`);
  console.log(`Suggestions: ${result.data.suggestions.join(', ')}`);
}
```

**Error Handling:**
- Rate limit exceeded → User-friendly message, doesn't block typing
- AI service down → Graceful degradation, user can continue

---

#### `validateNCABeforeSubmit(ncaId: string, ncaData: NCA)`

**Purpose:** Comprehensive quality gate before submission

**Performance:** <30 seconds (deep validation mode)

**Blocking Behavior:**
- Blocks submission if `quality_score < 75`
- Exception: Confidential reports bypass gate (BRCGS 1.1.3)

**Returns:**
```typescript
ActionResponse<ValidationResult>

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  quality_assessment: QualityScore;
  ready_for_submission: boolean;
}
```

**Example:**
```typescript
const result = await validateNCABeforeSubmit(ncaId, completeNCA);

if (result.success && result.data.ready_for_submission) {
  // Allow submission
  await submitNCA(ncaId);
} else {
  // Show errors/warnings to user
  displayValidationErrors(result.data.errors);
}
```

**Database Side Effects:**
- Saves quality score to `nca_quality_scores` table
- Logs validation to `ai_assistance_log` for audit

---

#### `generateNCACorrectiveAction(ncaId: string, ncaData: NCA)`

**Purpose:** AI-generated corrective action suggestion

**RAG Context:**
- Retrieves relevant BRCGS procedures
- Finds similar historical NCAs
- Adapts language to user role

**Returns:**
```typescript
ActionResponse<Suggestion>

interface Suggestion {
  text: string;                    // Full suggestion
  sections: {                      // Structured sections
    immediate_correction?: string;
    root_cause?: string;
    corrective_action?: string;
    verification: string;
  };
  quality_score: number;           // 0-100
  confidence: 'high' | 'medium' | 'low';
  confidence_percentage: number;   // 0-100
  procedure_references: string[];  // e.g., ['5.7', '3.9']
  keywords_detected: {
    category: string;
    keywords: string[];
  };
  recommendations: {
    create_mjc?: boolean;
    calibration_check?: boolean;
    training_required?: boolean;
    hara_review?: boolean;
  };
}
```

**Example:**
```typescript
const result = await generateNCACorrectiveAction(ncaId, ncaData);

if (result.success) {
  // Pre-fill form with suggestion
  setFormValue('corrective_action', result.data.sections.corrective_action);

  // Show procedure references
  displayProcedures(result.data.procedure_references);

  // Show recommendations
  if (result.data.recommendations.create_mjc) {
    promptCreateMJC();
  }
}
```

**Database Side Effects:**
- Records suggestion to `ai_corrective_actions` table
- Logs to `ai_assistance_log` for audit trail

---

### MJC Quality Analysis

#### `analyzeMJCQualityInline(mjcData: Partial<MJC>)`

Same as NCA inline analysis, but for Maintenance Job Cards.

**Performance:** <2 seconds

---

#### `validateMJCBeforeSubmit(mjcId: string, mjcData: MJC)`

Same as NCA validation, with MJC-specific checks:
- Safety verification for `urgency: 'critical'`
- Hygiene clearance completion
- Contamination prevention measures

**Performance:** <30 seconds

---

#### `generateMJCMaintenanceAction(mjcId: string, mjcData: MJC)`

AI-generated maintenance action suggestion.

**Sections:**
- `maintenance_scope` - What needs to be done
- `safety_considerations` - Safety precautions
- `contamination_prevention` - Food safety measures
- `hygiene_clearance` - 10-point checklist
- `verification` - How to verify completion

---

### Feedback & Learning

#### `recordAISuggestionFeedback(suggestionId: string, accepted: boolean, edited_text?: string, rating?: number)`

**Purpose:** Track user decisions for AI learning and audit trail

**Parameters:**
- `suggestionId` - ID from `ai_assistance_log` table
- `accepted` - Did user accept the suggestion?
- `edited_text` - If user modified suggestion, the final text
- `rating` - Optional 1-5 star rating

**Example:**
```typescript
// User accepts suggestion as-is
await recordAISuggestionFeedback(suggestionId, true);

// User edits suggestion before accepting
await recordAISuggestionFeedback(
  suggestionId,
  true,
  'User-edited corrective action text',
  4
);

// User rejects suggestion
await recordAISuggestionFeedback(suggestionId, false);
```

**Database Side Effects:**
- Updates `ai_assistance_log.suggestion_accepted`
- Updates `ai_assistance_log.final_user_value`
- Updates `ai_assistance_log.suggestion_quality_rating`

---

### Dashboard & Metrics

#### `getUserQualityMetrics(userId: string, period: '30d' | '90d' | '180d')`

**Purpose:** Personal quality dashboard for users

**Returns:**
```typescript
ActionResponse<UserQualityMetrics>

interface UserQualityMetrics {
  user_id: string;
  period: string;
  total_submissions: number;
  avg_quality_score: number;       // 0-100
  ai_acceptance_rate: number;      // 0-100%
  revision_count: number;
  top_improvement_areas: ImprovementArea[];
  trend: 'improving' | 'stable' | 'declining';
}
```

**Use Case:** Display on user dashboard to show progress

---

#### `getManagerQualityDashboard(filters: DashboardFilters)`

**Purpose:** Team performance overview for managers

**Returns:**
```typescript
ActionResponse<ManagerDashboard>

interface ManagerDashboard {
  team_stats: TeamStats;
  user_performance: UserPerformance[];
  ai_effectiveness: AIEffectiveness;
  quality_trends: QualityTrend[];
}
```

**Filters:**
```typescript
interface DashboardFilters {
  start_date?: string;
  end_date?: string;
  department?: string;
  record_type?: 'nca' | 'mjc';
}
```

---

## Knowledge Base Actions API

### Upload & Version Management

#### `uploadProcedure(fileContent: string, metadata: ProcedureMetadata)`

**Purpose:** Upload new BRCGS procedure to knowledge base

**Admin Only:** Enforced by RLS policies

**CRITICAL:** Automatically supersedes previous version to ensure only ONE current version per document number (BRCGS Section 3.6)

**Parameters:**
```typescript
interface ProcedureMetadata {
  document_number: string;      // e.g., '5.7'
  document_name: string;         // e.g., 'Control of Non-Conforming Product'
  document_type: DocumentType;   // 'procedure' | 'form_template' | etc
  revision: number;              // Must be > current revision
  brcgs_section?: string;        // e.g., '5.7'
  effective_date: string;        // YYYY-MM-DD
  review_due_date?: string;      // YYYY-MM-DD
  summary?: string;
  key_requirements?: Record<string, unknown>;
  integration_points?: string[]; // Related procedures ['3.9', '3.11']
  form_sections?: string[];      // Relevant form sections
}
```

**Example:**
```typescript
const procedureContent = `
# BRCGS Procedure 5.7: Control of Non-Conforming Product
...full text...
`;

const result = await uploadProcedure(procedureContent, {
  document_number: '5.7',
  document_name: 'Control of Non-Conforming Product',
  document_type: 'procedure',
  revision: 9,
  brcgs_section: '5.7',
  effective_date: '2025-09-02',
  review_due_date: '2026-09-02',
  summary: 'Ensures out-of-specification product is clearly identified...',
  integration_points: ['3.9', '3.11'],
  form_sections: ['Section 4', 'Section 8', 'Section 10']
});

if (result.success) {
  console.log(`Uploaded: ${result.data.document_id}`);
}
```

**Validation:**
- Content must be ≥100 characters
- Revision must be > current revision
- Automatically marks existing version as `superseded`

**Database Side Effects:**
- Updates existing `current` version to `superseded`
- Inserts new version with `status = 'current'`
- Extracts keywords for search
- TODO: Generate embeddings for semantic search

---

#### `updateProcedureMetadata(documentId: string, updates: ProcedureMetadataUpdate)`

**Purpose:** Update metadata without changing document content or revision

**Allowed Fields:**
- `summary`
- `key_requirements`
- `integration_points`
- `form_sections`
- `review_due_date`

**Example:**
```typescript
await updateProcedureMetadata(docId, {
  review_due_date: '2027-01-01',
  summary: 'Updated summary text'
});
```

---

#### `obsoleteProcedure(documentId: string)`

**Purpose:** Mark procedure as obsolete (withdrawn)

**IMPORTANT:** Does NOT delete - maintains audit trail per BRCGS Section 3.3

**Example:**
```typescript
await obsoleteProcedure(oldDocId);
```

---

### Search & Retrieval (RAG)

#### `searchKnowledgeBase(query: string, limit?: number)`

**Purpose:** Semantic search for relevant procedures

**Use Case:** AI service calls this to retrieve context for suggestions

**Returns:**
```typescript
ActionResponse<KnowledgeBaseResult[]>

interface KnowledgeBaseResult {
  procedure_number: string;
  procedure_title: string;
  content: string;             // Excerpt (first 500 chars)
  relevance_score: number;     // 0-1
  revision: number;
  effective_date: string;
}
```

**Example:**
```typescript
const result = await searchKnowledgeBase('cross-contamination back tracking', 5);

if (result.success) {
  result.data.forEach(proc => {
    console.log(`${proc.procedure_number}: ${proc.procedure_title}`);
    console.log(`Relevance: ${proc.relevance_score}`);
  });
}
```

**TODO:**
- Currently uses full-text search
- Production should use vector embeddings for semantic search:
  ```sql
  SELECT *, 1 - (embedding_vector <=> query_embedding) as similarity
  FROM knowledge_base_documents
  WHERE status = 'current'
  ORDER BY similarity DESC
  LIMIT $1
  ```

---

#### `getProcedureByNumber(documentNumber: string)`

**Purpose:** Get specific procedure by document number

**Returns:** Current version only

**Example:**
```typescript
const result = await getProcedureByNumber('5.7');

if (result.success) {
  console.log(result.data.full_text);
  console.log(`Revision: ${result.data.revision}`);
  console.log(`Referenced ${result.data.reference_count} times by AI`);
}
```

---

### Admin List & Management

#### `listProcedures(filters?: ProcedureFilters)`

**Purpose:** List procedures for admin management UI

**Filters:**
```typescript
interface ProcedureFilters {
  status?: 'current' | 'superseded' | 'draft' | 'obsolete';
  document_type?: DocumentType;
  brcgs_section?: string;
  search?: string;          // Searches document_number and document_name
  limit?: number;           // Default 50
  offset?: number;          // For pagination
}
```

**Example:**
```typescript
// Get all current procedures
const result = await listProcedures({
  status: 'current',
  limit: 50,
  offset: 0
});

if (result.success) {
  console.log(`Total: ${result.data.total}`);
  result.data.procedures.forEach(proc => {
    console.log(`${proc.document_number} Rev ${proc.revision}: ${proc.document_name}`);
  });
}
```

---

#### `getProcedureHistory(documentNumber: string)`

**Purpose:** Get all versions of a procedure (current, superseded, obsolete)

**Use Case:** Audit trail and version comparison

**Example:**
```typescript
const result = await getProcedureHistory('5.7');

if (result.success) {
  result.data.forEach(version => {
    console.log(`Rev ${version.revision}: ${version.status} (${version.effective_date})`);
  });
}
```

---

## Error Handling Pattern

All Server Actions follow this consistent error handling pattern:

```typescript
try {
  // Get user and dependencies
  const user = await getCurrentUser();
  const aiService = createAIService();
  const supabase = createServerClient();

  // Perform action
  const result = await aiService.someMethod();

  // Save to database if needed
  await supabase.from('table').insert(data);

  return { success: true, data: result };
} catch (error) {
  console.error('Error description:', error);

  // Handle specific error types
  if (isRateLimitError(error)) {
    return {
      success: false,
      error: 'AI assistant is temporarily busy. Please try again in a moment.'
    };
  }

  if (isLowConfidenceError(error)) {
    return {
      success: false,
      error: 'Unable to generate high-confidence suggestion. Please enter manually.'
    };
  }

  // Generic fallback
  return {
    success: false,
    error: 'Unable to complete action. You can still proceed manually.'
  };
}
```

**Key Principles:**
1. **Never throw** - Always return `ActionResponse`
2. **Graceful degradation** - User can always proceed manually
3. **User-friendly messages** - No technical jargon
4. **Log errors** - `console.error` for debugging

---

## Performance Requirements

| Action | SLA | Mode |
|--------|-----|------|
| `analyzeNCAQualityInline` | <2 seconds | Fast |
| `analyzeMJCQualityInline` | <2 seconds | Fast |
| `validateNCABeforeSubmit` | <30 seconds | Deep |
| `validateMJCBeforeSubmit` | <30 seconds | Deep |
| `generateNCACorrectiveAction` | <10 seconds | Adaptive |
| `generateMJCMaintenanceAction` | <10 seconds | Adaptive |

**Rate Limiting:**
- 10 requests/minute per user
- 100 requests/hour per user
- Enforced by `RateLimiter` service

---

## BRCGS Compliance

### Section 3.3: Audit Trail

All AI interactions logged to `ai_assistance_log`:
- User who requested suggestion
- Prompt sent to AI
- Response received
- Procedures cited (with versions)
- User decision (accept/reject/modify)
- Quality rating

**Query for audit:**
```sql
SELECT
  user_name,
  user_role,
  query_type,
  procedures_cited,
  suggestion_accepted,
  timestamp
FROM ai_assistance_log
WHERE timestamp >= '2025-01-01'
ORDER BY timestamp DESC;
```

### Section 3.6: Document Control

Knowledge base ensures:
- Only ONE `current` version per document number (enforced by unique constraint)
- Previous versions marked `superseded` (not deleted)
- Version history preserved for audit
- Effective dates tracked

**Audit Query:**
```sql
-- Verify no duplicate current versions
SELECT document_number, COUNT(*)
FROM knowledge_base_documents
WHERE status = 'current'
GROUP BY document_number
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### Section 1.1.3: Confidential Reports

Confidential reports bypass quality gate:
```typescript
if (nca.is_confidential_report === true) {
  return {
    ...validationResult,
    ready_for_submission: true, // Override
    warnings: [
      'Confidential report - quality gate bypassed per BRCGS Section 1.1.3',
      ...existingWarnings
    ]
  };
}
```

---

## Testing

Unit tests located in `__tests__/actions/`:

- **`ai-actions.test.ts`** - 95% coverage
- **`knowledge-base-actions.test.ts`** - 95% coverage

**Run tests:**
```bash
npm run test:actions
```

**Test strategy:**
- Mock AI service responses
- Mock database calls
- Verify error handling
- Validate performance requirements
- Test BRCGS compliance logic

---

## Integration Example

**UI Component using AI actions:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { analyzeNCAQualityInline, generateNCACorrectiveAction } from '@/app/actions/ai-actions';

export function NCAForm() {
  const [ncaData, setNCAData] = useState<Partial<NCA>>({});
  const [qualityScore, setQualityScore] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Inline quality check (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await analyzeNCAQualityInline(ncaData);
      if (result.success) {
        setQualityScore(result.data.score);
        setSuggestions(result.data.suggestions);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [ncaData]);

  // AI suggestion generation
  const handleGenerateSuggestion = async () => {
    const result = await generateNCACorrectiveAction(ncaId, ncaData as NCA);

    if (result.success) {
      setFormValue('corrective_action', result.data.sections.corrective_action);
      setFormValue('root_cause', result.data.sections.root_cause);

      // Show procedure references
      showProcedures(result.data.procedure_references);
    } else {
      showError(result.error);
    }
  };

  return (
    <form>
      <QualityIndicator score={qualityScore} />
      <SuggestionsList suggestions={suggestions} />

      <textarea
        value={ncaData.nc_description}
        onChange={(e) => setNCAData({ ...ncaData, nc_description: e.target.value })}
      />

      <button onClick={handleGenerateSuggestion}>
        Generate AI Suggestion
      </button>
    </form>
  );
}
```

---

## Security Notes

1. **RLS Enforcement:** All database queries use `createServerClient()` which enforces Row Level Security
2. **Admin Actions:** Knowledge base uploads restricted to QA/Management roles via RLS
3. **User Context:** Actions retrieve `auth.uid()` for audit logging (TODO: Implement real auth)
4. **Input Validation:** All user inputs validated before AI processing
5. **Rate Limiting:** Prevents abuse of AI service (10 req/min per user)

---

## Future Enhancements

- [ ] Vector embeddings for semantic search (replace full-text)
- [ ] Real-time collaboration (multiple users editing same NCA)
- [ ] Offline support (IndexedDB caching)
- [ ] Push notifications for quality gate failures
- [ ] ML-based quality prediction (predict score before submission)
- [ ] Advanced analytics (quality trends by department/shift/product)
- [ ] Multi-language support (adapt AI responses to user locale)
- [ ] Integration with existing BRCGS document management system
