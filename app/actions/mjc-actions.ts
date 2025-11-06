'use server';

/**
 * OHiSee MJC System - Server Actions
 * Handles MJC form submission and database operations
 * Architecture: Dependency injection pattern - no static calls
 */

import { createServerClient } from '@/lib/database/client';
import type { MJCInsert, MJCUpdate, Signature, HygieneChecklistItem } from '@/types/database';
import type { MJCFormData } from '@/lib/validations/mjc-schema';
import { revalidatePath } from 'next/cache';

/**
 * Server Action Response Type
 */
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Transform form signature to database signature format
 */
function transformSignature(formSignature: {
  type: 'manual' | 'digital';
  data: string;
  name: string;
  timestamp: string;
} | null | undefined): Signature | null {
  if (!formSignature) return null;

  return {
    type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
    name: formSignature.name,
    timestamp: formSignature.timestamp,
    ip: '0.0.0.0', // TODO: Get real IP from request headers
    data: formSignature.data,
  };
}

/**
 * Generate MJC number in format: MJC-YYYY-NNNNNNNN
 */
function generateMJCNumber(): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `MJC-${year}-${random}`;
}

/**
 * Calculate temporary repair due date (14 days from now)
 */
function calculateDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

/**
 * Transform form hygiene checklist to database format
 * All 10 items must be present for BRCGS compliance
 */
function transformHygieneChecklist(formData: MJCFormData): HygieneChecklistItem[] {
  const items = [
    { label: 'No loose objects, nuts, bolts, washers or tools left in machinery', verified: formData.hygiene_check_1 },
    { label: 'All guards, safety devices and protective covers properly secured', verified: formData.hygiene_check_2 },
    { label: 'Work area cleaned and free from debris/contamination', verified: formData.hygiene_check_3 },
    { label: 'All lubricants and maintenance fluids are food-grade approved', verified: formData.hygiene_check_4 },
    { label: 'Machine surfaces cleaned and sanitized as per BRCGS standards', verified: formData.hygiene_check_5 },
    { label: 'No foreign material risk identified in product contact areas', verified: formData.hygiene_check_6 },
    { label: 'Temporary repairs documented with permanent solution planned', verified: formData.hygiene_check_7 },
    { label: 'All electrical connections secure and properly insulated', verified: formData.hygiene_check_8 },
    { label: 'Machine test run completed successfully without issues', verified: formData.hygiene_check_9 },
    { label: 'Quality check performed on first production output', verified: formData.hygiene_check_10 },
  ];

  return items.map((item, index) => ({
    item: item.label,
    verified: item.verified,
    notes: undefined,
  }));
}

/**
 * Transform form data to database insert format
 */
