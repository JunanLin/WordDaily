'use server'

import { createClient } from '@/lib/supabase/server'
import { updateSpacedRepetition } from '@/lib/services/sm2'
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
    const {
        repetition_count,
        interval_days,
        ease_factor,
        nextReviewAt,
        lastReviewedAt
    } = updateSpacedRepetition(
        {
            repetition_count: userWord.repetition_count,
            interval_days: userWord.interval_days,
            ease_factor: userWord.ease_factor,
            add_count: userWord.times_seen // Using times_seen as proxy for add_count
        },
        score
    )

    // 3. Update memory score
    // User says memory_score is in priority formula. 

    // 4. Update user_words
    const { error: updateError } = await supabase
        .from('user_words')
        .update({
            next_review_at: nextReviewAt.toISOString(),
            last_reviewed_at: lastReviewedAt.toISOString(),
            ease_factor,
            interval_days,
            repetition_count,
            times_seen: userWord.times_seen + 1, // Increment times_seen
            memory_score: score
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
