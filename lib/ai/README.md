# AI Service Integration Layer

Production-ready AI quality analysis service for BRCGS compliance in the OHiSee system.

## Overview

This module provides AI-powered quality gates for NCA (Non-Conformance Advice) and MJC (Maintenance Job Card) forms, ensuring all submissions meet BRCGS compliance standards before being saved to the database.

### Key Features

- **Zero Static Calls**: Full dependency injection for testability
- **Type-Safe**: TypeScript strict mode with comprehensive interfaces
- **Adaptive Performance**: Fast inline (<2s) vs deep validation (10-30s) modes
- **RAG-Powered**: Retrieval-augmented generation using BRCGS procedures and historical cases
- **Role-Adapted**: Language complexity adjusts based on user role and training status
- **Audit-Ready**: Complete audit trail for BRCGS compliance verification

## Architecture

```
lib/ai/
├── index.ts                      # Public API exports
├── factory.ts                    # Service factory with DI
├── types.ts                      # TypeScript type definitions
├── ai-service.interface.ts       # Interface contracts
├── ai-service.ts                 # Core AIService implementation
├── quality-scorer.ts             # Weighted scoring algorithm
├── audit-logger.ts               # Audit trail logging
├── rate-limiter.ts               # API rate limiting
├── prompts/
│   ├── nca-quality-scoring.ts    # NCA corrective action prompts
│   ├── mjc-quality-scoring.ts    # MJC maintenance action prompts
│   ├── hazard-classification.ts  # 11 BRCGS hazard types
│   └── role-adaptation.ts        # Language level adaptation
├── rag/
│   └── knowledge-base-service.ts # RAG retrieval system
└── __tests__/
    ├── ai-service.test.ts        # Core service tests
    └── quality-scorer.test.ts    # Scoring algorithm tests
```

## Installation

Dependencies are already installed:
- `@anthropic-ai/sdk` - Anthropic Claude API
- `@supabase/supabase-js` - Database and RAG storage

## Configuration

### Environment Variables

Required in `.env.local`:

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# AI Configuration
AI_QUALITY_THRESHOLD=75              # Minimum score (0-100)
AI_MODE=adaptive                      # fast | adaptive | deep
AI_FAST_RESPONSE_TIMEOUT=2000        # ms
AI_DEEP_VALIDATION_TIMEOUT=30000     # ms

# Supabase (for RAG and audit logging)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Usage

### Basic Usage

```typescript
import { createAIService } from '@/lib/ai';

// Create service (handles all dependency injection)
const aiService = createAIService();

// Analyze field quality (fast mode, <2s)
const qualityScore = await aiService.analyzeFieldQuality({
  user: currentUser,
  language_level: 4,
  nca: ncaData
});

console.log(`Quality Score: ${qualityScore.score}/100`);
console.log(`Threshold Met: ${qualityScore.threshold_met}`);
```

### Generate AI Suggestions

```typescript
import { createAIService } from '@/lib/ai';

const aiService = createAIService();

// Generate corrective action suggestion
const suggestion = await aiService.generateSuggestions({
  user: currentUser,
  language_level: 4,
  nca: {
    nca_id: 'NCA-2025-00001',
    nc_description: 'Print registration misalignment detected...',
    nc_type: 'wip',
    machine_status: 'operational',
    cross_contamination: false,
    disposition_rework: false,
    disposition_concession: false
  }
});

// Suggestion includes:
console.log(suggestion.text);                    // Full formatted text
console.log(suggestion.sections.immediate_correction);
console.log(suggestion.sections.root_cause);
console.log(suggestion.sections.corrective_action);
console.log(suggestion.quality_score);           // 0-100
console.log(suggestion.procedure_references);    // ['5.7', '3.11']
console.log(suggestion.recommendations);         // { create_mjc, calibration_check, ... }
```

### Classify Hazards

```typescript
const hazard = await aiService.classifyHazard(
  'Metal fragment found during metal detector alarm'
);

console.log(hazard.hazard_type);      // 'metal-contamination'
console.log(hazard.severity);         // 'critical'
console.log(hazard.risk_level);       // 8 (severity × likelihood)
console.log(hazard.control_measures); // ['Metal detector verification', ...]
console.log(hazard.brcgs_section);    // '5.8'
```

