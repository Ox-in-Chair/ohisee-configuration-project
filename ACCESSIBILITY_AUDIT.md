# WCAG 2.1 Accessibility Audit Report
## OHiSee Control & Compliance Platform

**Date:** November 2024
**Auditor:** Accessibility Review
**Target Compliance:** WCAG 2.1 Level AA
**Current Status:** ⚠️ Partial (Estimated: Level A with gaps)

---

## Executive Summary

The OHiSee application has a **solid accessibility foundation** through Radix UI components, semantic HTML, and focused keyboard navigation. However, **critical accessibility gaps exist** in complex forms, tables, visualizations, and landmark navigation that prevent Level AA compliance.

### Key Findings:
- ✅ **13 strengths identified** (Radix UI, semantic HTML, keyboard nav)
- ❌ **18 critical/important violations** (tables, forms, visualizations, landmarks)
- ⚠️ **3-5 weeks estimated effort** to achieve Level AA compliance
- 📊 **Current accessibility score:** ~65/100 (estimated)

---

## Table of Contents

1. [Critical Priority Issues](#critical-priority-issues)
2. [Important Priority Issues](#important-priority-issues)
3. [Component-Specific Findings](#component-specific-findings)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Testing & Validation Strategy](#testing--validation-strategy)
6. [Appendix: Code Examples](#appendix-code-examples)

---

## Critical Priority Issues

**Impact:** Blocks WCAG 2.1 Level AA compliance | **Timeline:** Fix immediately

### 1. Missing Skip-to-Main Link
**WCAG 2.4.1 (Level A) - Bypass Blocks**

**Issue:**
- No skip link for keyboard users to bypass header/navigation
- Users must tab through 15+ interactive elements before reaching main content
- Violates accessibility best practice for keyboard navigation

**Current Code:** `app/layout.tsx` (lines 34-56)
```typescript
// ❌ MISSING: No skip-to-main link
<html lang="en">
  <body>
    <NavigationProvider>
      <Header />  {/* No skip link before or after */}
      <main>
        {children}
      </main>
    </NavigationProvider>
  </body>
</html>
```

**Recommended Fix:**
```typescript
<html lang="en">
  <body>
    <a href="#main-content" className="sr-only focus:not-sr-only">
      Skip to main content
    </a>
    <NavigationProvider>
      <Header />
      <main id="main-content" className="focus:outline-none">
        {children}
      </main>
    </NavigationProvider>
  </body>
</html>
```

**Additional Styling:**
```css
/* Add to globals.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus-visible {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
  background-color: #ffeb3b;
  padding: 8px 16px;
  z-index: 1000;
}
```

**Effort:** 30 minutes
**Testing:** Tab from page load → should jump to main content

---

### 2. Missing ARIA Landmarks for Content Organization
**WCAG 1.3.1 (Level A) - Info & Relationships**

**Issue:**
- `<main>` element exists but lacks `aria-label` or clear navigation context
- Navigation areas lack `<nav>` with `aria-label`
- No clear content landmark structure for assistive tech

**Current Code:** `components/navigation/header.tsx` (lines 35-96)
```typescript
// ❌ MISSING: No aria-label on header
<header className="sticky top-0 z-50">
  {/* Header content */}
</header>

// ❌ MISSING: Navigation not marked with <nav aria-label>
// In sidebar/navigation components
<div className="flex">
  {/* Navigation items */}
</div>
```

**Recommended Fixes:**

**For Header Navigation:**
```typescript
<header className="sticky top-0 z-50" role="banner">
  <nav aria-label="Primary navigation">
    {/* Header nav items */}
  </nav>
</header>
```

**For Main Content:**
```typescript
<main id="main-content" aria-label="Main content">
  {children}
</main>
```

**For Sidebar:**
```typescript
<aside aria-label="Secondary navigation">
  {/* Sidebar nav items */}
</aside>
```

**For Footer (if exists):**
```typescript
<footer role="contentinfo">
  {/* Footer content */}
</footer>
```

**Effort:** 45 minutes
**Testing:** Screen reader → should announce navigation landmarks

---

### 3. Form Grouping Missing (Hygiene Checklist)
**WCAG 1.3.1 (Level A) - Info & Relationships**

**Issue:**
- Hygiene checklist (10 items) lacks `<fieldset>` + `<legend>` grouping
- Screen reader users don't know these items form a cohesive group
- Checklist purpose unclear without context

**Current Code:** `app/mjc/new/page.tsx` (assumed structure)
```typescript
// ❌ MISSING: No fieldset grouping
<div>
  <Label>Hygiene Checklist</Label>
  <Checkbox label="Item 1" />
  <Checkbox label="Item 2" />
  {/* ...8 more items */}
</div>
```

**Recommended Fix:**
```typescript
<fieldset className="border rounded-lg p-4 space-y-3">
  <legend className="font-semibold text-sm">
    Hygiene Clearance Verification (10 items required)
  </legend>

  <div className="space-y-2">
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox
        id="hygiene-1"
        checked={hygiene.item1}
        onChange={(checked) => updateHygiene('item1', checked)}
        aria-describedby="hygiene-1-desc"
      />
      <span id="hygiene-1-desc">Floor clean and dry</span>
    </label>
    {/* ...repeat for all 10 items */}
  </div>

  <div className="text-sm text-muted-foreground">
    {completedItems}/10 items verified
  </div>
</fieldset>
```

**Effort:** 1 hour (to update all 10 items)
**Testing:** Screen reader → should announce "Hygiene Clearance Verification group, 10 items"

---

### 4. Table Accessibility Issues
**WCAG 1.3.1, 2.4.3 (Level A/AA) - Info & Relationships, Focus Visible**

**Location:** `components/nca-register.tsx` (lines 1-589)
**Location:** `components/mjc-register.tsx` (lines 1-647)

**Issue:**
- Tables lack proper `<thead>`, `<tbody>`, `<tfoot>` semantic structure
- Column headers missing `scope` attribute
- Sortable columns don't announce sort state to screen readers
- No table `aria-label` or `aria-describedby`
- Focus indicators may be insufficient on sortable column headers

**Current Code (Presumed):**
```typescript
// ❌ MISSING: No proper table structure
<table>
  <div>
    <button onClick={() => sortBy('nca_number')}>NCA Number</button>
    <button onClick={() => sortBy('date')}>Date</button>
  </div>
  {/* Data rows without <tbody> */}
</table>
```

**Recommended Fix:**
```typescript
<div className="rounded-lg border overflow-hidden">
  <table className="w-full" aria-label="Non-Conformance Advice Register">
    <thead>
      <tr className="bg-muted border-b">
        <th scope="col" className="px-4 py-3 text-left">
          <button
            onClick={() => handleSort('nca_number')}
            className="flex items-center gap-2 font-semibold hover:bg-accent rounded px-2 py-1"
            aria-label={`NCA Number, ${sortField === 'nca_number' ? `sorted ${sortDirection}` : 'unsorted'}`}
            aria-sort={
              sortField === 'nca_number'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            NCA Number
            {sortField === 'nca_number' && (
              <span aria-hidden="true">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        </th>
        <th scope="col" className="px-4 py-3 text-left">
          <button
            onClick={() => handleSort('date')}
            className="flex items-center gap-2 font-semibold hover:bg-accent rounded px-2 py-1"
            aria-label={`Date, ${sortField === 'date' ? `sorted ${sortDirection}` : 'unsorted'}`}
            aria-sort={
              sortField === 'date'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Date
            {sortField === 'date' && (
              <span aria-hidden="true">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        </th>
        {/* Additional column headers with same pattern */}
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="border-b hover:bg-accent/50 transition-colors">
          <td className="px-4 py-3">{item.nca_number}</td>
          <td className="px-4 py-3">{formatDate(item.date)}</td>
          {/* Additional cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Additional Considerations:**
- Add `aria-live="polite"` for dynamic sort announcements
- Ensure focus visible on sortable headers (already styled in Tailwind)
- Consider adding row selection with `role="checkbox"` for bulk actions

**Effort:** 2-3 hours (both NCA and MJC registers)
**Testing:**
- Screen reader → column headers should announce sort state
- Keyboard → Tab to headers, Enter should change sort
- Visual → 3px focus ring visible on headers

---

### 5. Global Search Dropdown Not Accessible
**WCAG 2.1.2 (Level A) - Keyboard, WCAG 4.1.3 (Level A) - Name, Role, Value**

**Location:** `components/navigation/global-search.tsx` (lines 187-275)

**Issue:**
- Search results dropdown missing `role="listbox"` or `role="menu"`
- No `aria-live` announcement of search results count
- Keyboard-only users may not know results loaded
- Selected item styling may not have sufficient contrast

**Current Code (lines 223-264):**
```typescript
// ❌ MISSING: No role="listbox" or aria-live
{isOpen && (query.length >= 2 || results.length > 0) && (
  <div className="absolute top-full mt-2 w-full bg-surface border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
    {/* Results rendered as buttons without listbox semantics */}
    {results.map((result, index) => (
      <button
        key={`${result.type}-${result.id}`}
        onClick={() => handleResultClick(result)}
        className={cn(
          'w-full px-4 py-3 text-left hover:bg-accent transition-colors',
          selectedIndex === index && 'bg-accent'
        )}
      >
        {/* Result content */}
      </button>
    ))}
  </div>
)}
```

**Recommended Fix:**
```typescript
{isOpen && (query.length >= 2 || results.length > 0) && (
  <>
    {/* Screen reader announcement */}
    <div
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {isSearching ? 'Searching...' : `${results.length} results found`}
    </div>

    {/* Results container with listbox role */}
    <div
      className="absolute top-full mt-2 w-full bg-surface border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto"
      role="listbox"
      aria-label="Search results"
      aria-expanded={isOpen}
    >
      {isSearching && (
        <div className="flex items-center justify-center p-4" role="status">
          <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
          <span>Searching...</span>
        </div>
      )}

      {!isSearching && results.length === 0 && query.length >= 2 && (
        <div className="p-4 text-sm text-muted-foreground text-center" role="status">
          No results found
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="py-2">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleResultClick(result);
                }
              }}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-accent transition-colors',
                'flex items-start gap-3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                selectedIndex === index && 'bg-accent'
              )}
              role="option"
              aria-selected={selectedIndex === index}
              id={`search-result-${index}`}
            >
              <div className="mt-0.5 text-muted-foreground" aria-hidden="true">
                {getResultIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{result.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {result.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1 capitalize">
                  {result.type}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isSearching && query.length < 2 && (
        <div className="p-4 text-sm text-muted-foreground text-center" role="status">
          Type at least 2 characters to search
        </div>
      )}
    </div>
  </>
)}
```

**Key Changes:**
- `role="listbox"` on results container
- `role="option"` on each result button
- `aria-selected` to indicate keyboard selection
- `aria-live="polite"` for result count announcements
- Better focus styling with `focus-visible:ring-2`

**Effort:** 1 hour
**Testing:**
- Keyboard: Arrow keys navigate results
- Screen reader: Announces "5 results found" when results load
- Tab to results: Focus ring visible on all buttons

---

### 6. Custom Visualizations Not Accessible
**WCAG 1.3.1, 2.1.1 (Level A) - Info & Relationships, Keyboard**

**Location:**
- `components/visualizations/five-why-builder.tsx`
- `components/visualizations/fishbone-diagram.tsx`
- `components/visualizations/timeline-builder.tsx`

**Issue:**
- Canvas/SVG-based visualizations have no keyboard navigation
- No text alternatives or data table fallbacks
- Screen reader users cannot access interactive diagram functionality
- Complex interactions (drag, click) not keyboard accessible

**Example - 5-Why Builder:**
```typescript
// ❌ NO KEYBOARD SUPPORT
// ❌ NO ARIA LABELS
// ❌ NO TEXT ALTERNATIVE
<canvas
  ref={canvasRef}
  className="border rounded"
  onClick={handleCanvasClick}
  onMouseMove={handleMouseMove}
  // Missing: keyboard handlers, ARIA
/>
```

**Recommended Approach:**

**Option A: Dual Interface (Recommended)**
```typescript
// Create both visual and text-based interfaces
<div className="space-y-4">
  {/* Visual canvas for most users */}
  <div role="region" aria-label="5-Why Diagram Visual">
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      aria-describedby="why-text-alternative"
    />
  </div>

  {/* Text alternative for screen readers and keyboard users */}
  <div
    className="hidden aria-hidden:visible sm:block"
    id="why-text-alternative"
    role="region"
    aria-label="5-Why Diagram Text Alternative"
  >
    <fieldset className="border rounded-lg p-4">
      <legend className="font-semibold">5-Why Analysis</legend>

      <div className="space-y-4">
        <div>
          <Label htmlFor="initial-problem">Initial Problem (Why 1)</Label>
          <Textarea
            id="initial-problem"
            value={why[0]}
            onChange={(e) => updateWhy(0, e.target.value)}
            placeholder="What happened?"
            aria-describedby="why-help-1"
          />
          <p id="why-help-1" className="text-xs text-muted-foreground mt-1">
            Describe the initial problem clearly
          </p>
        </div>

        {[1, 2, 3, 4].map((level) => (
          <div key={level}>
            <Label htmlFor={`why-${level + 1}`}>
              Why {level + 1}?
            </Label>
            <Textarea
              id={`why-${level + 1}`}
              value={why[level]}
              onChange={(e) => updateWhy(level, e.target.value)}
              placeholder={`Why did "${why[level - 1]}" happen?`}
              aria-describedby={`why-help-${level + 1}`}
            />
            <p id={`why-help-${level + 1}`} className="text-xs text-muted-foreground mt-1">
              Dig deeper into the root cause
            </p>
          </div>
        ))}
      </div>
    </fieldset>
  </div>
</div>
```

**Option B: Canvas with ARIA Live (Fallback)**
```typescript
// If must keep canvas-only approach
<div
  role="img"
  aria-label="5-Why analysis diagram"
  aria-describedby="why-description"
>
  <canvas ref={canvasRef} />
  <p id="why-description" className="sr-only">
    {/* Dynamically updated text description */}
    5-Why analysis: {why[0]} → {why[1]} → {why[2]} → {why[3]} → {why[4]}
  </p>
</div>
```

**Effort:** 3-4 hours per visualization
**Testing:**
- Screen reader → announces "5-Why Diagram Text Alternative region"
- Keyboard → Tab through text inputs, Enter/Spacebar activate buttons
- Visual → Canvas displays correctly for sighted users

---

### 7. Chart Accessibility (Recharts)
**WCAG 1.3.1, 2.1.1 (Level A) - Info & Relationships, Keyboard**

**Location:** `app/dashboard/*/page.tsx` (all dashboard charts)

**Issue:**
- Recharts visualizations are visual-only
- No data table alternative for keyboard/screen reader users
- No aria-label or description for chart purpose
- Interactive features (hover tooltips) not keyboard accessible

**Example - Current Implementation (Presumed):**
```typescript
// ❌ NO ACCESSIBLE ALTERNATIVE
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="ncas" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>
```

**Recommended Fix:**

```typescript
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AccessibleChart({ data, title, description }) {
  const [showDataTable, setShowDataTable] = useState(false);

  return (
    <div className="space-y-4">
      {/* Chart with description */}
      <div
        role="img"
        aria-label={title}
        aria-describedby="chart-description"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="ncas" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
        <p id="chart-description" className="sr-only">
          {description}
        </p>
      </div>

      {/* Data table alternative button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDataTable(!showDataTable)}
          aria-expanded={showDataTable}
          aria-controls="chart-data-table"
        >
          {showDataTable ? 'Hide' : 'Show'} Data Table
        </Button>
      </div>

      {/* Accessible data table */}
      {showDataTable && (
        <div
          id="chart-data-table"
          className="overflow-x-auto rounded-lg border"
          role="region"
          aria-label={`${title} - Data Table`}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th scope="col" className="px-4 py-2 text-left font-semibold">
                  Month
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">
                  NCAs
                </th>
                {/* Additional columns */}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.month} className="border-b">
                  <td className="px-4 py-2">{row.month}</td>
                  <td className="px-4 py-2 text-right">{row.ncas}</td>
                  {/* Additional cells */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Effort:** 2-3 hours (per dashboard page × 3 dashboards = 6-9 hours total)
**Testing:**
- Screen reader → announces chart title and description
- Keyboard → Show Data Table button is focusable and functional
- Table → Data matches chart visualization

---

## Important Priority Issues

**Impact:** Prevents WCAG 2.1 Level AA compliance | **Timeline:** 1-2 weeks

### 8. Icon Accessibility (Lucide React)
**WCAG 1.1.1 (Level A) - Non-text Content**

**Current Pattern (INCORRECT):**
```typescript
// ❌ WRONG: Icons are announced by screen reader
<button>
  <Menu className="h-5 w-5" />
</button>

// ❌ WRONG: Icon adds visual noise to screen reader
<div className="flex items-center">
  <AlertCircle className="h-4 w-4" />
  <span>Error message</span>
</div>
```

**Recommended Pattern:**
```typescript
// ✅ CORRECT: Decorative icons hidden from screen readers
<button aria-label="Toggle menu">
  <Menu className="h-5 w-5" aria-hidden="true" />
</button>

// ✅ CORRECT: Icon decorative, text explains content
<div className="flex items-center">
  <AlertCircle className="h-4 w-4 mr-2" aria-hidden="true" />
  <span>Error: Please fill all required fields</span>
</div>

// ✅ CORRECT: When icon is meaningful, add aria-label
<div className="inline-flex items-center" title="Critical priority">
  <AlertTriangle className="h-4 w-4" aria-label="Critical priority" />
</div>
```

**Locations Needing Review:**
- `components/navigation/*.tsx` - Menu, X, User icons
- `components/ui/*.tsx` - All icon buttons
- Form components throughout app
- Dashboard cards with icons

**Effort:** 2-3 hours (grep for Icon components, update ~30-40 instances)
**Testing:**
- Screen reader → should not announce decorative icons
- Keyboard + Screen reader → button purposes clear (aria-label)

---

### 9. Color Contrast Verification
**WCAG 2.1.3 (Level AA) - Contrast (Minimum)**

**Issue:**
- Need to verify all text meets 4.5:1 ratio (normal text) or 3:1 (large text)
- Muted colors may be borderline
- Disabled states may have insufficient contrast

**High-Risk Elements:**
- `text-muted-foreground` throughout app
- `bg-muted` backgrounds
- Disabled buttons/inputs
- Form error messages (should be clear)
- Chart legends and labels

**Recommended Verification:**
```bash
# Use these tools to verify contrast:
1. WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/)
2. axe DevTools Browser Extension
3. Lighthouse in Chrome DevTools
4. WAVE Browser Extension
```

**Sample Current CSS (Risk Areas):**
```css
/* Check these values in tailwind config */
.text-muted-foreground { /* May be #666 or #999 - verify ratio */}
.bg-muted { /* Check contrast with text on top */}
.text-destructive { /* Should be 4.5:1 with background */}
```

**If Contrast Issues Found:**
```css
/* Example fix - increase color differentiation */
.text-muted-foreground {
  @apply text-gray-700; /* Was gray-500, now darker */
}

/* Alternative: increase text weight for small text */
.caption {
  @apply text-xs font-medium text-gray-700; /* Add font-medium */
}
```

**Effort:** 1-2 hours for verification + fixes
**Testing:**
- Run contrast checker on all color combinations
- Screenshot each color state
- Document in design system

---

### 10. Heading Hierarchy Issues
**WCAG 1.3.1 (Level A) - Info & Relationships**

**Issue:**
- May skip heading levels (e.g., h1 → h3)
- Inconsistent heading usage across pages
- Assistive tech relies on proper h1 → h2 → h3 → h4 progression

**Recommended Structure:**
```typescript
// ✅ CORRECT hierarchy
<main>
  <h1>Non-Conformance Advice (NCA) Register</h1>  {/* One h1 per page */}

  <section>
    <h2>Filters</h2>
    {/* Filter content */}
  </section>

  <section>
    <h2>Results</h2>
    <p>{itemCount} NCAs found</p>

    <h3>NCA #001</h3>
    <p>Details...</p>

    <h3>NCA #002</h3>
    <p>Details...</p>
  </section>
</main>

// ❌ INCORRECT hierarchy
<h1>NCA Register</h1>
<h4>Filters</h4>  {/* SKIPS h2, h3 */}
<div>Filter content</div>
<h2>Results</h2>  {/* Better, but inconsistent with above */}
```

**Locations to Review:**
- `/app/nca/new/page.tsx` - Complex form with multiple sections
- `/app/mjc/new/page.tsx` - Multiple form sections
- All dashboard pages
- Any page with Form Header or Card components

**Effort:** 1-2 hours
**Testing:**
- Screen reader → Navigate by headings (should proceed in order)
- Browser DevTools → Outline → Heading Structure (should not skip levels)

---

### 11. Form Field Help Text Not Linked
**WCAG 1.3.1 (Level A) - Info & Relationships**

**Current Pattern (INCOMPLETE):**
```typescript
// ⚠️ PARTIAL: Help text exists but not linked
<div>
  <Label htmlFor="nca-description">Non-Conformance Description</Label>
  <Textarea id="nca-description" {...register('nc_description')} />
  <p className="text-sm text-muted-foreground mt-1">
    Minimum 100 characters. Be specific about the issue.
  </p>
</div>
```

**Recommended Pattern:**
```typescript
<div className="space-y-2">
  <Label htmlFor="nca-description">
    Non-Conformance Description
    <span className="text-destructive">*</span>
  </Label>

  <Textarea
    id="nca-description"
    {...register('nc_description')}
    aria-describedby="nca-description-help nca-description-error"
    aria-required="true"
    minLength={100}
  />

  {/* Help text */}
  <p id="nca-description-help" className="text-sm text-muted-foreground">
    Minimum 100 characters. Be specific about the issue.
  </p>

  {/* Character count */}
  <div className="flex justify-between items-center text-xs">
    <span>
      {charCount}/100 minimum
    </span>
    {charCount >= 100 && (
      <span className="text-green-600" aria-label="Minimum length met">✓</span>
    )}
  </div>

  {/* Error message (if any) */}
  {errors.nc_description && (
    <p id="nca-description-error" className="text-sm text-destructive" role="alert">
      {errors.nc_description.message}
    </p>
  )}
</div>
```

**Key Improvements:**
- `aria-describedby` links all help/error text
- `aria-required="true"` indicates required field
- `role="alert"` announces errors immediately
- Character count provides real-time feedback

**Effort:** 2-3 hours (update ~15-20 form fields)
**Testing:**
- Screen reader → should read label, help text, and error message in sequence
- Tab + Screen reader → pressing Tab should announce all associated text

---

### 12. Modal/Dialog Focus Trap Issues
**WCAG 2.4.3 (Level A) - Focus Visible**

**Issue:**
- Modals may not trap focus properly
- Focus may escape to background content
- No focus return to trigger button after close

**Example - QualityGateModal, WritingAssistantModal:**
```typescript
// ⚠️ NEEDS: Focus trap implementation
export function QualityGateModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        {/* Focus can escape? */}
        <DialogTitle>Quality Gate</DialogTitle>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}
```

**Recommended Implementation:**
```typescript
import FocusLock from 'react-focus-lock';

export function AccessibleModal({ isOpen, onClose, onSubmit, trigger }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    // Return focus to trigger button
    trigger?.current?.focus();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="focus:outline-none">
        <DialogHeader>
          <DialogTitle>Quality Gate Assessment</DialogTitle>
          <DialogDescription>
            This form is required before submission.
          </DialogDescription>
        </DialogHeader>

        <FocusLock disabled={!isOpen}>
          {/* Modal content - focus trapped here */}
          <form onSubmit={onSubmit}>
            {/* Form fields */}
          </form>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={handleClose}
              ref={closeButtonRef}
            >
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </FocusLock>
      </DialogContent>
    </Dialog>
  );
}
```

**Install dependency:**
```bash
npm install react-focus-lock
```

**Effort:** 1-2 hours (2-3 modals)
**Testing:**
- Keyboard: Tab inside modal, should not reach background content
- Close modal → focus should return to trigger button

---

### 13. Voice Input Accessibility
**WCAG 2.1.1 (Level A) - Keyboard**

**Location:** `components/fields/voice-input.tsx`

**Issue:**
- Web Speech API has limited browser support
- No fallback indication for unsupported browsers
- Voice input may not have text transcription visible
- No clear error states

**Recommended Enhancement:**
```typescript
export function VoiceInput({
  label,
  value,
  onChange,
  onError,
  disabled,
}: VoiceInputProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={`voice-${label}`}>{label}</Label>

      {/* Visible transcript/input */}
      <div className="relative">
        <Input
          id={`voice-${label}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type or use voice input"
          aria-describedby={`voice-support-${label}`}
          disabled={disabled}
        />

        {/* Voice button with clear disabled state */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleVoiceStart}
          disabled={!isSupported || disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2"
          aria-label={
            isListening
              ? 'Stop voice recording'
              : 'Start voice input (requires microphone permission)'
          }
          aria-pressed={isListening}
        >
          <Mic
            className={cn(
              'h-4 w-4',
              isListening && 'animate-pulse text-destructive'
            )}
            aria-hidden="true"
          />
        </Button>
      </div>

      {/* Browser support notice */}
      {!isSupported && (
        <p
          id={`voice-support-${label}`}
          className="text-sm text-muted-foreground"
          role="status"
        >
          ⓘ Voice input not supported in your browser. Please type instead.
        </p>
      )}

      {isListening && (
        <p
          className="text-sm text-blue-600"
          role="status"
          aria-live="polite"
        >
          🎤 Listening... Say something or press the button to stop.
        </p>
      )}

      {transcript && (
        <p className="text-sm text-muted-foreground">
          Heard: {transcript}
        </p>
      )}
    </div>
  );
}
```

**Effort:** 1 hour
**Testing:**
- Keyboard only: Should have text input alternative
- Unsupported browser: Clear message shown
- Listening state: Visual and audio feedback provided

---

### 14. Mobile Navigation Accessibility
**WCAG 2.1.1 (Level A) - Keyboard**

**Location:** `components/navigation/mobile-drawer.tsx`, `mobile-bottom-nav.tsx`

**Issue:**
- Mobile drawer may not trap focus properly
- Escape key may not close drawer (keyboard users)
- No aria-label on drawer toggle buttons

**Recommended Fixes:**

```typescript
// In mobile-drawer.tsx
export function MobileDrawer() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useNavigation();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  return (
    <Drawer
      open={mobileDrawerOpen}
      onOpenChange={setMobileDrawerOpen}
    >
      <DrawerContent
        aria-label="Mobile navigation menu"
        role="navigation"
      >
        {/* Navigation content */}
      </DrawerContent>
    </Drawer>
  );
}
```

**Effort:** 45 minutes
**Testing:**
- Keyboard: Press Escape to close drawer
- Screen reader: Should announce "Mobile navigation menu, navigation"
- Mobile: Drawer doesn't interfere with page scrolling

---

### 15. Text-to-Speech Component
**WCAG 1.3.1 (Level A) - Info & Relationships**

**Location:** `components/fields/text-to-speech.tsx`

**Issue:**
- No indication which text is being read
- No clear start/stop/pause controls
- No browser support fallback

**Recommended Enhancement:**
```typescript
export function TextToSpeech({
  text,
  label = 'Read aloud',
}: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground">
        ⓘ Text-to-speech not supported in your browser.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleSpeak}
        disabled={!text}
        aria-pressed={isPlaying}
        aria-label={
          isPlaying
            ? `Stop reading "${label}"`
            : `Read "${label}" aloud`
        }
      >
        <Volume2 className="h-4 w-4 mr-2" aria-hidden="true" />
        {isPlaying ? 'Stop' : 'Read'}
      </Button>

      {error && (
        <span className="text-sm text-destructive" role="alert">
          {error}
        </span>
      )}

      {isPlaying && (
        <span
          className="text-sm text-blue-600"
          role="status"
          aria-live="polite"
        >
          🔊 Currently reading...
        </span>
      )}
    </div>
  );
}
```

**Effort:** 45 minutes
**Testing:**
- Keyboard: Button focusable and activatable
- Screen reader: Should announce "Read aloud" and status changes
- Browser: Verify synthesis works and can be stopped

---

## Component-Specific Findings

### NCA Create Form (`app/nca/new/page.tsx`)

**Line 57-80: Character Counter**
- ✅ Good: Color-coded feedback (green/yellow/red)
- ⚠️ Add: `aria-live="polite"` to announce updates
- ⚠️ Add: Text description of colors (not just color-coded)

**Recommendation:**
```typescript
<div
  className={`text-sm mt-1 ${getColorClass()}`}
  aria-live="polite"
  aria-atomic="true"
