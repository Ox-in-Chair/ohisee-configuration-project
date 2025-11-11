/**
 * Quality Enforcement Service
 * Rule-based validation for field completeness, pattern compliance, and procedure alignment
 * Returns structured feedback without AI references - appears as standard system validation
 */

import type { NCA, MJC } from '@/lib/ai/types';

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  missingRequirements: string[];
  vaguePhrases: string[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  brcgsReference?: string;
  exampleFix?: string;
}

/**
 * Validate description completeness based on NC type and content
 */
export function validateDescriptionCompleteness(
  description: string,
  ncType: string
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const missingRequirements: string[] = [];
  const vaguePhrases: string[] = [];

  // Check minimum length based on NC type
  const minLengths: Record<string, number> = {
    'raw-material': 120,
    'finished-goods': 150,
    'wip': 130,
    'incident': 200,
    'other': 100,
  };

  const requiredMin = minLengths[ncType] || 100;
  if (description.length < requiredMin) {
    issues.push({
      field: 'nc_description',
      message: `Description must be at least ${requiredMin} characters for ${ncType.replace('-', ' ')} non-conformances.`,
      severity: 'error',
      brcgsReference: 'BRCGS 5.7.2',
      exampleFix: `Example: "Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet."`,
    });
  }

  // Check for required elements
  const requiredElements = {
    what: /\b(what|found|discovered|observed|detected|identified)\b/i,
    when: /\b(\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|today|yesterday|at \d+|on \w+day)\b/i,
    where: /\b(area|line|machine|station|location|section|zone)\b/i,
    quantity: /\b(\d+|approximately|about|around|several|many|few)\b/i,
    batch: /\b(batch|carton|reel|box|lot|B-|C-|R-)\b/i,
  };

  if (!requiredElements.what.test(description)) {
    missingRequirements.push('what happened');
  }
  if (!requiredElements.when.test(description)) {
    missingRequirements.push('when it occurred (time/date)');
  }
  if (!requiredElements.where.test(description)) {
    missingRequirements.push('where it occurred (location/area)');
  }
  if (!requiredElements.quantity.test(description)) {
    missingRequirements.push('quantity affected');
  }
  if (!requiredElements.batch.test(description)) {
    missingRequirements.push('batch/carton numbers');
  }

  // Detect vague language
  const vaguePatterns = [
    { pattern: /\b(bad|broken|wrong|issue|problem)\b/i, phrase: 'vague descriptors' },
    { pattern: /\b(some|few|many|several)\b/i, phrase: 'unspecific quantities' },
    { pattern: /\b(thing|stuff|something|anything)\b/i, phrase: 'non-specific terms' },
  ];

  vaguePatterns.forEach(({ pattern, phrase }) => {
    if (pattern.test(description) && description.length < 100) {
      vaguePhrases.push(phrase);
    }
  });

  // Build issues from missing requirements
  if (missingRequirements.length > 0) {
    issues.push({
      field: 'nc_description',
      message: `Description incomplete. Please add: ${missingRequirements.join(', ')}.`,
      severity: 'warning',
      brcgsReference: 'BRCGS 5.7.2',
    });
  }

  // Build issues from vague phrases
  if (vaguePhrases.length > 0) {
    issues.push({
      field: 'nc_description',
      message: `Description contains vague language (${vaguePhrases.join(', ')}). Please be more specific with details, measurements, and quantities.`,
      severity: 'warning',
      exampleFix: 'Instead of "bad product", describe what was wrong: "Seal integrity failure - side seal temperature 5°C below specification"',
    });
  }

  // Special requirement for incidents: must include time
  if (ncType === 'incident' && !requiredElements.when.test(description)) {
    issues.push({
      field: 'nc_description',
      message: 'Incident descriptions must include the time of occurrence (e.g., "at 14:30" or "on 10-Oct at 15:00").',
      severity: 'error',
      brcgsReference: 'BRCGS 5.7 Section 2.1',
    });
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    missingRequirements,
    vaguePhrases,
  };
}

/**
 * Validate root cause analysis depth (5-Why method)
 */
