/**
 * OHiSee MJC System - Type Definitions
 * Architecture: Interface-based dependency injection
 * TypeScript strict mode compliance
 */

export interface MJC {
  id: string;
  job_card_number: string;

  // Foreign Keys
  wo_id: string | null;
  raised_by_user_id: string;
  created_by: string;
  assigned_to: string | null;

  // Section 1: Job Card Identification
  date: string; // ISO timestamp
  time: string;
  department: 'pouching' | 'spouting' | 'slitting' | 'warehouse' | 'maintenance';

  // Section 2: Machine/Equipment
  machine_equipment: string;
  machine_id: string | null;

  // Section 3: Maintenance Type
  maintenance_category: 'reactive' | 'planned';
  maintenance_type_electrical: boolean;
  maintenance_type_mechanical: boolean;
  maintenance_type_pneumatical: boolean;
  maintenance_type_other: string | null;

  // Section 4: Machine Status & Urgency
  machine_status: 'down' | 'operational';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  machine_down_since: string | null; // ISO timestamp
  estimated_downtime: number | null; // minutes

  // Section 5: Temporary Repair
  temporary_repair: boolean;
  close_out_due_date: string | null; // ISO date

  // Section 6: Description
  description_required: string;
  description_attachments: Attachment[] | null;

  // Section 7: Maintenance Performed
  maintenance_performed: string | null;
  maintenance_technician: string | null;
  maintenance_signature: Signature | null;
  work_started_at: string | null; // ISO timestamp
  work_completed_at: string | null; // ISO timestamp

  // Section 8: Additional Comments
  additional_comments: string | null;

  // Section 9: Hygiene Checklist
  hygiene_checklist: HygieneChecklistItem[] | null;
  hygiene_checklist_completed_by: string | null;
  hygiene_checklist_completed_at: string | null; // ISO timestamp

  // Section 10: Hygiene Clearance
  hygiene_clearance_comments: string | null;
  hygiene_clearance_by: string | null;
  hygiene_clearance_signature: Signature | null;
  hygiene_clearance_at: string | null; // ISO timestamp

  // Section 11: Status
  status: 'draft' | 'open' | 'assigned' | 'in-progress' | 'awaiting-clearance' | 'closed';

  // Audit Fields
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  submitted_at: string | null; // ISO timestamp
  closed_at: string | null; // ISO timestamp
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  type: string;
}

export interface Signature {
  type: 'login' | 'canvas';
  name: string;
  timestamp: string; // ISO timestamp
  ip: string;
  data?: string; // Base64 canvas signature data
}

export interface HygieneChecklistItem {
  item: string;
  verified: boolean;
  notes?: string;
}

/**
 * MJC Table Row - Optimized for display in register table
 */
export interface MJCTableRow {
  id: string;
  job_card_number: string;
  status: MJC['status'];
  created_at: string;
  machine_equipment: string;
  maintenance_category: MJC['maintenance_category'];
  urgency: MJC['urgency'];
  temporary_repair: boolean;
  close_out_due_date: string | null;
  machine_status: MJC['machine_status'];
  assigned_to_name: string | null;
  raised_by_name: string;
}

/**
 * Temporary Repair Countdown Data
 */
export interface TemporaryRepairCountdown {
  daysRemaining: number;
  dueDate: string;
  isOverdue: boolean;
  urgencyLevel: 'critical' | 'warning' | 'normal';
}
