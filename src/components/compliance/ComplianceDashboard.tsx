'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  FileText,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  Archive
} from 'lucide-react';
import { auditTrail, AuditEvent } from '@/lib/compliance/auditTrail';
import { dataRetentionManager } from '@/lib/compliance/dataRetention';
import { toast } from 'sonner';

interface ComplianceMetrics {
  overallScore: number;
  auditTrailIntegrity: number;
  dataRetentionCompliance: number;
  securityIncidents: number;
  lastAuditDate: Date;
  totalAuditEvents: number;
  highRiskEvents: number;
  pendingRetentionActions: number;
}

interface RetentionSummary {
  totalRecords: number;
  recordsDueForDeletion: number;
  recordsDueForArchival: number;
  archivedRecords: number;
  complianceScore: number;
}

const ComplianceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [retentionSummary, setRetentionSummary] = useState<RetentionSummary | null>(null);
  const [recentAuditEvents, setRecentAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAuditMetrics(),
        loadRetentionData(),
        loadRecentEvents()
      ]);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditMetrics = async () => {
    try {
      await auditTrail.init();
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // Last 30 days
      
      const report = await auditTrail.generateComplianceReport(startDate, endDate);
      const integrity = await auditTrail.verifyIntegrity();
      
      setMetrics({
        overallScore: Math.round((integrity.integrityScore + (report.failedEvents === 0 ? 1 : 0.8)) * 50),
        auditTrailIntegrity: Math.round(integrity.integrityScore * 100),
        dataRetentionCompliance: 85, // This would come from retention manager
        securityIncidents: report.failedEvents,
        lastAuditDate: new Date(),
        totalAuditEvents: report.totalEvents,
        highRiskEvents: report.highRiskEvents.length,
        pendingRetentionActions: 0 // This would come from retention manager
      });
    } catch (error) {
      console.error('Failed to load audit metrics:', error);
    }
  };

  const loadRetentionData = async () => {
    try {
      await dataRetentionManager.init();
      const report = await dataRetentionManager.generateRetentionReport();
      
      setRetentionSummary({
        totalRecords: report.totalRecords,
        recordsDueForDeletion: report.recordsDueForDeletion,
        recordsDueForArchival: report.recordsDueForArchival,
        archivedRecords: report.archivedRecords,
        complianceScore: Math.round(report.complianceScore * 100)
      });
    } catch (error) {
      console.error('Failed to load retention data:', error);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const events = await auditTrail.queryEvents({
        limit: 10,
        riskLevel: 'high'
      });
      setRecentAuditEvents(events);
    } catch (error) {
      console.error('Failed to load recent events:', error);
    }
  };

  const generateComplianceReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000)); // Last 90 days
      
      const report = await auditTrail.generateComplianceReport(startDate, endDate);
      
      // In a real implementation, this would generate and download a PDF report
      const reportData = {
        generatedAt: new Date().toISOString(),
        period: { start: startDate.toISOString(), end: endDate.toISOString() },
        metrics,
        retentionSummary,
        auditSummary: report
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hipaa-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Compliance report generated successfully');
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate compliance report');
    }
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' };
    if (score >= 80) return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (score >= 70) return { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { label: 'Needs Attention', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    const variants: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return variants[riskLevel] || variants.low;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading compliance data...</span>
      </div>
    );
  }

  const complianceStatus = metrics ? getComplianceStatus(metrics.overallScore) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">HIPAA Compliance Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage healthcare data compliance
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={loadComplianceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={generateComplianceReport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.overallScore || 0}%</div>
            {complianceStatus && (
              <Badge className={`${complianceStatus.color} text-white mt-2`}>
                {complianceStatus.label}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Trail Integrity</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.auditTrailIntegrity || 0}%</div>
            <Progress value={metrics?.auditTrailIntegrity || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics?.securityIncidents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Retention</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retentionSummary?.complianceScore || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {retentionSummary?.recordsDueForDeletion || 0} records due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Summary</CardTitle>
                <CardDescription>Current compliance status across all areas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Audit Trail Integrity</span>
                  <span className="text-sm">{metrics?.auditTrailIntegrity || 0}%</span>
                </div>
                <Progress value={metrics?.auditTrailIntegrity || 0} />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Retention Compliance</span>
                  <span className="text-sm">{retentionSummary?.complianceScore || 0}%</span>
                </div>
                <Progress value={retentionSummary?.complianceScore || 0} />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Security Posture</span>
                  <span className="text-sm">95%</span>
                </div>
                <Progress value={95} />
              </CardContent>
            </Card>

            {/* Recent High-Risk Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent High-Risk Events</CardTitle>
                <CardDescription>Events requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAuditEvents.length > 0 ? (
                  <div className="space-y-3">
                    {recentAuditEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge className={getRiskLevelBadge(event.riskLevel)}>
                              {event.riskLevel}
                            </Badge>
                            <span className="text-sm font-medium">{event.action}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {event.details.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No high-risk events detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail Statistics</CardTitle>
              <CardDescription>Comprehensive audit trail analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics?.totalAuditEvents || 0}</div>
                  <p className="text-sm text-gray-600">Total Events</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{metrics?.highRiskEvents || 0}</div>
                  <p className="text-sm text-gray-600">High Risk</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{metrics?.securityIncidents || 0}</div>
                  <p className="text-sm text-gray-600">Incidents</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics?.auditTrailIntegrity || 0}%</div>
                  <p className="text-sm text-gray-600">Integrity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Overview</CardTitle>
              <CardDescription>Manage data lifecycle and retention policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{retentionSummary?.totalRecords || 0}</div>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{retentionSummary?.recordsDueForArchival || 0}</div>
                  <p className="text-sm text-gray-600">Due for Archive</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{retentionSummary?.recordsDueForDeletion || 0}</div>
                  <p className="text-sm text-gray-600">Due for Deletion</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{retentionSummary?.archivedRecords || 0}</div>
                  <p className="text-sm text-gray-600">Archived</p>
                </div>
              </div>
              
              {(retentionSummary?.recordsDueForDeletion || 0) > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Action Required</h4>
                      <p className="text-sm text-yellow-700">
                        {retentionSummary?.recordsDueForDeletion || 0} records are due for deletion according to retention policies.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Records
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Schedule Deletion
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceDashboard;