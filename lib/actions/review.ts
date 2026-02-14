'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateSM2 } from '@/lib/services/sm2'
import { revalidatePath } from 'next/cache'

export async function submitReview(userWordId: string, score: number, direction: 'EN_TO_CN' | 'CN_TO_EN') {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch current word state
    const { data: userWord, error: fetchError } = await supabase
        .from('user_words')
        .select('*')
        .eq('id', userWordId)
        .single()

    if (fetchError || !userWord) throw new Error('Word not found')

    // 2. Calculate new SM-2 values
    const { nextReviewAt, easeFactor, intervalDays } = calculateSM2(
        score,
        userWord.ease_factor,
        userWord.interval_days
    )

    // 3. Update memory score
    // User says memory_score is in priority formula. 

    // 4. Update user_words
    const { error: updateError } = await supabase
        .from('user_words')
        .update({
            next_review_at: nextReviewAt.toISOString(),
            last_reviewed_at: new Date().toISOString(),
            ease_factor: easeFactor,
            interval_days: intervalDays,
            memory_score: score // Storing the last score as requested for priority formula
        })
        .eq('id', userWordId)

    if (updateError) throw updateError

    // 5. Log to history
    await supabase.from('review_history').insert({
        user_word_id: userWordId,
        score: score,
        direction: direction
    })

    revalidatePath('/review')
    revalidatePath('/')
    return { success: true }
}
