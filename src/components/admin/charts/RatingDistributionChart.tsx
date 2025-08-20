'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RatingDistributionChartProps {
  data: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  className?: string;
}

export default function RatingDistributionChart({ data, className = '' }: RatingDistributionChartProps) {
  // Color scheme for different ratings (1-5 stars)
  const getBarColor = (rating: number) => {
    const colors = {
      1: '#EF4444', // Red
      2: '#F97316', // Orange
      3: '#EAB308', // Yellow
      4: '#22C55E', // Green
      5: '#10B981'  // Emerald
    };
    return colors[rating as keyof typeof colors] || '#6B7280';
  };

  const formatTooltip = (value: number, name: string, props: { payload?: { percentage: number; rating: number } }) => {
    const payload = props?.payload;
    if (!payload) return [`${value} responses`];
    return [
      `${value} responses (${payload.percentage}%)`,
      `${payload.rating} Star${payload.rating !== 1 ? 's' : ''}`
    ];
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Rating Distribution
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="rating" 
              tickFormatter={(value) => `${value}★`}
              className="text-sm text-gray-600 dark:text-gray-400"
            />
            <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '8px',
                color: 'var(--tooltip-text)'
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.rating)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2 text-sm">
        {data.map((item) => (
          <div key={item.rating} className="text-center">
            <div 
              className="w-4 h-4 rounded mx-auto mb-1"
              style={{ backgroundColor: getBarColor(item.rating) }}
            />
            <div className="text-gray-600 dark:text-gray-400">
              {item.rating}★: {item.percentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}