'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOfflineSync from '@/hooks/useOfflineSync';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showWhenOnline = false,
  position = 'top-right'
}) => {
  const [mounted, setMounted] = useState(false);
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    hasOfflineData, 
    error,
    forcSync 
  } = useOfflineSync();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  const shouldShow = !isOnline || (showWhenOnline && isOnline) || hasOfflineData || isSyncing || error;

  const getStatusInfo = () => {
    if (error) {
      return {
        text: 'Sync Error',
        color: 'bg-red-500',
        icon: '⚠️',
        description: error
      };
    }
    
    if (!isOnline) {
      return {
        text: 'Offline',
        color: 'bg-orange-500',
        icon: '📡',
        description: hasOfflineData ? `${pendingCount} responses pending sync` : 'Working offline'
      };
    }
    
    if (isSyncing) {
      return {
        text: 'Syncing...',
        color: 'bg-blue-500',
        icon: '🔄',
        description: 'Syncing offline responses'
      };
    }
    
    if (hasOfflineData) {
      return {
        text: `${pendingCount} Pending`,
        color: 'bg-yellow-500',
        icon: '⏳',
        description: 'Responses waiting to sync'
      };
    }
    
    return {
      text: 'Online',
      color: 'bg-green-500',
      icon: '✅',
      description: 'All data synced'
    };
  };

  const statusInfo = getStatusInfo();

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const handleClick = () => {
    if (hasOfflineData && isOnline && !isSyncing) {
      forcSync().catch(console.error);
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className={`
            fixed z-50 ${positionClasses[position]}
            ${className}
          `}
        >
          <div
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
              ${statusInfo.color} text-white text-sm font-medium
              ${hasOfflineData && isOnline && !isSyncing ? 'cursor-pointer hover:opacity-80' : ''}
              transition-opacity duration-200
            `}
            onClick={handleClick}
            title={statusInfo.description}
          >
            <span className={isSyncing ? 'animate-spin' : ''}>
              {statusInfo.icon}
            </span>
            <span>{statusInfo.text}</span>
            
            {/* Pulse animation for pending sync */}
            {hasOfflineData && isOnline && !isSyncing && (
              <motion.div
                className="w-2 h-2 bg-white dark:bg-gray-300 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;