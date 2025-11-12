# Action Utilities

This directory contains shared utility functions used across server actions.

## Available Utilities

### `lib/actions/utils.ts`

Core utility functions for server actions:

#### `generateRecordNumber(prefix: string): string`
Generates unique timestamped record numbers.
- **Format:** `PREFIX-YEAR-RANDOM8DIGITS`
- **Used by:** NCA creation, MJC creation, and other record generation
- **Example:** `generateRecordNumber('NCA')` → `'NCA-2025-12345678'`

#### `getCurrentDateString(): string`
Returns current date in ISO format (YYYY-MM-DD).
- **Format:** ISO date string
- **Used by:** All action handlers for consistent date formatting
- **Example:** `getCurrentDateString()` → `'2025-11-12'`

#### `getCurrentTimeString(): string`
Returns current time in 24-hour format (HH:MM:SS).
- **Format:** 24-hour time string
- **Used by:** All action handlers for consistent time formatting
- **Example:** `getCurrentTimeString()` → `'14:30:45'`

#### `transformSignature(formSignature): Signature | null`
Transforms form signature data to database signature format.
- **Mapping:** 'manual' → 'drawn', 'digital' → 'uploaded'
- **Used by:** NCA, MJC, and End-of-Day action handlers
- **Example:**
  ```typescript
  const dbSignature = transformSignature({
    type: 'manual',
    data: 'base64...',
    name: 'John Doe',
    timestamp: '2025-11-12T14:30:00Z'
  });
  // Returns: { type: 'drawn', name: 'John Doe', ... }
  ```

## Testing

Run tests with:
```bash
npm test -- lib/actions/__tests__/utils.test.ts
```

Test coverage: 18 tests covering all utility functions.

## Import Usage

```typescript
import { 
  generateRecordNumber, 
  getCurrentDateString, 
  getCurrentTimeString,
  transformSignature 
} from '@/lib/actions/utils';
```

## Migration Notes

- `generateRecordNumber` was moved from `@/lib/utils` to `@/lib/actions/utils` (more appropriate location)
- All action files have been updated to use the new location
- Duplicate `transformSignature` in `end-of-day-actions.ts` was removed

## Future Optimization Candidates

The following patterns were identified as potential candidates for extraction in future optimization phases:

### Date Calculations
- **`calculateDueDate()` in mjc-actions.ts** - Currently adds 14 days for temporary repairs
  - Could be generalized to `addDays(date: Date, days: number): string` if used elsewhere
  - Decision: Keep in mjc-actions.ts for now (only one usage)

### Error Handling
- Error logging is already handled by `logError` and `logSupabaseError` in `@/lib/utils/error-handler`
- No additional extraction needed

### Path Revalidation
- `revalidatePath()` calls are specific to each action context
- No common pattern worth extracting

## Architecture Principles

All utilities follow the dependency injection pattern:
- ✅ No static database calls
- ✅ Pure functions where possible
- ✅ Testable with mocks
- ✅ TypeScript type-safe
- ✅ Comprehensive JSDoc documentation