### Validate Before Submit

```typescript
const validation = await aiService.validateBeforeSubmit(nca, currentUser);

if (!validation.valid) {
  console.error('Validation Errors:', validation.errors);
  // [{ field: 'nc_description', message: 'Too short', severity: 'error' }]
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
  // [{ field: 'corrective_action', message: 'Missing back tracking', suggestion: '...' }]
}

console.log(`Quality Score: ${validation.quality_assessment.score}/100`);
console.log(`Ready for Submission: ${validation.ready_for_submission}`);
```

## Testing

### Running Tests

```bash
# Unit tests
npm test -- lib/ai/__tests__

# Coverage report
npm run test:coverage -- lib/ai/__tests__

# Watch mode
npm run test:watch -- lib/ai/__tests__
```

### Mocking Dependencies

```typescript
import { createTestAIService } from '@/lib/ai/factory';

const mockAnthropicClient = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ ... }) }]
    })
  }
};

const mockKnowledgeBase = {
  searchProcedures: jest.fn().mockResolvedValue([]),
  findSimilarCases: jest.fn().mockResolvedValue([]),
  getProcedure: jest.fn().mockResolvedValue(null)
};

const aiService = createTestAIService({
  anthropicClient: mockAnthropicClient,
  knowledgeBase: mockKnowledgeBase,
  auditLogger: mockAuditLogger,
  rateLimiter: mockRateLimiter
});
```

## Quality Scoring Algorithm

### NCA Scoring (0-100)

| Category | Weight | Criteria |
|----------|--------|----------|
| **Completeness** | 30% | Quarantine keywords, hold labels, back tracking, segregation |
| **Accuracy** | 25% | BRCGS procedure references (5.7, 3.11, etc.), correct terminology |
| **Clarity** | 20% | Clear structure, actionable language, appropriate length (150-500 words) |
| **Hazard ID** | 15% | Food safety consideration, hazard type identification |
| **Evidence** | 10% | Verification method, timeline, measurability |

**Minimum Threshold**: 75/100

### MJC Scoring (0-100)

| Category | Weight | Criteria |
|----------|--------|----------|
| **Completeness** | 30% | Maintenance scope specificity, safety emphasis, contamination prevention |
| **Accuracy** | 25% | 10-item hygiene clearance checklist, procedure references |
| **Clarity** | 20% | Step-by-step format, technical terminology, concise (100-400 words) |
| **Safety** | 15% | LOTO, PPE, food safety consideration |
| **Verification** | 10% | Functional test, test samples, calibration check |

**Minimum Threshold**: 75/100

## Role-Based Language Adaptation

Language complexity adapts to user role and training status:

| Level | Target Audience | Characteristics |
|-------|----------------|-----------------|
| **1-2 (Basic)** | Operators | Simple language, no jargon, step-by-step |
| **3 (Competent)** | Team Leaders, Technicians | Technical terms, procedure references |
| **4 (Advanced)** | QA Supervisors, Managers | Full compliance terminology, audit focus |
| **5 (Executive)** | Operations Manager | KPIs, business impact, strategic implications |

## Prompt Templates

### NCA Quality Scoring Prompt

Generates corrective action suggestions following BRCGS Section 5.7:

**Input Context**:
- User role and language level
- NCA details (description, type, machine status, cross-contamination)
- Relevant BRCGS procedures (from RAG)
- Similar historical cases (from vector search)

**Output Structure**:
```json
{
  "sections": {
    "immediate_correction": "Quarantine, segregation, hold labels",
    "root_cause": "Systematic investigation per 3.11",
    "corrective_action": "Preventive actions, procedure updates",
    "verification": "Monitoring plan, timeline, success criteria"
  },
  "procedure_references": ["5.7", "3.11", "3.9"],
  "recommendations": {
    "create_mjc": false,
    "calibration_check": true,
    "training_required": false
  }
}
```

### MJC Quality Scoring Prompt

