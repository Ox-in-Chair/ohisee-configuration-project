# Logging Infrastructure Documentation

## Overview

The OHiSee system uses a comprehensive, structured logging infrastructure to replace scattered `console.error` calls with a centralized, multi-handler logging service. This system supports multiple output backends (console, file, Sentry) and provides rich contextual information for debugging and monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Code                        │
│  (Actions, Services, Components)                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    LoggerFactory                             │
│  Creates logger instances with appropriate handlers          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   LoggerService                              │
│  Orchestrates logging with structured entries                │
└───┬───────────────┬──────────────────┬─────────────────────┘
    │               │                  │
    ▼               ▼                  ▼
┌──────────┐  ┌──────────┐      ┌──────────────┐
│ Console  │  │  File    │      │   Sentry     │
│ Handler  │  │ Handler  │      │   Handler    │
│          │  │          │      │              │
│ (stdout) │  │ (logs/)  │      │ (production) │
└──────────┘  └──────────┘      └──────────────┘
```

## Core Components

### 1. LoggerService (`lib/services/logger-service.ts`)

The main logging orchestrator that manages structured logging with multiple output handlers.

**Key Features:**
- Five log levels: `debug`, `info`, `warn`, `error`, `fatal`
- Structured log entries with metadata
- User and action context tracking
- Performance measurement
- Scoped loggers for contextual logging

### 2. Log Handlers (`lib/services/log-handlers.ts`)

Strategy pattern implementations for different output destinations.

**Available Handlers:**
- **ConsoleHandler**: Color-coded console output (all environments)
- **FileHandler**: Rotating log files with retention (development only)
- **SentryHandler**: Critical error tracking (production only)
- **DatabaseHandler**: Optional database logging for audit trails
- **CompositeHandler**: Combine multiple handlers

### 3. LoggerFactory (`lib/services/logger-factory.ts`)

Creates logger instances with environment-appropriate handlers.

**Environment Configurations:**
- **Development**: Console (color-coded) + File (7-day retention)
- **Test**: Console only (minimal output, warn+ level)
- **Production**: Console + Sentry (critical errors only)

## Usage Guide

### Basic Usage

```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

// Create a logger for your module
const logger = LoggerFactory.createLogger('nca-actions');

// Log at different levels
logger.debug('Detailed debug information', { debugData: {...} });
logger.info('NCA created successfully', { ncaId: 'NCA-2025-12345' });
logger.warn('Supplier email not found', { supplierName: 'ABC Corp' });
logger.error('Failed to create NCA', error, { userId: 'user-123' });
logger.fatal('Critical system failure', error, { systemState: {...} });
```

### Contextual Logging (Recommended)

Use scoped loggers to automatically include user/action context:

```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

export async function createNCA(formData: NCAFormData) {
  const logger = LoggerFactory.createLogger('nca-actions.createNCA');

  try {
    const userId = await getUserId();

    // All subsequent logs include userId automatically
    const scopedLogger = logger.withUser(userId);

    scopedLogger.info('Starting NCA creation', { ncType: formData.nc_type });

    // ... perform operations ...

    scopedLogger.info('NCA created successfully', { ncaId: nca.id });
  } catch (error) {
    logger.error('NCA creation failed', error, {
      ncType: formData.nc_type
    });
  }
}
```

### Performance Measurement

Track operation performance automatically:

```typescript
const logger = LoggerFactory.createLogger('ai-service');

const result = await logger.measurePerformance(
  'AI Quality Analysis',
  async () => {
    return await analyzeQuality(ncaData);
  },
  { ncaId: 'NCA-2025-12345' }
);

// Automatically logs:
// - Operation duration (ms)
// - Memory usage (MB)
// - Success/failure status
```

### Integration with Error Handler

The existing error handler (`lib/utils/error-handler.ts`) is now integrated with the logger service:

```typescript
import { logError, logSupabaseError } from '@/lib/utils/error-handler';

