# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OHiSee NCA/MJC Management System** - A BRCGS Food Safety compliant digital platform for Kangopak (Pty) Ltd to manage Non-Conformance Advice (NCA) and Maintenance Job Cards (MJC). Built with Next.js 16, TypeScript, Supabase PostgreSQL, and Claude AI integration.

**Compliance Context:** Every feature must align with BRCGS Issue 7 procedures. The system enforces Kangopak's Product Safety & Quality Management System (PS&QMS) through database constraints, RLS policies, and AI-powered quality gates.

## Development Commands

### Core Workflow

```bash
# Development server (port 3008)
npm run dev

# Build for production
npm run build

# Linting
npm run lint
```

### Testing Strategy

```bash
# Unit tests (Jest)
npm run test                    # Run all unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report (95%+ required)

# Integration tests
npm run test:integration
npm run test:integration:watch

# Database tests (pgTAP)
npm run test:db
npm run test:db:watch

# E2E tests (Stagehand on Playwright)
npm run test:e2e               # All E2E tests
npm run test:e2e:headed        # With browser visible
npm run test:e2e:nca-interactions  # Specific test file
```

### Utility Scripts

```bash
# Upload BRCGS procedures to knowledge base
npm run upload-procedures
npm run upload-kangopak

# Generate TypeScript types from Supabase schema
supabase gen types typescript --local > lib/types/supabase.ts
```

## Architecture Principles

### 1. Zero Static Calls (CRITICAL)

**Never** import and call Supabase client directly. Always use dependency injection:

```typescript
// ✅ CORRECT - Dependency injection
export async function getNCA(client: SupabaseClient, id: string) {
  return await client.from('ncas').select('*').eq('id', id).single();
}

// ❌ WRONG - Static call (breaks testing and flexibility)
import { supabase } from '@/lib/supabase';
export async function getNCA(id: string) {
  return await supabase.from('ncas').select('*').eq('id', id).single();
}
```

**Why:** Enables testing with mocks, supports multiple client contexts (service role vs user auth), and maintains architectural boundaries.

### 2. Server Actions Pattern

All API operations use Next.js Server Actions (located in `app/actions/`):

- Return `ActionResponse<T>` type for consistency
- Use `createServerClient()` for RLS enforcement
- Log all operations to `audit_trail` table (BRCGS Section 3.3)
- Handle errors gracefully - never block users on AI failures

### 3. Database as Source of Truth

- Supabase PostgreSQL enforces all business rules via CHECK constraints, triggers, and RLS policies
- Never trust client-side validation alone
- All tables have `id` (uuid), `created_at`, `updated_at` (via trigger)
- RLS enabled on all tables - policies enforce role-based access

### 4. AI Integration Architecture

Located in `lib/ai/`:

- **Multi-agent system** orchestrates specialized agents (anomaly detection, content completion, context alignment)
- **RAG service** retrieves BRCGS procedures from `knowledge_base_documents` table
- **Quality scoring** runs inline (<2s) and deep validation (<30s) modes
- **Graceful degradation** - AI failures never block form submission
- **Rate limiting** - 10 req/min per user enforced by `RateLimiter`

### 5. BRCGS Compliance Enforcement

**Section 3.6 Document Control:**

- Only ONE `current` version per document number (unique constraint)
- Version history preserved with `superseded`/`obsolete` status
- All procedures linked to forms via `document_number`, `revision`

**Section 5.7 Control of Non-Conforming Product:**

- NCA workflow enforces 20-day closure deadline
- Machine Down status triggers alerts
- Cross-contamination requires back-tracking verification
- Disposition (reject/rework/concession/discard) creates linked actions

**Maintenance (MJC) Critical Rules:**

- Hygiene checklist must have ALL 10 items verified before clearance
- Only QA supervisors can grant hygiene clearance (RLS enforced)
- Temporary repairs auto-set 14-day close-out deadline
- Machine Down + Critical urgency triggers immediate alerts

## Key Directory Structure

