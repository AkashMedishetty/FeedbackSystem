'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Zap,
  Clock,
  Eye,
  Gauge,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Wifi,
  HardDrive
} from 'lucide-react';
import { usePerformanceMonitor, performanceMonitor } from '@/lib/performance/performanceMonitor';
import { toast } from 'sonner';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
  memoryUsage?: MemoryInfo;
  connectionType?: string;
  timestamp: number;
}

const PerformanceDashboard: React.FC = () => {
  const {
    getLatestMetrics,
    getAverageMetrics,
    getPerformanceScore,
    exportMetrics
  } = usePerformanceMonitor();
  
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [averageMetrics, setAverageMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [performanceScore, setPerformanceScore] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPerformanceData();
    
    // Listen for real-time performance updates
    const handlePerformanceUpdate = () => {
      loadPerformanceData();
    };
    
    window.addEventListener('performance-metric-updated', handlePerformanceUpdate);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    
    return () => {
      window.removeEventListener('performance-metric-updated', handlePerformanceUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadPerformanceData = () => {
    try {
      const latest = getLatestMetrics();
      const average = getAverageMetrics();
      const score = getPerformanceScore();
      
      setMetrics(latest);
      setAverageMetrics(average);
      setPerformanceScore(score);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force a new measurement
      performanceMonitor.markUserTiming('manual-refresh');
      await new Promise(resolve => setTimeout(resolve, 1000));
      loadPerformanceData();
      toast.success('Performance data refreshed');
    } catch (error) {
      toast.error('Failed to refresh performance data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportMetrics = () => {
    try {
      const data = exportMetrics();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Performance metrics exported');
    } catch (error) {
      toast.error('Failed to export metrics');
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 70) return { label: 'Good', variant: 'secondary' as const };
    return { label: 'Needs Improvement', variant: 'destructive' as const };
  };

  const getMetricStatus = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return { status: 'good', icon: CheckCircle, color: 'text-green-600' };
    if (value <= thresholds.fair) return { status: 'fair', icon: AlertTriangle, color: 'text-yellow-600' };
    return { status: 'poor', icon: AlertTriangle, color: 'text-red-600' };
  };

  const scoreBadge = getScoreBadge(performanceScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Monitor Core Web Vitals and application performance</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportMetrics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
                {performanceScore}
              </div>
              <div>
                <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
                <p className="text-sm text-gray-600 mt-1">
                  Based on Core Web Vitals
                </p>
              </div>
            </div>
            <div className="w-32">
              <Progress value={performanceScore} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="system">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Page Load Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Page Load Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatTime(metrics.pageLoadTime) : '--'}
                </div>
                <p className="text-xs text-gray-600">
                  Avg: {averageMetrics.pageLoadTime ? formatTime(averageMetrics.pageLoadTime) : '--'}
                </p>
              </CardContent>
            </Card>

            {/* Time to Interactive */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Time to Interactive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatTime(metrics.timeToInteractive) : '--'}
                </div>
                <p className="text-xs text-gray-600">
                  Avg: {averageMetrics.timeToInteractive ? formatTime(averageMetrics.timeToInteractive) : '--'}
                </p>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.memoryUsage ? formatBytes(metrics.memoryUsage.usedJSHeapSize) : '--'}
                </div>
                <p className="text-xs text-gray-600">
                  {metrics?.memoryUsage ? 
                    `${Math.round((metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.totalJSHeapSize) * 100)}% used` 
                    : 'Not available'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Connection Type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {metrics?.connectionType || '--'}
                </div>
                <p className="text-xs text-gray-600">
                  Network type
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* First Contentful Paint */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  First Contentful Paint (FCP)
                </CardTitle>
                <CardDescription>Time until first content appears</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics ? formatTime(metrics.firstContentfulPaint) : '--'}
                    </div>
                    <p className="text-xs text-gray-600">
                      Target: &lt; 1.8s
                    </p>
                  </div>
                  {metrics && (() => {
                    const status = getMetricStatus(metrics.firstContentfulPaint, { good: 1800, fair: 3000 });
                    const Icon = status.icon;
                    return <Icon className={`h-5 w-5 ${status.color}`} />;
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Largest Contentful Paint */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Largest Contentful Paint (LCP)
                </CardTitle>
                <CardDescription>Time until largest content loads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics ? formatTime(metrics.largestContentfulPaint) : '--'}
                    </div>
                    <p className="text-xs text-gray-600">
                      Target: &lt; 2.5s
                    </p>
                  </div>
                  {metrics && (() => {
                    const status = getMetricStatus(metrics.largestContentfulPaint, { good: 2500, fair: 4000 });
                    const Icon = status.icon;
                    return <Icon className={`h-5 w-5 ${status.color}`} />;
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* First Input Delay */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  First Input Delay (FID)
                </CardTitle>
                <CardDescription>Time until page becomes interactive</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics ? formatTime(metrics.firstInputDelay) : '--'}
                    </div>
                    <p className="text-xs text-gray-600">
                      Target: &lt; 100ms
                    </p>
                  </div>
                  {metrics && (() => {
                    const status = getMetricStatus(metrics.firstInputDelay, { good: 100, fair: 300 });
                    const Icon = status.icon;
                    return <Icon className={`h-5 w-5 ${status.color}`} />;
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Cumulative Layout Shift */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Cumulative Layout Shift (CLS)
                </CardTitle>
                <CardDescription>Visual stability of the page</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {metrics ? metrics.cumulativeLayoutShift.toFixed(3) : '--'}
                    </div>
                    <p className="text-xs text-gray-600">
                      Target: &lt; 0.1 (lower is better)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {metrics && (() => {
                      const status = getMetricStatus(metrics.cumulativeLayoutShift, { good: 0.1, fair: 0.25 });
                      const Icon = status.icon;
                      return <Icon className={`h-5 w-5 ${status.color}`} />;
                    })()}
                    <div className="w-32">
                      <Progress 
                        value={metrics ? Math.min(100, (metrics.cumulativeLayoutShift / 0.25) * 100) : 0} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memory Details */}
            {metrics?.memoryUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Memory Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Used JS Heap:</span>
                    <span className="font-medium">{formatBytes(metrics.memoryUsage.usedJSHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total JS Heap:</span>
                    <span className="font-medium">{formatBytes(metrics.memoryUsage.totalJSHeapSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">JS Heap Limit:</span>
                    <span className="font-medium">{formatBytes(metrics.memoryUsage.jsHeapSizeLimit)}</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>{Math.round((metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.totalJSHeapSize) * 100)}%</span>
                    </div>
                    <Progress 
                      value={(metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.totalJSHeapSize) * 100} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {performanceScore < 70 && (
                    <div className="flex items-start gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Performance needs improvement. Consider optimizing images and reducing JavaScript bundle size.</span>
                    </div>
                  )}
                  {metrics && metrics.largestContentfulPaint > 2500 && (
                    <div className="flex items-start gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>LCP is slow. Optimize your largest content element or use lazy loading.</span>
                    </div>
                  )}
                  {metrics && metrics.cumulativeLayoutShift > 0.1 && (
                    <div className="flex items-start gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>High layout shift detected. Reserve space for dynamic content.</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Use lazy loading for images and components below the fold.</span>
                  </div>
                  <div className="flex items-start gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Enable compression and caching for better load times.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;