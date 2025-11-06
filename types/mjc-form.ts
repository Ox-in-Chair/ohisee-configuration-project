/**
 * MJC Form Types
 * TypeScript type definitions for Maintenance Job Card form
 */

import type { MJCFormData } from '@/lib/validations/mjc-schema';

/**
 * Re-export form data type from schema
 */
export type { MJCFormData };

/**
 * Maintenance category type
 */
export type MaintenanceCategory = 'reactive' | 'planned';

/**
 * Maintenance type
 */
export type MaintenanceType = 'electrical' | 'mechanical' | 'pneumatical' | 'other';

/**
 * Machine status type
 */
export type MachineStatus = 'down' | 'operational';

/**
 * Urgency level type
 */
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Temporary repair status type
 */
export type TemporaryRepair = 'yes' | 'no';

/**
 * Hygiene checklist item interface
 */
export interface HygieneChecklistItem {
  id: number;
  label: string;
  checked: boolean;
}

/**
 * Form submission status
 */
export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Character counter status for visual feedback
 */
export type CharacterCounterStatus = 'error' | 'warning' | 'success';
