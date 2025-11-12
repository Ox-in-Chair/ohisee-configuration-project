/**
 * Logger Factory - Centralized Logger Creation
 *
 * Creates logger instances with appropriate handlers based on environment.
 * Simplifies logger creation with sensible defaults.
 *
 * Environment-Specific Handlers:
 * - Development: Console (color-coded) + File (rotating logs)
 * - Test: Console only (minimal output)
 * - Production: Console + Sentry (critical errors only)
 *
 * Usage:
 * ```typescript
 * import { LoggerFactory } from '@/lib/services/logger-factory';
 *
 * // Basic usage
 * const logger = LoggerFactory.createLogger('nca-actions');
 * logger.info('NCA created', { ncaId: 'NCA-2025-12345' });
 *
 * // With custom options
 * const logger = LoggerFactory.createLogger('ai-service', {
 *   minLevel: 'debug',
 *   enableSentry: true,
 * });
 * ```
 */

import { LoggerService } from './logger-service';
import type { LogLevel } from './logger-service';
import {
  ConsoleHandler,
  FileHandler,
  SentryHandler,
  type LogHandler,
} from './log-handlers';

/**
 * Environment types
 */
type Environment = 'development' | 'test' | 'production';

/**
 * Logger creation options
 */
export interface LoggerOptions {
  /** Minimum log level (default: 'info' for prod, 'debug' for dev) */
  minLevel?: LogLevel;
  /** Environment override (auto-detected if not provided) */
  environment?: Environment;
  /** Enable Sentry handler (default: true for production, false otherwise) */
  enableSentry?: boolean;
  /** Enable file handler (default: true for development, false otherwise) */
  enableFile?: boolean;
  /** Additional base context for all logs */
  baseContext?: Record<string, unknown>;
  /** Custom handlers (overrides default handlers) */
  customHandlers?: LogHandler[];
}

/**
 * Logger Factory - Creates configured logger instances
 */
export class LoggerFactory {
  /**
   * Create a logger with automatic environment detection
   *
   * @param name - Logger name/context (e.g., 'nca-actions', 'ai-service')
   * @param options - Optional configuration
   * @returns Configured LoggerService instance
   */
  static createLogger(name: string, options: LoggerOptions = {}): LoggerService {
    const environment = options.environment || this.detectEnvironment();
    const handlers = options.customHandlers || this.createHandlers(environment, options);
    const minLevel = options.minLevel || this.getDefaultLogLevel(environment);

    return new LoggerService(name, handlers, {
      minLevel,
      ...(options.baseContext ? { baseContext: options.baseContext } : {}),
    });
  }

  /**
   * Create logger with user context (convenience method)
   */
  static createLoggerWithUser(
    name: string,
    userId: string,
    options: LoggerOptions = {}
  ): LoggerService {
    return this.createLogger(name, {
      ...options,
      baseContext: {
        ...options.baseContext,
        userId,
      },
    });
  }

  /**
   * Create logger with action context (convenience method)
   */
  static createLoggerWithAction(
    name: string,
    actionId: string,
    options: LoggerOptions = {}
  ): LoggerService {
    return this.createLogger(name, {
      ...options,
      baseContext: {
        ...options.baseContext,
        actionId,
      },
    });
  }

  /**
   * Detect current environment
   */
  private static detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV;

    if (nodeEnv === 'test') {
      return 'test';
    }

    if (nodeEnv === 'production') {
      return 'production';
    }

    return 'development';
  }

  /**
   * Get default log level for environment
   */
  private static getDefaultLogLevel(environment: Environment): LogLevel {
    switch (environment) {
      case 'development':
        return 'debug';
      case 'test':
        return 'warn'; // Reduce test noise
      case 'production':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Create handlers based on environment and options
   */
  private static createHandlers(
    environment: Environment,
    options: LoggerOptions
  ): LogHandler[] {
    const handlers: LogHandler[] = [];

    // Always include console handler
    handlers.push(new ConsoleHandler());

    // File handler (development only by default)
    const enableFile = options.enableFile ?? environment === 'development';
    if (enableFile && environment !== 'test') {
      try {
        const retentionDays = environment === 'production' ? 30 : 7;
        handlers.push(new FileHandler({ retentionDays }));
      } catch (error) {
        console.warn('FileHandler initialization failed:', error);
      }
    }

    // Sentry handler (production only by default)
    // Note: SentryHandler is disabled during build to avoid module resolution errors
    // It will be enabled at runtime if @sentry/nextjs is installed
    const enableSentry = options.enableSentry ?? environment === 'production';
    if (enableSentry && this.isSentryConfigured()) {
      try {
        handlers.push(new SentryHandler());
      } catch (error) {
        // Sentry not installed - gracefully continue without it
        console.warn('SentryHandler not available (optional dependency not installed)');
      }
    }

    return handlers;
  }

  /**
   * Check if Sentry is configured
   */
  private static isSentryConfigured(): boolean {
    // Check for Sentry DSN in environment
    return !!process.env['SENTRY_DSN'] || !!process.env['NEXT_PUBLIC_SENTRY_DSN'];
  }
}

/**
 * Global logger instance for quick access
 *
 * Use this for one-off logging. For consistent context, create a logger instance.
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/services/logger-factory';
 *
 * logger.info('Quick log message');
 * logger.error('Something went wrong', error);
 * ```
 */
export const logger = LoggerFactory.createLogger('global');

/**
 * Helper function to create a logger (alias for LoggerFactory.createLogger)
 */
export function createLogger(name: string, options?: LoggerOptions): LoggerService {
  return LoggerFactory.createLogger(name, options);
}
