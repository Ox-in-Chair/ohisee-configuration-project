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

    // Section 4: NC Description (REQUIRED, minimum 100 characters)
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

    // Section 8: Disposition
    disposition_action: z
      .enum(['reject', 'credit', 'uplift', 'rework', 'concession', 'discard'])
      .optional(),
    rework_instruction: z.string().optional(),
    disposition_authorized_by: z.string().optional(),
    disposition_signature: signatureSchema.nullable().optional(),

    // Section 9: Root Cause Analysis
    root_cause_analysis: z.string().optional(),

    // Section 10: Corrective Action
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
  });

export type NCAFormData = z.infer<typeof ncaFormSchema>;
