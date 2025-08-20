'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useOfflineSync from '@/hooks/useOfflineSync';
import { OfflineFeedbackEntry } from '@/lib/db/indexedDB';

interface SyncStatusPanelProps {
  className?: string;
}

const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({ className = '' }) => {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSyncAt,
    error,
    forcSync,
    clearSyncedData,
    getAllOfflineData
  } = useOfflineSync();

  const [offlineData, setOfflineData] = useState<OfflineFeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadOfflineData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllOfflineData();
      setOfflineData(data);
    } catch (err) {
      console.error('Failed to load offline data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAllOfflineData]);

  useEffect(() => {
    if (showDetails) {
      loadOfflineData();
    }
  }, [showDetails, pendingCount, loadOfflineData]);



  const handleForceSync = async () => {
    try {
      await forcSync();
    } catch (err) {
      console.error('Force sync failed:', err);
    }
  };

  const handleClearSynced = async () => {
    try {
      await clearSyncedData();
      await loadOfflineData();
    } catch (err) {
      console.error('Clear synced data failed:', err);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: OfflineFeedbackEntry['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'synced': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sync Status</h3>
        <div className="flex items-center gap-2">
          <div className={`
            w-3 h-3 rounded-full
            ${isOnline ? 'bg-green-500' : 'bg-red-500'}
          `} />
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingCount}</div>
          <div className="text-sm text-gray-600">Pending Sync</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isSyncing ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                🔄
              </motion.span>
            ) : (
              '✅'
            )}
          </div>
          <div className="text-sm text-gray-600">
            {isSyncing ? 'Syncing...' : 'Ready'}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {lastSyncAt ? formatTimestamp(lastSyncAt) : 'Never'}
          </div>
          <div className="text-sm text-gray-600">Last Sync</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <span className="text-red-800 font-medium">Sync Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleForceSync}
          disabled={!isOnline || isSyncing || pendingCount === 0}
          className="
            px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
            hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors duration-200
          "
        >
          {isSyncing ? 'Syncing...' : 'Force Sync'}
        </button>
        
        <button
          onClick={handleClearSynced}
          className="
            px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium
            hover:bg-gray-700 transition-colors duration-200
          "
        >
          Clear Synced Data
        </button>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="
            px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium
            hover:bg-gray-200 transition-colors duration-200
          "
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t pt-4"
        >
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Offline Feedback Entries</h4>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading...</p>
            </div>
          ) : offlineData.length === 0 ? (
            <p className="text-gray-600 text-sm">No offline data found.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {offlineData.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {entry.feedbackData.mobileNumber}
                      </span>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${getStatusColor(entry.status)}
                      `}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Created: {formatTimestamp(entry.timestamp)}
                      {entry.lastRetryAt && (
                        <span className="ml-2">
                          Last retry: {formatTimestamp(entry.lastRetryAt)}
                        </span>
                      )}
                    </div>
                    {entry.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {entry.error}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Retries: {entry.retryCount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default SyncStatusPanel;