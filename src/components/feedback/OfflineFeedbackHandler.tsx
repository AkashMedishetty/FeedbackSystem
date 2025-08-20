'use client';

import { useEffect, useState } from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { getSyncManager } from '@/lib/sync/syncManager';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';

interface OfflineStats {
  pendingFeedback: number;
  pendingSync: number;
  isOnline: boolean;
}

const OfflineFeedbackHandler = () => {
  const { isOnline } = useServiceWorker();
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const syncManager = getSyncManager();

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const initSyncManager = async () => {
      try {
        await syncManager.init();
        updateStats();
        retryCount = 0; // Reset on success
      } catch (error) {
        console.error('Failed to initialize sync manager:', error);
        
        // Set default stats if initialization fails
        setStats({
          pendingFeedback: 0,
          pendingSync: 0,
          isOnline: isOnline
        });
        
        // Retry initialization with exponential backoff
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            initSyncManager();
          }, delay);
        } else {
          console.warn('Max retries reached for IndexedDB initialization');
        }
      }
    };

    // Only initialize if we're in the browser
    if (typeof window !== 'undefined') {
      initSyncManager();
    }
  }, []);

  useEffect(() => {
    updateStats();
  }, [isOnline]);

  useEffect(() => {
    // Auto-sync when coming online
    if (isOnline && stats && (stats.pendingFeedback > 0 || stats.pendingSync > 0)) {
      handleAutoSync();
    }
  }, [isOnline, stats?.pendingFeedback, stats?.pendingSync]);

  const updateStats = async () => {
    try {
      const offlineStats = await syncManager.getOfflineStats();
      setStats(offlineStats);
    } catch (error) {
      console.error('Failed to get offline stats:', error);
      // Set default stats if IndexedDB is not initialized
      setStats({
        pendingFeedback: 0,
        pendingSync: 0,
        isOnline: isOnline
      });
    }
  };

  const handleAutoSync = async () => {
    if (syncing || !isOnline) return;

    setSyncing(true);
    try {
      await syncManager.triggerSync({
        onProgress: (progress) => {
          toast.loading(`Syncing... ${progress.completed}/${progress.total}`, {
            id: 'sync-progress'
          });
        },
        onSuccess: (synced) => {
          toast.dismiss('sync-progress');
          if (synced > 0) {
            toast.success(`Successfully synced ${synced} items!`);
          }
          updateStats();
        },
        onError: (error) => {
          toast.dismiss('sync-progress');
          toast.error('Sync failed. Will retry automatically.');
          console.error('Auto-sync failed:', error);
        }
      });
    } catch (error) {
      toast.dismiss('sync-progress');
      console.error('Auto-sync error:', error);
      // Don't show error toast for IndexedDB initialization issues
      if (error instanceof Error && !error.message.includes('IndexedDB not initialized')) {
        toast.error('Sync failed due to system error.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (syncing || !isOnline) return;

    setSyncing(true);
    try {
      await syncManager.forceSyncAll();
      updateStats();
    } catch (error) {
      console.error('Manual sync error:', error);
      // Handle IndexedDB initialization errors gracefully
      if (error instanceof Error && error.message.includes('IndexedDB not initialized')) {
        toast.error('Sync unavailable - initializing storage...');
      } else {
        toast.error(`Manual sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Don't render anything if there's no offline data
  if (!stats || (stats.pendingFeedback === 0 && stats.pendingSync === 0)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 h-6 w-6"
          >
            <Database className="h-3 w-3" />
          </Button>
        </div>

        {showDetails && (
          <div className="space-y-2 mb-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Pending Feedback:</span>
              <span className="font-medium">{stats.pendingFeedback}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Sync:</span>
              <span className="font-medium">{stats.pendingSync}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats.pendingFeedback + stats.pendingSync} items pending
          </div>
          
          {isOnline && (
            <Button
              onClick={handleManualSync}
              disabled={syncing}
              size="sm"
              variant="outline"
              className="ml-2"
            >
              {syncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">Sync</span>
            </Button>
          )}
        </div>

        {!isOnline && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Data will sync automatically when online
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineFeedbackHandler;