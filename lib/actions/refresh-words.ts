'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrCreateWord } from './word-ingestion'

/**
 * Performs a full refresh of the dictionary cache for all words.
 * Useful for populating missing definitions/examples for existing words.
 */
export async function refreshAllWords() {
    const supabase = createClient()
    const { data: words, error } = await supabase
        .from('words')
        .select('word')

    if (error) throw error;
    if (!words) return { success: true, count: 0 };

    console.log(`[RefreshWords] Starting refresh for ${words.length} words...`);

    let successCount = 0;
    let failCount = 0;

    for (const record of words) {
        try {
            await getOrCreateWord(record.word);
            successCount++;
            if (successCount % 10 === 0) {
                console.log(`[RefreshWords] Progress: ${successCount}/${words.length}`);
            }
        } catch (err) {
            console.error(`[RefreshWords] Failed to refresh "${record.word}":`, err);
            failCount++;
        }
    }

    console.log(`[RefreshWords] Completed. Success: ${successCount}, Failed: ${failCount}`);
    return { success: true, successCount, failCount };
}
