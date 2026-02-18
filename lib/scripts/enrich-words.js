const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manual env parsing
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const wordnikKey = env.WORDNIK_API_KEY;
const translateApiKey = env.TRANSLATE_API_KEY;
const translateUrl = env.TRANSLATE_URL || 'https://translation.googleapis.com';

if (!supabaseUrl || !supabaseKey || !wordnikKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const WORDNIK_BASE_URL = 'https://api.wordnik.com/v4';

async function fetchWordnikData(word) {
    try {
        const [defsRes, examplesRes, audioRes, pronunciationsRes] = await Promise.all([
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/definitions?limit=5&includeRelated=false&useCanonical=false&includeTags=false&api_key=${wordnikKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/examples?includeDuplicates=false&useCanonical=false&limit=5&api_key=${wordnikKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/audio?useCanonical=false&limit=1&api_key=${wordnikKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/pronunciations?useCanonical=false&limit=1&api_key=${wordnikKey}`)
        ]);

        if (!defsRes.ok) return null;

        const definitions = await defsRes.json();
        const examplesData = await examplesRes.json();
        const examples = examplesData.examples || [];
        const audio = await audioRes.json();
        const pronunciations = await pronunciationsRes.json();

        return {
            phonetic: pronunciations[0]?.raw || undefined,
            audioUrl: audio[0]?.fileUrl || undefined,
            definitions: definitions.map(d => ({ text: d.text })),
            examples: examples.map(e => ({ text: e.text }))
        };
    } catch (e) {
        console.error(`Wordnik error for ${word}:`, e.message);
        return null;
    }
}

async function translateToChinese(text) {
    if (!text || !translateApiKey) return null;
    try {
        const url = new URL(translateUrl.includes('googleapis') ? 'https://translation.googleapis.com/language/translate/v2' : `${translateUrl}/translate`);
        url.searchParams.set('key', translateApiKey);

        const response = await fetch(url.toString(), {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                target: 'zh',
                format: 'text'
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            const data = await response.json();
            return data.data?.translations?.[0]?.translatedText || data.translatedText || null;
        }
    } catch (e) {
        console.error('Translation error:', e.message);
    }
    return null;
}

const readline = require('readline');

async function enrich() {
    console.log('--- Dictionary Enrichment (Optimized Mode) ---');

    try {
        // 1. Get unique word IDs from word_list_items
        console.log('Fetching list of words to enrich...');
        const { data: listItems, error: listError } = await supabase
            .from('word_list_items')
            .select('word_id');

        if (listError) throw listError;

        // Unique set of IDs
        const allWordIds = [...new Set(listItems.map(item => item.word_id))];
        console.log(`Found ${allWordIds.length} unique words in shared lists.`);

        let processedThisRun = 0;
        const startTime = Date.now();

        // 2. Process in batches of IDs
        // We'll fetch 50 words at a time that haven't been updated recently
        while (true) {
            // Fetch words from dictionary where ID is in our list, ordered by oldest update
            const { data: batch, error: batchError } = await supabase
                .from('dictionary')
                .select('id, word, detail, audio')
                .in('id', allWordIds)
                .order('updated_at', { ascending: true })
                .limit(50);

            if (batchError) {
                console.error('\nFetch error:', batchError.message);
                // Wait a bit before retry
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            if (!batch || batch.length === 0) {
                console.log('\nAll words have been processed.');
                break;
            }

            for (const entry of batch) {
                processedThisRun++;

                // Progress Display
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const wordsPerMin = processedThisRun > 0 ? (processedThisRun / (elapsed / 60)).toFixed(1) : 0;

                readline.cursorTo(process.stdout, 0);
                process.stdout.write(
                    `[${processedThisRun}] Word: ${entry.word.padEnd(15)} | ` +
                    `Elapsed: ${elapsed}s | ` +
                    `Speed: ${wordsPerMin} w/m | ` +
                    `Queue: ${allWordIds.length}`
                );

                const dictData = await fetchWordnikData(entry.word);

                if (dictData) {
                    const updates = { updated_at: new Date().toISOString() };
                    if (dictData.audioUrl) updates.audio = dictData.audioUrl;
                    if (dictData.phonetic) updates.phonetic = dictData.phonetic;

                    const enrichedExamples = [];
                    if (dictData.examples && dictData.examples.length > 0) {
                        for (const ex of dictData.examples) {
                            const translated = await translateToChinese(ex.text);
                            enrichedExamples.push({ en: ex.text, zh: translated || 'Translation pending...' });
                            await new Promise(r => setTimeout(r, 200));
                        }
                        updates.detail = { ...entry.detail, examples: enrichedExamples };
                    }

                    const { error: updateError } = await supabase
                        .from('dictionary')
                        .update(updates)
                        .eq('id', entry.id);

                    if (updateError) {
                        readline.cursorTo(process.stdout, 0);
                        console.error(`\nError updating ${entry.word}:`, updateError.message);
                    }
                } else {
                    // Mark as updated anyway so we skip it in the next loop
                    await supabase.from('dictionary').update({ updated_at: new Date().toISOString() }).eq('id', entry.id);
                }

                await new Promise(r => setTimeout(r, 1000));
            }
        }
    } catch (err) {
        console.error('\nFatal error:', err.message);
    }
}

enrich().catch(console.error);
