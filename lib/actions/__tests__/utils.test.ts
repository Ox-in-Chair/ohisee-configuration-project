/**
 * Tests for lib/actions/utils
 * Validates utility functions used across server actions
 */

import {
  generateRecordNumber,
  getCurrentDateString,
  getCurrentTimeString,
  transformSignature,
} from '../utils';
import type { Signature } from '@/types/database';

describe('lib/actions/utils', () => {
  describe('generateRecordNumber', () => {
    it('should generate record number with correct format', () => {
      const ncaNumber = generateRecordNumber('NCA');

      expect(ncaNumber).toMatch(/^NCA-\d{4}-\d{8}$/);
    });

    it('should include current year', () => {
      const currentYear = new Date().getFullYear();
      const mjcNumber = generateRecordNumber('MJC');

      expect(mjcNumber).toContain(`-${currentYear}-`);
    });

    it('should generate different numbers on subsequent calls', () => {
      const num1 = generateRecordNumber('NCA');
      const num2 = generateRecordNumber('NCA');

      // While theoretically possible to be the same (1 in 100 million chance),
      // this should virtually always pass
      expect(num1).not.toBe(num2);
    });

    it('should work with different prefixes', () => {
      const prefixes = ['NCA', 'MJC', 'MRN', 'WO', 'TEST'];

      prefixes.forEach(prefix => {
        const recordNumber = generateRecordNumber(prefix);
        expect(recordNumber).toMatch(new RegExp(`^${prefix}-`));
      });
    });

    it('should pad random number to 8 digits', () => {
      // Run multiple times to ensure padding works for small random numbers
      for (let i = 0; i < 10; i++) {
        const recordNumber = generateRecordNumber('TEST');
        const parts = recordNumber.split('-');
        expect(parts[2]).toHaveLength(8);
      }
    });
  });

  describe('getCurrentDateString', () => {
    it('should return date in ISO format (YYYY-MM-DD)', () => {
      const dateString = getCurrentDateString();

      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return current date', () => {
      const dateString = getCurrentDateString();
      const today = new Date().toISOString().split('T')[0];

      expect(dateString).toBe(today);
    });
  });

  describe('getCurrentTimeString', () => {
    it('should return time in 24-hour format (HH:MM:SS)', () => {
      const timeString = getCurrentTimeString();

      expect(timeString).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should not contain AM/PM', () => {
      const timeString = getCurrentTimeString();

      expect(timeString).not.toContain('AM');
      expect(timeString).not.toContain('PM');
    });

    it('should have valid hour range (00-23)', () => {
      const timeString = getCurrentTimeString();
      const hour = parseInt(timeString.split(':')[0], 10);

      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
    });

    it('should have valid minute and second range (00-59)', () => {
      const timeString = getCurrentTimeString();
      const [, minute, second] = timeString.split(':').map(s => parseInt(s, 10));

      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThan(60);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThan(60);
    });
  });

  describe('transformSignature', () => {
    const mockTimestamp = '2025-11-12T14:30:00Z';

    it('should transform manual signature to drawn type', () => {
      const formSignature = {
        type: 'manual' as const,
        data: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        name: 'John Doe',
        timestamp: mockTimestamp,
      };

      const result = transformSignature(formSignature);

      expect(result).toEqual({
        type: 'drawn',
        name: 'John Doe',
        timestamp: mockTimestamp,
        ip: '0.0.0.0',
        data: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      });
    });

    it('should transform digital signature to uploaded type', () => {
      const formSignature = {
        type: 'digital' as const,
        data: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        name: 'Jane Smith',
        timestamp: mockTimestamp,
      };

      const result = transformSignature(formSignature);

      expect(result).toEqual({
        type: 'uploaded',
        name: 'Jane Smith',
        timestamp: mockTimestamp,
        ip: '0.0.0.0',
        data: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      });
    });

    it('should return null when signature is null', () => {
      const result = transformSignature(null);

      expect(result).toBeNull();
    });

    it('should return null when signature is undefined', () => {
      const result = transformSignature(undefined);

      expect(result).toBeNull();
    });

    it('should preserve all signature data fields', () => {
      const formSignature = {
        type: 'manual' as const,
        data: 'test-data-string',
        name: 'Test User',
        timestamp: mockTimestamp,
      };

      const result = transformSignature(formSignature);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.name).toBe('Test User');
        expect(result.timestamp).toBe(mockTimestamp);
        expect(result.data).toBe('test-data-string');
      }
    });

    it('should match Signature type structure', () => {
      const formSignature = {
        type: 'manual' as const,
        data: 'test-data',
        name: 'Test',
        timestamp: mockTimestamp,
      };

      const result = transformSignature(formSignature);

      // Type check - result should be assignable to Signature | null
      const typedResult: Signature | null = result;
      expect(typedResult).toBeDefined();
    });
  });

  describe('Integration tests', () => {
    it('should work together for creating NCA/MJC records', () => {
      // Simulate what happens in NCA/MJC creation
      const recordNumber = generateRecordNumber('NCA');
      const date = getCurrentDateString();
      const time = getCurrentTimeString();
      const signature = transformSignature({
        type: 'manual',
        data: 'signature-data',
        name: 'Operator',
        timestamp: new Date().toISOString(),
      });

      expect(recordNumber).toMatch(/^NCA-\d{4}-\d{8}$/);
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(signature).not.toBeNull();
      expect(signature?.type).toBe('drawn');
    });
  });
});
