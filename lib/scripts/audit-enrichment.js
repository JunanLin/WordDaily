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

if (!supabaseUrl || !supabaseKey || !wordnikKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const WORDNIK_BASE_URL = 'https://api.wordnik.com/v4';

async function fetchWordnikData(word) {
    try {
        const [defsRes, examplesRes, audioRes, pronunciationsRes] = await Promise.all([
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/definitions?limit=5&api_key=${wordnikKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/examples?limit=5&api_key=${wordnikKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/audio?limit=1&api_key=${wordnikKey}`),
            fetch(`${WORDNIK_BASE_URL}/word.json/${word}/pronunciations?limit=1&api_key=${wordnikKey}`)
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
        const response = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + translateApiKey, {
            method: 'POST',
            body: JSON.stringify({ q: text, target: 'zh', format: 'text' }),
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            const data = await response.json();
            return data.data?.translations?.[0]?.translatedText || null;
        }
    } catch (e) {
        console.error('Translation error:', e.message);
    }
    return null;
}

async function auditAndEnrich() {
    console.log('--- Word List Enrichment Audit ---');

    // Get all words that are in shared lists
    // We join word_list_items with dictionary
    const { data: items, error } = await supabase
        .from('word_list_items')
        .select(`
            word_id,
            dictionary!inner(id, word, audio, phonetic, detail, updated_at)
        `);

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    // Extract unique words from items
    const wordMap = new Map();
    items.forEach(item => {
        const d = item.dictionary;
        if (!wordMap.has(d.id)) {
            wordMap.set(d.id, d);
        }
    });

    const uniqueWords = Array.from(wordMap.values());
    console.log(`Total words in lists: ${uniqueWords.length}`);

    const missingEnrichment = uniqueWords.filter(d => {
        const hasAudio = !!d.audio;
        const hasPhonetic = !!d.phonetic;
        const hasExamples = d.detail?.examples && d.detail.examples.length > 0;

        // Check if any translations are missing in examples
        const missingTranslations = hasExamples && d.detail.examples.some(ex => !ex.zh || ex.zh.includes('pending'));

        return !hasAudio || !hasPhonetic || !hasExamples || missingTranslations;
    });

    console.log(`Words needing enrichment: ${missingEnrichment.length}`);

    if (missingEnrichment.length === 0) {
        console.log('All words in lists are fully enriched!');
        return;
    }

    console.log('Starting enrichment for missing items...');

    for (const entry of missingEnrichment) {
        console.log(`Enriching: ${entry.word}...`);

        const dictData = await fetchWordnikData(entry.word);
        const updates = { updated_at: new Date().toISOString() };

        if (dictData) {
            if (dictData.audioUrl) updates.audio = dictData.audioUrl;
            if (dictData.phonetic) updates.phonetic = dictData.phonetic;

            const currentExamples = entry.detail?.examples || [];
            const newExamples = [];

            // If we find new examples from Wordnik, prefer them
            if (dictData.examples && dictData.examples.length > 0) {
                for (const ex of dictData.examples) {
                    console.log(`  Translating example...`);
                    const translated = await translateToChinese(ex.text);
                    newExamples.push({ en: ex.text, zh: translated || 'Translation pending...' });
                    await new Promise(r => setTimeout(r, 200));
                }
                updates.detail = { ...entry.detail, examples: newExamples };
            } else if (currentExamples.length > 0) {
                // If we already have examples but missing translations, fix them
                for (const ex of currentExamples) {
                    if (!ex.zh || ex.zh.includes('pending')) {
                        console.log(`  Fixing translation for existing example...`);
                        const translated = await translateToChinese(ex.en);
                        ex.zh = translated || ex.zh;
                        await new Promise(r => setTimeout(r, 200));
                    }
                    newExamples.push(ex);
                }
                updates.detail = { ...entry.detail, examples: newExamples };
            }

            const { error: updateError } = await supabase
                .from('dictionary')
                .update(updates)
                .eq('id', entry.id);

            if (updateError) console.error(`Error updating ${entry.word}:`, updateError);
            else console.log(`✓ Enriched ${entry.word}`);
        } else {
            // Even if Wordnik has nothing, update timestamp
            await supabase.from('dictionary').update({ updated_at: new Date().toISOString() }).eq('id', entry.id);
            console.log(`x No new data found for ${entry.word}`);
        }

        await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }

    console.log('Audit and enrichment complete.');
}

auditAndEnrich().catch(console.error);
