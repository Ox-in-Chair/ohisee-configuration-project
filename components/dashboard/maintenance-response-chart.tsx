'use client';

/**
 * Maintenance Response Chart Component
 * Displays average response time by urgency level
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface MaintenanceResponseData {
  urgency: string;
  avgHours: number;
}

interface MaintenanceResponseChartProps {
  data: MaintenanceResponseData[];
}

export function MaintenanceResponseChart({ data }: MaintenanceResponseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  // Color mapping for urgency levels
  const getBarColor = (urgency: string): string => {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return '#dc2626'; // red
      case 'high':
        return '#ea580c'; // orange
      case 'medium':
        return '#f59e0b'; // yellow
      case 'low':
        return '#10b981'; // green
      default:
        return '#3b82f6'; // blue
    }
  };

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="urgency" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
          formatter={(value: number) => `${value} hours`}
        />
        <Legend />
        <Bar 
          dataKey="avgHours" 
          name="Avg Response Time (hours)"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.urgency)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

