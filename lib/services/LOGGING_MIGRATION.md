# Logging Migration Guide

Quick reference for migrating from console.* calls to the LoggerService.

## Quick Start

### 1. Import the LoggerFactory

```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';
```

### 2. Create a Logger Instance

Create at the top of your function (or module level for reuse):

```typescript
export async function myAction(data: FormData) {
  const logger = LoggerFactory.createLogger('my-action-file.myAction');
  // ... rest of function
}
```

### 3. Replace console.* Calls

| Old Code | New Code |
|----------|----------|
| `console.log('Message')` | `logger.info('Message')` |
| `console.debug('Debug')` | `logger.debug('Debug')` |
| `console.warn('Warning')` | `logger.warn('Warning')` |
| `console.error('Error:', error)` | `logger.error('Error', error)` |

## Common Patterns

### Pattern 1: Simple Console Replacement

**Before:**
```typescript
console.error('Failed to create NCA:', error);
```

**After:**
```typescript
const logger = LoggerFactory.createLogger('nca-actions.createNCA');
logger.error('Failed to create NCA', error, { userId, ncType: 'raw-material' });
```

### Pattern 2: Conditional Logging

**Before:**
```typescript
if (!notificationService) {
  console.warn('Notification service not configured');
  return;
}
```

**After:**
```typescript
const logger = LoggerFactory.createLogger('nca-actions.sendNotification');
if (!notificationService) {
  logger.warn('Notification service not configured', { ncaNumber });
  return;
}
```

### Pattern 3: Error in Try-Catch

**Before:**
```typescript
try {
  await createWasteManifest(data);
} catch (error) {
  console.error('Failed to create waste manifest:', error);
  // Continue
}
```

**After:**
```typescript
const logger = LoggerFactory.createLogger('nca-actions.createNCA');
try {
  await createWasteManifest(data);
  logger.info('Waste manifest created', { ncaId: data.id });
} catch (error) {
  logger.error('Failed to create waste manifest', error, {
    ncaId: data.id,
    userId
  });
  // Continue
}
```

### Pattern 4: Success and Error Logging

**Before:**
```typescript
try {
  const result = await updateSupplierPerformance(ncaId);
  console.log('Supplier performance updated');
} catch (error) {
  console.error('Failed to update supplier performance:', error);
}
```

**After:**
```typescript
const logger = LoggerFactory.createLogger('nca-actions.createNCA');
try {
  const result = await updateSupplierPerformance(ncaId);
  logger.info('Supplier performance updated', { ncaId, userId });
} catch (error) {
  logger.error('Failed to update supplier performance', error, {
    ncaId,
    userId
  });
}
```

### Pattern 5: Multiple Logs in Same Function

**Before:**
```typescript
export async function processNCA(ncaId: string) {
  console.log('Starting NCA processing:', ncaId);

  try {
    const nca = await fetchNCA(ncaId);
    console.log('NCA fetched:', nca.id);

    await validateNCA(nca);
    console.log('NCA validated');

    const result = await submitNCA(nca);
    console.log('NCA submitted:', result.id);

    return { success: true };
  } catch (error) {
    console.error('NCA processing failed:', error);
    return { success: false, error: error.message };
  }
}
```

**After:**
```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

export async function processNCA(ncaId: string) {
  const logger = LoggerFactory.createLogger('nca-actions.processNCA');

  logger.info('Starting NCA processing', { ncaId });

  try {
    const nca = await fetchNCA(ncaId);
    logger.info('NCA fetched', { ncaId: nca.id });

    await validateNCA(nca);
    logger.info('NCA validated', { ncaId: nca.id });

    const result = await submitNCA(nca);
    logger.info('NCA submitted successfully', {
      ncaId: nca.id,
      resultId: result.id
    });

    return { success: true };
  } catch (error) {
    logger.error('NCA processing failed', error, { ncaId });
    return { success: false, error: error.message };
  }
}
```

### Pattern 6: Using Scoped Logger

**Before:**
```typescript
export async function createNCA(formData: NCAFormData, userId: string) {
  console.log('Creating NCA for user:', userId);

  try {
    const nca = await insertNCA(formData, userId);
    console.log('NCA created for user:', userId);

    await sendNotification(nca, userId);
    console.log('Notification sent for user:', userId);

    return { success: true };
  } catch (error) {
    console.error('Failed for user:', userId, error);
    return { success: false };
  }
}
```

**After:**
```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

export async function createNCA(formData: NCAFormData, userId: string) {
  const logger = LoggerFactory.createLogger('nca-actions.createNCA');
  const scopedLogger = logger.withUser(userId); // Automatically includes userId

  scopedLogger.info('Creating NCA', { ncType: formData.nc_type });

  try {
    const nca = await insertNCA(formData, userId);
    scopedLogger.info('NCA created', { ncaId: nca.id });

    await sendNotification(nca, userId);
    scopedLogger.info('Notification sent', { ncaId: nca.id });

    return { success: true };
  } catch (error) {
    scopedLogger.error('NCA creation failed', error, {
      ncType: formData.nc_type
    });
    return { success: false };
  }
}
```

## File-by-File Checklist

Use this checklist when migrating an action file:

### Step 1: Add Import
```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';
```

### Step 2: Search for Console Calls
```bash
# In your action file
grep -n "console\." app/actions/my-actions.ts
```

