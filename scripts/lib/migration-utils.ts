/**
 * Migration Utilities
 * Core functions for database migration execution with dependency injection
 *
 * Architecture:
 * - All database operations accept SupabaseClient as parameter (no static calls)
 * - File system operations injected via interfaces
 * - Comprehensive error handling
 * - Testable design
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface MigrationResult {
  success: boolean;
  error?: string;
  fileName: string;
  duration?: number;
}

export interface MigrationSummary {
  total: number;
  successful: number;
  failed: number;
  totalDuration: number;
  results: MigrationResult[];
}

export interface IFileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: string): string;
}

export interface ILogger {
  info(message: string): void;
  error(message: string, error?: any): void;
  warn(message: string): void;
}

// ============================================================================
// SQL Parsing
// ============================================================================

/**
 * Parse SQL into individual statements
 * Handles comments, multi-line statements, and edge cases
 *
 * Note: This is a simplified parser. For production use with complex SQL,
 * consider using a proper SQL parser library.
 */
export function parseSqlStatements(sql: string): string[] {
  // First, remove block comments (/* ... */)
  let cleanedSql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments (-- ...)
  const lines = cleanedSql.split('\n');
  const filteredLines = lines
    .filter(line => {
      const trimmed = line.trim();
      // Skip empty lines and comment lines
      if (!trimmed) return false;
      if (trimmed.startsWith('--')) return false;
      return true;
    });

  cleanedSql = filteredLines.join('\n');

  // Split by semicolons (naive - doesn't handle string literals)
  const statements = cleanedSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return statements;
}

/**
 * Validate SQL statement safety (basic checks)
 */
export function validateSqlStatement(statement: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const upperStatement = statement.toUpperCase();

  // Check for potentially dangerous operations
  if (upperStatement.includes('DROP DATABASE')) {
    warnings.push('DROP DATABASE detected - extremely dangerous');
  }

  if (upperStatement.includes('TRUNCATE') && !upperStatement.includes('CASCADE')) {
    warnings.push('TRUNCATE without CASCADE - may fail on FK constraints');
  }

  if (upperStatement.includes('ALTER TABLE') && upperStatement.includes('DROP COLUMN')) {
    warnings.push('DROP COLUMN detected - data will be lost');
  }

  return {
    valid: !upperStatement.includes('DROP DATABASE'),
    warnings,
  };
}

// ============================================================================
// Migration Execution
// ============================================================================

/**
 * Execute a single migration file
 * Returns result with success status and error details
 */
