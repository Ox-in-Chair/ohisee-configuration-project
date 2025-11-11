/**
 * Performance Tests for Validation System
 * Ensures validation checks complete within performance targets (60fps, <100ms)
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateDescriptionCompleteness,
  validateRootCauseDepth,
  validateCorrectiveActionSpecificity,
} from '@/lib/services/quality-enforcement-service';
import { adaptValidationToEnforcementLevel } from '@/lib/services/adaptive-enforcement';

describe('Validation Performance Tests', () => {
  describe('Rule-Based Validation Performance', () => {
    it('should complete description validation in <10ms', () => {
      const description = 'A'.repeat(200);
      const start = performance.now();
      validateDescriptionCompleteness(description, 'finished-goods');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should complete root cause validation in <10ms', () => {
      const analysis = 'Why? Because. Why? Because. Why? Because.';
      const start = performance.now();
      validateRootCauseDepth(analysis);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should complete corrective action validation in <10ms', () => {
      const action = '1) Action one. 2) Action two per SOP 5.7. 3) Verify next batch (due 10-Oct).';
      const start = performance.now();
      validateCorrectiveActionSpecificity(action);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle long text efficiently', () => {
      const longDescription = 'A'.repeat(2000);
      const start = performance.now();
      validateDescriptionCompleteness(longDescription, 'finished-goods');
      const duration = performance.now() - start;

      // Should still be fast even with long text
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Adaptive Enforcement Performance', () => {
    it('should complete adaptive enforcement in <5ms', () => {
      const issues = [
        {
          field: 'nc_description',
          message: 'Too short',
          severity: 'error' as const,
        },
      ];

      const start = performance.now();
      adaptValidationToEnforcementLevel(issues, 2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    it('should handle multiple issues efficiently', () => {
      const issues = Array.from({ length: 10 }, (_, i) => ({
        field: `field_${i}`,
        message: `Issue ${i}`,
        severity: 'error' as const,
      }));

      const start = performance.now();
      adaptValidationToEnforcementLevel(issues, 3);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('End-to-End Validation Performance', () => {
    it('should complete full validation pipeline in <100ms', () => {
      const description = 'A'.repeat(200);
      const rootCause = 'Why? Because. Why? Because. Why? Because.';
      const correctiveAction = '1) Action. 2) Action per SOP 5.7. 3) Verify (due 10-Oct).';

      const start = performance.now();

      // Run all validations
      validateDescriptionCompleteness(description, 'finished-goods');
      validateRootCauseDepth(rootCause);
      validateCorrectiveActionSpecificity(correctiveAction);

      const duration = performance.now() - start;

      // Total should be under 100ms for all validations
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not create excessive objects during validation', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Run multiple validations
      for (let i = 0; i < 100; i++) {
        validateDescriptionCompleteness('Test description', 'finished-goods');
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (<10MB for 100 validations)
      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });
});

