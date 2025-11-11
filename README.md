# OHiSee NCA/MJC Management System

A BRCGS Food Safety compliant digital platform for managing Non-Conformance Advice (NCA) and Maintenance Job Cards (MJC) at Kangopak (Pty) Ltd.

## Overview

The OHiSee system digitizes and enforces Kangopak's Product Safety & Quality Management System (PS&QMS) according to BRCGS Issue 7 standards. Built with Next.js 16, TypeScript, Supabase PostgreSQL, and Claude AI integration, it provides real-time quality gates, automated compliance checks, and intelligent corrective action suggestions.

### Key Features

- **NCA Management** - 11-section digital forms with AI-powered quality scoring and BRCGS 5.7 compliance enforcement
- **MJC Management** - Maintenance job cards with 10-item hygiene checklist and clearance workflow
- **AI Quality Gates** - Inline quality analysis (<2s), pre-submit validation (<30s), and corrective action generation
- **RAG-Powered Assistance** - Context-aware suggestions citing BRCGS procedures from knowledge base
- **Role-Based Access Control** - 6 roles enforced via Supabase RLS policies
- **Audit Trail** - Immutable logging of all changes (BRCGS Section 3.3)
- **Real-Time Dashboards** - Production and management dashboards with trend analysis
- **Voice Input** - Speech-to-text for faster data entry
- **Automated Reminders** - Email notifications for approaching deadlines

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions, Supabase PostgreSQL
- **AI:** Anthropic Claude 3.5 Sonnet (multi-agent system with RAG)
- **Testing:** Jest, React Testing Library, Playwright, pgTAP
- **E2E:** Stagehand (AI-powered test automation)
- **Email:** Resend
- **Deployment:** Vercel (frontend), Supabase (database + auth)

## Prerequisites

- **Node.js** 18.17 or higher
- **npm** 9.x or higher
- **Supabase CLI** (`npm install -g supabase`)
- **PostgreSQL** 15+ (or use Supabase local development)
- **Anthropic API Key** (for AI features)
- **Resend API Key** (for email notifications)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ohisee-reports
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI (Anthropic Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
```

### 4. Initialize Supabase

Start local Supabase instance:

```bash
supabase start
```

Apply migrations:

```bash
supabase db push
```

Generate TypeScript types:

```bash
supabase gen types typescript --local > lib/types/supabase.ts
```

### 5. Upload BRCGS Procedures (Optional)

Seed the knowledge base with BRCGS procedures:

```bash
npm run upload-procedures
npm run upload-kangopak
```

## Development

### Start Development Server

```bash
npm run dev
```

Application runs at `http://localhost:3008`

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3008)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm run test                    # Unit tests
npm run test:watch             # Unit tests (watch mode)
npm run test:coverage          # Coverage report (95%+ target)
npm run test:integration       # Integration tests
npm run test:db                # Database tests (pgTAP)
npm run test:e2e               # E2E tests (headless)
npm run test:e2e:headed        # E2E tests (with browser)

# Utilities
npm run upload-procedures      # Upload BRCGS docs to knowledge base
supabase gen types typescript --local > lib/types/supabase.ts  # Regenerate types
```

## Project Structure

ohisee-reports/
├── app/
│   ├── actions/              # Server Actions (API layer)
│   │   ├── nca-actions.ts    # NCA CRUD operations
│   │   ├── mjc-actions.ts    # MJC CRUD operations
│   │   └── ai-actions.ts     # AI quality gates
│   ├── nca/                  # NCA form pages
│   ├── mjc/                  # MJC form pages
│   ├── dashboard/            # Dashboards
│   └── end-of-day/           # Daily shift reporting
│
├── components/
│   ├── fields/               # Reusable form fields
│   ├── dashboard/            # Chart components
│   └── **tests**/            # Component tests
│
├── lib/
│   ├── ai/                   # AI service layer
│   │   ├── multi-agent/      # Specialized agents
│   │   ├── rag/              # Knowledge base RAG
│   │   └── prompts/          # AI prompts
│   ├── services/             # Business logic
│   ├── validations/          # Zod schemas
│   └── database/             # Database clients
│
├── supabase/
│   ├── migrations/           # Database migrations
│   └── tests/                # pgTAP database tests
│
├── tests/
│   └── e2e/                  # E2E tests (Stagehand)
│
└── docs/
    └── kangopak-procedures/  # BRCGS reference docs

## Architecture

### Core Principles

1. **Zero Static Calls** - All database operations use dependency injection for testability
2. **Database as Source of Truth** - Business rules enforced via constraints, triggers, and RLS
3. **Server Actions Pattern** - Consistent API with `ActionResponse<T>` types
4. **AI Graceful Degradation** - AI failures never block user workflows
5. **BRCGS Compliance First** - Every feature aligns with BRCGS Issue 7 procedures

### User Roles

1. **Operator** - Create NCAs, view own records
2. **Team Leader** - Approve first-level NCAs, assign work
3. **Maintenance Technician** - Create/complete MJCs
4. **QA Supervisor** - Grant hygiene clearance, approve critical NCAs
5. **Maintenance Manager** - Approve high-priority MJCs
6. **Operations Manager** - Full access, view all dashboards

Roles enforced via Supabase Row Level Security (RLS) policies.

### AI Integration

The system uses a multi-agent architecture:

- **Inline Quality Analysis** - Real-time scoring as users type (debounced 5s)
- **Pre-Submit Validation** - Deep quality gate before submission (<30s)
- **Content Completion** - Suggest missing details based on partial input
- **Corrective Action Generation** - Structured recommendations with BRCGS citations
- **Anomaly Detection** - Flag unusual patterns or data inconsistencies
- **Context Alignment** - Verify BRCGS compliance across all sections

All AI operations logged to `ai_assistance_log` for audit compliance.

## Database Schema

### Core Tables

- **users** - User accounts with role assignments
- **machines** - Equipment tracking with status
- **work_orders** - Production runs
- **ncas** - Non-Conformance Advice (BRCGS 5.7)
- **mjcs** - Maintenance Job Cards
- **audit_trail** - Immutable change log

### AI Tables

- **knowledge_base_documents** - BRCGS procedures (vector search enabled)
- **ai_assistance_log** - Full AI interaction audit
- **ai_corrective_actions** - Suggestions + user feedback
- **nca_quality_scores** - Quality metrics per NCA

### Key Constraints

- NCA description ≥100 characters
- MJC description ≥50 characters
- Machine Down requires timestamp
- Hygiene clearance blocked until all 10 items verified
- 20-day closure deadline for NCAs (BRCGS 5.7)

## Testing

### Test Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** Critical workflows covered
- **Database Tests:** All constraints, triggers, RLS policies verified
- **E2E Tests:** Full user journeys automated

### Running Tests

```bash
# Unit tests
npm run test                    # Run once
npm run test:watch             # Watch mode
npm run test:coverage          # Generate coverage report

