import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Base ExtendableEvent interface
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

// Extend ServiceWorkerGlobalScope
declare const self: ServiceWorkerGlobalScope & {
  skipWaiting(): Promise<void>;
  registration: ServiceWorkerRegistration;
  clients: Clients;
  addEventListener(type: 'install', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: 'sync', listener: (event: SyncEvent) => void): void;
  addEventListener(type: 'push', listener: (event: PushEvent) => void): void;
  addEventListener(type: 'notificationclick', listener: (event: NotificationEvent) => void): void;
  addEventListener(type: 'message', listener: (event: ExtendableMessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  addEventListener(type: 'unhandledrejection', listener: (event: PromiseRejectionEvent) => void): void;
};

// Service Worker type definitions
interface ExtendableMessageEvent extends ExtendableEvent {
  data: any;
  origin: string;
  lastEventId: string;
  source: Client | ServiceWorker | MessagePort | null;
  ports: ReadonlyArray<MessagePort>;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  clientId: string;
  resultingClientId: string;
  replacesClientId: string;
  handled: Promise<void>;
  respondWith(response: Promise<Response> | Response): void;
  waitUntil(promise: Promise<any>): void;
}

interface SyncEvent extends ExtendableEvent {
  tag: string;
  lastChance: boolean;
  waitUntil(promise: Promise<any>): void;
}

interface NotificationEvent extends ExtendableEvent {
  action: string;
  notification: Notification;
  waitUntil(promise: Promise<any>): void;
}

interface PushEvent extends ExtendableEvent {
  data: PushMessageData | null;
}

interface PushMessageData {
  json(): any;
  text(): string;
  arrayBuffer(): ArrayBuffer;
}

interface Client {
  id: string;
  type: 'window' | 'worker' | 'sharedworker';
  url: string;
  postMessage(message: any): void;
}

interface Clients {
  claim(): Promise<void>;
  get(id: string): Promise<Client | undefined>;
  matchAll(options?: { includeUncontrolled?: boolean; type?: 'window' | 'worker' | 'sharedworker' | 'all' }): Promise<Client[]>;
  openWindow(url: string): Promise<WindowClient | null>;
}

interface WindowClient extends Client {
  focus(): Promise<WindowClient>;
  navigate(url: string): Promise<WindowClient>;
  visibilityState: 'hidden' | 'visible' | 'prerender';
  focused: boolean;
}

// Precache and route static assets (only in production)
if (process.env.NODE_ENV === 'production') {
  precacheAndRoute(self.__WB_MANIFEST);
  cleanupOutdatedCaches();
}

// Cache names
const CACHE_NAMES = {
  static: 'static-cache-v1',
  api: 'api-cache-v1',
  images: 'images-cache-v1',
  fonts: 'fonts-cache-v1',
  offline: 'offline-cache-v1',
};

// Background sync for offline feedback submissions
const bgSyncPlugin = new BackgroundSyncPlugin('feedback-sync', {
  maxRetentionTime: 24 * 60, // Retry for max of 24 hours (specified in minutes)
});

// Cache strategies for different resource types

// 1. Static assets (CSS, JS, fonts) - Cache First
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// 2. Images - Cache First with longer expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
      }),
    ],
  })
);

// 3. API routes - Network First with background sync for POST requests
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  ({ request }) => {
    if (request.method === 'POST') {
      // For POST requests, use background sync
      return new NetworkOnly({
        plugins: [bgSyncPlugin],
      }).handle({ request, event: self as any });
    } else {
      // For GET requests, use Network First
      return new NetworkFirst({
        cacheName: CACHE_NAMES.api,
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutes
          }),
        ],
      }).handle({ request, event: self as any });
    }
  }
);

// 4. HTML pages - Stale While Revalidate
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'pages-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// 5. Google Fonts - Cache First
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.fonts,
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: CACHE_NAMES.fonts,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
      }),
    ],
  })
);

// Offline fallback for navigation requests
const navigationRoute = new NavigationRoute(
  async ({ event }) => {
    try {
      const response = await fetch(event.request);
      return response;
    } catch (error) {
      // Return cached offline page
      const cache = await caches.open(CACHE_NAMES.offline);
      const offlineResponse = await cache.match('/offline.html');
      return offlineResponse || new Response('Offline', { status: 503 });
    }
  }
);

registerRoute(navigationRoute);

// Install event - cache offline page
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.offline).then((cache) => {
      return cache.addAll([
        '/offline.html',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old caches that don't match current version
            return !Object.values(CACHE_NAMES).includes(cacheName) &&
                   !cacheName.startsWith('workbox-');
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Background sync event for offline feedback submissions
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'feedback-sync') {
    event.waitUntil(
      syncOfflineFeedback()
    );
  }
});

// Custom sync function for feedback submissions
async function syncOfflineFeedback() {
  try {
    // Get all pending feedback from IndexedDB
    const pendingFeedback = await getAllPendingFeedback();
    
    for (const feedback of pendingFeedback) {
      try {
        const response = await fetch('/api/feedback/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedback.data),
        });
        
        if (response.ok) {
          // Remove from IndexedDB after successful sync
          await removePendingFeedback(feedback.id);
          
          // Notify clients about successful sync
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'FEEDBACK_SYNC_SUCCESS',
                payload: { id: feedback.id },
              });
            });
          });
        }
      } catch (error: unknown) {
        console.error('Failed to sync feedback:', error);
      }
    }
  } catch (_error: unknown) {
    console.error('Background sync failed:', _error);
  }
}

// IndexedDB helpers for offline feedback storage
async function getAllPendingFeedback(): Promise<Array<{ id: string; data: any }>> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PatientFeedbackDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingFeedback'], 'readonly');
      const store = transaction.objectStore('pendingFeedback');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingFeedback')) {
        db.createObjectStore('pendingFeedback', { keyPath: 'id' });
      }
    };
  });
}

async function removePendingFeedback(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PatientFeedbackDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingFeedback'], 'readwrite');
      const store = transaction.objectStore('pendingFeedback');
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notification handling (for future use)
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || '1',
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/dashboard')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});

// Error handling
self.addEventListener('error', (event: ErrorEvent) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

// Fetch event - handle requests
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    (async () => {
      try {
        // Try to fetch from network first
        const response = await fetch(event.request);
        return response;
      } catch (error) {
        // If network fails, try to serve from cache
        const cache = await caches.open(CACHE_NAMES.offline);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If no cache, return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          const offlineResponse = await cache.match('/offline.html');
          return offlineResponse || new Response('Offline', { status: 503 });
        }
        
        // For other requests, return a generic error response
        return new Response('Network error', { status: 503 });
      }
    })()
  );
});

// Export for TypeScript
export {};