export function validateRootCauseDepth(analysis: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const missingRequirements: string[] = [];

  if (!analysis || analysis.trim().length === 0) {
    return {
      valid: true, // Optional field
      issues: [],
      missingRequirements: [],
      vaguePhrases: [],
    };
  }

  const trimmed = analysis.trim();

  // Count "why" questions/statements
  const whyPattern = /\b(why|because|due to|caused by|result of|reason)\b/gi;
  const whyMatches = trimmed.match(whyPattern);
  const whyCount = whyMatches ? whyMatches.length : 0;

  // Check for shallow responses
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const isShallow = sentences.length <= 1 && whyCount < 2;

  // Check for generic statements
  const genericPatterns = [
    /\b(operator error|human error|mistake|fault|blame)\b/i,
    /\b(machine (issue|problem|broken|failure))\b/i,
    /\b(bad|wrong|incorrect|defective)\b/i,
  ];
  const isGeneric = genericPatterns.some((pattern) => pattern.test(trimmed)) && whyCount < 3;

  if (isShallow) {
    issues.push({
      field: 'root_cause_analysis',
      message:
        'Root cause analysis is too shallow. Use the 5-Why method: Why did this happen? → [cause]. Why? → [deeper cause]. Why? → [root cause].',
      severity: 'error',
      brcgsReference: 'BRCGS 5.7 Section 4',
      exampleFix:
        'Example: "Why did delamination occur? → Adhesive temperature too low. Why? → Heater malfunction. Why? → Sensor drift. Why? → Calibration overdue by 3 weeks."',
    });
    missingRequirements.push('multiple layers of "why" analysis');
  } else if (isGeneric) {
    issues.push({
      field: 'root_cause_analysis',
      message:
        'Root cause analysis is too generic. Please be more specific. Instead of "operator error", explain: Why did the operator make the error? Was training adequate? Was the procedure clear?',
      severity: 'error',
      exampleFix:
        'Instead of "operator error", use: "Operator did not follow first-off checklist → Checklist not visibly posted at machine → Housekeeping procedure does not include checklist positioning verification"',
    });
    missingRequirements.push('specific root cause identification');
  } else if (whyCount < 3 && trimmed.length > 50) {
    issues.push({
      field: 'root_cause_analysis',
      message: 'Root cause analysis needs more depth. Please add at least one more "why" layer to identify the underlying cause.',
      severity: 'warning',
    });
    missingRequirements.push('additional "why" layers');
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    missingRequirements,
    vaguePhrases: [],
  };
}

/**
 * Validate corrective action specificity
 */
