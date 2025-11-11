/**
 * OHiSee NCA/MJC System - Database Types
 * Auto-generated from Supabase schema
 * IMPORTANT: All database operations MUST use dependency-injected Supabase client
 * NO STATIC CALLS - Always pass client as parameter
 */

// =============================================================================
// Enums (mirroring database CHECK constraints)
// =============================================================================

export type UserRole =
  | 'operator'
  | 'team-leader'
  | 'maintenance-technician'
  | 'qa-supervisor'
  | 'maintenance-manager'
  | 'operations-manager';

export type Department =
  | 'pouching'
  | 'spouting'
  | 'slitting'
  | 'warehouse'
  | 'maintenance';

export type MachineStatus = 'operational' | 'down' | 'maintenance' | 'decommissioned';

export type WorkOrderStatus = 'active' | 'paused' | 'completed';

export type NCAStatus = 'draft' | 'submitted' | 'under-review' | 'closed';

export type NCType =
  | 'raw-material'
  | 'finished-goods'
  | 'wip'
  | 'incident'
  | 'other';

export type QuantityUnit = 'kg' | 'units' | 'meters' | 'boxes' | 'pallets';

export type SegregationArea = 'raw-materials' | 'wip' | 'finished-goods' | 'other';

export type MJCStatus =
  | 'draft'
  | 'open'
  | 'assigned'
  | 'in-progress'
  | 'awaiting-clearance'
  | 'closed';

export type MaintenanceCategory = 'reactive' | 'planned';

export type MJCUrgency = 'critical' | 'high' | 'medium' | 'low';

export type AuditEntityType = 'nca' | 'mjc' | 'work_order' | 'user' | 'machine';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'submitted'
  | 'assigned'
  | 'closed'
  | 'hygiene_clearance_granted'
  | 'machine_down_reported';

// =============================================================================
// Signature JSONB Structure
// =============================================================================

export interface Signature {
  type: 'login' | 'drawn' | 'uploaded';
  name: string;
  timestamp: string;
  ip: string;
  data?: string; // Base64 for drawn/uploaded signatures
}

// =============================================================================
// File Attachment JSONB Structure
// =============================================================================

export interface FileAttachment {
  filename: string;
  url: string;
  size: number;
  type: string; // MIME type
  uploadedAt: string;
}

// =============================================================================
// Hygiene Checklist JSONB Structure (10 items for BRCGS compliance)
// =============================================================================

export interface HygieneChecklistItem {
  item: string;
  verified: boolean;
  notes?: string;
}

// =============================================================================
// Table: users
// =============================================================================

export interface User {
  id: string; // UUID
  email: string;
  name: string;
  role: UserRole;
  department: Department | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  department?: Department | null;
  active?: boolean;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  role?: UserRole;
  department?: Department | null;
  active?: boolean;
}

// =============================================================================
// Table: machines
// =============================================================================

export interface Machine {
  id: string; // UUID
  machine_code: string;
  machine_name: string;
  department: Department;
  status: MachineStatus;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineInsert {
  id?: string;
  machine_code: string;
  machine_name: string;
  department: Department;
  status?: MachineStatus;
  location?: string | null;
}

export interface MachineUpdate {
  machine_code?: string;
  machine_name?: string;
  department?: Department;
  status?: MachineStatus;
  location?: string | null;
}

// =============================================================================
// Table: work_orders
// =============================================================================

export interface WorkOrder {
  id: string; // UUID
  wo_number: string;
  machine_id: string | null; // UUID FK
  operator_id: string | null; // UUID FK
  start_timestamp: string;
  end_timestamp: string | null;
  status: WorkOrderStatus;
  department: Department;
  product_description: string | null;
  batch_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderInsert {
  id?: string;
  wo_number: string;
  machine_id?: string | null;
  operator_id?: string | null;
  start_timestamp: string;
  end_timestamp?: string | null;
  status?: WorkOrderStatus;
  department: Department;
  product_description?: string | null;
  batch_number?: string | null;
}

export interface WorkOrderUpdate {
  wo_number?: string;
  machine_id?: string | null;
  operator_id?: string | null;
  start_timestamp?: string;
  end_timestamp?: string | null;
  status?: WorkOrderStatus;
  department?: Department;
  product_description?: string | null;
  batch_number?: string | null;
}

// =============================================================================
// Table: ncas (Non-Conformance Advice)
// =============================================================================

export interface NCA {
  id: string; // UUID
  nca_number: string;
  wo_id: string | null; // UUID FK
  raised_by_user_id: string; // UUID FK
  created_by: string; // UUID FK
  date: string;
  time: string;

