import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/send-notification';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The client sends this device's endpoint so the test checks *this* device,
    // instead of reporting success because some other (old) device was reached.
    let endpoint: string | undefined;
    try {
        const body = await request.json();
        if (typeof body?.endpoint === 'string') endpoint = body.endpoint;
    } catch {
        // No body: test every registered device.
    }

    try {
        const result = await sendPushToUser(supabase, user.id, {
            title: 'WordDaily 🔔',
            body: 'Push notifications are working! / 推送通知已开启！',
            url: '/settings',
        }, { endpoint });

        if (result.results.length === 0) {
            return NextResponse.json(
                { code: 'device_not_registered', error: 'This device is not registered for notifications.', ...result },
                { status: 404 }
            );
        }

        if (result.sent === 0) {
            const detail = result.results
                .map(r => `${r.host} ${r.statusCode}${r.body ? ` ${r.body}` : ''}`)
                .join('; ');
            return NextResponse.json(
                { code: 'push_rejected', error: `Push service rejected the message: ${detail}`, detail, ...result },
                { status: 502 }
            );
        }

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Test notification error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { code: 'server_error', error: `Server error while sending notification: ${message}` },
            { status: 500 }
        );
    }
}
