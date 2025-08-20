'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOfflineSync from '@/hooks/useOfflineSync';
import useFeedbackStore from '@/stores/feedbackStore';

interface OfflineFeedbackHandlerProps {
  children: React.ReactNode;
}

const OfflineFeedbackHandler: React.FC<OfflineFeedbackHandlerProps> = ({ children }) => {
  const { isOnline, isSyncing, pendingCount, error } = useOfflineSync();
  const { isOfflineMode, setOfflineMode } = useFeedbackStore();
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  // Handle offline mode changes
  useEffect(() => {
    setOfflineMode(!isOnline);
    
    if (!isOnline && !showOfflineNotification) {
      setShowOfflineNotification(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowOfflineNotification(false), 5000);
    }
  }, [isOnline, setOfflineMode, showOfflineNotification]);

  // Handle sync notifications
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      setShowSyncNotification(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowSyncNotification(false), 3000);
    }
  }, [isOnline, pendingCount, isSyncing]);

  return (
    <div className="relative">
      {children}
      
      {/* Offline Notification */}
      <AnimatePresence>
        {showOfflineNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <span className="text-xl">📡</span>
              <div>
                <div className="font-medium">Working Offline</div>
                <div className="text-sm opacity-90">
                  Your responses will be saved and synced when connection is restored
                </div>
              </div>
              <button
                onClick={() => setShowOfflineNotification(false)}
                className="ml-2 text-white hover:text-orange-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Notification */}
      <AnimatePresence>
        {showSyncNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="text-xl"
              >
                🔄
              </motion.span>
              <div>
                <div className="font-medium">Syncing Responses</div>
                <div className="text-sm opacity-90">
                  {pendingCount} response{pendingCount !== 1 ? 's' : ''} being synced
                </div>
              </div>
              <button
                onClick={() => setShowSyncNotification(false)}
                className="ml-2 text-white hover:text-blue-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Notification */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <div className="font-medium">Sync Error</div>
                <div className="text-sm opacity-90">{error}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Mode Indicator (Persistent) */}
      {isOfflineMode && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-orange-100 border border-orange-300 text-orange-800 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm">
            <span>📡</span>
            <span>Offline Mode</span>
            {pendingCount > 0 && (
              <span className="bg-orange-200 px-2 py-1 rounded-full text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineFeedbackHandler;