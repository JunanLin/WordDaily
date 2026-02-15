'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserSettings(data: {
    daily_goal?: number;
    notifications_enabled?: boolean;
    day_reminder_time?: string;
    review_reminder_time?: string;
    timezone?: string;
}) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);

    if (error) throw error;

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: true };
}

export async function savePushSubscription(subscription: {
    endpoint: string,
    keys: {
        p256dh: string,
        auth: string
    }
}) {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            endpoint,
            p256dh,
            auth
        }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;
    return { success: true };
}
