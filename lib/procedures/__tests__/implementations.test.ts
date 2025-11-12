/**
 * Unit Tests - Concrete Implementations
 * Tests for NodeFileReader and ConsoleLogger implementations
 * Target: >95% coverage
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock fs module BEFORE importing the implementation
const mockReadFile = jest.fn();
const mockAccess = jest.fn();

jest.mock('fs', () => ({
  promises: {
    readFile: mockReadFile,
    access: mockAccess,
  },
  constants: {
    F_OK: 0,
  },
}));

// Now import the implementations
import { NodeFileReader, ConsoleLogger } from '../implementations';

describe('NodeFileReader', () => {
  let fileReader: NodeFileReader;

  beforeEach(() => {
    fileReader = new NodeFileReader();
    mockReadFile.mockReset();
    mockAccess.mockReset();
  });

  describe('readFile', () => {
    test('should read file successfully with utf-8 encoding', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'File content';
      mockReadFile.mockResolvedValue(content);

      const result = await fileReader.readFile(filePath, 'utf-8');

      expect(result).toBe(content);
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    test('should read file with different encoding', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'File content';
      mockReadFile.mockResolvedValue(content);

      const result = await fileReader.readFile(filePath, 'ascii');

      expect(result).toBe(content);
      expect(mockReadFile).toHaveBeenCalledWith(filePath, 'ascii');
    });

    test('should throw error when file read fails', async () => {
      const filePath = '/path/to/nonexistent.txt';
      const error = new Error('ENOENT: no such file or directory');
      mockReadFile.mockRejectedValue(error);

      await expect(fileReader.readFile(filePath, 'utf-8')).rejects.toThrow('ENOENT');
    });

    test('should handle empty file content', async () => {
      const filePath = '/path/to/empty.txt';
      mockReadFile.mockResolvedValue('');

      const result = await fileReader.readFile(filePath, 'utf-8');

      expect(result).toBe('');
    });

    test('should handle large file content', async () => {
      const filePath = '/path/to/large.txt';
      const largeContent = 'x'.repeat(10000);
      mockReadFile.mockResolvedValue(largeContent);

      const result = await fileReader.readFile(filePath, 'utf-8');

      expect(result).toBe(largeContent);
      expect(result.length).toBe(10000);
    });
  });

  describe('fileExists', () => {
    test('should return true when file exists', async () => {
      const filePath = '/path/to/existing.txt';
      mockAccess.mockResolvedValue(undefined);

      const result = await fileReader.fileExists(filePath);

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith(filePath, 0); // F_OK = 0
    });

    test('should return false when file does not exist', async () => {
      const filePath = '/path/to/nonexistent.txt';
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await fileReader.fileExists(filePath);

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith(filePath, 0);
    });

    test('should return false on permission error', async () => {
      const filePath = '/path/to/forbidden.txt';
      mockAccess.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await fileReader.fileExists(filePath);

      expect(result).toBe(false);
    });

    test('should handle multiple file checks', async () => {
      mockAccess
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const result1 = await fileReader.fileExists('/file1.txt');
      const result2 = await fileReader.fileExists('/file2.txt');
      const result3 = await fileReader.fileExists('/file3.txt');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(true);
    });
  });
});

describe('ConsoleLogger', () => {
  let logger: ConsoleLogger;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    logger = new ConsoleLogger();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('info', () => {
    test('should log info message without context', () => {
      const message = 'Test info message';
      logger.info(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`);
    });

    test('should log info message with context', () => {
      const message = 'Test info message';
      const context = { userId: '123', action: 'upload' };
      logger.info(message, context);

      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, context);
    });

    test('should handle empty message', () => {
      logger.info('');

      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ️  ');
    });

    test('should handle complex context objects', () => {
      const message = 'Complex context';
      const context = {
        user: { id: '123', name: 'Test User' },
        metadata: { revision: 5, timestamp: '2025-11-12' },
      };
      logger.info(message, context);

      expect(consoleLogSpy).toHaveBeenCalledWith(`ℹ️  ${message}`, context);
    });
  });

  describe('error', () => {
    test('should log error message without error object', () => {
      const message = 'Test error message';
      logger.error(message);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ ${message}`);
    });

    test('should log error message with error object', () => {
      const message = 'Test error message';
      const error = new Error('Something went wrong');
      logger.error(message, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ ${message}`, error);
    });

    test('should handle error string', () => {
      const message = 'Test error';
      const errorString = 'Error details';
      logger.error(message, errorString);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ ${message}`, errorString);
    });

    test('should handle error with stack trace', () => {
      const message = 'Stack trace error';
      const error = new Error('Error with stack');
      error.stack = 'Error: Error with stack\n  at test.ts:123';
      logger.error(message, error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ ${message}`, error);
    });
  });

  describe('warn', () => {
    test('should log warning message without context', () => {
      const message = 'Test warning message';
      logger.warn(message);

      expect(consoleWarnSpy).toHaveBeenCalledWith(`⚠️  ${message}`);
    });

    test('should log warning message with context', () => {
      const message = 'Test warning message';
      const context = { code: 'DEPRECATED', severity: 'low' };
      logger.warn(message, context);

      expect(consoleWarnSpy).toHaveBeenCalledWith(`⚠️  ${message}`, context);
    });

    test('should handle empty warning message', () => {
      logger.warn('');

      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  ');
    });

    test('should handle null context', () => {
      const message = 'Warning with null context';
      logger.warn(message, null as any);

      expect(consoleWarnSpy).toHaveBeenCalledWith(`⚠️  ${message}`, null);
    });

    test('should handle undefined context', () => {
      const message = 'Warning with undefined context';
      logger.warn(message, undefined);

      expect(consoleWarnSpy).toHaveBeenCalledWith(`⚠️  ${message}`);
    });
  });

  describe('multiple log calls', () => {
    test('should handle multiple sequential log calls', () => {
      logger.info('Info 1');
      logger.warn('Warning 1');
      logger.error('Error 1');
      logger.info('Info 2', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
