'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HourlyActivityChartProps {
  data: Array<{
    hour: string;
    responses: number;
    sessions: number;
  }>;
}

export default function HourlyActivityChart({ data }: HourlyActivityChartProps) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="hour" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number, name: string) => [
              value,
              name === 'responses' ? 'Responses' : 'Sessions'
            ]}
            labelFormatter={(label) => `Hour: ${label}`}
          />
          <Bar 
            dataKey="responses" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            name="responses"
          />
          <Bar 
            dataKey="sessions" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]}
            name="sessions"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}