  // Section 2: Classification
  nc_type: NCType;
  nc_type_other: string | null;

  // Section 3: Supplier & Product
  supplier_name: string | null;
  nc_product_description: string;
  supplier_wo_batch: string | null;
  supplier_reel_box: string | null;
  sample_available: boolean;
  quantity: number | null;
  quantity_unit: QuantityUnit | null;
  carton_numbers: string | null;

  // Section 4: Description
  nc_description: string;

  // Section 5: Machine Status
  machine_status: 'down' | 'operational';
  machine_down_since: string | null;
  estimated_downtime: number | null;

  // Section 6: Concession
  concession_team_leader: string | null;
  concession_signature: Signature | null;
  concession_notes: string | null;

  // Section 7: Immediate Correction
  cross_contamination: boolean;
  back_tracking_person: string | null;
  back_tracking_signature: Signature | null;
  back_tracking_completed: boolean;
  hold_label_completed: boolean;
  nca_logged: boolean;
  segregation_area: string | null;
  segregation_area_other: string | null;
  relocation_notes: string | null; // Notes documenting relocation after disposition

  // Section 8: Disposition
  disposition_reject: boolean;
  disposition_credit: boolean;
  disposition_uplift: boolean;
  disposition_rework: boolean;
  disposition_concession: boolean;
  disposition_discard: boolean;
  rework_instruction: string | null;
  disposition_authorized_by: string | null;
  disposition_signature: Signature | null;

  // Section 9: Root Cause
  root_cause_analysis: string | null;
  root_cause_attachments: FileAttachment[] | null;

  // Section 10: Corrective Action
  corrective_action: string | null;
  corrective_action_attachments: FileAttachment[] | null;

  // Section 11: Close Out
  close_out_by: string | null;
  close_out_signature: Signature | null;
  close_out_date: string | null;

  // System fields
  status: NCAStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
  close_out_due_date: string | null;
  is_overdue: boolean;
}

export interface NCAInsert {
  id?: string;
  nca_number?: string; // Auto-generated
  wo_id?: string | null;
  raised_by_user_id: string;
  created_by: string;
  date?: string;
  time?: string;
  nc_type: NCType;
  nc_type_other?: string | null;
  supplier_name?: string | null;
  nc_product_description: string;
  supplier_wo_batch?: string | null;
  supplier_reel_box?: string | null;
  sample_available?: boolean;
  quantity?: number | null;
  quantity_unit?: QuantityUnit | null;
  carton_numbers?: string | null;
  nc_description: string;
  machine_status: 'down' | 'operational';
  machine_down_since?: string | null;
  estimated_downtime?: number | null;
  concession_team_leader?: string | null;
  concession_signature?: Signature | null;
  concession_notes?: string | null;
  cross_contamination?: boolean;
  back_tracking_person?: string | null;
  back_tracking_signature?: Signature | null;
  back_tracking_completed?: boolean;
  hold_label_completed?: boolean;
  nca_logged?: boolean;
  segregation_area?: string | null;
  segregation_area_other?: string | null;
  relocation_notes?: string | null; // Notes documenting relocation after disposition
  disposition_reject?: boolean;
  disposition_credit?: boolean;
  disposition_uplift?: boolean;
  disposition_rework?: boolean;
  disposition_concession?: boolean;
  disposition_discard?: boolean;
  rework_instruction?: string | null;
  disposition_authorized_by?: string | null;
  disposition_signature?: Signature | null;
  root_cause_analysis?: string | null;
  root_cause_attachments?: FileAttachment[] | null;
  corrective_action?: string | null;
  corrective_action_attachments?: FileAttachment[] | null;
  close_out_by?: string | null;
  close_out_signature?: Signature | null;
  close_out_date?: string | null;
  status?: NCAStatus;
}

export interface NCAUpdate extends Partial<NCAInsert> {}

// =============================================================================
// Table: mjcs (Maintenance Job Cards)
// =============================================================================

export interface MJC {
  id: string; // UUID
  job_card_number: string;
  wo_id: string | null; // UUID FK
  raised_by_user_id: string; // UUID FK
  created_by: string; // UUID FK
  assigned_to: string | null; // UUID FK
  date: string;
  time: string;
  department: Department;

  // Section 2: Machine/Equipment
  machine_equipment: string;
  machine_id: string | null; // UUID FK

  // Section 3: Maintenance Type
  maintenance_category: MaintenanceCategory;
  maintenance_type_electrical: boolean;
  maintenance_type_mechanical: boolean;
  maintenance_type_pneumatical: boolean;
  maintenance_type_other: string | null;

