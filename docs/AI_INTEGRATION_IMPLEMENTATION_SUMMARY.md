# AI Quality Gate Integration - Implementation Summary

## Completion Status: Phase 2 (UI Integration) - Ready for Implementation

### Completed Deliverables

#### 1. Server Actions (`app/actions/ai-quality-actions.ts`) ✅
- `analyzeFieldQualityAction()` - Fast inline quality checks (<2s)
- `generateSuggestionsAction()` - AI suggestions for corrective actions
- `validateBeforeSubmitAction()` - Deep validation quality gate
- `classifyHazardAction()` - Hazard classification
- `recordSuggestionOutcomeAction()` - Learning feedback
- `recordSupervisorOverrideAction()` - Audit trail for overrides

**Security**: All AI interactions server-side, API keys never exposed to client

#### 2. React Hook (`hooks/useAIQuality.ts`) ✅
- Manages state for quality scores, suggestions, validation
- Debounced inline checks (3s default, configurable)
- Request cancellation on new typing
- Error handling and graceful degradation
- Suggestion acceptance tracking

**Usage**:
```typescript
const {
  qualityScore,
  isChecking,
  checkQualityInline,
  generateSuggestion,
  validateBeforeSubmit
} = useAIQuality({
  formType: 'nca',
  userId: 'user-123',
  debounceMs: 3000
});
```

#### 3. UI Components

**a) AIQualityBadge (`components/ai-quality-badge.tsx`)** ✅
- Color-coded quality scores (green >=75, yellow 60-74, red <60)
- Loading state with spinner
- Optional detailed breakdown
- Accessibility: ARIA labels, semantic colors

**b) AIEnhancedTextarea (`components/ai-enhanced-textarea.tsx`)** ✅
- Drop-in replacement for standard `<Textarea>`
- Integrated "Get AI Help" button
- Real-time quality badge display
- Character counter with minimum/maximum validation
- Focus states and error handling

**c) AIAssistantModal (`components/ai-assistant-modal.tsx`)** ✅
- Quality gate modal (appears when score < 75)
- Detailed score breakdown by category
- Errors and warnings display
- Supervisor override with required reason (20+ chars)
- Audit trail logging

---

## Integration Instructions

### NCA Form Integration

**File**: `app/nca/new/page.tsx`

#### Step 1: Add Imports

```typescript
import { useAIQuality } from '@/hooks/useAIQuality';
import { AIEnhancedTextarea } from '@/components/ai-enhanced-textarea';
import { AIAssistantModal } from '@/components/ai-assistant-modal';
import { AIQualityBadge } from '@/components/ai-quality-badge';
import { recordSupervisorOverrideAction } from '@/app/actions/ai-quality-actions';
import { Sparkles } from 'lucide-react';
```

#### Step 2: Initialize AI Hook

```typescript
export default function NewNCAPage(): React.ReactElement {
  // Existing state...
  const [ncaId, setNcaId] = useState<string | null>(null);

  // NEW: AI Quality Hook
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
    acceptSuggestion,
    clearError,
  } = useAIQuality({
    formType: 'nca',
    userId: 'current-user-id', // Get from session
    debounceMs: 3000,
  });

  // NEW: Quality Gate Modal State
  const [showQualityGate, setShowQualityGate] = useState(false);

  // Existing react-hook-form setup...
}
```

#### Step 3: Modify Section 4 (NC Description)

**Replace**:
```typescript
<Textarea
  data-testid="nc-description"
  rows={5}
  {...register('nc_description')}
/>
```

**With**:
```typescript
<AIEnhancedTextarea
  label="Description (minimum 100 characters)"
  value={ncDescription}
  onChange={(value) => {
    setValue('nc_description', value);
    // Trigger inline quality check (debounced)
    checkQualityInline({
      nca_id: ncaId || 'temp',
      nc_description: value,
      nc_type: watch('nc_type') || 'other',
      machine_status: watch('machine_status') || 'operational',
      cross_contamination: watch('cross_contamination') || false,
      disposition_rework: dispositionAction === 'rework',
      disposition_concession: dispositionAction === 'concession',
    });
  }}
  onAIHelp={() => {
    // Generate AI suggestion for description
    generateSuggestion({
      nca_id: ncaId || 'temp',
      nc_description: ncDescription,
      nc_type: watch('nc_type') || 'other',
      machine_status: watch('machine_status') || 'operational',
      cross_contamination: watch('cross_contamination') || false,
    });
  }}
  qualityScore={qualityScore?.score || null}
  isCheckingQuality={isChecking}
  isSuggesting={isSuggesting}
  showQualityBadge={true}
  minLength={100}
  maxLength={2000}
  rows={5}
  required
  data-testid="nc-description"
/>
```

