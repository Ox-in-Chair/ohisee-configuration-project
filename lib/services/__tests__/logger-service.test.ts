/**
 * Logger Service Unit Tests
 * Tests structured logging with multiple output handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LoggerService, ScopedLogger, type LogEntry, type LogLevel } from '../logger-service';
import type { LogHandler } from '../log-handlers';

// Mock log handler for testing
class MockLogHandler implements LogHandler {
  public logs: LogEntry[] = [];
  public errors: Error[] = [];

  async handle(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
  }

  reset(): void {
    this.logs = [];
    this.errors = [];
  }
}

// Failing log handler for error testing
class FailingLogHandler implements LogHandler {
  async handle(_entry: LogEntry): Promise<void> {
    throw new Error('Handler failed');
  }
}

describe('LoggerService', () => {
  let mockHandler: MockLogHandler;
  let logger: LoggerService;

  beforeEach(() => {
    mockHandler = new MockLogHandler();
    logger = new LoggerService('test-context', [mockHandler]);
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultLogger = new LoggerService('test');
      expect(defaultLogger).toBeInstanceOf(LoggerService);
    });

    it('should accept custom minimum level', () => {
      const warnLogger = new LoggerService('test', [mockHandler], { minLevel: 'warn' });

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');

      // Only warn and above should be logged
      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('warn');
    });

    it('should accept base context', () => {
      const contextLogger = new LoggerService('test', [mockHandler], {
        baseContext: { appVersion: '1.0.0', environment: 'test' },
      });

      contextLogger.info('Test message');

      expect(mockHandler.logs[0].metadata).toMatchObject({
        appVersion: '1.0.0',
        environment: 'test',
      });
    });

    it('should allow disabling logging', () => {
      const disabledLogger = new LoggerService('test', [mockHandler], { enabled: false });

      disabledLogger.info('This should not be logged');

      expect(mockHandler.logs.length).toBe(0);
    });
  });

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      const debugLogger = new LoggerService('test', [mockHandler], { minLevel: 'debug' });

      debugLogger.debug('Debug message', { key: 'value' });

      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('debug');
      expect(mockHandler.logs[0].message).toBe('Debug message');
      expect(mockHandler.logs[0].metadata).toMatchObject({ key: 'value' });
    });

    it('should log info messages', () => {
      logger.info('Info message');

      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('info');
      expect(mockHandler.logs[0].message).toBe('Info message');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message', { reason: 'test' });

      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('warn');
      expect(mockHandler.logs[0].metadata).toMatchObject({ reason: 'test' });
    });

    it('should log error messages with Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:123';

      logger.error('Error occurred', error);

      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('error');
      expect(mockHandler.logs[0].error).toBeDefined();
      expect(mockHandler.logs[0].error?.message).toBe('Test error');
      expect(mockHandler.logs[0].error?.stack).toBeDefined();
    });

    it('should log fatal messages', () => {
      const fatalError = new Error('Critical failure');

      logger.fatal('System failure', fatalError, { severity: 'critical' });

      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('fatal');
      expect(mockHandler.logs[0].error?.message).toBe('Critical failure');
      expect(mockHandler.logs[0].metadata).toMatchObject({ severity: 'critical' });
    });
  });

  describe('Log Level Filtering', () => {
    it('should filter logs below minimum level', () => {
      const warnLogger = new LoggerService('test', [mockHandler], { minLevel: 'warn' });

      warnLogger.debug('Debug');
      warnLogger.info('Info');
      warnLogger.warn('Warn');
      warnLogger.error('Error');

      expect(mockHandler.logs.length).toBe(2);
      expect(mockHandler.logs[0].level).toBe('warn');
      expect(mockHandler.logs[1].level).toBe('error');
    });

    it('should respect log level hierarchy', () => {
      const errorLogger = new LoggerService('test', [mockHandler], { minLevel: 'error' });

      errorLogger.debug('Debug');
      errorLogger.info('Info');
      errorLogger.warn('Warn');
      errorLogger.error('Error');
      errorLogger.fatal('Fatal');

      expect(mockHandler.logs.length).toBe(2);
      expect(mockHandler.logs[0].level).toBe('error');
      expect(mockHandler.logs[1].level).toBe('fatal');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize Error objects', () => {
      const error = new Error('Test error');
      error.name = 'TestError';
      error.stack = 'Stack trace';
      (error as any).code = 'TEST_CODE';

      logger.error('Error occurred', error);

      expect(mockHandler.logs[0].error).toMatchObject({
        message: 'Test error',
        name: 'TestError',
        stack: 'Stack trace',
        code: 'TEST_CODE',
      });
    });

    it('should handle string errors', () => {
      logger.error('Error occurred', 'Simple error string');

      expect(mockHandler.logs[0].error).toMatchObject({
        message: 'Simple error string',
      });
    });

    it('should handle object errors', () => {
      const errorObj = { message: 'Custom error', code: 'CUSTOM' };

      logger.error('Error occurred', errorObj);

      expect(mockHandler.logs[0].error).toMatchObject({
        message: 'Custom error',
        code: 'CUSTOM',
      });
    });

    it('should handle unknown error types', () => {
      logger.error('Error occurred', 123);

      expect(mockHandler.logs[0].error).toMatchObject({
        message: '123',
      });
    });

    it('should handle null/undefined errors', () => {
      logger.error('Error occurred', undefined);

      expect(mockHandler.logs[0].error).toBeUndefined();
    });
  });

  describe('Metadata Handling', () => {
    it('should include metadata in logs', () => {
      logger.info('Message', { userId: '123', action: 'create' });

      expect(mockHandler.logs[0].metadata).toMatchObject({
        userId: '123',
        action: 'create',
      });
    });

    it('should merge base context with log metadata', () => {
      const contextLogger = new LoggerService('test', [mockHandler], {
        baseContext: { appVersion: '1.0.0' },
      });

      contextLogger.info('Message', { userId: '123' });

      expect(mockHandler.logs[0].metadata).toMatchObject({
        appVersion: '1.0.0',
        userId: '123',
      });
    });

    it('should override base context with log metadata', () => {
      const contextLogger = new LoggerService('test', [mockHandler], {
        baseContext: { env: 'prod' },
      });

      contextLogger.info('Message', { env: 'test' });

      expect(mockHandler.logs[0].metadata?.env).toBe('test');
    });

    it('should handle undefined metadata', () => {
      logger.info('Message');

      expect(mockHandler.logs[0].metadata).toBeUndefined();
    });
  });

  describe('Scoped Logging', () => {
    it('should create scoped logger with user ID', async () => {
      const scopedLogger = logger.withUser('user-123');

      expect(scopedLogger).toBeInstanceOf(ScopedLogger);

      scopedLogger.info('User action');

      // Wait for async handlers
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].metadata).toMatchObject({
        userId: 'user-123',
      });
    });

    it('should create scoped logger with action ID', async () => {
      const scopedLogger = logger.withAction('action-456');

      scopedLogger.info('Action performed');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].metadata).toMatchObject({
        actionId: 'action-456',
      });
    });

    it('should create scoped logger with custom context', async () => {
      const scopedLogger = logger.withContext({
        userId: 'user-123',
        actionId: 'action-456',
      });

      scopedLogger.info('Context action');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].metadata).toMatchObject({
        userId: 'user-123',
        actionId: 'action-456',
      });
    });

    it('should merge scoped context with log metadata', async () => {
      const scopedLogger = logger.withUser('user-123');

      scopedLogger.info('Message', { extra: 'data' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].metadata).toMatchObject({
        userId: 'user-123',
        extra: 'data',
      });
    });
  });

  describe('ScopedLogger Methods', () => {
    let scopedLogger: ScopedLogger;
    let debugLogger: LoggerService;

    beforeEach(() => {
      // Use debug level logger for testing scoped logger debug method
      debugLogger = new LoggerService('test-debug', [mockHandler], { minLevel: 'debug' });
      scopedLogger = debugLogger.withUser('user-123');
    });

    it('should support debug method', async () => {
      scopedLogger.debug('Debug message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].level).toBe('debug');
      expect(mockHandler.logs[0].metadata?.userId).toBe('user-123');
    });

    it('should support info method', async () => {
      scopedLogger.info('Info message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].level).toBe('info');
      expect(mockHandler.logs[0].metadata?.userId).toBe('user-123');
    });

    it('should support warn method', async () => {
      scopedLogger.warn('Warn message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].level).toBe('warn');
      expect(mockHandler.logs[0].metadata?.userId).toBe('user-123');
    });

    it('should support error method', async () => {
      const error = new Error('Test');
      scopedLogger.error('Error message', error);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].level).toBe('error');
      expect(mockHandler.logs[0].metadata?.userId).toBe('user-123');
      expect(mockHandler.logs[0].error).toBeDefined();
    });

    it('should support fatal method', async () => {
      const error = new Error('Fatal');
      scopedLogger.fatal('Fatal message', error);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].level).toBe('fatal');
      expect(mockHandler.logs[0].metadata?.userId).toBe('user-123');
    });
  });

  describe('Performance Measurement', () => {
    it('should measure successful operation performance', async () => {
      const operation = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'result';
      });

      const result = await logger.measurePerformance('test-operation', operation);

      expect(result).toBe('result');
      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('info');
      expect(mockHandler.logs[0].message).toContain('test-operation completed');
      expect(mockHandler.logs[0].metadata?.performance).toBeDefined();
      expect((mockHandler.logs[0].metadata?.performance as any).durationMs).toBeGreaterThan(0);
    });

    it('should measure failed operation performance', async () => {
      const operation = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Operation failed');
      });

      await expect(
        logger.measurePerformance('failing-operation', operation)
      ).rejects.toThrow('Operation failed');

      expect(mockHandler.logs.length).toBe(1);
      expect(mockHandler.logs[0].level).toBe('error');
      expect(mockHandler.logs[0].message).toContain('failing-operation failed');
      expect(mockHandler.logs[0].error?.message).toBe('Operation failed');
    });

    it('should include custom metadata in performance logs', async () => {
      const operation = jest.fn(async () => 'result');

      await logger.measurePerformance('test-op', operation, { extra: 'data' });

      expect(mockHandler.logs[0].metadata).toMatchObject({
        extra: 'data',
      });
    });
  });

  describe('Multiple Handlers', () => {
    it('should dispatch logs to all handlers', async () => {
      const handler1 = new MockLogHandler();
      const handler2 = new MockLogHandler();
      const multiLogger = new LoggerService('test', [handler1, handler2]);

      multiLogger.info('Test message');

      // Wait for async handlers
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler1.logs.length).toBe(1);
      expect(handler2.logs.length).toBe(1);
      expect(handler1.logs[0].message).toBe('Test message');
      expect(handler2.logs[0].message).toBe('Test message');
    });

    it('should continue logging if one handler fails', async () => {
      const workingHandler = new MockLogHandler();
      const failingHandler = new FailingLogHandler();
      const resilientLogger = new LoggerService('test', [workingHandler, failingHandler]);

      // Should not throw
      resilientLogger.info('Test message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Working handler should still receive logs
      expect(workingHandler.logs.length).toBe(1);
    });
  });

  describe('Log Entry Structure', () => {
    it('should include all required fields', () => {
      logger.info('Test message');

      const entry = mockHandler.logs[0];

      expect(entry.level).toBe('info');
      expect(entry.message).toBe('Test message');
      expect(entry.timestamp).toBeDefined();
      expect(entry.context).toBe('test-context');
    });

    it('should include ISO timestamp', () => {
      logger.info('Test');

      const timestamp = mockHandler.logs[0].timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include context name', () => {
      const contextLogger = new LoggerService('nca-actions', [mockHandler]);

      contextLogger.info('Test');

      expect(mockHandler.logs[0].context).toBe('nca-actions');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      logger.info('');

      expect(mockHandler.logs[0].message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);

      logger.info(longMessage);

      expect(mockHandler.logs[0].message).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Test\n\t"quote"\'apostrophe\'\\backslash';

      logger.info(specialMessage);

      expect(mockHandler.logs[0].message).toBe(specialMessage);
    });

    it('should handle circular references in metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw
      logger.info('Circular metadata', circular);

      expect(mockHandler.logs.length).toBe(1);
    });

    it('should handle null metadata values', () => {
      logger.info('Test', { value: null });

      expect(mockHandler.logs[0].metadata?.value).toBeNull();
    });
  });

  describe('Production Scenarios', () => {
    it('should log NCA creation', async () => {
      const ncaLogger = logger.withUser('operator-123');

      ncaLogger.info('NCA created successfully', {
        ncaId: 'NCA-2025-001',
        ncType: 'finished-goods',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].message).toBe('NCA created successfully');
      expect(mockHandler.logs[0].metadata).toMatchObject({
        userId: 'operator-123',
        ncaId: 'NCA-2025-001',
        ncType: 'finished-goods',
      });
    });

    it('should log AI service errors', async () => {
      const aiLogger = new LoggerService('ai-service', [mockHandler]);
      const error = new Error('API rate limit exceeded');
      (error as any).code = 'RATE_LIMIT';

      aiLogger.error('AI service call failed', error, {
        endpoint: '/analyze',
        retryCount: 3,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockHandler.logs[0].error?.code).toBe('RATE_LIMIT');
      expect(mockHandler.logs[0].metadata).toMatchObject({
        endpoint: '/analyze',
        retryCount: 3,
      });
    });

    it('should log database performance', async () => {
      const dbLogger = new LoggerService('database', [mockHandler]);

      const queryOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { rows: 100 };
      };

      await dbLogger.measurePerformance('fetch-ncas', queryOperation, {
        query: 'SELECT * FROM ncas',
      });

      expect(mockHandler.logs[0].message).toContain('fetch-ncas completed');
      expect(mockHandler.logs[0].metadata?.query).toBe('SELECT * FROM ncas');
    });
  });
});
