'use client';

/**
 * NCA Category Breakdown Chart
 * Procedure 5.7.F2: Issue category breakdown
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface NCACategoryBreakdownChartProps {
  data: CategoryBreakdown[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ea580c', '#dc2626', '#8b5cf6', '#ec4899'];

export function NCACategoryBreakdownChart({ data }: NCACategoryBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  // Sort by count descending and take top 10
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          width={90}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value} NCAs`, 'Count']}
        />
        <Bar dataKey="count" name="NCA Count">
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