// General errors (automatically uses logger service)
return logError(error, {
  context: 'createNCA',
  userId: user.id,
  severity: 'error',
  metadata: { ncaId: 'NCA-2025-12345' }
});

// Supabase errors (enhanced with DB context)
if (error) {
  return logSupabaseError(error, {
    operation: 'insert',
    context: 'createNCA',
    userId: user.id,
    metadata: { table: 'ncas' }
  });
}
```

## Log Levels

Choose the appropriate log level based on severity:

| Level   | When to Use | Examples | Production Output |
|---------|-------------|----------|-------------------|
| `debug` | Verbose development information | Variable values, function entry/exit | No (filtered out) |
| `info`  | General informational events | Successful operations, workflow milestones | Yes |
| `warn`  | Potential issues (non-critical) | Missing optional data, graceful degradation | Yes |
| `error` | Errors affecting operation | Failed API calls, validation errors | Yes (+ Sentry) |
| `fatal` | Critical system failures | Database connection lost, unrecoverable errors | Yes (+ Sentry + Alert) |

## Log Entry Format

All logs follow a structured format:

```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;                    // Human-readable message
  timestamp: string;                  // ISO 8601 timestamp
  context: string;                    // Logger name (e.g., 'nca-actions')
  userId?: string;                    // Optional user ID
  actionId?: string;                  // Optional correlation ID
  metadata?: Record<string, unknown>; // Additional structured data
  error?: {                           // Error details (if applicable)
    message: string;
    stack?: string;
    code?: string;
    name?: string;
  };
  performance?: {                     // Performance metrics (optional)
    durationMs?: number;
    memoryUsageMB?: number;
  };
}
```

## Console Output Format

Development console output is color-coded for easy scanning:

```
2025-01-12T10:30:45.123Z INFO  [nca-actions.createNCA] NCA created successfully
  Metadata: {
    "ncaId": "abc-123",
    "ncaNumber": "NCA-2025-12345",
    "userId": "user-456",
    "ncType": "raw-material"
  }

2025-01-12T10:30:46.789Z ERROR [nca-actions.sendSupplierNotification] Failed to send notification (user:user-456)
  Error: SMTP connection refused
  Code: ECONNREFUSED
  Stack:
    at SMTPConnection.connect (smtp.js:123)
    at sendEmail (notification-service.ts:45)
```

**Color Legend:**
- 🔵 `DEBUG` - Cyan
- 🟢 `INFO` - Green
- 🟡 `WARN` - Yellow
- 🔴 `ERROR` - Red
- 🟣 `FATAL` - Magenta

## File Logging

Development file logs are stored in `logs/` directory:

**File Format:**
```
logs/
├── 2025-01-12.log          # Today's logs (JSON lines)
├── 2025-01-11.log          # Yesterday's logs
├── 2025-01-10.log          # Older logs
└── 2025-01-09.2025-01-09T14-23-45.log  # Rotated log (exceeded 10MB)
```

**Configuration:**
- Max file size: 10MB
- Retention: 7 days (development), 30 days (production)
- Format: JSON lines (one log entry per line)
- Auto-rotation: When file exceeds max size
- Auto-cleanup: Old logs deleted automatically

**Reading Logs:**
```bash
# View today's logs
cat logs/$(date +%Y-%m-%d).log | jq

# Filter by level
cat logs/2025-01-12.log | jq 'select(.level == "error")'

# Search for specific context
cat logs/2025-01-12.log | jq 'select(.context | contains("nca-actions"))'

# Find errors for specific user
cat logs/2025-01-12.log | jq 'select(.userId == "user-123" and .level == "error")'
```

## Sentry Integration (Production)

Critical errors are automatically sent to Sentry in production.

### Setup

1. **Install Sentry SDK:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure Sentry:**
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Set Environment Variable:**
   ```bash
   # .env.production
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

4. **Enable in LoggerFactory:**
   The SentryHandler is automatically enabled in production when `SENTRY_DSN` is set.

### What Gets Sent to Sentry

