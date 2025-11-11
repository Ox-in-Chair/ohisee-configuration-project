'use server';

/**
 * OHiSee End-of-Day Submission - Server Actions
 * Handles shift summary submission, entry locking, and report generation
 * BRCGS Compliance: Section 3.9 Traceability
 */

import { createServerClient } from '@/lib/database/client';
import { revalidatePath } from 'next/cache';
import type { Signature } from '@/types/database';
import { createProductionNotificationService } from '@/lib/services/create-notification-service';
import { generateEndOfDayPDF } from '@/lib/services/report-generator';

interface EndOfDaySubmissionData {
  shiftNotes?: string;
  signature: {
    type: 'manual' | 'digital';
    data: string;
    name: string;
    timestamp: string;
  };
  userId: string;
}

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
}): Signature {
  return {
    type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
    name: formSignature.name,
    timestamp: formSignature.timestamp,
    ip: '0.0.0.0', // TODO: Get real IP from request headers
    data: formSignature.data,
  };
}

/**
 * Lock NCA entries after end-of-day submission
 * Prevents further editing unless authorized
 */
async function lockNCAEntries(userId: string, ncaIds: string[]): Promise<void> {
  if (ncaIds.length === 0) return;

  const supabase = createServerClient();

  // Update all NCAs to locked status
  // Note: We'll add a 'locked' field or use a different mechanism
  // For now, we'll add a metadata field to track locking
  const { error } = await (supabase
    .from('ncas') as any)
    .update({
      // Add locked_at timestamp in metadata or use a separate field
      // For MVP, we'll just ensure they're not in draft status
      status: 'submitted', // Ensure drafts are submitted
    })
    .in('id', ncaIds)
    .eq('raised_by_user_id', userId);

  if (error) {
    console.error('Failed to lock NCA entries:', error);
    throw new Error(`Failed to lock NCA entries: ${error.message}`);
  }
}

/**
 * Lock MJC entries after end-of-day submission
 */
async function lockMJCEntries(userId: string, mjcIds: string[]): Promise<void> {
  if (mjcIds.length === 0) return;

  const supabase = createServerClient();

  const { error } = await (supabase
    .from('mjcs') as any)
    .update({
      status: 'open', // Ensure drafts are opened
    })
    .in('id', mjcIds)
    .eq('raised_by_user_id', userId);

  if (error) {
    console.error('Failed to lock MJC entries:', error);
    throw new Error(`Failed to lock MJC entries: ${error.message}`);
  }
}

/**
 * Update work order status to "Shift Complete"
 */
async function completeWorkOrders(userId: string, workOrderIds: string[]): Promise<void> {
  if (workOrderIds.length === 0) return;

  const supabase = createServerClient();

  const { error } = await (supabase
    .from('work_orders') as any)
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .in('id', workOrderIds)
    .eq('operator_id', userId);

  if (error) {
    console.error('Failed to complete work orders:', error);
    throw new Error(`Failed to complete work orders: ${error.message}`);
  }
}

/**
 * Create audit trail entry for end-of-day submission
 */
async function createAuditTrailEntry(
  userId: string,
  submissionData: EndOfDaySubmissionData,
  summary: {
    ncaCount: number;
    mjcCount: number;
    workOrderCount: number;
  }
): Promise<void> {
  const supabase = createServerClient();

  // TODO: Get user details from users table
  const userEmail = 'operator@kangopak.co.za'; // Placeholder
  const userName = 'Operator'; // Placeholder

  const { error } = await (supabase.from('audit_trail') as any).insert({
    entity_type: 'end_of_day_submission',
    entity_id: `eod-${Date.now()}`,
    action: 'end_of_day_submitted',
    user_id: userId,
    user_email: userEmail,
    user_name: userName,
    user_role: 'operator',
    ip_address: '0.0.0.0', // TODO: Get real IP
    new_value: {
      nca_count: summary.ncaCount,
      mjc_count: summary.mjcCount,
      work_order_count: summary.workOrderCount,
      shift_notes: submissionData.shiftNotes || null,
      submitted_at: new Date().toISOString(),
    },
    notes: `End-of-day submission: ${summary.ncaCount} NCAs, ${summary.mjcCount} MJCs, ${summary.workOrderCount} work orders`,
  });

  if (error) {
    console.error('Failed to create audit trail entry:', error);
    // Don't throw - audit trail failure shouldn't block submission
  }
}

