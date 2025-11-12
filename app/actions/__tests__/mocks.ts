/**
 * Mock Utilities for Action Tests
 * Provides reusable mocks for Supabase client and test data
 * Architecture: Dependency injection pattern - mockable for all tests
 */

import { jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NCAFormData } from '@/lib/validations/nca-schema';
import type { MJCFormData } from '@/lib/validations/mjc-schema';

/**
 * Create a mock Supabase client with all necessary methods
 * All methods return chainable mock objects for fluent API
 */
export function createMockSupabaseClient(): jest.Mocked<SupabaseClient> {
  // Create a chainable query object
  const createQueryChain = () => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn((resolve) =>
        resolve({ data: null, error: null, count: 0 })
      ),
    };

    // Make all methods return the chain for fluent API
    Object.keys(chain).forEach((key) => {
      if (key !== 'single' && key !== 'then') {
        chain[key].mockReturnValue(chain);
      }
    });

    return chain;
  };

  const mockFrom = jest.fn(() => createQueryChain());

  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  };

  return {
    from: mockFrom,
    auth: mockAuth,
  } as any;
}

/**
 * Create a mock user with specified role
 */
export function createMockUser(role: string = 'operator', overrides?: Record<string, any>) {
  return {
    id: 'test-user-id',
    email: 'test@kangopak.com',
    role,
    name: 'Test User',
    department: 'Production',
    induction_completed: true,
    induction_date: '2024-01-01',
    ...overrides,
  };
}

/**
 * Sample NCA form data for testing
 * Provides valid data that passes all validation rules
 */
export const sampleNCAData: NCAFormData = {
  // Section 2: Classification
  nc_type: 'raw-material',
  nc_origin: 'supplier-based',
  procedure_reference: '5.7',
  procedure_revision: 'Rev 9',
  procedure_revision_date: '2024-01-01',

  // Section 3: Supplier & Product
  supplier_name: 'Test Supplier Ltd',
  nc_product_description: 'Aluminum foil laminate - 25 micron thickness',
  supplier_wo_batch: 'BATCH-2025-001',
  supplier_reel_box: 'REEL-A-123',
  sample_available: true,
  quantity: 500,
  quantity_unit: 'kg',
  carton_numbers: 'C001, C002, C003',

  // Section 4: Description (minimum 100 characters)
  nc_description:
    'Aluminum foil laminate received from Test Supplier Ltd shows delamination on edges. Detected during incoming inspection. Approximately 500kg affected across 3 cartons (C001-C003). Product segregated to quarantine area. Batch number BATCH-2025-001, Reel A-123.',

  // Section 5: Machine Status
  machine_status: 'operational',
  machine_down_since: null,
  estimated_downtime: null,

  // Section 6: Concession (optional)
  concession_team_leader: null,
  concession_signature: null,
  concession_notes: null,

  // Section 7: Immediate Correction
  cross_contamination: false,
  back_tracking_person: null,
  back_tracking_signature: null,
  back_tracking_completed: false,
  hold_label_completed: true,
  nca_logged: true,
  segregation_area: 'quarantine',
  segregation_area_other: null,

  // Section 8: Disposition
  disposition_action: 'reject',
  rework_instruction: null,
  disposition_authorized_by: 'QA Manager',
  disposition_signature: {
    type: 'digital',
    data: 'signature-data-base64',
    name: 'QA Manager',
    timestamp: new Date().toISOString(),
  },

  // Section 9: Root Cause
  root_cause_analysis: null,

  // Section 10: Corrective Action
  corrective_action: null,

  // Section 11: Close Out
  close_out_by: null,
  close_out_signature: null,
  close_out_date: null,

  // Work Order Link
  wo_id: null,
};

/**
 * Sample NCA with machine down status
 */
export const sampleNCAMachineDown: NCAFormData = {
  ...sampleNCAData,
  nc_type: 'wip',
  nc_origin: 'kangopak-based',
  nc_product_description: 'Pouching Line 1 - Print registration failure',
  nc_description:
    'Print registration failure on Pouching Line 1. Print misalignment detected at 14:30. Machine stopped immediately. Approximately 200 pouches affected. Pouches quarantined in segregation bay. Maintenance team notified. Estimated 2 hours to recalibrate print station.',
  machine_status: 'down',
  machine_down_since: new Date().toISOString(),
  estimated_downtime: 120,
  segregation_area: 'segregation-bay',
};

