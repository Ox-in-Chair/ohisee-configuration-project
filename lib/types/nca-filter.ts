/**
 * NCA Filter Types
 *
 * Type definitions for NCA register filtering, sorting, and search
 * Used by nca-table component for state management
 */

/**
 * NCA Status values for filtering
 */
export type NCAStatus = 'all' | 'open' | 'closed' | 'investigation' | 'pending_approval';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sortable columns in NCA table
 */
export type SortColumn = 'nca_number' | 'status' | 'created_at' | 'nc_type';

/**
 * Filter state for NCA register
 */
export interface NCAFilterState {
  /**
   * Status filter - 'all' shows all NCAs
   */
  status: NCAStatus;

  /**
   * Search query - searches across NCA number and description
   */
  searchQuery: string;

  /**
   * Current sort column
   */
  sortColumn: SortColumn;

  /**
   * Current sort direction
   */
  sortDirection: SortDirection;
}

/**
 * Default filter state - shows all NCAs, sorted by created date descending
 */
export const DEFAULT_FILTER_STATE: NCAFilterState = {
  status: 'all',
  searchQuery: '',
  sortColumn: 'created_at',
  sortDirection: 'desc',
};

/**
 * NCA data structure (matches database schema)
 */
export interface NCAData {
  id: string;
  nca_number: string;
  status: string;
  nc_type: string;
  product_description: string;
  nc_description: string;
  created_at: string;
  updated_at: string;
  created_by: string;

  // Optional fields for detailed view
  section_3?: {
    supplier_name?: string;
    supplier_batch?: string;
    carton_numbers?: string;
  };
  section_4?: {
    root_cause?: string;
    corrective_action?: string;
  };
}

/**
 * Filter utility functions
 */
export const NCAFilterUtils = {
  /**
   * Check if NCA matches current filter state
   */
  matchesFilter(nca: NCAData, filterState: NCAFilterState): boolean {
    // Status filter
    if (filterState.status !== 'all' && nca.status.toLowerCase() !== filterState.status) {
      return false;
    }

    // Search query (case-insensitive search across NCA number and descriptions)
    if (filterState.searchQuery.trim() !== '') {
      const query = filterState.searchQuery.toLowerCase();
      const searchableText = [
        nca.nca_number,
        nca.nc_description,
        nca.product_description,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  },

  /**
   * Sort NCAs based on sort column and direction
   */
  sortNCAs(ncas: NCAData[], sortColumn: SortColumn, sortDirection: SortDirection): NCAData[] {
    const sorted = [...ncas].sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortColumn) {
        case 'nca_number':
          aValue = a.nca_number;
          bValue = b.nca_number;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'nc_type':
          aValue = a.nc_type;
          bValue = b.nc_type;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // String comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  },

  /**
   * Apply all filters and sorting to NCA list
   */
  applyFilters(ncas: NCAData[], filterState: NCAFilterState): NCAData[] {
    // Filter
    const filtered = ncas.filter(nca => this.matchesFilter(nca, filterState));

    // Sort
    const sorted = this.sortNCAs(filtered, filterState.sortColumn, filterState.sortDirection);

    return sorted;
  },

  /**
   * Reset filter state to defaults
   */
  resetFilters(): NCAFilterState {
    return { ...DEFAULT_FILTER_STATE };
  },

  /**
   * Toggle sort direction for a column
   */
  toggleSortDirection(
    currentColumn: SortColumn,
    currentDirection: SortDirection,
    newColumn: SortColumn
  ): { sortColumn: SortColumn; sortDirection: SortDirection } {
    // If clicking the same column, toggle direction
    if (currentColumn === newColumn) {
      return {
        sortColumn: newColumn,
        sortDirection: currentDirection === 'asc' ? 'desc' : 'asc',
      };
    }

    // If clicking a different column, default to ascending
    return {
      sortColumn: newColumn,
      sortDirection: 'asc',
    };
  },
};
