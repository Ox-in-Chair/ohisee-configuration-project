/**
 * Dashboard Component Loading Skeletons
 *
 * Provides placeholder UI for lazy-loaded dashboard components.
 * Uses Tailwind's animate-pulse for shimmer effect.
 *
 * Skeleton Strategy:
 * - Match approximate size and layout of actual component
 * - Use neutral gray colors to indicate loading state
 * - Animate with pulse effect for visual feedback
 * - Keep markup lightweight for performance
 */

'use client';

/**
 * Generic Chart Skeleton
 * Used for bar charts, line charts, and other visualizations
 */
export function ChartSkeleton() {
  return (
    <div className="h-64 w-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading chart...</div>
    </div>
  );
}

/**
 * Tall Chart Skeleton
 * For charts with height={400} or similar
 */
export function TallChartSkeleton() {
  return (
    <div className="h-96 w-full bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading chart...</div>
    </div>
  );
}

/**
 * Table Skeleton
 * For data tables with rows
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-gray-300 rounded flex-1 animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="h-8 bg-gray-200 rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card Content Skeleton
 * For card-based content with stats or info
 */
export function CardContentSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
      <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

/**
 * Supplier Dashboard Skeleton
 * Specific skeleton for the supplier performance dashboard
 */
export function SupplierDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters Skeleton */}
      <div className="border rounded-lg p-6">
        <div className="h-6 w-24 bg-gray-300 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Summary Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="h-4 w-32 bg-gray-300 rounded animate-pulse mb-4" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-300 rounded animate-pulse mb-4" />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}

/**
 * NC Trend Chart Skeleton
 * Matches the line chart layout
 */
export function NCTrendChartSkeleton() {
  return (
    <div className="h-64 w-full relative">
      <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading trend data...</div>
      </div>
    </div>
  );
}

/**
 * Maintenance Response Chart Skeleton
 * Matches the bar chart layout
 */
export function MaintenanceResponseChartSkeleton() {
  return (
    <div className="h-64 w-full relative">
      <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading response data...</div>
      </div>
    </div>
  );
}
