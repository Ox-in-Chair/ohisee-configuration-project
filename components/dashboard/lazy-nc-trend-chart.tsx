/**
 * Lazy NC Trend Chart
 *
 * Client-side wrapper for NCTrendChart that fetches data on-demand when visible.
 * This component is lazy-loaded using the LazyComponent wrapper.
 *
 * Performance improvement: Only fetches data when scrolled into view
 */

'use client';

import { useState, useEffect } from 'react';
import { NCTrendChart } from './nc-trend-chart';
import { NCTrendChartSkeleton } from './skeletons';
import { getNCTrendData } from '@/app/actions/dashboard-actions';

interface NCTrendData {
  week: string;
  count: number;
}

export function LazyNCTrendChart() {
  const [data, setData] = useState<NCTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const trendData = await getNCTrendData();
        setData(trendData);
      } catch (err) {
        console.error('Error fetching NC trend data:', err);
        setError('Failed to load trend data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <NCTrendChartSkeleton />;
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  return <NCTrendChart data={data} />;
}
