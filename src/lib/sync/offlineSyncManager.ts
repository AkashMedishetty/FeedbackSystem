import { indexedDBManager, OfflineFeedbackEntry } from '@/lib/db/indexedDB';
import { FeedbackSubmission, ApiResponse, IFeedbackSession } from '@/types';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt?: number;
  syncError?: string;
}

export interface ConflictResolution {
  strategy: 'keep-latest' | 'keep-oldest' | 'merge' | 'skip';
  duplicateId?: string;
}

class OfflineSyncManager {
  private syncInProgress = false;
  private onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncInterval: NodeJS.Timeout | null = null;
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeOnlineStatusListener();
      this.initializeIndexedDB();
      this.startPeriodicSync();
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    try {
      await indexedDBManager.init();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
    }
  }

  private initializeOnlineStatusListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineStatusChange);
      window.addEventListener('offline', this.handleOnlineStatusChange);
    }
  }

  private handleOnlineStatusChange = (): void => {
    if (typeof navigator === 'undefined') return;
    
    const wasOffline = !this.onlineStatus;
    this.onlineStatus = navigator.onLine;
    
    if (wasOffline && this.onlineStatus) {
      // Just came back online, trigger sync
      this.syncPendingFeedback();
    }
    
    this.notifyStatusListeners();
  };

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.onlineStatus && !this.syncInProgress) {
        this.syncPendingFeedback();
      }
    }, this.SYNC_INTERVAL);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async storeFeedbackOffline(feedbackData: FeedbackSubmission): Promise<string> {
    try {
      const id = await indexedDBManager.addOfflineFeedback(feedbackData);
      this.notifyStatusListeners();
      
      // Try to sync immediately if online
      if (this.onlineStatus) {
        this.syncPendingFeedback();
      }
      
      return id;
    } catch (error) {
      console.error('Failed to store feedback offline:', error);
      throw error;
    }
  }

  async syncPendingFeedback(): Promise<void> {
    if (this.syncInProgress || !this.onlineStatus) {
      return;
    }

    this.syncInProgress = true;
    this.notifyStatusListeners();

    try {
      const pendingFeedback = await indexedDBManager.getPendingFeedback();
      
      for (const entry of pendingFeedback) {
        if (entry.retryCount >= this.MAX_RETRY_COUNT) {
          continue; // Skip entries that have exceeded retry limit
        }

        try {
          await indexedDBManager.updateFeedbackStatus(entry.id, 'syncing');
          
          // Check for duplicates before submitting
          const conflictResolution = await this.checkForDuplicates(entry.feedbackData);
          
          if (conflictResolution.strategy === 'skip') {
            await indexedDBManager.updateFeedbackStatus(entry.id, 'synced');
            continue;
          }

          // Submit feedback to server
          const response = await this.submitFeedbackToServer(entry.feedbackData);
          
          if (response.success) {
            await indexedDBManager.updateFeedbackStatus(entry.id, 'synced');
            // Remove synced feedback after a delay to allow for verification
            setTimeout(() => {
              indexedDBManager.removeFeedback(entry.id);
            }, 60000); // 1 minute delay
          } else {
            throw new Error(response.error?.message || 'Failed to submit feedback');
          }
        } catch (error) {
          console.error(`Failed to sync feedback ${entry.id}:`, error);
          await indexedDBManager.updateFeedbackStatus(
            entry.id, 
            'failed', 
            error instanceof Error ? error.message : 'Unknown error'
          );
          
          // Schedule retry with exponential backoff
          if (entry.retryCount < this.MAX_RETRY_COUNT) {
            setTimeout(() => {
              this.retrySingleFeedback(entry.id);
            }, this.RETRY_DELAY * Math.pow(2, entry.retryCount));
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync pending feedback:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyStatusListeners();
    }
  }

  private async retrySingleFeedback(id: string): Promise<void> {
    if (!this.onlineStatus) {
      return;
    }

    try {
      const allFeedback = await indexedDBManager.getAllOfflineFeedback();
      const entry = allFeedback.find(f => f.id === id);
      
      if (!entry || entry.status !== 'failed') {
        return;
      }

      await indexedDBManager.updateFeedbackStatus(id, 'syncing');
      
      const response = await this.submitFeedbackToServer(entry.feedbackData);
      
      if (response.success) {
        await indexedDBManager.updateFeedbackStatus(id, 'synced');
        setTimeout(() => {
          indexedDBManager.removeFeedback(id);
        }, 60000);
      } else {
        throw new Error(response.error?.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error(`Failed to retry feedback ${id}:`, error);
      await indexedDBManager.updateFeedbackStatus(
        id, 
        'failed', 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async checkForDuplicates(feedbackData: FeedbackSubmission): Promise<ConflictResolution> {
    try {
      // Check if feedback already exists on server
      const response = await fetch(`/api/feedback/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobileNumber: feedbackData.mobileNumber,
          consultationNumber: feedbackData.consultationNumber,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        // If we can't check for duplicates, proceed with submission
        return { strategy: 'keep-latest' };
      }

      const result = await response.json();
      
      if (result.data?.isDuplicate) {
        // For now, skip duplicates. In a more sophisticated system,
        // we could implement merge strategies or user prompts
        return { 
          strategy: 'skip', 
          duplicateId: result.data.existingId 
        };
      }

      return { strategy: 'keep-latest' };
    } catch (error) {
      console.error('Failed to check for duplicates:', error);
      // If duplicate check fails, proceed with submission
      return { strategy: 'keep-latest' };
    }
  }

  private async submitFeedbackToServer(feedbackData: FeedbackSubmission): Promise<ApiResponse<IFeedbackSession>> {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const pendingCount = await indexedDBManager.getOfflineFeedbackCount();
    
    return {
      isOnline: this.onlineStatus,
      isSyncing: this.syncInProgress,
      pendingCount,
      lastSyncAt: this.getLastSyncTime(),
    };
  }

  private getLastSyncTime(): number | undefined {
    const lastSync = localStorage.getItem('lastSyncTime');
    return lastSync ? parseInt(lastSync, 10) : undefined;
  }

  private setLastSyncTime(): void {
    localStorage.setItem('lastSyncTime', Date.now().toString());
  }

  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private async notifyStatusListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  async forcSync(): Promise<void> {
    if (!this.onlineStatus) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.syncPendingFeedback();
  }

  async clearSyncedData(): Promise<void> {
    await indexedDBManager.clearSyncedFeedback();
    this.notifyStatusListeners();
  }

  async getAllOfflineData(): Promise<OfflineFeedbackEntry[]> {
    return indexedDBManager.getAllOfflineFeedback();
  }

  destroy(): void {
    this.stopPeriodicSync();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineStatusChange);
      window.removeEventListener('offline', this.handleOnlineStatusChange);
    }
    indexedDBManager.close();
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();