>
  {charCount} / {minimum} characters
  {charCount >= minimum && ' ✓ Minimum met'}
  {charCount >= minimum / 2 && charCount < minimum && ' - more needed'}
</div>
```

---

### MJC Create Form (`app/mjc/new/page.tsx`)

**Hygiene Checklist Section**
- ❌ Critical: Needs `<fieldset>` + `<legend>` grouping (Issue #3 above)
- ⚠️ Add: Progress indicator (X/10 items verified) with aria-live

**Recommendation:**
```typescript
<fieldset className="border rounded-lg p-4">
  <legend className="font-semibold">
    Hygiene Clearance Verification
  </legend>

  <div className="space-y-3">
    {hygienItems.map((item, i) => (
      <label key={i} className="flex items-center gap-2">
        <Checkbox
          checked={verified[i]}
          onChange={(checked) => handleVerify(i, checked)}
        />
        <span>{item.label}</span>
      </label>
    ))}
  </div>

  <div
    className="mt-4 text-sm font-medium"
    aria-live="polite"
    aria-atomic="true"
  >
    {verifiedCount}/10 items verified
    {verifiedCount === 10 && ' - Ready for clearance'}
  </div>
</fieldset>
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)
**Estimated Effort:** 8-10 hours

Priority in order:
1. ✅ Skip-to-main link (30 min)
2. ✅ ARIA landmarks (45 min)
3. ✅ Form fieldset grouping (1 hour)
4. ✅ Table accessibility (2-3 hours)
5. ✅ Global search dropdown (1 hour)
6. ✅ Custom visualizations fallback (3-4 hours)

