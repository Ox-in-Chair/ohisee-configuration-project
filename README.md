# Production-Ready Manufacturing Control and Compliance System

**Company:** Kangopak (Pty) Ltd
**Environment:** Live Production Facility
**Purpose:** Unified operational and compliance platform integrating all core manufacturing control processes under the Kangopak Product Safety and Quality Management System (PS & QMS), aligned with **BRCGS Packaging Materials Issue 7**.

## Overview

This is not just an NCA/MJC tool—it's the **complete Kangopak Production Control and Compliance Platform**. The system unifies and automates all production control, product safety, and compliance activities. Each process operates as its own governed module yet links seamlessly into the same database and dashboard environment.

Built with Next.js 16, TypeScript, Supabase PostgreSQL, and Claude AI integration, it provides real-time quality gates, automated compliance checks, and intelligent corrective action suggestions across all manufacturing control functions.

### Core System Functions

| Function Area | Purpose | Key Capabilities |
|---------------|---------|------------------|
| **Non-Conformance & Incident Control** | Record, track, and close non-conforming materials, WIP, or finished products | Auto-classification (Supplier vs Internal), disposition logic, red hold labeling, root cause, corrective actions, and escalation tracking |
| **Maintenance Management** | Link equipment or mechanical failures to corrective maintenance records | Auto-create maintenance job cards from production deviations; record parts, downtime, and technician verification |
| **Waste and Material Reconciliation** | Capture and reconcile all waste against recorded NC quantities | Automated integration with Waste Manifest (Form 4.10F1), weight reconciliation, and traceable certification logs |
| **Supplier & Raw Material Quality** | Manage supplier-based non-conformances and approval performance | Supplier scorecards, linked NCAs, and material traceability across production batches |
| **Traceability & Production Control** | Provide full forward and backward tracking of materials and finished goods | Reel, carton, and work order-based relationships linked across modules |
| **Complaint & Recall Linkage** | Integrate customer complaints and recall actions into core data flow | Complaint IDs feed directly into analysis and corrective action registers |
| **Reporting & Analytics** | Enable performance visibility and compliance trend tracking | Department-level dashboards, trend analysis (5.7F2), and exportable reports for management review |
| **AI-Driven Quality Guidance** | Assist operators and team leaders with real-time procedural feedback | Detect incomplete or vague descriptions; prompt corrective or compliant inputs in plain language |
| **End-of-Day Summaries** | Automated status reporting across all open and closed actions | Generates daily summaries for management and retains copies for audit trail (Procedure 3.3 link) |

### Module Integration Model

All modules are interconnected under a single compliance architecture. Procedures remain separate for control purposes but communicate through shared data structures:

| Module | Linked Procedures | Shared Data | System Behaviour |
|--------|-------------------|-------------|------------------|
| **Non-Conformance** | 5.7 Control of Non-Conforming Product | NCA_ID, WO, Reel No., Supplier | Triggers related actions across Waste, Maintenance, and Supplier modules |
| **Maintenance** | Maintenance Procedure | MJC_ID, Machine ID | Auto-linked from root causes involving equipment failure |
| **Waste Management** | 4.10 Waste Management | WM_ID, Batch/Weight | Auto-populated from NCs marked as "Discarded" |
| **Traceability** | 3.9 Traceability | WO / Reel / Carton | Ensures full backward and forward product trace |
| **Supplier Approval** | 3.4 Supplier Approval | Supplier Code | Updates supplier performance and review cycle |
| **Complaint Handling** | 3.10 Complaint Handling | Complaint ID | Feeds into root cause and corrective action database |
| **Product Recall** | 3.11 Product Recall | Recall Lot | Automatic flagging of linked lots for hold or recall |

## Tech Stack

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | **Next.js 16 (App Router)** | Modular application structure allowing each controlled procedure to operate as a standalone but integrated component |
| **Language** | **TypeScript (strict mode)** | Enforces data consistency and safe integration across modules |
| **Database** | **Supabase PostgreSQL with RLS** | Central data hub linking all procedures through shared keys while maintaining data isolation by user role |
| **AI Layer** | **Claude Multi-Agent System** | Provides real-time content validation, pattern detection, and coaching within forms to ensure accuracy and compliance |
| **UI Framework** | **Tailwind CSS + shadcn/ui** | Ensures visual consistency, responsive layouts, and print-ready formatting for all outputs |
| **Email** | **Resend** | Automated notifications and reporting |
| **Deployment** | **Vercel + Supabase** | Production-ready hosting with automatic scaling |

**Build Quality:** Clean, production-validated repository — no test bloat, mock data, or exposed secrets. Strict linting, full typing, and secure environment variables.

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

# Utilities
npm run upload-procedures      # Upload BRCGS docs to knowledge base
supabase gen types typescript --local > lib/types/supabase.ts  # Regenerate types
```

## Project Structure

```
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
│   └── dashboard/            # Chart components
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
│   └── migrations/           # Database migrations
│
├── scripts/                  # Admin utilities
│
└── docs/
    └── kangopak-procedures/  # BRCGS reference docs
```

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

## Compliance Framework

Fully aligned with **BRCGS Packaging Materials Issue 7**. Each digital form or workflow is tied to a controlled procedure, displaying:

- **Document Number** (e.g., 5.7, 4.10, 3.9)
- **Form Number** (e.g., 5.7F1, 4.10F1)
- **Revision and Approval Date**
- **BRCGS Clause Reference**

### Audit Control

- Automatic version locking ensures that once data is entered under a specific revision, it remains traceable to that version
- Immutable audit trail for every user interaction
- RLS rules enforce separation of roles (Operator, Team Leader, Production Manager, Commercial Manager)
- All documents and dashboards are printable in A4 PDF format with control headers and footers

### Key BRCGS Sections Enforced

- **Section 1.1.3** - Confidential Reporting (bypass quality gates)
- **Section 3.3** - Internal Audits (immutable audit trail)
- **Section 3.4** - Supplier Approval (supplier performance tracking)
- **Section 3.6** - Document Control (version management)
- **Section 3.9** - Traceability (forward and backward tracing)
- **Section 3.10** - Complaint Handling (integration with corrective actions)
- **Section 3.11** - Product Recall (linked lot tracking)
- **Section 4.10** - Waste Management (reconciliation and certification)
- **Section 5.7** - Control of Non-Conforming Product (NCA workflow)

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
2. Implement feature following architectural principles
3. Run build and lint: `npm run build && npm run lint`
4. Update CLAUDE.md if architecture changes
5. Create PR with clear description

### Code Standards

- **TypeScript** - Strict mode, no `any` types
- **Formatting** - ESLint + Prettier
- **Architecture** - Follow Zero Static Calls principle
- **Security** - Never commit secrets, always use RLS
- **BRCGS Compliance** - All features must align with procedures

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

## Deliverable

A **production-ready, audit-compliant manufacturing control system** that unifies all operational procedures and quality records into a single, data-driven platform.

It preserves all existing functionality, integrates all enhancements, embeds form and BRCGS identifiers in every document, and provides end-to-end traceability across Kangopak's live production operations—ready for certification, audit, and continuous process improvement.

**System Owner:** Production Manager (Kangopak)
**Compliance Officer:** QA Supervisor
**BRCGS Certification:** Issue 7 - All Sections

Built for Manufacturing Excellence and Food Safety Compliance
