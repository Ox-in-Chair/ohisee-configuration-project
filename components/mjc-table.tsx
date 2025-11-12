/**
 * MJC Register Table Component
 * Enhanced with filtering, sorting, and search interactions
 * Implements TDD requirements with Stagehand E2E test coverage
 */

'use client';

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type MJCFilterState,
  type MJCTableData,
  type MJCStatus,
  type MJCUrgencyLevel,
  type MJCMaintenanceType,
  type MJCMachineStatus,
  type MJCSortField,
  type MJCSortDirection,
  defaultMJCFilterState,
  hasActiveFilters,
  getActiveFilterCount,
} from '@/lib/types/mjc-filter';

interface MJCTableProps {
  data: MJCTableData[];
  isLoading?: boolean;
  total?: number;
  currentPage?: number;
  totalPages?: number;
  initialStatus?: string;
  initialUrgency?: string;
  initialSearch?: string;
  initialSort?: string;
  initialSortDir?: 'asc' | 'desc';
}

/**
 * MJC Table with advanced filtering, sorting, and search
 * All features implemented with React hooks and TypeScript
 * Server-side pagination with URL parameter sync
 * Wrapped with React.memo to prevent unnecessary re-renders
 */
export const MJCTable = memo(function MJCTable({
  data,
  isLoading = false,
  total,
  currentPage: initialPage = 1,
  totalPages: initialTotalPages = 1,
  initialStatus = 'all',
  initialUrgency = 'all',
  initialSearch = '',
  initialSort = 'created_at',
  initialSortDir = 'desc',
}: MJCTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state management (initialize from URL params)
  const [filterState, setFilterState] = useState<MJCFilterState>({
    ...defaultMJCFilterState,
    status: (initialStatus as MJCStatus) || 'all',
    urgency: (initialUrgency as MJCUrgencyLevel) || 'all',
    searchQuery: initialSearch || '',
    sortField: (initialSort as MJCSortField) || 'created_at',
    sortDirection: initialSortDir || 'desc',
  });

  // Debounced search state
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Pagination state (initialize from URL params)
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 25;

  // Handle row click navigation
  const handleRowClick = useCallback((mjcId: string) => {
    router.push(`/mjc/${mjcId}`);
  }, [router]);

  /**
   * Update URL parameters when filters change
   */
  const updateURLParams = useCallback(
    (updates: {
      page?: number;
      status?: string;
      urgency?: string;
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
      
      if (updates.urgency !== undefined) {
        if (updates.urgency === 'all') {
          params.delete('urgency');
        } else {
          params.set('urgency', updates.urgency);
        }
      }
      
      if (updates.search !== undefined) {
        if (updates.search === '') {
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
      
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search input (300ms) and update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setFilterState((prev) => ({ ...prev, searchQuery: searchInput }));
      updateURLParams({ search: searchInput, page: 1 });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, updateURLParams]);

  // Use server-side paginated data (no client-side filtering needed)
  const paginatedData = data;
  const totalPages = initialTotalPages;
  const totalCount = total || data.length;

  // Filter handlers (update URL params)
  const handleStatusChange = useCallback(
    (value: string) => {
      setFilterState((prev) => ({
        ...prev,
        status: value === 'all' ? null : (value as MJCStatus),
      }));
      updateURLParams({ status: value, page: 1 });
    },
    [updateURLParams]
  );

  const handleUrgencyChange = useCallback(
    (value: string) => {
      setFilterState((prev) => ({
        ...prev,
        urgency: value === 'all' ? null : (value as MJCUrgencyLevel),
      }));
      updateURLParams({ urgency: value, page: 1 });
    },
    [updateURLParams]
  );

  const handleMaintenanceTypeChange = useCallback(
    (value: string) => {
      setFilterState((prev) => ({
        ...prev,
        maintenanceType: value === 'all' ? null : (value as MJCMaintenanceType),
      }));
      updateURLParams({ page: 1 });
    },
    [updateURLParams]
  );

  const handleMachineStatusChange = useCallback(
    (value: string) => {
      setFilterState((prev) => ({
        ...prev,
        machineStatus: value === 'all' ? null : (value as MJCMachineStatus),
      }));
      updateURLParams({ page: 1 });
    },
    [updateURLParams]
  );

  const handleTemporaryRepairToggle = useCallback(
    (checked: boolean) => {
      setFilterState((prev) => ({
        ...prev,
        temporaryRepairOnly: checked,
      }));
      updateURLParams({ page: 1 });
    },
    [updateURLParams]
  );

  const handleSort = useCallback(
    (field: MJCSortField) => {
      setFilterState((prev) => {
        const newDirection =
          prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc';
        updateURLParams({ sort: field, sortDir: newDirection });
        return {
          ...prev,
          sortField: field,
          sortDirection: newDirection,
        };
      });
    },
    [updateURLParams]
  );

  const handleClearFilters = useCallback(() => {
    setFilterState(defaultMJCFilterState);
    setSearchInput('');
    setDebouncedSearch('');
    updateURLParams({ status: 'all', urgency: 'all', search: '', page: 1 });
  }, [updateURLParams]);

  // Helper function to get urgency badge color
  const getUrgencyColor = (urgency: MJCUrgencyLevel): string => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Helper function to get status badge color
  const getStatusColor = (status: MJCStatus): string => {
    switch (status) {
      case 'open':
        return 'bg-blue-500 text-white';
      case 'in_progress':
        return 'bg-purple-500 text-white';
      case 'completed':
        return 'bg-green-600 text-white';
      case 'closed':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>MJC Register Filters</span>
            {hasActiveFilters(filterState) && (
              <span className="text-sm font-normal text-gray-600">
                {getActiveFilterCount(filterState)} active filter
                {getActiveFilterCount(filterState) !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="col-span-full">
              <Label htmlFor="mjc-search-input">Search</Label>
              <Input
                id="mjc-search-input"
                data-testid="mjc-search-input"
                type="text"
                placeholder="Search by MJC number, machine, or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Searches across MJC number, machine ID, and description
              </p>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="mjc-status-filter">Status</Label>
              <Select
                value={filterState.status || 'all'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger id="mjc-status-filter" data-testid="mjc-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Filter */}
            <div>
              <Label htmlFor="mjc-urgency-filter">Urgency</Label>
              <Select
                value={filterState.urgency || 'all'}
                onValueChange={handleUrgencyChange}
              >
                <SelectTrigger id="mjc-urgency-filter" data-testid="mjc-urgency-filter">
                  <SelectValue placeholder="All urgency levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All urgency levels</SelectItem>
                  <SelectItem value="critical">Critical (&lt;1hr)</SelectItem>
                  <SelectItem value="high">High (&lt;4hrs)</SelectItem>
                  <SelectItem value="medium">Medium (&lt;24hrs)</SelectItem>
                  <SelectItem value="low">Low (&gt;24hrs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Maintenance Type Filter */}
            <div>
              <Label htmlFor="mjc-type-filter">Maintenance Type</Label>
              <Select
                value={filterState.maintenanceType || 'all'}
                onValueChange={handleMaintenanceTypeChange}
              >
                <SelectTrigger id="mjc-type-filter" data-testid="mjc-type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="pneumatical">Pneumatical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Machine Status Filter */}
            <div>
              <Label htmlFor="mjc-machine-status-filter">Machine Status</Label>
              <Select
                value={filterState.machineStatus || 'all'}
                onValueChange={handleMachineStatusChange}
              >
                <SelectTrigger id="mjc-machine-status-filter" data-testid="mjc-machine-status-filter">
                  <SelectValue placeholder="All machine statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All machine statuses</SelectItem>
                  <SelectItem value="down">Machine Down</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temporary Repair Toggle */}
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mjc-temp-repair-toggle"
                  data-testid="mjc-temp-repair-toggle"
                  checked={filterState.temporaryRepairOnly}
                  onCheckedChange={handleTemporaryRepairToggle}
                />
                <Label htmlFor="mjc-temp-repair-toggle" className="font-normal cursor-pointer">
                  Temporary repairs only
                </Label>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters(filterState) && (
              <div className="flex items-end">
                <Button
                  data-testid="mjc-clear-filters"
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {totalCount > 0 ? (
            <>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} MJC
              {totalCount !== 1 ? 's' : ''}
            </>
          ) : (
            <>No MJCs found</>
          )}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Label className="text-sm">Sort by:</Label>
          <Select
            value={filterState.sortField}
            onValueChange={(value) => handleSort(value as MJCSortField)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="mjc_number">MJC Number</SelectItem>
              <SelectItem value="urgency_level">Urgency Level</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilterState((prev) => ({
                ...prev,
                sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
              }))
            }
          >
            {filterState.sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading MJCs...</div>
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 font-medium">No MJCs found</p>
              <p className="text-sm text-gray-400 mt-2">
                {hasActiveFilters(filterState)
                  ? 'Try adjusting your filters'
                  : 'No maintenance job cards available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="mjc-table">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('mjc_number')}
                    >
                      MJC Number{' '}
                      {filterState.sortField === 'mjc_number' &&
                        (filterState.sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      Created Date{' '}
                      {filterState.sortField === 'created_at' &&
                        (filterState.sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Machine
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Maintenance Type
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('urgency_level')}
                    >
                      Urgency{' '}
                      {filterState.sortField === 'urgency_level' &&
                        (filterState.sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((mjc) => (
                    <tr
                      key={mjc.id}
                      data-testid={`mjc-row-${mjc.id}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(mjc.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-600">
                        {mjc.mjc_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          data-testid="status-badge"
                          className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                            mjc.status
                          )}`}
                        >
                          {mjc.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mjc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {mjc.machine_equipment_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">
                        {mjc.maintenance_category || mjc.maintenance_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          data-testid="urgency-badge"
                          className={`px-2 py-1 text-xs font-semibold rounded ${getUrgencyColor(
                            mjc.urgency_level
                          )}`}
                        >
                          {mjc.urgency_level.toLowerCase()}
                        </span>
                        {mjc.temporary_repair === 'yes' && (
                          <span
                            data-testid="temp-repair-badge"
                            className="ml-2 px-2 py-1 text-xs font-semibold rounded bg-orange-500 text-white"
                          >
                            Due in 10 days
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {totalCount > 0 && (
              <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateURLParams({ page: Math.max(1, currentPage - 1) })}
              disabled={currentPage === 1}
              data-testid="mjc-pagination-prev"
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
                    data-testid={`mjc-pagination-page-${pageNum}`}
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
              data-testid="mjc-pagination-next"
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
  // Custom comparison: only re-render if data array changed
  // Ignore loading state changes, pagination changes to parent
  // Return true if props are equal (skip re-render), false if different (re-render)
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});
