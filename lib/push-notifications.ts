export async function subscribeToPush(t?: (key: string) => string) {
    if (!('serviceWorker' in navigator)) {
        throw new Error(t ? t('pushNotSupported') : 'Service workers are not supported');
    }

    if (!('PushManager' in window)) {
        throw new Error(t ? t('pushNotSupported') : 'Push notifications are not supported');
    }

    // Check current permission
    let permission = Notification.permission;
    if (permission === 'denied') {
        throw new Error(t ? t('pushDenied') : 'Notification permission denied. Please reset permissions in your browser settings.');
    }

    if (permission === 'default') {
        permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error(t ? t('pushError') : 'Notification permission not granted.');
        }
    }

    const registration = await navigator.serviceWorker.ready;

    // Check if subscription already exists
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('VAPID public key not found');
            throw new Error(t ? t('pushConfigError') : 'VAPID configuration error');
        }

        try {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
        } catch (err) {
            console.error('Failed to subscribe to push:', err);
            throw new Error(t ? t('pushFailed') : 'Failed to subscribe to push notifications');
        }
    }

    return subscription;
}

export async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        await subscription.unsubscribe();
        return subscription.endpoint;
    }
    return null;
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
