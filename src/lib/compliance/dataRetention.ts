import { IndexedDBManager } from '@/lib/db/indexedDB';
import { auditTrail } from './auditTrail';
import { encryptData, decryptData } from '@/lib/security/encryption';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  retentionPeriodDays: number;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface DataRecord {
  id: string;
  dataType: DataType;
  createdAt: Date;
  lastAccessedAt: Date;
  retentionPolicyId: string;
  scheduledDeletionDate: Date;
  isArchived: boolean;
  archiveLocation?: string;
  metadata: Record<string, any>;
  encryptedData?: string;
}

export interface RetentionAction {
  id: string;
  recordId: string;
  action: 'archive' | 'delete' | 'extend' | 'restore';
  scheduledDate: Date;
  executedDate?: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  approvedBy?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export type DataType = 
  | 'patient_feedback'
  | 'patient_data'
  | 'medical_records'
  | 'audit_logs'
  | 'user_sessions'
  | 'system_logs'
  | 'backup_data'
  | 'temporary_files';

export class DataRetentionManager {
  private static instance: DataRetentionManager;
  private dbManager: IndexedDBManager;
  private readonly POLICIES_STORE = 'retentionPolicies';
  private readonly RECORDS_STORE = 'dataRecords';
  private readonly ACTIONS_STORE = 'retentionActions';
  
  // Default HIPAA-compliant retention periods (in days)
  private readonly DEFAULT_RETENTION_PERIODS: Record<DataType, number> = {
    patient_feedback: 2555, // 7 years
    patient_data: 2555, // 7 years
    medical_records: 2555, // 7 years
    audit_logs: 2555, // 7 years
    user_sessions: 90, // 3 months
    system_logs: 365, // 1 year
    backup_data: 1095, // 3 years
    temporary_files: 30 // 1 month
  };

  private constructor() {
    this.dbManager = IndexedDBManager.getInstance();
  }

  static getInstance(): DataRetentionManager {
    if (!DataRetentionManager.instance) {
      DataRetentionManager.instance = new DataRetentionManager();
    }
    return DataRetentionManager.instance;
  }

  /**
   * Initialize data retention system
   */
  async init(): Promise<void> {
    await this.dbManager.init();
    await this.createDefaultPolicies();
    await this.scheduleRetentionTasks();
  }

  /**
   * Create a new retention policy
   */
  async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const policyId = this.generateId('policy');
    const now = new Date();
    
    const newPolicy: RetentionPolicy = {
      ...policy,
      id: policyId,
      createdAt: now,
      updatedAt: now
    };
    
    await this.storePolicyInDB(newPolicy);
    
    await auditTrail.logEvent(
      'create',
      'system_settings',
      policyId,
      undefined,
      {
        description: `Created retention policy: ${policy.name}`,
        newValues: { name: policy.name, dataType: policy.dataType, retentionPeriodDays: policy.retentionPeriodDays }
      }
    );
    
    return policyId;
  }

