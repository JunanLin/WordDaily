const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

// Manual env parsing
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const deepseekKey = env.DEEPSEEK_API_KEY;

if (!supabaseUrl || !supabaseKey || !deepseekKey) {
    console.error('Missing credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEEPSEEK_API_KEY) in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
    console.log('--- Dictionary Enrichment with DeepSeek ---');

    // 1. Count total words with bnc!=0 or frq!=0
    console.log('Counting words with bnc/frq > 0...');
    const { count: totalWords, error: countError } = await supabase
        .from('dictionary')
        .select('id', { count: 'exact', head: true })
        .or('bnc.neq.0,frq.neq.0');

    if (countError) {
        console.error('Error counting words:', countError.message);
        return;
    }
    console.log(`Total words in dictionary with bnc/frq: ${totalWords}`);

    // 2. Count words left to process (those with empty detail)
    const { count: wordsLeft, error: leftError } = await supabase
        .from('dictionary')
        .select('id', { count: 'exact', head: true })
        .or('bnc.neq.0,frq.neq.0')
        .is('detail', null);

    if (leftError) {
        console.error('Error counting words left:', leftError.message);
        return;
    }
    console.log(`Words left to process: ${wordsLeft}`);

    if (wordsLeft === 0) {
        console.log('All words are already enriched.');
        return;
    }

    const startTime = Date.now();
    let processedCountInThisRun = 0;
    const BATCH_SIZE = 10;

    // To follow the user's progress format "xx/total_words", 
    // we define the total progress including what's already done.
    const alreadyDone = totalWords - wordsLeft;

    while (processedCountInThisRun < wordsLeft) {
        // Fetch next batch of words that need enrichment
        const { data: currentBatch, error: fetchError } = await supabase
            .from('dictionary')
            .select('id, word')
            .or('bnc.neq.0,frq.neq.0')
            .is('detail', null)
            .limit(BATCH_SIZE);

        if (fetchError) {
            console.error('\nError fetching batch:', fetchError.message);
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }

        if (!currentBatch || currentBatch.length === 0) break;

        const wordList = currentBatch.map(w => w.word);

        // Fetch from DeepSeek
        const results = await fetchDeepSeekBatch(wordList);

        if (results) {
            // Push updates to Supabase
            const updatePromises = currentBatch.map(async (entry) => {
                const examples = results[entry.word];
                if (examples && Array.isArray(examples)) {
                    const { error: updateError } = await supabase
                        .from('dictionary')
                        .update({
                            detail: { examples },
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', entry.id);

                    if (updateError) {
                        console.error(`\nFailed to update ${entry.word}:`, updateError.message);
                    }
                }
            });

            await Promise.all(updatePromises);
            processedCountInThisRun += currentBatch.length;
        } else {
            console.error(`\nSkipping batch starting with ${wordList[0]} due to DeepSeek error.`);
            await new Promise(r => setTimeout(r, 5000));
        }

        // Progress Print
        const totalDone = alreadyDone + processedCountInThisRun;
        const elapsedMs = Date.now() - startTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const timeStr = elapsedSec >= 60
            ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
            : `${elapsedSec}s`;

        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${totalDone}/${totalWords} done, time passed: ${timeStr}`);

        // Rate limit protection
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\nEnrichment session complete.');
}

startEnrichment().catch(console.error);
