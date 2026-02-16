'use server'

import { createClient } from '@/lib/supabase/server'
import { getLemma } from '@/lib/services/lemma'
import { fetchDictionaryData } from '@/lib/services/dictionary'
import { translateToChinese } from '@/lib/services/translation'
import { revalidatePath } from 'next/cache'

/**
 * Shared dictionary cache service.
 * Fetches word data from Wordnik and translates it if not already in DB.
 */
export async function getOrCreateWord(word: string) {
    const supabase = createClient()
    const normalized = word.trim().toLowerCase()

    // 1. Check if word already exists in cache with definitions and examples
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
        .single()

    // If word exists AND has definitions, return it
    if (existingWord && existingWord.definitions && existingWord.definitions.length > 0) {
        console.log(`[DictionaryCache] Hit for: ${normalized}`);
        return existingWord;
    }

    console.log(`[DictionaryCache] Processing ${existingWord ? 'incomplete cache' : 'miss'} for: ${normalized}...`);

    // 2. Fetch from Wordnik
    const dictData = await fetchDictionaryData(normalized);
    if (!dictData) {
        throw new Error(`Could not find dictionary data for "${normalized}"`);
    }

    let wordRecord = existingWord;

    // 3. Insert into words table if doesn't exist
    if (!wordRecord) {
        const { data: newWord, error: wordError } = await supabase
            .from('words')
            .insert({
                word: normalized,
                phonetic_ipa: dictData.phonetic,
                pronunciation_audio_url: dictData.audioUrl
            })
            .select()
            .single()

        if (wordError) {
            // Handle race condition: if another request inserted it just now
            if (wordError.code === '23505') {
                const { data: refetchedWord } = await supabase
                    .from('words')
                    .select(`*, definitions (*, examples (*)), general_examples:examples!examples_word_id_fkey (*)`)
                    .eq('word', normalized)
                    .single()

                // If refetched has definitions, return it
                if (refetchedWord && refetchedWord.definitions && refetchedWord.definitions.length > 0) {
                    return refetchedWord;
                }
                wordRecord = refetchedWord;
            } else {
                throw wordError;
            }
        } else {
            wordRecord = newWord;
        }
    }

    // 4. Populate missing definitions and examples if needed
    const definitionsWithExamples = [];

    if (!wordRecord.definitions || wordRecord.definitions.length === 0) {
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

            if (defError) throw defError;

            const examplesForThisDef = [];
            // Handle per-definition examples if Wordnik provided them
            if (def.examples && def.examples.length > 0) {
                for (const exText of def.examples) {
                    const translatedEx = await translateToChinese(exText) || 'Translation pending...';
                    const { data: exRecord, error: exError } = await supabase
                        .from('examples')
                        .insert({
                            definition_id: defRecord.id,
                            example_en: exText,
                            example_zh: translatedEx
                        })
                        .select()
                        .single()
                    if (!exError) examplesForThisDef.push(exRecord);
                }
            }

            definitionsWithExamples.push({
                ...defRecord,
                examples: examplesForThisDef
            });
        }
    } else {
        definitionsWithExamples.push(...wordRecord.definitions);
    }

    // 5. Handle General Examples (not linked to a specific definition)
    const generalExamples = [];
    if (!wordRecord.general_examples || wordRecord.general_examples.length === 0) {
        if (dictData.examples && dictData.examples.length > 0) {
            for (const ex of dictData.examples) {
                const translatedEx = await translateToChinese(ex.text) || 'Translation pending...';
                const { data: exRecord, error: exError } = await supabase
                    .from('examples')
                    .insert({
                        word_id: wordRecord.id,
                        example_en: ex.text,
                        example_zh: translatedEx
                    })
                    .select()
                    .single()
                if (!exError) generalExamples.push(exRecord);
            }
        }
    } else {
        generalExamples.push(...wordRecord.general_examples);
    }

    return {
        ...wordRecord,
        definitions: definitionsWithExamples,
        general_examples: generalExamples
    };
}

export async function ingestWord(rawWord: string, shouldLemmatize: boolean = true) {
    console.log(`[Ingestion] Starting for: ${rawWord} (lemmatize: ${shouldLemmatize})`);
    const supabase = createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const wordToProcess = shouldLemmatize ? getLemma(rawWord) : rawWord.trim().toLowerCase();

        // Use the shared dictionary cache service
        const wordRecord = await getOrCreateWord(wordToProcess);

        // Record user word history
        await supabase.from('user_word_history').insert({
            user_id: user.id,
            word_id: wordRecord.id,
            action_type: 'lookup'
        });

        // Also link to user_words for the review system
        const { data: existingUserWord } = await supabase
            .from('user_words')
            .select('*')
            .eq('user_id', user.id)
            .eq('word_id', wordRecord.id)
            .single()

        if (existingUserWord) {
            await supabase
                .from('user_words')
                .update({ times_seen: existingUserWord.times_seen + 1 })
                .eq('id', existingUserWord.id)
        } else {
            await supabase.from('user_words').insert({
                user_id: user.id,
                word_id: wordRecord.id,
                times_seen: 1,
                next_review_at: new Date().toISOString()
            })
        }

        revalidatePath('/')
        return {
            success: true,
            id: wordRecord.id,
            word: wordRecord.word,
            phonetic: wordRecord.phonetic_ipa,
            audioUrl: wordRecord.pronunciation_audio_url,
            definitions: wordRecord.definitions.map((d: any) => ({
                partOfSpeech: d.part_of_speech,
                definition_en: d.definition_text_en,
                definition_zh: d.definition_text_zh,
                examples: d.examples ? d.examples.map((e: any) => ({
                    en: e.example_en,
                    zh: e.example_zh
                })) : []
            })),
            general_examples: wordRecord.general_examples ? wordRecord.general_examples.map((e: any) => ({
                en: e.example_en,
                zh: e.example_zh
            })) : []
        }
    } catch (error: any) {
        console.error(`[Ingestion] Failed for ${rawWord}:`, error);
        return {
            success: false,
            error: error.message || 'Failed to process word. Please check if the word exists or try again later.'
        };
    }
}
