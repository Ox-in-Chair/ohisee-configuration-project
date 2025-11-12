import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { WorkOrderService, createWorkOrderService } from '../work-order-service';
import type { WorkOrder } from '../../types/work-order';

describe('WorkOrderService', () => {
  let mockSupabaseClient: SupabaseClient;
  let workOrderService: WorkOrderService;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(),
    } as any;

    workOrderService = new WorkOrderService(mockSupabaseClient);
  });

  describe('getActiveWorkOrder', () => {
    it('should return the active work order for the user', async () => {
      const mockWorkOrder: WorkOrder = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        wo_number: 'WO-2025-0001',
        product: 'Product A',
        machine_id: 'machine-001',
        operator_id: 'user-123',
        status: 'active',
        created_at: '2025-01-10T10:00:00Z',
        updated_at: '2025-01-10T10:00:00Z',
      };

      const mockSingle = jest.fn<() => Promise<{ data: WorkOrder | null; error: { code: string; message: string } | null }>>().mockResolvedValue({
        data: mockWorkOrder,
        error: null,
      });

      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (mockSupabaseClient.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await workOrderService.getActiveWorkOrder('user-123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('work_orders');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq1).toHaveBeenCalledWith('operator_id', 'user-123');
      expect(mockEq2).toHaveBeenCalledWith('status', 'active');
      expect(result).toEqual(mockWorkOrder);
    });

    it('should return null if no active work order exists', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (mockSupabaseClient.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await workOrderService.getActiveWorkOrder('user-456');

      expect(result).toBeNull();
    });

    it('should return null if user has multiple work orders but none are active', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (mockSupabaseClient.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await workOrderService.getActiveWorkOrder('user-789');

      expect(result).toBeNull();
    });

    it('should correctly filter by user ID and status=active', async () => {
      const mockWorkOrder: WorkOrder = {
        id: '987e6543-e21b-12d3-a456-426614174999',
        wo_number: 'WO-2025-0002',
        product: 'Product B',
        machine_id: 'machine-002',
        operator_id: 'user-999',
        status: 'active',
        created_at: '2025-01-10T11:00:00Z',
        updated_at: '2025-01-10T11:00:00Z',
      };

      const mockSingle = jest.fn<() => Promise<{ data: WorkOrder | null; error: { code: string; message: string } | null }>>().mockResolvedValue({
        data: mockWorkOrder,
        error: null,
      });

      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (mockSupabaseClient.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await workOrderService.getActiveWorkOrder('user-999');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('work_orders');
      expect(mockEq1).toHaveBeenCalledWith('operator_id', 'user-999');
      expect(mockEq2).toHaveBeenCalledWith('status', 'active');
      expect(result).not.toBeNull();
    });

    it('should return work order with all required fields', async () => {
      const mockWorkOrder: WorkOrder = {
        id: '111e1111-e11b-11d1-a111-111111111111',
        wo_number: 'WO-2025-0003',
        product: 'Product C',
        machine_id: 'machine-003',
        operator_id: 'user-111',
        status: 'active',
        created_at: '2025-01-10T12:00:00Z',
        updated_at: '2025-01-10T12:00:00Z',
      };

      const mockSingle = jest.fn<() => Promise<{ data: WorkOrder | null; error: { code: string; message: string } | null }>>().mockResolvedValue({
        data: mockWorkOrder,
        error: null,
      });

      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (mockSupabaseClient.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await workOrderService.getActiveWorkOrder('user-111');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('wo_number');
      expect(result).toHaveProperty('product');
      expect(result).toHaveProperty('machine_id');
      expect(result).toHaveProperty('operator_id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
    });

    it('should handle Supabase errors gracefully and return null', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST500', message: 'Internal server error' },
      });

      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (mockSupabaseClient.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await workOrderService.getActiveWorkOrder('user-error');

      expect(result).toBeNull();
    });

    it('should handle unexpected exceptions and return null', async () => {
      // Force an exception by making from() throw
      (mockSupabaseClient.from as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await workOrderService.getActiveWorkOrder('user-exception');

      expect(result).toBeNull();
    });
  });

  describe('createWorkOrderService', () => {
    it('should create a WorkOrderService instance with injected client', () => {
      const service = createWorkOrderService(mockSupabaseClient);

      expect(service).toBeInstanceOf(WorkOrderService);
    });

    it('should return service implementing IWorkOrderService interface', () => {
      const service = createWorkOrderService(mockSupabaseClient);

      expect(service).toHaveProperty('getActiveWorkOrder');
      expect(typeof service.getActiveWorkOrder).toBe('function');
    });
  });
});
