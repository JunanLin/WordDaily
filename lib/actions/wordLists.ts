'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateSession } from '@/lib/security'

export async function getWordLists() {
    const { user, supabase } = await validateSession(false)
    if (!user) return []

    const { data: lists, error } = await supabase
        .from('word_lists')
        .select(`
            *,
            word_list_items(count),
            user_list_progress(*)
        `)
        .order('code', { ascending: true })

    if (error) {
        console.error('Error fetching word lists:', error)
        return []
    }

    const listData = await Promise.all(lists.map(async list => {
        const totalWords = list.word_list_items[0]?.count || 0
        const progress = list.user_list_progress[0] || null

        // Check if list is locked (has words from this list in review queue)
        let isLocked = false
        if (progress) {
            const { count: pendingCount } = await supabase
                .from('user_words')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .lt('memory_score', 10)
                .lte('next_review_at', new Date().toISOString())
                .in('word_id', (
                    await supabase
                        .from('word_list_items')
                        .select('word_id')
                        .eq('list_id', list.id)
                ).data?.map(i => i.word_id) || [])

            isLocked = (pendingCount || 0) > 0
        }

        return {
            ...list,
            total_words: totalWords,
            progress: progress,
            isLocked
        }
    }))

    const ORDER = ['zk', 'gk', 'cet4', 'cet6', 'ky', 'ielts', 'toefl', 'gre']

    return listData.sort((a, b) => {
        const indexA = ORDER.indexOf(a.code.toLowerCase())
        const indexB = ORDER.indexOf(b.code.toLowerCase())

        if (indexA === -1 && indexB === -1) return a.code.localeCompare(b.code)
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
    })
}