#### Step 4: Add AI Help to Section 9 (Root Cause)

```typescript
<Card data-testid="nca-section-9" className="mb-6">
  <CardHeader>
    <CardTitle>Section 9: Root Cause Analysis</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Root Cause Analysis</Label>

        {/* NEW: AI Help Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => generateSuggestion({
            nca_id: ncaId || 'temp',
            nc_description: ncDescription,
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

      <Textarea
        data-testid="root-cause-analysis"
        rows={5}
        {...register('root_cause_analysis')}
      />

      {/* NEW: Show AI Quality Badge */}
      {qualityScore && (
        <div className="mt-2">
          <AIQualityBadge
            score={qualityScore.score}
            isChecking={isChecking}
            threshold={75}
            showDetails={true}
          />
        </div>
      )}

      {/* NEW: Show AI Suggestion */}
      {suggestions && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm font-medium text-blue-900 mb-2">
            AI Suggestion (Root Cause):
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
              onClick={() => setSuggestions(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>

    <FileUpload
      entityId={ncaId}
      uploadType="nca"
      onUpload={uploadNCAFile}
      onDelete={deleteNCAFile}
      onList={listNCAFiles}
      label="Root Cause Analysis Attachments"
      allowedTypes={['PDF', 'Images', 'Word', 'Excel', 'Text', 'CSV']}
      maxSizeMB={10}
    />
  </CardContent>
</Card>
```

#### Step 5: Add AI Enhanced Textarea to Section 10 (Corrective Action)

```typescript
<Card data-testid="nca-section-10" className="mb-6">
  <CardHeader>
    <CardTitle>Section 10: Corrective Action</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <AIEnhancedTextarea
      label="Corrective Action"
      value={watch('corrective_action') || ''}
      onChange={(value) => {
        setValue('corrective_action', value);
        checkQualityInline({
          nca_id: ncaId || 'temp',
          nc_description: ncDescription,
          nc_type: watch('nc_type') || 'other',
          machine_status: watch('machine_status') || 'operational',
          cross_contamination: watch('cross_contamination') || false,
          corrective_action: value,
        });
      }}
      onAIHelp={() => generateSuggestion({
        nca_id: ncaId || 'temp',
        nc_description: ncDescription,
        nc_type: watch('nc_type') || 'other',
        machine_status: watch('machine_status') || 'operational',
        cross_contamination: watch('cross_contamination') || false,
      })}
      qualityScore={qualityScore?.score || null}
      isCheckingQuality={isChecking}
      isSuggesting={isSuggesting}
      showQualityBadge={true}
      minLength={30}
      rows={5}
      data-testid="corrective-action"
    />

    <FileUpload
      entityId={ncaId}
      uploadType="nca"
      onUpload={uploadNCAFile}
      onDelete={deleteNCAFile}
      onList={listNCAFiles}
      label="Corrective Action Attachments"
      allowedTypes={['PDF', 'Images', 'Word', 'Excel', 'Text', 'CSV']}
      maxSizeMB={10}
    />
  </CardContent>
</Card>
```

#### Step 6: Modify Submit Handler (Quality Gate)

