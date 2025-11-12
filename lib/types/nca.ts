/**
 * NCA (Non-Conformance Advice) Type Definitions
 * All types strictly typed for TypeScript strict mode
 * Exported for reusability across Server Components, Client Components, and Server Actions
 */

// ============================================================================
// Core NCA Types
// ============================================================================

/**
 * NCA status workflow states
 */
export type NCAStatus = 'draft' | 'submitted' | 'under-review' | 'closed';

/**
 * Non-conformance classification types
 */
export type NCType = 'raw-material' | 'finished-goods' | 'wip' | 'incident' | 'other';

/**
 * Machine operational status
 */
export type MachineStatus = 'down' | 'operational';

/**
 * Quantity units for products
 */
export type QuantityUnit = 'kg' | 'units' | 'meters' | 'boxes' | 'pallets';

/**
 * Digital signature structure
 */
export interface DigitalSignature {
  readonly type: 'login' | 'canvas';
  readonly name: string;
  readonly timestamp: string;
  readonly ip: string;
  readonly data?: string; // Canvas signature data (base64) if type is 'canvas'
}

/**
 * File attachment metadata
 */
export interface FileAttachment {
  readonly filename: string;
  readonly url: string;
  readonly size: number;
  readonly type: string;
  readonly uploadedAt: string;
}

// ============================================================================
// Complete NCA Record (Database Schema)
// ============================================================================

/**
 * Complete NCA record as stored in database
 * Matches supabase/migrations/20251106101900_ncas_table.sql
 */
export interface NCA {
  // Primary key and identifiers
  readonly id: string;
  readonly nca_number: string;

  // Foreign keys
  readonly wo_id: string | null;
  readonly raised_by_user_id: string;
  readonly created_by: string;

  // Section 1: NCA Identification
  readonly date: string; // TIMESTAMPTZ
  readonly time: string;

  // Section 2: NC Classification
  readonly nc_type: NCType;
  readonly nc_type_other: string | null;
  readonly nc_origin: 'supplier-based' | 'kangopak-based' | 'joint-investigation' | null;
  
  // Procedure Reference (locked on creation)
  readonly procedure_reference: string | null;
  readonly procedure_revision: string | null;
  readonly procedure_revision_date: string | null;

  // Section 3: Supplier & Product Information
  readonly supplier_name: string | null;
  readonly nc_product_description: string;
  readonly supplier_wo_batch: string | null;
  readonly supplier_reel_box: string | null;
  readonly sample_available: boolean;
  readonly quantity: number | null;
  readonly quantity_unit: QuantityUnit | null;
  readonly carton_numbers: string | null;

  // Section 4: NC Description
  readonly nc_description: string;

  // Section 5: Machine Status (CRITICAL)
  readonly machine_status: MachineStatus;
  readonly machine_down_since: string | null; // TIMESTAMPTZ
  readonly estimated_downtime: number | null; // minutes

  // Section 6: Out of Spec Concession
  readonly concession_team_leader: string | null;
  readonly concession_signature: DigitalSignature | null;
  readonly concession_notes: string | null;

  // Section 7: Immediate Correction
  readonly cross_contamination: boolean;
  readonly back_tracking_person: string | null;
  readonly back_tracking_signature: DigitalSignature | null;
  readonly back_tracking_completed: boolean;
  readonly hold_label_completed: boolean;
  readonly nca_logged: boolean;

  // Section 8: Disposition
  readonly disposition_reject: boolean;
  readonly disposition_credit: boolean;
  readonly disposition_uplift: boolean;
  readonly disposition_rework: boolean;
  readonly disposition_concession: boolean;
  readonly disposition_discard: boolean;
  readonly rework_instruction: string | null;
  readonly disposition_authorized_by: string | null;
  readonly disposition_signature: DigitalSignature | null;

  // Section 9: Root Cause Analysis
  readonly root_cause_analysis: string | null;
  readonly root_cause_attachments: ReadonlyArray<FileAttachment> | null;

  // Section 10: Corrective Action
  readonly corrective_action: string | null;
  readonly corrective_action_attachments: ReadonlyArray<FileAttachment> | null;

  // Section 11: Close Out
  readonly close_out_by: string | null;
  readonly close_out_signature: DigitalSignature | null;
  readonly close_out_date: string | null; // DATE

  // System fields
  readonly status: NCAStatus;
  readonly created_at: string; // TIMESTAMPTZ
  readonly updated_at: string; // TIMESTAMPTZ
  readonly submitted_at: string | null; // TIMESTAMPTZ
  readonly closed_at: string | null; // TIMESTAMPTZ
}

// ============================================================================
// NCA Table Display Types
// ============================================================================

/**
 * NCA record for table display (subset of full NCA)
 * Optimized for register table rendering
 */
export interface NCATableRow {
  readonly id: string;
  readonly nca_number: string;
  readonly status: NCAStatus;
  readonly created_at: string;
  readonly machine_status: MachineStatus;
  readonly nc_product_description: string;
  readonly nc_description: string;
  readonly wo_id: string | null;
}

/**
 * Props for NCA Table component
 */
export interface NCATableProps {
  readonly ncas: ReadonlyArray<NCATableRow>;
}

// ============================================================================
// Status Badge Types
// ============================================================================

/**
 * Status display metadata
 */
export interface StatusBadgeProps {
  readonly status: NCAStatus;
  readonly className?: string;
}

/**
 * Status badge configuration
 */
export interface StatusConfig {
  readonly label: string;
  readonly variant: 'default' | 'secondary' | 'destructive' | 'outline';
  readonly className: string;
}

/**
 * Map NCA status to display configuration
 */
export const NCA_STATUS_CONFIG: Record<NCAStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  submitted: {
    label: 'Submitted',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  'under-review': {
    label: 'Under Review',
    variant: 'default',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  closed: {
    label: 'Closed',
    variant: 'outline',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
} as const;

// ============================================================================
// Machine Status Indicator Types
// ============================================================================

/**
 * Machine status display configuration
 */
export interface MachineStatusConfig {
  readonly label: string;
  readonly className: string;
  readonly icon: string;
}

/**
 * Map machine status to display configuration
 */
export const MACHINE_STATUS_CONFIG: Record<MachineStatus, MachineStatusConfig> = {
  down: {
    label: 'Machine Down',
    className: 'text-critical-600 font-semibold',
    icon: 'alert-triangle',
  },
  operational: {
    label: 'Operational',
    className: 'text-success-600',
    icon: 'check-circle',
  },
} as const;

// ============================================================================
// Utility Type Guards
// ============================================================================

/**
 * Type guard: Check if status is NCAStatus
 */
export function isNCAStatus(value: unknown): value is NCAStatus {
  return (
    typeof value === 'string' &&
    ['draft', 'submitted', 'under-review', 'closed'].includes(value)
  );
}

/**
 * Type guard: Check if machine status is valid
 */
export function isMachineStatus(value: unknown): value is MachineStatus {
  return typeof value === 'string' && ['down', 'operational'].includes(value);
}

/**
 * Type guard: Check if NC type is valid
 */
export function isNCType(value: unknown): value is NCType {
  return (
    typeof value === 'string' &&
    ['raw-material', 'finished-goods', 'wip', 'incident', 'other'].includes(value)
  );
}