/**
 * Submit end-of-day summary
 * Validates, locks entries, and generates report
 */
export async function submitEndOfDay(
  submissionData: EndOfDaySubmissionData,
  entryIds: {
    ncaIds: string[];
    mjcIds: string[];
    workOrderIds: string[];
  }
): Promise<ActionResponse<{ submissionId: string }>> {
  try {
    const supabase = createServerClient();

    // Validate no incomplete drafts
    if (entryIds.ncaIds.length > 0) {
      const { data: ncas } = await (supabase
        .from('ncas') as any)
        .select('id, status')
        .in('id', entryIds.ncaIds);

      const drafts = (ncas || []).filter((n: any) => n.status === 'draft');
      if (drafts.length > 0) {
        return {
          success: false,
          error: `Cannot submit: ${drafts.length} NCA draft(s) must be completed or discarded`,
        };
      }
    }

    if (entryIds.mjcIds.length > 0) {
      const { data: mjcs } = await (supabase
        .from('mjcs') as any)
        .select('id, status')
        .in('id', entryIds.mjcIds);

      const drafts = (mjcs || []).filter((m: any) => m.status === 'draft');
      if (drafts.length > 0) {
        return {
          success: false,
          error: `Cannot submit: ${drafts.length} MJC draft(s) must be completed or discarded`,
        };
      }
    }

    // Lock entries
    await lockNCAEntries(submissionData.userId, entryIds.ncaIds);
    await lockMJCEntries(submissionData.userId, entryIds.mjcIds);

    // Complete work orders
    await completeWorkOrders(submissionData.userId, entryIds.workOrderIds);

    // Create audit trail entry
    await createAuditTrailEntry(
      submissionData.userId,
      submissionData,
      {
        ncaCount: entryIds.ncaIds.length,
        mjcCount: entryIds.mjcIds.length,
        workOrderCount: entryIds.workOrderIds.length,
      }
    );

    // Generate PDF report
    const pdfBuffer = await generateEndOfDayPDF(
      submissionData.userId,
      {
        ncaIds: entryIds.ncaIds,
        mjcIds: entryIds.mjcIds,
        workOrderIds: entryIds.workOrderIds,
      },
      submissionData.shiftNotes
    );

    // Send email report to management
    const notificationService = createProductionNotificationService();
    
    // Fetch summary data for email
    const { data: ncas } = await (supabase
      .from('ncas') as any)
      .select('nca_number')
      .in('id', entryIds.ncaIds);
    
    const { data: mjcs } = await (supabase
      .from('mjcs') as any)
      .select('job_card_number')
      .in('id', entryIds.mjcIds);

    await notificationService.sendEndOfDaySummary({
      operator_name: 'Operator', // TODO: Get from auth
      date: new Date().toLocaleDateString('en-GB'),
      work_orders_count: entryIds.workOrderIds.length,
      ncas_count: entryIds.ncaIds.length,
      mjcs_count: entryIds.mjcIds.length,
      shift_notes: submissionData.shiftNotes,
      ncas_list: (ncas || []).map((n: any) => n.nca_number),
      mjcs_list: (mjcs || []).map((m: any) => m.job_card_number),
    });

    revalidatePath('/dashboard/production');
    revalidatePath('/nca/register');
    revalidatePath('/mjc/register');

    return {
      success: true,
      data: {
        submissionId: `eod-${Date.now()}`,
      },
    };
  } catch (error) {
    console.error('Unexpected error submitting end-of-day:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

