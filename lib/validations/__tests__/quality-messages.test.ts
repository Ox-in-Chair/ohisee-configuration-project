/**
 * Unit Tests for lib/validations/quality-messages.ts
 * Test quality validation message generation
 */

import {
  getDescriptionCompletenessMessage,
  getVagueLanguageMessage,
  getRootCauseDepthMessage,
  getCorrectiveActionMessage,
  getRequirementChecklist,
  type QualityMessage,
} from '../quality-messages';

describe('lib/validations/quality-messages', () => {
  describe('getDescriptionCompletenessMessage', () => {
    test('returns info message when no missing requirements', () => {
      const result = getDescriptionCompletenessMessage([], 'raw-material');

      expect(result.severity).toBe('info');
      expect(result.message).toBe('Description meets requirements');
    });

    test('returns warning message with missing requirements', () => {
      const missing = ['time details', 'location'];
      const result = getDescriptionCompletenessMessage(missing, 'finished-goods');

      expect(result.severity).toBe('warning');
      expect(result.message).toContain('time details, location');
    });

    test('includes BRCGS reference', () => {
      const missing = ['quantity'];
      const result = getDescriptionCompletenessMessage(missing, 'wip');

      expect(result.reference).toBe('BRCGS 5.7.2');
    });

    test('includes example fix', () => {
      const missing = ['batch numbers'];
      const result = getDescriptionCompletenessMessage(missing, 'incident');

      expect(result.exampleFix).toBeDefined();
      expect(result.exampleFix).toContain('Example:');
    });

    test('formats multiple missing requirements correctly', () => {
      const missing = ['what happened', 'when', 'where'];
      const result = getDescriptionCompletenessMessage(missing, 'raw-material');

      expect(result.message).toContain('what happened, when, where');
    });

    test('handles single missing requirement', () => {
      const missing = ['quantity'];
      const result = getDescriptionCompletenessMessage(missing, 'other');

      expect(result.message).toContain('quantity');
      expect(result.severity).toBe('warning');
    });
  });

  describe('getVagueLanguageMessage', () => {
    test('returns info message when no vague phrases', () => {
      const result = getVagueLanguageMessage([]);

      expect(result.severity).toBe('info');
      expect(result.message).toBe('Description is specific and detailed');
    });

    test('returns warning message with vague phrases', () => {
      const vague = ['bad product', 'some issues'];
      const result = getVagueLanguageMessage(vague);

      expect(result.severity).toBe('warning');
      expect(result.message).toContain('bad product, some issues');
    });

    test('includes example fix with specific guidance', () => {
      const vague = ['bad product'];
      const result = getVagueLanguageMessage(vague);

      expect(result.exampleFix).toBeDefined();
      expect(result.exampleFix).toContain('Instead of');
      expect(result.exampleFix).toContain('describe what was wrong');
    });

    test('formats multiple vague phrases', () => {
      const vague = ['problem', 'issue', 'not good'];
      const result = getVagueLanguageMessage(vague);

      expect(result.message).toContain('problem, issue, not good');
    });

    test('provides actionable guidance', () => {
      const vague = ['maybe', 'possibly'];
      const result = getVagueLanguageMessage(vague);

      expect(result.message).toContain('be more specific');
    });
  });

  describe('getRootCauseDepthMessage', () => {
    test('returns info when requirements met (3+ whys, not generic)', () => {
      const result = getRootCauseDepthMessage(3, false);

      expect(result.severity).toBe('info');
      expect(result.message).toBe('Root cause analysis meets depth requirements');
    });

    test('returns error when analysis is too generic', () => {
      const result = getRootCauseDepthMessage(3, true);

      expect(result.severity).toBe('error');
      expect(result.message).toContain('too generic');
      expect(result.message).toContain('be more specific');
    });

    test('includes BRCGS reference for generic analysis', () => {
      const result = getRootCauseDepthMessage(3, true);

      expect(result.reference).toBe('BRCGS 5.7 Section 4');
    });

    test('includes example fix for generic analysis', () => {
      const result = getRootCauseDepthMessage(3, true);

      expect(result.exampleFix).toBeDefined();
      expect(result.exampleFix).toContain('Instead of "operator error"');
    });

    test('returns warning when why count is less than 3', () => {
      const result = getRootCauseDepthMessage(2, false);

      expect(result.severity).toBe('warning');
      expect(result.message).toContain('needs more depth');
      expect(result.message).toContain('5-Why method');
    });

    test('includes BRCGS reference for insufficient depth', () => {
      const result = getRootCauseDepthMessage(1, false);

      expect(result.reference).toBe('BRCGS 5.7 Section 4');
    });

    test('includes example fix for insufficient depth', () => {
      const result = getRootCauseDepthMessage(2, false);

      expect(result.exampleFix).toBeDefined();
      expect(result.exampleFix).toContain('Why did delamination occur?');
    });

    test('handles edge case of 0 whys', () => {
      const result = getRootCauseDepthMessage(0, false);

      expect(result.severity).toBe('warning');
      expect(result.message).toContain('needs more depth');
    });

    test('prioritizes generic check over depth check', () => {
      // Even with 5 whys, generic analysis should return error
      const result = getRootCauseDepthMessage(5, true);

      expect(result.severity).toBe('error');
      expect(result.message).toContain('too generic');
    });

    test('returns acceptable message for exactly 3 whys', () => {
      const result = getRootCauseDepthMessage(3, false);

      expect(result.severity).toBe('info');
    });

    test('returns acceptable message when exceeds minimum requirements', () => {
      // Edge case: > 3 whys, not generic - should hit the final return
      const result = getRootCauseDepthMessage(5, false);

      expect(result.severity).toBe('info');
      expect(result.message).toBe('Root cause analysis meets depth requirements');
    });

    test('returns acceptable message as fallback for edge cases', () => {
      // Test the fallback return statement (line 97)
      // This occurs when conditions don't match any specific case
      const result = getRootCauseDepthMessage(4, false);

      // With 4 whys and not generic, should pass all checks
      expect(result.severity).toBe('info');
      expect(result.message).toBe('Root cause analysis meets depth requirements');
    });
  });

  describe('getCorrectiveActionMessage', () => {
    test('returns info message when no missing requirements', () => {
      const result = getCorrectiveActionMessage([]);

      expect(result.severity).toBe('info');
      expect(result.message).toBe('Corrective action meets requirements');
    });

    test('returns warning message with missing requirements', () => {
      const missing = ['verification method', 'timeline'];
      const result = getCorrectiveActionMessage(missing);

      expect(result.severity).toBe('warning');
      expect(result.message).toContain('verification method. timeline');
    });

    test('includes BRCGS reference', () => {
      const missing = ['specific actions'];
      const result = getCorrectiveActionMessage(missing);

      expect(result.reference).toBe('BRCGS 5.7 Section 5');
    });

    test('includes example fix with actionable steps', () => {
      const missing = ['procedure reference'];
      const result = getCorrectiveActionMessage(missing);

      expect(result.exampleFix).toBeDefined();
      expect(result.exampleFix).toContain('Example:');
      expect(result.exampleFix).toContain('1)');
      expect(result.exampleFix).toContain('2)');
      expect(result.exampleFix).toContain('3)');
    });

    test('formats multiple missing requirements with periods', () => {
      const missing = ['action 1', 'action 2', 'action 3'];
      const result = getCorrectiveActionMessage(missing);

      expect(result.message).toContain('action 1. action 2. action 3');
    });

    test('handles single missing requirement', () => {
      const missing = ['verification timeline'];
      const result = getCorrectiveActionMessage(missing);

      expect(result.message).toContain('verification timeline');
    });
  });

  describe('getRequirementChecklist - nc_description', () => {
    test('returns checklist items for raw-material NC type', () => {
      const value = 'Found delamination at 14:30 in Area 2. Batch B-2045 affected. 150 units.';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'raw-material' });

      expect(checklist).toHaveLength(5);
      expect(checklist.map(item => item.label)).toEqual([
        'What happened',
        'When (time/date)',
        'Where (location)',
        'Quantity affected',
        'Batch/carton numbers',
      ]);
    });

    test('marks "what happened" as checked when present', () => {
      const value = 'Found delamination issue in production';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'raw-material' });

      const whatItem = checklist.find(item => item.label === 'What happened');
      expect(whatItem?.checked).toBe(true);
    });

    test('marks "when" as checked when time is present', () => {
      const value = 'Issue discovered at 14:30 today';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'incident' });

      const whenItem = checklist.find(item => item.label === 'When (time/date)');
      expect(whenItem?.checked).toBe(true);
    });

    test('marks "where" as checked when location is present', () => {
      const value = 'Problem in Area 2 production line';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'wip' });

      const whereItem = checklist.find(item => item.label === 'Where (location)');
      expect(whereItem?.checked).toBe(true);
    });

    test('marks "quantity" as checked when numbers present', () => {
      const value = 'Approximately 150 units affected';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'finished-goods' });

      const quantityItem = checklist.find(item => item.label === 'Quantity affected');
      expect(quantityItem?.checked).toBe(true);
    });

    test('marks "batch/carton" as checked when identifiers present', () => {
      const value = 'Batch B-2045 and carton C-123 affected';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'raw-material' });

      const batchItem = checklist.find(item => item.label === 'Batch/carton numbers');
      expect(batchItem?.checked).toBe(true);
    });

    test('marks required=true for incident time field', () => {
      const checklist = getRequirementChecklist('nc_description', '', { ncType: 'incident' });

      const whenItem = checklist.find(item => item.label === 'When (time/date)');
      expect(whenItem?.required).toBe(true);
    });

    test('marks required=false for non-incident time field', () => {
      const checklist = getRequirementChecklist('nc_description', '', { ncType: 'wip' });

      const whenItem = checklist.find(item => item.label === 'When (time/date)');
      expect(whenItem?.required).toBe(false);
    });

    test('marks batch/carton required for finished-goods', () => {
      const checklist = getRequirementChecklist('nc_description', '', { ncType: 'finished-goods' });

      const batchItem = checklist.find(item => item.label === 'Batch/carton numbers');
      expect(batchItem?.required).toBe(true);
    });

    test('marks batch/carton not required for incident', () => {
      const checklist = getRequirementChecklist('nc_description', '', { ncType: 'incident' });

      const batchItem = checklist.find(item => item.label === 'Batch/carton numbers');
      expect(batchItem?.required).toBe(false);
    });

    test('handles empty description', () => {
      const checklist = getRequirementChecklist('nc_description', '', { ncType: 'raw-material' });

      expect(checklist.every(item => !item.checked)).toBe(true);
    });

    test('handles description with all requirements', () => {
      const value = 'Discovered delamination on batch B-2045 at 14:30 in Area 2. Approximately 150 units affected.';
      const checklist = getRequirementChecklist('nc_description', value, { ncType: 'raw-material' });

      expect(checklist.every(item => item.checked)).toBe(true);
    });
  });

  describe('getRequirementChecklist - root_cause_analysis', () => {
    test('returns checklist with 4 items for root cause', () => {
      const value = 'Because of X, which was due to Y, caused by Z';
      const checklist = getRequirementChecklist('root_cause_analysis', value);

      expect(checklist).toHaveLength(4);
      expect(checklist.map(item => item.label)).toEqual([
        'First "why" answered',
        'Second "why" answered',
        'Third "why" answered',
        'Specific root cause identified',
      ]);
    });

    test('marks first why as checked when present', () => {
      const value = 'This happened because of reason 1';
      const checklist = getRequirementChecklist('root_cause_analysis', value);

      const firstWhy = checklist.find(item => item.label === 'First "why" answered');
      expect(firstWhy?.checked).toBe(true);
    });

    test('marks second why as checked when multiple reasons present', () => {
      const value = 'Because of A, which was due to B';
      const checklist = getRequirementChecklist('root_cause_analysis', value);

      const secondWhy = checklist.find(item => item.label === 'Second "why" answered');
      expect(secondWhy?.checked).toBe(true);
    });

    test('marks third why as checked with sufficient depth', () => {
      const value = 'Why: A. Why: B. Why: C. Result of deep analysis';
      const checklist = getRequirementChecklist('root_cause_analysis', value);

      const thirdWhy = checklist.find(item => item.label === 'Third "why" answered');
      expect(thirdWhy?.checked).toBe(true);
    });

    test('marks specific root cause as unchecked with generic terms', () => {
      const value = 'Operator error caused the issue';
      const checklist = getRequirementChecklist('root_cause_analysis', value);

      const specificCause = checklist.find(item => item.label === 'Specific root cause identified');
      expect(specificCause?.checked).toBe(false);
    });

    test('marks specific root cause as checked with sufficient depth', () => {
      const value = 'Why: Operator error? Why: Inadequate training. Why: New procedure not documented. Why: Change management gap';
      const checklist = getRequirementChecklist('root_cause_analysis', value);

      const specificCause = checklist.find(item => item.label === 'Specific root cause identified');
      expect(specificCause?.checked).toBe(true);
    });

    test('all items are marked as required', () => {
      const checklist = getRequirementChecklist('root_cause_analysis', '');

      expect(checklist.every(item => item.required)).toBe(true);
    });

    test('handles empty root cause analysis', () => {
      const checklist = getRequirementChecklist('root_cause_analysis', '');

      // Empty string: whyCount = 0, so first 3 are unchecked
      // But "specific root cause" is checked because empty string doesn't contain generic terms
      const whyItems = checklist.filter(item => item.label.includes('why'));
      const specificItem = checklist.find(item => item.label === 'Specific root cause identified');

      expect(whyItems.every(item => !item.checked)).toBe(true);
      expect(specificItem?.checked).toBe(true); // No generic terms in empty string
    });
  });

  describe('getRequirementChecklist - corrective_action', () => {
    test('returns checklist with 4 items for corrective action', () => {
      const value = 'Will implement SOP update and verify weekly';
      const checklist = getRequirementChecklist('corrective_action', value);

      expect(checklist).toHaveLength(4);
      expect(checklist.map(item => item.label)).toEqual([
        'At least 2 specific actions',
        'Procedure reference included',
        'Verification method included',
        'Verification timeline included',
      ]);
    });

    test('marks actions as checked with multiple action verbs', () => {
      const value = 'Will implement new process and train all operators';
      const checklist = getRequirementChecklist('corrective_action', value);

      const actions = checklist.find(item => item.label === 'At least 2 specific actions');
      expect(actions?.checked).toBe(true);
    });

    test('marks procedure reference as checked when present', () => {
      const value = 'Update SOP 5.7 and implement BRCGS procedure';
      const checklist = getRequirementChecklist('corrective_action', value);

      const procedure = checklist.find(item => item.label === 'Procedure reference included');
      expect(procedure?.checked).toBe(true);
    });

    test('marks verification method as checked when present', () => {
      const value = 'Verify implementation through audit and confirm compliance';
      const checklist = getRequirementChecklist('corrective_action', value);

      const verification = checklist.find(item => item.label === 'Verification method included');
      expect(verification?.checked).toBe(true);
    });

    test('marks timeline as checked when present', () => {
      const value = 'Complete by next week and verify within 30 days';
      const checklist = getRequirementChecklist('corrective_action', value);

      const timeline = checklist.find(item => item.label === 'Verification timeline included');
      expect(timeline?.checked).toBe(true);
    });

    test('all items are marked as required', () => {
      const checklist = getRequirementChecklist('corrective_action', '');

      expect(checklist.every(item => item.required)).toBe(true);
    });

    test('handles empty corrective action', () => {
      const checklist = getRequirementChecklist('corrective_action', '');

      expect(checklist.every(item => !item.checked)).toBe(true);
    });

    test('handles comprehensive corrective action', () => {
      const value = 'Will implement and update SOP 5.7. Verify through weekly audit. Complete by next Monday and monitor daily.';
      const checklist = getRequirementChecklist('corrective_action', value);

      expect(checklist.every(item => item.checked)).toBe(true);
    });
  });

  describe('getRequirementChecklist - unknown field', () => {
    test('returns empty array for unknown field', () => {
      const checklist = getRequirementChecklist('unknown_field', 'some value');

      expect(checklist).toEqual([]);
    });

    test('returns empty array for non-description field without context', () => {
      const checklist = getRequirementChecklist('other_field', 'value', { ncType: 'raw-material' });

      expect(checklist).toEqual([]);
    });
  });

  describe('QualityMessage type structure', () => {
    test('all message functions return proper QualityMessage structure', () => {
      const messages: QualityMessage[] = [
        getDescriptionCompletenessMessage(['test'], 'raw-material'),
        getVagueLanguageMessage(['test']),
        getRootCauseDepthMessage(1, false),
        getCorrectiveActionMessage(['test']),
      ];

      messages.forEach(msg => {
        expect(msg).toHaveProperty('message');
        expect(msg).toHaveProperty('severity');
        expect(typeof msg.message).toBe('string');
        expect(['error', 'warning', 'info']).toContain(msg.severity);
      });
    });

    test('reference and exampleFix are optional', () => {
      const infoMessage = getDescriptionCompletenessMessage([], 'raw-material');
      const warningMessage = getDescriptionCompletenessMessage(['test'], 'raw-material');

      expect(infoMessage.reference).toBeUndefined();
      expect(warningMessage.reference).toBeDefined();
    });
  });
});