- Only `error` and `fatal` level logs
- Full stack traces
- User context (if userId provided)
- Custom tags: `context`, `actionId`, `level`
- Metadata as additional context
- Environment info (production/staging)

### Sentry Breadcrumbs

All `info` and `warn` logs are sent as breadcrumbs to provide context for errors:

```typescript
// These logs create breadcrumbs
logger.info('NCA creation started', { ncType: 'raw-material' });
logger.warn('Supplier email not found', { supplier: 'ABC Corp' });

// When this error occurs, Sentry includes above breadcrumbs
logger.error('Failed to create NCA', error);
```

## Best Practices

### ✅ DO

1. **Create a logger per module/action:**
   ```typescript
   const logger = LoggerFactory.createLogger('nca-actions.createNCA');
   ```

2. **Include relevant metadata:**
   ```typescript
   logger.error('Failed to update NCA', error, {
     ncaId: nca.id,
     userId: user.id,
     updateFields: Object.keys(changes),
   });
   ```

3. **Use scoped loggers for user context:**
   ```typescript
   const scopedLogger = logger.withUser(userId);
   scopedLogger.info('Operation completed');
   ```

4. **Log at appropriate levels:**
   ```typescript
   // Info for successful operations
   logger.info('NCA created successfully', { ncaId: nca.id });

   // Warn for recoverable issues
   logger.warn('Email service unavailable, queued for retry', { ncaId: nca.id });

   // Error for failures
   logger.error('Database insert failed', error, { table: 'ncas' });
   ```

5. **Include error objects:**
   ```typescript
   logger.error('API call failed', error, { endpoint: '/api/ncas' });
   ```

### ❌ DON'T

1. **Don't use console.* directly:**
   ```typescript
   // ❌ Bad
   console.error('Failed to create NCA:', error);

   // ✅ Good
   logger.error('Failed to create NCA', error, { ncaId: nca.id });
   ```

2. **Don't log sensitive information:**
   ```typescript
   // ❌ Bad
   logger.info('User logged in', { password: user.password });

   // ✅ Good
   logger.info('User logged in', { userId: user.id });
   ```

3. **Don't create logger in hot paths:**
   ```typescript
   // ❌ Bad (creates logger on every iteration)
   items.forEach(item => {
     const logger = LoggerFactory.createLogger('processor');
     logger.debug('Processing item', { itemId: item.id });
   });

   // ✅ Good (create once, reuse)
   const logger = LoggerFactory.createLogger('processor');
   items.forEach(item => {
     logger.debug('Processing item', { itemId: item.id });
   });
   ```

4. **Don't log excessively in loops:**
   ```typescript
   // ❌ Bad (100+ log entries)
   items.forEach(item => {
     logger.debug('Processing item', { itemId: item.id });
   });

   // ✅ Good (summary logging)
   logger.info('Processing items', { itemCount: items.length });
   // ... process items ...
   logger.info('Items processed', { successCount, failureCount });
   ```

## Migration Guide

### Replacing console.* Calls

**Before:**
```typescript
console.error('Failed to create NCA:', error);
console.warn('Supplier email not found');
console.log('NCA created:', nca.id);
```

**After:**
```typescript
import { LoggerFactory } from '@/lib/services/logger-factory';

const logger = LoggerFactory.createLogger('nca-actions.createNCA');

logger.error('Failed to create NCA', error, { userId: user.id });
logger.warn('Supplier email not found', { supplier: supplier.name });
logger.info('NCA created successfully', { ncaId: nca.id });
```

### Using Existing Error Handler

The error handler is already integrated with the logger service:

**Before:**
```typescript
try {
  await createNCA(data);
} catch (error) {
  console.error('Failed to create NCA:', error);
  return { success: false, error: 'Failed to create NCA' };
}
```

**After:**
```typescript
import { logError } from '@/lib/utils/error-handler';

try {
  await createNCA(data);
} catch (error) {
  return logError(error, {
    context: 'createNCA',
    userId: user.id,
    metadata: { ncType: data.nc_type }
  });
}
```

## Configuration Options

### Logger Creation Options

