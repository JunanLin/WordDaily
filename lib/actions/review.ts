'use server'

import { createClient } from '@/lib/supabase/server'
import { updateSpacedRepetition, isReviewRating, ratingToScore, type ReviewRating } from '@/lib/services/sm2'
import { revalidatePath } from 'next/cache'
import { validateSession } from '@/lib/security'

export async function submitReview(
    userWordId: string,
    rating: ReviewRating,
    direction: 'EN_TO_CN' | 'CN_TO_EN',
    isRetry = false
) {
    // Server actions receive untrusted input: validate before touching the DB.
    if (!isReviewRating(rating)) throw new Error('Invalid rating')
    if (direction !== 'EN_TO_CN' && direction !== 'CN_TO_EN') throw new Error('Invalid direction')
    const score = ratingToScore(rating)

    const { user, supabase } = await validateSession()

    // 1. Fetch current word state
    const { data: userWord, error: fetchError } = await supabase
        .from('user_words')
        .select('*')
        .eq('id', userWordId)
        .eq('user_id', user.id)
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
        rating,
        { isRetry: isRetry === true }
    )

    // 3. Update user_words
    const { error: updateError } = await supabase
        .from('user_words')
        .update({
            next_review_at: nextReviewAt.toISOString(),
            last_reviewed_at: lastReviewedAt.toISOString(),
            ease_factor,
            interval_days,
            repetition_count,
            // In-session repeats of a forgotten word are not counted as extra sightings
            times_seen: isRetry === true ? userWord.times_seen : userWord.times_seen + 1,
            memory_score: score // mastered=10 (excluded by memory_score < 10 filters), review=5, forgot=0
        })
        .eq('id', userWordId)
        .eq('user_id', user.id)

    if (updateError) throw updateError

    // 4. Log to history
    const { error: historyError } = await supabase.from('review_history').insert({
        user_word_id: userWordId,
        score: score,
        direction: direction
    })
    if (historyError) console.error('Failed to log review history:', historyError)

    revalidatePath('/review')
    revalidatePath('/')
    return { success: true }
}

export async function getDueCount() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
        .from('user_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lt('memory_score', 10)
        .lte('next_review_at', new Date().toISOString())

    if (error) {
        console.error('Error fetching due count:', error)
        return 0
    }

    return count || 0
}
