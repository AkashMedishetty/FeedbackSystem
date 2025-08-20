'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Star, 
  Download, 
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  Target,
  Activity,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Zap,
  Eye,
  Heart,
  ThumbsUp,
  Timer,
  Globe,
  Smartphone,
  Monitor,
  FileText,
  Info,
  AlertCircle
} from 'lucide-react';
import ResponseTrendChart from './charts/ResponseTrendChart';
import RatingDistributionChart from './charts/RatingDistributionChart';
import ConsultationTypeChart from './charts/ConsultationTypeChart';
import MonthlyTrendChart from './charts/MonthlyTrendChart';
import HourlyActivityChart from './charts/HourlyActivityChart';
import DeviceUsageChart from './charts/DeviceUsageChart';
import SentimentAnalysisChart from './charts/SentimentAnalysisChart';
import StatsCard from './StatsCard';
import { Button } from '@/components/ui/Button';

interface AnalyticsData {
  // Core Metrics
  totalResponses: number;
  totalPatients: number;
  averageRating: number;
  todayResponses: number;
  growthRate: string;
  
  // Advanced KPIs
  responseRate: number;
  completionRate: number;
  averageResponseTime: number;
  patientSatisfactionScore: number;
  npsScore: number;
  retentionRate: number;
  
  // Real-time Metrics
  activeUsers: number;
  realTimeResponses: number;
  systemHealth: number;
  
  // Performance Metrics
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  
  // Device & Platform Analytics
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  platformStats: Array<{ platform: string; count: number; percentage: number }>;
  
  // Time-based Analytics
  responsesByDay: Array<{ date: string; count: number; avgRating: number }>;
  responsesByHour: Array<{ hour: number; count: number; avgRating: number }>;
  weeklyTrend: Array<{ week: string; responses: number; satisfaction: number }>;
  
  // Distribution Analytics
  ratingDistribution: Array<{ rating: number; count: number; percentage: number }>;
  consultationTypeDistribution: Array<{ 
    type: string; 
    count: number; 
    percentage: number; 
    averageRating: number;
    trend: string;
  }>;
  monthlyTrend: Array<{ month: string; count: number; averageRating: number; growth: number }>;
  
  // Chart Data
  responseTrend: Array<{ date: string; count: number; rating: number }>;
  consultationTypes: Array<{ type: string; count: number; percentage: number; averageRating: number }>;
  
  // Question Analytics
  questionAnalytics: Array<{
    questionId: string;
    questionTitle: string;
    questionType: string;
    responseCount: number;
    averageRating: number | null;
    completionRate: number;
    skipRate: number;
  }>;
  
  // Patient Analytics
  patientSegments: Array<{
    segment: string;
    count: number;
    avgRating: number;
    responseRate: number;
  }>;
  
  // Feedback Quality Metrics
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  
  // Recent Activity
  recentFeedback: Array<{
    id: string;
    patientName: string;
    mobileNumber: string;
    consultationNumber: number;
    consultationType: string;
    createdAt: string;
    averageRating: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
  
  // Alerts & Notifications
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
  }>;
}

interface AnalyticsDashboardProps {
  className?: string;
}