  // Section 4: Machine Status & Urgency
  machine_status: 'down' | 'operational';
  urgency: MJCUrgency;
  machine_down_since: string | null;
  estimated_downtime: number | null;

  // Section 5: Temporary Repair
  temporary_repair: boolean;
  close_out_due_date: string | null;

  // Section 6: Description
  description_required: string;
  description_attachments: FileAttachment[] | null;

  // Section 7: Maintenance Performed
  maintenance_performed: string | null;
  maintenance_technician: string | null;
  maintenance_signature: Signature | null;
  work_started_at: string | null;
  work_completed_at: string | null;

  // Section 8: Additional Comments
  additional_comments: string | null;

  // Section 9: Hygiene Checklist (BRCGS CRITICAL)
  hygiene_checklist: HygieneChecklistItem[] | null;
  hygiene_checklist_completed_by: string | null;
  hygiene_checklist_completed_at: string | null;

  // Section 10: Hygiene Clearance (BRCGS CRITICAL)
  hygiene_clearance_comments: string | null;
  hygiene_clearance_by: string | null;
  hygiene_clearance_signature: Signature | null;
  hygiene_clearance_at: string | null;

  // System fields
  status: MJCStatus;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  closed_at: string | null;
}

export interface MJCInsert {
  id?: string;
  job_card_number?: string; // Auto-generated
  wo_id?: string | null;
  raised_by_user_id: string;
  created_by: string;
  assigned_to?: string | null;
  date?: string;
  time?: string;
  department: Department;
  machine_equipment: string;
  machine_id?: string | null;
  maintenance_category: MaintenanceCategory;
  maintenance_type_electrical?: boolean;
  maintenance_type_mechanical?: boolean;
  maintenance_type_pneumatical?: boolean;
  maintenance_type_other?: string | null;
  machine_status: 'down' | 'operational';
  urgency: MJCUrgency;
  machine_down_since?: string | null;
  estimated_downtime?: number | null;
  temporary_repair?: boolean;
  close_out_due_date?: string | null;
  description_required: string;
  description_attachments?: FileAttachment[] | null;
  maintenance_performed?: string | null;
  maintenance_technician?: string | null;
  maintenance_signature?: Signature | null;
  work_started_at?: string | null;
  work_completed_at?: string | null;
  additional_comments?: string | null;
  hygiene_checklist?: HygieneChecklistItem[] | null;
  hygiene_checklist_completed_by?: string | null;
  hygiene_checklist_completed_at?: string | null;
  hygiene_clearance_comments?: string | null;
  hygiene_clearance_by?: string | null;
  hygiene_clearance_signature?: Signature | null;
  hygiene_clearance_at?: string | null;
  status?: MJCStatus;
}

export interface MJCUpdate extends Partial<MJCInsert> {}

// =============================================================================
// Table: audit_trail
// =============================================================================

export interface AuditTrail {
  id: string; // UUID
  entity_type: AuditEntityType;
  entity_id: string; // UUID
  action: AuditAction;
  user_id: string | null; // UUID FK
  user_email: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  old_value: Record<string, any> | null; // JSONB
  new_value: Record<string, any> | null; // JSONB
  changed_fields: string[] | null;
  notes: string | null;
  created_at: string;
}

// =============================================================================
// Database Schema (for Supabase client)
// =============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      machines: {
        Row: Machine;
        Insert: MachineInsert;
        Update: MachineUpdate;
      };
      work_orders: {
        Row: WorkOrder;
        Insert: WorkOrderInsert;
        Update: WorkOrderUpdate;
      };
      ncas: {
        Row: NCA;
        Insert: NCAInsert;
        Update: NCAUpdate;
      };
      mjcs: {
        Row: MJC;
        Insert: MJCInsert;
        Update: MJCUpdate;
      };
      audit_trail: {
        Row: AuditTrail;
        Insert: never; // INSERT only via triggers
        Update: never; // No UPDATE allowed (immutable)
      };
    };
    Views: {
      // Add views here if needed
    };
    Functions: {
      generate_nca_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_mjc_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      validate_hygiene_checklist: {
        Args: { checklist: HygieneChecklistItem[] };
        Returns: boolean;
      };
      user_has_role: {
        Args: { required_roles: UserRole[] };
        Returns: boolean;
      };
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole | null;
      };
      can_close_nca: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_grant_hygiene_clearance: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      // Supabase doesn't have native enums, but we use CHECK constraints
    };
  };
}
