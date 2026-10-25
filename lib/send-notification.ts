import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export interface PushSendResult {
    host: string;
    statusCode: number;
    body?: string;
}

/**
 * Shared notification logic used by both the cron job and the test-notification endpoint.
 *
 * Sends a push notification to every registered subscription for the given user
 * (or only to `options.endpoint` when given). Removes expired (404/410) subscriptions.
 *
 * The caller passes the Supabase client: the test route uses the user's session client,
 * the cron job uses the service-role client (it has no session, so RLS would hide every row).
 */
export async function sendPushToUser(
    supabase: SupabaseClient,
    userId: string,
    payload: { title: string; body: string; url?: string },
    options: { endpoint?: string } = {}
): Promise<{ sent: number; failed: number; results: PushSendResult[] }> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!publicKey || !privateKey) {
        throw new Error('VAPID keys are missing');
    }

    webpush.setVapidDetails('mailto:xavier000011@gmail.com', publicKey, privateKey);

    let query = supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);
    if (options.endpoint) query = query.eq('endpoint', options.endpoint);

    const { data: subscriptions, error } = await query;

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0, results: [] };
    }

    let sent = 0;
    let failed = 0;
    const results: PushSendResult[] = [];
    const payloadStr = JSON.stringify(payload);

    for (const sub of subscriptions) {
        const host = safeHost(sub.endpoint);
        try {
            const res = await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payloadStr,
                // Keep the message for a day if the device is offline; 'high' wakes Android/iOS promptly.
                { TTL: 86400, urgency: 'high' }
            );
            results.push({ host, statusCode: res.statusCode });
            sent++;
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { statusCode = 0, body } = err as any;
            console.error(`Push failed for ${host} (${statusCode}):`, body || err);
            results.push({ host, statusCode, body: typeof body === 'string' ? body.slice(0, 200) : undefined });
            // 404 (FCM/Mozilla) and 410 (Apple/all) mean the subscription is gone for good.
            if (statusCode === 404 || statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint);
            }
            failed++;
        }
    }

    return { sent, failed, results };
}

function safeHost(endpoint: string) {
    try {
        return new URL(endpoint).host;
    } catch {
        return 'unknown';
    }
}
