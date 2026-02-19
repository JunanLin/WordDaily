'use server'

import { createClient } from '@/lib/supabase/server'
import { getLemma } from '@/lib/services/lemma'
import { fetchDictionaryData } from '@/lib/services/dictionary'
import { fetchEnrichmentFromDeepSeek } from '@/lib/services/deepseek'
import { translateToChinese } from '@/lib/services/translation'
import { revalidatePath } from 'next/cache'
import { subDays, isAfter } from 'date-fns'
import { validateSession } from '@/lib/security'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Shared dictionary service using the unified 'dictionary' table.
 */
export async function getOrCreateWord(word: string) {
    const supabase = createClient()
    const adminSupabase = createAdminClient()
    const normalized = word.trim().toLowerCase()

    // 1. Check if word exists in the dictionary
    const { data: entry, error: fetchError } = await supabase
        .from('dictionary')
        .select('*')
        .eq('word', normalized)
        .maybeSingle()

    if (fetchError) {
        console.error(`[Dictionary] Error fetching ${normalized}:`, fetchError);
        throw fetchError;
    }

    // If word doesn't exist at all, check Wordnik as a total fallback
    if (!entry) {
        const dictData = await fetchDictionaryData(normalized);
        if (!dictData) return null;

        // Create a new entry from Wordnik data
        // For new words, we use DeepSeek for professional examples and translations
        const enrichment = await fetchEnrichmentFromDeepSeek(normalized);
        const translation = enrichment?.translation || await translateToChinese(dictData.definitions[0]?.definition || '');

        const { data: newEntry, error: insertError } = await adminSupabase
            .from('dictionary')
            .insert({
                word: normalized,
                phonetic: dictData.phonetic,
                audio: dictData.audioUrl,
                definition: dictData.definitions[0]?.definition,
                translation: translation,
                pos: dictData.definitions[0]?.partOfSpeech,
                detail: { examples: enrichment?.examples || [] },
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            if (insertError.code === '23505') {
                const { data: refetched } = await supabase.from('dictionary').select('*').eq('word', normalized).single();
                return refetched;
            }
            console.error(`[Dictionary] Insert error for ${normalized}:`, insertError);
            return null;
        }
        return newEntry;
    }

    // 2. Check if the entry needs enrichment (missing examples or translation)
    const detailObj = entry.detail as any || {};
    const hasExamples = detailObj.examples && Array.isArray(detailObj.examples) && detailObj.examples.length >= 4;
    const hasTranslation = entry.translation && entry.translation.trim().length > 0;

    if (!hasExamples || !hasTranslation) {
        console.log(`[Dictionary] Enriching ${normalized} (Missing: ${!hasExamples ? 'examples' : ''} ${!hasTranslation ? 'translation' : ''})...`);

        const enrichment = await fetchEnrichmentFromDeepSeek(normalized);
        if (enrichment) {
            const updates: any = {
                updated_at: new Date().toISOString(),
                detail: {
                    ...detailObj,
                    examples: enrichment.examples
                }
            };

            if (!hasTranslation && enrichment.translation) {
                updates.translation = enrichment.translation;
            }

            const { data: updatedEntry, error: updateError } = await adminSupabase
                .from('dictionary')
                .update(updates)
                .eq('id', entry.id)
                .select()
                .single()

            if (updateError) {
                console.error(`[Dictionary] enrichment update error for ${normalized}:`, updateError);
            } else {
                return updatedEntry;
            }
        }
    }

    return entry;
}

export async function lookupWord(rawWord: string, shouldLemmatize: boolean = true) {
    try {
        const { user, supabase } = await validateSession(false)

        const wordToProcess = shouldLemmatize ? getLemma(rawWord) : rawWord.trim().toLowerCase();
        const entry = await getOrCreateWord(wordToProcess);

        if (!entry) {
            return { success: false, error: 'word_not_found' };
        }

        // Record lookup history
        await supabase.from('user_word_history').insert({
            user_id: user.id,
            word_id: entry.id,
            action_type: 'lookup'
        });

        const detailObj = entry.detail as any || {};
        const examples = detailObj.examples || [];

        return {
            success: true,
            id: entry.id,
            word: entry.word,
            phonetic: entry.phonetic,
            audioUrl: entry.audio,
            exchange: entry.exchange,
            tags: entry.tag,
            posDist: entry.pos,
            bnc: entry.bnc,
            frq: entry.frq,
            translation: entry.translation,
            definition: entry.definition,
            collins: entry.collins,
            oxford: entry.oxford,
            meanings: entry.translation ? entry.translation.split(/\r?\n|\\n/).map((line: string) => {
                const match = line.match(/^([a-z]+\.)\s*(.*)/);
                if (match) return { part_of_speech: match[1].replace('.', ''), chinese_meaning: match[2].trim() };
                return { part_of_speech: entry.pos || 'n/a', chinese_meaning: line.trim() };
            }).filter((m: any) => m.chinese_meaning) : [],
            examples: examples
        }
    } catch (error: any) {
        console.error('[lookupWord] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function addWordToUserList(wordId: string) {
    try {
        const { user, supabase } = await validateSession(false)

        const { data: existingUserWord } = await supabase
            .from('user_words')
            .select('*')
            .eq('user_id', user.id)
            .eq('word_id', wordId)
            .maybeSingle()

        if (existingUserWord) {
            await supabase
                .from('user_words')
                .update({ times_seen: existingUserWord.times_seen + 1 })
                .eq('id', existingUserWord.id)
        } else {
            await supabase.from('user_words').insert({
                user_id: user.id,
                word_id: wordId,
                times_seen: 1,
                next_review_at: new Date().toISOString()
            })
        }

        await supabase.from('user_word_history').insert({
            user_id: user.id,
            word_id: wordId,
            action_type: 'saved'
        });

        revalidatePath('/')
        revalidatePath('/history')
        return { success: true };
    } catch (error: any) {
        console.error('[addWordToUserList] Error:', error);
        return { success: false, error: error.message };
    }
}

// Deprecated: keeping for compatibility until other pages are updated
export async function ingestWord(rawWord: string, shouldLemmatize: boolean = true) {
    const res = await lookupWord(rawWord, shouldLemmatize);
    if (res.success && res.id) {
        const addRes = await addWordToUserList(res.id);
        if (!addRes.success) return addRes;
    }
    return res;
}
