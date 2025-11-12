/**
 * MJC Form Validation Schema
 * Production-ready Zod schema with BRCGS compliance
 */

import { z } from 'zod';
import { signatureSchema } from './shared-schemas';
import {
  MAINTENANCE_CATEGORY,
  MAINTENANCE_TYPE,
  MACHINE_STATUS,
  URGENCY_LEVEL,
  VALIDATION,
  getConstValues
} from '@/lib/config';

/**
 * Hygiene checklist item schema
 * All 10 items must be verified before clearance
 */
export const hygieneChecklistItemSchema = z.object({
  item: z.string(),
  verified: z.boolean(),
  notes: z.string().optional(),
});

/**
 * Main MJC Form Schema
 * Implements all validation rules as per requirements
 */
export const mjcFormSchema = z
  .object({
    // Section 1: Job Card Identification (auto-generated, read-only)
    date: z.string().optional(),
    time: z.string().optional(),
    job_card_number: z.string().optional(),
    raised_by: z.string().optional(),
    department: z.string().optional(),
    wo_number: z.string().optional(),
    wo_id: z.string().uuid().nullable().optional(), // Work Order ID for linking
    wo_status: z.string().optional(),

    // Section 2: Machine/Equipment Identification (REQUIRED)
    machine_equipment_id: z
      .string()
      .min(1, 'Machine/Equipment ID is required')
      .max(VALIDATION.MJC_MACHINE_ID_MAX, `Machine/Equipment ID cannot exceed ${VALIDATION.MJC_MACHINE_ID_MAX} characters`),

    // Section 3: Maintenance Type & Classification (REQUIRED)
    maintenance_category: z.enum(getConstValues(MAINTENANCE_CATEGORY) as [string, ...string[]], {
      message: 'Maintenance category must be selected',
    }),
    maintenance_type: z.enum(getConstValues(MAINTENANCE_TYPE) as [string, ...string[]], {
      message: 'Maintenance type must be selected',
    }),
    maintenance_type_other: z.string().optional(),

    // Section 4: Machine Status & Urgency (REQUIRED, no default)
    machine_status: z.enum([MACHINE_STATUS.DOWN, MACHINE_STATUS.OPERATIONAL] as [string, ...string[]], {
      message: 'Machine status must be explicitly selected',
    }),
    urgency_level: z.enum(getConstValues(URGENCY_LEVEL) as [string, ...string[]], {
      message: 'Urgency level is required',
    }),
    machine_down_time: z.string().nullable().optional(),

    // Section 5: Temporary Repair Status (REQUIRED)
    temporary_repair: z.enum(['yes', 'no'], {
      message: 'Temporary repair status must be selected',
    }),
    due_date: z.string().nullable().optional(),

    // Section 6: Description of Maintenance Required (REQUIRED, minimum 100 characters)
    maintenance_description: z
      .string()
      .min(VALIDATION.MJC_DESCRIPTION_MIN, `Description must be at least ${VALIDATION.MJC_DESCRIPTION_MIN} characters for BRCGS compliance`)
      .max(VALIDATION.MJC_DESCRIPTION_MAX, `Description cannot exceed ${VALIDATION.MJC_DESCRIPTION_MAX} characters`),
    maintenance_description_attachments: z.any().optional(),

    // Section 7: Maintenance Performed
    maintenance_performed: z.string().optional(),
    maintenance_technician_signature: signatureSchema.nullable().optional(),

    // Section 8: Additional Comments
    additional_comments: z.string().optional(),

    // Section 9: Post Hygiene Clearance Record (CRITICAL - 10 items)
    hygiene_check_1: z.boolean().default(false),
    hygiene_check_2: z.boolean().default(false),
    hygiene_check_3: z.boolean().default(false),
    hygiene_check_4: z.boolean().default(false),
    hygiene_check_5: z.boolean().default(false),
    hygiene_check_6: z.boolean().default(false),
    hygiene_check_7: z.boolean().default(false),
    hygiene_check_8: z.boolean().default(false),
    hygiene_check_9: z.boolean().default(false),
    hygiene_check_10: z.boolean().default(false),

    // Section 10: Post Hygiene Clearance Signature
    clearance_qa_supervisor: z.string().optional(),
    clearance_signature: signatureSchema.nullable().optional(),
    production_cleared: z.boolean().default(false),

    // Section 11: Job Card Status & Closure
    job_card_status: z.string().optional(),
    follow_up_job_card: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional validation: If machine is down, machine_down_time auto-calculated
    if (data.machine_status === MACHINE_STATUS.DOWN) {
      if (!data.machine_down_time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Machine down time must be calculated when machine is down',
          path: ['machine_down_time'],
        });
      }
    }

    // Conditional validation: If temporary repair is YES, due_date auto-calculated (Today + 14 days)
    if (data.temporary_repair === 'yes') {
      if (!data.due_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Due date must be calculated when temporary repair is selected',
          path: ['due_date'],
        });
      }
    }

    // Conditional validation: If maintenance type is "other", additional details required
    if (data.maintenance_type === MAINTENANCE_TYPE.OTHER) {
      if (!data.maintenance_type_other || data.maintenance_type_other.trim().length < VALIDATION.MJC_TYPE_OTHER_MIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please specify the maintenance type (minimum ${VALIDATION.MJC_TYPE_OTHER_MIN} characters)`,
          path: ['maintenance_type_other'],
        });
      }
    }

    // CRITICAL: All 10 hygiene items must be checked before granting clearance
    const allHygieneItemsChecked =
      data.hygiene_check_1 &&
      data.hygiene_check_2 &&
      data.hygiene_check_3 &&
      data.hygiene_check_4 &&
      data.hygiene_check_5 &&
      data.hygiene_check_6 &&
      data.hygiene_check_7 &&
      data.hygiene_check_8 &&
      data.hygiene_check_9 &&
      data.hygiene_check_10;

    // If production_cleared is checked, all hygiene items must be verified
    if (data.production_cleared && !allHygieneItemsChecked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'All 10 hygiene items must be verified before granting clearance',
        path: ['production_cleared'],
      });
    }

    // If production clearance is granted, signature is required
    if (data.production_cleared) {
      if (!data.clearance_signature?.data || data.clearance_signature.data.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Digital signature is required when granting production clearance',
          path: ['clearance_signature'],
        });
      }
      if (!data.clearance_qa_supervisor || data.clearance_qa_supervisor.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'QA/Supervisor name is required when granting production clearance',
          path: ['clearance_qa_supervisor'],
        });
      }
    }
  });

export type MJCFormData = z.infer<typeof mjcFormSchema>;
