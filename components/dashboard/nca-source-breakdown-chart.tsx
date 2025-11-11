'use client';

/**
 * NCA Source Breakdown Chart
 * Procedure 5.7.F2: Source breakdown (Kangopak vs Supplier vs Customer)
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

export interface SourceBreakdown {
  source: 'kangopak' | 'supplier' | 'customer';
  count: number;
  percentage: number;
}

interface NCASourceBreakdownChartProps {
  data: SourceBreakdown[];
}

const COLORS = {
  kangopak: '#3b82f6',
  supplier: '#ea580c',
  customer: '#10b981',
};

const LABELS = {
  kangopak: 'Kangopak',
  supplier: 'Supplier',
  customer: 'Customer',
};

export function NCASourceBreakdownChart({ data }: NCASourceBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: LABELS[item.source],
    value: item.count,
    percentage: item.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: { name?: string; percent?: number }) => `${props.name || ''}: ${props.percent ? (props.percent * 100).toFixed(1) : 0}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => {
            const source = data[index]?.source;
            return (
              <Cell
                key={`cell-${index}`}
                fill={source ? COLORS[source] : '#8884d8'}
              />
            );
          })}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value} NCAs (${props.payload.percentage}%)`,
            name,
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

