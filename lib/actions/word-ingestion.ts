'use server'

import { createClient } from '@/lib/supabase/server'
import { getLemma } from '@/lib/services/lemma'
import { fetchDictionaryData } from '@/lib/services/dictionary'
import { translateToChinese } from '@/lib/services/translation'
import { revalidatePath } from 'next/cache'
import { subDays, isAfter } from 'date-fns'

/**
 * Shared dictionary cache service.
 * Fetches word data from Wordnik and translates it if not already in DB or if stale (1 month).
 */
export async function getOrCreateWord(word: string) {
    const supabase = createClient()
    const normalized = word.trim().toLowerCase()
    const thirtyDaysAgo = subDays(new Date(), 30)

    // 1. Check if word already exists in cache
    const { data: existingWord } = await supabase
        .from('words')
        .select(`
            *,
            definitions (
                *,
                examples (*)
            ),
            general_examples:examples!examples_word_id_fkey (*)
        `)
        .eq('word', normalized)
        .maybeSingle()

    // If word exists, has definitions, and is not stale, return it
    if (existingWord &&
        existingWord.definitions &&
        existingWord.definitions.length > 0 &&
        isAfter(new Date(existingWord.updated_at), thirtyDaysAgo)) {
        console.log(`[DictionaryCache] Fresh hit for: ${normalized}`);
        return existingWord;
    }

    console.log(`[DictionaryCache] Processing ${existingWord ? (isAfter(new Date(existingWord.updated_at), thirtyDaysAgo) ? 'incomplete' : 'stale') : 'miss'} for: ${normalized}...`);

    // 2. Fetch from Wordnik
    const dictData = await fetchDictionaryData(normalized);
    if (!dictData) {
        if (existingWord) return existingWord; // Return stale if API fails but we have something
        throw new Error(`Could not find dictionary data for "${normalized}"`);
    }

    let wordRecord = existingWord;

    // 3. Insert or Update words table
    if (!wordRecord) {
        const { data: newWord, error: wordError } = await supabase
            .from('words')
            .insert({
                word: normalized,
                phonetic_ipa: dictData.phonetic,
                pronunciation_audio_url: dictData.audioUrl,
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (wordError) {
            if (wordError.code === '23505') {
                const { data: refetched } = await supabase.from('words').select('*').eq('word', normalized).single();
                wordRecord = refetched;
            } else throw wordError;
        } else {
            wordRecord = newWord;
        }
    } else {
        // Update existing word metadata and timestamp
        const { data: updatedWord, error: updateError } = await supabase
            .from('words')
            .update({
                phonetic_ipa: dictData.phonetic,
                pronunciation_audio_url: dictData.audioUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', wordRecord.id)
            .select()
            .single()

        if (!updateError) wordRecord = updatedWord;
    }

    // 4. Populate/Refresh definitions and examples
    // If stale or missing, clear and re-populate
    if (!wordRecord.definitions || wordRecord.definitions.length === 0 || !isAfter(new Date(existingWord?.updated_at || 0), thirtyDaysAgo)) {
        // Delete old definitions (cascades to examples)
        if (wordRecord.id) {
            await supabase.from('definitions').delete().eq('word_id', wordRecord.id);
            await supabase.from('examples').delete().eq('word_id', wordRecord.id);
        }

        const definitionsWithExamples = [];
        for (const def of dictData.definitions) {
            const translatedDef = await translateToChinese(def.definition) || 'Translation pending...';
            const { data: defRecord, error: defError } = await supabase
                .from('definitions')
                .insert({
                    word_id: wordRecord.id,
                    part_of_speech: def.partOfSpeech,
                    definition_text_en: def.definition,
                    definition_text_zh: translatedDef
                })
                .select()
                .single()

            if (defError) continue;

            const examplesForThisDef = [];
            if (def.examples && def.examples.length > 0) {
                for (const exText of def.examples) {
                    const translatedEx = await translateToChinese(exText) || 'Translation pending...';
                    const { data: exRecord } = await supabase
                        .from('examples')
                        .insert({
                            definition_id: defRecord.id,
                            example_en: exText,
                            example_zh: translatedEx
                        })
                        .select()
                        .single()
                    if (exRecord) examplesForThisDef.push(exRecord);
                }
            }
            definitionsWithExamples.push({ ...defRecord, examples: examplesForThisDef });
        }

        // Handle General Examples
        const generalExamples = [];
        if (dictData.examples && dictData.examples.length > 0) {
            for (const ex of dictData.examples) {
                const translatedEx = await translateToChinese(ex.text) || 'Translation pending...';
                const { data: exRecord } = await supabase
                    .from('examples')
                    .insert({
                        word_id: wordRecord.id,
                        example_en: ex.text,
                        example_zh: translatedEx
                    })
                    .select()
                    .single()
                if (exRecord) generalExamples.push(exRecord);
            }
        }

        return {
            ...wordRecord,
            definitions: definitionsWithExamples,
            general_examples: generalExamples
        };
    }

    return wordRecord;
}

export async function lookupWord(rawWord: string, shouldLemmatize: boolean = true) {
    const supabase = createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' };

        const wordToProcess = shouldLemmatize ? getLemma(rawWord) : rawWord.trim().toLowerCase();
        const wordRecord = await getOrCreateWord(wordToProcess);

        // Record lookup history
        await supabase.from('user_word_history').insert({
            user_id: user.id,
            word_id: wordRecord.id,
            action_type: 'lookup'
        });

        return {
            success: true,
            id: wordRecord.id,
            word: wordRecord.word,
            phonetic: wordRecord.phonetic_ipa,
            audioUrl: wordRecord.pronunciation_audio_url,
            definitions: wordRecord.definitions?.map((d: any) => ({
                partOfSpeech: d.part_of_speech,
                definition_en: d.definition_text_en,
                definition_zh: d.definition_text_zh,
                examples: d.examples ? d.examples.map((e: any) => ({
                    en: e.example_en,
                    zh: e.example_zh
                })) : []
            })) || [],
            general_examples: wordRecord.general_examples ? wordRecord.general_examples.map((e: any) => ({
                en: e.example_en,
                zh: e.example_zh
            })) : []
        }
    } catch (error: any) {
        console.error('[lookupWord] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function addWordToUserList(wordId: string) {
    const supabase = createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' };

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
