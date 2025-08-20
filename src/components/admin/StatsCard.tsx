'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
  isRealTime?: boolean;
  trend?: number;
}

export default function StatsCard({ 
  title, 
  value, 
  subtitle, 
  change, 
  icon, 
  color = 'blue', 
  loading = false, 
  isRealTime = false, 
  trend 
}: StatsCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
            <div className="ml-6">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; icon: string; gradient: string }> = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        icon: 'text-blue-600 dark:text-blue-400',
        gradient: 'from-blue-500/10 to-blue-600/5'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/10',
        icon: 'text-green-600 dark:text-green-400',
        gradient: 'from-green-500/10 to-green-600/5'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/10',
        icon: 'text-purple-600 dark:text-purple-400',
        gradient: 'from-purple-500/10 to-purple-600/5'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        icon: 'text-orange-600 dark:text-orange-400',
        gradient: 'from-orange-500/10 to-orange-600/5'
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/10',
        icon: 'text-red-600 dark:text-red-400',
        gradient: 'from-red-500/10 to-red-600/5'
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/10',
        icon: 'text-yellow-600 dark:text-yellow-400',
        gradient: 'from-yellow-500/10 to-yellow-600/5'
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/10',
        icon: 'text-indigo-600 dark:text-indigo-400',
        gradient: 'from-indigo-500/10 to-indigo-600/5'
      },
      pink: {
        bg: 'bg-pink-50 dark:bg-pink-900/10',
        icon: 'text-pink-600 dark:text-pink-400',
        gradient: 'from-pink-500/10 to-pink-600/5'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-200 group">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl`}></div>
      <div className="relative p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {title}
              </h3>
              {isRealTime && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  <span>Live</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline space-x-3">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {change && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  change.type === 'increase' 
                    ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20' 
                    : change.type === 'decrease'
                    ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
                    : 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
                }`}>
                  {change.type === 'increase' && <TrendingUp className="w-3 h-3" />}
                  {change.type === 'decrease' && <TrendingDown className="w-3 h-3" />}
                  {change.type === 'neutral' && <Minus className="w-3 h-3" />}
                  <span>{change.value}</span>
                </div>
              )}
              {trend !== undefined && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  trend > 0 
                    ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20' 
                    : trend < 0
                    ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
                    : 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
                }`}>
                  {trend > 0 && <TrendingUp className="w-3 h-3" />}
                  {trend < 0 && <TrendingDown className="w-3 h-3" />}
                  {trend === 0 && <Minus className="w-3 h-3" />}
                  <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`relative p-3 rounded-xl ${colorClasses.bg} group-hover:scale-110 transition-transform duration-200`}>
            <div className={`w-6 h-6 ${colorClasses.icon}`}>
              {icon}
            </div>
            {isRealTime && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}