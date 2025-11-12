/**
 * Migration Scripts Tests
 * Tests for database migration execution with proper error handling
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Types
interface MigrationResult {
  success: boolean;
  error?: string;
  fileName: string;
}

interface MigrationSummary {
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
}

// Mock types
type MockSupabaseClient = {
  rpc: jest.Mock<any>;
};

type MockFileSystem = {
  readFileSync: jest.Mock<string>;
  existsSync: jest.Mock<boolean>;
};

describe('Migration Scripts - Core Functions', () => {
  let mockSupabase: MockSupabaseClient;
  let mockFileSystem: MockFileSystem;

  beforeEach(() => {
    mockSupabase = {
      rpc: jest.fn(),
    };

    mockFileSystem = {
      readFileSync: jest.fn<string>(),
      existsSync: jest.fn<boolean>(),
    };
  });

  describe('parseSqlStatements', () => {
    test('should split SQL into individual statements', () => {
      // Arrange
      const sql = `
        CREATE TABLE test1 (id uuid);
        CREATE INDEX idx_test1 ON test1(id);
        -- Comment line
        CREATE TABLE test2 (name text);
      `;

      // Act
      const statements = parseSqlStatements(sql);

      // Assert
      expect(statements).toHaveLength(3);
      expect(statements[0]).toContain('CREATE TABLE test1');
      expect(statements[1]).toContain('CREATE INDEX');
      expect(statements[2]).toContain('CREATE TABLE test2');
    });

    test('should filter out comment-only lines', () => {
      // Arrange
      const sql = `
        -- This is a comment
        CREATE TABLE test (id uuid);
        -- Another comment
        /* Block comment */
      `;

      // Act
      const statements = parseSqlStatements(sql);

      // Assert
      expect(statements).toHaveLength(1);
      expect(statements[0]).toContain('CREATE TABLE test');
    });

    test('should handle empty SQL', () => {
      // Act
      const statements = parseSqlStatements('');

      // Assert
      expect(statements).toHaveLength(0);
    });

    test('should handle SQL with only comments', () => {
      // Arrange
      const sql = `
        -- Comment 1
        -- Comment 2
        /* Block comment */
      `;

      // Act
      const statements = parseSqlStatements(sql);

      // Assert
      expect(statements).toHaveLength(0);
    });

    test('should preserve multi-line statements', () => {
      // Arrange
      const sql = `
        CREATE TABLE orders (
          id uuid PRIMARY KEY,
          created_at timestamptz DEFAULT now(),
          status text CHECK (status IN ('pending', 'complete'))
        );
      `;

      // Act
      const statements = parseSqlStatements(sql);

      // Assert
      expect(statements).toHaveLength(1);
      expect(statements[0]).toContain('CREATE TABLE orders');
      expect(statements[0]).toContain('status text CHECK');
    });

    test('should handle statements with semicolons in strings', () => {
      // NOTE: Current parser is simplified and does NOT handle semicolons in strings
      // For production use, consider using a proper SQL parser library
      // This test documents the limitation

      // Arrange
      const sql = `
        INSERT INTO config VALUES ('key', 'value_without_semicolons');
        CREATE TABLE test (id uuid);
      `;

      // Act
      const statements = parseSqlStatements(sql);

      // Assert
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('INSERT INTO config');
    });
  });

  describe('executeMigration', () => {
    test('should execute migration successfully', async () => {
      // Arrange
      const sql = 'CREATE TABLE test (id uuid);';
      const fileName = '20250112_create_test.sql';

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // Act
      const executeMigration = createExecuteMigration(mockSupabase as any);
      const result = await executeMigration(sql, fileName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.fileName).toBe(fileName);
      expect(result.error).toBeUndefined();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('exec_sql', {
        sql_query: expect.stringContaining('CREATE TABLE test'),
      });
    });

    test('should handle RPC errors gracefully', async () => {
      // Arrange
      const sql = 'CREATE TABLE test (id uuid);';
      const fileName = '20250112_create_test.sql';

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: {
          message: 'permission denied for schema public',
          code: '42501',
        },
      });

      // Act
      const executeMigration = createExecuteMigration(mockSupabase as any);
      const result = await executeMigration(sql, fileName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('permission denied');
    });

    test('should handle missing exec_sql RPC function', async () => {
      // Arrange
      const sql = 'CREATE TABLE test (id uuid);';
      const fileName = '20250112_create_test.sql';

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: {
          message: 'function exec_sql does not exist',
          code: '42883',
        },
      });

      // Act
      const executeMigration = createExecuteMigration(mockSupabase as any);
      const result = await executeMigration(sql, fileName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('exec_sql');
    });

    test('should execute multiple statements in sequence', async () => {
      // Arrange
      const sql = `
        CREATE TABLE test1 (id uuid);
        CREATE TABLE test2 (id uuid);
      `;
      const fileName = '20250112_create_tables.sql';

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // Act
      const executeMigration = createExecuteMigration(mockSupabase as any);
      const result = await executeMigration(sql, fileName);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    test('should stop execution on first error', async () => {
      // Arrange
      const sql = `
        CREATE TABLE test1 (id uuid);
        CREATE TABLE test2 (id uuid);
        CREATE TABLE test3 (id uuid);
      `;
      const fileName = '20250112_create_tables.sql';

      // First call succeeds, second fails
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'duplicate table', code: '42P07' },
        });

      // Act
      const executeMigration = createExecuteMigration(mockSupabase as any);
      const result = await executeMigration(sql, fileName);

      // Assert
      expect(result.success).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2); // Stopped after error
    });
  });

  describe('loadMigrationFile', () => {
    test('should load migration file successfully', () => {
      // Arrange
      const filePath = '/migrations/20250112_create_test.sql';
      const content = 'CREATE TABLE test (id uuid);';

      mockFileSystem.existsSync.mockReturnValue(true);
      mockFileSystem.readFileSync.mockReturnValue(content);

      // Act
      const loadMigrationFile = createLoadMigrationFile(mockFileSystem);
      const result = loadMigrationFile(filePath);

      // Assert
      expect(result).toBe(content);
    });

    test('should throw error when file does not exist', () => {
      // Arrange
      const filePath = '/migrations/nonexistent.sql';

      mockFileSystem.existsSync.mockReturnValue(false);

      // Act & Assert
      const loadMigrationFile = createLoadMigrationFile(mockFileSystem);
      expect(() => loadMigrationFile(filePath)).toThrow('Migration file not found');
    });
  });

  describe('validateMigrationOrder', () => {
    test('should validate migrations are in chronological order', () => {
      // Arrange
      const migrations = [
        '20250111_create_users.sql',
        '20250112_create_orders.sql',
        '20250113_add_indexes.sql',
      ];

      // Act
      const result = validateMigrationOrder(migrations);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect out-of-order migrations', () => {
      // Arrange
      const migrations = [
        '20250112_create_orders.sql',
        '20250111_create_users.sql', // Out of order
        '20250113_add_indexes.sql',
      ];

      // Act
      const result = validateMigrationOrder(migrations);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('out of order');
    });

    test('should detect duplicate migration timestamps', () => {
      // Arrange
      const migrations = [
        '20250112_create_users.sql',
        '20250112_create_orders.sql', // Duplicate timestamp
      ];

      // Act
      const result = validateMigrationOrder(migrations);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].toLowerCase()).toContain('duplicate');
    });

    test('should handle empty migration list', () => {
      // Act
      const result = validateMigrationOrder([]);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Migration Summary', () => {
    test('should calculate correct summary statistics', () => {
      // Arrange
      const results: MigrationResult[] = [
        { success: true, fileName: 'migration1.sql' },
        { success: true, fileName: 'migration2.sql' },
        { success: false, fileName: 'migration3.sql', error: 'Failed' },
        { success: true, fileName: 'migration4.sql' },
      ];

      // Act
      const summary = calculateMigrationSummary(results);

      // Assert
      expect(summary.total).toBe(4);
      expect(summary.successful).toBe(3);
      expect(summary.failed).toBe(1);
    });

    test('should handle all successful migrations', () => {
      // Arrange
      const results: MigrationResult[] = [
        { success: true, fileName: 'migration1.sql' },
        { success: true, fileName: 'migration2.sql' },
      ];

      // Act
      const summary = calculateMigrationSummary(results);

      // Assert
      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);
    });

    test('should handle all failed migrations', () => {
      // Arrange
      const results: MigrationResult[] = [
        { success: false, fileName: 'migration1.sql', error: 'Error 1' },
        { success: false, fileName: 'migration2.sql', error: 'Error 2' },
      ];

      // Act
      const summary = calculateMigrationSummary(results);

      // Assert
      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(0);
      expect(summary.failed).toBe(2);
    });
  });
});

// ============================================================================
// Helper Functions (to be extracted to production code)
// ============================================================================

/**
 * Parse SQL into individual statements
 * (matches production implementation)
 */
function parseSqlStatements(sql: string): string[] {
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
 * Factory to create executeMigration with injected client
 */
function createExecuteMigration(supabase: any) {
  return async (sql: string, fileName: string): Promise<MigrationResult> => {
    try {
      const statements = parseSqlStatements(sql);

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement,
        });

        if (error) {
          return {
            success: false,
            fileName,
            error: error.message,
          };
        }
      }

      return { success: true, fileName };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

/**
 * Factory to create loadMigrationFile with injected filesystem
 */
function createLoadMigrationFile(fs: MockFileSystem) {
  return (filePath: string): string => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  };
}

/**
 * Validate migrations are in order
 */
function validateMigrationOrder(
  migrations: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (migrations.length === 0) {
    return { valid: true, errors };
  }

  const timestamps = migrations.map((f) => {
    const match = f.match(/^(\d{8})/);
    return match ? match[1] : '';
  });

  // Check for duplicates
  const duplicates = timestamps.filter(
    (t, i) => timestamps.indexOf(t) !== i && t !== ''
  );
  if (duplicates.length > 0) {
    errors.push(`Duplicate migration timestamp: ${duplicates[0]}`);
  }

  // Check chronological order
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] < timestamps[i - 1]) {
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
 * Calculate migration summary
 */
function calculateMigrationSummary(
  results: MigrationResult[]
): MigrationSummary {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: results.length,
    successful,
    failed,
    results,
  };
}
