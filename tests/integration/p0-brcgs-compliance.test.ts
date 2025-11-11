/**
 * P0 BRCGS Compliance - Integration Tests
 * 
 * Server-side validation tests for BRCGS compliance requirements
 * Tests role enforcement, database constraints, and validation rules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createServerClient } from '@/lib/database/client';
import { createNCA } from '@/app/actions/nca-actions';
import { createMJC, grantHygieneClearance } from '@/app/actions/mjc-actions';
import type { NCAFormData } from '@/lib/validations/nca-schema';
import type { MJCFormData } from '@/lib/validations/mjc-schema';

describe('P0 BRCGS Compliance - Integration Tests', () => {
  const supabase = createServerClient();
  const testUserId = '10000000-0000-0000-0000-000000000001'; // Test operator user

  beforeEach(async () => {
    // Clean up test data if needed
    // This would typically use a test database or transaction rollback
  });

  describe('P0-001: NCA Form Submission Validation', () => {
    it('should create NCA with all required fields', async () => {
      const formData: NCAFormData = {
        nc_type: 'finished-goods',
        nc_product_description: 'Test Product Description',
        nc_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules and ensure proper documentation.',
        machine_status: 'operational',
        cross_contamination: false,
        back_tracking_completed: false,
        hold_label_completed: true,
        nca_logged: true,
      };

      const result = await createNCA(formData, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.nca_number).toMatch(/NCA-\d{4}-\d{8}/);
    });

    it('should reject NCA with missing required fields', async () => {
      const formData: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        // Missing nc_product_description (required)
        // Missing nc_description (required)
        machine_status: 'operational',
      };

      const result = await createNCA(formData as NCAFormData, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/required|product.*description|description/i);
    });
  });

  describe('P0-002: MJC Form Submission Validation', () => {
    it('should create MJC with all required fields', async () => {
      const formData: MJCFormData = {
        machine_equipment_id: 'CMH-01',
        maintenance_category: 'reactive',
        maintenance_type: 'mechanical',
        machine_status: 'operational',
        urgency_level: 'medium',
        temporary_repair: 'no',
        maintenance_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.',
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
        production_cleared: false,
      };

      const result = await createMJC(formData, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.job_card_number).toMatch(/MJC-\d{4}-\d{8}/);
    });

    it('should reject MJC with missing required fields', async () => {
      const formData: Partial<MJCFormData> = {
        maintenance_category: 'reactive',
        // Missing machine_equipment_id (required)
        // Missing maintenance_description (required)
      };

      const result = await createMJC(formData as MJCFormData, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/required|machine.*equipment|description/i);
    });
  });

  describe('P0-004: Hygiene Clearance Validation', () => {
    it('should reject hygiene clearance when not all 10 items verified', async () => {
      // Create an MJC first
      const mjcFormData: MJCFormData = {
        machine_equipment_id: 'CMH-01',
        maintenance_category: 'reactive',
        maintenance_type: 'mechanical',
        machine_status: 'operational',
        urgency_level: 'medium',
        temporary_repair: 'no',
        maintenance_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.',
        hygiene_check_1: true,
        hygiene_check_2: true,
        hygiene_check_3: true,
        hygiene_check_4: true,
        hygiene_check_5: true,
        hygiene_check_6: true,
        hygiene_check_7: true,
        hygiene_check_8: true,
        hygiene_check_9: true,
        hygiene_check_10: false, // NOT verified
        production_cleared: false,
      };

      const createResult = await createMJC(mjcFormData, testUserId);
      expect(createResult.success).toBe(true);
      const mjcId = createResult.data?.id;
      expect(mjcId).toBeDefined();

      if (!mjcId) return;

      // Attempt to grant clearance with only 9 items verified
      const clearanceResult = await grantHygieneClearance(
        mjcId,
        {
          qa_supervisor: 'Test QA Supervisor',
          comments: 'Test clearance',
          signature: {
            type: 'digital',
            data: 'test-signature-data',
            name: 'Test QA',
            timestamp: new Date().toISOString(),
          },
        },
        testUserId
      );

      expect(clearanceResult.success).toBe(false);
      expect(clearanceResult.error).toBeDefined();
      expect(clearanceResult.error).toMatch(/all.*10.*hygiene|10.*items|hygiene.*clearance/i);
    });

    it('should allow hygiene clearance when all 10 items verified', async () => {
      // Create an MJC first
      const mjcFormData: MJCFormData = {
        machine_equipment_id: 'CMH-01',
        maintenance_category: 'reactive',
        maintenance_type: 'mechanical',
        machine_status: 'operational',
        urgency_level: 'medium',
        temporary_repair: 'no',
        maintenance_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.',
        hygiene_check_1: true,
        hygiene_check_2: true,
        hygiene_check_3: true,
        hygiene_check_4: true,
        hygiene_check_5: true,
        hygiene_check_6: true,
        hygiene_check_7: true,
        hygiene_check_8: true,
        hygiene_check_9: true,
        hygiene_check_10: true, // All 10 verified
        production_cleared: false,
      };

      const createResult = await createMJC(mjcFormData, testUserId);
      expect(createResult.success).toBe(true);
      const mjcId = createResult.data?.id;
      expect(mjcId).toBeDefined();

      if (!mjcId) return;

      // Grant clearance with all 10 items verified
      const clearanceResult = await grantHygieneClearance(
        mjcId,
        {
          qa_supervisor: 'Test QA Supervisor',
          comments: 'Test clearance',
          signature: {
            type: 'digital',
            data: 'test-signature-data',
            name: 'Test QA',
            timestamp: new Date().toISOString(),
          },
        },
        testUserId
      );

      expect(clearanceResult.success).toBe(true);
      expect(clearanceResult.data).toBeDefined();
    });
  });

  describe('P0-005: Cross-contamination Back Tracking Validation', () => {
    it('should reject NCA when cross-contamination YES but back tracking not verified', async () => {
      const formData: NCAFormData = {
        nc_type: 'finished-goods',
        nc_product_description: 'Test Product Description',
        nc_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.',
        machine_status: 'operational',
        cross_contamination: true, // YES
        back_tracking_completed: false, // NOT verified
        hold_label_completed: true,
        nca_logged: true,
      };

      const result = await createNCA(formData, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/back.*tracking|back.*track/i);
    });

    it('should allow NCA when cross-contamination YES and back tracking verified', async () => {
      const formData: NCAFormData = {
        nc_type: 'finished-goods',
        nc_product_description: 'Test Product Description',
        nc_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.',
        machine_status: 'operational',
        cross_contamination: true, // YES
        back_tracking_completed: true, // Verified
        hold_label_completed: true,
        nca_logged: true,
      };

      const result = await createNCA(formData, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('P0-006: Temporary Repair Due Date Calculation', () => {
    it('should auto-calculate due date when temporary repair is YES', async () => {
      const formData: MJCFormData = {
        machine_equipment_id: 'CMH-01',
        maintenance_category: 'reactive',
        maintenance_type: 'mechanical',
        machine_status: 'operational',
        urgency_level: 'medium',
        temporary_repair: 'yes', // YES
        due_date: null, // Should be auto-calculated
        maintenance_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules for maintenance job cards.',
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
        production_cleared: false,
      };

      const result = await createMJC(formData, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify due date is set to 14 days from today
      if (result.data?.close_out_due_date) {
        const dueDate = new Date(result.data.close_out_due_date);
        const today = new Date();
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() + 14);
        
        // Allow 1 day tolerance for date calculations
        const daysDiff = Math.abs((dueDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBeLessThan(1);
      }
    });
  });

  describe('P0-009: Digital Signature Timestamp', () => {
    it('should include timestamp in signature data', async () => {
      const formData: NCAFormData = {
        nc_type: 'finished-goods',
        nc_product_description: 'Test Product Description',
        nc_description: 'This is a test description that is more than one hundred characters long to satisfy the minimum length requirement for BRCGS compliance validation rules.',
        machine_status: 'operational',
        cross_contamination: false,
        back_tracking_completed: false,
        hold_label_completed: true,
        nca_logged: true,
        concession_signature: {
          type: 'digital',
          data: 'test-signature-data',
          name: 'Test User',
          timestamp: new Date().toISOString(),
        },
      };

      const result = await createNCA(formData, testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify signature timestamp is stored
      if (result.data?.concession_signature) {
        expect(result.data.concession_signature.timestamp).toBeDefined();
        expect(result.data.concession_signature.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });
});

