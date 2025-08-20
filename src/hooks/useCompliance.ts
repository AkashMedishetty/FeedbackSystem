'use client';

import { useState, useEffect, useCallback } from 'react';
import { auditTrail, AuditEvent, AuditAction, ResourceType } from '@/lib/compliance/auditTrail';
import { dataRetentionManager, RetentionPolicy } from '@/lib/compliance/dataRetention';
import { encryptPatientData, decryptPatientData } from '@/lib/security/encryption';
import { sanitizePatientData, sanitizeFeedbackData } from '@/lib/security/sanitization';
import { toast } from 'sonner';

interface ComplianceConfig {
  enableAuditLogging: boolean;
  enableDataRetention: boolean;
  enableEncryption: boolean;
  auditHighRiskActions: boolean;
}

interface ComplianceMetrics {
  totalAuditEvents: number;
  highRiskEvents: number;
  complianceScore: number;
  lastAuditDate: Date | null;
  retentionCompliance: number;
}

export const useCompliance = (config: ComplianceConfig = {
  enableAuditLogging: true,
  enableDataRetention: true,
  enableEncryption: true,
  auditHighRiskActions: true
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize compliance systems
  const initializeCompliance = useCallback(async () => {
    if (isInitialized) return;
    
    setLoading(true);
    try {
      if (config.enableAuditLogging) {
        await auditTrail.init();
      }
      
      if (config.enableDataRetention) {
        await dataRetentionManager.init();
      }
      
      setIsInitialized(true);
      await loadMetrics();
    } catch (error) {
      console.error('Failed to initialize compliance systems:', error);
      toast.error('Failed to initialize compliance systems');
    } finally {
      setLoading(false);
    }
  }, [config, isInitialized]);

  // Load compliance metrics
  const loadMetrics = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      let totalEvents = 0;
      let highRiskEvents = 0;
      let lastAuditDate: Date | null = null;
      
      if (config.enableAuditLogging) {
        const auditReport = await auditTrail.generateComplianceReport(startDate, endDate);
        totalEvents = auditReport.totalEvents;
        highRiskEvents = auditReport.highRiskEvents.length;
        
        const recentEvents = await auditTrail.queryEvents({ limit: 1 });
        lastAuditDate = recentEvents.length > 0 ? recentEvents[0].timestamp : null;
      }
      
      let retentionCompliance = 100;
      if (config.enableDataRetention) {
        const retentionReport = await dataRetentionManager.generateRetentionReport();
        retentionCompliance = Math.round(retentionReport.complianceScore * 100);
      }
      
      const complianceScore = Math.round(
        (retentionCompliance + (highRiskEvents === 0 ? 100 : Math.max(0, 100 - highRiskEvents * 10))) / 2
      );
      
      setMetrics({
        totalAuditEvents: totalEvents,
        highRiskEvents,
        complianceScore,
        lastAuditDate,
        retentionCompliance
      });
    } catch (error) {
      console.error('Failed to load compliance metrics:', error);
    }
  }, [config, isInitialized]);

  // Log audit event
  const logAuditEvent = useCallback(async (
    action: AuditAction,
    resourceType: ResourceType,
    resourceId: string,
    userId?: string,
    details?: Record<string, any>
  ) => {
    if (!config.enableAuditLogging || !isInitialized) return;
    
    try {
      await auditTrail.logEvent(action, resourceType, resourceId, userId, details);
      
      // Reload metrics if this was a high-risk action
      if (config.auditHighRiskActions && ['delete', 'export', 'access_phi'].includes(action)) {
        await loadMetrics();
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }, [config, isInitialized, loadMetrics]);

  // Secure patient data handling
  const securePatientData = useCallback(async (data: any) => {
    if (!config.enableEncryption) return data;
    
    try {
      const sanitized = sanitizePatientData(data);
      const encrypted = await encryptPatientData(sanitized);
      return encrypted;
    } catch (error) {
      console.error('Failed to secure patient data:', error);
      throw new Error('Data security processing failed');
    }
  }, [config.enableEncryption]);

  // Decrypt patient data
  const decryptPatientDataSecure = useCallback(async (encryptedData: any, userId?: string) => {
    if (!config.enableEncryption) return encryptedData;
    
    try {
      const decrypted = await decryptPatientData(encryptedData);
      
      // Log PHI access
      if (config.enableAuditLogging && userId) {
        await logAuditEvent('access_phi', 'patient_data', encryptedData.id || 'unknown', userId);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt patient data:', error);
      throw new Error('Data decryption failed');
    }
  }, [config, logAuditEvent]);

  // Secure feedback data
  const secureFeedbackData = useCallback(async (feedbackData: any, userId?: string) => {
    try {
      const sanitized = sanitizeFeedbackData(feedbackData);
      
      if (config.enableAuditLogging && userId) {
        await logAuditEvent('create', 'feedback', sanitized.id || 'new', userId, {
          rating: sanitized.rating,
          hasAttachment: !!sanitized.attachment
        });
      }
      
      return sanitized;
    } catch (error) {
      console.error('Failed to secure feedback data:', error);
      throw new Error('Feedback security processing failed');
    }
  }, [config, logAuditEvent]);

  // Register data for retention management
  const registerDataForRetention = useCallback(async (
    dataType: string,
    dataId: string,
    metadata?: Record<string, any>
  ) => {
    if (!config.enableDataRetention || !isInitialized) return;
    
    try {
      await dataRetentionManager.registerData(dataType, dataId, metadata);
    } catch (error) {
      console.error('Failed to register data for retention:', error);
    }
  }, [config.enableDataRetention, isInitialized]);

  // Execute retention actions
  const executeRetentionActions = useCallback(async (userId?: string) => {
    if (!config.enableDataRetention || !isInitialized) return;
    
    try {
      const actions = await dataRetentionManager.executeRetentionActions();
      
      if (config.enableAuditLogging && userId && actions.length > 0) {
        await logAuditEvent('retention_action', 'system', 'batch', userId, {
          actionsExecuted: actions.length,
          actionTypes: actions.map(a => a.action)
        });
      }
      
      await loadMetrics();
      return actions;
    } catch (error) {
      console.error('Failed to execute retention actions:', error);
      throw error;
    }
  }, [config, isInitialized, logAuditEvent, loadMetrics]);

  // Generate compliance report
  const generateComplianceReport = useCallback(async (startDate: Date, endDate: Date) => {
    if (!isInitialized) throw new Error('Compliance system not initialized');
    
    try {
      const auditReport = config.enableAuditLogging 
        ? await auditTrail.generateComplianceReport(startDate, endDate)
        : null;
      
      const retentionReport = config.enableDataRetention
        ? await dataRetentionManager.generateRetentionReport()
        : null;
      
      return {
        period: { start: startDate, end: endDate },
        generatedAt: new Date(),
        auditReport,
        retentionReport,
        metrics,
        complianceScore: metrics?.complianceScore || 0
      };
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }, [config, isInitialized, metrics]);

  // Initialize on mount
  useEffect(() => {
    initializeCompliance();
  }, [initializeCompliance]);

  return {
    // State
    isInitialized,
    metrics,
    loading,
    
    // Methods
    initializeCompliance,
    loadMetrics,
    logAuditEvent,
    securePatientData,
    decryptPatientDataSecure,
    secureFeedbackData,
    registerDataForRetention,
    executeRetentionActions,
    generateComplianceReport
  };
};