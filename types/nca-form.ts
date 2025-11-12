/**
 * NCA Form TypeScript Types
 * Type-safe form state and validation types
 */

import type { NCType, QuantityUnit } from './database';

/**
 * Signature structure for form handling
 */
export interface FormSignature {
  type: 'manual' | 'digital';
  data: string;
  name: string;
  timestamp: string;
}

/**
 * NCA Form Data Structure
 * Maps to react-hook-form state
 */
export interface NCAFormData {
  // Section 1: NCA Identification (auto-generated)
  date?: string;
  nca_number?: string;
  raised_by?: string;
  wo_number?: string;

  // Section 2: NC Classification
  nc_type: NCType;
  nc_type_other?: string;
  nc_origin?: 'supplier-based' | 'kangopak-based' | 'joint-investigation';
  
  // Procedure Reference (auto-populated, locked on creation)
  procedure_reference?: string;
  procedure_revision?: string;
  procedure_revision_date?: string;

  // Section 3: Supplier & Product Information
  supplier_name?: string;
  nc_product_description: string;
  supplier_wo_batch?: string;
  supplier_reel_box?: string;
  sample_available: boolean;
  quantity?: number | null;
  quantity_unit?: QuantityUnit | null;
  carton_numbers?: string;

  // Section 4: NC Description
  nc_description: string;

  // Section 5: Machine Status (CRITICAL)
  machine_status: 'down' | 'operational';
  machine_down_since?: string | null;
  estimated_downtime?: number | null;

  // Section 6: Out of Spec Concession
  concession_team_leader?: string;
  concession_signature?: FormSignature | null;
  concession_notes?: string;

  // Section 7: Immediate Correction
  cross_contamination: boolean;
  back_tracking_person?: string;
  back_tracking_signature?: FormSignature | null;
  back_tracking_completed: boolean;
  hold_label_completed: boolean;
  nca_logged: boolean;
  segregation_area?: 'area-a' | 'area-b' | 'labeled' | 'other' | null;
  segregation_area_other?: string;

  // Section 8: Disposition
  disposition_action?: 'reject' | 'credit' | 'uplift' | 'rework' | 'concession' | 'discard';
  rework_instruction?: string;
  disposition_authorized_by?: string;
  disposition_signature?: FormSignature | null;

  // Section 9: Root Cause Analysis
  root_cause_analysis?: string;

  // Section 10: Corrective Action
  corrective_action?: string;

  // Section 11: Close Out
  close_out_by?: string;
  close_out_signature?: FormSignature | null;
  close_out_date?: string;
}

/**
 * Character counter display state
 */
export interface CharacterCounterState {
  current: number;
  minimum: number;
  maximum?: number;
  status: 'error' | 'warning' | 'success';
}

/**
 * Form submission state
 */
export interface FormSubmissionState {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}
