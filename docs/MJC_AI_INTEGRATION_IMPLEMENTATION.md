# MJC AI Integration - Implementation Guide

## Status: READY FOR IMPLEMENTATION

All required components exist. Integration requires targeted modifications to MJC form.

---

## Files to Modify

### 1. **app/mjc/new/page.tsx** - Main Integration

**Add Imports (Lines 1-18):**

```typescript
// Add these imports after existing imports
import { AIEnhancedTextarea } from '@/components/ai-enhanced-textarea';
import { useAIQuality } from '@/hooks/useAIQuality';
import {
  analyzeMJCQualityInline,
  validateMJCBeforeSubmit,
  generateMJCMaintenanceAction
} from '@/app/actions/ai-actions';
import type { MJC } from '@/lib/ai/types';
```

**Add AI Hook (After line 28):**

```typescript
// Initialize AI Quality hook
const {
  qualityScore,
  suggestions,
  validationResult,
  isChecking,
  isSuggesting,
  isValidating,
  error: aiError,
  checkQualityInline,
  generateSuggestion,
  validateBeforeSubmit,
  clearError,
} = useAIQuality({
  formType: 'mjc',
  userId: 'current-user-id', // TODO: Get from auth
  debounceMs: 3000,
});
```

**Add Quality Check Effect (After AI hook):**

```typescript
// Watch form changes for inline quality check
const formData = watch();

useEffect(() => {
  if (formData.maintenance_description && formData.maintenance_description.length >= 100) {
    checkQualityInline({
      description_required: formData.maintenance_description,
      maintenance_performed: formData.maintenance_performed,
      machine_equipment_id: formData.machine_equipment_id,
      maintenance_type: formData.maintenance_type,
    } as Partial<MJC>);
  }
}, [formData.maintenance_description, formData.maintenance_performed, checkQualityInline]);
```

**Modify Section 6 (Lines 474-507):**

Replace the Textarea at line 481-485 with:

```typescript
<AIEnhancedTextarea
  label="Problem Description (minimum 100 characters)"
  value={formData.maintenance_description || ''}
  onChange={(value) => setValue('maintenance_description', value, { shouldValidate: true })}
  onAIHelp={async () => {
    await generateSuggestion({
      machine_equipment_id: formData.machine_equipment_id,
      maintenance_type: formData.maintenance_type,
      maintenance_category: formData.maintenance_category,
      description_required: formData.maintenance_description,
    } as Partial<MJC>);
  }}
  qualityScore={qualityScore?.score ?? null}
  isCheckingQuality={isChecking}
  isSuggesting={isSuggesting}
  showQualityBadge={true}
  minLength={100}
  maxLength={2000}
  rows={5}
  required
  placeholder="Describe the problem: symptoms, when noticed, impact on production..."
  data-testid="maintenance-description"
  error={errors.maintenance_description?.message}
/>
```

**Modify Section 7 (Lines 509-529):**

Replace the Textarea at line 517 with:

```typescript
<AIEnhancedTextarea
  label="Maintenance Work Performed (minimum 50 characters)"
  value={formData.maintenance_performed || ''}
  onChange={(value) => setValue('maintenance_performed', value, { shouldValidate: true })}
  onAIHelp={async () => {
    await generateSuggestion({
      machine_equipment_id: formData.machine_equipment_id,
      maintenance_type: formData.maintenance_type,
      description_required: formData.maintenance_description,
      maintenance_performed: formData.maintenance_performed,
    } as Partial<MJC>);
  }}
  qualityScore={qualityScore?.score ?? null}
  isCheckingQuality={isChecking}
  isSuggesting={isSuggesting}
  showQualityBadge={true}
  minLength={50}
  maxLength={2000}
  rows={5}
  placeholder="Detail repairs performed, parts replaced, settings adjusted..."
  data-testid="maintenance-performed"
/>
```

**Modify Form Submission (Lines 130-164):**

Add quality gate check before submission:

```typescript
const onSubmit = useCallback(
  async (data: MJCFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // QUALITY GATE: Validate before submission
      const validation = await validateBeforeSubmit(
        {
          nca_id: mjcId || 'draft',
          description_required: data.maintenance_description,
          maintenance_performed: data.maintenance_performed,
          machine_equipment_id: data.machine_equipment_id,
          maintenance_type: data.maintenance_type,
          urgency: data.urgency_level,
        } as MJC,
        false // Not confidential
      );

      if (!validation.success) {
        setSubmitError(validation.error || 'Validation failed');
        return;
      }

      // Quality gate check
      if (validation.data && !validation.data.ready_for_submission) {
        setSubmitError(
          `Quality score (${validation.data.quality_assessment.score}) below threshold (75). Please improve completeness, clarity, and safety documentation.`
        );
        return;
      }

      // Call Server Action to submit MJC
      const response = await createMJC(data);

      if (!response.success) {
        setSubmitError(response.error || 'Failed to submit MJC');
        return;
      }

      // Success!
      setSubmitSuccess(true);
      setMjcNumber(response.data?.job_card_number || null);
      setMjcId(response.data?.id || null);

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setMjcNumber(null);
      }, 5000);
    } catch (error) {
      console.error('Unexpected submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  },
  [reset, validateBeforeSubmit, mjcId]
);
```

---

## Server Actions (Already Complete)

