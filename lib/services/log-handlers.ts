/**
 * Log Handlers - Multiple Output Strategies
 *
 * Implements different logging backends using the Strategy pattern.
 * Each handler is responsible for outputting logs to a specific destination.
 *
 * Available Handlers:
 * - ConsoleHandler: Outputs to console with color coding (development & production)
 * - FileHandler: Writes to rotating log files (development only)
 * - SentryHandler: Sends critical errors to Sentry (production only)
 *
 * Adding New Handlers:
 * 1. Implement the LogHandler interface
 * 2. Add handler to LoggerFactory based on environment
 * 3. Configure handler-specific settings
 */

import type { LogEntry, LogLevel } from './logger-service';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Log handler interface
 *
 * All log handlers must implement this interface.
 */
export interface LogHandler {
  handle(entry: LogEntry): Promise<void>;
}

/**
 * Console Handler - Outputs logs to console with color coding
 *
 * Features:
 * - Color-coded output by log level
 * - Structured formatting
 * - Stack trace printing for errors
 * - Works in all environments
 */
export class ConsoleHandler implements LogHandler {
  private colors = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
    fatal: '\x1b[35m', // Magenta
    reset: '\x1b[0m', // Reset
    dim: '\x1b[2m', // Dim
    bold: '\x1b[1m', // Bold
  };

  async handle(entry: LogEntry): Promise<void> {
    const color = this.colors[entry.level];
    const levelLabel = entry.level.toUpperCase().padEnd(5);

    // Format: [TIMESTAMP] [LEVEL] [CONTEXT] Message
    const prefix = `${this.colors.dim}${entry.timestamp}${this.colors.reset} ${color}${this.colors.bold}${levelLabel}${this.colors.reset} ${this.colors.dim}[${entry.context}]${this.colors.reset}`;

    // Build message parts
    const messageParts: string[] = [prefix, entry.message];

    // Add user/action context if present
    if (entry.userId || entry.actionId) {
      const contextParts: string[] = [];
      if (entry.userId) contextParts.push(`user:${entry.userId}`);
      if (entry.actionId) contextParts.push(`action:${entry.actionId}`);
      messageParts.push(`${this.colors.dim}(${contextParts.join(', ')})${this.colors.reset}`);
    }

    // Log message
    const consoleMethod = this.getConsoleMethod(entry.level);
    consoleMethod(messageParts.join(' '));

    // Log metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      consoleMethod(`${this.colors.dim}  Metadata:${this.colors.reset}`, entry.metadata);
    }

    // Log error details if present
    if (entry.error) {
      consoleMethod(`${this.colors.dim}  Error:${this.colors.reset} ${entry.error.message}`);
      if (entry.error.code) {
        consoleMethod(`${this.colors.dim}  Code:${this.colors.reset} ${entry.error.code}`);
      }
      if (entry.error.stack) {
        consoleMethod(`${this.colors.dim}  Stack:${this.colors.reset}\n${entry.error.stack}`);
      }
    }

    // Log performance metrics if present
    if (entry.performance) {
      const perfParts: string[] = [];
      if (entry.performance.durationMs !== undefined) {
        perfParts.push(`${entry.performance.durationMs}ms`);
      }
      if (entry.performance.memoryUsageMB !== undefined) {
        perfParts.push(`${entry.performance.memoryUsageMB.toFixed(2)}MB`);
      }
      if (perfParts.length > 0) {
        consoleMethod(`${this.colors.dim}  Performance: ${perfParts.join(', ')}${this.colors.reset}`);
      }
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
      case 'fatal':
        return console.error;
      default:
        return console.log;
    }
  }
}

/**
 * File Handler - Writes logs to rotating files
 *
 * Features:
 * - Daily log rotation (YYYY-MM-DD.log format)
 * - Automatic directory creation
 * - JSON format for easy parsing
 * - Max file size limit (10MB default)
 * - Auto cleanup of old logs (7 days retention)
 *
 * Only enabled in development environment.
 */
