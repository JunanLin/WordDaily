const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Manual env parsing - looking for .env.local in the project root
const envPath = path.join(__dirname, '../../.env.local');
if (!fs.existsSync(envPath)) {
    console.error(`Error: .env.local not found at ${envPath}`);
    process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const deepseekKey = env.DEEPSEEK_API_KEY;
const wordnikKey = env.WORDNIK_API_KEY;

if (!supabaseUrl || !supabaseKey || !deepseekKey || !wordnikKey) {
    console.error('Missing credentials (SUPABASE, DEEPSEEK, or WORDNIK) in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const WORDNIK_BASE_URL = 'https://api.wordnik.com/v4';

/**
 * Fetch audio URL from Wordnik
 */
async function fetchAudio(word) {
    try {
        const response = await fetch(`${WORDNIK_BASE_URL}/word.json/${word}/audio?useCanonical=false&limit=1&api_key=${wordnikKey}`);
        if (!response.ok) return null;
        const audio = await response.json();
        return audio[0]?.fileUrl || null;
    } catch (e) {
        return null;
    }
}

/**
 * Fetch English-Chinese examples from DeepSeek
 */
async function fetchDeepSeekBatch(words) {
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional dictionary assistant. Generate 4 idiomatic English-Chinese example sentences for EACH given word, covering its most common usages. Return data ONLY in the following JSON format: { "results": { "word1": [{ "en": "...", "zh": "..." }], "word2": [...] } }'
                    },
                    { role: 'user', content: words.join(', ') }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (response.ok) {
            const data = await response.json();
            let parsed;
            try {
                parsed = JSON.parse(data.choices[0].message.content);
            } catch (e) {
                console.error('\n[DeepSeek] JSON parse error');
                return null;
            }

            if (!parsed.results || typeof parsed.results !== 'object') return null;
            return parsed.results;
        } else {
            const err = await response.text();
            console.error(`\n[DeepSeek] API Error: ${response.status} - ${err}`);
        }
    } catch (e) {
        console.error(`\n[DeepSeek] Batch error:`, e.message);
    }
    return null;
}

async function startEnrichment() {
    console.log('--- Dictionary Enrichment: DeepSeek Examples & Wordnik Audio ---');

    // 1. Initial counts for high-frequency words
    const { count: totalWords, error: countError } = await supabase
        .from('dictionary')
        .select('id', { count: 'exact', head: true })
        .or('bnc.neq.0,frq.neq.0');

    if (countError) {
        console.error('Error counting words:', countError.message);
        return;
    }
    console.log(`Total target words (BNC/FRQ > 0): ${totalWords}`);

    // Count missing target items
    const { count: missingCount, error: leftError } = await supabase
        .from('dictionary')
        .select('id', { count: 'exact', head: true })
        .or('bnc.neq.0,frq.neq.0')
        .or('detail.is.null,audio.is.null');

    if (leftError) {
        console.error('Error counting missing:', leftError.message);
        return;
    }
    console.log(`Words needing Examples OR Audio: ${missingCount}`);

    if (missingCount === 0) {
        console.log('All target words are already enriched.');
        return;
    }

    const startTime = Date.now();
    let processedThisRun = 0;
    const BATCH_SIZE = 10;

    // Wordnik limit: 1000/hour ~= 16.6/min ~= 1 per 3.6s
    // With batch size 10, each batch takes at least 36s to stay strictly under limit.
    // DeepSeek is much faster.
    const WORDNIK_DELAY_PER_WORD = 3700; // 3.7s

    while (true) {
        // Fetch next batch that needs EITHER detail OR audio
        const { data: currentBatch, error: fetchError } = await supabase
            .from('dictionary')
            .select('id, word, detail, audio')
            .or('bnc.neq.0,frq.neq.0')
            .or('detail.is.null,audio.is.null')
            .limit(BATCH_SIZE);

        if (fetchError) {
            console.error('\nError fetching batch:', fetchError.message);
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }

        if (!currentBatch || currentBatch.length === 0) break;

        const wordList = currentBatch.map(w => w.word);

        // Run Parallel Queries
        // 1. DeepSeek batch for missing details
        // 2. Individual Wordnik calls for missing audio
        const detailTasks = fetchDeepSeekBatch(wordList);
        const audioTasks = Promise.all(currentBatch.map(item =>
            item.audio ? Promise.resolve(item.audio) : fetchAudio(item.word)
        ));

        const [deepseekResults, audioResults] = await Promise.all([detailTasks, audioTasks]);

        // Push updates to Supabase
        const updatePromises = currentBatch.map(async (entry, idx) => {
            const updates = { updated_at: new Date().toISOString() };

            // Update detail if missing
            if (!entry.detail && deepseekResults && deepseekResults[entry.word]) {
                updates.detail = { examples: deepseekResults[entry.word] };
            }

            // Update audio if missing
            if (!entry.audio && audioResults[idx]) {
                updates.audio = audioResults[idx];
            }

            if (Object.keys(updates).length > 1) { // more than just updated_at
                const { error: updateError } = await supabase
                    .from('dictionary')
                    .update(updates)
                    .eq('id', entry.id);

                if (updateError) {
                    console.error(`\nFailed to update ${entry.word}:`, updateError.message);
                }
            }
        });

        await Promise.all(updatePromises);
        processedThisRun += currentBatch.length;

        // Progress Print
        const elapsedMs = Date.now() - startTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const timeStr = elapsedSec >= 60
            ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
            : `${elapsedSec}s`;

        // Calculate progress based on remaining needed
        const { count: currentMissing } = await supabase
            .from('dictionary')
            .select('id', { count: 'exact', head: true })
            .or('bnc.neq.0,frq.neq.0')
            .or('detail.is.null,audio.is.null');

        const totalEnriched = totalWords - (currentMissing || 0);

        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${totalEnriched}/${totalWords} total words enriched | Batch ${processedThisRun} items | Time: ${timeStr}`);

        // STRICT Wordnik Pacing: 10 words * 3.7s = 37s delay
        await new Promise(r => setTimeout(r, BATCH_SIZE * WORDNIK_DELAY_PER_WORD));
    }

    console.log('\nAll dictionary enrichment complete.');
}

startEnrichment().catch(console.error);