export async function getNextWordFromList(listId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // 1. Get or create progress
    let { data: progress, error: progressError } = await supabase
        .from('user_list_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('list_id', listId)
        .single()

    if (progressError && progressError.code !== 'PGRST116') {
        throw new Error('Failed to fetch progress')
    }

    if (!progress) {
        const { data: newProgress, error: createError } = await supabase
            .from('user_list_progress')
            .insert({
                user_id: user.id,
                list_id: listId,
                current_position: 0
            })
            .select()
            .single()

        if (createError) throw new Error('Failed to create progress')
        progress = newProgress
    }

    // 2. Fetch word at current position
    const { data: item, error: itemError } = await supabase
        .from('word_list_items')
        .select('word_id')
        .eq('list_id', listId)
        .order('word_id', { ascending: true })
        .range(progress.current_position, progress.current_position)
        .single()

    if (itemError) {
        // If we can't find the word at this position, maybe we reached the end
        if (itemError.code === 'PGRST116') {
            const result = await handleRoundCompletion(user.id, listId, progress)
            return { ...result, word_id: null }
        }
        throw new Error('Failed to fetch word')
    }

    // 3. Add to user_words if not present
    const { data: userWord, error: userWordError } = await supabase
        .from('user_words')
        .select('id')
        .eq('user_id', user.id)
        .eq('word_id', item.word_id)
        .single()

    if (userWordError && userWordError.code === 'PGRST116') {
        await supabase.from('user_words').insert({
            user_id: user.id,
            word_id: item.word_id,
            next_review_at: new Date().toISOString()
        })
    }

    // 4. Increment position
    await supabase
        .from('user_list_progress')
        .update({
            current_position: progress.current_position + 1
        })
        .eq('id', progress.id)

    // Check if this was the last word
    const { count } = await supabase
        .from('word_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId)

    if (progress.current_position + 1 >= (count || 0)) {
        const result = await handleRoundCompletion(user.id, listId, progress)
        return { ...result, word_id: item.word_id }
    }

    return { word_id: item.word_id, finished: false }
}

export async function enrollRandomWords(listId: string, count: number) {
    const { user, supabase } = await validateSession()

    // 1. Get or create progress
    let { data: progress } = await supabase
        .from('user_list_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('list_id', listId)
        .maybeSingle()

    if (!progress) {
        const { data: newProgress, error } = await supabase
            .from('user_list_progress')
            .insert({ user_id: user.id, list_id: listId, current_position: 0 })
            .select().single()
        if (error) throw error
        progress = newProgress
    }

    // 2. CHECK LOCK: Are there pending reviews for this list?
    const { data: wordIdsInList } = await supabase
        .from('word_list_items')
        .select('word_id')
        .eq('list_id', listId)

    const listWordIds = wordIdsInList?.map(i => i.word_id) || []

    const { count: pendingCount } = await supabase
        .from('user_words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lt('memory_score', 10)
        .lte('next_review_at', new Date().toISOString())
        .in('word_id', listWordIds)

    if ((pendingCount || 0) > 0) {
        return { success: false, error: 'LIST_LOCKED' }
    }

    // 3. Find available words
    const { data: enrolledIds } = await supabase
        .from('user_word_list_enrolled')
        .select('word_id')
        .eq('user_id', user.id)
        .eq('list_id', listId)
        .eq('round', progress.completed_rounds)

    const excludedIds = enrolledIds?.map(e => e.word_id) || []

    const { data: availableItems } = await supabase
        .from('word_list_items')
        .select('word_id')
        .eq('list_id', listId)
        .not('word_id', 'in', `(${excludedIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)

    if (!availableItems || availableItems.length === 0) {
        const result = await handleRoundCompletion(user.id, listId, progress)
        return { ...result, success: true, enrolledCount: 0, allRemaining: true }
    }

    // 4. Select random words
    const allRemaining = count >= availableItems.length
    const shuffled = [...availableItems].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, Math.min(count, shuffled.length))
    const selectedIds = selected.map(s => s.word_id)

    // 5. Enroll them
    const enrollmentItems = selectedIds.map(wordId => ({
        user_id: user.id,
        list_id: listId,
        word_id: wordId,
        round: progress.completed_rounds
    }))

    const { error: enrolError } = await supabase
        .from('user_word_list_enrolled')
        .insert(enrollmentItems)

    if (enrolError) throw enrolError

    const userWordsToInsert = selectedIds.map(wordId => ({
        user_id: user.id,
        word_id: wordId,
        next_review_at: new Date().toISOString()
    }))

    await supabase.from('user_words').upsert(userWordsToInsert, { onConflict: 'user_id,word_id' })

    const newPosition = progress.current_position + selectedIds.length
    await supabase
        .from('user_list_progress')
        .update({ current_position: newPosition })
        .eq('id', progress.id)

    // 6. Check if we finished the list
    const { count: totalWords } = await supabase
        .from('word_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId)

    let completionResult = null
    if (newPosition >= (totalWords || 0)) {
        completionResult = await handleRoundCompletion(user.id, listId, { ...progress, current_position: newPosition })
    }

    // Force revalidation of all relevant paths
    revalidatePath('/')
    revalidatePath('/lists')
    revalidatePath('/review')
    revalidatePath(`/lists/${listId}`)

    return {
        success: true,
        enrolledCount: selectedIds.length,
        allRemaining: allRemaining || (completionResult?.finished || false),
        ...completionResult
    }
}

async function handleRoundCompletion(userId: string, listId: string, progress: any) {
    const supabase = createClient()

    let newStars = progress.stars + 1
    let newSuns = progress.suns
    let newRounds = progress.completed_rounds + 1

    if (newStars >= 5) {
        newStars = 0
        newSuns = Math.min(5, newSuns + 1)
    }

    const { data: updatedProgress, error } = await supabase
        .from('user_list_progress')
        .update({
            current_position: 0,
            completed_rounds: newRounds,
            stars: newStars,
            suns: newSuns,
            last_completed_at: new Date().toISOString()
        })
        .eq('id', progress.id)
        .select()
        .single()

    if (error) throw new Error('Failed to update completion progress')

    return { finished: true, success: true, progress: updatedProgress }
}
