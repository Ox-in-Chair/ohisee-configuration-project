'use server';

/**
 * OHiSee NCA System - Server Actions
 * Handles NCA form submission and database operations
 * Architecture: Dependency injection pattern - no static calls
 */

import { createServerClient } from '@/lib/database/client';
import type { NCAInsert, Signature } from '@/types/database';
import type { NCAFormData } from '@/lib/validations/nca-schema';
import { revalidatePath } from 'next/cache';
import type { INotificationService, NotificationPayload } from '@/lib/types/notification';

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
 * Generate NCA number in format: NCA-YYYY-NNNNNNNN
 */
function generateNCANumber(): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return `NCA-${year}-${random}`;
}

/**
 * Transform form data to database insert format
 */
function transformFormDataToInsert(
  formData: NCAFormData,
  userId: string
): NCAInsert {
  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

  return {
    // Auto-generated fields
    nca_number: generateNCANumber(),
    date: dateString,
    time: timeString,
    raised_by_user_id: userId,
    created_by: userId,

    // Work Order Link
    wo_id: formData.wo_id || null,

    // Section 2: Classification
    nc_type: formData.nc_type,
    nc_type_other: formData.nc_type_other || null,

    // Section 3: Supplier & Product
    supplier_name: formData.supplier_name || null,
    nc_product_description: formData.nc_product_description,
    supplier_wo_batch: formData.supplier_wo_batch || null,
    supplier_reel_box: formData.supplier_reel_box || null,
    sample_available: formData.sample_available,
    quantity: formData.quantity ?? null,
    quantity_unit: formData.quantity_unit ?? null,
    carton_numbers: formData.carton_numbers || null,

    // Section 4: Description
    nc_description: formData.nc_description,

    // Section 5: Machine Status
    machine_status: formData.machine_status,
    machine_down_since: formData.machine_down_since || null,
    estimated_downtime: formData.estimated_downtime ?? null,

    // Section 6: Concession
    concession_team_leader: formData.concession_team_leader || null,
    concession_signature: transformSignature(formData.concession_signature),
    concession_notes: formData.concession_notes || null,

    // Section 7: Immediate Correction
    cross_contamination: formData.cross_contamination,
    back_tracking_person: formData.back_tracking_person || null,
    back_tracking_signature: transformSignature(formData.back_tracking_signature),
    back_tracking_completed: formData.back_tracking_completed,
    hold_label_completed: formData.hold_label_completed,
    nca_logged: formData.nca_logged,

    // Section 8: Disposition - Convert single action to multiple booleans
    disposition_reject: formData.disposition_action === 'reject',
    disposition_credit: formData.disposition_action === 'credit',
    disposition_uplift: formData.disposition_action === 'uplift',
    disposition_rework: formData.disposition_action === 'rework',
    disposition_concession: formData.disposition_action === 'concession',
    disposition_discard: formData.disposition_action === 'discard',
    rework_instruction: formData.rework_instruction || null,
    disposition_authorized_by: formData.disposition_authorized_by || null,
    disposition_signature: transformSignature(formData.disposition_signature),

    // Section 9: Root Cause
    root_cause_analysis: formData.root_cause_analysis || null,
    root_cause_attachments: null, // TODO: File upload handling

    // Section 10: Corrective Action
    corrective_action: formData.corrective_action || null,
    corrective_action_attachments: null, // TODO: File upload handling

    // Section 11: Close Out
    close_out_by: formData.close_out_by || null,
    close_out_signature: transformSignature(formData.close_out_signature),
    close_out_date: formData.close_out_date || null,

    // Status - default to submitted
    status: 'submitted',
  };
}

/**
 * Send machine down alert if applicable
 * Injected notification service for testability (DI pattern)
 */
