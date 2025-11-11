/**
 * NCA Form Validation Schema
 * Production-ready Zod schema with BRCGS compliance
 */

import { z } from 'zod';

/**
 * Signature validation schema
 * Enforces complete signature data structure
 */
export const signatureSchema = z.object({
  type: z.enum(['manual', 'digital']),
  data: z.string().min(1, 'Signature data is required'),
  name: z.string().min(1, 'Signer name is required'),
  timestamp: z.string().min(1, 'Timestamp is required'),
});

/**
 * Main NCA Form Schema
 * Implements all validation rules as per requirements
 */
export const ncaFormSchema = z
  .object({
    // Section 1: NCA Identification (auto-generated, read-only)
    date: z.string().optional(),
    nca_number: z.string().optional(),
    raised_by: z.string().optional(),
    wo_number: z.string().optional(),
    wo_id: z.string().uuid().nullable().optional(), // Work Order ID for linking

    // Section 2: NC Classification (REQUIRED)
    nc_type: z.enum(['raw-material', 'finished-goods', 'wip', 'incident', 'other'], {
      message: 'Please select a non-conformance type',
    }),
    nc_type_other: z.string().optional(),

    // Section 3: Supplier & Product Information
    supplier_name: z.string().optional(),
    nc_product_description: z
      .string()
      .min(10, 'Product description must be at least 10 characters')
      .max(500, 'Product description cannot exceed 500 characters'),
    supplier_wo_batch: z.string().optional(),
    supplier_reel_box: z.string().optional(),
    sample_available: z.boolean().default(false),
    quantity: z.number().nullable().optional(),
    quantity_unit: z.enum(['kg', 'units', 'meters', 'boxes', 'pallets']).nullable().optional(),
    carton_numbers: z.string().optional(),

    // Section 4: NC Description (REQUIRED, dynamic minimum based on NC type)
    // Minimum lengths enforced in superRefine based on nc_type
    nc_description: z
      .string()
      .min(100, 'Description must be at least 100 characters for compliance')
      .max(2000, 'Description cannot exceed 2000 characters'),

    // Section 5: Machine Status (REQUIRED, no default allowed)
    machine_status: z.enum(['down', 'operational'], {
      message: 'Machine status must be explicitly selected',
    }),
    machine_down_since: z.string().nullable().optional(),
    estimated_downtime: z.number().nullable().optional(),

    // Section 6: Out of Spec Concession
    concession_team_leader: z.string().optional(),
    concession_signature: signatureSchema.nullable().optional(),
    concession_notes: z.string().optional(),

    // Section 7: Immediate Correction
    cross_contamination: z.boolean().default(false),
    back_tracking_person: z.string().optional(),
    back_tracking_signature: signatureSchema.nullable().optional(),
    back_tracking_completed: z.boolean().default(false),
    hold_label_completed: z.boolean().default(false),
    nca_logged: z.boolean().default(false),
    segregation_area: z.enum(['raw-materials', 'wip', 'finished-goods', 'other']).nullable().optional(),
    segregation_area_other: z.string().optional(),
    relocation_notes: z.string().optional(),

    // Section 8: Disposition
    disposition_action: z
      .enum(['reject', 'credit', 'uplift', 'rework', 'concession', 'discard'])
      .optional(),
    rework_instruction: z.string().optional(),
    disposition_authorized_by: z.string().optional(),
    disposition_signature: signatureSchema.nullable().optional(),

    // Section 9: Root Cause Analysis
    // Depth validation enforced in superRefine (5-Why method)
    root_cause_analysis: z.string().optional(),

    // Section 10: Corrective Action
    // Specificity validation enforced in superRefine (procedure references, verification)
    corrective_action: z.string().optional(),

    // Section 11: Close Out
    close_out_by: z.string().optional(),
    close_out_signature: signatureSchema.nullable().optional(),
    close_out_date: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional validation: If machine is down, timestamp is required
    if (data.machine_status === 'down') {
      if (!data.machine_down_since) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Machine down since timestamp is required when machine is down',
          path: ['machine_down_since'],
        });
      }
      if (!data.estimated_downtime || data.estimated_downtime <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Estimated downtime is required when machine is down',
          path: ['estimated_downtime'],
        });
      }
    }

    // Conditional validation: If cross-contamination is YES, back tracking person required
    if (data.cross_contamination) {
      if (!data.back_tracking_person || data.back_tracking_person.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Back tracking person is required when cross-contamination is detected',
          path: ['back_tracking_person'],
        });
      }
    }

    // Conditional validation: If disposition is rework, instruction required
    if (data.disposition_action === 'rework') {
      if (!data.rework_instruction || data.rework_instruction.trim().length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rework instruction must be at least 20 characters when rework is selected',
          path: ['rework_instruction'],
        });
      }
    }

    // Progressive Quality Requirements: NC Description - Dynamic minimum based on NC type
    if (data.nc_description && data.nc_type) {
      const minLengths: Record<string, number> = {
        'raw-material': 120,
        'finished-goods': 150,
        'wip': 130,
        'incident': 200,
        'other': 100,
      };

      const requiredMin = minLengths[data.nc_type] || 100;
      if (data.nc_description.length < requiredMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Description must be at least ${requiredMin} characters for ${data.nc_type.replace('-', ' ')} non-conformances. Please include: what happened, when, where, quantity affected, batch/carton numbers, and immediate actions taken.`,
          path: ['nc_description'],
        });
      }
    }

    // Progressive Quality Requirements: Root Cause Analysis - 5-Why depth enforcement
    if (data.root_cause_analysis && data.root_cause_analysis.trim().length > 0) {
      const analysis = data.root_cause_analysis.trim();

      // Count "why" questions/statements (case-insensitive)
      const whyPattern = /\b(why|because|due to|caused by|result of)\b/gi;
      const whyMatches = analysis.match(whyPattern);
      const whyCount = whyMatches ? whyMatches.length : 0;

      // Check for shallow responses (single sentence, no depth)
      const sentences = analysis.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const isShallow = sentences.length <= 1 && whyCount < 2;

      // Check for generic statements
      const genericPatterns = [
        /\b(operator error|human error|mistake|fault)\b/i,
        /\b(machine (issue|problem|broken|failure))\b/i,
        /\b(bad|wrong|incorrect)\b/i,
      ];
      const isGeneric = genericPatterns.some((pattern) => pattern.test(analysis)) && whyCount < 3;

      if (isShallow) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Root cause analysis is too shallow. Use the 5-Why method: Why did this happen? → [cause]. Why? → [deeper cause]. Why? → [root cause]. Aim for at least 3 layers of analysis.',
          path: ['root_cause_analysis'],
        });
      } else if (isGeneric && whyCount < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Root cause analysis is too generic. Please be more specific. Instead of "operator error", explain: Why did the operator make the error? Was training adequate? Was the procedure clear? Continue asking "why" until you identify the true root cause.',
          path: ['root_cause_analysis'],
        });
      } else if (whyCount < 3 && analysis.length > 50) {
        // Only warn if there's substantial content but insufficient depth
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Root cause analysis needs more depth. Please add at least one more "why" layer to identify the underlying cause.',
          path: ['root_cause_analysis'],
        });
      }
    }

    // Progressive Quality Requirements: Corrective Action - Specificity enforcement
    if (data.corrective_action && data.corrective_action.trim().length > 0) {
      const action = data.corrective_action.trim();
      const issues: string[] = [];

      // Check for at least 2 specific actions (numbered lists, bullet points, or multiple sentences with action verbs)
      const actionVerbPattern = /\b(will|must|shall|implement|add|update|verify|check|train|calibrate|replace|install|modify|create|establish)\b/gi;
      const actionMatches = action.match(actionVerbPattern);
      const actionCount = actionMatches ? actionMatches.length : 0;

      if (actionCount < 2) {
        issues.push('Include at least 2 specific actions (e.g., "1) Calibrate sensors. 2) Update procedure.")');
      }

      // Check for procedure references (SOP, BRCGS sections like 5.7, 5.3, etc.)
      const procedurePattern = /\b(SOP|BRCGS|procedure|section|5\.\d+|3\.\d+|2\.\d+)\b/gi;
      const hasProcedureRef = procedurePattern.test(action);

      if (!hasProcedureRef) {
        issues.push('Reference relevant procedures (e.g., "as per SOP 5.7" or "BRCGS Section 5.3")');
      }

      // Check for verification method with timeline
      const verificationPattern = /\b(verify|check|confirm|validate|monitor|review|audit)\b/gi;
      const timelinePattern = /\b(within|by|due|deadline|target|schedule|next|weekly|monthly|daily)\b/gi;
      const hasVerification = verificationPattern.test(action);
      const hasTimeline = timelinePattern.test(action);

      if (!hasVerification) {
        issues.push('Include a verification method (e.g., "QA will verify on next batch")');
      }
      if (!hasTimeline) {
        issues.push('Include a timeline for verification (e.g., "due 10-Oct" or "within 5 days")');
      }

      if (issues.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Corrective action needs more detail: ${issues.join(' ')}`,
          path: ['corrective_action'],
        });
      }
    }
  });

export type NCAFormData = z.infer<typeof ncaFormSchema>;