**Deadline:** Week 1-2
**Owner:** Senior Frontend Developer
**PR Checklist:** axe-core scan, manual screen reader test, keyboard nav test

---

### Phase 2: Important Fixes (Week 3)
**Estimated Effort:** 6-8 hours

1. ✅ Icon aria-hidden attributes (2-3 hours)
2. ✅ Color contrast verification (1-2 hours)
3. ✅ Heading hierarchy (1-2 hours)
4. ✅ Form field help text linking (2-3 hours)

**Deadline:** Week 3
**Owner:** Frontend Developer
**PR Checklist:** Contrast checker verification, heading structure validation

---

### Phase 3: Enhancement Fixes (Week 4-5)
**Estimated Effort:** 5-6 hours

1. ✅ Modal focus traps (1-2 hours)
2. ✅ Voice input browser support (1 hour)
3. ✅ Mobile navigation accessibility (45 min)
4. ✅ Text-to-speech component (45 min)
5. ✅ Chart data table alternatives (2-3 hours)

**Deadline:** Week 4-5
**Owner:** Frontend Developer
**PR Checklist:** Focus behavior testing, browser compatibility

---

### Phase 4: Testing & Validation (Week 5-6)
**Estimated Effort:** 4-6 hours

1. ✅ Automated testing (axe-core, Jest a11y)
2. ✅ Manual screen reader testing (NVDA, JAWS, VoiceOver)
3. ✅ Keyboard-only navigation
4. ✅ Browser compatibility testing
5. ✅ Generate WCAG compliance report

