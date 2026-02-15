import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
    // Basic authorization to prevent abuse (optional but recommended)
    const authHeader = _request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.error('VAPID keys are missing');
        return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 });
    }

    webpush.setVapidDetails(
        'mailto:admin@worddaily.app',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient();

    // 1. Get users with notifications enabled and valid subscriptions
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
            id,
            push_subscriptions (
                endpoint,
                p256dh,
                auth
            )
        `)
        .eq('notifications_enabled', true);

    if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
        return NextResponse.json({ message: 'No users to notify' });
    }

    const results = [];

    for (const user of users) {
        // 2. Check for words due today
        const { count, error: countError } = await supabase
            .from('user_words')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .lte('next_review_at', new Date().toISOString());

        if (countError) {
            console.error(`Error counting words for user ${user.id}:`, countError);
            continue;
        }

        if (count && count > 0) {
            const payload = JSON.stringify({
                title: 'You have words to review 📚',
                body: `You have ${count} words ready for review today.`,
                url: '/review'
            });

            // Send to all subscriptions for this user
            const subscriptions = user.push_subscriptions;
            if (subscriptions && Array.isArray(subscriptions)) {
                for (const sub of subscriptions) {
                    try {
                        await webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        }, payload);
                        results.push({ userId: user.id, status: 'sent' });
                    } catch (error) {
                        console.error(`Error sending push to user ${user.id}:`, error);
                        // Optional: remove invalid subscription
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        if ((error as any).statusCode === 410) {
                            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                        }
                        results.push({ userId: user.id, status: 'failed', error });
                    }
                }
            }
        }
    }

    return NextResponse.json({
        success: true,
        processed: users.length,
        notificationsSent: results.filter(r => r.status === 'sent').length
    });
}
