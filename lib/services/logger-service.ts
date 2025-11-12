/**
 * Logger Service - Structured Logging with Multiple Handlers
 *
 * Provides centralized logging with support for multiple output backends.
 * Replaces scattered console.error calls with structured, contextual logging.
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Structured log entries with metadata
 * - Multiple output handlers (console, file, Sentry, etc.)
 * - User and action context tracking
 * - Performance monitoring
 * - Production-ready error tracking
 *
 * Usage:
 * ```typescript
 * import { LoggerFactory } from './logger-factory';
 *
 * const logger = LoggerFactory.createLogger('nca-actions');
 * logger.info('NCA created successfully', { ncaId: 'NCA-2025-12345' });
 * logger.error('Failed to create NCA', error, { userId: 'user-123' });
 * ```
 */

import type { LogHandler } from './log-handlers';

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log entry format
 */
export interface LogEntry {
  /** Log severity level */
  level: LogLevel;
  /** Human-readable log message */
  message: string;
  /** ISO timestamp of when log was created */
  timestamp: string;
  /** Logger name/context (e.g., 'nca-actions', 'ai-service') */
  context: string;
  /** Optional user ID for audit trail correlation */
  userId?: string;
  /** Optional action/correlation ID for tracking related operations */
  actionId?: string;
  /** Additional structured metadata */
  metadata?: Record<string, unknown>;
  /** Error details (if applicable) */
  error?: {
    message: string;
    stack?: string;
    code?: string;
    name?: string;
  };
  /** Performance metrics (optional) */
  performance?: {
    durationMs?: number;
    memoryUsageMB?: number;
  };
}

/**
 * Log level numeric values for comparison
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/**
 * Logger Service Configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output (default: 'info') */
  minLevel?: LogLevel;
  /** Enable/disable logging (default: true) */
  enabled?: boolean;
  /** Additional context to include in all logs */
  baseContext?: Record<string, unknown>;
}

/**
 * Logger Service - Main logging orchestrator
 *
 * Manages structured logging with multiple output handlers.
 * Each logger instance is scoped to a specific context (e.g., action file, service).
 */
export class LoggerService {
  private minLevelPriority: number;
  private enabled: boolean;
  private baseContext: Record<string, unknown>;

  constructor(
    private name: string,
    private handlers: LogHandler[] = [],
    config: LoggerConfig = {}
  ) {
    this.minLevelPriority = LOG_LEVEL_PRIORITY[config.minLevel || 'info'];
    this.enabled = config.enabled !== false;
    this.baseContext = config.baseContext || {};
  }

  /**
   * Log debug message (verbose development information)
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    const mergedMetadata = this.mergeMetadata(metadata);
    this.log({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context: this.name,
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    });
  }

  /**
   * Log info message (general informational events)
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    const mergedMetadata = this.mergeMetadata(metadata);
    this.log({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context: this.name,
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    });
  }

  /**
   * Log warning message (potential issues that don't prevent operation)
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    const mergedMetadata = this.mergeMetadata(metadata);
    this.log({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context: this.name,
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    });
  }

  /**
   * Log error message (errors that affect operation but system continues)
   */
  error(
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>
  ): void {
    const serializedError = this.serializeError(error);
    const mergedMetadata = this.mergeMetadata(metadata);
    this.log({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context: this.name,
      ...(serializedError ? { error: serializedError } : {}),
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    });
  }

  /**
   * Log fatal error (critical errors requiring immediate attention)
   */
  fatal(
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>
  ): void {
    const serializedError = this.serializeError(error);
    const mergedMetadata = this.mergeMetadata(metadata);
    this.log({
      level: 'fatal',
      message,
      timestamp: new Date().toISOString(),
      context: this.name,
      ...(serializedError ? { error: serializedError } : {}),
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    });
  }

  /**
   * Log with user context (automatically includes userId in all subsequent logs)
   */
  withUser(userId: string): ScopedLogger {
    return new ScopedLogger(this, { userId });
  }

  /**
   * Log with action context (for tracking related operations)
   */
  withAction(actionId: string): ScopedLogger {
    return new ScopedLogger(this, { actionId });
  }

  /**
   * Log with custom context
   */
  withContext(context: { userId?: string; actionId?: string }): ScopedLogger {
    return new ScopedLogger(this, context);
  }

  /**
   * Measure and log operation performance
   */
  async measurePerformance<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();
      const durationMs = Date.now() - startTime;
      const memoryUsageMB = this.getMemoryUsage() - startMemory;

      this.info(`${operationName} completed`, {
        ...metadata,
        performance: { durationMs, memoryUsageMB },
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.error(`${operationName} failed`, error, {
        ...metadata,
        performance: { durationMs },
      });
      throw error;
    }
  }

  /**
   * Internal log method - dispatches to all handlers
   */
  private async log(entry: LogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Check if log level meets minimum threshold
    if (LOG_LEVEL_PRIORITY[entry.level] < this.minLevelPriority) {
      return;
    }

    // Dispatch to all handlers
    const promises = this.handlers.map((handler) =>
      handler.handle(entry).catch((error) => {
        // Handler failures should not crash the application
        console.error(`Log handler failed:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Serialize error object for logging
   */
  private serializeError(error: Error | unknown): LogEntry['error'] | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {}),
        ...(error.name ? { name: error.name } : {}),
        ...((error as any).code ? { code: (error as any).code } : {}),
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
      };
    }

    if (typeof error === 'object') {
      const errorObj = error as any;
      return {
        message: errorObj.message || errorObj.error || JSON.stringify(error),
        code: errorObj.code,
      };
    }

    return {
      message: String(error),
    };
  }

  /**
   * Merge base context with provided metadata
   */
  private mergeMetadata(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!metadata && Object.keys(this.baseContext).length === 0) {
      return undefined;
    }

    return {
      ...this.baseContext,
      ...metadata,
    };
  }

  /**
   * Get current memory usage (Node.js only)
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }
}

/**
 * Scoped logger with user/action context
 *
 * Automatically includes userId and/or actionId in all log entries.
 */
export class ScopedLogger {
  constructor(
    private logger: LoggerService,
    private scope: { userId?: string; actionId?: string }
  ) {}

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(message, this.mergeScope(metadata));
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.logger.info(message, this.mergeScope(metadata));
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.logger.warn(message, this.mergeScope(metadata));
  }

  error(
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>
  ): void {
    this.logger.error(message, error, this.mergeScope(metadata));
  }

  fatal(
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, unknown>
  ): void {
    this.logger.fatal(message, error, this.mergeScope(metadata));
  }

  private mergeScope(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      ...this.scope,
      ...metadata,
    };
  }
}
