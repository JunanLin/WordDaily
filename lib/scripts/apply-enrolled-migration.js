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

const sql = `
CREATE TABLE IF NOT EXISTS public.user_word_list_enrolled (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    list_id UUID REFERENCES public.word_lists(id) ON DELETE CASCADE NOT NULL,
    word_id UUID REFERENCES public.dictionary(id) ON DELETE CASCADE NOT NULL,
    round INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, list_id, word_id, round)
);

ALTER TABLE public.user_word_list_enrolled ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_word_list_enrolled' 
        AND policyname = 'Users can manage their own enrolled words'
    ) THEN
        CREATE POLICY "Users can manage their own enrolled words"
            ON public.user_word_list_enrolled
            FOR ALL
            USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_word_list_enrolled_lookup 
    ON public.user_word_list_enrolled(user_id, list_id, round);
`;

async function applyMigration() {
    console.log('Applying user_word_list_enrolled migration...');
    // We try to use an RPC if available, or just report we can't do it directly
    // Since we don't know for sure if exec_sql exists, we'll try a common one or just suggest manual.
    // However, if I can't run it, I'll just skip and tell the user.

    const result = await supabase.rpc('exec_sql', { sql_query: sql });

    if (result.error) {
        console.error('Could not apply migration automatically. Please run the SQL manually in Supabase Editor.');
        console.log(sql);
    } else {
        console.log('Migration applied successfully!');
    }
}

applyMigration();
