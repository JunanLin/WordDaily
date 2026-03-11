import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    const { response, user } = await updateSession(request)

    const nextUrl = request.nextUrl
    const path = nextUrl.pathname

    // Define route patterns
    const isProtectedRoute = path.startsWith('/review') ||
        path.startsWith('/history') ||
        path.startsWith('/settings') ||
        path.startsWith('/today');
    const isAdminRoute = path.startsWith('/admin');

    // 1. Authentication Check
    if (!user && (isProtectedRoute || isAdminRoute)) {
        const loginUrl = new URL('/login', request.url)
        // Store the original path to redirect back after login
        loginUrl.searchParams.set('next', path)
        return NextResponse.redirect(loginUrl)
    }

    // 2. Role-Based Access Control (RBAC)
    if (isAdminRoute) {
        // We trust the user object from updateSession which is refreshed from auth.getUser()
        // The role is stored in the public.users (profiles) table, 
        // that metadata should be included in the user object if synced correctly, 
        // but for robustness we might want to check it specifically if user_metadata is used.
        // For now, if we don't have role in user_metadata, we might need a server-side check.
        const role = user?.user_metadata?.role || 'user';
        if (role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    // Locale detection (preserving existing logic)
    const hasLocale = request.cookies.has('NEXT_LOCALE');
    if (!hasLocale) {
        // Always default to Chinese as per user requirement
        response.cookies.set('NEXT_LOCALE', 'zh');
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/ (handled separately usually, but let's be careful)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
