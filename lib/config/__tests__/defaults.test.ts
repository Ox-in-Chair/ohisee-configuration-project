/**
 * Unit Tests for lib/config/defaults.ts
 * Test date calculation functions and default value merging
 */

import {
  getCurrentDate,
  getCurrentTimestamp,
  getCurrentTime,
  calculateTemporaryRepairDueDate,
  calculateNCAClosureDeadline,
  mergeWithDefaults,
  NCA_DEFAULTS,
  MJC_DEFAULTS,
  SIGNATURE_DEFAULTS,
  WORK_ORDER_DEFAULTS,
  DASHBOARD_FILTER_DEFAULTS,
  QUALITY_SCORE_DEFAULTS,
  AI_SUGGESTION_DEFAULTS,
  NOTIFICATION_DEFAULTS,
} from '../defaults';
import { NCA_STATUS, MJC_STATUS } from '../constants';

describe('lib/config/defaults - Date Functions', () => {
  describe('getCurrentDate', () => {
    test('returns date in ISO format (YYYY-MM-DD)', () => {
      const date = getCurrentDate();

      // Should match YYYY-MM-DD format
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('returns current date', () => {
      const result = getCurrentDate();
      const expected = new Date().toISOString().split('T')[0];

      expect(result).toBe(expected);
    });

    test('returns consistent format across multiple calls', () => {
      const date1 = getCurrentDate();
      const date2 = getCurrentDate();

      // Should have same format
      expect(date1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(date2).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Within same test run, should be same date
      expect(date1).toBe(date2);
    });
  });

  describe('getCurrentTimestamp', () => {
    test('returns ISO 8601 timestamp', () => {
      const timestamp = getCurrentTimestamp();

      // Should match ISO 8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('returns valid Date-parseable string', () => {
      const timestamp = getCurrentTimestamp();
      const parsed = new Date(timestamp);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getTime()).not.toBeNaN();
    });

    test('timestamps are sequential', () => {
      const ts1 = getCurrentTimestamp();
      const ts2 = getCurrentTimestamp();

      const time1 = new Date(ts1).getTime();
      const time2 = new Date(ts2).getTime();

      expect(time2).toBeGreaterThanOrEqual(time1);
    });

    test('timestamp is in UTC', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/Z$/); // Ends with 'Z' for UTC
    });
  });

  describe('getCurrentTime', () => {
    test('returns time in HH:MM:SS format', () => {
      const time = getCurrentTime();

      // Should match HH:MM:SS format (24-hour)
      expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    test('returns 24-hour format', () => {
      const time = getCurrentTime();
      const parts = time.split(':');

      const hours = parseInt(parts[0]!, 10);
      const minutes = parseInt(parts[1]!, 10);
      const seconds = parseInt(parts[2]!, 10);

      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThan(24);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThan(60);
      expect(seconds).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeLessThan(60);
    });

    test('uses en-GB locale (24-hour clock)', () => {
      const time = getCurrentTime();

      // Should not contain AM/PM
      expect(time).not.toMatch(/am|pm|AM|PM/);
    });
  });

  describe('calculateTemporaryRepairDueDate', () => {
    test('returns date 14 days from today', () => {
      const dueDate = calculateTemporaryRepairDueDate();
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(expected.getDate() + 14);

      const dueDateObj = new Date(dueDate);
      const expectedFormatted = expected.toISOString().split('T')[0];

      expect(dueDate).toBe(expectedFormatted);
    });

    test('returns date in ISO format', () => {
      const dueDate = calculateTemporaryRepairDueDate();
      expect(dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('handles month transitions correctly', () => {
      // Mock a date near end of month
      const mockDate = new Date('2025-01-25');
      const spy = jest.spyOn(global, 'Date').mockImplementation((() => mockDate) as any);

      const dueDate = calculateTemporaryRepairDueDate();

      // Should be in February
      expect(dueDate).toBe('2025-02-08');

      spy.mockRestore();
    });

    test('handles year transitions correctly', () => {
      // Mock a date near end of year
      const mockDate = new Date('2025-12-25');
      const spy = jest.spyOn(global, 'Date').mockImplementation((() => mockDate) as any);

      const dueDate = calculateTemporaryRepairDueDate();

      // Should be in next year
      expect(dueDate).toBe('2026-01-08');

      spy.mockRestore();
    });

    test('always returns future date', () => {
      const dueDate = calculateTemporaryRepairDueDate();
      const today = new Date();
      const dueDateObj = new Date(dueDate);

      expect(dueDateObj.getTime()).toBeGreaterThan(today.getTime());
    });
  });

  describe('calculateNCAClosureDeadline', () => {
    test('returns date 20 days from today', () => {
      const deadline = calculateNCAClosureDeadline();
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(expected.getDate() + 20);

      const deadlineObj = new Date(deadline);
      const expectedFormatted = expected.toISOString().split('T')[0];

      expect(deadline).toBe(expectedFormatted);
    });

    test('returns date in ISO format', () => {
      const deadline = calculateNCAClosureDeadline();
      expect(deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('handles month transitions correctly', () => {
      // Mock a date near end of month
      const mockDate = new Date('2025-01-25');
      const spy = jest.spyOn(global, 'Date').mockImplementation((() => mockDate) as any);

      const deadline = calculateNCAClosureDeadline();

      // Should be in February
      expect(deadline).toBe('2025-02-14');

      spy.mockRestore();
    });

    test('handles year transitions correctly', () => {
      // Mock a date near end of year
      const mockDate = new Date('2025-12-20');
      const spy = jest.spyOn(global, 'Date').mockImplementation((() => mockDate) as any);

      const deadline = calculateNCAClosureDeadline();

      // Should be in next year
      expect(deadline).toBe('2026-01-09');

      spy.mockRestore();
    });

    test('always returns future date', () => {
      const deadline = calculateNCAClosureDeadline();
      const today = new Date();
      const deadlineObj = new Date(deadline);

      expect(deadlineObj.getTime()).toBeGreaterThan(today.getTime());
    });

    test('deadline is later than temporary repair due date', () => {
      const ncaDeadline = new Date(calculateNCAClosureDeadline());
      const mjcDueDate = new Date(calculateTemporaryRepairDueDate());

      // 20 days > 14 days
      expect(ncaDeadline.getTime()).toBeGreaterThan(mjcDueDate.getTime());
    });
  });

  describe('mergeWithDefaults', () => {
    test('returns defaults when no data provided', () => {
      const defaults = { a: 1, b: 2, c: 3 };
      const result = mergeWithDefaults(defaults, {});

      expect(result).toEqual(defaults);
    });

    test('overrides defaults with provided data', () => {
      const defaults = { a: 1, b: 2, c: 3 };
      const data = { b: 20, c: 30 };
      const result = mergeWithDefaults(defaults, data);

      expect(result).toEqual({ a: 1, b: 20, c: 30 });
    });

    test('preserves default values for missing fields', () => {
      const defaults = { a: 1, b: 2, c: 3 };
      const data = { a: 10 };
      const result = mergeWithDefaults(defaults, data);

      expect(result).toEqual({ a: 10, b: 2, c: 3 });
    });

    test('handles nested objects (shallow merge)', () => {
      const defaults = { user: { name: 'John', age: 30 }, active: true };
      const data = { user: { name: 'Jane' } };
      const result = mergeWithDefaults(defaults, data);

      // Shallow merge - nested object replaced entirely
      expect(result).toEqual({ user: { name: 'Jane' }, active: true });
    });

    test('handles null values in data', () => {
      const defaults = { a: 1, b: 2, c: 3 };
      const data = { b: null };
      const result = mergeWithDefaults(defaults, data);

      expect(result).toEqual({ a: 1, b: null, c: 3 });
    });

    test('handles undefined values in data', () => {
      const defaults = { a: 1, b: 2, c: 3 };
      const data = { b: undefined };
      const result = mergeWithDefaults(defaults, data);

      expect(result).toEqual({ a: 1, b: undefined, c: 3 });
    });

    test('does not add extra properties to defaults', () => {
      const defaults = { a: 1, b: 2 };
      const data = { a: 10, c: 30 } as any;
      const result = mergeWithDefaults(defaults, data);

      expect(result).toEqual({ a: 10, b: 2, c: 30 });
      expect(Object.keys(result)).toContain('c');
    });

    test('handles empty defaults', () => {
      const defaults = {};
      const data = { a: 1, b: 2 };
      const result = mergeWithDefaults(defaults, data);

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });
});

describe('lib/config/defaults - Default Values', () => {
  describe('NCA_DEFAULTS', () => {
    test('has correct initial status', () => {
      expect(NCA_DEFAULTS.status).toBe(NCA_STATUS.SUBMITTED);
    });

    test('has empty strings for text fields', () => {
      expect(NCA_DEFAULTS.supplier_name).toBe('');
      expect(NCA_DEFAULTS.nc_product_description).toBe('');
      expect(NCA_DEFAULTS.nc_description).toBe('');
      expect(NCA_DEFAULTS.root_cause_analysis).toBe('');
      expect(NCA_DEFAULTS.corrective_action).toBe('');
    });

    test('has false for boolean flags', () => {
      expect(NCA_DEFAULTS.sample_available).toBe(false);
      expect(NCA_DEFAULTS.cross_contamination).toBe(false);
      expect(NCA_DEFAULTS.back_tracking_completed).toBe(false);
      expect(NCA_DEFAULTS.hold_label_completed).toBe(false);
      expect(NCA_DEFAULTS.nca_logged).toBe(false);
      expect(NCA_DEFAULTS.confidential).toBe(false);
    });

    test('has null for optional fields', () => {
      expect(NCA_DEFAULTS.nc_origin).toBeNull();
      expect(NCA_DEFAULTS.quantity).toBeNull();
      expect(NCA_DEFAULTS.quantity_unit).toBeNull();
      expect(NCA_DEFAULTS.machine_down_since).toBeNull();
    });

    test('has undefined for required selection fields', () => {
      expect(NCA_DEFAULTS.machine_status).toBeUndefined();
      expect(NCA_DEFAULTS.disposition_action).toBeUndefined();
    });

    test('has correct BRCGS procedure references', () => {
      expect(NCA_DEFAULTS.procedure_reference).toBe('5.7');
      expect(NCA_DEFAULTS.procedure_revision).toBe('Rev 9');
    });
  });

  describe('MJC_DEFAULTS', () => {
    test('has correct initial status', () => {
      expect(MJC_DEFAULTS.status).toBe(MJC_STATUS.OPEN);
    });

    test('all hygiene checklist items default to false', () => {
      expect(MJC_DEFAULTS.hygiene_check_1).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_2).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_3).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_4).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_5).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_6).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_7).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_8).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_9).toBe(false);
      expect(MJC_DEFAULTS.hygiene_check_10).toBe(false);
    });

    test('has default maintenance category', () => {
      expect(MJC_DEFAULTS.maintenance_category).toBe('reactive');
    });

    test('has default urgency level', () => {
      expect(MJC_DEFAULTS.urgency_level).toBe('medium');
    });

    test('has undefined for required selection fields', () => {
      expect(MJC_DEFAULTS.maintenance_type).toBeUndefined();
      expect(MJC_DEFAULTS.machine_status).toBeUndefined();
      expect(MJC_DEFAULTS.temporary_repair).toBeUndefined();
    });

    test('production_cleared defaults to false', () => {
      expect(MJC_DEFAULTS.production_cleared).toBe(false);
    });
  });

  describe('SIGNATURE_DEFAULTS', () => {
    test('has digital type', () => {
      expect(SIGNATURE_DEFAULTS.type).toBe('digital');
    });

    test('has empty strings for signature fields', () => {
      expect(SIGNATURE_DEFAULTS.data).toBe('');
      expect(SIGNATURE_DEFAULTS.name).toBe('');
    });

    test('has timestamp in ISO format', () => {
      expect(SIGNATURE_DEFAULTS.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('WORK_ORDER_DEFAULTS', () => {
    test('has pending status', () => {
      expect(WORK_ORDER_DEFAULTS.status).toBe('pending');
    });

    test('has empty strings for required fields', () => {
      expect(WORK_ORDER_DEFAULTS.wo_number).toBe('');
      expect(WORK_ORDER_DEFAULTS.product_name).toBe('');
    });

    test('has zero quantity', () => {
      expect(WORK_ORDER_DEFAULTS.quantity).toBe(0);
    });

    test('has current date as start_date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(WORK_ORDER_DEFAULTS.start_date).toBe(today);
    });

    test('has null end_date', () => {
      expect(WORK_ORDER_DEFAULTS.end_date).toBeNull();
    });
  });

  describe('DASHBOARD_FILTER_DEFAULTS', () => {
    test('includes open and in-progress by default', () => {
      expect(DASHBOARD_FILTER_DEFAULTS.includeOpen).toBe(true);
      expect(DASHBOARD_FILTER_DEFAULTS.includeInProgress).toBe(true);
    });

    test('excludes closed and cancelled by default', () => {
      expect(DASHBOARD_FILTER_DEFAULTS.includeClosed).toBe(false);
      expect(DASHBOARD_FILTER_DEFAULTS.includeCancelled).toBe(false);
    });

    test('has default pagination', () => {
      expect(DASHBOARD_FILTER_DEFAULTS.page).toBe(1);
      expect(DASHBOARD_FILTER_DEFAULTS.pageSize).toBe(25);
    });

    test('has default sort order', () => {
      expect(DASHBOARD_FILTER_DEFAULTS.sortBy).toBe('created_at');
      expect(DASHBOARD_FILTER_DEFAULTS.sortOrder).toBe('desc');
    });

    test('has empty search query', () => {
      expect(DASHBOARD_FILTER_DEFAULTS.searchQuery).toBe('');
    });
  });

  describe('QUALITY_SCORE_DEFAULTS', () => {
    test('all scores default to 0', () => {
      expect(QUALITY_SCORE_DEFAULTS.overall_score).toBe(0);
      expect(QUALITY_SCORE_DEFAULTS.description_quality).toBe(0);
      expect(QUALITY_SCORE_DEFAULTS.completeness_score).toBe(0);
      expect(QUALITY_SCORE_DEFAULTS.detail_score).toBe(0);
      expect(QUALITY_SCORE_DEFAULTS.clarity_score).toBe(0);
      expect(QUALITY_SCORE_DEFAULTS.compliance_score).toBe(0);
    });

    test('confidence level defaults to low', () => {
      expect(QUALITY_SCORE_DEFAULTS.confidence_level).toBe('low');
    });
  });

  describe('AI_SUGGESTION_DEFAULTS', () => {
    test('all flags default to false', () => {
      expect(AI_SUGGESTION_DEFAULTS.accepted).toBe(false);
      expect(AI_SUGGESTION_DEFAULTS.modified).toBe(false);
    });

    test('content fields default to empty strings', () => {
      expect(AI_SUGGESTION_DEFAULTS.original_content).toBe('');
      expect(AI_SUGGESTION_DEFAULTS.suggested_content).toBe('');
      expect(AI_SUGGESTION_DEFAULTS.final_content).toBe('');
    });

    test('confidence score defaults to 0', () => {
      expect(AI_SUGGESTION_DEFAULTS.confidence_score).toBe(0);
    });
  });

  describe('NOTIFICATION_DEFAULTS', () => {
    test('read defaults to false', () => {
      expect(NOTIFICATION_DEFAULTS.read).toBe(false);
    });

    test('sent_at has ISO timestamp', () => {
      expect(NOTIFICATION_DEFAULTS.sent_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('read_at defaults to null', () => {
      expect(NOTIFICATION_DEFAULTS.read_at).toBeNull();
    });

    test('notification_type defaults to info', () => {
      expect(NOTIFICATION_DEFAULTS.notification_type).toBe('info');
    });
  });
});
