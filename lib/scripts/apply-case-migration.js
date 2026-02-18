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
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS use_capital_case boolean DEFAULT false;
`;

async function applyMigration() {
    console.log('Applying case preference migration...');
    const result = await supabase.rpc('exec_sql', { sql_query: sql });

    if (result.error) {
        console.error('Could not apply migration automatically. Please run the SQL manually in Supabase Editor.');
        console.log(sql);
    } else {
        console.log('Migration applied successfully!');
    }
}

applyMigration();