function transformFormDataToInsert(
  formData: MJCFormData,
  userId: string
): MJCInsert {
  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

  // Calculate due date if temporary repair is YES
  const dueDate = formData.temporary_repair === 'yes' ? calculateDueDate() : null;

  // Transform hygiene checklist
  const hygieneChecklist = transformHygieneChecklist(formData);

  return {
    // Auto-generated fields
    job_card_number: generateMJCNumber(),
    date: dateString,
    time: timeString,
    raised_by_user_id: userId,
    created_by: userId,

    // Section 1: Department (TODO: Get from user profile)
    department: 'maintenance', // Default for now

    // Section 2: Machine/Equipment
    machine_equipment: formData.machine_equipment_id,
    machine_id: null, // TODO: Link to machines table if valid UUID

    // Section 3: Maintenance Type
    maintenance_category: formData.maintenance_category,
    maintenance_type_electrical: formData.maintenance_type === 'electrical',
    maintenance_type_mechanical: formData.maintenance_type === 'mechanical',
    maintenance_type_pneumatical: formData.maintenance_type === 'pneumatical',
    maintenance_type_other: formData.maintenance_type === 'other'
      ? (formData.maintenance_type_other || null)
      : null,

    // Section 4: Machine Status & Urgency
    machine_status: formData.machine_status,
    urgency: formData.urgency_level,
    machine_down_since: formData.machine_down_time || null,
    estimated_downtime: null, // TODO: Calculate from machine_down_time

    // Section 5: Temporary Repair
    temporary_repair: formData.temporary_repair === 'yes',
    close_out_due_date: dueDate,

    // Section 6: Description
    description_required: formData.maintenance_description,
    description_attachments: null, // TODO: File upload handling

    // Section 7: Maintenance Performed
    maintenance_performed: formData.maintenance_performed || null,
    maintenance_technician: formData.maintenance_technician_signature || null,
    maintenance_signature: null, // TODO: Transform signature
    work_started_at: null, // TODO: Timestamp when work starts
    work_completed_at: null, // TODO: Timestamp when work completes

    // Section 8: Additional Comments
    additional_comments: formData.additional_comments || null,

    // Section 9: Hygiene Checklist (BRCGS CRITICAL)
    hygiene_checklist: hygieneChecklist,
    hygiene_checklist_completed_by: null, // TODO: Set when checklist completed
    hygiene_checklist_completed_at: null, // TODO: Set when checklist completed

    // Section 10: Hygiene Clearance (BRCGS CRITICAL)
    hygiene_clearance_comments: null,
    hygiene_clearance_by: formData.clearance_qa_supervisor || null,
    hygiene_clearance_signature: formData.clearance_signature
      ? transformSignature({
          type: 'digital',
          data: formData.clearance_signature,
          name: formData.clearance_qa_supervisor || 'Unknown',
          timestamp: new Date().toISOString(),
        })
      : null,
    hygiene_clearance_at: formData.production_cleared ? new Date().toISOString() : null,

    // Status - default to open if not cleared, closed if cleared
    status: formData.production_cleared ? 'closed' : 'open',
  };
}

/**
 * Validate hygiene checklist before clearance
 * BRCGS requirement: All 10 items must be verified
 */
function validateHygieneChecklist(formData: MJCFormData): { valid: boolean; error?: string } {
  const allChecked =
    formData.hygiene_check_1 &&
    formData.hygiene_check_2 &&
    formData.hygiene_check_3 &&
    formData.hygiene_check_4 &&
    formData.hygiene_check_5 &&
    formData.hygiene_check_6 &&
    formData.hygiene_check_7 &&
    formData.hygiene_check_8 &&
    formData.hygiene_check_9 &&
    formData.hygiene_check_10;

  if (!allChecked) {
    return {
      valid: false,
      error: 'BRCGS Violation: All 10 hygiene items must be verified before clearance',
    };
  }

  return { valid: true };
}

/**
 * Create and submit a new MJC
 * Server Action - called from client components
 */
