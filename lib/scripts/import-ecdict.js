const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const LOG_FILE = 'import.log';
function log(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, formatted);
}

// Clear log
fs.writeFileSync(LOG_FILE, '');

// Manual env parsing
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    log('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
log('Supabase client initialized');
const CSV_PATH = '/tmp/ECDICT/ecdict.csv';

if (!fs.existsSync(CSV_PATH)) {
    log(`File not found: ${CSV_PATH}`);
    process.exit(1);
}
log(`CSV file found: ${CSV_PATH}`);

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

async function processBatch(words) {
    log(`Processing batch of ${words.length} words...`);
    const { data: inserted, error } = await supabase
        .from('dictionary')
        .upsert(words, { onConflict: 'word' });

    if (error) {
        log(`Batch error: ${error.message}`);
        return;
    }

    log(`Upsert complete. Processed batch.`);
}

async function runImport() {
    log('Starting full ECDICT import (770k+ rows) into unified dictionary table...');

    const fileStream = fs.createReadStream(CSV_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let lineIdx = 0;
    const wordBatch = [];

    const BATCH_SIZE = 1000;

    for await (const line of rl) {
        lineIdx++;
        if (lineIdx === 1) continue; // Skip header

        const row = parseCSVLine(line);
        if (row.length < 11) continue; // Basic validation
        const [word, phonetic, definition, translation, pos, collins, oxford, tag, bnc, frq, exchange, detail, audio] = row;

        const normalized = word.trim().toLowerCase();
        if (!normalized) continue;

        const frqIdx = frq ? parseInt(frq) : null;
        const bncIdx = bnc ? parseInt(bnc) : null;

        wordBatch.push({
            word: normalized,
            phonetic: phonetic,
            definition: definition,
            translation: translation,
            pos: pos,
            collins: collins,
            oxford: oxford,
            tag: tag,
            bnc: bncIdx,
            frq: frqIdx,
            exchange: exchange,
            detail: detail ? { raw: detail } : null, // Store as JSON object if needed, or just string
            audio: audio,
            updated_at: new Date().toISOString()
        });

        if (wordBatch.length >= BATCH_SIZE) {
            await processBatch(wordBatch);
            wordBatch.length = 0;
            count += BATCH_SIZE;
            log(`Imported ${count} words...`);
        }
    }

    if (wordBatch.length > 0) {
        await processBatch(wordBatch);
        count += wordBatch.length;
    }

    log(`Import complete. Total words processed: ${count}`);
}

runImport().catch(err => {
    log(`Fatal error: ${err.message}`);
    log(err.stack);
});
