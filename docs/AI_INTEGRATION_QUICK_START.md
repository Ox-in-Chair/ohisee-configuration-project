# AI Quality Gate - Quick Start Integration Guide

## Files Created (All Complete ✅)

```
ohisee-reports/
├── app/actions/ai-quality-actions.ts          ← Server Actions (security layer)
├── hooks/useAIQuality.ts                      ← React hook (state management)
├── components/
│   ├── ai-quality-badge.tsx                   ← Quality score badge
│   ├── ai-enhanced-textarea.tsx               ← Smart textarea with AI
│   └── ai-assistant-modal.tsx                 ← Quality gate modal
└── app/nca/new/page.tsx.backup                ← Original NCA form (backup)
```

## Integration Pattern (Copy-Paste Ready)

### 1. Import Block (Add to top of form)

```typescript
import { useAIQuality } from '@/hooks/useAIQuality';
import { AIEnhancedTextarea } from '@/components/ai-enhanced-textarea';
import { AIAssistantModal } from '@/components/ai-assistant-modal';
import { AIQualityBadge } from '@/components/ai-quality-badge';
import { recordSupervisorOverrideAction } from '@/app/actions/ai-quality-actions';
import { Sparkles, Loader2 } from 'lucide-react';
```

### 2. Hook Initialization (Add after useState declarations)

```typescript
// AI Quality Management
const {
  qualityScore,
  suggestions,
  validationResult,
  isChecking,
  isSuggesting,
  isValidating,
  checkQualityInline,
  generateSuggestion,
  validateBeforeSubmit,
  acceptSuggestion,
} = useAIQuality({
  formType: 'nca', // or 'mjc'
  userId: 'current-user-id', // TODO: Get from auth session
  debounceMs: 3000,
});

const [showQualityGate, setShowQualityGate] = useState(false);
```

### 3. Replace Standard Textarea (Example: NC Description)

**Before**:
```typescript
<Textarea {...register('nc_description')} />
```

**After**:
```typescript
<AIEnhancedTextarea
  label="Description (minimum 100 characters)"
  value={watch('nc_description') || ''}
  onChange={(value) => {
    setValue('nc_description', value);
    checkQualityInline({
      nca_id: ncaId || 'temp',
      nc_description: value,
      nc_type: watch('nc_type') || 'other',
      machine_status: watch('machine_status') || 'operational',
      cross_contamination: watch('cross_contamination') || false,
      disposition_rework: watch('disposition_action') === 'rework',
      disposition_concession: watch('disposition_action') === 'concession',
    });
  }}
  onAIHelp={() => generateSuggestion({
    nca_id: ncaId || 'temp',
    nc_description: watch('nc_description') || '',
    nc_type: watch('nc_type') || 'other',
    machine_status: watch('machine_status') || 'operational',
    cross_contamination: watch('cross_contamination') || false,
  })}
  qualityScore={qualityScore?.score || null}
  isCheckingQuality={isChecking}
  isSuggesting={isSuggesting}
  showQualityBadge={true}
  minLength={100}
  required
  data-testid="nc-description"
/>
```

### 4. Add AI Help Button (Example: Root Cause)

```typescript
<div className="flex items-center justify-between mb-2">
  <Label>Root Cause Analysis</Label>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => generateSuggestion({
      nca_id: ncaId || 'temp',
      nc_description: watch('nc_description') || '',
      nc_type: watch('nc_type') || 'other',
      machine_status: watch('machine_status') || 'operational',
      cross_contamination: watch('cross_contamination') || false,
    })}
    disabled={isSuggesting}
    className="flex items-center gap-2"
  >
    {isSuggesting ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating...</span>
      </>
    ) : (
      <>
        <Sparkles className="h-4 w-4" />
        <span>Get AI Help</span>
      </>
    )}
  </Button>
</div>

<Textarea {...register('root_cause_analysis')} />

{/* Show AI suggestion when available */}
{suggestions && suggestions.sections.root_cause && (
  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
    <p className="text-sm font-medium text-blue-900 mb-2">
      AI Suggestion:
    </p>
    <p className="text-sm text-blue-800 whitespace-pre-wrap">
      {suggestions.sections.root_cause}
    </p>
    <div className="flex gap-2 mt-3">
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setValue('root_cause_analysis', suggestions.sections.root_cause || '');
          acceptSuggestion(suggestions, 'root_cause_analysis', watch('root_cause_analysis') || '');
        }}
      >
        Accept Suggestion
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => /* Clear suggestion state */}
      >
        Dismiss
      </Button>
    </div>
  </div>
)}
```

### 5. Modify Submit Handler (Quality Gate)

**Before**:
```typescript
const onSubmit = useCallback(async (data: NCAFormData) => {
  setIsSubmitting(true);

  const response = await createNCA(data);

  if (!response.success) {
    setSubmitError(response.error);
    return;
  }

  setSubmitSuccess(true);
  setIsSubmitting(false);
}, []);
```

