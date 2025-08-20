import { FeedbackSubmission } from '@/types';

// IndexedDB configuration
const DB_NAME = 'PatientFeedbackDB';
const DB_VERSION = 2;
const FEEDBACK_STORE = 'offlineFeedback';
const SYNC_QUEUE_STORE = 'syncQueue';
const CACHE_STORE = 'appCache';
const SETTINGS_STORE = 'appSettings';

// Maximum retry attempts
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

export interface OfflineFeedbackEntry {
  id: string;
  feedbackData: FeedbackSubmission;
  timestamp: number;
  retryCount: number;
  lastRetryAt?: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
  priority: 'high' | 'medium' | 'low';
  compressed?: boolean;
}

export interface SyncQueueEntry {
  id: string;
  type: 'feedback' | 'settings' | 'file';
  action: 'create' | 'update' | 'delete';
  data: any;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
  version: string;
}

export interface AppSetting {
  key: string;
  value: any;
  timestamp: number;
  synced: boolean;
}

class IndexedDBManager {
  private static instance: IndexedDBManager;
  private db: IDBDatabase | null = null;

  private constructor() {}

  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }

  getDB(): IDBDatabase | null {
    return this.db;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        
        // Create object store for offline feedback
        if (!db.objectStoreNames.contains(FEEDBACK_STORE)) {
          const feedbackStore = db.createObjectStore(FEEDBACK_STORE, { keyPath: 'id' });
          feedbackStore.createIndex('timestamp', 'timestamp', { unique: false });
          feedbackStore.createIndex('status', 'status', { unique: false });
          feedbackStore.createIndex('priority', 'priority', { unique: false });
          feedbackStore.createIndex('mobileNumber', 'feedbackData.mobileNumber', { unique: false });
        }
        
        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }
        
        // Create cache store
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
        
        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          const settingsStore = db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          settingsStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  async addOfflineFeedback(feedbackData: FeedbackSubmission, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entry: OfflineFeedbackEntry = {
      id,
      feedbackData: await this.compressData(feedbackData),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      priority,
      compressed: true
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readwrite');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const request = store.add(entry);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('Failed to store offline feedback'));
    });
  }

  async getPendingFeedback(): Promise<OfflineFeedbackEntry[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise(async (resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readonly');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = async () => {
        const entries = request.result;
        // Decompress data and sort by priority
        const decompressedEntries = await Promise.all(
          entries.map(async (entry) => ({
            ...entry,
            feedbackData: entry.compressed ? await this.decompressData(entry.feedbackData) : entry.feedbackData
          }))
        );
        
        // Sort by priority (high -> medium -> low) and timestamp
        const sortedEntries = decompressedEntries.sort((a, b) => {
          const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return a.timestamp - b.timestamp;
        });
        
        resolve(sortedEntries);
      };
      request.onerror = () => reject(new Error('Failed to get pending feedback'));
    });
  }

  async updateFeedbackStatus(
    id: string, 
    status: OfflineFeedbackEntry['status'], 
    error?: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readwrite');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.status = status;
          entry.lastRetryAt = Date.now();
          if (error) {
            entry.error = error;
            entry.retryCount += 1;
          }
          
          // Reset retry count on successful sync
          if (status === 'synced') {
            entry.retryCount = 0;
            entry.error = undefined;
          }
          
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update feedback status'));
        } else {
          reject(new Error('Feedback entry not found'));
        }
      };

      getRequest.onerror = () => reject(new Error('Failed to get feedback entry'));
    });
  }

  async removeFeedback(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readwrite');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove feedback'));
    });
  }

  async getAllOfflineFeedback(): Promise<OfflineFeedbackEntry[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise(async (resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readonly');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const request = store.getAll();

      request.onsuccess = async () => {
        const entries = request.result;
        const decompressedEntries = await Promise.all(
          entries.map(async (entry) => ({
            ...entry,
            feedbackData: entry.compressed ? await this.decompressData(entry.feedbackData) : entry.feedbackData
          }))
        );
        resolve(decompressedEntries);
      };
      request.onerror = () => reject(new Error('Failed to get all offline feedback'));
    });
  }

  async getOfflineFeedbackCount(): Promise<number> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readonly');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const index = store.index('status');
      const request = index.count('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to count offline feedback'));
    });
  }

  async clearSyncedFeedback(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FEEDBACK_STORE], 'readwrite');
      const store = transaction.objectStore(FEEDBACK_STORE);
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('synced'));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(new Error('Failed to clear synced feedback'));
    });
  }

  // Sync Queue Management
  async addToSyncQueue(entry: Omit<SyncQueueEntry, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const syncEntry: SyncQueueEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.add(syncEntry);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('Failed to add to sync queue'));
    });
  }

  async getSyncQueue(): Promise<SyncQueueEntry[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        const entries = request.result;
        // Sort by priority and timestamp
        const sortedEntries = entries.sort((a, b) => {
          const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return a.timestamp - b.timestamp;
        });
        resolve(sortedEntries);
      };
      request.onerror = () => reject(new Error('Failed to get sync queue'));
    });
  }

  async updateSyncQueueStatus(
    id: string,
    status: SyncQueueEntry['status'],
    error?: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.status = status;
          if (error) {
            entry.error = error;
            entry.retryCount += 1;
          }
          
          if (status === 'synced') {
            entry.retryCount = 0;
            entry.error = undefined;
          }
          
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update sync queue status'));
        } else {
          reject(new Error('Sync queue entry not found'));
        }
      };

      getRequest.onerror = () => reject(new Error('Failed to get sync queue entry'));
    });
  }

  async removeSyncQueueEntry(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove sync queue entry'));
    });
  }

  // Cache Management
  async setCache(key: string, data: any, expiresIn?: number): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const entry: CacheEntry = {
      key,
      data: await this.compressData(data),
      timestamp: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      version: '1.0'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set cache'));
    });
  }

  async getCache(key: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise(async (resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.get(key);

      request.onsuccess = async () => {
        const entry = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if expired
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          // Remove expired entry
          this.removeCache(key);
          resolve(null);
          return;
        }

        const decompressedData = await this.decompressData(entry.data);
        resolve(decompressedData);
      };
      request.onerror = () => reject(new Error('Failed to get cache'));
    });
  }

  async removeCache(key: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove cache'));
    });
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE);
      const index = store.index('expiresAt');
      const now = Date.now();
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(new Error('Failed to clear expired cache'));
    });
  }

  // Settings Management
  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const setting: AppSetting = {
      key,
      value,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put(setting);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set setting'));
    });
  }

  async getSetting(key: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const setting = request.result;
        resolve(setting ? setting.value : null);
      };
      request.onerror = () => reject(new Error('Failed to get setting'));
    });
  }

  async getUnsyncedSettings(): Promise<AppSetting[]> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get unsynced settings'));
    });
  }

  async markSettingSynced(key: string): Promise<void> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        const setting = getRequest.result;
        if (setting) {
          setting.synced = true;
          const updateRequest = store.put(setting);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to mark setting as synced'));
        } else {
          reject(new Error('Setting not found'));
        }
      };

      getRequest.onerror = () => reject(new Error('Failed to get setting'));
    });
  }

  // Data Compression/Decompression
  private async compressData(data: any): Promise<any> {
    try {
      // Simple JSON compression - in production, consider using a proper compression library
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 1000) {
        // Only compress larger data
        return {
          compressed: true,
          data: jsonString // In production, use actual compression like pako
        };
      }
      return data;
    } catch (error) {
      console.warn('Failed to compress data:', error);
      return data;
    }
  }

  private async decompressData(data: any): Promise<any> {
    try {
      if (data && typeof data === 'object' && data.compressed) {
        return JSON.parse(data.data);
      }
      return data;
    } catch (error) {
      console.warn('Failed to decompress data:', error);
      return data;
    }
  }

  // Utility Methods
  async getStorageStats(): Promise<{
    feedbackCount: number;
    syncQueueCount: number;
    cacheCount: number;
    settingsCount: number;
    totalSize: number;
  }> {
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    const [feedbackCount, syncQueueCount, cacheCount, settingsCount] = await Promise.all([
      this.getStoreCount(FEEDBACK_STORE),
      this.getStoreCount(SYNC_QUEUE_STORE),
      this.getStoreCount(CACHE_STORE),
      this.getStoreCount(SETTINGS_STORE)
    ]);

    // Estimate total size (rough calculation)
    const totalSize = (feedbackCount + syncQueueCount + cacheCount + settingsCount) * 1024; // Rough estimate

    return {
      feedbackCount,
      syncQueueCount,
      cacheCount,
      settingsCount,
      totalSize
    };
  }

  private async getStoreCount(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to count ${storeName}`));
    });
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.clearExpiredCache(),
      this.clearSyncedFeedback()
    ]);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export the class and singleton instance
export { IndexedDBManager };
export const indexedDBManager = IndexedDBManager.getInstance();