/**
 * Centralized Error Logging Utility
 *
 * Standardizes error handling across the codebase with structured logging.
 * Integrated with LoggerService for multi-handler support (console, file, Sentry).
 *
 * Usage:
 * ```typescript
 * import { logError, logSupabaseError } from '@/lib/utils/error-handler';
 *
 * // General errors
 * return logError(error, {
 *   context: 'createNCA',
 *   userId: user.id,
 *   severity: 'error'
 * });
 *
 * // Supabase errors
 * return logSupabaseError(error, {
 *   operation: 'insert',
 *   context: 'createNCA',
 *   userId: user.id
 * });
 * ```
 */

import { LoggerFactory } from '@/lib/services/logger-factory';
import type { LoggerService } from '@/lib/services/logger-service';

/**
 * Error log context for structured logging
 */
export interface ErrorLogContext {
  /** Function or operation name (e.g., 'createNCA', 'updateMJC') */
  context?: string;
  /** User ID for audit trail correlation */
  userId?: string;
  /** Correlation ID for tracking related operations */
  actionId?: string;
  /** Log severity level */
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** Additional metadata for debugging */
  metadata?: Record<string, unknown>;
}

/**
 * Supabase-specific error context
 */
export interface SupabaseErrorContext extends ErrorLogContext {
  /** Database operation type (e.g., 'insert', 'update', 'select') */
  operation: string;
}

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Supabase error shape (from @supabase/supabase-js)
 */
interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Extract user-friendly message from error object
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObj = error as any;

    // Try common error properties
    if (errorObj.message) return String(errorObj.message);
    if (errorObj.error) return String(errorObj.error);
    if (errorObj.msg) return String(errorObj.msg);

    // Try to stringify the object
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error (could not stringify)';
    }
  }

  return 'Unknown error occurred';
}

/**
 * Check if error is a Supabase error
 */
function isSupabaseError(error: any): error is SupabaseError {
  return error && typeof error === 'object' && 'message' in error;
}

/**
 * Format structured log message
 * @internal - Currently unused but kept for future logging enhancements
 */
function _formatLogMessage(
  message: string,
  context: ErrorLogContext
): string {
  const parts: string[] = [];

  if (context.context) {
    parts.push(`[${context.context}]`);
  }

  if (context.actionId) {
    parts.push(`[${context.actionId}]`);
  }

  if (context.userId) {
    parts.push(`[user:${context.userId}]`);
  }

  parts.push(message);

  return parts.join(' ');
}

/**
 * Format metadata for logging
 * @internal - Currently unused but kept for future logging enhancements
 */
function _formatMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }

  try {
    return `\nMetadata: ${JSON.stringify(metadata, null, 2)}`;
  } catch {
    return '\nMetadata: [could not serialize]';
  }
}

/**
 * Create a logger instance with context
 */
function createLoggerForContext(context: ErrorLogContext): LoggerService {
  const loggerName = context.context || 'error-handler';

  if (context.userId || context.actionId) {
    return LoggerFactory.createLogger(loggerName, {
      baseContext: {
        userId: context.userId,
        actionId: context.actionId,
      },
    });
  }

  return LoggerFactory.createLogger(loggerName);
}

/**
 * Log error with structured context
 *
 * Now integrated with LoggerService for multi-handler support.
 * Logs are sent to console, file (dev), and Sentry (prod) automatically.
 *
 * @param error - Error object or unknown value
 * @param context - Structured logging context
 * @returns Standardized error response
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   return logError(error, {
 *     context: 'createNCA',
 *     userId: user.id,
 *     severity: 'error',
 *     metadata: { ncaId: 'NCA-2025-12345' }
 *   });
 * }
 * ```
 */
export function logError(
  error: Error | unknown,
  context: ErrorLogContext = {}
): ErrorResponse {
  const severity = context.severity || 'error';
  const errorMessage = extractErrorMessage(error);

  // Use LoggerService for structured logging
  const logger = createLoggerForContext(context);

  // Log based on severity
  switch (severity) {
    case 'debug':
      logger.debug(errorMessage, context.metadata);
      break;
    case 'info':
      logger.info(errorMessage, context.metadata);
      break;
    case 'warn':
      logger.warn(errorMessage, context.metadata);
      break;
    case 'fatal':
      logger.fatal(errorMessage, error, context.metadata);
      break;
    case 'error':
    default:
      logger.error(errorMessage, error, context.metadata);
      break;
  }

  // Return standardized error response
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Log Supabase-specific errors with enhanced context
 *
 * Now integrated with LoggerService for multi-handler support.
 * Extracts Supabase error details (code, hint) for better debugging.
 *
 * @param error - Supabase error object
 * @param context - Supabase operation context
 * @returns Standardized error response
 *
 * @example
 * ```typescript
 * const { data, error } = await supabase
 *   .from('ncas')
 *   .insert(ncaData);
 *
 * if (error) {
 *   return logSupabaseError(error, {
 *     operation: 'insert',
 *     context: 'createNCA',
 *     userId: user.id,
 *     metadata: { table: 'ncas' }
 *   });
 * }
 * ```
 */
export function logSupabaseError(
  error: any,
  context: SupabaseErrorContext
): ErrorResponse {
  const severity = context.severity || 'error';
  let errorMessage = 'Database operation failed';
  const metadata: Record<string, unknown> = {
    ...context.metadata,
    operation: context.operation,
  };

  if (isSupabaseError(error)) {
    errorMessage = error.message;

    // Add Supabase-specific details to metadata
    if (error['code']) {
      metadata.code = error['code'];
    }
    if (error['details']) {
      metadata.details = error['details'];
    }
    if (error['hint']) {
      metadata.hint = error['hint'];
    }
  } else {
    errorMessage = extractErrorMessage(error);
  }

  // Enhanced log message for Supabase errors
  const enhancedMessage = `Supabase ${context.operation} error: ${errorMessage}`;

  // Use LoggerService for structured logging
  const logger = createLoggerForContext(context);

  // Log based on severity
  switch (severity) {
    case 'debug':
      logger.debug(enhancedMessage, metadata);
      break;
    case 'info':
      logger.info(enhancedMessage, metadata);
      break;
    case 'warn':
      logger.warn(enhancedMessage, metadata);
      break;
    case 'fatal':
      logger.fatal(enhancedMessage, error, metadata);
      break;
    case 'error':
    default:
      logger.error(enhancedMessage, error, metadata);
      break;
  }

  // Return user-friendly error message (hide technical details)
  return {
    success: false,
    error: `Database error: ${errorMessage}`,
  };
}

/**
 * Create a scoped logger for a specific context
 *
 * Useful for actions/services that make multiple log calls.
 *
 * @param baseContext - Base context applied to all logs
 * @returns Scoped logger functions
 *
 * @example
 * ```typescript
 * const logger = createScopedLogger({
 *   context: 'createNCA',
 *   userId: user.id,
 *   actionId: generateActionId()
 * });
 *
 * // All logs will include the base context
 * logger.error(error, { metadata: { step: 'validation' } });
 * logger.supabaseError(error, { operation: 'insert' });
 * ```
 */
export function createScopedLogger(baseContext: ErrorLogContext) {
  return {
    error: (error: Error | unknown, additionalContext?: ErrorLogContext) => {
      return logError(error, { ...baseContext, ...additionalContext });
    },
    supabaseError: (error: any, supabaseContext: Omit<SupabaseErrorContext, keyof ErrorLogContext>) => {
      return logSupabaseError(error, { ...baseContext, ...supabaseContext });
    },
  };
}
