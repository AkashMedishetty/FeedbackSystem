'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ConsultationTypeChartProps {
  data: Array<{
    type: string;
    count: number;
    percentage: number;
    averageRating: number;
  }>;
  className?: string;
}

export default function ConsultationTypeChart({ data, className = '' }: ConsultationTypeChartProps) {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'first-visit': 'First Visit',
      'follow-up': 'Follow-up',
      'regular': 'Regular',
      'custom': 'Custom'
    };
    return labels[type] || type;
  };

  const formatTooltip = (value: number, name: string, props: { payload?: { percentage: number; averageRating: number } }) => {
    const payload = props?.payload;
    if (!payload) return [`${value} responses`];
    return [
      `${value} responses (${payload.percentage}%)`,
      `Avg Rating: ${payload.averageRating}★`
    ];
  };

  const renderCustomLabel = (props: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (!cx || !cy || midAngle === undefined || !innerRadius || !outerRadius || !percent) return null;
    if (percent < 0.05) return null; // Don't show label for slices smaller than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Consultation Types
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '8px',
                color: 'var(--tooltip-text)'
              }}
            />
            <Legend 
              formatter={(value) => formatLabel(value)}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.type} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {formatLabel(item.type)}
              </span>
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {item.count} ({item.percentage}%) • {item.averageRating}★
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}