const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting full data migration with pagination...');

    // 1. Get all word lists to map codes to IDs
    const { data: lists, error: listError } = await supabase
        .from('word_lists')
        .select('id, code');

    if (listError) {
        console.error('Error fetching word lists:', listError);
        return;
    }

    const listMap = {};
    lists.forEach(l => {
        listMap[l.code] = l.id;
    });

    console.log('Word lists mapped:', Object.keys(listMap));

    const validCodes = Object.keys(listMap);
    let totalItemsInserted = 0;

    for (const tag of validCodes) {
        console.log(`Migrating tag: ${tag}...`);
        let from = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            console.log(`  Fetching ${tag} from ${from} to ${from + PAGE_SIZE - 1}...`);
            const { data: words, error: wordError } = await supabase
                .from('dictionary')
                .select('id, tag')
                .ilike('tag', `%${tag}%`)
                .range(from, from + PAGE_SIZE - 1)
                .order('word', { ascending: true });

            if (wordError) {
                console.error(`Error fetching ${tag}:`, wordError);
                break;
            }

            if (!words || words.length === 0) {
                hasMore = false;
                break;
            }

            const itemsToInsert = [];
            words.forEach(word => {
                // Double check the tag is actually present (ilike is a bit broad)
                const tags = word.tag.toLowerCase().split(/\s+/).filter(t => t);
                if (tags.includes(tag)) {
                    itemsToInsert.push({
                        list_id: listMap[tag],
                        word_id: word.id
                    });
                }
            });

            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('word_list_items')
                    .upsert(itemsToInsert, { onConflict: 'list_id,word_id' });

                if (insertError) {
                    console.error(`Error inserting ${tag} batch at ${from}:`, insertError);
                } else {
                    totalItemsInserted += itemsToInsert.length;
                    console.log(`    Inserted ${itemsToInsert.length} items. Cumulative: ${totalItemsInserted}`);
                }
            }

            if (words.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                from += PAGE_SIZE;
            }
        }
    }

    console.log(`Migration complete. Total inserted: ${totalItemsInserted}`);
}

migrate().catch(console.error);
