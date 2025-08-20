import { IndexedDBManager } from '../db/indexedDB';
import { encryptData, decryptData } from '../security/encryption';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  userRole?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  details: AuditDetails;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  outcome: 'success' | 'failure' | 'warning';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  encrypted: boolean;
  hash: string;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'print'
  | 'login'
  | 'logout'
  | 'access_denied'
  | 'data_breach_attempt'
  | 'bulk_operation'
  | 'system_access'
  | 'configuration_change'
  | 'critical_error_reported'
  | 'critical_performance_issue'
  | 'retention_action'
  | 'access_phi';

export type ResourceType =
  | 'patient_data'
  | 'feedback'
  | 'medical_record'
  | 'user_account'
  | 'system_settings'
  | 'audit_log'
  | 'backup'
  | 'report'
  | 'system';

export interface AuditDetails {
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  affectedFields?: string[];
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  outcome?: 'success' | 'failure' | 'warning';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
  offset?: number;
}

export class AuditTrailManager {
  private static instance: AuditTrailManager;
  private dbManager: IndexedDBManager;
  private readonly AUDIT_STORE = 'auditTrail';
  private readonly MAX_AUDIT_ENTRIES = 100000; // Configurable limit
  private readonly RETENTION_DAYS = 2555; // 7 years for HIPAA compliance

  private constructor() {
    this.dbManager = IndexedDBManager.getInstance();
  }

  static getInstance(): AuditTrailManager {
    if (!AuditTrailManager.instance) {
      AuditTrailManager.instance = new AuditTrailManager();
    }
    return AuditTrailManager.instance;
  }

  /**
   * Initialize audit trail database
   */
  async init(): Promise<void> {
    await this.dbManager.init();
    await this.cleanupOldEntries();
  }

