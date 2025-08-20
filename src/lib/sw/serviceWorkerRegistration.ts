// Service Worker registration and background sync setup
import { toast } from 'sonner';
import { Workbox } from 'workbox-window';

// const isLocalhost = typeof window !== 'undefined' && Boolean(
//     window.location.hostname === 'localhost' ||
//     window.location.hostname === '[::1]' ||
//     window.location.hostname.match(
//         /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
//     )
// );

interface ServiceWorkerConfig {
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onOfflineReady?: () => void;
    onError?: (error: any) => void;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let wb: Workbox | null = null;

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      // Check if service worker file exists first
      const swResponse = await fetch('/sw.js', { method: 'HEAD' });
      if (!swResponse.ok) {
        console.log('Service worker file not found, skipping registration');
        return null;
      }

      // Initialize Workbox
      wb = new Workbox('/sw.js');

      // Handle service worker updates with Workbox
      wb.addEventListener('waiting', (event) => {
        // New content is available
        toast.info('New version available! Click to update.', {
          action: {
            label: 'Update',
            onClick: () => {
              wb?.messageSkipWaiting();
              window.location.reload();
            }
          },
          duration: 10000
        });
      });

      wb.addEventListener('controlling', () => {
        // Service worker is now controlling the page
        window.location.reload();
      });

      wb.addEventListener('activated', (event) => {
        // Service worker activated
        if (!event.isUpdate) {
          toast.success('App is ready for offline use!');
        }
      });

      // Register the service worker
      const registration = await wb.register();

      // Setup background sync only if service worker is active
      if ('sync' in window.ServiceWorkerRegistration.prototype && registration && registration.active) {
        try {
          // Register for background sync
          await registration.sync.register('feedback-sync');
          console.log('Background sync registered successfully');
        } catch (error) {
          console.warn('Background sync registration failed:', error);
        }
      }

      console.log('Service Worker registered successfully with Workbox');
      return registration || null;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export function registerSW(config?: ServiceWorkerConfig) {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
        console.log('Service worker registration skipped in development mode');
        return;
    }
    
    // Use the new Workbox-based registration
    registerServiceWorker().then((registration) => {
        if (registration && config?.onSuccess) {
            config.onSuccess(registration);
        }
    }).catch((error) => {
        if (config?.onError) {
            config.onError(error);
        }
    });
}

function registerValidSW(swUrl: string, config?: ServiceWorkerConfig) {
    navigator.serviceWorker
        .register(swUrl)
        .then((registration: ServiceWorkerRegistration) => {
            // Setup background sync
            setupBackgroundSync();

            registration.addEventListener('updatefound', () => {
                const installingWorker = registration.installing;
                if (installingWorker == null) {
                    return;
                }
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            console.log(
                                'New content is available and will be used when all tabs for this page are closed.'
                            );
                            if (config && config.onUpdate) {
                                config.onUpdate(registration);
                            }
                        } else {
                            console.log('Content is cached for offline use.');
                            if (config && config.onSuccess) {
                                config.onSuccess(registration);
                            }
                            if (config && config.onOfflineReady) {
                                config.onOfflineReady();
                            }
                        }
                    }
                };
            })
        })
        .catch((error) => {
            console.error('Error during service worker registration:', error);
        });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
    fetch(swUrl, {
        headers: { 'Service-Worker': 'script' },
    })
        .then((response) => {
            const contentType = response.headers.get('content-type');
            if (
                response.status === 404 ||
                (contentType != null && contentType.indexOf('javascript') === -1)
            ) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.unregister().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                registerValidSW(swUrl, config);
            }
        })
        .catch(() => {
            console.log(
                'No internet connection found. App is running in offline mode.'
            );
        });
}

// Export the function to avoid unused warning
export { checkValidServiceWorker };

function setupBackgroundSync() {
    // Register for background sync
    if ('sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((swRegistration) => {
            // Only register if service worker is active
            if (swRegistration.active) {
                // Register background sync for feedback submission
                // Type assertion for sync API which may not be in all browsers
                return (swRegistration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register('feedback-sync');
            } else {
                console.warn('Service worker not active, skipping background sync registration');
            }
        }).catch((error) => {
            console.error('Background sync registration failed:', error);
        });
    }

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
            console.log('Background sync completed:', event.data);
            // Notify the app that sync is complete
            window.dispatchEvent(new CustomEvent('sw-sync-complete', {
                detail: event.data
            }));
        }
    });
}

// PWA Installation
export const setupPWAInstallPrompt = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Show install prompt after a delay
    setTimeout(() => {
      showInstallPrompt();
    }, 30000); // Show after 30 seconds
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    toast.success('App installed successfully!');
  });
};

export const showInstallPrompt = () => {
  if (deferredPrompt) {
    toast.info('Install this app for a better experience!', {
      action: {
        label: 'Install',
        onClick: async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
              console.log('User accepted the install prompt');
            } else {
              console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
          }
        }
      },
      duration: 10000
    });
  }
};

export const canInstallPWA = (): boolean => {
  return deferredPrompt !== null;
};

export function unregister() {
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error(error.message);
            });
    }
}

// Utility to trigger background sync manually
export function triggerBackgroundSync() {
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
            // Type assertion for sync API which may not be in all browsers
            return (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync?.register('feedback-sync');
        }).catch((error) => {
            console.error('Manual background sync failed:', error);
        });
    }
}

// Check if app is running in standalone mode (PWA)
export function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean })?.standalone === true
    );
}

// Prompt user to install PWA
export function promptInstall(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(false);
            return;
        }
        
        let deferredPrompt: Event | null = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
        });

        if (deferredPrompt) {
            (deferredPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }).prompt();
            (deferredPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }).userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    resolve(true);
                } else {
                    console.log('User dismissed the install prompt');
                    resolve(false);
                }
                deferredPrompt = null;
            });
        } else {
            resolve(false);
        }
    });
}