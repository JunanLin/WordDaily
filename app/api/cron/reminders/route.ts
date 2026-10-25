import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/send-notification';
import { NextResponse } from 'next/server';

/** UTC instant of local midnight "today" in the given timezone. */
function startOfLocalDay(now: Date, timeZone: string) {
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
    const midnightUTC = new Date(`${dateStr}T00:00:00Z`);
    const utc = new Date(midnightUTC.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(midnightUTC.toLocaleString('en-US', { timeZone }));
    return new Date(midnightUTC.getTime() + (utc.getTime() - local.getTime()));
}

export async function GET(_request: Request) {
    // Basic authorization (fail closed: an unset secret must not accept "Bearer undefined")
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return new Response('CRON_SECRET is not configured', { status: 500 });
    }
    const authHeader = _request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Cron requests carry no user session, so the cookie/anon client would see nothing
    // through RLS. Use the service-role client and scope every query by user id.
    const supabase = createAdminClient();

    // 1. Get users with notifications enabled and their settings
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, timezone, day_reminder_time, review_reminder_time')
        .eq('notifications_enabled', true);

    if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
        return NextResponse.json({ message: 'No users to notify' });
    }

    const results = [];
    const now = new Date();

    for (const user of users) {
        try {
            const timeZone = user.timezone || 'UTC';
            // Get user's local time string "HH:MM"
            const userLocalTime = now.toLocaleTimeString('en-US', {
                timeZone,
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            const [userHour] = userLocalTime.split(':').map(Number);

            // We check for matching HOUR, so this route should run once per hour.
            const dayRem = user.day_reminder_time?.split(':').map(Number);
            const revRem = user.review_reminder_time?.split(':').map(Number);
            let sent = 0;
            let failed = 0;

            // Check Day Reminder (New Words)
            if (dayRem && userHour === dayRem[0]) {
                // Check if user has added words today (in the user's timezone)
                const { count } = await supabase
                    .from('user_words')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .gte('created_at', startOfLocalDay(now, timeZone).toISOString());

                if (!count || count === 0) {
                    const r = await sendPushToUser(supabase, user.id, {
                        title: 'Time for new words! 🌱',
                        body: "You haven't added any new words yet today. Keep the streak alive!",
                        url: '/',
                    });
                    sent += r.sent;
                    failed += r.failed;
                }
            }

            // Check Review Reminder
            if (revRem && userHour === revRem[0]) {
                const { count } = await supabase
                    .from('user_words')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .lt('memory_score', 10)
                    .lte('next_review_at', now.toISOString());

                if (count && count > 0) {
                    const r = await sendPushToUser(supabase, user.id, {
                        title: 'Spaced Repetition Review 📚',
                        body: `You have ${count} words due for review.`,
                        url: '/review',
                    });
                    sent += r.sent;
                    failed += r.failed;
                }
            }

            results.push({ userId: user.id, success: true, sent, failed });
        } catch (error) {
            console.error(`Error processing user ${user.id}:`, error);
            results.push({ userId: user.id, success: false });
        }
    }

    return NextResponse.json({
        success: true,
        processed: users.length,
        results
    });
}