async function sendMachineDownAlertIfNeeded(
  ncaData: NCAInsert,
  ncaNumber: string,
  notificationService?: INotificationService
): Promise<void> {
  // Only send alert if machine status is 'down'
  if (ncaData.machine_status !== 'down') {
    return;
  }

  // Skip if no notification service provided (production will inject real service)
  if (!notificationService) {
    console.warn('Machine down alert skipped - notification service not configured');
    return;
  }

  try {
    // TODO: Fetch operator name from user_profiles table using raised_by_user_id
    // For MVP, using hardcoded name
    const operatorName = 'Operations Team';

    // TODO: Extract machine name from nc_product_description or add machine_name field
    // For MVP, using placeholder
    const machineName = ncaData.nc_product_description?.split('-')[0]?.trim() || 'Unknown Machine';

    const payload: NotificationPayload = {
      nca_number: ncaNumber,
      machine_name: machineName,
      operator_name: operatorName,
      timestamp: new Date().toISOString(),
    };

    // Send alert (errors are logged internally, won't throw)
    await notificationService.sendMachineDownAlert(payload);
  } catch (error) {
    // Log error but don't fail NCA creation if notification fails
    console.error('Failed to send machine down alert:', error);
  }
}

/**
 * Create and submit a new NCA
 * Server Action - called from client components
 * Optional notificationService parameter for dependency injection (testing)
 */
export async function createNCA(
  formData: NCAFormData,
  notificationService?: INotificationService
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  try {
    // Create server-side Supabase client (dependency injection)
    const supabase = createServerClient();

    // TODO: Get real user ID from auth session
    // For now, using seed data operator user (John Smith)
    const userId = '10000000-0000-0000-0000-000000000001';

    // Transform form data to database format
    const ncaData = transformFormDataToInsert(formData, userId);

    // Insert into database (using type assertion due to Supabase generic type inference with 'never' types)
    const { data, error } = await (supabase
      .from('ncas') as any)
      .insert(ncaData)
      .select('id, nca_number')
      .single();

    if (error) {
      console.error('Supabase error creating NCA:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    // Send machine down alert if applicable (non-blocking)
    // Errors are logged but won't fail NCA creation
    await sendMachineDownAlertIfNeeded(ncaData, data.nca_number, notificationService);

    // Revalidate NCA list page
    revalidatePath('/nca');

    return {
      success: true,
      data: {
        id: data.id,
        nca_number: data.nca_number,
      },
    };
  } catch (error) {
    console.error('Unexpected error creating NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Save NCA as draft
 * Allows partial form data with status = 'draft'
 */
export async function saveDraftNCA(
  formData: Partial<NCAFormData>
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  try {
    const supabase = createServerClient();
    const userId = '10000000-0000-0000-0000-000000000001'; // TODO: Get from auth (using seed operator for now)

    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

    // Minimal required fields for draft
    const draftData: Partial<NCAInsert> = {
      nca_number: generateNCANumber(),
      date: dateString,
      time: timeString,
      raised_by_user_id: userId,
      created_by: userId,
      status: 'draft',

      // Include any fields that are provided
      nc_type: formData.nc_type || 'other',
      nc_product_description: formData.nc_product_description || '',
      nc_description: formData.nc_description || '',
      machine_status: formData.machine_status || 'operational',
    };

    const { data, error } = await (supabase
      .from('ncas') as any)
      .insert(draftData)
      .select('id, nca_number')
      .single();

    if (error) {
      console.error('Supabase error saving draft NCA:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    revalidatePath('/nca');

    return {
      success: true,
      data: {
        id: data.id,
        nca_number: data.nca_number,
      },
    };
  } catch (error) {
    console.error('Unexpected error saving draft NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get NCA by ID
 * Server Action for fetching single NCA
 */
export async function getNCAById(
  id: string
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('ncas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error fetching NCA:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Unexpected error fetching NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all NCAs with optional filters
 * Server Action for listing NCAs
 */
export async function listNCAs(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();

    let query = supabase.from('ncas').select('*', { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error listing NCAs:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    return {
      success: true,
      data: {
        ncas: data,
        total: count,
      },
    };
  } catch (error) {
    console.error('Unexpected error listing NCAs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
