import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    let response = await updateSession(request)

    // Locale detection
    const hasLocale = request.cookies.has('NEXT_LOCALE');
    if (!hasLocale) {
        // Simple language detection from header
        const acceptLanguage = request.headers.get('accept-language');
        const detectedLocale = acceptLanguage?.includes('zh') ? 'zh' : 'en'; // Default to 'en'

        // Apply locale cookie to the response
        response.cookies.set('NEXT_LOCALE', detectedLocale);
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