export async function executeMigration(
  client: SupabaseClient,
  sql: string,
  fileName: string,
  logger?: ILogger
): Promise<MigrationResult> {
  const startTime = Date.now();

  try {
    logger?.info(`Executing migration: ${fileName}`);

    const statements = parseSqlStatements(sql);

    if (statements.length === 0) {
      logger?.warn(`No statements found in ${fileName}`);
      return {
        success: true,
        fileName,
        duration: Date.now() - startTime,
      };
    }

    logger?.info(`  Found ${statements.length} statement(s)`);

    // Execute each statement sequentially
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Validate statement
      const validation = validateSqlStatement(statement);
      if (!validation.valid) {
        logger?.error(`  Statement ${i + 1} failed validation`);
        return {
          success: false,
          fileName,
          error: 'SQL validation failed: dangerous operation detected',
          duration: Date.now() - startTime,
        };
      }

      // Log warnings
      validation.warnings.forEach((warning) => logger?.warn(`  ${warning}`));

      // Execute via RPC
      const { error } = await client.rpc('exec_sql', {
        sql_query: statement,
      });

      if (error) {
        logger?.error(`  Statement ${i + 1} failed: ${error.message}`);
        return {
          success: false,
          fileName,
          error: error.message,
          duration: Date.now() - startTime,
        };
      }

      logger?.info(`  Statement ${i + 1}/${statements.length} executed`);
    }

    const duration = Date.now() - startTime;
    logger?.info(`  ✓ Migration completed in ${duration}ms`);

    return {
      success: true,
      fileName,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger?.error(`Migration failed: ${errorMsg}`, error);

    return {
      success: false,
      fileName,
      error: errorMsg,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute multiple migrations in sequence with rate limiting
 */
export async function executeMigrations(
  client: SupabaseClient,
  migrations: Array<{ fileName: string; sql: string }>,
  logger?: ILogger,
  delayMs: number = 500
): Promise<MigrationSummary> {
  const results: MigrationResult[] = [];
  const startTime = Date.now();

  logger?.info(`Starting batch execution of ${migrations.length} migrations`);

  for (const migration of migrations) {
    const result = await executeMigration(
      client,
      migration.sql,
      migration.fileName,
      logger
    );

    results.push(result);

    // Stop on first failure (fail-fast)
    if (!result.success) {
      logger?.error(`Stopping migration batch due to failure`);
      break;
    }

    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return calculateMigrationSummary(results, Date.now() - startTime);
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Load migration file from disk with error handling
 */
export function loadMigrationFile(
  fs: IFileSystem,
  filePath: string
): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read migration file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Discover migration files in directory
 */
export function discoverMigrationFiles(
  fs: IFileSystem,
  directory: string,
  pattern: RegExp = /^\d{8}.*\.sql$/
): string[] {
  // This is a simplified version - in production would use fs.readdirSync
  // For now, return empty array as this requires Node.js fs module
  return [];
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate migration files are in chronological order
 */
export function validateMigrationOrder(
  migrations: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (migrations.length === 0) {
    return { valid: true, errors };
  }

  // Extract timestamps from filenames
  const timestamps = migrations.map((fileName) => {
    const match = fileName.match(/^(\d{8})/);
    return match ? match[1] : '';
  });

  // Check for duplicates
  const seen = new Set<string>();
  for (const timestamp of timestamps) {
    if (timestamp && seen.has(timestamp)) {
      errors.push(`Duplicate migration timestamp: ${timestamp}`);
    }
    seen.add(timestamp);
  }

  // Check chronological order
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] && timestamps[i - 1] && timestamps[i] < timestamps[i - 1]) {
      errors.push(
        `Migration ${migrations[i]} is out of order (comes after ${migrations[i - 1]})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate environment variables are present
 */
export function validateEnvironment(env: Record<string, string | undefined>): {
  valid: boolean;
  missing: string[];
} {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Summary Calculations
// ============================================================================

/**
 * Calculate migration summary statistics
 */
export function calculateMigrationSummary(
  results: MigrationResult[],
  totalDuration: number = 0
): MigrationSummary {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  // Calculate total duration from individual results if not provided
  const calculatedDuration =
    totalDuration || results.reduce((sum, r) => sum + (r.duration || 0), 0);

  return {
    total: results.length,
    successful,
    failed,
    totalDuration: calculatedDuration,
    results,
  };
}

/**
 * Format migration summary for console output
 */
export function formatMigrationSummary(summary: MigrationSummary): string {
  const lines = [
    '=====================================',
    '📊 Migration Summary:',
    `   Total: ${summary.total}`,
    `   ✅ Successful: ${summary.successful}`,
    `   ❌ Failed: ${summary.failed}`,
    `   ⏱️  Duration: ${summary.totalDuration}ms`,
    '=====================================',
  ];

  // Add failed migrations details
  if (summary.failed > 0) {
    lines.push('');
    lines.push('Failed Migrations:');
    summary.results
      .filter((r) => !r.success)
      .forEach((r) => {
        lines.push(`  ❌ ${r.fileName}`);
        if (r.error) {
          lines.push(`     Error: ${r.error}`);
        }
      });
  }

  return lines.join('\n');
}

// ============================================================================
// Console Logger Implementation
// ============================================================================

/**
 * Simple console logger implementation
 */
export class ConsoleLogger implements ILogger {
  info(message: string): void {
    console.log(message);
  }

  error(message: string, error?: any): void {
    console.error(message);
    if (error) {
      console.error('  Details:', error);
    }
  }

  warn(message: string): void {
    console.warn(message);
  }
}
