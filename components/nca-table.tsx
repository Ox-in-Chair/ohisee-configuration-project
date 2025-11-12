/**
 * NCA Table Component
 *
 * Interactive table for NCA Register with filtering, sorting, and search
 * Features:
 * - Status filter (all, open, closed, investigation, pending_approval)
 * - Search across NCA number and descriptions
 * - Sortable columns
 * - Click row to navigate to detail view
 * - Responsive design with hover states
 *
 * @requires shadcn/ui components: Select, Input, Button, Table
 */

'use client';

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';

import type {
  NCAData,
  NCAFilterState,
  NCAStatus,
  SortColumn,
  SortDirection,
} from '@/lib/types/nca-filter';
import { DEFAULT_FILTER_STATE, NCAFilterUtils } from '@/lib/types/nca-filter';

/**
 * Props for NCATable component
 */
interface NCATableProps {
  /**
   * Array of NCA data to display
   */
  ncas: NCAData[];

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Error message
   */
  error?: string;

  /**
   * Server-side pagination props
   */
  total?: number;
  currentPage?: number;
  totalPages?: number;
  initialStatus?: string;
  initialSearch?: string;
  initialSort?: string;
  initialSortDir?: 'asc' | 'desc';
}

/**
 * Debounce hook for search input
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Status badge variant mapping
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'open':
      return 'default';
    case 'closed':
      return 'secondary';
    case 'investigation':
      return 'destructive';
    case 'pending_approval':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * NCA Table Component
 * Wrapped with React.memo to prevent unnecessary re-renders
 */
