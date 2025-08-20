'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { registerSW, setupPWAInstallPrompt } from '@/lib/sw/serviceWorkerRegistration';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { usePathname } from 'next/navigation';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import OfflineFeedbackHandler from '@/components/feedback/OfflineFeedbackHandler';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const { isSupported, needsUpdate, updateServiceWorker } = useServiceWorker();
  const pathname = usePathname();
  
  // Only use SessionProvider for admin routes
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/api/auth');

  useEffect(() => {
    // Register service worker
    registerSW({
      onSuccess: (registration) => {
        console.log('SW registered: ', registration);
      },
      onUpdate: (registration) => {
        console.log('SW updated: ', registration);
      },
      onOfflineReady: () => {
        console.log('SW offline ready');
      },
      onError: (error) => {
        console.error('SW registration failed:', error);
      }
    });

    // Setup PWA install prompt
    setupPWAInstallPrompt();
  }, []);

  useEffect(() => {
    // Show update notification if needed
    if (needsUpdate) {
      const shouldUpdate = window.confirm(
        'A new version of the app is available. Would you like to update now?'
      );
      if (shouldUpdate) {
        updateServiceWorker();
      }
    }
  }, [needsUpdate, updateServiceWorker]);

  const content = (
    <>
      {children}
      
      {/* Offline feedback handler */}
      <OfflineFeedbackHandler />
      
      {/* Show offline indicator */}
      <OfflineIndicator 
        position="top-right"
        showWhenOnline={false}
      />
      
      {/* Service Worker not supported warning */}
      {!isSupported && (
        <div className="fixed bottom-4 left-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm">
          <strong>Note:</strong> Offline functionality is not supported in this browser.
        </div>
      )}
    </>
  );

  return (
    <ThemeProvider defaultTheme="system" storageKey="patient-feedback-theme">
      <QueryClientProvider client={queryClient}>
        {isAdminRoute ? (
          <SessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={false}
          >
            {content}
          </SessionProvider>
        ) : (
          content
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default ClientLayout;