Generates maintenance action suggestions following BRCGS Section 4.7:

**Output Structure**:
```json
{
  "sections": {
    "maintenance_scope": "Parts, torque specs, procedures",
    "safety_considerations": "LOTO, PPE, energy isolation",
    "contamination_prevention": "Clean as you go, tool control",
    "hygiene_clearance": "10-item checklist (MANDATORY)",
    "verification": "Functional test, test samples, QA sign-off"
  }
}
```

## RAG (Retrieval-Augmented Generation)

### Knowledge Base Search

The system uses pgvector for semantic search over:

1. **BRCGS Procedures** - Sections 3.x, 4.x, 5.x, 6.x
2. **Historical Cases** - Previous NCAs/MJCs with quality scores ≥75

**Vector Similarity Search**:
- Embedding model: text-embedding-ada-002 (OpenAI)
- Similarity threshold: 0.5 for procedures, 0.6 for cases
- Top-k retrieval: 5 procedures, 3 similar cases

**Fallback Mechanism**:
If vector search fails, keyword-based procedure matching provides relevant context.

## Rate Limiting

Default limits:
- **10 requests/minute** per user
- **100 requests/hour** per user

Prevents API abuse and manages costs. Configurable via `RateLimiter` constructor.

## Audit Trail

All AI interactions are logged to `ai_interaction_audit` table:

```sql
INSERT INTO ai_interaction_audit (
  user_id,
  user_role,
  query_type,
  query_context,
  response,
  quality_score,
  confidence,
  brcgs_procedures_referenced,
  escalation_triggered,
  timestamp
) VALUES (...);
```

**BRCGS Compliance**: Demonstrates AI-driven quality gates and systematic approach to non-conformance management.

## Error Handling

All errors are wrapped in `AIServiceError` with specific codes:

```typescript
type AIErrorCode =
  | 'insufficient_input'
  | 'analysis_failed'
  | 'low_confidence'
  | 'timeout'
  | 'validation_failed'
  | 'api_error'
  | 'rate_limit_exceeded';
```

**Graceful Degradation**:
- If AI service unavailable: Allow manual input
- If rate limited: Display clear message with retry timing
- If quality threshold not met: Provide specific improvement suggestions

## Performance Targets

| Operation | Target | Configuration |
|-----------|--------|---------------|
| **Field Quality Analysis** | <2s | `AI_FAST_RESPONSE_TIMEOUT=2000` |
| **Generate Suggestion** | <5s (adaptive) | Depends on mode |
| **Deep Validation** | <30s | `AI_DEEP_VALIDATION_TIMEOUT=30000` |
| **Hazard Classification** | <2s | Fast mode |

## Integration Example (Next.js API Route)

```typescript
// app/api/ai/suggest-corrective-action/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAIService } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const aiService = createAIService();

    const suggestion = await aiService.generateSuggestions({
      user: body.user,
      language_level: body.language_level,
      nca: body.nca
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'rate_limit_exceeded' ? 429 : 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Future Enhancements

1. **Streaming Responses**: Use `anthropicClient.messages.stream()` for real-time feedback
2. **Embedding Service**: Replace mock embeddings with actual OpenAI embeddings API
3. **Caching**: Cache procedure embeddings to reduce API calls
4. **Fine-tuning**: Train custom model on historical high-quality NCAs/MJCs
5. **Multi-language Support**: Adapt prompts for different languages
6. **Analytics Dashboard**: Visualize AI usage, quality trends, acceptance rates

## References

- **BRCGS Specs**: `docs/AI_Rules_Developer_Quick_Reference.md`
- **Language Adaptation**: `docs/AI_Language_Adaptation_Framework.md`
- **Anthropic Docs**: https://docs.anthropic.com/claude/reference
- **pgvector**: https://github.com/pgvector/pgvector

## Support

For issues or questions:
1. Check test files for usage examples
2. Review type definitions in `types.ts`
3. Examine prompt templates for expected output formats
4. Consult BRCGS documentation for compliance requirements

---

**Version**: 1.0
**Last Updated**: 2025-11-10
**Maintainer**: Development Team Lead