export const NCATable = memo(function NCATable({
  ncas,
  loading = false,
  error,
  total,
  currentPage: initialPage = 1,
  totalPages: initialTotalPages = 1,
  initialStatus = 'all',
  initialSearch = '',
  initialSort = 'created_at',
  initialSortDir = 'desc',
}: NCATableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state management (initialize from URL params)
  const [filterState, setFilterState] = useState<NCAFilterState>({
    ...DEFAULT_FILTER_STATE,
    status: (initialStatus as NCAStatus) || 'all',
    searchQuery: initialSearch || '',
    sortColumn: (initialSort as SortColumn) || 'created_at',
    sortDirection: initialSortDir || 'desc',
  });
  const [searchInput, setSearchInput] = useState(initialSearch);
  
  // Pagination state (initialize from URL params)
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 25;

  // Debounce search query (300ms)
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  /**
   * Update URL parameters when filters change
   */
  const updateURLParams = useCallback(
    (updates: {
      page?: number;
      status?: string;
      search?: string;
      sort?: string;
      sortDir?: 'asc' | 'desc';
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete('page');
        } else {
          params.set('page', updates.page.toString());
        }
      }
      
      if (updates.status !== undefined) {
        if (updates.status === 'all') {
          params.delete('status');
        } else {
          params.set('status', updates.status);
        }
      }
      
      if (updates.search !== undefined) {
        if (!updates.search.trim()) {
          params.delete('search');
        } else {
          params.set('search', updates.search);
        }
      }
      
      if (updates.sort !== undefined) {
        params.set('sort', updates.sort);
      }
      
      if (updates.sortDir !== undefined) {
        params.set('sortDir', updates.sortDir);
      }

      // Reset to page 1 when filters change (except when explicitly setting page)
      if (updates.page === undefined && (updates.status !== undefined || updates.search !== undefined)) {
        params.delete('page');
      }

      router.push(`/nca/register?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Update filter state and URL when debounced search changes
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setFilterState(prev => ({
        ...prev,
        searchQuery: debouncedSearchQuery,
      }));
      updateURLParams({ search: debouncedSearchQuery, page: 1 });
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [debouncedSearchQuery, updateURLParams]);

  /**
   * Handle status filter change
   */
  const handleStatusChange = useCallback(
    (status: string) => {
      setFilterState(prev => ({
        ...prev,
        status: status as NCAStatus,
      }));
      updateURLParams({ status, page: 1 });
    },
    [updateURLParams]
  );

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    []
  );

  /**
   * Handle clear filters
   */
  const handleClearFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
    setSearchInput('');
    updateURLParams({ status: 'all', search: '', page: 1 });
  }, [updateURLParams]);

  /**
   * Handle sort column click
   */
  const handleSort = useCallback(
    (column: SortColumn) => {
      setFilterState(prev => {
        const { sortColumn, sortDirection } = NCAFilterUtils.toggleSortDirection(
          prev.sortColumn,
          prev.sortDirection,
          column
        );
        updateURLParams({ sort: sortColumn, sortDir: sortDirection });
        return {
          ...prev,
          sortColumn,
          sortDirection,
        };
      });
    },
    [updateURLParams]
  );

  /**
   * Handle row click - navigate to detail view
   */
  const handleRowClick = useCallback(
    (nca: NCAData) => {
      // Navigate to detail page using NCA number as slug
      const slug = nca.nca_number.toLowerCase().replace(/[^a-z0-9]/g, '-');
      router.push(`/nca-register/${slug}`);
    },
    [router]
  );

  /**
   * Use server-side paginated data (no client-side filtering needed)
   */
  const paginatedNCAs = ncas;
  const totalPages = initialTotalPages;
  const totalCount = total || ncas.length;

  // Calculate pagination indices for display
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + paginatedNCAs.length;

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filterState.status !== 'all' ||
      filterState.searchQuery.trim() !== ''
    );
  }, [filterState]);

  /**
   * Render sort icon for column header
   */
  const renderSortIcon = (column: SortColumn) => {
    if (filterState.sortColumn !== column) {
      return <Icon name={ICONS.ARROW_UP_DOWN} size="sm" className="ml-2 opacity-50" />;
    }

    return filterState.sortDirection === 'asc' ? (
      <Icon name={ICONS.ARROW_UP} size="sm" className="ml-2" />
    ) : (
      <Icon name={ICONS.ARROW_DOWN} size="sm" className="ml-2" />
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-500">Loading NCAs...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-critical-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
            Status:
          </label>
          <Select
            value={filterState.status}
            onValueChange={handleStatusChange}
            data-testid="nca-status-filter"
          >
            <SelectTrigger className="w-[180px]" id="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="investigation">Investigation</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <Icon name={ICONS.SEARCH} size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search NCA number or description..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-10"
              data-testid="nca-search-input"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters ? <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="flex items-center gap-2 whitespace-nowrap"
            data-testid="nca-clear-filters"
          >
            <Icon name={ICONS.CLOSE} size="sm" />
            Clear Filters
          </Button> : null}
      </div>

      {/* Results Count and Pagination Info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {paginatedNCAs.length > 0 ? (
            <>
              Showing {startIndex + 1} to {endIndex} of {totalCount} NCAs
              {hasActiveFilters ? ` (filtered from ${totalCount} total)` : null}
            </>
          ) : (
            <>No NCAs found</>
          )}
        </div>
        {totalPages > 1 && (
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('nca_number')}
                  className="h-8 px-2 font-semibold hover:bg-gray-100"
                >
                  NCA Number
                  {renderSortIcon('nca_number')}
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('status')}
                  className="h-8 px-2 font-semibold hover:bg-gray-100"
                >
                  Status
                  {renderSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead className="w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('nc_type')}
                  className="h-8 px-2 font-semibold hover:bg-gray-100"
                >
                  Type
                  {renderSortIcon('nc_type')}
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('created_at')}
                  className="h-8 px-2 font-semibold hover:bg-gray-100"
                >
                  Created
                  {renderSortIcon('created_at')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedNCAs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {hasActiveFilters ? (
                    <div className="space-y-2">
                      <p className="font-medium">No NCAs match your filters</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    <p>No NCAs found</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paginatedNCAs.map(nca => (
                <TableRow
                  key={nca.id}
                  onClick={() => handleRowClick(nca)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  data-testid="nca-table-row"
                >
                  <TableCell className="font-medium font-alt">
                    {nca.nca_number}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(nca.status)}>
                      {nca.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {nca.nc_type}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="line-clamp-2">
                      {nca.nc_description}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 font-alt">
                    {formatDate(nca.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {paginatedNCAs.length > 0 && (
              <>Showing {startIndex + 1} to {endIndex} of {totalCount}</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateURLParams({ page: Math.max(1, currentPage - 1) })}
              disabled={currentPage === 1}
              data-testid="nca-pagination-prev"
            >
              <Icon name={ICONS.CHEVRON_LEFT} size="sm" />
              Previous
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateURLParams({ page: pageNum })}
                    className="min-w-[40px]"
                    data-testid={`nca-pagination-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => updateURLParams({ page: Math.min(totalPages, currentPage + 1) })}
              disabled={currentPage === totalPages}
              data-testid="nca-pagination-next"
            >
              Next
              <Icon name={ICONS.CHEVRON_RIGHT} size="sm" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if ncas data changed
  // Ignore loading state changes, pagination changes to parent
  // Return true if props are equal (skip re-render), false if different (re-render)
  return JSON.stringify(prevProps.ncas) === JSON.stringify(nextProps.ncas);
});
