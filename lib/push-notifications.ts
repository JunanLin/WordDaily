const SW_READY_TIMEOUT_MS = 10000;

function isIOSDevice() {
    // iPadOS 13+ reports a desktop "Macintosh" UA, so also check for a touch-capable Mac.
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Resolves with the active service worker registration, or throws if none becomes
 * active in time (e.g. the SW failed to install). `navigator.serviceWorker.ready`
 * alone never settles in that case, which used to leave the toggle hanging silently.
 */
async function getReadyRegistration(t?: (key: string) => string) {
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(t ? t('pushSwNotReady') : 'Service worker is not active. Please close and reopen the app.')), SW_READY_TIMEOUT_MS)
    );
    return Promise.race([navigator.serviceWorker.ready, timeout]);
}

export function isPushSupported() {
    return typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
}

/** Returns this device's current push subscription, or null if it has none. */
export async function getCurrentSubscription() {
    if (!isPushSupported()) return null;
    const registration = await getReadyRegistration();
    return registration.pushManager.getSubscription();
}

export async function subscribeToPush(t?: (key: string) => string): Promise<{
    subscription: PushSubscription;
    replacedEndpoint: string | null;
}> {
    if (!('serviceWorker' in navigator)) {
        throw new Error(t ? t('pushNotSupported') : 'Service workers are not supported');
    }

    const isIOS = isIOSDevice();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
        throw new Error(t ? t('pushIOSHelp') : 'On iOS, you must "Add to Home Screen" first to enable notifications.');
    }

    if (!('PushManager' in window) || !('Notification' in window)) {
        throw new Error(t ? t('pushNotSupported') : 'Push notifications are not supported in this browser.');
    }

    // Permission must be requested before any other await so it stays inside the user gesture (iOS).
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

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        throw new Error(t ? t('pushConfigError') : 'VAPID configuration error');
    }
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const registration = await getReadyRegistration(t);

    // Reuse a subscription made with the current VAPID key; replace one made with an old key
    // (a mismatched key makes Apple/FCM reject every send with 403).
    let replacedEndpoint: string | null = null;
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
        if (sameKey(existingSub.options.applicationServerKey, applicationServerKey)) {
            return { subscription: existingSub, replacedEndpoint: null };
        }
        replacedEndpoint = existingSub.endpoint;
        await existingSub.unsubscribe();
    }

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });
        return { subscription, replacedEndpoint };
    } catch (err) {
        console.error('Failed to subscribe to push:', err);
        throw new Error(t ? t('pushFailed') : 'Failed to subscribe to push notifications');
    }
}

export async function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator)) return null;

    const registration = await getReadyRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        await subscription.unsubscribe();
        return subscription.endpoint;
    }
    return null;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
    if (!a) return false;
    const view = new Uint8Array(a);
    return view.length === b.length && view.every((byte, i) => byte === b[i]);
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
