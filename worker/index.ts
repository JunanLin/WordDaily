// @ts-nocheck
/// <reference lib="WebWorker" />

declare let self: ServiceWorkerGlobalScope;

// To disable all console logs in production, you can set this to false
const debug = true;

self.addEventListener('push', (event) => {
    if (debug) console.log('[Service Worker] Push Received.');

    if (!event.data) {
        if (debug) console.log('[Service Worker] Push event but no data');
        return;
    }

    try {
        const data = event.data.json();
        const title = data.title || 'WordDaily';
        const options = {
            body: data.body || 'You have a new notification!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
        if (debug) console.error('[Service Worker] Error parsing push data:', err);

        // Fallback for plain text
        const text = event.data.text();
        event.waitUntil(self.registration.showNotification('WordDaily', {
            body: text,
            icon: '/icons/icon-192x192.png',
        }));
    }
});

self.addEventListener('notificationclick', (event) => {
    if (debug) console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window open and focus it of not
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, then open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