export async function createMJC(
  formData: MJCFormData
): Promise<ActionResponse<{ id: string; job_card_number: string }>> {
  try {
    // Validate hygiene checklist if production clearance is granted
    if (formData.production_cleared) {
      const validation = validateHygieneChecklist(formData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // Create server-side Supabase client (dependency injection)
    const supabase = createServerClient();

    // TODO: Get real user ID from auth session
    const userId = '00000000-0000-0000-0000-000000000001';

    // Transform form data to database format
    const mjcData = transformFormDataToInsert(formData, userId);

    // Insert into database
    const { data: insertedData, error } = await supabase
      .from('mjcs')
      .insert(mjcData as any)
      .select('id, job_card_number')
      .single();

    if (error) {
      console.error('Supabase error creating MJC:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    if (!insertedData) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    // Revalidate MJC list page
    revalidatePath('/mjc');

    return {
      success: true,
      data: {
        id: (insertedData as any).id,
        job_card_number: (insertedData as any).job_card_number,
      },
    };
  } catch (error) {
    console.error('Unexpected error creating MJC:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Save MJC as draft
 * Allows partial form data with status = 'draft'
 */
export async function saveDraftMJC(
  formData: Partial<MJCFormData>
): Promise<ActionResponse<{ id: string; job_card_number: string }>> {
  try {
    const supabase = createServerClient();
    const userId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth

    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

    // Minimal required fields for draft
    const draftData: Partial<MJCInsert> = {
      job_card_number: generateMJCNumber(),
      date: dateString,
      time: timeString,
      raised_by_user_id: userId,
      created_by: userId,
      status: 'draft',
      department: 'maintenance',

      // Include any fields that are provided
      machine_equipment: formData.machine_equipment_id || '',
      maintenance_category: formData.maintenance_category || 'reactive',
      machine_status: formData.machine_status || 'operational',
      urgency: formData.urgency_level || 'low',
      temporary_repair: formData.temporary_repair === 'yes',
      description_required: formData.maintenance_description || '',
    };

    const { data: insertedData, error } = await supabase
      .from('mjcs')
      .insert(draftData as any)
      .select('id, job_card_number')
      .single();

    if (error) {
      console.error('Supabase error saving draft MJC:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    if (!insertedData) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    revalidatePath('/mjc');

    return {
      success: true,
      data: {
        id: (insertedData as any).id,
        job_card_number: (insertedData as any).job_card_number,
      },
    };
  } catch (error) {
    console.error('Unexpected error saving draft MJC:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get MJC by ID
 * Server Action for fetching single MJC
 */
export async function getMJCById(
  id: string
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    const { data: mjcData, error } = await supabase
      .from('mjcs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching MJC:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    return {
      success: true,
      data: mjcData,
    };
  } catch (error) {
    console.error('Unexpected error fetching MJC:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all MJCs with optional filters
 * Server Action for listing MJCs
 */
export async function listMJCs(filters?: {
  status?: string;
  urgency?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    let query = supabase.from('mjcs').select('*', { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.urgency) {
      query = query.eq('urgency', filters.urgency);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    // Order by urgency (critical first) and created_at descending
    query = query.order('urgency', { ascending: true }).order('created_at', { ascending: false });

    const { data: mjcList, error, count } = await query;

    if (error) {
      console.error('Supabase error listing MJCs:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    return {
      success: true,
      data: {
        mjcs: mjcList,
        total: count,
      },
    };
  } catch (error) {
    console.error('Unexpected error listing MJCs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Grant hygiene clearance for MJC
 * BRCGS CRITICAL: Requires all 10 hygiene items verified
 */
export async function grantHygieneClearance(
  mjcId: string,
  clearanceData: {
    qa_supervisor: string;
    signature: string;
    comments?: string;
  }
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    // First, fetch the MJC to validate hygiene checklist
    const { data: mjcData, error: fetchError } = await supabase
      .from('mjcs')
      .select('hygiene_checklist')
      .eq('id', mjcId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch MJC: ${fetchError.message}`,
      };
    }

    // Validate all 10 items are verified
    const checklist = (mjcData as any).hygiene_checklist as HygieneChecklistItem[];
    if (!checklist || checklist.length !== 10) {
      return {
        success: false,
        error: 'Invalid hygiene checklist structure',
      };
    }

    const allVerified = checklist.every((item) => item.verified === true);
    if (!allVerified) {
      return {
        success: false,
        error: 'BRCGS Violation: All 10 hygiene items must be verified before granting clearance',
      };
    }

    // Update MJC with clearance
    const clearanceSignature: Signature = {
      type: 'uploaded',
      name: clearanceData.qa_supervisor,
      timestamp: new Date().toISOString(),
      ip: '0.0.0.0',
      data: clearanceData.signature,
    };

    // Note: Using type assertion due to Supabase generic type inference issue with 'never' types
    const { error: updateError } = await (supabase
      .from('mjcs') as any)
      .update({
        hygiene_clearance_by: clearanceData.qa_supervisor,
        hygiene_clearance_signature: clearanceSignature,
        hygiene_clearance_comments: clearanceData.comments || null,
        hygiene_clearance_at: new Date().toISOString(),
        status: 'closed',
      })
      .eq('id', mjcId);

    if (updateError) {
      return {
        success: false,
        error: `Failed to grant clearance: ${updateError.message}`,
      };
    }

    revalidatePath('/mjc');

    return {
      success: true,
      data: { message: 'Hygiene clearance granted successfully' },
    };
  } catch (error) {
    console.error('Unexpected error granting hygiene clearance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
