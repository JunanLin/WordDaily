// @ts-nocheck
/// <reference lib="WebWorker" />

declare let self: ServiceWorkerGlobalScope;

// To disable all console logs in production, you can set this to false
const debug = false;

self.addEventListener('push', (event) => {
    if (debug) console.log('[Service Worker] Push Received.');

    // iOS requires every push to show a notification, or it may revoke the subscription.
    if (!event.data) {
        if (debug) console.log('[Service Worker] Push event but no data');
        event.waitUntil(self.registration.showNotification('WordDaily', {
            body: 'You have a new notification!',
            icon: '/icons/icon-192x192.png',
        }));
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

    // client.url is absolute, so resolve the (relative) target before comparing.
    const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus a window already showing the target, else reuse any open app window
            const exact = windowClients.find((client) => client.url === urlToOpen);
            if (exact && 'focus' in exact) {
                return exact.focus();
            }
            const anyClient = windowClients.find((client) => new URL(client.url).origin === self.location.origin);
            if (anyClient && 'navigate' in anyClient) {
                // navigate() rejects for windows this worker doesn't control; fall back to a new window
                return anyClient.navigate(urlToOpen)
                    .then((client) => (client || anyClient).focus())
                    .catch(() => self.clients.openWindow && self.clients.openWindow(urlToOpen));
            }
            // If not, then open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