export function validateCorrectiveActionSpecificity(action: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const missingRequirements: string[] = [];

  if (!action || action.trim().length === 0) {
    return {
      valid: true, // Optional field
      issues: [],
      missingRequirements: [],
      vaguePhrases: [],
    };
  }

  const trimmed = action.trim();

  // Check for at least 2 specific actions
  const actionVerbPattern = /\b(will|must|shall|implement|add|update|verify|check|train|calibrate|replace|install|modify|create|establish|conduct|perform|review)\b/gi;
  const actionMatches = trimmed.match(actionVerbPattern);
  const actionCount = actionMatches ? actionMatches.length : 0;

  if (actionCount < 2) {
    issues.push({
      field: 'corrective_action',
      message: 'Include at least 2 specific actions (e.g., "1) Calibrate all sensors immediately. 2) Update maintenance schedule.")',
      severity: 'warning',
      exampleFix: 'Example: "1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6."',
    });
    missingRequirements.push('multiple specific actions');
  }

  // Check for procedure references
  const procedurePattern = /\b(SOP|BRCGS|procedure|section|5\.\d+|3\.\d+|2\.\d+|5\.7|5\.3|5\.6)\b/gi;
  const hasProcedureRef = procedurePattern.test(trimmed);

  if (!hasProcedureRef) {
    issues.push({
      field: 'corrective_action',
      message: 'Reference relevant procedures (e.g., "as per SOP 5.7" or "BRCGS Section 5.3")',
      severity: 'warning',
      brcgsReference: 'BRCGS 5.7 Section 5',
      exampleFix: 'Example: "Update maintenance schedule per BRCGS 5.6 Calibration Procedure"',
    });
    missingRequirements.push('procedure reference');
  }

  // Check for verification method
  const verificationPattern = /\b(verify|check|confirm|validate|monitor|review|audit|inspect|test)\b/gi;
  const hasVerification = verificationPattern.test(trimmed);

  if (!hasVerification) {
    issues.push({
      field: 'corrective_action',
      message: 'Include a verification method (e.g., "QA will verify on next batch" or "Maintenance will check weekly")',
      severity: 'warning',
      exampleFix: 'Example: "QA will verify effectiveness on next batch (due 10-Oct)"',
    });
    missingRequirements.push('verification method');
  }

  // Check for timeline
  const timelinePattern = /\b(within|by|due|deadline|target|schedule|next|weekly|monthly|daily|immediately|within \d+ days?|by \d{1,2}-\w{3})\b/gi;
  const hasTimeline = timelinePattern.test(trimmed);

  if (!hasTimeline) {
    issues.push({
      field: 'corrective_action',
      message: 'Include a timeline for verification (e.g., "due 10-Oct" or "within 5 days")',
      severity: 'warning',
      exampleFix: 'Example: "QA will verify on next batch (due 10-Oct)"',
    });
    missingRequirements.push('verification timeline');
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    missingRequirements,
    vaguePhrases: [],
  };
}

/**
 * Detect vague language in text
 */
export function detectVagueLanguage(text: string): string[] {
  const vaguePhrases: string[] = [];

  const vaguePatterns = [
    { pattern: /\b(bad|broken|wrong|issue|problem|defective)\b/i, phrase: 'vague descriptors' },
    { pattern: /\b(some|few|many|several|a lot|a bit)\b/i, phrase: 'unspecific quantities' },
    { pattern: /\b(thing|stuff|something|anything|whatever)\b/i, phrase: 'non-specific terms' },
    { pattern: /\b(kind of|sort of|maybe|perhaps|probably)\b/i, phrase: 'uncertain language' },
  ];

  vaguePatterns.forEach(({ pattern, phrase }) => {
    if (pattern.test(text)) {
      vaguePhrases.push(phrase);
    }
  });

  return vaguePhrases;
}

/**
 * Require specific details based on field and context
 */
export function requireSpecificDetails(field: string, context: Partial<NCA>): string[] {
  const missing: string[] = [];

  if (field === 'nc_description') {
    const description = context.nc_description || '';
    const ncType = context.nc_type || 'other';

    // Check for time requirement (incidents)
    if (ncType === 'incident' && !/\d{1,2}:\d{2}/.test(description)) {
      missing.push('time of occurrence');
    }

    // Check for batch numbers (finished goods, raw material)
    if (['finished-goods', 'raw-material'].includes(ncType) && !/\b(batch|carton|reel|box|lot|B-|C-|R-)/i.test(description)) {
      missing.push('batch/carton numbers');
    }

    // Check for quantity
    if (!/\b(\d+|approximately|about|around)\b/i.test(description)) {
      missing.push('quantity affected');
    }
  }

  if (field === 'root_cause_analysis') {
    const analysis = context.root_cause_analysis || '';
    if (analysis.length > 0 && !/\b(why|because|due to|caused by)\b/gi.test(analysis)) {
      missing.push('5-Why analysis depth');
    }
  }

  if (field === 'corrective_action') {
    const action = context.corrective_action || '';
    if (action.length > 0) {
      if (!/\b(SOP|BRCGS|procedure|section|5\.\d+|3\.\d+)\b/gi.test(action)) {
        missing.push('procedure reference');
      }
      if (!/\b(verify|check|confirm|validate)\b/gi.test(action)) {
        missing.push('verification method');
      }
      if (!/\b(within|by|due|deadline|target)\b/gi.test(action)) {
        missing.push('verification timeline');
      }
    }
  }

  return missing;
}