/**
 * Sample NCA with cross-contamination
 */
export const sampleNCACrossContamination: NCAFormData = {
  ...sampleNCAData,
  nc_type: 'incident',
  nc_origin: 'kangopak-based',
  nc_product_description: 'Potential allergen cross-contamination incident',
  nc_description:
    'Potential allergen cross-contamination detected in packaging area. Product contact surface from previous allergen-containing product not fully cleaned before switching to allergen-free product line. Incident discovered during shift handover inspection at 15:00. Approximately 50 units potentially affected. All units quarantined immediately. Back-tracking initiated to identify all affected products from the last 2 hours of production.',
  cross_contamination: true,
  back_tracking_person: 'QA Supervisor John Doe',
  back_tracking_signature: {
    type: 'digital',
    data: 'signature-data-base64',
    name: 'QA Supervisor John Doe',
    timestamp: new Date().toISOString(),
  },
  back_tracking_completed: true,
};

/**
 * Sample MJC form data for testing
 * Provides valid data that passes all validation rules
 */
export const sampleMJCData: MJCFormData = {
  // Section 1: Identification
  department: 'maintenance',
  wo_id: null,

  // Section 2: Machine/Equipment
  machine_equipment_id: 'POUCH-LINE-01',

  // Section 3: Maintenance Type
  maintenance_category: 'reactive',
  maintenance_type: 'mechanical',
  maintenance_type_other: null,

  // Section 4: Machine Status & Urgency
  machine_status: 'operational',
  urgency_level: 'medium',
  machine_down_time: null,

  // Section 5: Temporary Repair
  temporary_repair: 'no',
  due_date: null,

  // Section 6: Description (minimum 100 characters)
  maintenance_description:
    'Replace worn conveyor belt on Pouching Line 01. Belt showing signs of wear with visible fraying on edges. No immediate risk but requires replacement to prevent future breakdown. Replacement belt available in stores. Estimated work time: 2 hours.',

  // Section 7: Maintenance Performed
  maintenance_performed: null,
  maintenance_technician_signature: null,

  // Section 8: Additional Comments
  additional_comments: null,

  // Section 9: Hygiene Checklist (all 10 items)
  hygiene_check_1: false,
  hygiene_check_2: false,
  hygiene_check_3: false,
  hygiene_check_4: false,
  hygiene_check_5: false,
  hygiene_check_6: false,
  hygiene_check_7: false,
  hygiene_check_8: false,
  hygiene_check_9: false,
  hygiene_check_10: false,

  // Section 10: Hygiene Clearance
  clearance_qa_supervisor: null,
  clearance_signature: null,
  production_cleared: false,
};

/**
 * Sample MJC with machine down and critical urgency
 */
export const sampleMJCMachineDown: MJCFormData = {
  ...sampleMJCData,
  machine_status: 'down',
  urgency_level: 'critical',
  machine_down_time: new Date().toISOString(),
  maintenance_description:
    'CRITICAL: Pouching Line 01 sealing head failure. Machine down since 10:00. Production halted. Sealing jaws not heating properly, temperature reading 80°C instead of required 180°C. Heating element suspected faulty. Replacement required immediately. Production loss estimated at 5000 units per hour.',
};

/**
 * Sample MJC with temporary repair (14-day deadline auto-set)
 */
export const sampleMJCTemporaryRepair: MJCFormData = {
  ...sampleMJCData,
  temporary_repair: 'yes',
  maintenance_description:
    'Temporary repair to Pouching Line 01 pneumatic valve. Valve leaking air, causing intermittent pressure drops. Temporary seal applied to stop leak. Permanent replacement valve on order (4-week lead time). Temporary repair should hold for 2-3 weeks. Will monitor pressure daily. Permanent repair required within 14 days as per BRCGS requirements.',
};

/**
 * Sample MJC with all hygiene items verified (ready for clearance)
 */
