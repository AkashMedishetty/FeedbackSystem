'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  Filter,
  FileText,
  FileSpreadsheet,
  FileImage,
  Clock,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Database,
  Users,
  MessageSquare,
  BarChart3
} from 'lucide-react';

interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  dataType: 'feedback' | 'patients' | 'analytics' | 'questions';
  dateRange: {
    from: string;
    to: string;
  };
  filters: {
    consultationType?: string;
    includePersonalData: boolean;
    patientStatus?: string;
    responseStatus?: string;
  };
  columns: string[];
  scheduled?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    email: string;
  };
}

interface ExportHistory {
  id: string;
  filename: string;
  format: string;
  dataType: string;
  recordCount: number;
  createdAt: string;
  status: 'completed' | 'failed' | 'processing';
  downloadUrl?: string;
}

const DATA_TYPES = [
  { value: 'feedback', label: 'Feedback Responses', icon: MessageSquare, description: 'Patient feedback and survey responses' },
  { value: 'patients', label: 'Patient Data', icon: Users, description: 'Patient information and consultation history' },
  { value: 'analytics', label: 'Analytics Data', icon: BarChart3, description: 'Performance metrics and analytics' },
  { value: 'questions', label: 'Questions & Templates', icon: FileText, description: 'Question templates and configurations' }
];

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel format' },
  { value: 'pdf', label: 'PDF', icon: FileImage, description: 'Portable document format' },
  { value: 'json', label: 'JSON', icon: Database, description: 'JavaScript object notation' }
];

const CONSULTATION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'general', label: 'General Consultation' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'emergency', label: 'Emergency' }
];

