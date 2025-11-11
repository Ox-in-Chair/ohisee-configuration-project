/**
 * NCA Schema Validation Tests
 * Tests progressive quality requirements and dynamic validation rules
 */

import { describe, it, expect } from '@jest/globals';
import { ncaFormSchema } from '../nca-schema';
import type { NCAFormData } from '../nca-schema';

describe('NCA Schema - Progressive Quality Requirements', () => {
  describe('NC Description - Dynamic Minimum Length', () => {
    it('should enforce 120 characters for raw-material', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'raw-material',
        nc_description: 'A'.repeat(119), // 1 character short
        machine_status: 'operational',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('nc_description'));
        expect(error?.message).toContain('120');
      }
    });

    it('should enforce 150 characters for finished-goods', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(149), // 1 character short
        machine_status: 'operational',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('nc_description'));
        expect(error?.message).toContain('150');
      }
    });

    it('should enforce 200 characters for incident', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'incident',
        nc_description: 'A'.repeat(199), // 1 character short
        machine_status: 'operational',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('nc_description'));
        expect(error?.message).toContain('200');
      }
    });

    it('should accept valid description for raw-material', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'raw-material',
        nc_description: 'A'.repeat(120),
        machine_status: 'operational',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Root Cause Analysis - 5-Why Depth', () => {
    it('should reject shallow root cause analysis', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        root_cause_analysis: 'Operator error.',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('root_cause_analysis'));
        expect(error?.message).toContain('shallow');
      }
    });

    it('should reject generic root cause statements', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        root_cause_analysis: 'Machine issue caused the problem.',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('root_cause_analysis'));
        expect(error?.message).toContain('generic');
      }
    });

    it('should accept deep root cause analysis', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        root_cause_analysis:
          'Temperature was too low. Why? Because the heater malfunctioned. Why? Because the sensor drifted. Why? Because calibration was overdue.',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept empty root cause (optional field)', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        root_cause_analysis: '',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Corrective Action - Specificity', () => {
    it('should require at least 2 specific actions', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        corrective_action: 'Fix the issue.',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('corrective_action'));
        expect(error?.message).toContain('at least 2 specific actions');
      }
    });

    it('should require procedure references', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        corrective_action: 'Calibrate sensors and update maintenance schedule.',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('corrective_action'));
        expect(error?.message).toContain('procedure reference');
      }
    });

    it('should require verification method and timeline', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        corrective_action: 'Calibrate sensors per SOP 5.6.',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((i) => i.path.includes('corrective_action'));
        expect(error?.message).toContain('verification');
      }
    });

    it('should accept complete corrective action', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        corrective_action:
          '1) Calibrate all sensors per BRCGS 5.6. 2) Implement weekly checks. 3) QA will verify on next batch (due 10-Oct).',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept empty corrective action (optional field)', () => {
      const data: Partial<NCAFormData> = {
        nc_type: 'finished-goods',
        nc_description: 'A'.repeat(150),
        machine_status: 'operational',
        corrective_action: '',
      };
      const result = ncaFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

