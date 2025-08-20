'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useErrorMonitoring } from '../../lib/monitoring/errorMonitoring';
import { useProductionOptimization } from '../../lib/optimization/productionOptimization';
import { AlertTriangle, Activity, Zap, Shield, TrendingUp, RefreshCw, Download } from 'lucide-react';

interface ErrorStats {
  totalUniqueErrors: number;
  totalErrorOccurrences: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: number;
  criticalErrors: number;
}

interface OptimizationMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  cacheHitRate: number;
  compressionRatio: number;
  treeShakingEfficiency: number;
}

const MonitoringDashboard: React.FC = () => {
  const [errorStats, setErrorStats] = useState<ErrorStats>({
    totalUniqueErrors: 0,
    totalErrorOccurrences: 0,
    errorsByCategory: {},
    errorsBySeverity: {},
    recentErrors: 0,
    criticalErrors: 0
  });
  
  const [optimizationMetrics, setOptimizationMetrics] = useState<OptimizationMetrics>({
    bundleSize: 0,
    loadTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    compressionRatio: 0,
    treeShakingEfficiency: 0
  });
  
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [performanceIssues, setPerformanceIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const errorMonitoring = useErrorMonitoring();
  const productionOptimization = useProductionOptimization();

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load error monitoring data
      const stats = errorMonitoring.getErrorStats();
      setErrorStats(stats);
      
      const errors = errorMonitoring.getErrors().slice(0, 10);
      setRecentErrors(errors);
      
      const issues = errorMonitoring.getPerformanceIssues().slice(0, 10);
      setPerformanceIssues(issues);
      
      // Load optimization metrics
      const metrics = productionOptimization.getMetrics();
      setOptimizationMetrics(metrics);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'destructive' as const;
      case 'medium': return 'secondary' as const;
      case 'low': return 'outline' as const;
      default: return 'default' as const;
    }
  };

  const getHealthScoreVariant = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getHealthScore = () => {
    let score = 100;
    
    // Deduct points for errors
    score -= Math.min(errorStats.criticalErrors * 10, 30);
    score -= Math.min(errorStats.recentErrors * 2, 20);
    
    // Deduct points for performance issues
    if (optimizationMetrics.loadTime > 3000) score -= 15;
    if (optimizationMetrics.cacheHitRate < 50) score -= 10;
    if (optimizationMetrics.bundleSize > 1000000) score -= 10;
    
    return Math.max(score, 0);
  };

  const exportData = () => {
    const data = {
      errorStats,
      optimizationMetrics,
      recentErrors,
      performanceIssues,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const healthScore = getHealthScore();
  const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-yellow-600' : 'text-red-600';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            System Health Score
          </CardTitle>
          <CardDescription>
            Overall system health based on errors and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className={`text-4xl font-bold ${healthColor}`}>
              {healthScore}%
            </div>
            <div className="flex-1">
              <Progress value={healthScore} className="h-3" />
            </div>
            <Badge variant={getHealthScoreVariant(healthScore)}>
              {healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Warning' : 'Critical'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Error Monitoring Tab */}
        <TabsContent value="errors" className="space-y-4">
          {/* Error Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {errorStats.totalErrorOccurrences}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {errorStats.totalUniqueErrors} unique
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Critical Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {errorStats.criticalErrors}
                </div>
                <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {errorStats.recentErrors}
                </div>
                <p className="text-xs text-gray-500 mt-1">Last 60 minutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {errorStats.totalErrorOccurrences > 0 ? 
                    ((errorStats.recentErrors / errorStats.totalErrorOccurrences) * 100).toFixed(1) : '0.0'
                  }%
                </div>
                <p className="text-xs text-gray-500 mt-1">Recent vs total</p>
              </CardContent>
            </Card>
          </div>

          {/* Error Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Errors by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(errorStats.errorsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize text-sm">{category}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(errorStats.errorsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <span className="capitalize text-sm">{severity}</span>
                      <Badge variant={getSeverityVariant(severity)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Latest error occurrences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentErrors.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent errors</p>
                ) : (
                  recentErrors.map((error, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="font-medium text-sm">{error.message}</span>
                            <Badge variant={getSeverityVariant(error.context.severity)}>
                              {error.context.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {error.context.category} • Count: {error.count} • 
                            {new Date(error.lastSeen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Load Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {optimizationMetrics.loadTime.toFixed(0)}ms
                </div>
                <Progress 
                  value={Math.min((optimizationMetrics.loadTime / 5000) * 100, 100)} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Render Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {optimizationMetrics.renderTime.toFixed(0)}ms
                </div>
                <Progress 
                  value={Math.min((optimizationMetrics.renderTime / 3000) * 100, 100)} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {optimizationMetrics.cacheHitRate.toFixed(1)}%
                </div>
                <Progress 
                  value={optimizationMetrics.cacheHitRate} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>
          </div>

          {/* Performance Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Issues</CardTitle>
              <CardDescription>Recent performance bottlenecks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performanceIssues.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No performance issues detected</p>
                ) : (
                  performanceIssues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-sm">{issue.description}</span>
                            <Badge variant={getSeverityVariant(issue.context.severity)}>
                              {issue.context.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {issue.type} • Value: {issue.value.toFixed(2)} • 
                            Threshold: {issue.threshold} • 
                            {new Date(issue.context.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          {/* Bundle Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Bundle Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(optimizationMetrics.bundleSize / 1024).toFixed(0)}KB
                </div>
                <Progress 
                  value={Math.min((optimizationMetrics.bundleSize / 1000000) * 100, 100)} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Compression Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {(optimizationMetrics.compressionRatio * 100).toFixed(1)}%
                </div>
                <Progress 
                  value={optimizationMetrics.compressionRatio * 100} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tree Shaking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {(optimizationMetrics.treeShakingEfficiency * 100).toFixed(1)}%
                </div>
                <Progress 
                  value={optimizationMetrics.treeShakingEfficiency * 100} 
                  className="mt-2 h-2" 
                />
              </CardContent>
            </Card>
          </div>

          {/* Optimization Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizationMetrics.bundleSize > 1000000 && (
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Large Bundle Size</p>
                      <p className="text-sm text-yellow-700">
                        Consider implementing code splitting to reduce initial bundle size
                      </p>
                    </div>
                  </div>
                )}
                
                {optimizationMetrics.loadTime > 3000 && (
                  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Slow Load Time</p>
                      <p className="text-sm text-red-700">
                        Implement lazy loading and optimize critical rendering path
                      </p>
                    </div>
                  </div>
                )}
                
                {optimizationMetrics.cacheHitRate < 50 && (
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Low Cache Hit Rate</p>
                      <p className="text-sm text-blue-700">
                        Improve caching strategies and implement service worker caching
                      </p>
                    </div>
                  </div>
                )}
                
                {optimizationMetrics.compressionRatio > 0.8 && (
                  <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                    <Zap className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">Poor Compression</p>
                      <p className="text-sm text-orange-700">
                        Enable gzip/brotli compression on your server
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;