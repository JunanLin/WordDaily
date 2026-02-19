import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const redirectPath = next === '/' ? '/auth/verified' : next

            // For relative paths, prepend the request origin (safest for cross-env)
            if (redirectPath.startsWith('/')) {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            }

            // For absolute external URLs, redirect directly
            return NextResponse.redirect(redirectPath)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