  /**
   * Log an audit event
   */
  async logEvent(
    action: AuditAction,
    resourceType: ResourceType,
    resourceId: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<string> {
    try {
      const eventId = this.generateEventId();
      const timestamp = new Date();
      
      // Determine risk level
      const riskLevel = this.calculateRiskLevel(action, resourceType, details || {});
      
      // Create audit event details
      const auditDetails: AuditDetails = {
        description: `${action} ${resourceType}`,
        metadata: details || {}
      };
      
      // Create audit event
      const auditEvent: AuditEvent = {
        id: eventId,
        timestamp,
        userId,
        userRole: undefined,
        action,
        resourceType,
        resourceId,
        details: auditDetails,
        ipAddress: undefined,
        userAgent: undefined,
        sessionId: undefined,
        outcome: 'success',
        riskLevel,
        encrypted: this.shouldEncrypt(resourceType, riskLevel),
        hash: ''
      };
      
      // Encrypt sensitive details if necessary
      if (auditEvent.encrypted) {
        auditEvent.details = {
          ...auditEvent.details,
          description: encryptData(auditEvent.details.description),
          oldValues: auditEvent.details.oldValues ? { encrypted: encryptData(JSON.stringify(auditEvent.details.oldValues)) } : undefined,
          newValues: auditEvent.details.newValues ? { encrypted: encryptData(JSON.stringify(auditEvent.details.newValues)) } : undefined
        };
      }
      
      // Generate integrity hash
      auditEvent.hash = this.generateEventHash(auditEvent);
      
      // Store in IndexedDB
      await this.storeAuditEvent(auditEvent);
      
      // Alert on high-risk events
      if (riskLevel === 'high' || riskLevel === 'critical') {
        await this.alertHighRiskEvent(auditEvent);
      }
      
      return eventId;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw new Error('Audit logging failed');
    }
  }

  /**
   * Query audit events
   */
  async queryEvents(query: AuditQuery = {}): Promise<AuditEvent[]> {
    try {
      const db = await this.dbManager.getDB();
      if (!db) throw new Error('Database not available');
      const transaction = db.transaction([this.AUDIT_STORE], 'readonly');
      const store = transaction.objectStore(this.AUDIT_STORE);
      
      let events: AuditEvent[] = [];
      
      // Get all events first (in a real implementation, you'd want proper indexing)
      const allEvents = await new Promise<AuditEvent[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Apply filters
      events = allEvents.filter(event => {
        if (query.startDate && event.timestamp < query.startDate) return false;
        if (query.endDate && event.timestamp > query.endDate) return false;
        if (query.userId && event.userId !== query.userId) return false;
        if (query.action && event.action !== query.action) return false;
        if (query.resourceType && event.resourceType !== query.resourceType) return false;
        if (query.resourceId && event.resourceId !== query.resourceId) return false;
        if (query.outcome && event.outcome !== query.outcome) return false;
        if (query.riskLevel && event.riskLevel !== query.riskLevel) return false;
        return true;
      });
      
      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Apply pagination
      if (query.offset) {
        events = events.slice(query.offset);
      }
      if (query.limit) {
        events = events.slice(0, query.limit);
      }
      
      return events;
    } catch (error) {
      console.error('Failed to query audit events:', error);
      throw new Error('Audit query failed');
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    eventsByRiskLevel: Record<string, number>;
    failedEvents: number;
    highRiskEvents: AuditEvent[];
    dataAccessSummary: {
      patientDataAccess: number;
      feedbackAccess: number;
      systemAccess: number;
    };
  }> {
    const events = await this.queryEvents({ startDate, endDate });
    
    const report = {
      totalEvents: events.length,
      eventsByAction: {} as Record<AuditAction, number>,
      eventsByRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      failedEvents: 0,
      highRiskEvents: events.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical'),
      dataAccessSummary: {
        patientDataAccess: 0,
        feedbackAccess: 0,
        systemAccess: 0
      }
    };
    
    events.forEach(event => {
      // Count by action
      report.eventsByAction[event.action] = (report.eventsByAction[event.action] || 0) + 1;
      
      // Count by risk level
      report.eventsByRiskLevel[event.riskLevel]++;
      
      // Count failed events
      if (event.outcome === 'failure') {
        report.failedEvents++;
      }
      
      // Count data access
      if (event.resourceType === 'patient_data') {
        report.dataAccessSummary.patientDataAccess++;
      } else if (event.resourceType === 'feedback') {
        report.dataAccessSummary.feedbackAccess++;
      } else if (event.action === 'system_access') {
        report.dataAccessSummary.systemAccess++;
      }
    });
    
    return report;
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(): Promise<{
    totalEvents: number;
    validEvents: number;
    corruptedEvents: string[];
    integrityScore: number;
  }> {
    const events = await this.queryEvents();
    const corruptedEvents: string[] = [];
    
    for (const event of events) {
      const eventWithoutHash = { ...event };
      delete (eventWithoutHash as any).hash;
      const expectedHash = this.generateEventHash(eventWithoutHash);
      if (event.hash !== expectedHash) {
        corruptedEvents.push(event.id);
      }
    }
    
    return {
      totalEvents: events.length,
      validEvents: events.length - corruptedEvents.length,
      corruptedEvents,
      integrityScore: events.length > 0 ? (events.length - corruptedEvents.length) / events.length : 1
    };
  }

  /**
   * Private helper methods
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRiskLevel(action: AuditAction, resourceType: ResourceType, details: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk events
    if (action === 'data_breach_attempt' || action === 'access_denied') {
      return 'critical';
    }
    
    // High risk events
    if (action === 'delete' || action === 'export' || action === 'bulk_operation') {
      return 'high';
    }
    
    // Medium risk for sensitive data
    if (resourceType === 'patient_data' || resourceType === 'medical_record') {
      return 'medium';
    }
    
    return 'low';
  }

  private shouldEncrypt(resourceType: ResourceType, riskLevel: string): boolean {
    return resourceType === 'patient_data' || 
           resourceType === 'medical_record' || 
           riskLevel === 'high' || 
           riskLevel === 'critical';
  }

  private generateEventHash(event: Omit<AuditEvent, 'hash'>): string {
    const eventString = JSON.stringify(event, Object.keys(event).sort());
    // Simple hash function (in production, use a proper cryptographic hash)
    let hash = 0;
    for (let i = 0; i < eventString.length; i++) {
      const char = eventString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    const db = await this.dbManager.getDB();
    if (!db) throw new Error('Database not available');
    
    const transaction = db.transaction([this.AUDIT_STORE], 'readwrite');
    const store = transaction.objectStore(this.AUDIT_STORE);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async alertHighRiskEvent(event: AuditEvent): Promise<void> {
    // In a real implementation, this would send alerts to administrators
    console.warn('High-risk audit event detected:', {
      id: event.id,
      action: event.action,
      resourceType: event.resourceType,
      riskLevel: event.riskLevel,
      timestamp: event.timestamp
    });
  }

  private async cleanupOldEntries(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
      
      const db = await this.dbManager.getDB();
      if (!db) return;
      
      const transaction = db.transaction([this.AUDIT_STORE], 'readwrite');
      const store = transaction.objectStore(this.AUDIT_STORE);
      
      // Get all events to check dates (in production, use proper indexing)
      const allEvents = await new Promise<AuditEvent[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Delete old events
      for (const event of allEvents) {
        if (event.timestamp < cutoffDate) {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(event.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        }
      }
      
      // Also enforce max entries limit
      if (allEvents.length > this.MAX_AUDIT_ENTRIES) {
        const sortedEvents = allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const eventsToDelete = sortedEvents.slice(0, allEvents.length - this.MAX_AUDIT_ENTRIES);
        
        for (const event of eventsToDelete) {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(event.id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old audit entries:', error);
    }
  }
}

// Export singleton instance
export const auditTrail = AuditTrailManager.getInstance();