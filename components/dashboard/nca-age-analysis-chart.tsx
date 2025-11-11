'use client';

/**
 * NCA Age Analysis Chart
 * Procedure 5.7.F2: Age analysis showing closure time distribution
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

export interface AgeAnalysisData {
  month: string;
  lessThan10Days: number;
  lessThan20Days: number;
  lessThan30Days: number;
  moreThan30Days: number;
}

interface NCAAgeAnalysisChartProps {
  data: AgeAnalysisData[];
}

export function NCAAgeAnalysisChart({ data }: NCAAgeAnalysisChartProps) {
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
        <Bar dataKey="lessThan10Days" name="<10 Days" stackId="age" fill="#10b981" />
        <Bar dataKey="lessThan20Days" name="<20 Days" stackId="age" fill="#3b82f6" />
        <Bar dataKey="lessThan30Days" name="<30 Days" stackId="age" fill="#f59e0b" />
        <Bar dataKey="moreThan30Days" name=">30 Days" stackId="age" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}

