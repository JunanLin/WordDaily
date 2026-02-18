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

async function main() {
    console.log('--- Database Cleanup and Enrichment Merge ---');

    // 1. Clear "detail" column for all entries in batches to avoid timeout
    console.log('Clearing "detail" column in dictionary table (batched)...');
    let clearedCount = 0;
    while (true) {
        const { data, error: batchError } = await supabase
            .from('dictionary')
            .update({ detail: null })
            .not('detail', 'is', null) // Only target rows that haven't been cleared
            .limit(1000)
            .select('id');

        if (batchError) {
            console.error('Error clearing batch:', batchError.message);
            break;
        }

        if (!data || data.length === 0) {
            break;
        }

        clearedCount += data.length;
        process.stdout.write(`Cleared ${clearedCount} rows...\r`);
    }
    console.log(`\nSuccessfully cleared "detail" column for ${clearedCount} rows.`);

    // 2. Read local enrichment-queue.json
    const queuePath = path.join(__dirname, '../lib/scripts/enrichment/enrichment-queue.json');
    if (!fs.existsSync(queuePath)) {
        console.error('Enrichment queue file not found at:', queuePath);
        process.exit(1);
    }

    const queueData = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
    console.log(`Loaded ${queueData.length} entries from enrichment-queue.json`);

    // 3. Merge data into Supabase
    let successCount = 0;
    let failCount = 0;

    for (const entry of queueData) {
        const { word, audio, detail } = entry;

        // We update based on word since ID might differ in different environments, 
        // though the user's local file seems to have UUIDs that might match.
        // Let's try matching by word first for robustness.

        const { error: updateError } = await supabase
            .from('dictionary')
            .update({
                audio: audio || null,
                detail: detail || null,
                updated_at: new Date().toISOString()
            })
            .eq('word', word.toLowerCase().trim());

        if (updateError) {
            console.error(`Failed to update ${word}:`, updateError.message);
            failCount++;
        } else {
            successCount++;
        }

        if (successCount % 100 === 0) {
            process.stdout.write(`Processed ${successCount} words...\r`);
        }
    }

    console.log(`\nMerge complete!`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

main().catch(console.error);
