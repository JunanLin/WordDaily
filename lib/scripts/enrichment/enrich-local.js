const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Manual env parsing
const envContent = require('fs').readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
});

const wordnikKey = env.WORDNIK_API_KEY;
const deepseekKey = env.DEEPSEEK_API_KEY;

if (!wordnikKey || !deepseekKey) {
    console.error('Missing credentials (WORDNIK_API_KEY or DEEPSEEK_API_KEY) in .env.local');
    process.exit(1);
}

const QUEUE_FILE = path.join(__dirname, 'enrichment-queue.json');
const WORDNIK_BASE_URL = 'https://api.wordnik.com/v4';

// Use p-limit for concurrency
// Note: p-limit ^7.3.0 is ESM only. If this is a CJS script, we use a dynamic import or a simpler pool.
// For script stability, let's implement a simple concurrency pool if p-limit is not easily available.
let pLimit;
async function init() {
    try {
        const module = await import('p-limit');
        pLimit = module.default;
    } catch (e) {
        // Fallback for CJS if p-limit import fails
        pLimit = (limit) => async (fn) => fn();
    }
}

async function fetchAudio(word) {
    try {
        const response = await fetch(`${WORDNIK_BASE_URL}/word.json/${word}/audio?useCanonical=false&limit=1&api_key=${wordnikKey}`);
        if (!response.ok) return null;
        const audio = await response.json();
        return audio[0]?.fileUrl || undefined;
    } catch (e) {
        return null;
    }
}

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
        }
    } catch (e) {
        console.error(`\n[DeepSeek] Batch error:`, e.message);
    }
    return null;
}

async function enrichLocal() {
    await init();
    const limit = pLimit(5); // 5 concurrent batches/tasks

    try {
        const fileContent = await fs.readFile(QUEUE_FILE, 'utf-8');
        const queue = JSON.parse(fileContent);
        console.log(`Loaded ${queue.length} words from queue.`);

        const missing = queue.filter(item => !item.audio || !(item.detail?.examples?.length > 0));
        console.log(`Words needing enrichment: ${missing.length}`);

        let enrichedCount = 0;
        const startTime = Date.now();
        const BATCH_SIZE = 10;

        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
            const currentBatch = missing.slice(i, i + BATCH_SIZE);

            // Per-batch progress
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            const wpm = enrichedCount > 0 ? (enrichedCount / (elapsed / 60)).toFixed(1) : 0;
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Processing: ${i + currentBatch.length}/${missing.length} | Speed: ${wpm} w/m | Elapsed: ${elapsed}s`);

            // Execute Batch
            const wordList = currentBatch.map(e => e.word);

            const [deepseekResults, ...audioResults] = await Promise.all([
                fetchDeepSeekBatch(wordList),
                ...currentBatch.map(item => limit(() => fetchAudio(item.word)))
            ]);

            // Map results back to queue items
            currentBatch.forEach((item, idx) => {
                const audioUrl = audioResults[idx];
                if (audioUrl) item.audio = audioUrl;

                const examples = deepseekResults?.[item.word];
                if (Array.isArray(examples)) {
                    item.detail = { ...item.detail, examples };
                }
            });

            enrichedCount += currentBatch.length;

            // Strict Wordnik Pacing (1000/hour ~= 16/min ~= 1 per 3.6s)
            // With batching 10 words, we should wait roughly 30-40 seconds between batches if we want to be safe,
            // OR we just process and wait a bit. 
            // Let's do a 4s minimum wait between batches to keep Wordnik healthy.
            await new Promise(r => setTimeout(r, 4000));

            // Save progress
            await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
        }

        console.log('\nLocal enrichment complete.');
    } catch (err) {
        console.error('Core error:', err);
    }
}

enrichLocal().catch(console.error);
