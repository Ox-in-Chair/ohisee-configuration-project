/**
 * Complaint Actions
 * Server actions for complaint handling and NCA generation
 * PRD Enhancement: Complaint Handling Integration
 * BRCGS: 3.10 Complaint Handling
 */

'use server';

import { createServerClient } from '@/lib/database/client';
import type { ActionResponse } from './types';
import { createNCA } from './nca-actions';
import type { NCAFormData } from '@/lib/validations/nca-schema';

export interface ComplaintData {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  complaint_date?: string;
  complaint_received_via?: 'phone' | 'email' | 'in-person' | 'other';
  complaint_description: string;
  complaint_type?: 'quality' | 'safety' | 'legality' | 'delivery' | 'other';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  investigation_notes?: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  complaint_date: string;
  complaint_received_via: 'phone' | 'email' | 'in-person' | 'other' | null;
  complaint_description: string;
  complaint_type: 'quality' | 'safety' | 'legality' | 'delivery' | 'other' | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  investigation_status: 'pending' | 'investigating' | 'valid' | 'invalid' | 'closed';
  investigation_notes: string | null;
  root_cause_analysis: string | null;
  corrective_action: string | null;
  corrective_action_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  linked_nca_id: string | null;
  closed_by: string | null;
  closed_at: string | null;
  closure_notes: string | null;
  cycle_time_days: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create complaint
 */
export async function createComplaint(
  complaintData: ComplaintData,
  userId: string
): Promise<ActionResponse<Complaint>> {
  try {
    const supabase = createServerClient();

    const { data: complaint, error } = await (supabase
      .from('complaints') as any)
      .insert({
        ...complaintData,
        complaint_date: complaintData.complaint_date || new Date().toISOString().split('T')[0],
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to create complaint: ${error.message}`,
      };
    }

    return {
      success: true,
      data: complaint as Complaint,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating complaint',
    };
  }
}

/**
 * Create NCA from complaint
 * Auto-generates NCA when complaint indicates supplier issue
 */
export async function createNCAFromComplaint(
  complaintId: string,
  userId: string
): Promise<ActionResponse<{ complaint: Complaint; nca: { id: string; nca_number: string } }>> {
  try {
    const supabase = createServerClient();

    // Fetch complaint
    const { data: complaint, error: complaintError } = await (supabase
      .from('complaints') as any)
      .select('*')
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      return {
        success: false,
        error: `Complaint not found: ${complaintError?.message || 'Unknown error'}`,
      };
    }

    // Check if NCA already exists
    if (complaint.linked_nca_id) {
      return {
        success: false,
        error: 'NCA already exists for this complaint',
      };
    }

    // Create NCA form data from complaint
    const ncaFormData: NCAFormData = {
      nc_type: 'raw-material', // Complaints typically indicate supplier issues
      nc_origin: 'supplier-based',
      nc_product_description: `Product from complaint: ${complaint.complaint_description.substring(0, 100)}`,
      nc_description: `NCA generated from customer complaint ${complaint.complaint_number}.\n\nCustomer: ${complaint.customer_name}\nComplaint: ${complaint.complaint_description}\n\nInvestigation required to identify supplier and batch details.`,
      machine_status: 'operational',
      cross_contamination: false,
      back_tracking_completed: false,
      hold_label_completed: false,
      nca_logged: true,
      sample_available: false,
      // Procedure reference defaults
      procedure_reference: '5.7',
      procedure_revision: 'Rev 9',
      procedure_revision_date: new Date().toLocaleDateString('en-GB'),
    };

    // Create NCA
    const ncaResult = await createNCA(ncaFormData);

    if (!ncaResult.success || !ncaResult.data) {
      return {
        success: false,
        error: `Failed to create NCA: ${ncaResult.error || 'Unknown error'}`,
      };
    }

    // Link complaint to NCA bidirectionally
    const [complaintUpdate, ncaUpdate] = await Promise.all([
      (supabase
        .from('complaints') as any)
        .update({ linked_nca_id: ncaResult.data.id })
        .eq('id', complaintId),
      (supabase
        .from('ncas') as any)
        .update({ complaint_id: complaintId })
        .eq('id', ncaResult.data.id),
    ]);

    if (complaintUpdate.error) {
      return {
        success: false,
        error: `Failed to link complaint to NCA: ${complaintUpdate.error.message}`,
      };
    }

    if (ncaUpdate.error) {
      return {
        success: false,
        error: `Failed to link NCA to complaint: ${ncaUpdate.error.message}`,
      };
    }

    // Fetch updated complaint
    const { data: updatedComplaint } = await (supabase
      .from('complaints') as any)
      .select('*')
      .eq('id', complaintId)
      .single();

    if (!updatedComplaint) {
      return {
        success: false,
        error: 'Failed to fetch updated complaint',
      };
    }

    return {
      success: true,
      data: {
        complaint: updatedComplaint as unknown as Complaint,
        nca: ncaResult.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating NCA from complaint',
    };
  }
}

/**
 * Link existing NCA to complaint
 */
export async function linkNCAToComplaint(
  complaintId: string,
  ncaId: string
): Promise<ActionResponse<Complaint>> {
  try {
    const supabase = createServerClient();

    // Link bidirectionally
    const [complaintUpdate, ncaUpdate] = await Promise.all([
      (supabase.from('complaints') as any).update({ linked_nca_id: ncaId }).eq('id', complaintId),
      (supabase.from('ncas') as any).update({ complaint_id: complaintId }).eq('id', ncaId),
    ]);

    if (complaintUpdate.error) {
      return {
        success: false,
        error: `Failed to link NCA to complaint: ${complaintUpdate.error.message}`,
      };
    }

    if (ncaUpdate.error) {
      return {
        success: false,
        error: `Failed to link complaint to NCA: ${ncaUpdate.error.message}`,
      };
    }

    // Fetch updated complaint
    const { data: complaint, error: fetchError } = await (supabase
      .from('complaints') as any)
      .select('*')
      .eq('id', complaintId)
      .single();

    if (fetchError || !complaint) {
      return {
        success: false,
        error: `Failed to fetch complaint: ${fetchError?.message || 'Unknown error'}`,
      };
    }

    return {
      success: true,
      data: complaint as Complaint,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error linking NCA to complaint',
    };
  }
}

/**
 * Get complaint by ID
 */
export async function getComplaintById(complaintId: string): Promise<ActionResponse<Complaint>> {
  try {
    const supabase = createServerClient();

    const { data: complaint, error } = await (supabase
      .from('complaints') as any)
      .select('*')
      .eq('id', complaintId)
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to fetch complaint: ${error.message}`,
      };
    }

    return {
      success: true,
      data: complaint as Complaint,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching complaint',
    };
  }
}

/**
 * Get complaint by NCA ID
 */
export async function getComplaintByNCA(ncaId: string): Promise<ActionResponse<Complaint | null>> {
  try {
    const supabase = createServerClient();

    const { data: complaint, error } = await (supabase
      .from('complaints') as any)
      .select('*')
      .eq('linked_nca_id', ncaId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's okay, return null
      return {
        success: false,
        error: `Failed to fetch complaint: ${error.message}`,
      };
    }

    return {
      success: true,
      data: (complaint as Complaint) || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching complaint',
    };
  }
}

