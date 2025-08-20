import { IndexedDBManager, OfflineFeedbackEntry, SyncQueueEntry } from '@/lib/db/indexedDB';
import { FeedbackSubmission } from '@/types';
import { toast } from 'sonner';

interface SyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  onProgress?: (progress: { completed: number; total: number; current?: string }) => void;
  onError?: (error: Error, entry?: OfflineFeedbackEntry | SyncQueueEntry) => void;
  onSuccess?: (synced: number) => void;
}

class SyncManager {
  private dbManager: IndexedDBManager;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private activeSyncIds: Set<string> = new Set();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.dbManager = IndexedDBManager.getInstance();
    if (typeof window !== 'undefined') {
      this.setupOnlineListener();
    }
  }

  async init(): Promise<void> {
    await this.dbManager.init();
  }

  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async triggerSync(options: SyncOptions = {}): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      await this.syncFeedback(options);
      await this.syncQueue(options);
      await this.syncSettings(options);
      
      // Cleanup after successful sync
      await this.dbManager.cleanup();
      
      if (options.onSuccess) {
        const stats = await this.dbManager.getStorageStats();
        options.onSuccess(stats.feedbackCount + stats.syncQueueCount);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (options.onError) {
        options.onError(error as Error);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncFeedback(options: SyncOptions): Promise<void> {
    const pendingFeedback = await this.dbManager.getPendingFeedback();
    const batchSize = options.batchSize || 5;
    let completed = 0;

    for (let i = 0; i < pendingFeedback.length; i += batchSize) {
      const batch = pendingFeedback.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (entry) => {
          if (this.activeSyncIds.has(entry.id)) {
            return; // Already being synced
          }

          this.activeSyncIds.add(entry.id);
          
          try {
            await this.syncFeedbackEntry(entry);
            completed++;
            
            if (options.onProgress) {
              options.onProgress({
                completed,
                total: pendingFeedback.length,
                current: `Feedback ${entry.id}`
              });
            }
          } catch (error: unknown) {
            console.error(`Failed to sync feedback ${entry.id}:`, error);
            if (options.onError) {
              options.onError(error as Error, entry);
            }
            
            // Schedule retry if not exceeded max attempts
            if (entry.retryCount < (options.maxRetries || 3)) {
              this.scheduleRetry(entry.id, options.retryDelay || 5000);
            }
          } finally {
            this.activeSyncIds.delete(entry.id);
          }
        })
      );
    }
  }

  private async syncFeedbackEntry(entry: OfflineFeedbackEntry): Promise<void> {
    try {
      await this.dbManager.updateFeedbackStatus(entry.id, 'syncing');
      
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry.feedbackData,
          offlineId: entry.id,
          submittedAt: new Date(entry.timestamp).toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Mark as synced
      await this.dbManager.updateFeedbackStatus(entry.id, 'synced');
      
      console.log(`Feedback ${entry.id} synced successfully:`, result);
    } catch (error) {
      await this.dbManager.updateFeedbackStatus(
        entry.id, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  private async syncQueue(options: SyncOptions): Promise<void> {
    const queueEntries = await this.dbManager.getSyncQueue();
    
    for (const entry of queueEntries) {
      if (this.activeSyncIds.has(entry.id)) {
        continue; // Already being synced
      }

      this.activeSyncIds.add(entry.id);
      
      try {
        await this.syncQueueEntry(entry);
      } catch (error: unknown) {
        console.error(`Failed to sync queue entry ${entry.id}:`, error);
        if (options.onError) {
          options.onError(error as Error, entry);
        }
        
        if (entry.retryCount < (options.maxRetries || 3)) {
          this.scheduleRetry(entry.id, options.retryDelay || 5000, true);
        }
      } finally {
        this.activeSyncIds.delete(entry.id);
      }
    }
  }

  private async syncQueueEntry(entry: SyncQueueEntry): Promise<void> {
    try {
      await this.dbManager.updateSyncQueueStatus(entry.id, 'syncing');
      
      const response = await fetch(entry.endpoint, {
        method: entry.method,
        headers: {
          'Content-Type': 'application/json',
          ...entry.headers
        },
        body: entry.method !== 'GET' ? JSON.stringify(entry.data) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Mark as synced and remove from queue
      await this.dbManager.updateSyncQueueStatus(entry.id, 'synced');
      await this.dbManager.removeSyncQueueEntry(entry.id);
      
      console.log(`Queue entry ${entry.id} synced successfully`);
    } catch (error) {
      await this.dbManager.updateSyncQueueStatus(
        entry.id, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  private async syncSettings(_options: SyncOptions): Promise<void> {
    const unsyncedSettings = await this.dbManager.getUnsyncedSettings();
    
    for (const setting of unsyncedSettings) {
      try {
        // Add to sync queue for settings
        await this.dbManager.addToSyncQueue({
          type: 'settings',
          action: 'update',
          data: { key: setting.key, value: setting.value },
          endpoint: '/api/settings/sync',
          method: 'POST',
          priority: 'low'
        });
        
        await this.dbManager.markSettingSynced(setting.key);
      } catch (error: unknown) {
        console.error(`Failed to queue setting ${setting.key} for sync:`, error);
      }
    }
  }

  private scheduleRetry(id: string, delay: number, isQueueEntry: boolean = false): void {
    // Clear existing timeout
    const existingTimeout = this.retryTimeouts.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new retry
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(id);
      
      if (!this.isOnline) {
        return; // Skip retry if offline
      }

      try {
        if (isQueueEntry) {
          const queueEntries = await this.dbManager.getSyncQueue();
          const entry = queueEntries.find(e => e.id === id);
          if (entry) {
            await this.syncQueueEntry(entry);
          }
        } else {
          const pendingFeedback = await this.dbManager.getPendingFeedback();
          const entry = pendingFeedback.find(e => e.id === id);
          if (entry) {
            await this.syncFeedbackEntry(entry);
          }
        }
      } catch (error: unknown) {
          console.error(`Retry failed for ${id}:`, error);
        }
    }, delay);

    this.retryTimeouts.set(id, timeout);
  }

  async addFeedbackToQueue(
    feedbackData: FeedbackSubmission, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const id = await this.dbManager.addOfflineFeedback(feedbackData, priority);
    
    // Try immediate sync if online
    if (this.isOnline && !this.syncInProgress) {
      this.triggerSync({
        onSuccess: (synced) => {
          if (synced > 0) {
            toast.success(`${synced} feedback(s) synced successfully!`);
          }
        },
        onError: (error) => {
          toast.error('Sync failed. Will retry when online.');
        }
      });
    } else {
      toast.info('Feedback saved offline. Will sync when online.');
    }
    
    return id;
  }

  async getOfflineStats(): Promise<{
    pendingFeedback: number;
    pendingSync: number;
    lastSyncAttempt?: Date;
    isOnline: boolean;
  }> {
    const stats = await this.dbManager.getStorageStats();
    
    return {
      pendingFeedback: stats.feedbackCount,
      pendingSync: stats.syncQueueCount,
      isOnline: this.isOnline
    };
  }

  async forceSyncAll(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.triggerSync({
      maxRetries: 5,
      retryDelay: 2000,
      batchSize: 3,
      onProgress: (progress) => {
        console.log(`Sync progress: ${progress.completed}/${progress.total}`);
      },
      onSuccess: (synced) => {
        toast.success(`Successfully synced ${synced} items!`);
      },
      onError: (error) => {
        toast.error(`Sync error: ${error.message}`);
      }
    });
  }

  async clearAllData(): Promise<void> {
    // Clear all offline data (use with caution)
    const stores = ['offlineFeedback', 'syncQueue', 'appCache', 'appSettings'];
    
    for (const store of stores) {
      try {
        // This would require additional methods in IndexedDBManager
        // For now, we'll just clear the main feedback store
        if (store === 'offlineFeedback') {
          const allFeedback = await this.dbManager.getAllOfflineFeedback();
          for (const feedback of allFeedback) {
            await this.dbManager.removeFeedback(feedback.id);
          }
        }
      } catch (error: unknown) {
        console.error(`Failed to clear ${store}:`, error);
      }
    }
  }

  destroy(): void {
    // Clear all timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    
    // Close database connection
    this.dbManager.close();
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

export const getSyncManager = (): SyncManager => {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
};

export { SyncManager };
export type { SyncOptions };