'use client';

import { useEffect, useState } from 'react';
import { registerSW, triggerBackgroundSync } from '@/lib/sw/serviceWorkerRegistration';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOfflineReady: boolean;
  needsUpdate: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
}

function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOfflineReady: false,
    needsUpdate: false,
    isOnline: navigator.onLine,
    registration: null,
  });

  useEffect(() => {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      setState(prev => ({ ...prev, isSupported: true }));

      // Register service worker
      registerSW({
        onSuccess: (registration) => {
          console.log('Service Worker registered successfully');
          setState(prev => ({
            ...prev,
            isRegistered: true,
            registration,
          }));
        },
        onUpdate: (registration) => {
          console.log('Service Worker update available');
          setState(prev => ({
            ...prev,
            needsUpdate: true,
            registration,
          }));
        },
        onOfflineReady: () => {
          console.log('App is ready to work offline');
          setState(prev => ({
            ...prev,
            isOfflineReady: true,
          }));
        },
      });

      // Listen for service worker sync events
      const handleSyncComplete = (event: CustomEvent) => {
        console.log('Service Worker sync completed:', event.detail);
      };

      window.addEventListener('sw-sync-complete', handleSyncComplete as EventListener);

      // Listen for online/offline events
      const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
      const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('sw-sync-complete', handleSyncComplete as EventListener);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const updateServiceWorker = () => {
    if (state.registration && state.registration.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const triggerSync = () => {
    triggerBackgroundSync();
  };

  return {
    ...state,
    updateServiceWorker,
    triggerSync,
  };
}

// Export both default and named
export { useServiceWorker };
export default useServiceWorker;