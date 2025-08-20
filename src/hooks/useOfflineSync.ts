'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineSyncManager, SyncStatus } from '@/lib/sync/offlineSyncManager';
import { FeedbackSubmission } from '@/types';

export default function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize sync status
    const initializeStatus = async () => {
      try {
        const status = await offlineSyncManager.getSyncStatus();
        setSyncStatus(status);
      } catch (err) {
        console.error('Failed to get initial sync status:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize sync');
      }
    };

    initializeStatus();

    // Subscribe to status changes
    const unsubscribe = offlineSyncManager.onStatusChange((status) => {
      setSyncStatus(status);
      setError(null); // Clear error on successful status update
    });

    return unsubscribe;
  }, []);

  const storeFeedbackOffline = useCallback(async (feedbackData: FeedbackSubmission): Promise<string> => {
    try {
      setError(null);
      const id = await offlineSyncManager.storeFeedbackOffline(feedbackData);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store feedback offline';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const forcSync = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await offlineSyncManager.forcSync();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync feedback';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const clearSyncedData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await offlineSyncManager.clearSyncedData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear synced data';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getAllOfflineData = useCallback(async () => {
    try {
      setError(null);
      return await offlineSyncManager.getAllOfflineData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get offline data';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    // Status properties
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    pendingCount: syncStatus.pendingCount,
    lastSyncAt: syncStatus.lastSyncAt,
    error,

    // Methods
    storeFeedbackOffline,
    forcSync,
    clearSyncedData,
    getAllOfflineData,

    // Computed properties
    hasOfflineData: syncStatus.pendingCount > 0,
    canSync: syncStatus.isOnline && !syncStatus.isSyncing,
  };
}