### Step 3: Create Logger Per Function
```typescript
export async function myAction() {
  const logger = LoggerFactory.createLogger('my-actions.myAction');
  // ...
}
```

### Step 4: Replace Each Console Call
- `console.log()` → `logger.info()`
- `console.debug()` → `logger.debug()`
- `console.warn()` → `logger.warn()`
- `console.error()` → `logger.error()`

### Step 5: Add Metadata
Include relevant context in each log:
```typescript
logger.info('Operation completed', {
  resourceId: resource.id,
  userId: user.id,
  operationType: 'create'
});
```

### Step 6: Test
Run your action and verify logs appear correctly:
```bash
npm run dev
# Perform action
# Check console output and logs/ directory
```

## Examples by Action File

### nca-actions.ts

**Status:** ✅ Partially migrated (createNCA, sendMachineDownAlert, sendSupplierNotification)

**Remaining console calls:**
- Line 315: Waste manifest creation error
- Line 342: Supplier performance update error
- Line 437: Unexpected error saving draft
- Line 503: Error listing NCAs
- ... (see file for complete list)

**Migration Example:**
```typescript
// Find all console calls
grep -n "console\." app/actions/nca-actions.ts

// Replace pattern
// Before: console.error('Failed to create waste manifest:', error);
// After:
const logger = LoggerFactory.createLogger('nca-actions.createNCA');
logger.error('Failed to create waste manifest', error, { ncaId: data.id });
```

### mjc-actions.ts

**Status:** ❌ Not migrated

**Console calls to replace:** ~15

**Quick migration:**
```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

export async function createMJC(formData: MJCFormData) {
  const logger = LoggerFactory.createLogger('mjc-actions.createMJC');

  // Replace: console.error('Error creating MJC:', error);
  // With:
  logger.error('Failed to create MJC', error, {
    userId,
    urgency: formData.urgency
  });
}
```

### ai-actions.ts

**Status:** ❌ Not migrated

**Console calls to replace:** ~12

**Quick migration:**
```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

export async function analyzeNCAQuality(ncaData: NCAFormData) {
  const logger = LoggerFactory.createLogger('ai-actions.analyzeNCAQuality');

  // Replace: console.error('NCA inline quality analysis error:', error);
  // With:
  logger.error('NCA quality analysis failed', error, {
    ncType: ncaData.nc_type,
    analysisType: 'inline'
  });
}
```

## Testing Checklist

After migrating a file:

- [ ] Import statement added
- [ ] All console.* calls replaced
- [ ] Metadata added to log calls
- [ ] Logger instance created per function
- [ ] Error objects passed to logger.error()
- [ ] Success operations logged with info()
- [ ] File compiles without errors (`npx tsc --noEmit`)
- [ ] Logs appear in console during testing
- [ ] Log format matches expected output
- [ ] No console.* calls remain (`grep -n "console\." <file>`)

## Common Mistakes

### ❌ Mistake 1: Missing Error Object

**Wrong:**
```typescript
logger.error('Failed to create NCA: ' + error.message);
```

**Correct:**
```typescript
logger.error('Failed to create NCA', error, { ncaId, userId });
```

### ❌ Mistake 2: Creating Logger on Every Call

**Wrong:**
```typescript
items.forEach(item => {
  const logger = LoggerFactory.createLogger('processor');
  logger.debug('Processing', { itemId: item.id });
});
```

**Correct:**
```typescript
const logger = LoggerFactory.createLogger('processor');
items.forEach(item => {
  logger.debug('Processing', { itemId: item.id });
});
```

### ❌ Mistake 3: Logging Sensitive Data

**Wrong:**
```typescript
logger.info('User authenticated', {
  username: user.username,
  password: user.password // ❌ Never log passwords!
});
```

**Correct:**
```typescript
logger.info('User authenticated', {
  userId: user.id,
  username: user.username
});
```

### ❌ Mistake 4: Wrong Log Level

**Wrong:**
```typescript
try {
  await createNCA(data);
  logger.debug('NCA created'); // ❌ Should be info
} catch (error) {
  logger.info('Failed to create NCA', error); // ❌ Should be error
}
```

**Correct:**
```typescript
try {
  await createNCA(data);
  logger.info('NCA created successfully', { ncaId }); // ✅
} catch (error) {
  logger.error('Failed to create NCA', error, { ncType }); // ✅
}
```

## Need Help?

1. Review `LOGGING.md` for complete documentation
2. See `app/actions/nca-actions.ts` for working examples
3. Check `lib/services/logger-service.ts` for API reference
4. Test with global logger: `import { logger } from '@/lib/services/logger-factory'`

---

**Quick Reference Card:**

```typescript
// 1. Import
import { LoggerFactory } from '@/lib/services/logger-factory';

// 2. Create logger
const logger = LoggerFactory.createLogger('my-module.myFunction');

// 3. Log at appropriate level
logger.debug('Verbose development info', { data });
logger.info('Successful operation', { resultId });
logger.warn('Potential issue', { warningType });
logger.error('Operation failed', error, { userId });
logger.fatal('Critical system failure', error, { systemState });

// 4. Use scoped logger for user context
const scopedLogger = logger.withUser(userId);
scopedLogger.info('Action completed', { actionType });
```
