import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/send-notification';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
    // Basic authorization to prevent abuse (optional but recommended)
    const authHeader = _request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient();

    // 1. Get users with notifications enabled
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
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
            try {
                const result = await sendPushToUser(user.id, {
                    title: 'You have words to review 📚',
                    body: `You have ${count} words ready for review today.`,
                    url: '/review',
                });
                results.push({ userId: user.id, ...result });
            } catch (error) {
                console.error(`Error sending push to user ${user.id}:`, error);
                results.push({ userId: user.id, sent: 0, failed: 1 });
            }
        }
    }

    return NextResponse.json({
        success: true,
        processed: users.length,
        notificationsSent: results.reduce((sum, r) => sum + r.sent, 0),
    });
}