**After**:
```typescript
const onSubmit = useCallback(async (data: NCAFormData) => {
  setIsSubmitting(true);
  setSubmitError(null);

  try {
    // AI Quality Gate
    const validation = await validateBeforeSubmit({
      nca_id: ncaId || 'temp',
      nc_description: data.nc_description,
      nc_type: data.nc_type || 'other',
      machine_status: data.machine_status || 'operational',
      cross_contamination: data.cross_contamination || false,
      disposition_rework: data.disposition_action === 'rework',
      disposition_concession: data.disposition_action === 'concession',
      root_cause_analysis: data.root_cause_analysis,
      corrective_action: data.corrective_action,
    });

    if (!validation.success) {
      setSubmitError(validation.error || 'Validation failed');
      setIsSubmitting(false);
      return;
    }

    // Check score < 75 = show quality gate
    if (validation.data && validation.data.quality_assessment.score < 75) {
      setShowQualityGate(true);
      setIsSubmitting(false);
      return;
    }

    // Proceed with submission
    const response = await createNCA(data);

    if (!response.success) {
      setSubmitError(response.error);
      setIsSubmitting(false);
      return;
    }

    setSubmitSuccess(true);
  } catch (error) {
    console.error('Submit error:', error);
    setSubmitError(error instanceof Error ? error.message : 'Submit failed');
  } finally {
    setIsSubmitting(false);
  }
}, [ncaId, validateBeforeSubmit]);
```

### 6. Add Quality Gate Modal (At end of JSX return)

```typescript
return (
  <div className="container mx-auto p-6 max-w-5xl">
    {/* All existing form content */}

    {/* NEW: Quality Gate Modal */}
    <AIAssistantModal
      open={showQualityGate}
      onClose={() => setShowQualityGate(false)}
      validationResult={validationResult}
      onGoBack={() => {
        setShowQualityGate(false);
        // Auto-scroll to first issue
        document.querySelector('[data-testid="nc-description"]')?.scrollIntoView({ behavior: 'smooth' });
      }}
      onSubmitAnyway={async (reason) => {
        setIsSubmitting(true);

        // Log override
        await recordSupervisorOverrideAction(
          'nca',
          ncaId || 'pending',
          validationResult?.quality_assessment.score || 0,
          reason,
          'current-user-id'
        );

        // Submit anyway
        const formData = watch();
        const response = await createNCA(formData);

        if (response.success) {
          setSubmitSuccess(true);
          setShowQualityGate(false);
        } else {
          setSubmitError(response.error);
        }

        setIsSubmitting(false);
      }}
    />
  </div>
);
```

---

## Component Props Reference

### AIEnhancedTextarea

```typescript
<AIEnhancedTextarea
  label="Field label"               // Required
  value={string}                    // Required (controlled)
  onChange={(value) => void}        // Required
  onAIHelp={() => void}            // Optional (shows "Get AI Help" button)
  qualityScore={number | null}     // Optional (shows badge)
  isCheckingQuality={boolean}      // Optional (loading state)
  isSuggesting={boolean}           // Optional (button loading)
  showQualityBadge={boolean}       // Optional (default: true)
  minLength={number}               // Optional (validation)
  maxLength={number}               // Optional (default: 2000)
  rows={number}                    // Optional (default: 5)
  required={boolean}               // Optional
  placeholder={string}             // Optional
  data-testid={string}             // Optional (testing)
  error={string}                   // Optional (error message)
/>
```

### AIQualityBadge

```typescript
<AIQualityBadge
  score={number | null}            // Required
  isChecking={boolean}             // Optional (default: false)
  threshold={number}               // Optional (default: 75)
  showDetails={boolean}            // Optional (default: false)
/>
```

### AIAssistantModal

```typescript
<AIAssistantModal
  open={boolean}                   // Required
  onClose={() => void}             // Required
  validationResult={ValidationResult | null}  // Required
  onGoBack={() => void}            // Required
  onSubmitAnyway={(reason) => void} // Required
/>
```

---

## Testing Commands

```bash
# Unit tests
npm test hooks/useAIQuality.test.ts
npm test components/ai-quality-badge.test.tsx
npm test components/ai-enhanced-textarea.test.tsx

# Integration tests
npm test tests/integration/nca-ai-integration.test.tsx

# E2E tests
npx playwright test tests/e2e/nca-ai-quality-gate.spec.ts

# Coverage report
npm run test:coverage
```

---

## Troubleshooting

### AI service not responding
**Symptom**: Loading spinner forever
**Fix**: Check `.env.local` has `ANTHROPIC_API_KEY`

### Quality score always null
**Symptom**: Badge never appears
**Fix**: Verify `checkQualityInline()` is being called (debounced 3s)

### Modal doesn't appear
**Symptom**: Form submits despite low score
**Fix**: Check `showQualityGate` state and `validateBeforeSubmit()` return value

### TypeScript errors
**Symptom**: Type mismatches
**Fix**: Import types from `@/lib/ai/types`

---

## File Locations (Absolute Paths)

```
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/app/actions/ai-quality-actions.ts
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/hooks/useAIQuality.ts
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/components/ai-quality-badge.tsx
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/components/ai-enhanced-textarea.tsx
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/components/ai-assistant-modal.tsx
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/app/nca/new/page.tsx
C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/app/mjc/new/page.tsx
```

---

## Next: Manual Integration Steps

1. **Open `ohisee-reports/app/nca/new/page.tsx`**
2. **Add imports** (Section 1 above)
3. **Add hook** (Section 2 above)
4. **Replace Section 4 textarea** (Section 3 above)
5. **Add Section 9 AI button** (Section 4 above)
6. **Replace Section 10 textarea** (Section 3 pattern)
7. **Modify submit handler** (Section 5 above)
8. **Add modal** (Section 6 above)
9. **Test manually**: `npm run dev` and navigate to `/nca/new`
10. **Repeat for MJC form** (adapt patterns)

---

**Estimated Time**: 2-3 hours per form including testing