✅ `analyzeMJCQualityInline` - app/actions/ai-actions.ts (line 409)
✅ `validateMJCBeforeSubmit` - app/actions/ai-actions.ts (line 457)
✅ `generateMJCMaintenanceAction` - app/actions/ai-actions.ts (line 534)

---

## Components (Already Complete)

✅ `AIEnhancedTextarea` - components/ai-enhanced-textarea.tsx
✅ `AIQualityBadge` - components/ai-quality-badge.tsx
✅ `useAIQuality` hook - hooks/useAIQuality.ts

---

## Machine-Specific Context

The AI automatically adapts suggestions based on machine ID patterns:

- **SLT-** (Slitter/Rewinder): Blade alignment, tension settings, safety guards
- **FLX-** (Flexo Printer): Registration, impression pressure, hygiene protocols
- **LAM-** (Laminator): Temperature control, nip pressure, cleaning procedures
- **EXT-** (Extruder): Temperature zones, screw speed, material handling
- **BAG-** (Bag Maker): Sealing temperature, registration, cutting blade

Machine type is inferred from ID prefix in `analyzeMJCQualityInline`.

---

## Quality Gate Scoring (MJC-Specific)

**Total: 100 points**

- **Completeness (30%)**: Is problem fully described?
- **Accuracy (25%)**: Are repairs technically correct?
- **Clarity (20%)**: Can another technician understand?
- **Safety (15%)**: Are safety procedures followed?
- **Evidence (10%)**: Are measurements and settings documented?

**Threshold**: 75/100 required for submission

---

## Safety Keyword Detection

AI automatically flags safety-critical keywords:

- lockout, tagout, LOTO
- permit, hot work
- confined space
- electrical isolation
- pressure vessel
- high voltage

When detected, quality score increases and safety recommendations are emphasized.

---

## Implementation Checklist

1. ✅ Create integration test file
2. **[ ]** Add imports to MJC form
3. **[ ]** Add useAIQuality hook
4. **[ ]** Replace Section 6 Textarea with AIEnhancedTextarea
5. **[ ]** Replace Section 7 Textarea with AIEnhancedTextarea
6. **[ ]** Add quality gate to onSubmit handler
7. **[ ]** Test with different machine types
8. **[ ]** Verify safety keyword detection
9. **[ ]** Test quality gate blocking (score < 75)
10. **[ ]** Create E2E test scenarios

---

## Testing Approach

### Manual Testing (Priority)

1. **Fill MJC form with minimal data**
   - Machine ID: CMH-01
   - Category: Reactive
   - Type: Mechanical
   - Description: "Short" (expect red quality badge)

2. **Add detailed description**
   - Include: symptoms, measurements, impact
   - Watch quality score improve
   - Click "Get AI Help" - verify suggestion appears

3. **Test quality gate**
   - Submit with poor quality (score < 75) - should block
   - Improve description - resubmit - should pass

4. **Test machine-specific suggestions**
   - Try FLX-02 (Flexo) - expect hygiene keywords
   - Try SLT-01 (Slitter) - expect blade/tension keywords
   - Try LAM-03 (Laminator) - expect temperature keywords

5. **Test safety detection**
   - Type "lockout tagout" in description
   - Verify safety score increases

### E2E Tests (Playwright)

Create test file: `tests/e2e/mjc-ai-flow.spec.ts`

```typescript
test('MJC AI quality gate blocks low quality submission', async ({ page }) => {
  await page.goto('/mjc/new');

  // Fill minimal required fields
  await page.fill('[data-testid="machine-equipment-id"]', 'CMH-01');
  await page.click('[data-testid="maintenance-category-reactive"]');
  await page.click('[data-testid="maintenance-type-mechanical"]');

  // Poor quality description
  await page.fill('[data-testid="maintenance-description"]', 'Machine broken');

  // Try to submit
  await page.click('[data-testid="btn-submit"]');

  // Should show quality gate error
  await expect(page.getByText(/quality score.*below threshold/i)).toBeVisible();
});
```

---

## Demo Script for User Verification

1. **Open MJC form**: `/mjc/new`
2. **Fill Section 2**: Machine ID = FLX-02 (Flexo Printer)
3. **Fill Section 3**: Reactive Maintenance, Mechanical
4. **Fill Section 4**: Machine Down, Critical urgency
5. **Fill Section 6**: Type short description (see red badge)
6. **Click "Get AI Help"**: See machine-specific suggestion for Flexo
7. **Expand description**: Add measurements, safety notes (watch score improve)
8. **Fill Section 7**: Click "Get AI Help" for repair suggestions
9. **Try Submit with low score**: See quality gate block
10. **Improve and Resubmit**: Passes quality gate

---

## Rollback Plan

If issues occur:

```bash
cd C:/Users/mike/projects/OHiSee_Control_of_Non-Conforming_Products/ohisee-reports/app/mjc/new
cp page.tsx.backup page.tsx
```

---

## Performance SLAs

- **Inline quality check**: < 2 seconds
- **AI suggestion generation**: < 5 seconds
- **Quality gate validation**: < 3 seconds
- **Total form interaction**: < 10 seconds

---

## Next Steps

1. **Implement** the modifications shown above
2. **Test manually** using demo script
3. **Create E2E tests** for critical flows
4. **Measure performance** against SLAs
5. **Document** any issues or edge cases
6. **Deploy** to staging for user acceptance testing