export const sampleMJCHygieneComplete: MJCFormData = {
  ...sampleMJCData,
  maintenance_performed:
    'Replaced conveyor belt on Pouching Line 01. Old belt removed, new belt installed and tensioned. All guards and covers reinstalled. Machine test run completed successfully for 30 minutes. No issues detected.',
  maintenance_technician_signature: {
    type: 'digital',
    data: 'signature-data-base64',
    name: 'Maintenance Technician',
    timestamp: new Date().toISOString(),
  },
  hygiene_check_1: true,
  hygiene_check_2: true,
  hygiene_check_3: true,
  hygiene_check_4: true,
  hygiene_check_5: true,
  hygiene_check_6: true,
  hygiene_check_7: true,
  hygiene_check_8: true,
  hygiene_check_9: true,
  hygiene_check_10: true,
  clearance_qa_supervisor: 'QA Supervisor',
  clearance_signature: {
    type: 'digital',
    data: 'signature-data-base64',
    name: 'QA Supervisor',
    timestamp: new Date().toISOString(),
  },
  production_cleared: true,
};

/**
 * Mock NCA database record
 */
export function createMockNCARecord(overrides?: Record<string, any>) {
  return {
    id: 'test-nca-id',
    nca_number: 'NCA-2025-00000001',
    date: '2025-11-12',
    time: '14:30:00',
    raised_by_user_id: 'test-user-id',
    created_by: 'test-user-id',
    nc_type: 'raw-material',
    nc_origin: 'supplier-based',
    supplier_name: 'Test Supplier Ltd',
    nc_product_description: 'Aluminum foil laminate',
    nc_description: 'Sample description that meets minimum length requirements for testing purposes',
    machine_status: 'operational',
    status: 'submitted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock MJC database record
 */
export function createMockMJCRecord(overrides?: Record<string, any>) {
  return {
    id: 'test-mjc-id',
    job_card_number: 'MJC-2025-00000001',
    date: '2025-11-12',
    time: '14:30:00',
    raised_by_user_id: 'test-user-id',
    created_by: 'test-user-id',
    department: 'maintenance',
    machine_equipment: 'POUCH-LINE-01',
    maintenance_category: 'reactive',
    machine_status: 'operational',
    urgency: 'medium',
    temporary_repair: false,
    description_required: 'Sample maintenance description that meets minimum length requirements',
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock notification service for testing
 */
export function createMockNotificationService() {
  return {
    sendMachineDownAlert: jest.fn().mockResolvedValue(undefined),
    sendSupplierNCANotification: jest.fn().mockResolvedValue(undefined),
    sendHygieneClearanceRequest: jest.fn().mockResolvedValue(undefined),
    sendMJCMachineDownAlert: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Helper to setup successful Supabase insert mock
 */
export function setupSuccessfulInsert(
  mockClient: jest.Mocked<SupabaseClient>,
  returnData: any
) {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: null }),
  };

  (mockClient.from as jest.Mock).mockReturnValue({
    insert: jest.fn().mockReturnValue(mockChain),
  });

  return mockChain;
}

/**
 * Helper to setup failed Supabase insert mock
 */
export function setupFailedInsert(
  mockClient: jest.Mocked<SupabaseClient>,
  errorMessage: string
) {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: { message: errorMessage, code: 'DB_ERROR' },
    }),
  };

  (mockClient.from as jest.Mock).mockReturnValue({
    insert: jest.fn().mockReturnValue(mockChain),
  });

  return mockChain;
}

/**
 * Helper to setup successful Supabase select mock
 */
export function setupSuccessfulSelect(
  mockClient: jest.Mocked<SupabaseClient>,
  returnData: any
) {
  const mockChain = {
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: null }),
  };

  (mockClient.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue(mockChain),
  });

  return mockChain;
}

/**
 * Helper to setup successful Supabase update mock
 */
export function setupSuccessfulUpdate(
  mockClient: jest.Mocked<SupabaseClient>,
  returnData: any
) {
  const mockChain = {
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: null }),
  };

  (mockClient.from as jest.Mock).mockReturnValue({
    update: jest.fn().mockReturnValue(mockChain),
  });

  return mockChain;
}
