# AI Quality Gate Integration - Next Steps Checklist

## Immediate Actions (Do Today)

### 1. Fix Phase 1 TypeScript Errors

**File**: `ohisee-reports/app/actions/ai-actions.ts`
**Issue**: Type errors preventing Next.js build
**Priority**: CRITICAL - blocks all development

```bash
cd ohisee-reports
npm run build  # Will show errors
# Fix type issues in ai-actions.ts
# Then verify: npm run build
```

---

### 2. Integrate AI into NCA Form

**File**: `ohisee-reports/app/nca/new/page.tsx`
**Time**: 2-3 hours
**Reference**: `AI_INTEGRATION_QUICK_START.md`

**Steps**:

- [ ] Add imports (lines 1-17)
- [ ] Initialize `useAIQuality` hook (after line 55)
- [ ] Replace Section 4 textarea (line 346-366)
- [ ] Add Section 9 AI button (line 642-665)
- [ ] Replace Section 10 textarea (line 669-692)
- [ ] Modify submit handler (line 98-130)
- [ ] Add quality gate modal handlers
- [ ] Add modal to JSX (end of return)

**Test**:

```bash
npm run dev
# Navigate to http://localhost:3000/nca/new
# Type in description → Wait 3s → Check quality badge appears
# Click "Get AI Help" → Verify suggestion appears
# Submit form → Verify quality gate modal appears if score < 75
```

---

## This Week

### 3. Integrate AI into MJC Form

**File**: `ohisee-reports/app/mjc/new/page.tsx`
**Time**: 2-3 hours
**Reference**: Apply same patterns as NCA

**Steps**:

- [ ] Add imports
- [ ] Initialize hook
- [ ] Section 6: Maintenance Description (AIEnhancedTextarea)
- [ ] Section 7: Maintenance Performed (AI Help button)
- [ ] Section 8: Additional Comments (optional AI)
- [ ] Modify submit handler
- [ ] Add quality gate modal

**Test**: Same as NCA, navigate to `/mjc/new`

---

### 4. Write Unit Tests

**Time**: 3-4 hours

**Create Files**:

```
ohisee-reports/hooks/__tests__/useAIQuality.test.ts
ohisee-reports/components/__tests__/ai-quality-badge.test.tsx
ohisee-reports/components/__tests__/ai-enhanced-textarea.test.tsx
ohisee-reports/components/__tests__/ai-assistant-modal.test.tsx
```

**Run**:

```bash
npm test hooks/useAIQuality.test.ts
npm test components/__tests__/ai-*.test.tsx
npm run test:coverage  # Verify >=80% coverage
```

**Coverage Targets**:

- useAIQuality: 90%+
- AIQualityBadge: 85%+
- AIEnhancedTextarea: 85%+
- AIAssistantModal: 80%+

---

### 5. Write Integration Tests

**Time**: 2-3 hours

**Create Files**:

```
ohisee-reports/tests/integration/nca-ai-integration.test.tsx
ohisee-reports/tests/integration/mjc-ai-integration.test.tsx
```

**Test Scenarios**:

- [ ] Quality gate appears when score < 75
- [ ] Quality gate bypassed when score >= 75
- [ ] Confidential reports bypass quality gate
- [ ] Supervisor override requires 20+ chars
- [ ] AI suggestions can be accepted/dismissed
- [ ] Debouncing works (inline checks)
- [ ] Error handling graceful (AI unavailable)

**Run**:

```bash
npm test tests/integration/nca-ai-integration.test.tsx
npm test tests/integration/mjc-ai-integration.test.tsx
```

---

## Next Week

### 6. Write E2E Tests

**Time**: 2-3 hours

**Create Files**:

```
ohisee-reports/tests/e2e/nca-ai-quality-gate.spec.ts
ohisee-reports/tests/e2e/mjc-ai-suggestions.spec.ts
```

**Test Scenarios**:

- [ ] Complete NCA form with AI assistance
- [ ] Quality gate blocks submission (score < 75)
- [ ] Supervisor override workflow
- [ ] Accept AI suggestion workflow
- [ ] Performance: inline check < 2s
- [ ] Performance: AI suggestion < 5s

**Run**:

```bash
npx playwright test tests/e2e/nca-ai-quality-gate.spec.ts
npx playwright test tests/e2e/mjc-ai-suggestions.spec.ts
npx playwright show-report
```

---

### 7. Code Review

**Time**: 1 hour

**Checklist**:

- [ ] All files follow project conventions
- [ ] TypeScript strict mode passes
- [ ] No console.log left in production code
- [ ] Error handling comprehensive
- [ ] Comments explain "why", not "what"
- [ ] Security: No API keys exposed
- [ ] Performance: No unnecessary re-renders
- [ ] Accessibility: Keyboard nav works
- [ ] Backward compatibility: All existing features work

**Review Meeting**:

- Present implementation to team
- Demo quality gate workflow
- Discuss any concerns
- Get approval to deploy

---

### 8. Deploy to Staging

**Time**: 1 hour

**Steps**:

- [ ] Merge to `staging` branch
- [ ] Run full test suite
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Verify database migrations applied
- [ ] Check environment variables set

**Staging URL**: [Add your staging URL]

---

### 9. User Acceptance Testing (UAT)

**Time**: 2-3 hours

**Test Users**:

