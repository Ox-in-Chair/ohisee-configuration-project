/**
 * NCA Overdue Service Unit Tests
 * Tests BRCGS 5.7 20-day closure requirement tracking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getOverdueNCAs,
  updateOverdueStatus,
  getNCAsApproachingDueDate,
} from '../nca-overdue-service';

// Mock the database client factory
jest.mock('@/lib/database/client', () => ({
  createServerClient: jest.fn(),
}));

describe('NCA Overdue Service', () => {
  let mockSupabaseClient: jest.Mocked<SupabaseClient>;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockNeq: jest.Mock;
  let mockLt: jest.Mock;
  let mockGte: jest.Mock;
  let mockLte: jest.Mock;
  let mockOrder: jest.Mock;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create basic mocks
    mockOrder = jest.fn();
    mockRpc = jest.fn();

    // Setup will be done per describe block based on query pattern needs
  });

  describe('getOverdueNCAs', () => {
    beforeEach(() => {
      // Setup mock chain for getOverdueNCAs pattern: select().neq().lt().order()
      mockLt = jest.fn(() => ({ order: mockOrder }));
      mockNeq = jest.fn(() => ({ lt: mockLt }));
      mockSelect = jest.fn(() => ({ neq: mockNeq }));
      mockFrom = jest.fn(() => ({ select: mockSelect }));

      mockSupabaseClient = {
        from: mockFrom,
        rpc: mockRpc,
      } as unknown as jest.Mocked<SupabaseClient>;

      const { createServerClient } = require('@/lib/database/client');
      createServerClient.mockReturnValue(mockSupabaseClient);
    });

    it('should return empty array when no overdue NCAs', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await getOverdueNCAs();

      expect(result).toEqual([]);
      expect(mockFrom).toHaveBeenCalledWith('ncas');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockNeq).toHaveBeenCalledWith('status', 'closed');
    });

    it('should return overdue NCAs with calculated days overdue', async () => {
      const today = new Date().toISOString().split('T')[0];
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const mockNCAs = [
        {
          id: 'nca-1',
          nca_number: 'NCA-2025-001',
          date: '2025-01-01',
          close_out_due_date: threeDaysAgo,
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Delamination issue',
          status: 'open',
        },
      ];

      mockOrder.mockResolvedValue({ data: mockNCAs, error: null });

      const result = await getOverdueNCAs();

      expect(result.length).toBe(1);
      expect(result[0].nca_number).toBe('NCA-2025-001');
      expect(result[0].days_overdue).toBe(3);
    });

    it('should filter out NCAs with closed status', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      await getOverdueNCAs();

      expect(mockNeq).toHaveBeenCalledWith('status', 'closed');
    });

    it('should filter NCAs where close_out_due_date has passed', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockOrder.mockResolvedValue({ data: [], error: null });

      await getOverdueNCAs();

      expect(mockLt).toHaveBeenCalledWith('close_out_due_date', today);
    });

    it('should order results by close_out_due_date ascending', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      await getOverdueNCAs();

      expect(mockOrder).toHaveBeenCalledWith('close_out_due_date', { ascending: true });
    });

    it('should handle database errors gracefully', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await getOverdueNCAs();

      expect(result).toEqual([]);
    });

    it('should filter out NCAs with missing close_out_due_date', async () => {
      const mockNCAs = [
        {
          id: 'nca-1',
          nca_number: 'NCA-2025-001',
          date: '2025-01-01',
          close_out_due_date: null, // Missing due date
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Issue',
          status: 'open',
        },
        {
          id: 'nca-2',
          nca_number: 'NCA-2025-002',
          date: '2025-01-01',
          close_out_due_date: '2025-01-01',
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Issue',
          status: 'open',
        },
      ];

      mockOrder.mockResolvedValue({ data: mockNCAs, error: null });

      const result = await getOverdueNCAs();

      // Only nca-2 should be included (has valid due date)
      expect(result.length).toBe(1);
      expect(result[0].nca_number).toBe('NCA-2025-002');
    });

    it('should calculate correct days overdue for multiple NCAs', async () => {
      const today = new Date();
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const mockNCAs = [
        {
          id: 'nca-1',
          nca_number: 'NCA-2025-001',
          date: '2025-01-01',
          close_out_due_date: twoDaysAgo,
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Issue 1',
          status: 'open',
        },
        {
          id: 'nca-2',
          nca_number: 'NCA-2025-002',
          date: '2025-01-01',
          close_out_due_date: fiveDaysAgo,
          nc_type: 'raw-material',
          supplier_name: 'Supplier A',
          nc_product_description: 'Issue 2',
          status: 'pending',
        },
      ];

      mockOrder.mockResolvedValue({ data: mockNCAs, error: null });

      const result = await getOverdueNCAs();

      expect(result.length).toBe(2);
      expect(result[0].days_overdue).toBe(2);
      expect(result[1].days_overdue).toBe(5);
    });
  });

  describe('updateOverdueStatus', () => {
    beforeEach(() => {
      // Setup mock for RPC calls
      mockSupabaseClient = {
        from: jest.fn(),
        rpc: mockRpc,
      } as unknown as jest.Mocked<SupabaseClient>;

      const { createServerClient } = require('@/lib/database/client');
      createServerClient.mockReturnValue(mockSupabaseClient);
    });

    it('should call update_nca_overdue_status RPC function', async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null });

      const result = await updateOverdueStatus();

      expect(mockRpc).toHaveBeenCalledWith('update_nca_overdue_status');
      expect(result).toBe(5);
    });

    it('should return 0 on database error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await updateOverdueStatus();

      expect(result).toBe(0);
    });

    it('should return 0 when RPC returns null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await updateOverdueStatus();

      expect(result).toBe(0);
    });

    it('should return the number of updated NCAs', async () => {
      mockRpc.mockResolvedValue({ data: 12, error: null });

      const result = await updateOverdueStatus();

      expect(result).toBe(12);
    });
  });

  describe('getNCAsApproachingDueDate', () => {
    beforeEach(() => {
      // Reset mock chain for approaching due date queries
      mockLte = jest.fn(() => ({ order: mockOrder }));
      mockGte = jest.fn(() => ({ lte: mockLte }));
      mockNeq = jest.fn(() => ({ gte: mockGte }));
      mockSelect = jest.fn(() => ({ neq: mockNeq }));
      mockFrom = jest.fn(() => ({ select: mockSelect }));
      mockSupabaseClient.from = mockFrom;
    });

    it('should return empty array when no NCAs approaching due date', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await getNCAsApproachingDueDate();

      expect(result).toEqual([]);
    });

    it('should return NCAs due within 3 days', async () => {
      // Use a fixed future date to avoid timing issues
      const fixedDate = '2025-12-15';

      const mockNCAs = [
        {
          id: 'nca-1',
          nca_number: 'NCA-2025-001',
          date: '2025-12-01',
          close_out_due_date: fixedDate,
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Urgent issue',
          status: 'open',
        },
      ];

      mockOrder.mockResolvedValue({ data: mockNCAs, error: null });

      const result = await getNCAsApproachingDueDate();

      expect(result.length).toBe(1);
      expect(result[0].nca_number).toBe('NCA-2025-001');
      expect(result[0].close_out_due_date).toBe(fixedDate);
      // days_overdue should be negative (days remaining) since it's in the future
      expect(result[0].days_overdue).toBeLessThan(0);
    });

    it('should filter by status not closed', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      await getNCAsApproachingDueDate();

      expect(mockNeq).toHaveBeenCalledWith('status', 'closed');
    });

    it('should filter by date range (today to 3 days from now)', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      mockOrder.mockResolvedValue({ data: [], error: null });

      await getNCAsApproachingDueDate();

      expect(mockGte).toHaveBeenCalledWith('close_out_due_date', todayStr);
      expect(mockLte).toHaveBeenCalledWith('close_out_due_date', threeDaysFromNow);
    });

    it('should order results by close_out_due_date ascending', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      await getNCAsApproachingDueDate();

      expect(mockOrder).toHaveBeenCalledWith('close_out_due_date', { ascending: true });
    });

    it('should handle database errors gracefully', async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const result = await getNCAsApproachingDueDate();

      expect(result).toEqual([]);
    });

    it('should calculate days remaining (negative days_overdue)', async () => {
      const futureDate = '2025-12-20';

      const mockNCAs = [
        {
          id: 'nca-1',
          nca_number: 'NCA-2025-001',
          date: '2025-12-01',
          close_out_due_date: futureDate,
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Issue',
          status: 'open',
        },
      ];

      mockOrder.mockResolvedValue({ data: mockNCAs, error: null });

      const result = await getNCAsApproachingDueDate();

      expect(result.length).toBe(1);
      // days_overdue should be negative (days remaining) for future dates
      expect(result[0].days_overdue).toBeLessThan(0);
      expect(result[0].id).toBe('nca-1');
    });

    it('should handle multiple NCAs with different due dates', async () => {
      const date1 = '2025-12-15';
      const date2 = '2025-12-20';

      const mockNCAs = [
        {
          id: 'nca-1',
          nca_number: 'NCA-2025-001',
          date: '2025-12-01',
          close_out_due_date: date1,
          nc_type: 'finished-goods',
          supplier_name: null,
          nc_product_description: 'Issue 1',
          status: 'open',
        },
        {
          id: 'nca-2',
          nca_number: 'NCA-2025-002',
          date: '2025-12-01',
          close_out_due_date: date2,
          nc_type: 'raw-material',
          supplier_name: 'Supplier A',
          nc_product_description: 'Issue 2',
          status: 'pending',
        },
      ];

      mockOrder.mockResolvedValue({ data: mockNCAs, error: null });

      const result = await getNCAsApproachingDueDate();

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('nca-1');
      expect(result[1].id).toBe('nca-2');
      // Both should have negative days_overdue (days remaining) for future dates
      expect(result[0].days_overdue).toBeLessThan(0);
      expect(result[1].days_overdue).toBeLessThan(0);
    });
  });
});
