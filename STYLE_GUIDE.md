# OHiSee Design System & Style Guide

**Version:** 1.0  
**Last Updated:** January 2025  
**Framework:** Next.js 15 + React 19 + Tailwind CSS v4 + shadcn/ui

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Pages & Routes](#pages--routes)
7. [Form Patterns](#form-patterns)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Animation & Interactions](#animation--interactions)

---

## Design Philosophy

OHiSee is a **BRCGS-certified quality management system** for industrial food production. The design prioritizes:

- **Clarity & Safety**: Critical information must be immediately visible
- **Efficiency**: Forms and workflows optimized for production floor use
- **Compliance**: Visual hierarchy supports BRCGS audit requirements
- **Professional**: Industrial-grade aesthetic with modern UX patterns

### Design Principles

1. **Safety First**: Critical status indicators use high-contrast colors (red/orange)
2. **Consistent Spacing**: Uniform spacing between labels and inputs (`space-y-2` for fields, `space-y-4` for sections)
3. **Progressive Disclosure**: Complex forms broken into logical sections
4. **Mobile-First**: Touch-friendly targets (minimum 44x44px)
5. **Accessibility**: WCAG 2.1 AA compliant

---

## Color System

### Primary Colors

The system uses a semantic color palette optimized for industrial safety and compliance.

#### Primary (Deep Industrial Blue)

- **Usage**: Primary actions, links, active states
- **Scale**: `primary-50` → `primary-900`
- **Primary**: `#1e40af` (primary-600)
- **CSS Variable**: `--color-primary-600`

```css
bg-primary-600    /* Primary buttons, active links */
text-primary-600   /* Links, emphasis */
border-primary-600 /* Focus rings, active borders */
```

#### Critical (Safety Red)

- **Usage**: Machine down, critical errors, required actions
- **Scale**: `critical-50` → `critical-900`
- **Primary**: `#dc2626` (critical-600)
- **CSS Variable**: `--color-critical-600`

```css
.text-critical     /* Critical section titles */
bg-critical-600    /* Critical status badges */
border-critical-500 /* Critical alerts */
```

#### Warning (Safety Orange)

- **Usage**: Warnings, temporary repairs, attention needed
- **Scale**: `warning-50` → `warning-900`
- **Primary**: `#ea580c` (warning-600)

#### Attention (Caution Yellow)

- **Usage**: Pending items, caution notices
- **Scale**: `attention-50` → `attention-900`
- **Primary**: `#eab308` (attention-500)

#### Success (Verified Green)

- **Usage**: Completed items, verified status, production cleared
- **Scale**: `success-50` → `success-900`
- **Primary**: `#16a34a` (success-600)

#### Secondary (Professional Gray-Blue)

- **Usage**: Secondary actions, muted content, backgrounds
- **Scale**: `secondary-50` → `secondary-900`
- **Primary**: `#475569` (secondary-600)

### Semantic Mappings

```css
/* shadcn/ui semantic colors */
--color-primary: var(--color-primary-600)
--color-destructive: var(--color-critical-600)
--color-muted: var(--color-gray-100)
--color-accent: var(--color-primary-50)
```

### Background & Surface

- **Background**: `#f9fafb` (gray-50)
- **Surface/Card**: `#ffffff` (white)
- **Border**: `#e5e7eb` (gray-200)
- **Border Strong**: `#d1d5db` (gray-300)

### Dark Mode

Dark mode is supported with inverted color schemes:

- Background: `#0f172a` (slate-900)
- Surface: `#1e293b` (slate-800)
- Text: `#f8fafc` (slate-50)

---

## Typography

### Font Families

#### Primary: Poppins

- **Usage**: UI text, headings, labels, body content
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **CSS Variable**: `--font-poppins`
- **Class**: `font-sans` (default)

#### Secondary: Inter

- **Usage**: Data, numbers, codes, IDs
- **Weights**: 400, 500, 600, 700
- **CSS Variable**: `--font-inter`
- **Class**: `font-alt`

### Type Scale

| Size | Class | Line Height | Letter Spacing | Usage |
|------|-------|-------------|----------------|-------|
| 3rem | `text-5xl` | 1 | -0.03em | Hero numbers |
| 2.25rem | `text-4xl` | 2.5rem | -0.025em | Page titles |
| 1.875rem | `text-3xl` | 2.25rem | -0.02em | Section headings |
| 1.5rem | `text-2xl` | 2rem | -0.015em | Card titles |
| 1.25rem | `text-xl` | 1.75rem | -0.01em | Form section titles |
| 1.125rem | `text-lg` | 1.75rem | -0.005em | Subheadings |
| 1rem | `text-base` | 1.5rem | 0em | Body text (default) |
| 0.875rem | `text-sm` | 1.25rem | 0.01em | Helper text, labels |
| 0.75rem | `text-xs` | 1rem | 0.01em | Captions, timestamps |

### Typography Patterns

#### Page Title

```tsx
<h1 className="text-3xl font-bold mb-8">
  Maintenance Job Card
</h1>
```

#### Section Title (Card)

```tsx
<CardTitle>Section 1: Job Card Identification</CardTitle>
```

#### Critical Section Title

```tsx
<CardTitle className="text-critical">
  Section 4: Machine Status (CRITICAL)
</CardTitle>
```

#### Form Label

```tsx
<Label>Machine/Equipment ID *</Label>
```

#### Data Display (Inter font)

```tsx
<p className="text-5xl font-bold font-alt">127</p>
<p className="text-xl font-medium font-alt">NCA-2025-0847</p>
```

---

## Spacing & Layout

### Spacing Scale

Uses Tailwind's default spacing scale (0.25rem increments):

- `space-y-1` = 0.25rem (4px) - Tight spacing
- `space-y-2` = 0.5rem (8px) - **Label to input spacing (standard)**
- `space-y-3` = 0.75rem (12px) - Compact sections
- `space-y-4` = 1rem (16px) - **Field spacing within sections (standard)**
- `space-y-6` = 1.5rem (24px) - Section spacing
- `space-y-8` = 2rem (32px) - Large section spacing

### Layout Patterns

#### Container

```tsx
<div className="container mx-auto p-6 max-w-5xl">
  {/* Content */}
</div>
```

#### Card Section

```tsx
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label>Field Label</Label>
      <Input />
    </div>
  </CardContent>
</Card>
```

#### Grid Layout (2 columns)

```tsx
<CardContent className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Field 1</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Field 2</Label>
    <Input />
  </div>
</CardContent>
```

### Spacing Rules

1. **Between Label and Input**: Always use `space-y-2` on the field container
2. **Between Fields in Section**: Use `space-y-4` on `CardContent`
3. **Between Sections**: Use `mb-6` on `Card` components
4. **Page Padding**: `p-6` on main container
5. **Card Padding**: `px-6 py-6` (handled by Card component)

---

## Components

### Base UI Components (shadcn/ui)

Located in `components/ui/`

#### Button

- **Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- **Sizes**: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon`, `icon-sm`, `icon-lg`
- **Usage**: Primary actions use `default`, destructive actions use `destructive`

```tsx
<Button variant="default" size="default">
  Submit
</Button>
<Button variant="destructive" size="sm">
  Delete
</Button>
<Button variant="outline">
  Cancel
</Button>
```

#### Card

- **Structure**: `Card` → `CardHeader` → `CardTitle` / `CardDescription` → `CardContent`
- **Spacing**: Automatic padding (`px-6 py-6`)
- **Usage**: All form sections, content containers

```tsx
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Fields */}
  </CardContent>
</Card>
```

#### Input

- **Base**: Standard text input
- **States**: `readOnly`, `disabled`, error states
- **Spacing**: Always wrapped in `space-y-2` container with Label

```tsx
<div className="space-y-2">
  <Label>Field Name</Label>
  <Input type="text" placeholder="Enter value" />
</div>
```

#### Textarea

- **Usage**: Multi-line text input
- **Rows**: Typically 5 for descriptions, 3-4 for shorter content
- **Pattern**: Same spacing as Input

```tsx
<div className="space-y-2">
  <Label>Description</Label>
  <Textarea rows={5} />
</div>
```

#### Label

- **Usage**: Form field labels
- **Required Indicator**: Add `*` to label text for required fields
- **Spacing**: Always followed by input with `space-y-2`

#### RadioGroup

- **Usage**: Single selection from options
- **Pattern**: Wrapped in `space-y-2` container

```tsx
<div className="space-y-2">
  <Label>Status</Label>
  <RadioGroup onValueChange={handleChange}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="option1" id="option1" />
      <Label htmlFor="option1">Option 1</Label>
    </div>
  </RadioGroup>
</div>
```

#### Checkbox

- **Usage**: Boolean selections, checklists
- **Pattern**: Inline with label

```tsx
<div className="flex items-center space-x-2">
  <Checkbox id="check1" />
  <Label htmlFor="check1">Checkbox Label</Label>
</div>
```

#### Badge

- **Variants**: `default`, `secondary`, `destructive`, `outline`
- **Usage**: Status indicators, counts

```tsx
<Badge variant="default">Open</Badge>
<Badge variant="destructive">Critical</Badge>
```

#### Dialog

- **Usage**: Modals, confirmation dialogs
- **Components**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`

### Custom Components

#### EnhancedTextarea

**Location**: `components/enhanced-textarea.tsx`

Enhanced textarea with quality validation, character counter, and writing assistance.

**Props**:

- `label`: Field label
- `value`: Current value
- `onChange`: Change handler
- `minLength`: Minimum character count
- `maxLength`: Maximum character count
- `qualityScore`: Quality score (0-100)
- `showQualityBadge`: Show quality indicator
- `onGetHelp`: Writing assistance callback
- `showChecklist`: Show requirement checklist

**Usage**:

```tsx
<EnhancedTextarea
  label="Description"
  value={description}
  onChange={setDescription}
  minLength={100}
  maxLength={2000}
  rows={5}
  required
  showQualityBadge={true}
  qualityScore={qualityScore}
/>
```

#### SmartInput

**Location**: `components/smart-input.tsx`

Input with autocomplete, suggestions, and field-specific intelligence.

**Props**:

- `label`: Field label
- `value`: Current value
- `onChange`: Change handler
- `fieldName`: Field identifier for smart features
- `showSuggestions`: Enable autocomplete
- `required`: Required field indicator

**Usage**:

```tsx
<SmartInput
  label="Machine/Equipment ID"
  value={machineId}
  onChange={setMachineId}
  fieldName="machine_equipment_id"
  showSuggestions={true}
  required
/>
```

#### FileUpload

**Location**: `components/file-upload.tsx`

File upload component with drag-and-drop, preview, and type validation.

**Props**:

- `entityId`: Related entity ID
- `uploadType`: 'nca' | 'mjc'
- `onUpload`: Upload handler
- `onDelete`: Delete handler
- `onList`: List files handler
- `allowedTypes`: Array of allowed file types
- `maxSizeMB`: Maximum file size

#### QualityIndicator

**Location**: `components/quality-indicator.tsx`

Visual quality score indicator (badge with color coding).

#### QualityGateModal

**Location**: `components/quality-gate-modal.tsx`

Pre-submission validation modal showing quality assessment.

#### WritingAssistantModal

**Location**: `components/writing-assistant-modal.tsx`

Modal for AI-powered writing suggestions.

### Visualization Components

Located in `components/visualizations/`

#### FiveWhyBuilder

Interactive 5-Why root cause analysis builder.

#### TimelineBuilder

Chronological event timeline builder.

#### FishboneDiagram

6M (Man, Machine, Method, Material, Measurement, Environment) analysis diagram.

### Navigation Components

Located in `components/navigation/`

#### Header

- **Location**: Top of page, sticky
- **Height**: `h-14` (56px)
- **Features**: Logo, global search, user menu, mobile menu toggle

#### DesktopSidebar

- **Width**: `w-64` (expanded), `w-16` (collapsed)
- **Behavior**: Collapsible, persistent
- **Sections**: Main, Non-Conformance, Maintenance, Dashboards, Operations

#### MobileBottomNav

- **Location**: Bottom of screen (mobile only)
- **Features**: Quick access to main actions
- **Safe Area**: Respects `safe-area-inset-bottom`

#### MobileDrawer

- **Usage**: Slide-out navigation menu (mobile)
- **Trigger**: Header menu button

#### Breadcrumbs

- **Location**: Below header, above main content
- **Usage**: Navigation hierarchy

---

## Pages & Routes

### Page Structure

All pages follow this structure:

```tsx
<div className="container mx-auto p-6 max-w-5xl">
  <h1 className="text-3xl font-bold mb-8">Page Title</h1>
  
  {/* Success/Error Messages */}
  {success && <SuccessMessage />}
  {error && <ErrorMessage />}
  
  {/* Main Content */}
  <form>
    {/* Sections as Cards */}
  </form>
</div>
```

### Route Structure

```
/
├── /                    # Home/Dashboard
├── /nca                 # Non-Conformance Advice
│   ├── /new            # Create new NCA
│   ├── /register       # NCA Register (list view)
│   └── /[id]           # View/Edit NCA
├── /mjc                 # Maintenance Job Card
│   ├── /new            # Create new MJC
│   ├── /register       # MJC Register (list view)
│   └── /[id]           # View/Edit MJC
├── /dashboard
│   ├── /management     # Management dashboard
│   └── /production     # Production dashboard
└── /end-of-day         # End of day report
```

### Page Details

#### Home (`/`)

- **Purpose**: System overview, design system verification
- **Components**: Color swatches, typography examples, component showcase

#### NCA Form (`/nca/new`)

- **Sections**: 11 sections in Card components
- **Features**: Quality validation, AI assistance, file uploads
- **Layout**: Single column, max-width 5xl

#### MJC Form (`/mjc/new`)

- **Sections**: 11 sections in Card components
- **Features**: Work order integration, hygiene checklist, file uploads
- **Layout**: Single column, max-width 5xl

#### Register Pages (`/nca/register`, `/mjc/register`)

- **Components**: Data tables with filtering, sorting, pagination
- **Layout**: Full-width table layout

#### Detail Pages (`/nca/[id]`, `/mjc/[id]`)

- **Layout**: Read-only view with all sections
- **Features**: Print view, status updates

---

## Form Patterns

### Standard Form Field

```tsx
<div className="space-y-2">
  <Label>Field Name *</Label>
  <Input
    type="text"
    placeholder="Enter value"
    {...register('field_name')}
  />
  {errors.field_name && (
    <p className="text-red-600 text-sm mt-1">
      {errors.field_name.message}
    </p>
  )}
</div>
```

### Section Pattern

```tsx
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Field 1 */}
    <div className="space-y-2">
      <Label>Field 1</Label>
      <Input />
    </div>
    
    {/* Field 2 */}
    <div className="space-y-2">
      <Label>Field 2</Label>
      <Input />
    </div>
  </CardContent>
</Card>
```

### Grid Layout (2 columns)

```tsx
<CardContent className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Left Field</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Right Field</Label>
    <Input />
  </div>
</CardContent>
```

### Conditional Fields

```tsx
{condition && (
  <div className="border-l-4 border-blue-500 pl-4 space-y-2">
    <Label>Conditional Field *</Label>
    <Input />
  </div>
)}
```

### Radio Group Pattern

```tsx
<div className="space-y-2">
  <Label>Status</Label>
  <RadioGroup onValueChange={handleChange}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="option1" id="option1" />
      <Label htmlFor="option1">Option 1</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="option2" id="option2" />
      <Label htmlFor="option2">Option 2</Label>
    </div>
  </RadioGroup>
  {errors.status && (
    <p className="text-red-600 text-sm mt-2">
      {errors.status.message}
    </p>
  )}
</div>
```

### Form Actions

```tsx
<div className="flex justify-end space-x-4 mt-8">
  <Button variant="outline" type="button" onClick={handleCancel}>
    Cancel
  </Button>
  <Button variant="secondary" type="button" onClick={handleSaveDraft}>
    Save Draft
  </Button>
  <Button variant="default" type="submit" disabled={!isValid}>
    Submit
  </Button>
</div>
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `xs` | 375px | Small phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | **Desktop (primary)** |
| `xl` | 1280px | Large desktops |
| `2xl` | 1536px | Extra large |

### Responsive Patterns

#### Mobile-First Approach

- Base styles target mobile
- Desktop styles use `lg:` prefix
- Sidebar hidden on mobile (`hidden lg:flex`)

#### Grid Responsiveness

```tsx
{/* 1 column mobile, 2 columns desktop */}
<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

#### Navigation

- **Desktop**: Sidebar (collapsible)
- **Mobile**: Bottom navigation + drawer menu

#### Touch Targets

- Minimum size: 44x44px (iOS HIG)
- Button padding: `px-4 py-2` (minimum)
- Icon buttons: `size-9` (36px)

---

## Accessibility

### WCAG 2.1 AA Compliance

#### Color Contrast

- Text on background: Minimum 4.5:1
- Large text: Minimum 3:1
- Interactive elements: Minimum 3:1

#### Keyboard Navigation

- All interactive elements keyboard accessible
- Focus indicators visible (`focus-visible:ring-ring`)
- Tab order logical

#### Screen Readers

- Semantic HTML (`<button>`, `<label>`, `<form>`)
- ARIA labels where needed
- `aria-expanded` for collapsible elements
- `aria-invalid` for error states

#### Form Accessibility

```tsx
<Label htmlFor="field-id">Field Name</Label>
<Input
  id="field-id"
  aria-invalid={!!errors.field_name}
  aria-describedby={errors.field_name ? "field-error" : undefined}
/>
{errors.field_name && (
  <p id="field-error" className="text-red-600 text-sm mt-1">
    {errors.field_name.message}
  </p>
)}
```

---

## Animation & Interactions

### Transitions

Standard transition class:

```css
.transition-smooth {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Button Interactions

- **Hover**: Background color change
- **Active**: Scale down (`active:scale-[0.98]`)
- **Focus**: Ring indicator (`focus-visible:ring-ring`)

### Modal Animations

- **Enter**: Slide in from bottom (`animate-slide-in-from-bottom`)
- **Exit**: Fade out

### Loading States

- **Spinner**: `Loader2` icon with `animate-spin`
- **Pulse**: Subtle pulse animation for loading indicators

### Micro-interactions

- **Checkbox**: Smooth check animation
- **Radio**: Instant selection feedback
- **Input Focus**: Border color change + ring

---

## Code Conventions

### Component Structure

```tsx
'use client'; // If using hooks

import { ... } from '@/components/ui/...';
import { ... } from '@/components/...';

export default function ComponentName() {
  // State
  const [state, setState] = useState();
  
  // Handlers
  const handleAction = useCallback(() => {
    // ...
  }, [dependencies]);
  
  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### Class Naming

- Use Tailwind utility classes
- Group related classes logically
- Use `cn()` utility for conditional classes

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes',
  condition && 'conditional-class',
  className // Allow override
)}>
```

### Data Attributes

Use `data-testid` for testing:

```tsx
<Button data-testid="submit-button">Submit</Button>
```

---

## Design Tokens Reference

### CSS Variables

All design tokens are defined in `app/globals.css`:

```css
--color-primary-600: #1e40af;
--color-critical-600: #dc2626;
--font-poppins: 'Poppins', sans-serif;
--font-inter: 'Inter', sans-serif;
--radius-md: 0.5rem;
```

### Tailwind Configuration

- **Config File**: Uses Tailwind v4 with CSS-first configuration
- **Theme**: Defined in `@theme` directive in `globals.css`
- **Plugins**: shadcn/ui components

---

## Component Library

### shadcn/ui Components

All components follow shadcn/ui patterns:

- **Style**: "new-york" variant
- **Location**: `components/ui/`
- **Styling**: Tailwind CSS + CSS variables
- **Icons**: Lucide React

### Custom Components

Custom components extend base UI components:

- **Location**: `components/` (root)
- **Pattern**: Composition over configuration
- **Props**: TypeScript interfaces

---

## Best Practices

### Do's ✅

- Use consistent spacing (`space-y-2` for fields, `space-y-4` for sections)
- Use semantic color names (`text-critical`, `bg-primary-600`)
- Wrap form fields in containers with proper spacing
- Use `Card` components for all form sections
- Include error messages below inputs
- Use `Label` components with proper `htmlFor` attributes
- Test on mobile devices
- Use `data-testid` for important elements

### Don'ts ❌

- Don't use arbitrary spacing values
- Don't mix color systems (use design tokens)
- Don't skip error handling in forms
- Don't forget mobile responsive classes
- Don't use inline styles
- Don't create custom components without checking existing ones first

---

## Resources

### Documentation

- **shadcn/ui**: <https://ui.shadcn.com>
- **Tailwind CSS**: <https://tailwindcss.com>
- **Next.js**: <https://nextjs.org>
- **Lucide Icons**: <https://lucide.dev>

### Design Tools

- **Figma**: Design system (if available)
- **Color Contrast Checker**: <https://webaim.org/resources/contrastchecker/>

---

## Version History

- **v1.0** (January 2025): Initial style guide creation
  - Documented all components, pages, and patterns
  - Established spacing and color conventions
  - Added accessibility guidelines

---

**Maintained by**: OHiSee Development Team  
**Questions?**: Refer to component source code in `components/` directory