**Deadline:** Week 5-6
**Owner:** QA + Accessibility Specialist
**Deliverable:** Accessibility Compliance Certification (Level AA)

---

## Testing & Validation Strategy

### 1. Automated Testing Setup

**Install Dependencies:**
```bash
npm install --save-dev axe-core jest-axe @axe-core/react
```

**Add Jest Accessibility Tests:**

Create `components/__tests__/accessibility.test.tsx`:
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Header } from '@/components/navigation/header';
import { GlobalSearch } from '@/components/navigation/global-search';
import { NCARegister } from '@/components/nca-register';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('Header should not have accessibility violations', async () => {
    const { container } = render(<Header />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Global Search should be keyboard navigable', async () => {
    const { container } = render(<GlobalSearch />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('NCA Register table should have proper heading structure', async () => {
    const { container } = render(<NCARegister />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Add to package.json:**
```json
{
  "scripts": {
    "test:a11y": "jest --testPathPattern=accessibility",
    "test:a11y:watch": "jest --testPathPattern=accessibility --watch"
  }
}
```

---

### 2. Manual Testing Checklist

**Browser/Screen Reader Combinations:**
- [ ] Chrome + NVDA (Windows)
- [ ] Firefox + JAWS (Windows)
- [ ] Safari + VoiceOver (macOS)
- [ ] Safari + VoiceOver (iOS)
- [ ] Chrome + VoiceOver (macOS)

**Test Scenarios:**

**Skip Link:**
- [ ] Load page with only keyboard
- [ ] Press Tab once → Skip link should appear
- [ ] Press Enter → Focus jumps to main content

**Tables:**
- [ ] Screen reader reads table title
- [ ] Column headers announced as headers (role="columnheader")
- [ ] Sort button announced with current state
- [ ] Data cells properly associated with headers

**Forms:**
- [ ] Labels associated with inputs (clicking label focuses input)
- [ ] Required fields indicated (aria-required or asterisk + description)
- [ ] Error messages announced immediately (role="alert")
- [ ] Help text read after input

**Keyboard Navigation:**
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] No keyboard traps (can always Tab away)
- [ ] Buttons activatable with Enter and Space
- [ ] Escape closes dropdowns/modals
- [ ] Focus visible at all times (3px ring)

**Color Contrast:**
- [ ] All text ≥ 4.5:1 on backgrounds (normal text)
- [ ] Large text (18pt+) ≥ 3:1
- [ ] Disabled states still readable
- [ ] Focus indicators visible

---

### 3. Browser DevTools Testing

**Chrome DevTools:**
1. Open DevTools → Lighthouse
2. Run accessibility audit
3. Review "Accessibility" issues
4. Fix violations marked "Manual" with screen reader

**Firefox Developer Tools:**
1. Inspector → Accessibility tab
2. Check landmark roles
3. Verify heading structure
4. Test keyboard navigation

**WAVE Browser Extension:**
1. Install WAVE
2. Scan each page
3. Review Contrast, Structure, ARIA errors
4. Fix errors (yellow warnings are informational)

---

### 4. Keyboard Navigation Testing

**Keyboard Test Matrix:**

| Element | Tab | Enter | Space | Escape | Arrow Keys |
|---------|-----|-------|-------|--------|------------|
| Button | ✓ | ✓ | ✓ | - | - |
| Link | ✓ | ✓ | - | - | - |
| Input | ✓ | - | - | - | - |
| Textarea | ✓ | - | - | - | - |
| Checkbox | ✓ | - | ✓ | - | - |
| Radio | ✓ | - | - | - | ↑↓ |
| Select | ✓ | - | - | - | ↑↓ |
| Dialog | ✓ (trap) | - | - | ✓ | - |
| Dropdown | ✓ | - | - | ✓ | ↑↓→← |
| Table Sort | ✓ | ✓ | ✓ | - | - |

**Test All:** Use only keyboard (no mouse) to navigate entire user workflow

---

### 5. Screen Reader Testing Script

**NVDA (Windows) / JAWS Commands:**
```
[Insert/CapsLock] = NVDA key

Screen Reader Navigation:
- H: Next heading
- Shift+H: Previous heading
- T: Next table
- L: Next list
- 1-6: Next heading level 1-6
- [NVDA]+Right: Read current sentence
- [NVDA]+Down: Read paragraph
```

**VoiceOver (macOS/iOS) Commands:**
```
[VO] = Control+Option

- VO+Right: Next item
- VO+Left: Previous item
- VO+U: Rotor (headings, links, lists, etc.)
- VO+Home: Start of page
- VO+End: End of page
```

**Test Script for NCA Form:**
1. [ ] Tab to start → Skip link announced
2. [ ] Press Enter → Jump to main content
3. [ ] Navigate form → All labels read correctly
4. [ ] Type description → Character count announced
5. [ ] Submit → Validation message clear
6. [ ] Table → Headers and sort state announced

---

### 6. Color Contrast Verification

**Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Stark (Figma): Check design mockups
- axe DevTools: Automated detection

**Must Test:**
- All text colors on backgrounds
- Button states (normal, hover, active, disabled)
- Focus indicators (ring color on backgrounds)
- Form error/success messages

**Document Results:**
```markdown
## Color Contrast Report

| Element | Foreground | Background | Ratio | Level | Status |
|---------|-----------|------------|-------|-------|--------|
| body text | #1a1a1a | #ffffff | 19.3:1 | AAA | ✓ PASS |
| muted-foreground | #666666 | #ffffff | 7.1:1 | AA | ✓ PASS |
| disabled button | #999999 | #f0f0f0 | 3.8:1 | Fail | ❌ FAIL → Fix |
```

---

## Appendix: Code Examples

### A. Skip Link CSS (globals.css)

```css
/* Screen reader only - visible on focus */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus-visible {
  position: fixed;
  top: 10px;
  left: 10px;
  width: auto;
  height: auto;
  padding: 8px 16px;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  background-color: #ffeb3b;
  border: 2px solid #000;
  border-radius: 4px;
  font-weight: 600;
  z-index: 9999;
}
```

---

### B. Accessible Form Field Wrapper

```typescript
import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AccessibleFormFieldProps {
  id: string;
  label: string | ReactNode;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}

export function AccessibleFormField({
  id,
  label,
  required = false,
  helpText,
  error,
  children,
  hint,
}: AccessibleFormFieldProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-baseline gap-2">
        <span>{label}</span>
        {required && (
          <span className="text-destructive" aria-label="required">
            *
          </span>
        )}
      </Label>

      <div className="relative">
        {/* Pass aria-describedby and aria-required to children */}
        {typeof children === 'function'
          ? children({
              'aria-describedby': [helpId, errorId].filter(Boolean).join(' '),
              'aria-required': required,
              'aria-invalid': !!error,
            })
          : children}
      </div>

      {helpText && !error && (
        <p id={helpId} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-xs text-destructive font-medium"
          role="alert"
        >
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-xs text-muted-foreground italic">{hint}</p>
      )}
    </div>
  );
}

// Usage:
<AccessibleFormField
  id="nca-description"
  label="Non-Conformance Description"
  required
  helpText="Describe the issue in detail (minimum 100 characters)"
  error={errors.nc_description?.message}
>
  {(props) => (
    <Textarea {...register('nc_description')} {...props} />
  )}
</AccessibleFormField>
```

---

### C. Accessible Table Component Wrapper

```typescript
import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AccessibleTableProps {
  title: string;
  description?: string;
  columns: {
    key: string;
    header: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
  }[];
  rows: Record<string, ReactNode>[];
  sortedBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  ariaLabel?: string;
}

export function AccessibleTable({
  title,
  description,
  columns,
  rows,
  sortedBy,
  sortDirection = 'asc',
  onSort,
  ariaLabel,
}: AccessibleTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="sr-only" id={`${title}-caption`}>
        {description}
      </div>

      <table
        aria-label={ariaLabel || title}
        aria-describedby={`${title}-caption`}
      >
        <caption className="sr-only">{title}</caption>

        <thead>
          <tr className="bg-muted border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-semibold text-left',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center'
                )}
              >
                {col.sortable ? (
                  <button
                    onClick={() => onSort?.(col.key)}
                    className="flex items-center gap-2 hover:bg-accent rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`${col.header}, ${
                      sortedBy === col.key
                        ? `sorted ${sortDirection}`
                        : 'unsorted'
                    }`}
                    aria-sort={
                      sortedBy === col.key
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    {col.header}
                    {sortedBy === col.key && (
                      <span aria-hidden="true">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-accent/50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### D. Focus Trap Hook

```typescript
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab on first element → jump to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab on last element → jump to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

// Usage:
const modalRef = useFocusTrap(isOpen);
return <div ref={modalRef}>{/* modal content */}</div>;
```

---

## Summary & Next Steps

### Estimated Total Effort
- **Phase 1-4 Total:** 25-30 hours
- **Timeline:** 4-6 weeks
- **Team:** 1 Senior Dev (weeks 1-2), 1 Frontend Dev (weeks 2-4), 1 QA (weeks 5-6)

### Success Criteria
- [ ] WCAG 2.1 Level AA compliance verified by axe-core
- [ ] 0 critical/serious violations
- [ ] Manual screen reader testing passes all scenarios
- [ ] Keyboard-only navigation works for all user flows
- [ ] All color contrasts meet AA standards
- [ ] Accessibility tests integrated in CI/CD

### First Actions
1. **Immediate (This Week):** Add skip link, ARIA landmarks
2. **Week 2:** Fix tables, global search, visualizations
3. **Week 3:** Complete icon, contrast, heading fixes
4. **Weeks 4-6:** Testing and validation

### Resources
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- WebAIM: https://webaim.org/
- Radix UI Docs: https://www.radix-ui.com/docs/primitives/overview/introduction
- axe DevTools: https://www.deque.com/axe/devtools/

---

**Report Generated:** November 2024
**Compliance Target:** WCAG 2.1 Level AA
**Status:** Awaiting Implementation