/**
 * Quality Enforcement Service Unit Tests
 * Tests validation rules for description completeness, root cause depth, and corrective action specificity
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateDescriptionCompleteness,
  validateRootCauseDepth,
  validateCorrectiveActionSpecificity,
  detectVagueLanguage,
  requireSpecificDetails,
} from '../quality-enforcement-service';
import type { NCA } from '@/lib/ai/types';

describe('Quality Enforcement Service', () => {
  describe('validateDescriptionCompleteness', () => {
    it('should enforce minimum length for raw-material NC type', () => {
      const result = validateDescriptionCompleteness('Short', 'raw-material');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('120 characters'))).toBe(true);
    });

    it('should enforce minimum length for finished-goods NC type', () => {
      const result = validateDescriptionCompleteness('Short', 'finished-goods');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('150 characters'))).toBe(true);
    });

    it('should enforce minimum length for incident NC type', () => {
      const result = validateDescriptionCompleteness('Short', 'incident');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('200 characters'))).toBe(true);
    });

    it('should detect missing required elements', () => {
      const description = 'Something happened.';
      const result = validateDescriptionCompleteness(description, 'finished-goods');
      expect(result.missingRequirements.length).toBeGreaterThan(0);
      expect(result.missingRequirements).toContain('when it occurred (time/date)');
    });

    it('should detect vague language', () => {
      const description = 'Bad product found.';
      const result = validateDescriptionCompleteness(description, 'finished-goods');
      expect(result.vaguePhrases.length).toBeGreaterThan(0);
    });

    it('should require time for incident descriptions', () => {
      const description = 'Incident occurred in the production area.';
      const result = validateDescriptionCompleteness(description, 'incident');
      expect(result.issues.some((i) => i.message.includes('time of occurrence'))).toBe(true);
    });

    it('should pass validation for complete description', () => {
      const description =
        'Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet.';
      const result = validateDescriptionCompleteness(description, 'finished-goods');
      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('validateRootCauseDepth', () => {
    it('should detect shallow root cause analysis', () => {
      const analysis = 'Operator error.';
      const result = validateRootCauseDepth(analysis);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('too shallow'))).toBe(true);
    });

    it('should detect generic root cause statements', () => {
      const analysis = 'Machine issue caused the problem.';
      const result = validateRootCauseDepth(analysis);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('too generic'))).toBe(true);
    });

    it('should require multiple "why" layers', () => {
      const analysis = 'Temperature was too low. Why? Because the heater failed.';
      const result = validateRootCauseDepth(analysis);
      expect(result.issues.some((i) => i.message.includes('more depth'))).toBe(true);
    });

    it('should pass validation for deep root cause analysis', () => {
      const analysis =
        'Temperature was too low. Why? Because the heater malfunctioned. Why? Because the sensor drifted. Why? Because calibration was overdue by 3 weeks.';
      const result = validateRootCauseDepth(analysis);
      expect(result.valid).toBe(true);
    });

    it('should accept empty root cause (optional field)', () => {
      const result = validateRootCauseDepth('');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCorrectiveActionSpecificity', () => {
    it('should require at least 2 specific actions', () => {
      const action = 'Fix the issue.';
      const result = validateCorrectiveActionSpecificity(action);
      expect(result.issues.some((i) => i.message.includes('at least 2 specific actions'))).toBe(true);
    });

    it('should require procedure references', () => {
      const action = 'Calibrate sensors and update maintenance schedule.';
      const result = validateCorrectiveActionSpecificity(action);
      expect(result.issues.some((i) => i.message.includes('procedure reference'))).toBe(true);
    });

    it('should require verification method', () => {
      const action = 'Calibrate sensors per SOP 5.6.';
      const result = validateCorrectiveActionSpecificity(action);
      expect(result.issues.some((i) => i.message.includes('verification method'))).toBe(true);
    });

    it('should require verification timeline', () => {
      const action = 'Calibrate sensors per SOP 5.6. QA will verify.';
      const result = validateCorrectiveActionSpecificity(action);
      expect(result.issues.some((i) => i.message.includes('timeline'))).toBe(true);
    });

    it('should pass validation for complete corrective action', () => {
      const action =
        '1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6. 3) QA will verify on next batch (due 10-Oct).';
      const result = validateCorrectiveActionSpecificity(action);
      expect(result.valid).toBe(true);
    });

    it('should accept empty corrective action (optional field)', () => {
      const result = validateCorrectiveActionSpecificity('');
      expect(result.valid).toBe(true);
    });
  });

  describe('detectVagueLanguage', () => {
    it('should detect vague descriptors', () => {
      const text = 'Bad product found.';
      const phrases = detectVagueLanguage(text);
      expect(phrases).toContain('vague descriptors');
    });

    it('should detect unspecific quantities', () => {
      const text = 'Some units were affected.';
      const phrases = detectVagueLanguage(text);
      expect(phrases).toContain('unspecific quantities');
    });

    it('should detect non-specific terms', () => {
      const text = 'Something went wrong with the thing.';
      const phrases = detectVagueLanguage(text);
      expect(phrases).toContain('non-specific terms');
    });

    it('should return empty array for specific text', () => {
      const text = 'Laminate delamination found on batch B-2045 at 14:30. 150 units affected.';
      const phrases = detectVagueLanguage(text);
      expect(phrases.length).toBe(0);
    });
  });

  describe('requireSpecificDetails', () => {
    it('should require time for incident descriptions', () => {
      const context: Partial<NCA> = {
        nc_type: 'incident',
        nc_description: 'Incident occurred.',
      };
      const missing = requireSpecificDetails('nc_description', context);
      expect(missing).toContain('time of occurrence');
    });

    it('should require batch numbers for finished-goods', () => {
      const context: Partial<NCA> = {
        nc_type: 'finished-goods',
        nc_description: 'Product issue found.',
      };
      const missing = requireSpecificDetails('nc_description', context);
      expect(missing).toContain('batch/carton numbers');
    });

    it('should require 5-Why depth for root cause analysis', () => {
      const context: Partial<NCA> = {
        root_cause_analysis: 'Operator error.',
      };
      const missing = requireSpecificDetails('root_cause_analysis', context);
      expect(missing).toContain('5-Why analysis depth');
    });

    it('should require procedure reference for corrective action', () => {
      const context: Partial<NCA> = {
        corrective_action: 'Fix the issue.',
      };
      const missing = requireSpecificDetails('corrective_action', context);
      expect(missing).toContain('procedure reference');
    });
  });
});

