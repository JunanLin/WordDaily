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

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Test notification error:', error);
        return NextResponse.json(
            { error: 'Failed to send test notification' },
            { status: 500 }
        );
    }
}
