import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/send-notification';
import { NextResponse } from 'next/server';

export async function POST() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await sendPushToUser(user.id, {
            title: 'Test Notification 🔔',
            body: 'Push notifications are working!',
            url: '/settings',
        });

        if (result.sent === 0) {
            return NextResponse.json(
                {
                    error: 'No active devices reached. Please toggle notifications OFF and then ON again in Settings to refresh your connection.',
                    ...result
                },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Test notification error:', error);
        return NextResponse.json(
            { error: 'Server error while sending notification' },
            { status: 500 }
        );
    }
}
