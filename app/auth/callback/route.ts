import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/'

    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    if (code) {
        const supabase = createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) {
            const redirectPath = next === '/' ? '/auth/verified' : next
            if (redirectPath.startsWith('http')) {
                return NextResponse.redirect(redirectPath)
            }
            return NextResponse.redirect(`${origin}${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`)
        }

        // If code exchange fails, redirect to error page with details
        return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=${exchangeError.name}&error_description=${encodeURIComponent(exchangeError.message)}`
        )
    }

    if (token_hash && type) {
        const supabase = createClient()
        const { error: verifyError } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
        })
        if (!verifyError) {
            const redirectPath = next === '/' ? '/auth/verified' : next
            if (redirectPath.startsWith('http')) {
                return NextResponse.redirect(redirectPath)
            }
            return NextResponse.redirect(`${origin}${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`)
        }

        return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=${verifyError.name}&error_description=${encodeURIComponent(verifyError.message)}`
        )
    }

    // If we have an explicit error from Supabase redirect
    if (error) {
        return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=${error}&error_description=${encodeURIComponent(error_description || '')}`
        )
    }

    // Default error for missing parameters
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
