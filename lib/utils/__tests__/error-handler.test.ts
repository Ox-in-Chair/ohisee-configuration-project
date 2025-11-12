/**
 * Unit Tests for lib/utils/error-handler.ts
 * Test error extraction, logging, and response formatting
 */

import {
  logError,
  logSupabaseError,
  createScopedLogger,
  type ErrorLogContext,
  type SupabaseErrorContext,
  type ErrorResponse,
} from '../error-handler';
import { LoggerFactory } from '@/lib/services/logger-factory';
import type { LoggerService } from '@/lib/services/logger-service';

// Mock LoggerFactory
jest.mock('@/lib/services/logger-factory');

describe('lib/utils/error-handler', () => {
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    // Create mock logger instance
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as any;

    // Mock LoggerFactory.createLogger to return our mock logger
    (LoggerFactory.createLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logError - basic functionality', () => {
    test('returns ErrorResponse object', () => {
      const error = new Error('Test error');
      const result = logError(error);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
    });

    test('extracts message from Error object', () => {
      const error = new Error('Test error message');
      const result = logError(error);

      expect(result.error).toBe('Test error message');
    });

    test('extracts message from string error', () => {
      const error = 'String error message';
      const result = logError(error);

      expect(result.error).toBe('String error message');
    });

    test('logs with error severity by default', () => {
      const error = new Error('Test error');
      logError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        error,
        undefined
      );
    });

    test('creates logger with context name (no baseContext when no userId/actionId)', () => {
      const error = new Error('Test error');
      const context: ErrorLogContext = { context: 'createNCA' };

      logError(error, context);

      // When no userId or actionId, createLogger is called without second parameter
      expect(LoggerFactory.createLogger).toHaveBeenCalledWith('createNCA');
    });

    test('creates logger with default name when no context provided', () => {
      const error = new Error('Test error');
      logError(error);

      expect(LoggerFactory.createLogger).toHaveBeenCalledWith('error-handler');
    });
  });

  describe('logError - error message extraction', () => {
    test('extracts message from Error instance', () => {
      const error = new Error('Error instance message');
      const result = logError(error);

      expect(result.error).toBe('Error instance message');
    });

    test('extracts message from string', () => {
      const error = 'Plain string error';
      const result = logError(error);

      expect(result.error).toBe('Plain string error');
    });

    test('extracts message from object with message property', () => {
      const error = { message: 'Object with message' };
      const result = logError(error);

      expect(result.error).toBe('Object with message');
    });

    test('extracts message from object with error property', () => {
      const error = { error: 'Object with error' };
      const result = logError(error);

      expect(result.error).toBe('Object with error');
    });

    test('extracts message from object with msg property', () => {
      const error = { msg: 'Object with msg' };
      const result = logError(error);

      expect(result.error).toBe('Object with msg');
    });

    test('stringifies object without recognized properties', () => {
      const error = { custom: 'value', other: 123 };
      const result = logError(error);

      expect(result.error).toBe(JSON.stringify(error));
    });

    test('handles null error', () => {
      const result = logError(null);

      expect(result.error).toBe('Unknown error occurred');
    });

    test('handles undefined error', () => {
      const result = logError(undefined);

      expect(result.error).toBe('Unknown error occurred');
    });

    test('handles number error', () => {
      const result = logError(123);

      expect(result.error).toBe('Unknown error occurred');
    });

    test('handles circular reference in object', () => {
      const error: any = { message: 'Circular' };
      error.self = error; // Create circular reference

      const result = logError(error);

      // Should extract message property before attempting stringify
      expect(result.error).toBe('Circular');
    });
  });

  describe('logError - severity levels', () => {
    test('logs as debug when severity is debug', () => {
      const error = new Error('Debug error');
      const context: ErrorLogContext = { severity: 'debug' };

      logError(error, context);

      expect(mockLogger.debug).toHaveBeenCalledWith('Debug error', undefined);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('logs as info when severity is info', () => {
      const error = new Error('Info error');
      const context: ErrorLogContext = { severity: 'info' };

      logError(error, context);

      expect(mockLogger.info).toHaveBeenCalledWith('Info error', undefined);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('logs as warn when severity is warn', () => {
      const error = new Error('Warning error');
      const context: ErrorLogContext = { severity: 'warn' };

      logError(error, context);

      expect(mockLogger.warn).toHaveBeenCalledWith('Warning error', undefined);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('logs as error when severity is error', () => {
      const error = new Error('Error severity');
      const context: ErrorLogContext = { severity: 'error' };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Error severity', error, undefined);
    });

    test('logs as fatal when severity is fatal', () => {
      const error = new Error('Fatal error');
      const context: ErrorLogContext = { severity: 'fatal' };

      logError(error, context);

      expect(mockLogger.fatal).toHaveBeenCalledWith('Fatal error', error, undefined);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('defaults to error severity when not specified', () => {
      const error = new Error('No severity specified');
      logError(error);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('logError - context metadata', () => {
    test('passes metadata to logger', () => {
      const error = new Error('Test error');
      const context: ErrorLogContext = {
        context: 'createNCA',
        metadata: { ncaId: 'NCA-2025-001', step: 'validation' },
      };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        error,
        { ncaId: 'NCA-2025-001', step: 'validation' }
      );
    });

    test('passes userId and actionId to logger factory', () => {
      const error = new Error('Test error');
      const context: ErrorLogContext = {
        context: 'createNCA',
        userId: 'user-123',
        actionId: 'action-456',
      };

      logError(error, context);

      expect(LoggerFactory.createLogger).toHaveBeenCalledWith('createNCA', {
        baseContext: {
          userId: 'user-123',
          actionId: 'action-456',
        },
      });
    });

    test('handles empty metadata', () => {
      const error = new Error('Test error');
      const context: ErrorLogContext = {
        context: 'createNCA',
        metadata: {},
      };

      logError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', error, {});
    });
  });

  describe('logSupabaseError - basic functionality', () => {
    test('returns ErrorResponse object', () => {
      const error = { message: 'Database error' };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
      };

      const result = logSupabaseError(error, context);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
    });

    test('enhances error message with operation context', () => {
      const error = { message: 'Unique constraint violation' };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Supabase insert error: Unique constraint violation',
        error,
        expect.objectContaining({ operation: 'insert' })
      );
    });

    test('returns user-friendly error message', () => {
      const error = { message: 'Technical database error' };
      const context: SupabaseErrorContext = {
        operation: 'update',
        context: 'updateNCA',
      };

      const result = logSupabaseError(error, context);

      expect(result.error).toBe('Database error: Technical database error');
    });

    test('includes operation in metadata', () => {
      const error = { message: 'Database error' };
      const context: SupabaseErrorContext = {
        operation: 'delete',
        context: 'deleteNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({ operation: 'delete' })
      );
    });
  });

  describe('logSupabaseError - Supabase-specific error details', () => {
    test('extracts code from Supabase error', () => {
      const error = {
        message: 'Constraint violation',
        code: '23505',
      };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({ code: '23505' })
      );
    });

    test('extracts details from Supabase error', () => {
      const error = {
        message: 'Constraint violation',
        details: 'Duplicate key value violates unique constraint',
      };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          details: 'Duplicate key value violates unique constraint',
        })
      );
    });

    test('extracts hint from Supabase error', () => {
      const error = {
        message: 'Constraint violation',
        hint: 'Check your data before inserting',
      };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          hint: 'Check your data before inserting',
        })
      );
    });

    test('extracts all Supabase error fields', () => {
      const error = {
        message: 'Constraint violation',
        code: '23505',
        details: 'Duplicate key',
        hint: 'Use unique values',
      };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          operation: 'insert',
          code: '23505',
          details: 'Duplicate key',
          hint: 'Use unique values',
        })
      );
    });

    test('handles non-Supabase error format', () => {
      const error = new Error('Generic error');
      const context: SupabaseErrorContext = {
        operation: 'select',
        context: 'getNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Supabase select error: Generic error',
        error,
        expect.objectContaining({ operation: 'select' })
      );
    });
  });

  describe('logSupabaseError - metadata merging', () => {
    test('merges context metadata with operation', () => {
      const error = { message: 'Database error' };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
        metadata: { table: 'ncas', recordId: 'NCA-2025-001' },
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({
          operation: 'insert',
          table: 'ncas',
          recordId: 'NCA-2025-001',
        })
      );
    });

    test('operation is added even with empty metadata', () => {
      const error = { message: 'Database error' };
      const context: SupabaseErrorContext = {
        operation: 'update',
        context: 'updateNCA',
      };

      logSupabaseError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        error,
        expect.objectContaining({ operation: 'update' })
      );
    });
  });

  describe('logSupabaseError - severity levels', () => {
    test('logs as debug when severity is debug', () => {
      const error = { message: 'Debug message' };
      const context: SupabaseErrorContext = {
        operation: 'select',
        context: 'getNCA',
        severity: 'debug',
      };

      logSupabaseError(error, context);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('logs as warn when severity is warn', () => {
      const error = { message: 'Warning message' };
      const context: SupabaseErrorContext = {
        operation: 'select',
        context: 'getNCA',
        severity: 'warn',
      };

      logSupabaseError(error, context);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('logs as fatal when severity is fatal', () => {
      const error = { message: 'Fatal error' };
      const context: SupabaseErrorContext = {
        operation: 'insert',
        context: 'createNCA',
        severity: 'fatal',
      };

      logSupabaseError(error, context);

      expect(mockLogger.fatal).toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('createScopedLogger', () => {
    test('returns object with error and supabaseError methods', () => {
      const baseContext: ErrorLogContext = { context: 'TestContext' };
      const logger = createScopedLogger(baseContext);

      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('supabaseError');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.supabaseError).toBe('function');
    });

    test('error method uses base context', () => {
      const baseContext: ErrorLogContext = {
        context: 'createNCA',
        userId: 'user-123',
      };
      const logger = createScopedLogger(baseContext);

      const error = new Error('Test error');
      logger.error(error);

      expect(LoggerFactory.createLogger).toHaveBeenCalledWith('createNCA', {
        baseContext: {
          userId: 'user-123',
          actionId: undefined,
        },
      });
    });

    test('error method merges additional context', () => {
      const baseContext: ErrorLogContext = {
        context: 'createNCA',
        userId: 'user-123',
      };
      const logger = createScopedLogger(baseContext);

      const error = new Error('Test error');
      logger.error(error, { metadata: { step: 'validation' } });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        error,
        { step: 'validation' }
      );
    });

    test('supabaseError method uses base context', () => {
      const baseContext: ErrorLogContext = {
        context: 'createNCA',
        userId: 'user-123',
      };
      const logger = createScopedLogger(baseContext);

      const error = { message: 'Database error' };
      logger.supabaseError(error, { operation: 'insert' });

      expect(LoggerFactory.createLogger).toHaveBeenCalledWith('createNCA', {
        baseContext: {
          userId: 'user-123',
          actionId: undefined,
        },
      });
    });

    test('supabaseError method merges operation context', () => {
      const baseContext: ErrorLogContext = {
        context: 'createNCA',
        userId: 'user-123',
      };
      const logger = createScopedLogger(baseContext);

      const error = { message: 'Database error' };
      logger.supabaseError(error, { operation: 'insert' });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Supabase insert error: Database error',
        error,
        expect.objectContaining({ operation: 'insert' })
      );
    });

    test('scoped logger can be reused for multiple calls', () => {
      const baseContext: ErrorLogContext = { context: 'TestContext' };
      const logger = createScopedLogger(baseContext);

      logger.error(new Error('Error 1'));
      logger.error(new Error('Error 2'));
      logger.supabaseError({ message: 'DB Error' }, { operation: 'select' });

      // mockLogger.error is called 3 times total (2 from logger.error, 1 from logger.supabaseError)
      expect(mockLogger.error).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Error 1', expect.any(Error), undefined);
      expect(mockLogger.error).toHaveBeenNthCalledWith(2, 'Error 2', expect.any(Error), undefined);
      // Third call is from supabaseError
      expect(mockLogger.error).toHaveBeenNthCalledWith(
        3,
        'Supabase select error: DB Error',
        { message: 'DB Error' },
        expect.objectContaining({ operation: 'select' })
      );
    });
  });

  describe('edge cases and error handling', () => {
    test('handles logger creation failure gracefully', () => {
      (LoggerFactory.createLogger as jest.Mock).mockImplementation(() => {
        throw new Error('Logger creation failed');
      });

      expect(() => {
        const error = new Error('Test error');
        logError(error);
      }).toThrow('Logger creation failed');
    });

    test('handles object with non-standard error properties', () => {
      const error = { errorCode: 'E001', details: 'Something went wrong' };
      const result = logError(error);

      // Should stringify the object when no recognized property
      expect(result.error).toBe(JSON.stringify(error));
    });

    test('handles non-serializable circular objects', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      circularObj.data = { nested: circularObj };

      // Should not throw but handle gracefully
      const result = logError(circularObj);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error (could not stringify)');
    });

    test('handles extremely long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      const result = logError(error);

      expect(result.error).toBe(longMessage);
      expect(result.error.length).toBe(10000);
    });

    test('handles unicode characters in error messages', () => {
      const error = new Error('Error with unicode: 你好 🎉 المرحبا');
      const result = logError(error);

      expect(result.error).toBe('Error with unicode: 你好 🎉 المرحبا');
    });

    test('handles nested error objects', () => {
      const error = {
        message: 'Outer error',
        cause: {
          message: 'Inner error',
        },
      };

      const result = logError(error);

      expect(result.error).toBe('Outer error');
    });

    test('returns consistent ErrorResponse structure', () => {
      const errors = [
        new Error('Error 1'),
        'String error',
        { message: 'Object error' },
        null,
        undefined,
      ];

      errors.forEach(error => {
        const result = logError(error);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('error');
        expect(result.success).toBe(false);
        expect(typeof result.error).toBe('string');
      });
    });
  });
});
