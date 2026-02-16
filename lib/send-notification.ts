import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

/**
 * Shared notification logic used by both the cron job and the test-notification endpoint.
 *
 * Sends a push notification to every registered subscription for the given user.
 * Automatically removes stale (410) subscriptions.
 */
export async function sendPushToUser(
    userId: string,
    payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }> {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        throw new Error('VAPID keys are missing');
    }

    webpush.setVapidDetails(
        'mailto:xavier000011@gmail.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient();

    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    const payloadStr = JSON.stringify(payload);

    for (const sub of subscriptions) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payloadStr
            );
            sent++;
        } catch (err) {
            console.error(`Push failed for ${sub.endpoint}:`, err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((err as any).statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
            failed++;
        }
    }

    return { sent, failed };
}
