/**
 * Quality Validation Messages
 * Centralized store for user-friendly validation messages and hints
 * Framed as requirements rather than AI opinions, with references to standards
 */

export interface QualityMessage {
  message: string;
  reference?: string;
  exampleFix?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Get validation message for description completeness
 */
export function getDescriptionCompletenessMessage(
  missingRequirements: string[],
  ncType: string
): QualityMessage {
  if (missingRequirements.length === 0) {
    return {
      message: 'Description meets requirements',
      severity: 'info',
    };
  }

  const minLengths: Record<string, number> = {
    'raw-material': 120,
    'finished-goods': 150,
    'wip': 130,
    'incident': 200,
    'other': 100,
  };

  const requiredMin = minLengths[ncType] || 100;

  return {
    message: `Description incomplete: please add ${missingRequirements.join(', ')}.`,
    reference: 'BRCGS 5.7.2',
    exampleFix: `Example: "Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet."`,
    severity: 'warning',
  };
}

/**
 * Get validation message for vague language
 */
export function getVagueLanguageMessage(vaguePhrases: string[]): QualityMessage {
  if (vaguePhrases.length === 0) {
    return {
      message: 'Description is specific and detailed',
      severity: 'info',
    };
  }

  return {
    message: `Description contains vague language (${vaguePhrases.join(', ')}). Please be more specific with details, measurements, and quantities.`,
    exampleFix: 'Instead of "bad product", describe what was wrong: "Seal integrity failure - side seal temperature 5°C below specification"',
    severity: 'warning',
  };
}

/**
 * Get validation message for root cause depth
 */
export function getRootCauseDepthMessage(whyCount: number, isGeneric: boolean): QualityMessage {
  if (whyCount >= 3 && !isGeneric) {
    return {
      message: 'Root cause analysis meets depth requirements',
      severity: 'info',
    };
  }

  if (isGeneric) {
    return {
      message:
        'Root cause analysis is too generic. Please be more specific. Instead of "operator error", explain: Why did the operator make the error? Was training adequate? Was the procedure clear?',
      reference: 'BRCGS 5.7 Section 4',
      exampleFix:
        'Instead of "operator error", use: "Operator did not follow first-off checklist → Checklist not visibly posted at machine → Housekeeping procedure does not include checklist positioning verification"',
      severity: 'error',
    };
  }

  if (whyCount < 3) {
    return {
      message:
        'Root cause analysis needs more depth. Use the 5-Why method: Why did this happen? → [cause]. Why? → [deeper cause]. Why? → [root cause].',
      reference: 'BRCGS 5.7 Section 4',
      exampleFix:
        'Example: "Why did delamination occur? → Adhesive temperature too low. Why? → Heater malfunction. Why? → Sensor drift. Why? → Calibration overdue by 3 weeks."',
      severity: 'warning',
    };
  }

  return {
    message: 'Root cause analysis is acceptable',
    severity: 'info',
  };
}

/**
 * Get validation message for corrective action specificity
 */
export function getCorrectiveActionMessage(missingRequirements: string[]): QualityMessage {
  if (missingRequirements.length === 0) {
    return {
      message: 'Corrective action meets requirements',
      severity: 'info',
    };
  }

  return {
    message: `Corrective action needs more detail: ${missingRequirements.join('. ')}`,
    reference: 'BRCGS 5.7 Section 5',
    exampleFix:
      'Example: "1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6. 3) QA will verify on next batch (due 10-Oct)."',
    severity: 'warning',
  };
}

/**
 * Get requirement checklist items for a field
 */
export function getRequirementChecklist(
  fieldName: string,
  value: string,
  context?: { ncType?: string }
): Array<{ label: string; checked: boolean; required: boolean }> {
  if (fieldName === 'nc_description' && context?.ncType) {
    const requirements = [
      { label: 'What happened', checked: /\b(what|found|discovered|observed|detected|identified)\b/i.test(value), required: true },
      { 
        label: 'When (time/date)', 
        checked: /\b(\d{1,2}:\d{2}(?:\s*(?:am|pm|AM|PM))?|\d{1,2}\s*(?:am|pm|AM|PM)|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2}(?:st|nd|rd|th)\s+of\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}|today|yesterday|this\s+(?:morning|afternoon|evening)|at\s+\d+|on\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?|on\s+\w+day)\b/i.test(value), 
        required: context.ncType === 'incident' 
      },
      { label: 'Where (location)', checked: /\b(area|line|machine|station|location|section|zone)\b/i.test(value), required: true },
      { label: 'Quantity affected', checked: /\b(\d+|approximately|about|around|several|many|few)\b/i.test(value), required: true },
      { label: 'Batch/carton numbers', checked: /\b(batch|carton|reel|box|lot|B-|C-|R-)\b/i.test(value), required: ['finished-goods', 'raw-material'].includes(context.ncType) },
    ];
    return requirements;
  }

  if (fieldName === 'root_cause_analysis') {
    const whyCount = (value.match(/\b(why|because|due to|caused by|result of|reason)\b/gi) || []).length;
    return [
      { label: 'First "why" answered', checked: whyCount >= 1, required: true },
      { label: 'Second "why" answered', checked: whyCount >= 2, required: true },
      { label: 'Third "why" answered', checked: whyCount >= 3, required: true },
      { label: 'Specific root cause identified', checked: !/\b(operator error|human error|mistake|machine (issue|problem|broken))\b/i.test(value) || whyCount >= 3, required: true },
    ];
  }

  if (fieldName === 'corrective_action') {
    const hasActions = (value.match(/\b(will|must|shall|implement|add|update|verify|check|train|calibrate|replace|install|modify|create|establish)\b/gi) || []).length >= 2;
    const hasProcedure = /\b(SOP|BRCGS|procedure|section|5\.\d+|3\.\d+|2\.\d+)\b/gi.test(value);
    const hasVerification = /\b(verify|check|confirm|validate|monitor|review|audit)\b/gi.test(value);
    const hasTimeline = /\b(within|by|due|deadline|target|schedule|next|weekly|monthly|daily)\b/gi.test(value);

    return [
      { label: 'At least 2 specific actions', checked: hasActions, required: true },
      { label: 'Procedure reference included', checked: hasProcedure, required: true },
      { label: 'Verification method included', checked: hasVerification, required: true },
      { label: 'Verification timeline included', checked: hasTimeline, required: true },
    ];
  }

  return [];
}