```
app/
├── actions/              # Server Actions (API layer)
│   ├── ai-actions.ts     # AI quality gates and suggestions
│   ├── nca-actions.ts    # NCA CRUD operations
│   ├── mjc-actions.ts    # MJC CRUD operations
│   └── knowledge-base-actions.ts  # Admin BRCGS procedure management
├── nca/                  # NCA form pages
├── mjc/                  # MJC form pages
├── dashboard/            # Production and Management dashboards
└── end-of-day/           # Daily shift reporting

components/
├── fields/               # Reusable form components
│   └── rewrite-assistant.tsx  # AI-powered suggestion UI
├── dashboard/            # Chart components (Recharts)
└── __tests__/            # Component unit tests

lib/
├── ai/                   # AI service layer
│   ├── ai-service.ts     # Main AI orchestration
│   ├── multi-agent/      # Specialized agent system
│   ├── rag/              # Knowledge base RAG service
│   └── prompts/          # Structured AI prompts
├── services/             # Business logic services
├── types/                # TypeScript type definitions
├── validations/          # Zod schemas (nca-schema.ts, mjc-schema.ts)
└── database/             # Database client factory

supabase/
├── migrations/           # Database schema migrations (timestamped)
├── functions/            # Edge Functions (if needed)
└── tests/                # pgTAP database tests

docs/
└── kangopak-procedures/  # BRCGS controlled documents (reference only)
```

## Database Schema Overview

### Core Tables

- **`users`** - 6 roles: operator → team-leader → maintenance-technician → qa-supervisor → maintenance-manager → operations-manager
- **`machines`** - Equipment tracking with status (operational/down/under-maintenance)
- **`work_orders`** - Production runs linking to NCAs/MJCs
- **`ncas`** - Non-Conformance Advice (11 sections per BRCGS 5.7)
- **`mjcs`** - Maintenance Job Cards (11 sections + 10-item hygiene checklist)
- **`audit_trail`** - Immutable audit log (INSERT-only, BRCGS Section 3.3)

### AI Enhancement Tables

- **`knowledge_base_documents`** - BRCGS procedures with versioning
- **`ai_assistance_log`** - Full audit of AI interactions
- **`ai_corrective_actions`** - Suggestions and user feedback
- **`nca_quality_scores`** - Quality metrics (0-100 scores)

### Critical Constraints

- NCA description ≥100 characters
- MJC description ≥50 characters
- Machine Down requires timestamp
- Cross-contamination requires back-tracking verification
- Hygiene clearance blocked until all 10 items verified
- Close-out requires signature before status = 'closed'

## Running Migrations

```bash
# Apply all pending migrations
supabase db push

# Create new migration
supabase migration new <descriptive_name>

# Verify migrations applied
supabase migration list --local

# Test migration rollback BEFORE production
# (Create manual down migration - Supabase doesn't auto-rollback)
```

**Migration naming:** `YYYYMMDDHHMMSS_descriptive_name.sql`

**Critical:** Test every migration with seed data before production deployment.

## Testing Philosophy

### Unit Tests (Jest + Testing Library)

- **Components:** 80%+ coverage, test user interactions
- **Server Actions:** Mock Supabase client, verify error handling
- **AI Services:** Mock Anthropic API responses, test timeouts and rate limits
- **Validation:** Test edge cases, constraint violations

### Integration Tests

- Test full workflows: form submission → database → AI processing → response
- Use real Supabase connection (local instance)
- Verify RLS policies enforce role-based access

### Database Tests (pgTAP)

Located in `supabase/tests/`:

- Test triggers fire correctly (updated_at, audit_trail)
- Test CHECK constraints enforce business rules
- Test RLS policies for all roles
- Test functions (generate_nca_number, validate_hygiene_checklist)

### E2E Tests (Stagehand)

Located in `tests/e2e/`:

- Uses AI-powered element discovery (when data-testid unavailable)
- Tests full user workflows in real browser
- Hybrid strategy: data-testid selectors + AI fallback

## AI Integration Guidelines

### When AI Service Calls

**Inline Quality Analysis** (every 5 seconds during typing):

```typescript
const result = await analyzeNCAQualityInline(partialNCA);
// Returns: { score: 0-100, suggestions: string[] }
// Performance: <2 seconds
```

**Pre-Submit Validation** (blocks if quality_score <75):

```typescript
const result = await validateNCABeforeSubmit(ncaId, completeNCA);
// Returns: { valid, errors, warnings, quality_assessment, ready_for_submission }
// Performance: <30 seconds
// Exception: Confidential reports bypass gate (BRCGS 1.1.3)
```

**Corrective Action Generation** (user-initiated):

```typescript
const result = await generateNCACorrectiveAction(ncaId, ncaData);
// Returns structured sections + procedure references + recommendations
// Performance: <10 seconds
// Uses RAG to cite BRCGS procedures
```

### AI Error Handling

All AI failures must degrade gracefully:

```typescript
if (result.success) {
  // Use AI suggestion
} else {
  // Show friendly message, allow manual entry
  // NEVER block user workflow
}
```

