# Phase 6: Testing & Validation Guide

**Date**: 2025-11-10  
**Status**: ✅ Complete

## Overview

This guide covers the comprehensive test suite for the Content Model Policy Engine quality enforcement system. All tests validate that the system enforces quality standards while maintaining zero visible AI references.

---

## Test Suite Structure

### 1. Unit Tests

#### Component Tests
- **`components/__tests__/enhanced-textarea.test.tsx`** (51 tests)
  - Rendering, character counting, help button, quality indicator, error handling
  - Updated to use `EnhancedTextarea`, `QualityIndicator`, and new prop names
  - Tests live checklist functionality

- **`components/__tests__/quality-indicator.test.tsx`** (47 tests)
  - Updated text expectations: "Validating...", "Meets requirements", "Review recommended", "Incomplete"
  - Score display, threshold validation, accessibility

- **`components/__tests__/quality-gate-modal.test.tsx`** (NEW - 15+ tests)
  - Submission validation display
  - Requirements checklist rendering
  - Manager approval flow with justification
  - Error and warning display

#### Hook Tests
- **`hooks/__tests__/useQualityValidation.test.ts`** (42 tests)
  - Updated to use `validateFieldQualityAction`, `getWritingAssistanceAction`, `validateSubmissionAction`
  - Debouncing, error handling, state management

#### Service Tests
- **`lib/services/__tests__/quality-enforcement-service.test.ts`** (NEW - 20+ tests)
  - Description completeness validation
  - Root cause depth validation (5-Why)
  - Corrective action specificity validation
  - Vague language detection
  - Required details detection

- **`lib/services/__tests__/adaptive-enforcement.test.ts`** (NEW - 15+ tests)
  - Enforcement level determination
  - Progressive escalation logic
  - User pattern analysis
  - Content pattern detection
  - Escalation message generation

#### Schema Tests
- **`lib/validations/__tests__/nca-schema.test.ts`** (NEW - 15+ tests)
  - Dynamic minimum length based on NC type
  - Root cause 5-Why depth enforcement
  - Corrective action specificity requirements

### 2. Integration Tests

- **`tests/integration/adaptive-enforcement.test.ts`** (NEW - 10+ tests)
  - Progressive escalation workflow
  - Persistent issue tracking
  - Real-world validation scenarios

- **`tests/integration/manager-approval-flow.test.ts`** (NEW - 8+ tests)
  - Complete manager approval workflow
  - Enforcement action logging
  - Justification requirements

### 3. Performance Tests

- **`tests/performance/validation-performance.test.ts`** (NEW - 8+ tests)
  - Rule-based validation performance (<10ms per check)
  - Adaptive enforcement performance (<5ms)
  - End-to-end validation pipeline (<100ms)
  - Memory efficiency

---

## Running Tests

### All Tests
```bash
npm test
```

### Component Tests Only
```bash
npm run test:react
```

### Service Tests Only
```bash
npx jest lib/services/__tests__
```

### Integration Tests
```bash
npm run test:integration
```

### Performance Tests
```bash
npx jest tests/performance
```

### With Coverage
```bash
npm run test:coverage
```

---

## Test Coverage Targets

- **Statements**: 95%+
- **Branches**: 90%+
- **Functions**: 95%+
- **Lines**: 95%+

---

## Key Test Scenarios

### Validation Rules
✅ Each NC type enforces correct minimum description length  
✅ Root cause with only one "why" triggers validation requirement  
✅ Corrective action without procedure reference is flagged  
✅ Vague words like "bad" or "broken" suggest requirement for more detail

### Adaptive Enforcement
✅ Same input submitted 3 times changes ValidationResult structure  
✅ First attempt: Soft hints + checklist (non-blocking)  
✅ Second attempt: Convert missing items into required fields  
✅ Third attempt: Route to ManagerApprovalFlow

### Manager Approval
✅ Submit form that fails → simulate manager providing approval  
✅ Ensure justification is logged (minimum 50 characters)  
✅ Ensure record is saved with approval metadata

### Performance
✅ Validation checks complete in <100ms end-to-end  
✅ No noticeable lag on typical inputs  
✅ 60fps maintained during typing

---

## User Acceptance Testing (UAT) Checklist

### Test Scenarios

1. **Perfect Form Submission**
   - Fill all fields completely and accurately
   - Expected: Pass validation on first attempt
   - Verify: No AI references visible

2. **Minimal Effort Form**
   - Submit with minimal information
   - Expected: See all levels of enforcement (soft → moderate → strict → manager approval)
   - Verify: Requirements checklist shows missing items

3. **Edge Cases**
   - Very unusual incident
   - Unusual NC type combinations
   - Expected: System still works, logs anomaly if needed

4. **Neuro-Diverse User Testing**
   - Test with users who prefer reduced motion
   - Verify: Live checklist is helpful, not overwhelming
   - Verify: Option to hide live feedback if preferred

### Feedback Collection

**Questions for Users:**
- Are the hints and placeholders helpful, or do you ignore them?
- Do the validation messages make sense? Any wording that confuses you?
- Does anyone notice it's AI-driven? (Ideally no)
- Does the form feel more strict or just clearer about requirements?

---

## Documentation Updates

### User Documentation
- Update user-facing manuals to describe new submission process
- Emphasize system checks for completeness and requirements
- Provide examples of good vs bad submissions
- Remove any mention of AI assistance
- Call it "Quality Enforcement System" or "Submission Validation"

### Developer Documentation
- Architecture document explaining AI usage under the hood
- How multi-agent or LLM analysis works (if implemented)
- How to update rules
- How to interpret logs
- Decision-making process documentation

### Admin Guide
- Admin interface or config for rules
- Process for updating AI model or prompt
- How to change min lengths or toggle checks
- Policy versioning process

### Compliance Audit Documentation
- Short explanation of how system ensures BRCGS/GMP compliance
- List each relevant clause and how form enforces it
- Example: "Clause X.Y requires we document time of incidents – our system enforces that by not allowing submission without a time in the description."

---

## Test Maintenance

### When to Update Tests
- When adding new validation rules
- When changing enforcement levels
- When updating UI text or components
- When modifying adaptive enforcement logic

### Test Data Management
- Use factory functions for test data creation
- Clean up test data after each test suite
- Use realistic but anonymized data

---

## Success Criteria

✅ All unit tests pass  
✅ All integration tests pass  
✅ Performance targets met (<100ms validation)  
✅ Zero "AI" strings in test expectations  
✅ Test coverage ≥95%  
✅ UAT feedback positive (no confusion, helpful guidance)  
✅ No complaints of system being "too confusing" or "too strict without explanation"