```typescript
const onSubmit = useCallback(async (data: NCAFormData) => {
  setIsSubmitting(true);
  setSubmitError(null);
  setSubmitSuccess(false);

  try {
    // NEW: Deep validation before submit
    const validation = await validateBeforeSubmit({
      nca_id: ncaId || 'temp',
      nc_description: data.nc_description,
      nc_type: data.nc_type || 'other',
      nc_type_other: data.nc_type === 'other' ? data.nc_type_other : undefined,
      machine_status: data.machine_status || 'operational',
      machine_down_since: data.machine_down_since,
      cross_contamination: data.cross_contamination || false,
      disposition_rework: data.disposition_action === 'rework',
      disposition_concession: data.disposition_action === 'concession',
      root_cause_analysis: data.root_cause_analysis,
      corrective_action: data.corrective_action,
      work_order_id: data.wo_number,
    });

    if (!validation.success) {
      setSubmitError(validation.error || 'Validation failed');
      setIsSubmitting(false);
      return;
    }

    // NEW: Quality Gate Check
    if (validation.data && validation.data.quality_assessment.score < 75) {
      setShowQualityGate(true);
      setIsSubmitting(false);
      return;
    }

    // Existing: Submit to database
    const response = await createNCA(data);

    if (!response.success) {
      setSubmitError(response.error || 'Failed to submit NCA');
      return;
    }

    // Success!
    setSubmitSuccess(true);
    setNcaNumber(response.data?.nca_number || null);
    setNcaId(response.data?.id || null);
  } catch (error) {
    console.error('Unexpected submission error:', error);
    setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
  } finally {
    setIsSubmitting(false);
  }
}, [validateBeforeSubmit]);
```

#### Step 7: Add Quality Gate Modal and Handlers

```typescript
// NEW: Handle quality gate "Go Back & Edit"
const handleQualityGateGoBack = useCallback(() => {
  setShowQualityGate(false);
  // Auto-focus on first low-score field
  document.querySelector('[data-testid="nc-description"]')?.scrollIntoView({ behavior: 'smooth' });
}, []);

// NEW: Handle quality gate "Submit Anyway" (supervisor override)
const handleQualityGateOverride = useCallback(async (reason: string) => {
  setIsSubmitting(true);

  try {
    // Log override for audit
    await recordSupervisorOverrideAction(
      'nca',
      ncaId || 'pending',
      validationResult?.quality_assessment.score || 0,
      reason,
      'current-user-id' // Get from session
    );

    // Proceed with submission
    const formData = watch();
    const response = await createNCA(formData);

    if (!response.success) {
      setSubmitError(response.error || 'Failed to submit NCA');
      return;
    }

    // Success!
    setSubmitSuccess(true);
    setNcaNumber(response.data?.nca_number || null);
    setShowQualityGate(false);
  } catch (error) {
    console.error('Override submission error:', error);
    setSubmitError(error instanceof Error ? error.message : 'Override failed');
  } finally {
    setIsSubmitting(false);
  }
}, [ncaId, validationResult, watch]);

// Add modal to return JSX
return (
  <div className="container mx-auto p-6 max-w-5xl">
    {/* Existing form... */}

    {/* NEW: Quality Gate Modal */}
    <AIAssistantModal
      open={showQualityGate}
      onClose={() => setShowQualityGate(false)}
      validationResult={validationResult}
      onGoBack={handleQualityGateGoBack}
      onSubmitAnyway={handleQualityGateOverride}
    />
  </div>
);
```

---

## MJC Form Integration

**File**: `app/mjc/new/page.tsx`

Apply same patterns as NCA with these differences:

1. **Section 6 (Maintenance Description)**: Use `AIEnhancedTextarea`
2. **Section 7 (Maintenance Performed)**: Add "Generate AI Suggestion" button
3. **Section 8 (Preventative Measures)**: AI suggestions for prevention
4. **Quality Gate**: Reference Section 4 Site Standards (not Section 5)

Key differences in AI context:
```typescript
checkQualityInline({
  mjc_id: mjcId || 'temp',
  description_required: maintenanceDescription,
  maintenance_category: watch('maintenance_category') || 'reactive',
  maintenance_type_electrical: watch('maintenance_type') === 'electrical',
  maintenance_type_mechanical: watch('maintenance_type') === 'mechanical',
  maintenance_type_pneumatical: watch('maintenance_type') === 'pneumatical',
  machine_status: watch('machine_status') || 'operational',
  urgency: watch('urgency_level') || 'medium',
  temporary_repair: watch('temporary_repair') === 'yes',
  machine_equipment: watch('machine_equipment_id') || '',
});
```

---

## Testing Strategy

### Unit Tests (`tests/unit/ai-components.test.tsx`)

