'use server'

import { createClient } from '@/lib/supabase/server'
import { getLemma } from '@/lib/services/lemma'
import { fetchDictionaryData } from '@/lib/services/dictionary'
import { translateToChinese } from '@/lib/services/translation'
import { revalidatePath } from 'next/cache'

export async function ingestWord(rawWord: string) {
    console.log(`[Ingestion] Starting for: ${rawWord}`);
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[Ingestion] Unauthorized access attempt');
        throw new Error('Unauthorized');
    }

    // 0. Check 9pm cutoff
    const now = new Date()
    if (now.getHours() >= 21) {
        throw new Error('Daily word list is locked after 9pm. Review your words now!');
    }

    const lemma = getLemma(rawWord)
    console.log(`[Ingestion] Lemma identified: ${lemma}`);

    // Pre-check: Verify table existence to give better error message
    const { error: tableError } = await supabase.from('words').select('id').limit(1);
    if (tableError && tableError.message.includes('relation "public.words" does not exist')) {
        console.error('[Ingestion] Database tables not found. User needs to run migration.');
        throw new Error('Database tables not found. Please run the SQL migration script provided in the "supabase/migrations" folder in your Supabase SQL Editor.');
    }

    // 1. Check if word already exists in public.words
    let { data: wordRecord } = await supabase
        .from('words')
        .select('id')
        .eq('lemma', lemma)
        .single()

    if (!wordRecord) {
        // 2. Fetch dictionary data
        const dictData = await fetchDictionaryData(lemma)
        if (!dictData) {
            // If dictionary fails, we might still want to store the word?
            // For now, let's assume we need dictionary data for core features.
            throw new Error(`Could not find dictionary data for "${lemma}"`)
        }

        // 3. Insert into public.words
        const { data: newWord, error: insertError } = await supabase
            .from('words')
            .insert({
                lemma: dictData.lemma,
                phonetic: dictData.phonetic,
                audio_url: dictData.audioUrl
            })
            .select()
            .single()

        if (insertError) throw insertError
        wordRecord = newWord

        // 4. Translate meanings and insert into public.word_meanings
        for (const meaning of dictData.meanings) {
            for (const def of meaning.definitions) {
                let chineseTranslation = null;
                try {
                    chineseTranslation = await translateToChinese(def.definition);
                } catch (e) {
                    console.error(`[Ingestion] Translation failed for: ${def.definition}`, e);
                }

                if (wordRecord) {
                    await supabase.from('word_meanings').insert({
                        word_id: wordRecord.id,
                        part_of_speech: meaning.partOfSpeech,
                        english_definition: def.definition,
                        chinese_translation: chineseTranslation || 'Translation pending...',
                        example_sentence: def.example
                    })
                }
            }
        }
    }

    if (!wordRecord) throw new Error('Failed to create or find word record');

    // 5. Ensure word variant exists
    await supabase.from('word_variants').upsert({
        word_id: wordRecord.id,
        variant_text: rawWord.trim().toLowerCase()
    })

    // 6. Link to user_words
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
    return { success: true, lemma: lemma }
}