**Rate limit handling:** Show user-friendly message, retry after delay.

## Common Development Patterns

### Creating a New Server Action

```typescript
'use server';

import { createServerClient } from '@/lib/database/client';
import type { ActionResponse } from './types';

export async function myAction(params: MyParams): Promise<ActionResponse<MyResult>> {
  try {
    const supabase = createServerClient();

    // Get current user (for audit trail)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Perform operation
    const { data, error } = await supabase
      .from('table_name')
      .insert(params)
      .select()
      .single();

    if (error) {
      console.error('Error description:', error);
      return { success: false, error: 'User-friendly message' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'Unable to complete action' };
  }
}
```

### Adding a New AI Prompt

Prompts located in `lib/ai/prompts/`:

- Use structured output format (JSON)
- Include role context (operator/technician/manager)
- Reference BRCGS section numbers
- Provide examples for consistency

### Creating a New Form Section

1. Define Zod schema in `lib/validations/`
2. Create React Hook Form component in `components/`
3. Add Server Action in `app/actions/`
4. Test with unit + integration tests
5. Add E2E test for full workflow

## BRCGS Procedure Integration

Controlled documents located in `docs/kangopak-procedures/` (reference only - don't modify).

When implementing features:

1. Identify relevant procedure (e.g., 5.7 Control of Non-Conforming Product)
2. Extract requirements and compliance checkpoints
3. Enforce via database constraints + validation logic
4. Document BRCGS reference in code comments
5. Add audit logging for compliance trail

**Traceability:** Every form references `document_number` + `revision` (e.g., "5.7 Rev 9").

## Performance Requirements

### API Response Times

- Form load: <500ms
- Inline AI quality check: <2s
- Deep validation: <30s
- Dashboard queries: <1s

### Database Optimization

- Use indexes for common queries (status, wo_id, machine_id)
- Paginate large datasets (NCAs, MJCs)
- Use partial indexes for filtered queries
- Monitor query plans with EXPLAIN ANALYZE

### Client-Side Performance

- Debounce inline AI calls (5s)
- Lazy load dashboard charts
- Use React.memo for expensive components
- Optimize image loading (compress, resize)

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ All queries use authenticated Supabase client
- ✅ Server Actions validate user permissions
- ✅ Audit trail logs every change (immutable)
- ✅ Secrets in `.env.local` (never commit)
- ✅ Input sanitization (XSS prevention)
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Rate limiting on AI endpoints

## Common Gotchas

### RLS Policy Debugging

If queries return empty results unexpectedly:

1. Check `auth.uid()` returns valid user
2. Verify user's role matches policy conditions
3. Test with different role UUIDs from seed data
4. Use `RAISE NOTICE` in RLS policy for debugging

### Migration Order Matters

Always follow dependency order:

1. Core tables (users, machines)
2. Dependent tables (work_orders, ncas, mjcs)
3. Audit trail and triggers
4. RLS policies
5. Seed data (last)

### AI Service Timeouts

If AI calls hang:

- Check Anthropic API key validity
- Verify rate limits not exceeded
- Inspect network connectivity
- Fall back to manual entry (never block user)

### Hygiene Clearance Issues

If clearance blocked:

- Verify ALL 10 hygiene checklist items have `verified: true`
- Check `validate_hygiene_checklist()` function logic
- Ensure QA supervisor role (RLS policy enforces)

## Deployment Notes

### Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (Anthropic Claude)
ANTHROPIC_API_KEY=

# Email (Resend)
RESEND_API_KEY=
```

### Pre-Production Checklist

- [ ] All migrations applied and tested
- [ ] RLS policies verified for all roles
- [ ] Audit trail logging confirmed
- [ ] AI rate limiting configured
- [ ] Email notifications tested
- [ ] Dashboard queries optimized
- [ ] E2E tests passing
- [ ] BRCGS compliance verified

### Production Monitoring

- Database query performance (identify slow queries)
- AI service uptime and response times
- User error rates (failed form submissions)
- Audit trail completeness (no gaps)

## Support and References

- **BRCGS Procedures:** `docs/kangopak-procedures/`
- **API Documentation:** `app/actions/README.md`
- **Database Schema:** `supabase/README.md`
- **Migration History:** `supabase/migrations/`
- **Test Coverage:** `npm run test:coverage`

**System Owner:** Production Manager (Kangopak)
**Compliance Officer:** QA Supervisor
**BRCGS Certification:** Issue 7 - Section 5
