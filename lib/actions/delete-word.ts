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

/**
 * Removes words from "Recent Searches". Each lookup is its own history row, so all
 * lookup rows for the given words are deleted (otherwise older duplicates reappear).
 */
export async function deleteRecentSearches(wordIds: string[]) {
    if (!Array.isArray(wordIds) || wordIds.length === 0 || wordIds.length > 100 ||
        !wordIds.every(id => typeof id === 'string' && id.length > 0)) {
        throw new Error('Invalid word ids')
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('user_word_history')
        .delete()
        .eq('user_id', user.id)
        .eq('action_type', 'lookup')
        .in('word_id', wordIds)

    if (error) throw error

    revalidatePath('/history')
    return { success: true }
}
