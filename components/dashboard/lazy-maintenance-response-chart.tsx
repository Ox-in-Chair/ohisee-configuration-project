/**
 * Lazy Maintenance Response Chart
 *
 * Client-side wrapper for MaintenanceResponseChart that fetches data on-demand when visible.
 * This component is lazy-loaded using the LazyComponent wrapper.
 *
 * Performance improvement: Only fetches data when scrolled into view
 */

'use client';

import { useState, useEffect } from 'react';
import { MaintenanceResponseChart } from './maintenance-response-chart';
import { MaintenanceResponseChartSkeleton } from './skeletons';
import { getMaintenanceResponseData } from '@/app/actions/dashboard-actions';

interface MaintenanceResponseData {
  urgency: string;
  avgHours: number;
}

export function LazyMaintenanceResponseChart() {
  const [data, setData] = useState<MaintenanceResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const responseData = await getMaintenanceResponseData();
        setData(responseData);
      } catch (err) {
        console.error('Error fetching maintenance response data:', err);
        setError('Failed to load response data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <MaintenanceResponseChartSkeleton />;
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  return <MaintenanceResponseChart data={data} />;
}
