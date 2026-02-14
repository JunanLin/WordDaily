import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    const response = await updateSession(request)

    // Additional logic to redirect to login if not authenticated
    // Note: getUser() should be called in updateSession to refresh the session
    // but here we can check if it's a protected route
    const { pathname } = request.nextUrl

    if (pathname === '/login' || pathname.startsWith('/auth')) {
        return response
    }

    // We'll let the individual server components handle the specific "no user" UI 
    // for a smoother experience (like the Dashboard showing a splash screen),
    // but for deep links like /add or /review, we should probably redirect.
    if (pathname === '/add' || pathname === '/review' || pathname === '/settings' || pathname === '/history') {
        // We'd need to check the user again here or in the server component.
        // For simplicity and better UX, I'll keep the redirects in the server components 
        // to avoid double fetching the user object in middleware.
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
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
