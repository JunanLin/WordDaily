'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markTutorialComplete() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { error } = await supabase
        .from('users')
        .update({ tutorial_completed: true })
        .eq('id', user.id);

    if (error) {
        throw error;
    }

    revalidatePath('/');
    return { success: true };
}