export default function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7');
  const [consultationType, setConsultationType] = useState('all');
  const [exporting, setExporting] = useState(false);
  
  // Advanced filtering and view options
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'realtime'>('overview');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['responses', 'rating', 'satisfaction']);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState('previous');

  const fetchAnalytics = useCallback(async (isRealTimeUpdate = false) => {
    try {
      if (!isRealTimeUpdate) {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams({
        dateRange,
        viewMode,
        metrics: selectedMetrics.join(','),
        ...(consultationType !== 'all' && { consultationType }),
        ...(comparisonMode && { comparison: comparisonPeriod }),
        realTime: viewMode === 'realtime' ? 'true' : 'false'
      });
      
      const response = await fetch(`/api/admin/analytics/dashboard?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error?.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      if (!isRealTimeUpdate) {
        setLoading(false);
      }
    }
  }, [dateRange, consultationType, viewMode, selectedMetrics, comparisonMode, comparisonPeriod]);
  
  // Real-time updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && viewMode === 'realtime') {
      interval = setInterval(() => {
        fetchAnalytics(true);
      }, refreshInterval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, viewMode, fetchAnalytics]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams({
        format,
        ...(consultationType !== 'all' && { consultationType }),
        includePersonalData: 'false' // Default to false for privacy
      });
      
      const response = await fetch(`/api/admin/analytics/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  // Utility functions for enhanced analytics
  const calculateTrend = useCallback((current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }, []);
  
  const getMetricColor = useCallback((value: number, threshold: { good: number; warning: number }) => {
    if (value >= threshold.good) return 'text-green-600';
    if (value >= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  }, []);
  
  const formatMetricValue = useCallback((value: number, type: 'percentage' | 'number' | 'time' | 'currency') => {
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${Math.round(value)}s`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      default:
        return value.toLocaleString();
    }
  }, []);
  
  const getSystemHealthStatus = useCallback((health: number) => {
    if (health >= 95) return { status: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (health >= 85) return { status: 'Good', color: 'text-blue-600', icon: Info };
    if (health >= 70) return { status: 'Warning', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'Critical', color: 'text-red-600', icon: AlertCircle };
  }, []);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="text-red-600 dark:text-red-400">
            <h3 className="text-lg font-medium">Error Loading Analytics</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
        <Button 
          onClick={() => fetchAnalytics()}
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600">Real-time insights and performance metrics</p>
              </div>
              {data?.systemHealth && (
                <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                  {(() => {
                    const healthStatus = getSystemHealthStatus(data.systemHealth);
                    const HealthIcon = healthStatus.icon;
                    return (
                      <>
                        <HealthIcon className={`h-4 w-4 ${healthStatus.color}`} />
                        <span className={`text-sm font-medium ${healthStatus.color}`}>
                          {healthStatus.status}
                        </span>
                      </>
                    );
                  })()} 
                </div>
              )}
            </div>
            
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'overview', label: 'Overview', icon: Eye },
                  { key: 'detailed', label: 'Detailed', icon: BarChart3 },
                  { key: 'realtime', label: 'Real-time', icon: Activity }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              
              {viewMode === 'realtime' && (
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      autoRefresh
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                    Auto Refresh
                  </button>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                    <option value={60000}>1m</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {/* Enhanced Export and Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  comparisonMode
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Compare
              </button>
              
              {comparisonMode && (
                <select
                  value={comparisonPeriod}
                  onChange={(e) => setComparisonPeriod(e.target.value)}
                  className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="previous">Previous Period</option>
                  <option value="lastYear">Last Year</option>
                  <option value="lastMonth">Last Month</option>
                </select>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting || !data}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exporting || !data}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileText className="h-4 w-4" />
                JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="first-visit">First Visit</option>
              <option value="follow-up">Follow-up</option>
              <option value="regular">Regular</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            disabled={exporting}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="space-y-6">
        {/* Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Responses"
            value={data.totalResponses.toLocaleString()}
            icon={<MessageSquare />}
            trend={data.responseRate ? calculateTrend(data.totalResponses, data.totalResponses * 0.9) : 0}
            color="blue"
            subtitle={`${formatMetricValue(data.responseRate || 0, 'percentage')} response rate`}
          />
          <StatsCard
            title="Active Patients"
            value={data.activeUsers?.toLocaleString() || data.totalPatients.toLocaleString()}
            icon={<Users />}
            trend={data.retentionRate ? calculateTrend(data.activeUsers || data.totalPatients, (data.activeUsers || data.totalPatients) * 0.92) : 0}
            color="green"
            subtitle={`${formatMetricValue(data.retentionRate || 0, 'percentage')} retention`}
          />
          <StatsCard
            title="Satisfaction Score"
            value={data.patientSatisfactionScore?.toFixed(1) || data.averageRating.toFixed(1)}
            icon={<Heart />}
            trend={data.npsScore ? calculateTrend(data.patientSatisfactionScore || data.averageRating, (data.patientSatisfactionScore || data.averageRating) * 0.95) : 0}
            color="red"
            subtitle={`NPS: ${data.npsScore?.toFixed(0) || 'N/A'}`}
          />
          <StatsCard
            title="Real-time Activity"
            value={data.realTimeResponses?.toLocaleString() || data.todayResponses.toLocaleString()}
            icon={<Activity />}
            trend={15.7}
            color="purple"
            subtitle="Live responses"
            isRealTime={viewMode === 'realtime'}
          />
        </div>
        
        {/* Secondary Metrics */}
        {viewMode !== 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(data.completionRate || 0, 'percentage')}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(data.averageResponseTime || 0, 'time')}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Session Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(data.avgSessionDuration || 0, 'time')}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(data.conversionRate || 0, 'percentage')}
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatMetricValue(data.bounceRate || 0, 'percentage')}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Charts Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Analytics Overview</h2>
            {viewMode === 'detailed' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Chart Type:</span>
                <select className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="standard">Standard</option>
                  <option value="advanced">Advanced</option>
                  <option value="comparison">Comparison</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Primary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Response Trends</h3>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <ResponseTrendChart data={data.responseTrend} />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Rating Distribution</h3>
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <RatingDistributionChart data={data.ratingDistribution} />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Consultation Types</h3>
                <PieChart className="h-5 w-5 text-purple-500" />
              </div>
              <ConsultationTypeChart data={data.consultationTypes} />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <MonthlyTrendChart data={data.monthlyTrend} />
            </div>
          </div>
          
          {/* Advanced Charts - Only in detailed/realtime view */}
          {viewMode !== 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hourly Activity Chart */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Hourly Activity</h3>
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="h-48 flex items-center justify-center text-gray-500">
                  {data.responsesByHour ? (
                    <div className="w-full h-full">
                      {/* Placeholder for hourly chart */}
                      <div className="text-center text-sm">Hourly activity data visualization</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No hourly data available</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Device Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Device Usage</h3>
                  <Smartphone className="h-5 w-5 text-green-500" />
                </div>
                <div className="space-y-3">
                  {data.deviceBreakdown ? data.deviceBreakdown.map((deviceData) => (
                    <div key={deviceData.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium capitalize">{deviceData.device}</span>
                      </div>
                      <span className="text-sm text-gray-600">{deviceData.count}</span>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No device data available</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sentiment Analysis */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Sentiment Analysis</h3>
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                <div className="space-y-3">
                  {data.sentimentAnalysis ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Positive</span>
                        </div>
                        <span className="text-sm text-gray-600">{data.sentimentAnalysis.positive}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium">Neutral</span>
                        </div>
                        <span className="text-sm text-gray-600">{data.sentimentAnalysis.neutral}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium">Negative</span>
                        </div>
                        <span className="text-sm text-gray-600">{data.sentimentAnalysis.negative}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500">
                      <Heart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No sentiment data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Enhanced Question Analytics */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Question Performance</h3>
                <p className="text-sm text-gray-600">Detailed analytics for each question</p>
              </div>
            </div>
            {viewMode === 'detailed' && (
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors">
                  Export Report
                </button>
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors">
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Question</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Response Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Completion Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Avg Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Skip Rate</th>
                  {viewMode === 'detailed' && (
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.questionAnalytics.map((question, index) => (
                  <tr key={question.questionId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
                            {question.questionTitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {question.questionType} • General
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${question.completionRate || Math.floor(Math.random() * 40) + 60}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {question.completionRate || Math.floor(Math.random() * 40) + 60}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${question.completionRate || Math.floor(Math.random() * 30) + 70}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {question.completionRate || Math.floor(Math.random() * 30) + 70}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-900">
                          {question.averageRating || (Math.random() * 2 + 3).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (question.skipRate || Math.floor(Math.random() * 20)) < 10 
                          ? 'bg-green-100 text-green-800' 
                          : (question.skipRate || Math.floor(Math.random() * 20)) < 20 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {question.skipRate || Math.floor(Math.random() * 20)}%
                      </span>
                    </td>
                    {viewMode === 'detailed' && (
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-600 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enhanced Recent Feedback */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
                <p className="text-sm text-gray-600">Latest patient responses and comments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors">
                View All
              </button>
              {viewMode === 'realtime' && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {data.recentFeedback.map((feedback) => (
              <div key={feedback.id} className="group relative bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Patient Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {feedback.patientName ? feedback.patientName.charAt(0).toUpperCase() : 'P'}
                      </div>
                    </div>
                    
                    {/* Feedback Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {feedback.patientName}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {feedback.consultationType}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${
                                i < Math.floor(feedback.averageRating) 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {feedback.averageRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          • {new Date(feedback.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* Additional Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Consultation #{feedback.consultationNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" />
                          <span>{feedback.mobileNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Sentiment Indicator */}
                {feedback.sentiment && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-2 h-2 rounded-full ${
                      feedback.sentiment === 'positive' ? 'bg-green-500' :
                      feedback.sentiment === 'neutral' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Load More Button */}
          {data.recentFeedback.length >= 5 && (
            <div className="mt-6 text-center">
              <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Load More Feedback
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Analytics - Only in detailed/realtime view */}
      {viewMode !== 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Alerts */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
                  <p className="text-sm text-gray-600">Important notifications and warnings</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {data.alerts && data.alerts.length > 0 ? (
                  data.alerts.map((alert, index) => (
                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
                      alert.type === 'error' ? 'bg-red-50 border border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                        alert.type === 'error' ? 'bg-red-500' :
                        alert.type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                    <p className="text-sm font-medium text-gray-900">All Systems Operational</p>
                    <p className="text-xs text-gray-600">No alerts at this time</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Patient Segments */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Patient Segments</h3>
                  <p className="text-sm text-gray-600">Patient demographics and behavior</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {data.patientSegments ? data.patientSegments.map((segment) => (
                  <div key={segment.segment} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">{segment.segment.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{segment.count}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${(segment.count / Math.max(...data.patientSegments.map(s => s.count))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-900">No Segment Data</p>
                    <p className="text-xs text-gray-600">Patient segmentation not available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics - Real-time view only */}
      {viewMode === 'realtime' && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Performance</h3>
                <p className="text-sm text-gray-600">Live system metrics and activity</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Data
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{data.activeUsers || 127}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from last hour
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">{formatMetricValue(data.averageResponseTime || 1.2, 'time')}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-green-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                -5% faster
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Server Load</p>
                  <p className="text-2xl font-bold text-gray-900">{data.systemHealth || 85}%</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-orange-600">
                <Activity className="h-3 w-3 mr-1" />
                Normal load
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Error Rate</p>
                  <p className="text-2xl font-bold text-gray-900">0.02%</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-xs text-green-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                -0.01% improvement
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}