  /**
   * Register a data record for retention tracking
   */
  async registerDataRecord(
    dataType: DataType,
    recordId: string,
    metadata: Record<string, any> = {},
    customRetentionDays?: number
  ): Promise<void> {
    const policy = await this.getPolicyForDataType(dataType);
    const retentionDays = customRetentionDays || policy.retentionPeriodDays;
    
    const now = new Date();
    const scheduledDeletionDate = new Date(now.getTime() + (retentionDays * 24 * 60 * 60 * 1000));
    
    const dataRecord: DataRecord = {
      id: recordId,
      dataType,
      createdAt: now,
      lastAccessedAt: now,
      retentionPolicyId: policy.id,
      scheduledDeletionDate,
      isArchived: false,
      metadata
    };
    
    await this.storeRecordInDB(dataRecord);
    
    // Schedule retention actions if auto-delete is enabled
    if (policy.autoDelete) {
      await this.scheduleRetentionAction(recordId, 'delete', scheduledDeletionDate);
      
      // Schedule archiving if required
      if (policy.archiveBeforeDelete) {
        const archiveDate = new Date(scheduledDeletionDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days before deletion
        await this.scheduleRetentionAction(recordId, 'archive', archiveDate);
      }
    }
  }

  /**
   * Update last accessed time for a record
   */
  async updateLastAccessed(recordId: string): Promise<void> {
    const record = await this.getDataRecord(recordId);
    if (record) {
      record.lastAccessedAt = new Date();
      await this.storeRecordInDB(record);
    }
  }

  /**
   * Get records due for retention actions
   */
  async getRecordsDueForAction(action: 'archive' | 'delete', beforeDate: Date = new Date()): Promise<DataRecord[]> {
    const actions = await this.getPendingActions();
    const dueActions = actions.filter(a => 
      a.action === action && 
      a.scheduledDate <= beforeDate && 
      a.status === 'pending'
    );
    
    const records: DataRecord[] = [];
    for (const action of dueActions) {
      const record = await this.getDataRecord(action.recordId);
      if (record) {
        records.push(record);
      }
    }
    
    return records;
  }

  /**
   * Execute retention action
   */
  async executeRetentionAction(actionId: string, executedBy?: string): Promise<boolean> {
    try {
      const action = await this.getRetentionAction(actionId);
      if (!action || action.status !== 'pending') {
        return false;
      }
      
      const record = await this.getDataRecord(action.recordId);
      if (!record) {
        action.status = 'failed';
        action.metadata = { error: 'Record not found' };
        await this.storeActionInDB(action);
        return false;
      }
      
      let success = false;
      
      switch (action.action) {
        case 'archive':
          success = await this.archiveRecord(record);
          break;
        case 'delete':
          success = await this.deleteRecord(record);
          break;
        case 'extend':
          success = await this.extendRetention(record, 365); // Extend by 1 year
          break;
        case 'restore':
          success = await this.restoreRecord(record);
          break;
      }
      
      // Update action status
      action.status = success ? 'completed' : 'failed';
      action.executedDate = new Date();
      await this.storeActionInDB(action);
      
      // Log audit event
      await auditTrail.logEvent(
        action.action === 'delete' ? 'delete' : 'update',
        this.mapDataTypeToResourceType(record.dataType),
        record.id,
        executedBy,
        {
          description: `Executed retention action: ${action.action}`,
          reason: action.reason,
          metadata: { actionId, executedBy }
        }
      );
      
      return success;
    } catch (error) {
      console.error('Failed to execute retention action:', error);
      return false;
    }
  }

  /**
   * Generate retention report
   */
  async generateRetentionReport(): Promise<{
    totalRecords: number;
    recordsByType: Record<DataType, number>;
    recordsDueForArchival: number;
    recordsDueForDeletion: number;
    archivedRecords: number;
    pendingActions: number;
    complianceScore: number;
  }> {
    const allRecords = await this.getAllDataRecords();
    const pendingActions = await this.getPendingActions();
    const now = new Date();
    
    const report = {
      totalRecords: allRecords.length,
      recordsByType: {} as Record<DataType, number>,
      recordsDueForArchival: 0,
      recordsDueForDeletion: 0,
      archivedRecords: 0,
      pendingActions: pendingActions.length,
      complianceScore: 0
    };
    
    // Count records by type and status
    allRecords.forEach(record => {
      report.recordsByType[record.dataType] = (report.recordsByType[record.dataType] || 0) + 1;
      
      if (record.isArchived) {
        report.archivedRecords++;
      }
      
      if (record.scheduledDeletionDate <= now) {
        report.recordsDueForDeletion++;
      }
      
      // Check if due for archival (30 days before deletion)
      const archivalDate = new Date(record.scheduledDeletionDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      if (archivalDate <= now && !record.isArchived) {
        report.recordsDueForArchival++;
      }
    });
    
    // Calculate compliance score (percentage of records properly managed)
    const overdueRecords = report.recordsDueForDeletion;
    report.complianceScore = allRecords.length > 0 ? 
      Math.max(0, (allRecords.length - overdueRecords) / allRecords.length) : 1;
    
    return report;
  }

  /**
   * Execute all pending retention actions
   */
  async executeRetentionActions(): Promise<RetentionAction[]> {
    const pendingActions = await this.getPendingActions();
    const executedActions: RetentionAction[] = [];
    
    for (const action of pendingActions) {
      const success = await this.executeRetentionAction(action.id);
      if (success) {
        executedActions.push(action);
      }
    }
    
    return executedActions;
  }

  /**
   * Register data for retention management (alias for registerDataRecord)
   */
  async registerData(dataType: string, dataId: string, metadata?: Record<string, any>): Promise<void> {
    await this.registerDataRecord(dataType as DataType, dataId, metadata || {});
  }

  /**
   * Private helper methods
   */
  private async createDefaultPolicies(): Promise<void> {
    const existingPolicies = await this.getAllPolicies();
    
    for (const [dataType, retentionDays] of Object.entries(this.DEFAULT_RETENTION_PERIODS)) {
      const exists = existingPolicies.some(p => p.dataType === dataType && p.isActive);
      
      if (!exists) {
        await this.createRetentionPolicy({
          name: `Default ${dataType} Policy`,
          description: `HIPAA-compliant retention policy for ${dataType}`,
          dataType: dataType as DataType,
          retentionPeriodDays: retentionDays,
          autoDelete: dataType !== 'patient_data' && dataType !== 'medical_records', // Manual approval for sensitive data
          archiveBeforeDelete: true,
          requiresApproval: dataType === 'patient_data' || dataType === 'medical_records',
          isActive: true
        });
      }
    }
  }

  private async scheduleRetentionTasks(): Promise<void> {
    // In a real implementation, this would set up background tasks
    // For now, we'll just log that tasks are scheduled
    console.log('Retention tasks scheduled');
  }

  private async scheduleRetentionAction(
    recordId: string,
    action: 'archive' | 'delete',
    scheduledDate: Date
  ): Promise<void> {
    const actionId = this.generateId('action');
    
    const retentionAction: RetentionAction = {
      id: actionId,
      recordId,
      action,
      scheduledDate,
      status: 'pending'
    };
    
    await this.storeActionInDB(retentionAction);
  }

  private async archiveRecord(record: DataRecord): Promise<boolean> {
    try {
      // In a real implementation, this would move data to long-term storage
      record.isArchived = true;
      record.archiveLocation = `archive/${record.dataType}/${record.id}`;
      
      // Encrypt archived data
      if (record.metadata) {
        record.encryptedData = encryptData(JSON.stringify(record.metadata));
        record.metadata = {}; // Clear metadata instead of deleting
      }
      
      await this.storeRecordInDB(record);
      return true;
    } catch (error) {
      console.error('Failed to archive record:', error);
      return false;
    }
  }

  private async deleteRecord(record: DataRecord): Promise<boolean> {
    try {
      // In a real implementation, this would securely delete the actual data
      await this.removeRecordFromDB(record.id);
      return true;
    } catch (error) {
      console.error('Failed to delete record:', error);
      return false;
    }
  }

  private async extendRetention(record: DataRecord, extensionDays: number): Promise<boolean> {
    try {
      const extensionMs = extensionDays * 24 * 60 * 60 * 1000;
      record.scheduledDeletionDate = new Date(record.scheduledDeletionDate.getTime() + extensionMs);
      await this.storeRecordInDB(record);
      return true;
    } catch (error) {
      console.error('Failed to extend retention:', error);
      return false;
    }
  }

  private async restoreRecord(record: DataRecord): Promise<boolean> {
    try {
      if (record.isArchived && record.encryptedData) {
        const decryptedData = decryptData(record.encryptedData);
        record.metadata = JSON.parse(decryptedData);
        delete record.encryptedData;
      }
      
      record.isArchived = false;
      delete record.archiveLocation;
      await this.storeRecordInDB(record);
      return true;
    } catch (error) {
      console.error('Failed to restore record:', error);
      return false;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapDataTypeToResourceType(dataType: DataType): any {
    const mapping: Record<DataType, string> = {
      patient_feedback: 'feedback',
      patient_data: 'patient_data',
      medical_records: 'medical_record',
      audit_logs: 'audit_log',
      user_sessions: 'user_account',
      system_logs: 'system_settings',
      backup_data: 'backup',
      temporary_files: 'system_settings'
    };
    return mapping[dataType] || 'system_settings';
  }

  // Database operations
  private async storePolicyInDB(policy: RetentionPolicy): Promise<void> {
    // Implementation would store in IndexedDB
    console.log('Storing policy:', policy.id);
  }

  private async storeRecordInDB(record: DataRecord): Promise<void> {
    // Implementation would store in IndexedDB
    console.log('Storing record:', record.id);
  }

  private async storeActionInDB(action: RetentionAction): Promise<void> {
    // Implementation would store in IndexedDB
    console.log('Storing action:', action.id);
  }

  private async removeRecordFromDB(recordId: string): Promise<void> {
    // Implementation would remove from IndexedDB
    console.log('Removing record:', recordId);
  }

  private async getPolicyForDataType(dataType: DataType): Promise<RetentionPolicy> {
    // Implementation would query IndexedDB
    return {
      id: 'default',
      name: `Default ${dataType} Policy`,
      description: '',
      dataType,
      retentionPeriodDays: this.DEFAULT_RETENTION_PERIODS[dataType],
      autoDelete: true,
      archiveBeforeDelete: true,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
  }

  private async getDataRecord(recordId: string): Promise<DataRecord | null> {
    // Implementation would query IndexedDB
    return null;
  }

  private async getRetentionAction(actionId: string): Promise<RetentionAction | null> {
    // Implementation would query IndexedDB
    return null;
  }

  private async getAllPolicies(): Promise<RetentionPolicy[]> {
    // Implementation would query IndexedDB
    return [];
  }

  private async getAllDataRecords(): Promise<DataRecord[]> {
    // Implementation would query IndexedDB
    return [];
  }

  private async getPendingActions(): Promise<RetentionAction[]> {
    // Implementation would query IndexedDB
    return [];
  }
}

// Export singleton instance
export const dataRetentionManager = DataRetentionManager.getInstance();