# Integration tests
npm run test:integration

# Database tests (pgTAP)
npm run test:db

# E2E tests (Stagehand)
npm run test:e2e               # Headless
npm run test:e2e:headed        # With browser visible
```

### Test Philosophy

- **Unit Tests** - Fast, isolated, mock external dependencies
- **Integration Tests** - Test full workflows with real database
- **Database Tests** - Verify constraints, triggers, RLS policies
- **E2E Tests** - User workflows in real browser with AI element discovery

## Deployment

### Pre-Production Checklist

- [ ] All migrations applied and tested
- [ ] RLS policies verified for all roles
- [ ] Audit trail logging confirmed
- [ ] AI rate limiting configured
- [ ] Email notifications tested
- [ ] Dashboard queries optimized
- [ ] E2E tests passing
- [ ] BRCGS compliance verified

### Production Environment

1. **Frontend** - Deploy to Vercel (or similar Next.js host)
2. **Database** - Supabase production instance
3. **Environment Variables** - Set in hosting platform
4. **Monitoring** - Configure query performance alerts

### Database Migrations

```bash
# Apply migrations to production
supabase db push --linked

# Verify migrations
supabase migration list
```

**IMPORTANT:** Always test migrations with seed data in staging before production.

## BRCGS Compliance

This system enforces Kangopak's Product Safety & Quality Management System according to:

- **Section 3.3** - Internal Audits (audit trail)
- **Section 3.6** - Document Control (version management)
- **Section 5.7** - Control of Non-Conforming Product (NCA workflow)
- **Section 1.1.3** - Confidential Reporting (bypass quality gates)

All controlled documents reference procedure number + revision (e.g., "5.7 Rev 9").

## Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Server-side validation for all user input
- ✅ Parameterized queries (SQL injection prevention)
- ✅ XSS sanitization on user-generated content
- ✅ API rate limiting (10 req/min per user)
- ✅ Secrets in environment variables (never committed)
- ✅ Audit trail for all changes (immutable)

## Performance

### Targets

- **Form Load:** <500ms
- **Inline AI Check:** <2s
- **Deep Validation:** <30s
- **Dashboard Queries:** <1s

### Optimization Strategies

- Database indexes on common queries
- Debounced AI calls
- Lazy-loaded dashboard components
- Paginated large datasets
- React.memo for expensive components

## Contributing

### Development Workflow

1. Create feature branch from `master`
2. Implement feature with tests (TDD preferred)
3. Run full test suite: `npm run test && npm run test:e2e`
4. Update CLAUDE.md if architecture changes
5. Create PR with clear description

### Code Standards

- **TypeScript** - Strict mode, no `any` types
- **Formatting** - ESLint + Prettier
- **Testing** - 95%+ coverage for new code
- **Architecture** - Follow Zero Static Calls principle
- **Security** - Never commit secrets, always use RLS

### Migration Guidelines

```bash
# Create new migration
supabase migration new descriptive_name

# Test migration rollback
# (Create manual down migration - Supabase doesn't auto-rollback)
```

**Naming:** `YYYYMMDDHHMMSS_descriptive_name.sql`

## Troubleshooting

### Common Issues

**Empty query results despite data existing:**

- Check RLS policies for your role
- Verify `auth.uid()` returns valid user
- Test with different role UUIDs from seed data

**AI calls hanging:**

- Verify Anthropic API key is valid
- Check rate limits not exceeded
- Inspect network connectivity
- System falls back to manual entry

**Hygiene clearance blocked:**

- Verify ALL 10 checklist items have `verified: true`
- Ensure user has QA Supervisor role
- Check `validate_hygiene_checklist()` function

**Migration failures:**

- Check dependency order (core tables first)
- Verify seed data references valid IDs
- Test with clean database

## Support

- **Documentation:** `/docs` directory
- **API Reference:** `app/actions/README.md`
- **Database Schema:** `supabase/README.md`
- **BRCGS Procedures:** `docs/kangopak-procedures/`

## License

Proprietary - Kangopak (Pty) Ltd

---

**System Owner:** Production Manager (Kangopak)
**Compliance Officer:** QA Supervisor
**BRCGS Certification:** Issue 7 - Section 5

Built with ❤️ for Food Safety Excellence
