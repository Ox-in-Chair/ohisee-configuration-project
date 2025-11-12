/**
 * Enforcement Logger Service
 * Logs enforcement actions to database for audit and pattern analysis
 * All AI involvement is logged internally but never exposed to users
 */

import { createServerClient } from '@/lib/database/client';

export interface EnforcementLogData {
  formType: 'nca' | 'mjc';
  formId?: string;
  userId: string;
  attemptNumber: number;
  enforcementLevel: 'soft' | 'moderate' | 'strict' | 'manager-approval';
  validationResult: any; // ValidationResult JSON
  issuesFound: any[]; // Array of validation issues
  actionTaken: 'hint_shown' | 'requirement_promoted' | 'error_escalated' | 'manager_approval_required' | 'submission_blocked' | 'submission_allowed';
  requirementsMissing?: any[];
  errorsBlocking?: any[];
  managerApprovalRequested?: boolean;
  justification?: string;
}

/**
 * Log enforcement action to database
 * This is for internal audit and pattern analysis only
 */
export async function logEnforcementAction(data: EnforcementLogData): Promise<string | null> {
  try {
    const supabase = createServerClient();

    const { data: logEntry, error } = await (supabase
      .from('enforcement_log') as any)
      .insert({
        form_type: data.formType,
        form_id: data.formId || null,
        user_id: data.userId,
        attempt_number: data.attemptNumber,
        enforcement_level: data.enforcementLevel,
        validation_result: data.validationResult,
        issues_found: data.issuesFound,
        requirements_missing: data.requirementsMissing || null,
        errors_blocking: data.errorsBlocking || null,
        action_taken: data.actionTaken,
        manager_approval_requested: data.managerApprovalRequested || false,
        manager_approval_justification: data.justification || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log enforcement action:', error);
      return null;
    }

    return logEntry?.id || null;
  } catch (error) {
    console.error('Error logging enforcement action:', error);
    return null;
  }
}

/**
 * Get attempt number for a form submission
 * Returns the next attempt number based on previous attempts
 */
export async function getAttemptNumber(
  formType: 'nca' | 'mjc',
  formId: string | undefined,
  userId: string
): Promise<number> {
  try {
    if (!formId) {
      // If no form ID, this is likely a first attempt
      return 1;
    }

    const supabase = createServerClient();

    const { data, error } = await (supabase
      .from('enforcement_log') as any)
      .select('attempt_number')
      .eq('form_type', formType)
      .eq('form_id', formId)
      .eq('user_id', userId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // No previous attempts found, this is attempt 1
      return 1;
    }

    // Return next attempt number
    return ((data).attempt_number || 0) + 1;
  } catch (error) {
    console.error('Error getting attempt number:', error);
    // Default to attempt 1 on error
    return 1;
  }
}

/**
 * Record manager approval decision
 */
export async function recordManagerApproval(
  logId: string,
  managerId: string,
  approved: boolean,
  notes?: string
): Promise<boolean> {
  try {
    const supabase = createServerClient();

    const { error } = await (supabase.rpc as any)('record_manager_approval', {
      p_log_id: logId,
      p_manager_id: managerId,
      p_approved: approved,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Failed to record manager approval:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recording manager approval:', error);
    return false;
  }
}