export default function DataExportManager() {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    dataType: 'feedback',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    filters: {
      consultationType: 'all',
      includePersonalData: false,
      patientStatus: 'all',
      responseStatus: 'all'
    },
    columns: [],
    scheduled: {
      enabled: false,
      frequency: 'weekly',
      time: '09:00',
      email: ''
    }
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'export' | 'history' | 'scheduled'>('export');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load available columns based on data type
  useEffect(() => {
    const columnMap: Record<string, string[]> = {
      feedback: [
        'submissionId', 'patientName', 'mobileNumber', 'age', 'gender',
        'consultationNumber', 'consultationType', 'submittedAt',
        'questionTitle', 'questionType', 'responseText', 'responseNumber'
      ],
      patients: [
        'patientId', 'name', 'mobileNumber', 'age', 'gender',
        'registrationDate', 'lastConsultation', 'totalConsultations',
        'averageRating', 'status'
      ],
      analytics: [
        'date', 'totalResponses', 'averageRating', 'completionRate',
        'responseTime', 'patientSatisfaction', 'consultationType'
      ],
      questions: [
        'questionId', 'title', 'type', 'category', 'isRequired',
        'createdAt', 'updatedAt', 'usageCount', 'averageRating'
      ]
    };

    const columns = columnMap[exportConfig.dataType] || [];
    setAvailableColumns(columns);
    setExportConfig(prev => ({ ...prev, columns: columns.slice(0, 5) }));
  }, [exportConfig.dataType]);

  // Load export history
  useEffect(() => {
    loadExportHistory();
  }, []);

  const loadExportHistory = async () => {
    try {
      const response = await fetch('/api/admin/export/history');
      if (response.ok) {
        const data = await response.json();
        setExportHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load export history:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format: exportConfig.format,
        dataType: exportConfig.dataType,
        dateFrom: exportConfig.dateRange.from,
        dateTo: exportConfig.dateRange.to,
        consultationType: exportConfig.filters.consultationType || 'all',
        includePersonalData: exportConfig.filters.includePersonalData.toString(),
        columns: exportConfig.columns.join(','),
        patientStatus: exportConfig.filters.patientStatus || 'all',
        responseStatus: exportConfig.filters.responseStatus || 'all'
      });

      const response = await fetch(`/api/admin/export/data?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Handle different response types
      if (exportConfig.format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${exportConfig.dataType}-export-${new Date().toISOString().split('T')[0]}.json`);
      } else {
        const blob = await response.blob();
        const extension = exportConfig.format === 'excel' ? 'xlsx' : exportConfig.format;
        downloadBlob(blob, `${exportConfig.dataType}-export-${new Date().toISOString().split('T')[0]}.${extension}`);
      }

      // Refresh export history
      loadExportHistory();
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    try {
      const params = new URLSearchParams({
        dataType: exportConfig.dataType,
        dateFrom: exportConfig.dateRange.from,
        dateTo: exportConfig.dateRange.to,
        consultationType: exportConfig.filters.consultationType || 'all',
        limit: '10'
      });

      const response = await fetch(`/api/admin/export/preview?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.preview || []);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  const handleScheduledExport = async () => {
    try {
      const response = await fetch('/api/admin/export/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportConfig)
      });

      if (response.ok) {
        alert('Scheduled export configured successfully!');
      } else {
        throw new Error('Failed to schedule export');
      }
    } catch (error) {
      console.error('Schedule error:', error);
      alert('Failed to schedule export. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Data Export Manager</h1>
            <p className="text-blue-100">Export patient feedback, analytics, and system data in multiple formats</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-lg p-3">
              <Download className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'export', label: 'Export Data', icon: Download },
            { id: 'history', label: 'Export History', icon: Clock },
            { id: 'scheduled', label: 'Scheduled Exports', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Data Type Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Data Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DATA_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.value}
                      onClick={() => setExportConfig(prev => ({ ...prev, dataType: type.value as any }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        exportConfig.dataType === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={`h-6 w-6 mt-1 ${
                          exportConfig.dataType === type.value ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <h4 className="font-medium text-gray-900">{type.label}</h4>
                          <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export Format */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {EXPORT_FORMATS.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.value}
                      onClick={() => setExportConfig(prev => ({ ...prev, format: format.value as any }))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${
                        exportConfig.format === format.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${
                        exportConfig.format === format.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <h4 className="font-medium text-gray-900">{format.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{format.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={exportConfig.dateRange.from}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={exportConfig.dateRange.to}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Consultation Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Type</label>
                  <select
                    value={exportConfig.filters.consultationType}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, consultationType: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {CONSULTATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Additional Options */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includePersonalData"
                    checked={exportConfig.filters.includePersonalData}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      filters: { ...prev.filters, includePersonalData: e.target.checked }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includePersonalData" className="ml-2 block text-sm text-gray-900">
                    Include personal data (names, contact info)
                  </label>
                </div>
              </div>
            </div>

            {/* Column Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Columns</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableColumns.map(column => (
                  <div key={column} className="flex items-center">
                    <input
                      type="checkbox"
                      id={column}
                      checked={exportConfig.columns.includes(column)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportConfig(prev => ({
                            ...prev,
                            columns: [...prev.columns, column]
                          }));
                        } else {
                          setExportConfig(prev => ({
                            ...prev,
                            columns: prev.columns.filter(c => c !== column)
                          }));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={column} className="ml-2 block text-sm text-gray-900 capitalize">
                      {column.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            {/* Export Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Export Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Data Type:</span>
                  <span className="font-medium capitalize">{exportConfig.dataType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium uppercase">{exportConfig.format}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date Range:</span>
                  <span className="font-medium">
                    {new Date(exportConfig.dateRange.from).toLocaleDateString()} - {new Date(exportConfig.dateRange.to).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-medium">{exportConfig.columns.length}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="space-y-4">
                <button
                  onClick={handlePreview}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Preview Data
                </button>
                
                <button
                  onClick={handleExport}
                  disabled={isExporting || exportConfig.columns.length === 0}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Export History</h3>
              <button
                onClick={loadExportHistory}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exportHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No export history found</p>
                      <p className="text-sm mt-1">Your export history will appear here</p>
                    </td>
                  </tr>
                ) : (
                  exportHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.filename}</div>
                            <div className="text-sm text-gray-500">{item.format.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {item.dataType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.recordCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {item.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {item.status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.status === 'completed' && item.downloadUrl && (
                          <a
                            href={item.downloadUrl}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scheduled Exports Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Scheduled Exports</h3>
          
          <div className="space-y-6">
            {/* Enable Scheduling */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableScheduling"
                checked={exportConfig.scheduled?.enabled || false}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  scheduled: { ...prev.scheduled!, enabled: e.target.checked }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableScheduling" className="ml-2 block text-sm text-gray-900">
                Enable scheduled exports
              </label>
            </div>

            {exportConfig.scheduled?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={exportConfig.scheduled.frequency}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      scheduled: { ...prev.scheduled!, frequency: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={exportConfig.scheduled.time}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      scheduled: { ...prev.scheduled!, time: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={exportConfig.scheduled.email}
                    onChange={(e) => setExportConfig(prev => ({
                      ...prev,
                      scheduled: { ...prev.scheduled!, email: e.target.value }
                    }))}
                    placeholder="admin@hospital.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {exportConfig.scheduled?.enabled && (
              <div className="flex justify-end">
                <button
                  onClick={handleScheduledExport}
                  className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Save Schedule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {exportConfig.columns.slice(0, 6).map(column => (
                      <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      {exportConfig.columns.slice(0, 6).map(column => (
                        <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row[column] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Showing first 5 rows of {previewData.length} total records
            </div>
          </div>
        </div>
      )}
    </div>
  );
}