import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/send-notification';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
    // Basic authorization
    const authHeader = _request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient();

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
            // Get user's local time string "HH:MM"
            const userLocalTime = now.toLocaleTimeString('en-US', {
                timeZone: user.timezone || 'UTC',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            const [userHour, userMin] = userLocalTime.split(':').map(Number);

            // We check for matching HOUR. In a standard hourly cron, this works best.
            // If the cron runs more frequently, we might need a "last_notified_at" check to avoid duplicates.
            const dayRem = user.day_reminder_time?.split(':').map(Number);
            const revRem = user.review_reminder_time?.split(':').map(Number);

            // Check Day Reminder (New Words)
            if (dayRem && userHour === dayRem[0]) {
                // Check if user has added words today
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);

                const { count } = await supabase
                    .from('user_words')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .gte('created_at', startOfDay.toISOString());

                if (!count || count === 0) {
                    await sendPushToUser(user.id, {
                        title: 'Time for new words! 🌱',
                        body: "You haven't added any new words yet today. Keep the streak alive!",
                        url: '/add',
                    });
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
                    await sendPushToUser(user.id, {
                        title: 'Spaced Repetition Review 📚',
                        body: `You have ${count} words due for review.`,
                        url: '/review',
                    });
                }
            }

            results.push({ userId: user.id, success: true });
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
