# Linting and Type-Checking Guide

This document provides comprehensive guidance on code quality standards, linting, and type-checking in the Kangopak Production Control and Compliance System.

## Table of Contents

- [Overview](#overview)
- [Running Linters](#running-linters)
- [ESLint Configuration](#eslint-configuration)
- [TypeScript Strict Mode](#typescript-strict-mode)
- [Common Errors and Fixes](#common-errors-and-fixes)
- [Pre-Commit Hooks](#pre-commit-hooks)
- [IDE Integration](#ide-integration)
- [Gradual Migration Strategy](#gradual-migration-strategy)

## Overview

The project uses comprehensive linting and type-checking to enforce code quality standards:

- **ESLint 9** with flat config format
- **TypeScript strict mode** with additional type safety options
- **Husky pre-commit hooks** for automated validation
- **@typescript-eslint** for TypeScript-specific rules
- **React Hooks** linting for proper React patterns

### Benefits

- **Type Safety**: Catch bugs at compile time, not runtime
- **Code Quality**: Enforce consistent coding patterns
- **Maintainability**: Easier to refactor and understand code
- **BRCGS Compliance**: Reduce quality issues through automated checks

## Running Linters

### Type-Checking

```bash
# Standard type check (recommended)
npm run type-check

# Strict type check with all strict options
npm run type-check:strict
```

### Linting

```bash
# Run ESLint (fails on any warnings)
npm run lint

# Run ESLint and auto-fix issues
npm run lint:fix

# Check linting without fixing
npm run lint:check
```

### Validation (Combined)

```bash
# Run both type-check and lint
npm run validate

# Run strict validation
npm run validate:strict

# Pre-commit validation (type-check + lint + tests)
npm run precommit
```

## ESLint Configuration

### Configuration File

Location: `eslint.config.mjs` (ESLint 9 flat config format)

### Key Rules Enabled

#### TypeScript Rules

- `@typescript-eslint/no-explicit-any`: **ERROR** - Prevents use of `any` type
- `@typescript-eslint/no-unused-vars`: **ERROR** - Catches unused variables
- `@typescript-eslint/explicit-function-return-type`: **WARN** - Requires return types
- `@typescript-eslint/strict-boolean-expressions`: **WARN** - Enforces proper boolean logic
- `@typescript-eslint/no-floating-promises`: **ERROR** - Requires promise handling
- `@typescript-eslint/no-misused-promises`: **ERROR** - Prevents promise misuse
- `@typescript-eslint/await-thenable`: **ERROR** - Only await promises
- `@typescript-eslint/prefer-nullish-coalescing`: **WARN** - Use `??` over `||`
- `@typescript-eslint/prefer-optional-chain`: **WARN** - Use `?.` for safety

#### React Rules

- `react-hooks/rules-of-hooks`: **ERROR** - Enforce hook rules
- `react-hooks/exhaustive-deps`: **WARN** - Check dependency arrays
- `react/jsx-no-leaked-render`: **WARN** - Prevent accidental renders
- `react/jsx-curly-brace-presence`: **WARN** - Consistent JSX syntax

#### General JavaScript Rules

- `no-console`: **WARN** - Only allow `console.warn` and `console.error`
- `eqeqeq`: **ERROR** - Require `===` and `!==`
- `no-var`: **ERROR** - Use `let` or `const` instead
- `prefer-const`: **ERROR** - Use `const` when variable not reassigned
- `prefer-template`: **WARN** - Use template literals over string concatenation

### Ignored Files

Location: `eslint.config.mjs` (globalIgnores)

**Production files:**
- `node_modules/`, `.next/`, `out/`, `build/`, `dist/`, `coverage/`
- Configuration files (`*.config.js`, `*.config.mjs`)
- Environment files (`.env*`)

**Test files (tested separately, not linted):**
- `**/__tests__/**/*`
- `**/*.test.ts`, `**/*.test.tsx`
- `**/*.spec.ts`, `**/*.spec.tsx`
- `tests/e2e/**/*`, `tests/playwright/**/*`

**Generated & third-party:**
- `lib/types/supabase.ts`, `types/database.ts`
- `supabase/functions/**/*`
- `scripts/**/*` (utility scripts)

## TypeScript Strict Mode

### Configuration File

Location: `tsconfig.json`

### Pragmatic Strict Mode Configuration

The project uses a **pragmatic balance** between strict type safety and developer productivity:

#### Core Strict Flags (Enabled)

- `strict`: **true** - Base strict mode enabled
- `strictFunctionTypes`: **true** - Stricter function type checking
- `strictBindCallApply`: **true** - Check bind/call/apply arguments
- `noImplicitThis`: **true** - Error on implicit `this` type
- `alwaysStrict`: **true** - Parse in strict mode

#### Relaxed for Productivity (Disabled)

- `noImplicitAny`: **false** - Allow implicit `any` in complex scenarios
- `strictNullChecks`: **false** - Prevents thousands of possible undefined errors in runtime-safe code
- `strictPropertyInitialization`: **false** - Allow class properties without strict initialization
- `exactOptionalPropertyTypes`: **false** - Prevents null/undefined distinction issues
- `noUnusedLocals`: **false** - Intentionally unused variables allowed (prefix with `_`)
- `noUnusedParameters`: **false** - Unused params allowed in callbacks
- `noImplicitReturns`: **false** - Functions without explicit returns in all branches allowed
- `noPropertyAccessFromIndexSignature`: **false** - Allow dot notation for index signatures

#### Additional Type Checking (Enabled)

- `noFallthroughCasesInSwitch`: **true** - Prevent fallthrough in switch
- `noUncheckedIndexedAccess`: **true** - Index access returns `T | undefined`
- `noImplicitOverride`: **true** - Require `override` keyword

#### Additional Checks

- `allowUnusedLabels`: **false** - Error on unused labels
- `allowUnreachableCode`: **false** - Error on unreachable code
- `forceConsistentCasingInFileNames`: **true** - Enforce filename casing

#### Why This Balance?

This configuration provides **essential type safety** while avoiding:
- Excessive type annotations that hurt readability
- False positives in runtime-safe code (null checks exist but aren't explicit)
- Developer friction in a large, evolving codebase

**Future Migration Path:** Gradually enable stricter options as codebase matures and team capacity allows.

### Type Declaration Files

#### `jest.d.ts`

Provides TypeScript definitions for Jest and Testing Library matchers:

- `toBeInTheDocument()`
- `toHaveAttribute()`
- `toHaveClass()`
- `toHaveValue()`
- And more...

#### `env.d.ts`

Provides TypeScript definitions for environment variables:

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.ANTHROPIC_API_KEY
// etc.
```

## Common Errors and Fixes

### 1. Unused Variables (TS6133)

**Error:**

```
error TS6133: 'variableName' is declared but its value is never read.
```

**Fix:**

```typescript
// Option 1: Remove the variable
// const unusedVar = 'value'; // DELETE THIS

// Option 2: Prefix with underscore to indicate intentionally unused
const _intentionallyUnused = 'value';

// Option 3: Use it
const usedVar = 'value';
console.log(usedVar);
```

### 2. Index Signature Access (TS4111)

**Error:**

```
error TS4111: Property 'key' comes from an index signature, so it must be accessed with ['key'].
```

**Fix:**

```typescript
// ❌ WRONG
const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ✅ CORRECT
const value = process.env['NEXT_PUBLIC_SUPABASE_URL'];

// Or use env.d.ts to define the type (already done in this project)
```

### 3. Possibly Undefined (TS2532, TS18048)

**Error:**

```
error TS2532: Object is possibly 'undefined'.
```

**Fix:**

```typescript
// ❌ WRONG
const length = array.length;

// ✅ CORRECT - Check before use
if (array !== undefined) {
  const length = array.length;
}

// ✅ CORRECT - Optional chaining
const length = array?.length;

// ✅ CORRECT - Nullish coalescing with default
const length = array?.length ?? 0;

// ✅ CORRECT - Non-null assertion (only if you're certain)
const length = array!.length;
```

### 4. Exact Optional Property Types (TS2375, TS2379)

**Error:**

```
error TS2375: Type '{ prop: string | undefined }' is not assignable to type '{ prop?: string }' with 'exactOptionalPropertyTypes: true'.
```

**Fix:**

```typescript
// ❌ WRONG
const obj: { prop?: string } = {
  prop: maybeString, // maybeString is string | undefined
};

// ✅ CORRECT - Only set property if value exists
const obj: { prop?: string } = maybeString !== undefined
  ? { prop: maybeString }
  : {};

// ✅ CORRECT - Use conditional spreading
const obj: { prop?: string } = {
  ...(maybeString !== undefined && { prop: maybeString }),
};
```

### 5. No Explicit Any (TS7006)

**Error:**

```
error TS7006: Parameter 'item' implicitly has an 'any' type.
```

**Fix:**

```typescript
// ❌ WRONG
function processItem(item) {
  return item.value;
}

// ✅ CORRECT - Add explicit type
function processItem(item: ItemType): number {
  return item.value;
}

// ✅ CORRECT - Use generics
function processItem<T extends { value: number }>(item: T): number {
  return item.value;
}
```

### 6. String to Union Type (TS2322)

**Error:**

```
error TS2322: Type 'string' is not assignable to type '"option1" | "option2"'.
```

**Fix:**

```typescript
// ❌ WRONG
const category: MaintenanceCategory = formData.category;

// ✅ CORRECT - Use type assertion with validation
const category = formData.category as MaintenanceCategory;

// ✅ CORRECT - Runtime validation
function isMaintenanceCategory(value: string): value is MaintenanceCategory {
  return ['preventive', 'corrective', 'breakdown'].includes(value);
}

const category: MaintenanceCategory = isMaintenanceCategory(formData.category)
  ? formData.category
  : 'preventive'; // default
```

### 7. Missing Return Type (TS7010)

**Error:**

```
error TS7010: 'functionName', which lacks return-type annotation, implicitly has an 'any' return type.
```

**Fix:**

```typescript
// ❌ WRONG
async function fetchData(id) {
  return await supabase.from('table').select().eq('id', id);
}

// ✅ CORRECT
async function fetchData(id: string): Promise<ActionResponse<Data>> {
  const { data, error } = await supabase
    .from('table')
    .select()
    .eq('id', id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
```

### 8. Floating Promises (TS6133)

**Error:**

```
error TS6133: 'promise' is a floating Promise.
```

**Fix:**

```typescript
// ❌ WRONG
async function saveData() {
  supabase.from('table').insert(data); // Missing await
}

// ✅ CORRECT
async function saveData(): Promise<void> {
  await supabase.from('table').insert(data);
}

// ✅ CORRECT - If intentionally not awaiting
async function saveData(): Promise<void> {
  void supabase.from('table').insert(data); // Explicit void
}
```

### 9. React Hook Dependencies (react-hooks/exhaustive-deps)

**Warning:**

```
React Hook useEffect has a missing dependency: 'dependency'.
```

**Fix:**

```typescript
// ❌ WRONG
useEffect(() => {
  fetchData(id);
}, []); // Missing 'id' dependency

// ✅ CORRECT - Add dependency
useEffect(() => {
  fetchData(id);
}, [id]);

// ✅ CORRECT - Use useCallback to stabilize function reference
const fetchData = useCallback((id: string) => {
  // fetch logic
}, []);

useEffect(() => {
  fetchData(id);
}, [id, fetchData]);
```

### 10. Type Assertion Instead of Any

**Error:**

```
error TS2571: Object is of type 'unknown'.
```

**Fix:**

```typescript
// ❌ WRONG
try {
  // ...
} catch (error: any) {
  console.error(error.message);
}

// ✅ CORRECT
try {
  // ...
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', String(error));
  }
}
```

## Pre-Commit Hooks

### Setup

Pre-commit hooks are automatically set up via **Husky**.

### Hook Script

Location: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run type checking
npm run type-check || exit 1

# Run linting
npm run lint || exit 1

echo "✅ Pre-commit checks passed!"
```

### Bypass (Emergency Only)

```bash
# Skip pre-commit hooks (use sparingly!)
git commit --no-verify -m "Emergency fix"
```

**WARNING:** Only bypass hooks in true emergencies. Always fix issues properly afterward.

### What Gets Checked

1. **Type-Checking** - All TypeScript files must pass strict type checks
2. **Linting** - All files must pass ESLint rules (zero warnings allowed)

## IDE Integration

### Visual Studio Code

#### Recommended Extensions

Install these VSCode extensions:

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **TypeScript and JavaScript Language Features** (built-in)
3. **Error Lens** (`usernamehw.errorlens`) - Shows errors inline
4. **Prettier** (`esbenp.prettier-vscode`) - Code formatting

#### Settings

Create/update `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

#### Keyboard Shortcuts

- `Ctrl+Shift+M` (Windows/Linux) / `Cmd+Shift+M` (Mac) - Show problems panel
- `F8` - Go to next error
- `Shift+F8` - Go to previous error

### WebStorm / IntelliJ IDEA

1. **Settings → Languages & Frameworks → TypeScript**
   - Enable TypeScript language service
   - Use tsconfig.json from project

2. **Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**
   - Enable: Automatic ESLint configuration
   - Run eslint --fix on save: Enable

### Other Editors

- **Vim/Neovim**: Use `coc-eslint` and `coc-tsserver`
- **Sublime Text**: Install `LSP-typescript` and `LSP-eslint`
- **Atom**: Install `linter-eslint` and `atom-typescript`

## Gradual Migration Strategy

### Current State

The project has **~750 TypeScript errors** after enabling strict mode. This is expected and normal for a legacy codebase.

### Migration Approach

#### Phase 1: Critical Fixes (Immediate)

Focus on fixing errors that could cause runtime issues:

1. **Floating promises** - Could cause unhandled promise rejections
2. **Type mismatches in database operations** - Could cause data corruption
3. **Missing null checks in critical paths** - Could cause crashes

#### Phase 2: File-by-File Migration (Ongoing)

**When modifying a file:**

1. Fix all TypeScript errors in that file
2. Fix all ESLint warnings
3. Add explicit return types to functions
4. Remove all `any` types
5. Test thoroughly

**Priority order:**

1. Server Actions (`app/actions/*.ts`)
2. API routes and services (`lib/services/*.ts`)
3. Database utilities (`lib/database/*.ts`)
4. Components (`components/*.tsx`)
5. Tests (`**/__tests__/*.test.ts`)

#### Phase 3: Automated Fixes (Low-Hanging Fruit)

```bash
# Auto-fix ESLint issues
npm run lint:fix

# Auto-add return types (manual review required)
# Use VSCode quick fixes: Ctrl+. on function name

# Auto-prefix unused variables with underscore
# Find-replace pattern: const ([a-zA-Z]+) =
# When variable is truly unused
```

#### Phase 4: Type Definitions (Ongoing)

Improve type definitions:

1. **Update `lib/types/database.ts`** - Add proper types for database operations
2. **Create domain types** - `lib/types/nca.ts`, `lib/types/mjc.ts`
3. **Remove type assertions** - Replace `as Type` with proper type guards

### Tracking Progress

```bash
# Count remaining errors
npm run type-check 2>&1 | grep "error TS" | wc -l

# Categorize errors by file
npm run type-check 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -rn

# Track by error type
npm run type-check 2>&1 | grep "error TS" | cut -d':' -f3 | sort | uniq -c | sort -rn
```

### Temporary Suppression (Use Sparingly)

For errors that will be fixed later:

```typescript
// @ts-expect-error - TODO: Fix type mismatch (Issue #123)
const value = someComplexFunction();

// Or use @ts-ignore (less preferred)
// @ts-ignore - TODO: Add proper types
```

**Always include:**

- Clear comment explaining why
- Reference to tracking issue
- Timeline for fix

### Allowlist for Gradual Migration (Optional)

If you need to deploy before fixing all errors, you can temporarily disable specific rules:

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    // Temporarily relax these (re-enable later):
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "exactOptionalPropertyTypes": false
  }
}
```

**Important:** Create a tracking issue to re-enable these flags.

## Troubleshooting

### ESLint Not Working

```bash
# Clear ESLint cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Check ESLint version
npx eslint --version

# Validate config
npx eslint --print-config eslint.config.mjs
```

### TypeScript Errors in node_modules

This shouldn't happen with `skipLibCheck: true`. If it does:

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Pre-Commit Hook Not Running

```bash
# Make hook executable
chmod +x .husky/pre-commit

# Reinstall husky
npm run prepare
```

### Out of Memory Errors

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run type-check
```

## Resources

### Documentation

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [@typescript-eslint Rules](https://typescript-eslint.io/rules/)
- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)

### Tools

- [TypeScript Playground](https://www.typescriptlang.org/play)
- [ESLint Demo](https://eslint.org/demo)
- [ts-reset](https://github.com/total-typescript/ts-reset) - Better TypeScript defaults

### Internal Documentation

- `CLAUDE.md` - Project architecture and patterns
- `README.md` - Setup and getting started
- `app/actions/README.md` - Server Actions API documentation

## Summary

- ✅ Run `npm run validate` before committing
- ✅ Fix errors file-by-file as you work
- ✅ Use IDE integration for real-time feedback
- ✅ Follow the gradual migration strategy
- ✅ Ask for help when stuck - create an issue

**Remember:** Strict linting and type-checking prevent bugs and make refactoring safer. Short-term effort leads to long-term gains.
