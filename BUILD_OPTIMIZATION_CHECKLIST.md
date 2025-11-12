# Build Optimization Implementation Checklist

## CRITICAL PRIORITY (Do First)

### 1. Configure next.config.ts ⚠️ EMPTY FILE
**Current**: Completely empty with placeholder comment only
**Effort**: 1 hour
**Priority**: CRITICAL - This is the #1 issue

- [ ] Add swcMinify: true
- [ ] Add compress: true
- [ ] Configure image optimization
- [ ] Add experimental features
- [ ] Add logging configuration

**Expected Impact**: 50-100KB reduction

### 2. Install Bundle Analyzer
```bash
npm install --save-dev @next/bundle-analyzer
```
**Effort**: 30 minutes
**Blocking**: Yes - needed to measure progress

- [ ] Install @next/bundle-analyzer
- [ ] Configure in next.config.ts
- [ ] Test with: ANALYZE=true npm run build

**Expected Impact**: Visibility into bundle composition

### 3. Update TypeScript Target (ES2017 → ES2020)
**File**: tsconfig.json, line 3
**Effort**: 15 minutes

- [ ] Change target from "ES2017" to "ES2020"
- [ ] Add "noUnusedLocals": true
- [ ] Add "noUnusedParameters": true

**Expected Impact**: 15-20KB reduction

### 4. Optimize Font Loading
**File**: app/layout.tsx (lines 11-21)
**Effort**: 1 hour

- [ ] Reduce Poppins weights: ["400", "500", "600", "700"] → ["400", "600"]
- [ ] Reduce Inter weights: ["400", "500", "600", "700"] → ["400", "500"]
- [ ] Add display: "swap" to both
- [ ] Add preload: true to Poppins only

**Expected Impact**: 20-30KB reduction

---

## HIGH PRIORITY (Week 2)

### 5. Implement Dynamic Imports for Modals
**Files**: 
- app/nca/[id]/page.tsx
- app/nca/new/page.tsx
- Any other pages with modals

**Effort**: 3-4 hours

- [ ] Add dynamic import for QualityGateModal
- [ ] Add dynamic import for AIAssistantModal
- [ ] Add dynamic import for WritingAssistantModal
- [ ] Add loading fallback components
- [ ] Test modal functionality

**Expected Impact**: 150-200KB deferred from initial bundle

### 6. Add CSS Minification
**File**: postcss.config.mjs
**Effort**: 30 minutes

- [ ] Install cssnano: npm install --save-dev cssnano
- [ ] Add cssnano plugin to PostCSS config
- [ ] Test build output size

**Expected Impact**: 30-50KB reduction

### 7. Code Split Dashboard Charts
**Files**: 
- app/dashboard/production/page.tsx
- app/dashboard/management/page.tsx

**Effort**: 2-3 hours

- [ ] Add dynamic import for NCAChart
- [ ] Add dynamic import for MaintenanceChart
- [ ] Add chart loading skeletons
- [ ] Test chart rendering

**Expected Impact**: 100-150KB deferred

### 8. Lazy Load AI Services
**File**: app/actions/ai-actions.ts
**Effort**: 2 hours

- [ ] Extract AI service imports into functions
- [ ] Use dynamic imports in server actions
- [ ] Test AI quality checks still work
- [ ] Measure bundle size improvement

**Expected Impact**: 250-300KB deferred

---

## MEDIUM PRIORITY (Week 3)

### 9. Consider Recharts Alternative
**Current Usage**: 2 chart components only
**Effort**: 2-3 hours

- [ ] Audit all Recharts usage (find if maintenance-response-chart used)
- [ ] Decide: Keep with dynamic import OR switch to lighter lib (visx)
- [ ] If keeping: Ensure charts use dynamic import
- [ ] If switching: Implement and test new library

**Expected Impact**: 100-150KB reduction or deferral

### 10. Remove Unused Dependencies
**Files**: package.json
**Effort**: 30 minutes

- [ ] Verify ts-node is not used (tsx is modern alternative)
- [ ] Check if tw-animate-css animations are all used
- [ ] Remove unused devDependencies
- [ ] Run npm audit fix

**Expected Impact**: Cleaner deps, faster install

### 11. Add ESLint Performance Rules
**File**: eslint.config.mjs
**Effort**: 1 hour

- [ ] Add Next.js specific rules for performance
- [ ] Add rule for dynamic imports requirement
- [ ] Add rule to catch React.memo violations
- [ ] Configure in build pipeline

**Expected Impact**: Catch performance regressions early

---

## VERIFICATION CHECKLIST

### Before Starting
- [ ] Current bundle size measured with bundle analyzer
- [ ] Baseline metrics recorded
- [ ] Branch created for optimization work

### After Each Change
- [ ] Build succeeds: npm run build
- [ ] No TypeScript errors: npx tsc --noEmit
- [ ] Bundle size checked: ANALYZE=true npm run build
- [ ] No console errors when testing UI
- [ ] Performance improved or stable

### Final Verification
- [ ] All 4 critical items completed
- [ ] Bundle analyzer shows 15-20% improvement
- [ ] Build time same or faster
- [ ] All tests pass
- [ ] No new console warnings

---

## SIZE TRACKING

### Before Optimization
- Estimated Total Bundle: 2.5-3.0 MB
- Initial JS: Unknown
- Initial CSS: Unknown
- Build size: Unknown (need analyzer)

### Target After Fixes
- Total Bundle: 2.0-2.3 MB (20% reduction)
- Initial JS: <250KB
- Initial CSS: <100KB
- No performance regression

### Stretch Goal (if time permits)
- Dynamic imports + deferral: <1.5MB
- Code splitting + AI lazy load: <1.2MB
- React.memo optimization: <1.0MB (separate analysis)

---

## Command Reference

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Run build with size analysis
ANALYZE=true npm run build

# Check bundle size history
npm run build && du -sh .next

# Profile TypeScript compilation
tsc --noEmit --listFiles > /tmp/ts-files.txt

# Check for unused code
npx ts-unused-exports tsconfig.json

# Test production build locally
npm run build
npm run start
```

---

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|-----------|-----------|
| next.config.ts changes | LOW | Incremental changes, test each |
| TypeScript ES2020 target | LOW | Test on multiple browsers |
| Font optimization | LOW | Visual testing on slow 3G |
| Dynamic imports | MEDIUM | Error boundaries, loading states |
| Remove dependencies | LOW | Verify in all entry points first |

---

## Rollback Plan

If something breaks:
1. Revert last change: `git checkout -- <file>`
2. Rebuild and test: `npm run build`
3. Verify bundle size: `ANALYZE=true npm run build`
4. Check console for errors
5. Create GitHub issue if blockers found

---

## Success Criteria

✅ **Build passes** without errors  
✅ **Bundle 15-20% smaller** (measured with analyzer)  
✅ **No visual regressions** (manual testing)  
✅ **No performance regressions** (Lighthouse scores same)  
✅ **All existing tests pass**  
✅ **No new console warnings**  

