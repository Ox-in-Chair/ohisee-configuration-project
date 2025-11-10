/**
 * MJC Filter Type Definitions
 * TypeScript interfaces for filter state management in MJC Register
 */

export type MJCStatus = 'open' | 'in_progress' | 'completed' | 'closed';
export type MJCUrgencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type MJCMaintenanceType = 'electrical' | 'mechanical' | 'pneumatical' | 'other';
export type MJCMachineStatus = 'down' | 'operational';
export type MJCSortField = 'created_at' | 'mjc_number' | 'urgency_level' | 'status';
export type MJCSortDirection = 'asc' | 'desc';

/**
 * Filter state for MJC Register table
 */
export interface MJCFilterState {
  // Search
  searchQuery: string;

  // Status filters
  status: MJCStatus | null;
  urgency: MJCUrgencyLevel | null;
  maintenanceType: MJCMaintenanceType | null;
  machineStatus: MJCMachineStatus | null;

  // Boolean filters
  temporaryRepairOnly: boolean;

  // Sort configuration
  sortField: MJCSortField;
  sortDirection: MJCSortDirection;
}

/**
 * Default filter state
 */
export const defaultMJCFilterState: MJCFilterState = {
  searchQuery: '',
  status: null,
  urgency: null,
  maintenanceType: null,
  machineStatus: null,
  temporaryRepairOnly: false,
  sortField: 'created_at',
  sortDirection: 'desc',
};

/**
 * MJC data interface for table display
 */
export interface MJCTableData {
  id: string;
  mjc_number: string;
  machine_equipment_id: string;
  maintenance_description: string;
  urgency_level: MJCUrgencyLevel;
  machine_status: MJCMachineStatus;
  maintenance_type: MJCMaintenanceType;
  temporary_repair: 'yes' | 'no';
  status: MJCStatus;
  created_at: string;
  updated_at: string;
  maintenance_category?: 'reactive' | 'planned';
  raised_by?: string;
  department?: string;
}

/**
 * Filter actions for reducer pattern (optional)
 */
export type MJCFilterAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_STATUS'; payload: MJCStatus | null }
  | { type: 'SET_URGENCY'; payload: MJCUrgencyLevel | null }
  | { type: 'SET_MAINTENANCE_TYPE'; payload: MJCMaintenanceType | null }
  | { type: 'SET_MACHINE_STATUS'; payload: MJCMachineStatus | null }
  | { type: 'SET_TEMPORARY_REPAIR'; payload: boolean }
  | { type: 'SET_SORT'; payload: { field: MJCSortField; direction: MJCSortDirection } }
  | { type: 'CLEAR_FILTERS' };

/**
 * Helper function to check if any filters are active
 */
export function hasActiveFilters(filterState: MJCFilterState): boolean {
  return (
    filterState.searchQuery.length > 0 ||
    filterState.status !== null ||
    filterState.urgency !== null ||
    filterState.maintenanceType !== null ||
    filterState.machineStatus !== null ||
    filterState.temporaryRepairOnly
  );
}

/**
 * Helper function to get filter count
 */
export function getActiveFilterCount(filterState: MJCFilterState): number {
  let count = 0;
  if (filterState.searchQuery.length > 0) count++;
  if (filterState.status !== null) count++;
  if (filterState.urgency !== null) count++;
  if (filterState.maintenanceType !== null) count++;
  if (filterState.machineStatus !== null) count++;
  if (filterState.temporaryRepairOnly) count++;
  return count;
}
