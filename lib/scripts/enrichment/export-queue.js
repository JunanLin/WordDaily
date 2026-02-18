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

async function exportQueue() {
    console.log('--- Stage 1: Exporting Enrichment Queue ---');

    console.log('Fetching unique word IDs from word_list_items...');
    const uniqueIds = new Set();
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
        console.log(`Fetching word IDs (page ${page + 1})...`);
        const { data: listItems, error: listError } = await supabase
            .from('word_list_items')
            .select('word_id')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (listError) {
            console.error('Error fetching list items:', listError);
            break;
        }

        if (!listItems || listItems.length === 0) break;

        listItems.forEach(item => uniqueIds.add(item.word_id));
        page++;
    }

    const allIds = Array.from(uniqueIds);
    console.log(`Found ${allIds.length} unique words in shared lists.`);

    const queue = [];
    const BATCH_SIZE = 25;

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batchIds = allIds.slice(i, i + BATCH_SIZE);
        let retries = 3;

        while (retries > 0) {
            console.log(`Fetching dictionary data: ${i} to ${Math.min(i + BATCH_SIZE, allIds.length)} (Retries: ${3 - retries})...`);

            const { data: batchData, error: batchError } = await supabase
                .from('dictionary')
                .select('id, word, audio, phonetic, detail, updated_at')
                .in('id', batchIds);

            if (batchError) {
                console.error(`Error in batch ${i}:`, batchError.message);
                retries--;
                if (retries > 0) {
                    console.log('Retrying in 2 seconds...');
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    console.error('Moving to next batch after failed retries.');
                }
            } else {
                queue.push(...batchData);
                break;
            }
        }

        // Save progress every 500 records
        if (queue.length % 500 === 0) {
            fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
        }
    }

    console.log(`Total records exported: ${queue.length}`);
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    console.log(`Queue saved to: ${QUEUE_FILE}`);
}

exportQueue().catch(console.error);
