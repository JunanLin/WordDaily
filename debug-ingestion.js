require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const lemmatizer = require('wink-lemmatizer');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
    console.log('--- Testing Lemmatizer ---');
    const l = lemmatizer.default || lemmatizer;
    console.log('Lemmatizer methods:', Object.keys(l));
    const word = 'thinking';
    console.log(`Lemmatizing "${word}"...`);
    try {
        const verb = l.verb(word);
        console.log('Result as verb:', verb);
    } catch (e) {
        console.error('Lemmatizer verb error:', e.message);
    }

    console.log('\n--- Testing Supabase Connection ---');
    try {
        const { data, error } = await supabase.from('words').select('id').limit(1);
        if (error) {
            console.error('Supabase Error:', error.message);
            if (error.message.includes('relation "public.words" does not exist')) {
                console.log('ACTION REQUIRED: You need to run the SQL migration in your Supabase SQL Editor!');
            }
        } else {
            console.log('Supabase connection successful. Tables exist.');
        }
    } catch (e) {
        console.error('Connection Error:', e.message);
    }
}

test();
