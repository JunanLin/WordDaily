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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_WORDS = [
    'apple', 'banana', 'cherry', 'date', 'elderberry',
    'fig', 'grape', 'honeydew', 'kiwi', 'lemon'
];

async function main() {
    console.log('--- Creating "testing" Word List ---');

    // 1. Create the list if it doesn't exist
    let { data: list, error: listError } = await supabase
        .from('word_lists')
        .select('*')
        .eq('code', 'testing')
        .maybeSingle();

    if (listError) {
        console.error('Error fetching list:', listError.message);
        process.exit(1);
    }

    if (!list) {
        console.log('Creating "testing" list...');
        const { data: newList, error: createError } = await supabase
            .from('word_lists')
            .insert({
                code: 'testing',
                name: 'Testing List',
                description: 'A sample list for testing the full cycle of adding words and memorizing.'
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating list:', createError.message);
            process.exit(1);
        }
        list = newList;
    }

    console.log(`Using list: ${list.name} (${list.id})`);

    // 2. Ensure words exist in dictionary and add to list
    for (const word of TEST_WORDS) {
        // Find or create word in dictionary
        let { data: entry, error: dictError } = await supabase
            .from('dictionary')
            .select('id')
            .eq('word', word)
            .maybeSingle();

        if (!entry) {
            const { data: newEntry, error: insertError } = await supabase
                .from('dictionary')
                .insert({ word, translation: `Meaning of ${word}` })
                .select('id')
                .single();

            if (insertError) {
                console.error(`Error inserting ${word}:`, insertError.message);
                continue;
            }
            entry = newEntry;
        }

        // Add to word_list_items
        const { error: itemError } = await supabase
            .from('word_list_items')
            .upsert({
                list_id: list.id,
                word_id: entry.id
            }, { onConflict: 'list_id,word_id' });

        if (itemError) {
            console.error(`Error adding ${word} to list:`, itemError.message);
        }
    }

    console.log('\n"testing" list is ready with 10 words.');
}

main().catch(console.error);