```typescript
describe('AIQualityBadge', () => {
  it('shows green badge for score >= 75', () => {
    render(<AIQualityBadge score={82} threshold={75} />);
    expect(screen.getByTestId('quality-badge')).toHaveAttribute('data-score', '82');
  });

  it('shows loading state', () => {
    render(<AIQualityBadge score={null} isChecking={true} />);
    expect(screen.getByTestId('quality-badge-loading')).toBeInTheDocument();
  });
});

describe('useAIQuality', () => {
  it('debounces inline checks', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAIQuality({
      formType: 'nca',
      userId: 'test-user',
      debounceMs: 3000
    }));

    act(() => {
      result.current.checkQualityInline({ nc_description: 'Test' });
    });

    expect(result.current.isChecking).toBe(false); // Not checking yet

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(result.current.isChecking).toBe(true);
    });
  });
});
```

### Integration Tests (`tests/integration/nca-ai-integration.test.tsx`)

```typescript
describe('NCA Form AI Integration', () => {
  it('shows quality gate when score < 75', async () => {
    // Mock AI service to return low score
    mockValidateBeforeSubmit.mockResolvedValue({
      success: true,
      data: {
        valid: true,
        quality_assessment: { score: 68, threshold_met: false },
        errors: [],
        warnings: [{ field: 'nc_description', message: 'Too short', suggestion: 'Add more detail' }]
      }
    });

    render(<NewNCAPage />);

    // Fill form with minimal data
    await userEvent.type(screen.getByTestId('nc-description'), 'Test');
    await userEvent.click(screen.getByTestId('nc-type-wip'));

    // Submit
    await userEvent.click(screen.getByTestId('btn-submit'));

    // Verify quality gate appears
    expect(screen.getByTestId('quality-gate-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-quality-score')).toHaveTextContent('68/100');
  });
});
```

### E2E Tests (`tests/e2e/nca-ai-quality-gate.spec.ts`)

```typescript
test('Complete NCA with AI assistance', async ({ page }) => {
  await page.goto('/nca/new');

  // Fill description
  await page.fill('[data-testid="nc-description"]', 'Product seal failure detected during quality inspection...');

  // Wait for inline quality check
  await page.waitForTimeout(4000);

  // Verify quality badge appears
  await expect(page.locator('[data-testid="quality-badge"]')).toBeVisible();

  // Click "Generate AI Corrective Action"
  await page.click('text="Get AI Help"');

  // Wait for AI response
  await expect(page.locator('text="AI Suggestion"')).toBeVisible();

  // Accept suggestion
  await page.click('text="Accept Suggestion"');

  // Verify text populated
  const corrective = await page.inputValue('[data-testid="corrective-action"]');
  expect(corrective.length).toBeGreaterThan(50);

  // Submit
  await page.click('[data-testid="btn-submit"]');

  // Verify success
  await expect(page.locator('text="NCA created successfully"')).toBeVisible();
});
```

---

## Deployment Checklist

- [ ] Server actions tested and working
- [ ] All UI components render correctly
- [ ] NCA form integration complete
- [ ] MJC form integration complete
- [ ] Quality gate modal functional
- [ ] Supervisor override logging works
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Error handling graceful (AI unavailable fallback)
- [ ] Performance: inline checks < 2s, suggestions < 5s
- [ ] Accessibility: keyboard navigation, screen readers
- [ ] Documentation updated

---

## Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Inline quality check | <2s | _To measure_ |
| AI suggestion generation | <5s | _To measure_ |
| Deep validation | <30s | _To measure_ |
| Modal render | <100ms | _To measure_ |

---

## Backward Compatibility

All existing functionality MUST work:
- ✅ Save draft without AI validation
- ✅ File uploads unchanged
- ✅ All existing fields unchanged
- ✅ Form validation rules preserved
- ✅ RLS policies still enforced
- ✅ Audit trail still logged

---

## Next Steps

1. **Implement NCA form integration** (use code samples above)
2. **Implement MJC form integration** (adapt NCA patterns)
3. **Write unit tests** for components and hook
4. **Write integration tests** for form interactions
5. **Write E2E tests** with Playwright
6. **Manual testing** on dev environment
7. **Code review** with focus on backward compatibility
8. **Deploy to staging** for UAT
9. **Production deployment** with feature flag

---

**Estimated Implementation Time**: 4-6 hours for both forms + tests

**Contact**: Development Team Lead for questions or blockers