```typescript
const logger = LoggerFactory.createLogger('my-module', {
  // Minimum log level (default: 'info' prod, 'debug' dev)
  minLevel: 'debug',

  // Environment override (auto-detected by default)
  environment: 'production',

  // Enable/disable Sentry (default: true in production)
  enableSentry: true,

  // Enable/disable file logging (default: true in development)
  enableFile: false,

  // Base context included in all logs
  baseContext: {
    service: 'nca-service',
    version: '1.0.0',
  },

  // Custom handlers (replaces default handlers)
  customHandlers: [
    new ConsoleHandler(),
    new CustomHandler(),
  ],
});
```

### File Handler Options

```typescript
import { FileHandler } from '@/lib/services/log-handlers';

const fileHandler = new FileHandler({
  // Log directory (default: './logs')
  logDir: '/var/log/ohisee',

  // Max file size in MB (default: 10)
  maxFileSizeMB: 20,

  // Retention in days (default: 7)
  retentionDays: 30,
});
```

## Troubleshooting

### Logs Not Appearing

1. **Check log level:**
   ```typescript
   // Debug logs are filtered in production
   logger.debug('This won\'t show in prod');

   // Use info or higher
   logger.info('This will show');
   ```

2. **Check environment:**
   ```bash
   # Ensure NODE_ENV is set correctly
   echo $NODE_ENV
   ```

3. **Check file permissions:**
   ```bash
   # Ensure logs directory is writable
   ls -la logs/
   ```

### Sentry Not Receiving Errors

1. **Verify DSN is set:**
   ```bash
   echo $SENTRY_DSN
   ```

2. **Check Sentry SDK installation:**
   ```bash
   npm list @sentry/nextjs
   ```

3. **Only errors/fatal logs sent:**
   ```typescript
   // Won't be sent to Sentry
   logger.info('User logged in');

   // Will be sent to Sentry
   logger.error('Login failed', error);
   ```

### High Log Volume

1. **Increase log level threshold:**
   ```typescript
   const logger = LoggerFactory.createLogger('my-module', {
     minLevel: 'warn', // Only warn, error, fatal
   });
   ```

2. **Disable file logging:**
   ```typescript
   const logger = LoggerFactory.createLogger('my-module', {
     enableFile: false,
   });
   ```

3. **Use conditional logging:**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     logger.debug('Verbose debug info', { data });
   }
   ```

## Performance Considerations

### Logger Creation

Creating loggers is lightweight, but reuse is recommended:

```typescript
// ✅ Create once at module level
const logger = LoggerFactory.createLogger('nca-actions');

export async function createNCA(data: NCAFormData) {
  logger.info('Creating NCA', { ncType: data.nc_type });
  // ...
}
```

### File Handler Performance

- File writes are **asynchronous** (non-blocking)
- Writes are **queued** to prevent race conditions
- File rotation is **lazy** (checked before write)
- Cleanup is **probabilistic** (1% chance per write)

### Sentry Rate Limiting

Sentry has rate limits to prevent cost overruns:

- Free tier: 5,000 events/month
- Production tier: 50,000 events/month

Use appropriate log levels to avoid exceeding limits.

## Future Enhancements

Planned improvements to the logging infrastructure:

1. **Database Handler**: Store critical logs in Supabase for querying and compliance
2. **Log Viewer UI**: Development dashboard for browsing logs
3. **Alert Rules**: Trigger notifications on specific log patterns
4. **Log Aggregation**: Integration with DataDog, LogRocket, or CloudWatch
5. **Structured Querying**: GraphQL/REST API for log queries
6. **Performance Profiling**: Automatic slow operation detection

## Support

For questions or issues with the logging system:

1. Check this documentation
2. Review examples in `app/actions/nca-actions.ts`
3. Examine log handler implementations in `lib/services/log-handlers.ts`
4. Test with the global logger: `import { logger } from '@/lib/services/logger-factory'`

---

**Version:** 1.0.0
**Last Updated:** 2025-01-12
**Owner:** Production Manager (Kangopak)
