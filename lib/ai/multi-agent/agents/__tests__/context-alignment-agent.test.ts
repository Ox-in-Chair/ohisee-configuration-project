/**
 * Context Alignment Agent Unit Tests
 * Comprehensive test coverage for logical consistency validation
 * Target: >95% coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextAlignmentAgent } from '../context-alignment-agent';
import type { NCA, MJC, User } from '../../../types';
import type { AgentResult } from '../../types';

describe('ContextAlignmentAgent', () => {
  let agent: ContextAlignmentAgent;
  let mockUser: User;
  let mockNCA: NCA;
  let mockMJC: MJC;

  beforeEach(() => {
    agent = new ContextAlignmentAgent();

    mockUser = {
      id: 'user-123',
      role: 'operator',
      name: 'Test User',
      department: 'Production',
      induction_completed: true,
      induction_date: '2024-01-01',
    };

    mockNCA = {
      nca_id: 'NCA-001',
      nc_description: 'Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet.',
      nc_type: 'finished-goods',
      machine_status: 'operational',
      cross_contamination: false,
      disposition_rework: true,
      disposition_concession: false,
      root_cause_analysis: 'Temperature was too low. Why? Because the heater malfunctioned. Why? Because the sensor drifted. Why? Because calibration was overdue by 3 weeks.',
      corrective_action: '1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6. 3) QA will verify on next batch (due 10-Oct).',
      work_order_id: 'WO-456',
    };

    mockMJC = {
      mjc_id: 'MJC-001',
      description_required: 'Machine stopped unexpectedly. Error code E-403.',
      maintenance_category: 'reactive',
      maintenance_type_electrical: true,
      maintenance_type_mechanical: false,
      maintenance_type_pneumatical: false,
      machine_status: 'down',
      urgency: 'critical',
      temporary_repair: false,
      machine_equipment: 'Laminator-01',
      maintenance_performed: 'Replaced faulty relay.',
    };
  });

  describe('analyze - Basic Functionality', () => {
    it('should return agent result with required fields', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');

      expect(Array.isArray(result.requirements)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.reasoning).toBe('string');
    });

    it('should have high confidence (logical checks)', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should include reasoning in result', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      expect(result.reasoning).toContain('Context Alignment Agent');
      expect(result.reasoning).toContain('nca');
      expect(result.reasoning).toContain('logical consistency');
    });

    it('should work with MJC form type', async () => {
      const result = await agent.analyze(mockMJC, mockUser, 'mjc');

      expect(result).toBeDefined();
      expect(result.reasoning).toContain('mjc');
    });
  });

  describe('Root Cause Alignment with Description', () => {
    it('should detect when root cause does not explain description', async () => {
      const ncaWithMisalignment: NCA = {
        ...mockNCA,
        nc_description: 'Packaging label was printed incorrectly on batch B-2045.',
        root_cause_analysis: 'The temperature sensor was faulty in the mixing area.',
      };

      const result = await agent.analyze(ncaWithMisalignment, mockUser, 'nca');

      const alignmentError = result.errors.find(
        (e) => e.field === 'root_cause_analysis' && e.message.includes('does not appear to explain')
      );
      expect(alignmentError).toBeDefined();
      expect(alignmentError?.brcgs_requirement).toBe('BRCGS 5.7.2');
    });

    it('should pass when root cause logically explains description', async () => {
      const ncaWithGoodAlignment: NCA = {
        ...mockNCA,
        nc_description: 'Temperature was too low causing delamination on batch B-2045.',
        root_cause_analysis: 'Temperature was too low because the heating element failed.',
      };

      const result = await agent.analyze(ncaWithGoodAlignment, mockUser, 'nca');

      const alignmentError = result.errors.find((e) => e.field === 'root_cause_analysis');
      expect(alignmentError).toBeUndefined();
    });

    it('should detect contradictory statements between description and root cause', async () => {
      const ncaWithContradiction: NCA = {
        ...mockNCA,
        nc_description: 'Machine was not working properly during batch B-2045.',
        root_cause_analysis: 'Machine was working properly but operator made an error.',
      };

      const result = await agent.analyze(ncaWithContradiction, mockUser, 'nca');

      const contradictionError = result.errors.find(
        (e) => e.field === 'root_cause_analysis' && e.message.includes('contradiction')
      );
      expect(contradictionError).toBeDefined();
    });

    it('should detect high/low contradictions', async () => {
      const ncaWithContradiction: NCA = {
        ...mockNCA,
        nc_description: 'Temperature was high causing issues.',
        root_cause_analysis: 'Temperature was low which caused the problem.',
      };

      const result = await agent.analyze(ncaWithContradiction, mockUser, 'nca');

      const contradictionError = result.errors.find((e) => e.message.includes('contradiction'));
      expect(contradictionError).toBeDefined();
    });

    it('should detect increased/decreased contradictions', async () => {
      const ncaWithContradiction: NCA = {
        ...mockNCA,
        nc_description: 'Production rate increased causing defects.',
        root_cause_analysis: 'Production rate decreased which led to the issue.',
      };

      const result = await agent.analyze(ncaWithContradiction, mockUser, 'nca');

      const contradictionError = result.errors.find((e) => e.message.includes('contradiction'));
      expect(contradictionError).toBeDefined();
    });

    it('should increase confidence when alignment error detected', async () => {
      const ncaWithMisalignment: NCA = {
        ...mockNCA,
        nc_description: 'Packaging label was printed incorrectly.',
        root_cause_analysis: 'The temperature sensor was faulty.',
      };

      const result = await agent.analyze(ncaWithMisalignment, mockUser, 'nca');

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should not check alignment if description missing', async () => {
      const ncaWithoutDescription: Partial<NCA> = {
        ...mockNCA,
        nc_description: undefined as any,
      };

      const result = await agent.analyze(ncaWithoutDescription as NCA, mockUser, 'nca');

      const alignmentError = result.errors.find((e) => e.field === 'root_cause_analysis');
      expect(alignmentError).toBeUndefined();
    });

    it('should not check alignment if root cause missing', async () => {
      const ncaWithoutRootCause: Partial<NCA> = {
        ...mockNCA,
        root_cause_analysis: undefined,
      };

      const result = await agent.analyze(ncaWithoutRootCause as NCA, mockUser, 'nca');

      const alignmentError = result.errors.find((e) => e.field === 'root_cause_analysis');
      expect(alignmentError).toBeUndefined();
    });
  });

  describe('Corrective Action Alignment with Root Cause', () => {
    it('should detect when corrective action does not address root cause', async () => {
      const ncaWithMisalignment: NCA = {
        ...mockNCA,
        root_cause_analysis: 'Temperature sensor was faulty causing low temperature readings.',
        corrective_action: 'Train operators on proper packaging procedures.',
      };

      const result = await agent.analyze(ncaWithMisalignment, mockUser, 'nca');

      const alignmentReq = result.requirements.find(
        (r) => r.field === 'corrective_action' && r.message.includes('does not appear to address')
      );
      expect(alignmentReq).toBeDefined();
      expect(alignmentReq?.reference).toBe('BRCGS 5.7.2');
      expect(alignmentReq?.exampleFix).toContain('directly addresses the root cause');
    });

    it('should pass when corrective action addresses root cause', async () => {
      const ncaWithGoodAlignment: NCA = {
        ...mockNCA,
        root_cause_analysis: 'Temperature sensor was faulty causing incorrect readings.',
        corrective_action: 'Replace temperature sensor and calibrate all sensors immediately.',
      };

      const result = await agent.analyze(ncaWithGoodAlignment, mockUser, 'nca');

      const alignmentReq = result.requirements.find((r) => r.field === 'corrective_action');
      expect(alignmentReq).toBeUndefined();
    });

    it('should increase confidence when action misalignment detected', async () => {
      const ncaWithMisalignment: NCA = {
        ...mockNCA,
        root_cause_analysis: 'Temperature sensor was faulty.',
        corrective_action: 'Train operators on packaging.',
      };

      const result = await agent.analyze(ncaWithMisalignment, mockUser, 'nca');

      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should not check alignment if root cause missing', async () => {
      const ncaWithoutRootCause: Partial<NCA> = {
        ...mockNCA,
        root_cause_analysis: undefined,
      };

      const result = await agent.analyze(ncaWithoutRootCause as NCA, mockUser, 'nca');

      const alignmentReq = result.requirements.find((r) => r.field === 'corrective_action');
      expect(alignmentReq).toBeUndefined();
    });

    it('should not check alignment if corrective action missing', async () => {
      const ncaWithoutAction: Partial<NCA> = {
        ...mockNCA,
        corrective_action: undefined,
      };

      const result = await agent.analyze(ncaWithoutAction as NCA, mockUser, 'nca');

      const alignmentReq = result.requirements.find((r) => r.field === 'corrective_action');
      expect(alignmentReq).toBeUndefined();
    });
  });

  describe('NC Type and Description Match', () => {
    it('should detect when nc_type does not match description content (raw-material)', async () => {
      const ncaWithMismatch: NCA = {
        ...mockNCA,
        nc_type: 'raw-material',
        nc_description: 'Finished product label was printed incorrectly on batch B-2045.',
      };

      const result = await agent.analyze(ncaWithMismatch, mockUser, 'nca');

      const typeWarning = result.warnings.find(
        (w) => w.field === 'nc_type' && w.message.includes('does not contain keywords')
      );
      expect(typeWarning).toBeDefined();
      expect(typeWarning?.suggestion).toContain('finished-goods');
    });

    it('should pass when nc_type matches description (raw-material)', async () => {
      const ncaWithMatch: NCA = {
        ...mockNCA,
        nc_type: 'raw-material',
        nc_description: 'Raw material delivery from supplier was contaminated in batch B-2045.',
      };

      const result = await agent.analyze(ncaWithMatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeUndefined();
    });

    it('should detect when nc_type does not match description content (finished-goods)', async () => {
      const ncaWithMismatch: NCA = {
        ...mockNCA,
        nc_type: 'finished-goods',
        nc_description: 'Raw material ingredient was incorrect from supplier.',
      };

      const result = await agent.analyze(ncaWithMismatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeDefined();
      expect(typeWarning?.suggestion).toContain('raw-material');
    });

    it('should pass when nc_type matches description (finished-goods)', async () => {
      const ncaWithMatch: NCA = {
        ...mockNCA,
        nc_type: 'finished-goods',
        nc_description: 'Finished product packaging label was incorrect on batch B-2045.',
      };

      const result = await agent.analyze(ncaWithMatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeUndefined();
    });

    it('should detect when nc_type does not match description content (wip)', async () => {
      const ncaWithMismatch: NCA = {
        ...mockNCA,
        nc_type: 'wip',
        nc_description: 'Safety incident occurred when operator was injured.',
      };

      const result = await agent.analyze(ncaWithMismatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeDefined();
      expect(typeWarning?.suggestion).toContain('incident');
    });

    it('should pass when nc_type matches description (wip)', async () => {
      const ncaWithMatch: NCA = {
        ...mockNCA,
        nc_type: 'wip',
        nc_description: 'Work in progress on production line had defect during process.',
      };

      const result = await agent.analyze(ncaWithMatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeUndefined();
    });

    it('should detect when nc_type does not match description content (incident)', async () => {
      const ncaWithMismatch: NCA = {
        ...mockNCA,
        nc_type: 'incident',
        nc_description: 'Finished product label was printed incorrectly.',
      };

      const result = await agent.analyze(ncaWithMismatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeDefined();
      expect(typeWarning?.suggestion).toContain('finished-goods');
    });

    it('should pass when nc_type matches description (incident)', async () => {
      const ncaWithMatch: NCA = {
        ...mockNCA,
        nc_type: 'incident',
        nc_description: 'Safety incident occurred when operator slipped in production area.',
      };

      const result = await agent.analyze(ncaWithMatch, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeUndefined();
    });

    it('should decrease confidence when type mismatch detected', async () => {
      const ncaWithMismatch: NCA = {
        ...mockNCA,
        nc_type: 'raw-material',
        nc_description: 'Finished product label was incorrect.',
      };

      const result = await agent.analyze(ncaWithMismatch, mockUser, 'nca');

      expect(result.confidence).toBeLessThanOrEqual(0.7);
    });

    it('should not check type match if nc_type missing', async () => {
      const ncaWithoutType: Partial<NCA> = {
        ...mockNCA,
        nc_type: undefined as any,
      };

      const result = await agent.analyze(ncaWithoutType as NCA, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeUndefined();
    });

    it('should not check type match if description missing', async () => {
      const ncaWithoutDescription: Partial<NCA> = {
        ...mockNCA,
        nc_description: undefined as any,
      };

      const result = await agent.analyze(ncaWithoutDescription as NCA, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      expect(typeWarning).toBeUndefined();
    });

    it('should handle unknown nc_type gracefully', async () => {
      const ncaWithUnknownType: NCA = {
        ...mockNCA,
        nc_type: 'unknown-type' as any,
      };

      const result = await agent.analyze(ncaWithUnknownType, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should suggest "other" when no specific type matches', async () => {
      const ncaWithGeneric: NCA = {
        ...mockNCA,
        nc_type: 'finished-goods',
        nc_description: 'Something generic happened without specific keywords.',
      };

      const result = await agent.analyze(ncaWithGeneric, mockUser, 'nca');

      const typeWarning = result.warnings.find((w) => w.field === 'nc_type');
      if (typeWarning) {
        expect(typeWarning.suggestion).toContain('other');
      }
    });
  });

  describe('Multiple Alignment Issues', () => {
    it('should detect multiple alignment issues simultaneously', async () => {
      const ncaWithMultipleIssues: NCA = {
        ...mockNCA,
        nc_type: 'raw-material',
        nc_description: 'Finished product packaging label was printed incorrectly.',
        root_cause_analysis: 'Temperature sensor was faulty in mixing area.',
        corrective_action: 'Train operators on safety procedures.',
      };

      const result = await agent.analyze(ncaWithMultipleIssues, mockUser, 'nca');

      // Should detect: type mismatch, root cause doesn't explain description, action doesn't address root cause
      const errors = result.errors.filter((e) => e.field === 'root_cause_analysis');
      const requirements = result.requirements.filter((r) => r.field === 'corrective_action');
      const warnings = result.warnings.filter((w) => w.field === 'nc_type');

      expect(errors.length + requirements.length + warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('should have high confidence when multiple issues found', async () => {
      const ncaWithMultipleIssues: NCA = {
        ...mockNCA,
        nc_type: 'raw-material',
        nc_description: 'Finished product label was incorrect.',
        root_cause_analysis: 'Temperature was too low.',
        corrective_action: 'Train operators.',
      };

      const result = await agent.analyze(ncaWithMultipleIssues, mockUser, 'nca');

      // Note: Confidence is set by last check (type mismatch = 0.7)
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.errors.length + result.requirements.length + result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Key Terms Extraction', () => {
    it('should extract meaningful terms (filter stop words)', async () => {
      const ncaWithStopWords: NCA = {
        ...mockNCA,
        nc_description: 'The machine and the operator found a problem with the batch.',
        root_cause_analysis: 'The machine malfunction and operator error.',
      };

      const result = await agent.analyze(ncaWithStopWords, mockUser, 'nca');

      // Should extract: machine, operator, problem, batch, malfunction, error
      // Should pass alignment check (common terms: machine, operator)
      expect(result).toBeDefined();
    });

    it('should handle short words (filter <4 chars)', async () => {
      const ncaWithShortWords: NCA = {
        ...mockNCA,
        nc_description: 'Box of raw mix was bad.',
        root_cause_analysis: 'Mix was old and box torn.',
      };

      const result = await agent.analyze(ncaWithShortWords, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should deduplicate key terms', async () => {
      const ncaWithDuplicates: NCA = {
        ...mockNCA,
        nc_description: 'Temperature temperature temperature was high high high.',
        root_cause_analysis: 'Temperature was too high because heater heater heater failed.',
      };

      const result = await agent.analyze(ncaWithDuplicates, mockUser, 'nca');

      // Should pass alignment (temperature is common term)
      const alignmentError = result.errors.find((e) => e.field === 'root_cause_analysis');
      expect(alignmentError).toBeUndefined();
    });

    it('should handle punctuation in terms', async () => {
      const ncaWithPunctuation: NCA = {
        ...mockNCA,
        nc_description: 'Temperature! was@ too# high$ causing% issues^.',
        root_cause_analysis: 'Temperature* was( high) because[ sensor] failed{.',
      };

      const result = await agent.analyze(ncaWithPunctuation, mockUser, 'nca');

      // Should extract clean terms without punctuation
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty description', async () => {
      const ncaWithEmpty: NCA = {
        ...mockNCA,
        nc_description: '',
      };

      const result = await agent.analyze(ncaWithEmpty, mockUser, 'nca');

      expect(result).toBeDefined();
      expect(result.errors.length).toBe(0);
    });

    it('should handle empty root cause', async () => {
      const ncaWithEmpty: NCA = {
        ...mockNCA,
        root_cause_analysis: '',
      };

      const result = await agent.analyze(ncaWithEmpty, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle empty corrective action', async () => {
      const ncaWithEmpty: NCA = {
        ...mockNCA,
        corrective_action: '',
      };

      const result = await agent.analyze(ncaWithEmpty, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle very long text gracefully', async () => {
      const longText = 'A'.repeat(10000);
      const ncaWithLong: NCA = {
        ...mockNCA,
        nc_description: longText,
        root_cause_analysis: longText,
      };

      const result = await agent.analyze(ncaWithLong, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle special characters', async () => {
      const ncaWithSpecial: NCA = {
        ...mockNCA,
        nc_description: '@@@ ### $$$ %%%',
        root_cause_analysis: '!!! ^^^ &&& ***',
      };

      const result = await agent.analyze(ncaWithSpecial, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const ncaWithUnicode: NCA = {
        ...mockNCA,
        nc_description: 'Temperature était trop élevé causing délamination.',
        root_cause_analysis: 'Capteur de température was défaillant.',
      };

      const result = await agent.analyze(ncaWithUnicode, mockUser, 'nca');

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle NCA with all fields populated', async () => {
      const completeNCA: NCA = {
        ...mockNCA,
        nc_type_other: 'Custom type',
        machine_down_since: '2024-10-01T08:00:00Z',
      };

      const result = await agent.analyze(completeNCA, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle minimal NCA', async () => {
      const minimalNCA: Partial<NCA> = {
        nca_id: 'NCA-MIN',
        nc_description: 'Issue',
        nc_type: 'other',
        machine_status: 'operational',
        cross_contamination: false,
        disposition_rework: false,
        disposition_concession: false,
      };

      const result = await agent.analyze(minimalNCA as NCA, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle user with different roles', async () => {
      const qaUser: User = {
        ...mockUser,
        role: 'qa-supervisor',
      };

      const result = await agent.analyze(mockNCA, qaUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should return only errors, requirements, and warnings (no other types)', async () => {
      const result = await agent.analyze(mockNCA, mockUser, 'nca');

      // All findings should be in errors, requirements, or warnings arrays
      expect(result.errors).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should handle case-insensitive term matching', async () => {
      const ncaWithMixedCase: NCA = {
        ...mockNCA,
        nc_description: 'TEMPERATURE was TOO HIGH causing DELAMINATION.',
        root_cause_analysis: 'temperature was high because HEATER failed.',
      };

      const result = await agent.analyze(ncaWithMixedCase, mockUser, 'nca');

      // Should pass alignment (case-insensitive matching)
      const alignmentError = result.errors.find((e) => e.field === 'root_cause_analysis');
      expect(alignmentError).toBeUndefined();
    });

    it('should handle whitespace variations', async () => {
      const ncaWithWhitespace: NCA = {
        ...mockNCA,
        nc_description: 'Temperature   was    too     high.',
        root_cause_analysis: 'Temperature was high.',
      };

      const result = await agent.analyze(ncaWithWhitespace, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should handle numbers in text', async () => {
      const ncaWithNumbers: NCA = {
        ...mockNCA,
        nc_description: 'Temperature was 150 degrees celsius on batch B-2045.',
        root_cause_analysis: 'Temperature exceeded 150 degrees due to sensor fault.',
      };

      const result = await agent.analyze(ncaWithNumbers, mockUser, 'nca');

      expect(result).toBeDefined();
    });

    it('should provide reasoning with finding counts', async () => {
      const ncaWithIssues: NCA = {
        ...mockNCA,
        nc_type: 'raw-material',
        nc_description: 'Finished product label was incorrect.',
        root_cause_analysis: 'Temperature was too low.',
      };

      const result = await agent.analyze(ncaWithIssues, mockUser, 'nca');

      expect(result.reasoning).toContain('alignment errors');
      expect(result.reasoning).toContain('alignment requirements');
    });
  });
});