- [ ] QA Supervisor (test quality gates)
- [ ] Operator (test AI suggestions)
- [ ] Team Leader (test supervisor override)

**Scenarios**:

- [ ] Create NCA with high-quality input → No quality gate
- [ ] Create NCA with low-quality input → Quality gate blocks
- [ ] Override quality gate with valid reason
- [ ] Use AI suggestions and edit
- [ ] Submit confidential report (bypass)

**Feedback Form**: [Link to feedback form]

---

## Production Deployment

### 10. Feature Flag Setup

**Time**: 30 minutes

**Implementation**:

```typescript
const AI_QUALITY_GATE_ENABLED = process.env.NEXT_PUBLIC_AI_QUALITY_GATE_ENABLED === 'true';

// In form component
{AI_QUALITY_GATE_ENABLED && (
  <AIEnhancedTextarea ... />
)}
```

**Environment Variables**:

```bash
# .env.production
NEXT_PUBLIC_AI_QUALITY_GATE_ENABLED=false  # Start disabled

# Enable gradually
# 10% rollout: Set to true for 10% of users
# 50% rollout: Set to true for 50% of users
# 100% rollout: Set to true for all users
```

---

### 11. Production Deployment

**Time**: 1 hour

**Pre-Deployment Checklist**:

- [ ] All tests passing
- [ ] UAT approved
- [ ] Code review complete
- [ ] Staging deployment successful
- [ ] Database migrations ready
- [ ] Environment variables set
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

**Deployment Steps**:

1. Merge to `main` branch
2. Tag release: `git tag v2.1.0-ai-quality-gate`
3. Deploy to production
4. Run smoke tests
5. Enable feature flag (10% rollout)
6. Monitor metrics for 24 hours
7. Increase to 50% if stable
8. Monitor for 48 hours
9. Increase to 100% if stable

---

### 12. Post-Deployment Monitoring

**Time**: Ongoing (first week critical)

**Metrics to Watch**:

- [ ] Error rate < 1%
- [ ] Inline check latency < 2s (avg)
- [ ] AI suggestion latency < 5s (avg)
- [ ] Quality gate show rate 30-40%
- [ ] Supervisor override rate < 10%
- [ ] User acceptance rate > 60%

**Dashboards**:

- Application Performance Monitoring (APM)
- Error tracking (Sentry/similar)
- Database query performance
- User analytics

**Daily Checks (First Week)**:

- Check error logs
- Review quality gate metrics
- Monitor AI API costs
- Collect user feedback
- Review supervisor overrides

---

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Lint code

# Testing
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npx playwright test            # Run E2E tests
npx playwright show-report     # View E2E results

# TypeScript
npx tsc --noEmit              # Check types
npx tsc --watch --noEmit      # Watch types

# Database
npm run db:migrate            # Run migrations
npm run db:seed               # Seed test data
npm run db:reset              # Reset database
```

---

## Success Criteria

### Phase 2 Complete When

- [x] Server actions created
- [x] React hook created
- [x] UI components created
- [x] Documentation complete
- [ ] NCA form integrated
- [ ] MJC form integrated
- [ ] Unit tests >=80% coverage
- [ ] Integration tests passing
- [ ] E2E tests passing

### Production Ready When

- [ ] All Phase 2 criteria met
- [ ] Code review approved
- [ ] Staging deployment successful
- [ ] UAT approved
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained

---

## Troubleshooting

### Common Issues

**Issue**: AI service not responding
**Fix**: Check `.env.local` has `ANTHROPIC_API_KEY`

**Issue**: Quality badge never appears
**Fix**: Verify `checkQualityInline()` is called (debounced 3s)

**Issue**: Modal doesn't show
**Fix**: Check `showQualityGate` state and validation result

**Issue**: TypeScript errors
**Fix**: Import types from `@/lib/ai/types`

**Issue**: Build fails
**Fix**: Fix Phase 1 errors in `ai-actions.ts` first

---

## Help & Resources

**Documentation**:

- Full Guide: `AI_INTEGRATION_IMPLEMENTATION_SUMMARY.md`
- Quick Reference: `AI_INTEGRATION_QUICK_START.md`
- Technical Details: `INTEGRATION_COMPLETION_SUMMARY.md`
- Delivery Summary: `DELIVERY_SUMMARY.md`

**Code Examples**:

- All documentation has copy-paste ready code
- Check existing files for patterns
- Use TypeScript for type hints

**Support**:

- Development Team Lead
- Code reviews: [Schedule link]
- Questions: [Slack channel or email]

---

## Time Estimates

| Task | Estimated Time | Actual Time |
|------|----------------|-------------|
| Fix Phase 1 errors | 1-2 hours | ___ hours |
| NCA form integration | 2-3 hours | ___ hours |
| MJC form integration | 2-3 hours | ___ hours |
| Unit tests | 3-4 hours | ___ hours |
| Integration tests | 2-3 hours | ___ hours |
| E2E tests | 2-3 hours | ___ hours |
| Code review | 1 hour | ___ hours |
| UAT | 2-3 hours | ___ hours |
| Deployment | 1 hour | ___ hours |
| **Total** | **16-23 hours** | **___ hours** |

---

**Start Date**: ___________
**Target Completion**: ___________
**Actual Completion**: ___________

**Status**: Phase 2 Complete - Ready to Begin Integration
