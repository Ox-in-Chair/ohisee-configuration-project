/**
 * Default Values for Forms and Operations
 * Centralized default values to ensure consistency across the application
 *
 * Usage: Import specific defaults instead of inline default values
 * Example: import { NCA_DEFAULTS, MJC_DEFAULTS } from '@/lib/config/defaults'
 */

import {
  NCA_STATUS,
  MJC_STATUS,
  URGENCY_LEVEL,
  MAINTENANCE_CATEGORY,
  BRCGS_PROCEDURES,
} from './constants';

// ============================================================================
// NCA FORM DEFAULTS
// ============================================================================

export const NCA_DEFAULTS = {
  // Status
  status: NCA_STATUS.SUBMITTED,

  // Classification
  nc_origin: null, // Derived from nc_type in form logic
  nc_type_other: '',

  // Procedure References (auto-populated on creation)
  procedure_reference: BRCGS_PROCEDURES.NCA_PROCEDURE,
  procedure_revision: BRCGS_PROCEDURES.NCA_REVISION,

  // Product Information
  supplier_name: '',
  nc_product_description: '',
  supplier_wo_batch: '',
  supplier_reel_box: '',
  sample_available: false,
  quantity: null,
  quantity_unit: null,
  carton_numbers: '',

  // Descriptions
  nc_description: '',

  // Machine Status (no default - must be explicitly selected)
  machine_status: undefined,
  machine_down_since: null,
  estimated_downtime: null,

  // Concession
  concession_team_leader: '',
  concession_signature: null,
  concession_notes: '',

  // Immediate Correction
  cross_contamination: false,
  back_tracking_person: '',
  back_tracking_signature: null,
  back_tracking_completed: false,
  hold_label_completed: false,
  nca_logged: false,
  segregation_area: null,
  segregation_area_other: '',
  relocation_notes: '',

  // Disposition
  disposition_action: undefined, // No default - must be explicitly selected
  rework_instruction: '',
  disposition_authorized_by: '',
  disposition_signature: null,

  // Root Cause & Corrective Action
  root_cause_analysis: '',
  corrective_action: '',

  // Close Out
  close_out_by: '',
  close_out_signature: null,
  close_out_date: null,

  // Confidential
  confidential: false,
} as const;

// ============================================================================
// MJC FORM DEFAULTS
// ============================================================================

export const MJC_DEFAULTS = {
  // Status
  status: MJC_STATUS.OPEN,

  // Machine/Equipment
  machine_equipment_id: '',

  // Maintenance Classification
  maintenance_category: MAINTENANCE_CATEGORY.REACTIVE, // Default to reactive
  maintenance_type: undefined, // Must be explicitly selected
  maintenance_type_other: '',

  // Machine Status (no default - must be explicitly selected)
  machine_status: undefined,
  urgency_level: URGENCY_LEVEL.MEDIUM, // Default to medium
  machine_down_time: null,

  // Temporary Repair (no default - must be explicitly selected)
  temporary_repair: undefined,
  due_date: null,

  // Description
  maintenance_description: '',
  maintenance_description_attachments: null,

  // Maintenance Performed
  maintenance_performed: '',
  maintenance_technician_signature: null,

  // Additional Comments
  additional_comments: '',

  // Hygiene Checklist (all default to false - must be explicitly checked)
  hygiene_check_1: false,
  hygiene_check_2: false,
  hygiene_check_3: false,
  hygiene_check_4: false,
  hygiene_check_5: false,
  hygiene_check_6: false,
  hygiene_check_7: false,
  hygiene_check_8: false,
  hygiene_check_9: false,
  hygiene_check_10: false,

  // Clearance
  clearance_qa_supervisor: '',
  clearance_signature: null,
  production_cleared: false,

  // Job Card Status
  job_card_status: MJC_STATUS.OPEN,
  follow_up_job_card: '',
} as const;

// ============================================================================
// SIGNATURE DEFAULTS
// ============================================================================

export const SIGNATURE_DEFAULTS = {
  type: 'digital' as const,
  data: '',
  name: '',
  timestamp: new Date().toISOString(),
} as const;

// ============================================================================
// WORK ORDER DEFAULTS
// ============================================================================

export const WORK_ORDER_DEFAULTS = {
  status: 'pending' as const,
  wo_number: '',
  product_name: '',
  quantity: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: null,
} as const;

// ============================================================================
// DASHBOARD FILTER DEFAULTS
// ============================================================================

export const DASHBOARD_FILTER_DEFAULTS = {
  // Date Range
  startDate: null,
  endDate: null,

  // Status Filters
  includeOpen: true,
  includeInProgress: true,
  includeClosed: false,
  includeCancelled: false,

  // Machine Filter
  machineId: null,

  // Work Order Filter
  woId: null as string | null,

  // Search Query
  searchQuery: '',

  // Pagination
  page: 1,
  pageSize: 25,

  // Sort
  sortBy: 'created_at' as const,
  sortOrder: 'desc' as const,
} as const;

// ============================================================================
// QUALITY SCORING DEFAULTS
// ============================================================================

export const QUALITY_SCORE_DEFAULTS = {
  overall_score: 0,
  description_quality: 0,
  completeness_score: 0,
  detail_score: 0,
  clarity_score: 0,
  compliance_score: 0,
  confidence_level: 'low' as const,
} as const;

// ============================================================================
// AI SUGGESTION DEFAULTS
// ============================================================================

export const AI_SUGGESTION_DEFAULTS = {
  accepted: false,
  modified: false,
  original_content: '',
  suggested_content: '',
  final_content: '',
  confidence_score: 0,
} as const;

// ============================================================================
// NOTIFICATION DEFAULTS
// ============================================================================

export const NOTIFICATION_DEFAULTS = {
  read: false,
  sent_at: new Date().toISOString(),
  read_at: null as string | null,
  notification_type: 'info' as const,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get current time in HH:MM:SS format
 */
export function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

/**
 * Calculate due date for temporary repairs (Today + 14 days)
 */
export function calculateTemporaryRepairDueDate(): string {
  const today = new Date();
  today.setDate(today.getDate() + 14);
  return today.toISOString().split('T')[0]!;
}

/**
 * Calculate NCA closure deadline (Today + 20 working days)
 */
export function calculateNCAClosureDeadline(): string {
  const today = new Date();
  today.setDate(today.getDate() + 20);
  return today.toISOString().split('T')[0]!;
}

/**
 * Merge defaults with partial data
 */
export function mergeWithDefaults<T extends Record<string, unknown>>(
  defaults: T,
  data: Partial<T>
): T {
  return { ...defaults, ...data };
}
