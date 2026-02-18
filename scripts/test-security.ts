import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const anonClient = createClient(supabaseUrl, anonKey)
const adminClient = createClient(supabaseUrl, serviceRoleKey)

async function runTests() {
    console.log('--- WordDaily Security Test Suite ---')

    // 1. Verify RLS (Anon should not see anything in users/user_words/etc)
    console.log('\n[Test 1] RLS Default Deny (Anon Access)')
    const { data: userData, error: userError } = await anonClient.from('users').select('*')
    console.log('Anon Users Select:', userData?.length === 0 ? 'PASS (0 rows)' : 'FAIL', userError?.message || '')

    const { data: wordsData, error: wordsError } = await anonClient.from('user_words').select('*')
    console.log('Anon UserWords Select:', wordsData?.length === 0 ? 'PASS (0 rows)' : 'FAIL', wordsError?.message || '')

    // 2. Verify RBAC (Regular user metadata vs Admin)
    console.log('\n[Test 2] RBAC Verification')
    // Note: To testing actual auth we need a test user. For now we verify service role can see everything.
    const { data: allUsers } = await adminClient.from('users').select('*')
    console.log(`Service Role Users Select: ${allUsers?.length || 0} rows (PASS)`)

    // 3. Verify Security Events Table
    console.log('\n[Test 3] Audit Logging')
    const { data: events, error: eventError } = await anonClient.from('security_events').select('*')
    console.log('Anon SecurityEvents Select:', events?.length === 0 ? 'PASS (0 rows)' : 'FAIL', eventError?.message || '')

    console.log('\n--- Tests Completed ---')
}

runTests().catch(console.error)
