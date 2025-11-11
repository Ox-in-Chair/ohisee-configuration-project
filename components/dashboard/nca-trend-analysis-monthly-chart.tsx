'use client';

/**
 * NCA Trend Analysis Monthly Chart
 * Procedure 5.7.F2: Monthly trends showing opened vs closed NCAs
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface MonthlyTrendData {
  month: string;
  opened: number;
  closed: number;
  stillOpen: number;
}

interface NCTrendAnalysisMonthlyChartProps {
  data: MonthlyTrendData[];
}

export function NCTrendAnalysisMonthlyChart({ data }: NCTrendAnalysisMonthlyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="month"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Legend />
        <Bar dataKey="opened" name="Opened" fill="#3b82f6" />
        <Bar dataKey="closed" name="Closed" fill="#10b981" />
        <Bar dataKey="stillOpen" name="Still Open" fill="#f59e0b" />
      </BarChart>
    </ResponsiveContainer>
  );
}

