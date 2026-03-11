'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validateSession } from '@/lib/security';

export async function updateUserSettings(data: {
    notifications_enabled?: boolean;
    day_reminder_time?: string;
    review_reminder_time?: string;
    timezone?: string;
    use_capital_case?: boolean;
}) {
    const { user, supabase } = await validateSession();

    // Filter out appearance settings that are stored in cookies, not DB
    const { theme, fontSize, ...dbData } = data as any;

    const { error } = await supabase
        .from('users')
        .update(dbData)
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
    const { user, supabase } = await validateSession();

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

export async function deletePushSubscription(endpoint: string) {
    const { user, supabase } = await validateSession();

    const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

    if (error) throw error;
    return { success: true };
}

export async function getUserSettings() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) return null;
    return data;
}
