export async function subscribeToPush(t?: (key: string) => string) {
    if (!('serviceWorker' in navigator)) {
        throw new Error(t ? t('pushNotSupported') : 'Service workers are not supported');
    }

    // iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
        throw new Error(t ? t('pushIOSHelp') : 'On iOS, you must "Add to Home Screen" first to enable notifications.');
    }

    if (!('PushManager' in window)) {
        throw new Error(t ? t('pushNotSupported') : 'Push notifications are not supported in this browser.');
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

    // Force a fresh subscription by unsubscribing first if one exists
    // This helps resolve 410 Gone errors where the browser has a stale token
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
        await existingSub.unsubscribe();
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        throw new Error(t ? t('pushConfigError') : 'VAPID configuration error');
    }

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        return subscription;
    } catch (err) {
        console.error('Failed to subscribe to push:', err);
        throw new Error(t ? t('pushFailed') : 'Failed to subscribe to push notifications');
    }
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