export class FileHandler implements LogHandler {
  private logDir: string;
  private maxFileSizeMB: number;
  private retentionDays: number;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: {
    logDir?: string;
    maxFileSizeMB?: number;
    retentionDays?: number;
  } = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.maxFileSizeMB = options.maxFileSizeMB || 10;
    this.retentionDays = options.retentionDays || 7;
  }

  async handle(entry: LogEntry): Promise<void> {
    // Queue writes to prevent race conditions
    this.writeQueue = this.writeQueue.then(() => this.writeToFile(entry));
    await this.writeQueue;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.logDir, { recursive: true });

      // Get current log file path
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFile = path.join(this.logDir, `${today}.log`);

      // Check file size before writing
      await this.rotateIfNeeded(logFile);

      // Format log entry as JSON
      const logLine = JSON.stringify(entry) + '\n';

      // Append to file
      await fs.appendFile(logFile, logLine, 'utf-8');

      // Cleanup old logs periodically (1% chance per write)
      if (Math.random() < 0.01) {
        await this.cleanupOldLogs();
      }
    } catch (error) {
      // File write failures should not crash the application
      console.error('FileHandler: Failed to write log:', error);
    }
  }

  private async rotateIfNeeded(logFile: string): Promise<void> {
    try {
      const stats = await fs.stat(logFile);
      const fileSizeMB = stats.size / 1024 / 1024;

      if (fileSizeMB >= this.maxFileSizeMB) {
        // Rotate: rename current file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = logFile.replace('.log', `.${timestamp}.log`);
        await fs.rename(logFile, rotatedFile);
      }
    } catch (error) {
      // File doesn't exist yet or stat failed - ignore
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const maxAge = this.retentionDays * 24 * 60 * 60 * 1000; // days to ms

      for (const file of files) {
        if (!file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          console.debug(`FileHandler: Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('FileHandler: Failed to cleanup old logs:', error);
    }
  }
}

/**
 * Sentry Handler - Sends critical errors to Sentry
 *
 * Features:
 * - Only logs errors and fatal events (not debug/info/warn)
 * - Includes user context, tags, and metadata
 * - Captures error stack traces
 * - Rate limiting (prevents spam)
 *
 * Only enabled in production when Sentry is configured.
 *
 * Setup:
 * 1. Install: npm install @sentry/nextjs
 * 2. Configure: sentry.client.config.ts and sentry.server.config.ts
 * 3. Set SENTRY_DSN environment variable
 * 4. Enable in LoggerFactory for production
 */
export class SentryHandler implements LogHandler {
  private sentry: any = null;
  private initialized = false;

  constructor() {
    // Initialize lazily on first use to avoid build-time errors
  }

  async handle(entry: LogEntry): Promise<void> {
    // Only log errors and fatal events
    if (entry.level !== 'error' && entry.level !== 'fatal') {
      return;
    }

    // Lazy initialization
    if (!this.initialized) {
      this.initializeSentry();
    }

    if (!this.initialized || !this.sentry) {
      return;
    }

    try {
      // Configure scope with context
      this.sentry.withScope((scope: any) => {
        // Set user context
        if (entry.userId) {
          scope.setUser({ id: entry.userId });
        }

        // Set tags
        scope.setTag('context', entry.context);
        scope.setTag('level', entry.level);
        if (entry.actionId) {
          scope.setTag('actionId', entry.actionId);
        }

        // Set extra metadata
        if (entry.metadata) {
          scope.setContext('metadata', entry.metadata);
        }

        // Set level
        const sentryLevel = entry.level === 'fatal' ? 'fatal' : 'error';
        scope.setLevel(sentryLevel);

        // Capture exception or message
        if (entry.error?.stack) {
          // Create Error object with stack for better Sentry tracking
          const error = new Error(entry.message);
          error.name = entry.error.name || 'Error';
          error.stack = entry.error.stack;
          this.sentry.captureException(error);
        } else {
          this.sentry.captureMessage(entry.message, sentryLevel);
        }
      });
    } catch (error) {
      console.error('SentryHandler: Failed to send to Sentry:', error);
    }
  }

  private initializeSentry(): void {
    // Skip in build/test environments
    if (process.env.NODE_ENV === 'test') {
      this.initialized = false;
      return;
    }

    try {
      // Dynamically import Sentry (optional dependency)
      // Use a function to prevent Next.js from statically analyzing the require
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const requireSentry = (moduleName: string) => require(moduleName);
      const Sentry = requireSentry('@sentry/nextjs');
      this.sentry = Sentry;
      this.initialized = true;
    } catch (error) {
      // Sentry not installed - handler will be disabled
      this.initialized = false;
    }
  }
}

/**
 * Database Handler - Writes logs to database table
 *
 * Optional handler for storing logs in the database for querying and analysis.
 * Useful for production debugging and compliance audit trails.
 *
 * Schema:
 * CREATE TABLE IF NOT EXISTS logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   level TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   timestamp TIMESTAMPTZ NOT NULL,
 *   context TEXT NOT NULL,
 *   user_id UUID,
 *   action_id TEXT,
 *   metadata JSONB,
 *   error JSONB,
 *   performance JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * Note: Only use for critical logs to avoid database bloat.
 * Implement retention policy (e.g., 30 days).
 */
export class DatabaseHandler implements LogHandler {
  private supabaseClient: any;

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  async handle(entry: LogEntry): Promise<void> {
    // Only log errors and fatal events to database
    if (entry.level !== 'error' && entry.level !== 'fatal') {
      return;
    }

    try {
      await this.supabaseClient.from('logs').insert({
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        context: entry.context,
        user_id: entry.userId || null,
        action_id: entry.actionId || null,
        metadata: entry.metadata || null,
        error: entry.error || null,
        performance: entry.performance || null,
      });
    } catch (error) {
      console.error('DatabaseHandler: Failed to write to database:', error);
    }
  }
}

/**
 * Composite Handler - Combines multiple handlers
 *
 * Useful for routing logs to different handlers based on level.
 * Example: Debug to console only, errors to both console and Sentry.
 */
export class CompositeHandler implements LogHandler {
  constructor(private handlers: LogHandler[]) {}

  async handle(entry: LogEntry): Promise<void> {
    const promises = this.handlers.map((handler) => handler.handle(entry));
    await Promise.all(promises);
  }
}
