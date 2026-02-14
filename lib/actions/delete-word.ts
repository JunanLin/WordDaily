'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteUserWord(userWordId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('user_words')
        .delete()
        .eq('id', userWordId)
        .eq('user_id', user.id)

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/history')
    revalidatePath('/today')
    return { success: true }
}
