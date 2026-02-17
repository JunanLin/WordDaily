
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xquzskchlocvbuxuovql.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLS() {
    console.log('Applying RLS fixes...');

    const sql = `
    -- Allow users to delete their own words
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'user_words' 
            AND policyname = 'Users can delete their own words'
        ) THEN
            CREATE POLICY "Users can delete their own words" 
            ON public.user_words 
            FOR DELETE 
            USING (auth.uid() = user_id);
        END IF;

        -- Allow users to delete their own history
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'user_word_history' 
            AND policyname = 'Users can delete their own history'
        ) THEN
            CREATE POLICY "Users can delete their own history" 
            ON public.user_word_history 
            FOR DELETE 
            USING (auth.uid() = user_id);
        END IF;
    END $$;
  `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async (err) => {
        // If exec_sql RPC doesn't exist, we might need another way or just report it.
        // Usually in these environments we can use the REST API to execute SQL if configured, 
        // but the most reliable way if we have service role is to just try a simple query first.
        console.log('Attempting to apply via direct SQL if RPC fails...');
        return { error: 'RPC exec_sql not found' };
    });

    if (error) {
        console.error('Error applying RLS via RPC:', error);
        console.log('\nIMPORTANT: Please run the following SQL in your Supabase Dashboard SQL Editor:\n');
        console.log(`
    CREATE POLICY "Users can delete their own words" 
    ON public.user_words 
    FOR DELETE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own history" 
    ON public.user_word_history 
    FOR DELETE 
    USING (auth.uid() = user_id);
    `);
    } else {
        console.log('RLS fixes applied successfully!');
    }
}

fixRLS();
