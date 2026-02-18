const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual env parsing
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const QUEUE_FILE = path.join(__dirname, 'enrichment-queue.json');

async function syncCloud() {
    if (!fs.existsSync(QUEUE_FILE)) {
        console.error('Queue file not found. Nothing to sync.');
        return;
    }

    const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    console.log(`Loaded ${queue.length} words from local queue.`);

    const enrichedBatch = queue.filter(item => {
        const hasAudio = !!item.audio;
        const hasExamples = item.detail?.examples && item.detail.examples.length > 0;
        return hasAudio || hasExamples;
    });

    console.log(`Found ${enrichedBatch.length} enriched records to sync.`);

    const BATCH_SIZE = 50;
    for (let i = 0; i < enrichedBatch.length; i += BATCH_SIZE) {
        const batch = enrichedBatch.slice(i, i + BATCH_SIZE);
        console.log(`Syncing batch ${i / BATCH_SIZE + 1} (${batch.length} items)...`);

        // We have to update one by one or use a clever upsert if we had all fields.
        // Since we only want to update specific fields, we'll do promise.all for small batches
        await Promise.all(batch.map(item =>
            supabase
                .from('dictionary')
                .update({
                    audio: item.audio,
                    phonetic: item.phonetic,
                    detail: item.detail,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id)
        ));
    }

    console.log('Sync complete.');
}

syncCloud().catch(console.error);
