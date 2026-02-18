import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Validates that a user is authenticated. 
 * If not, redirects to login or throws error based on context.
 */
export async function validateSession(shouldRedirect = true) {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        if (shouldRedirect) {
            redirect('/login')
        }
        throw new Error('Unauthorized')
    }

    return { user, supabase }
}

/**
 * Validates that a user has the required role.
 */
export async function validateRole(allowedRoles: ('user' | 'admin')[], shouldRedirect = true) {
    const { user, supabase } = await validateSession(shouldRedirect)

    // Fetch profile to check role from database
    const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (error || !profile || !allowedRoles.includes(profile.role)) {
        if (shouldRedirect) {
            redirect('/')
        }
        throw new Error('Forbidden: Insufficient permissions')
    }

    return { user, profile, supabase }
}

/**
 * Logs a security event to the database.
 */
export async function logSecurityEvent(
    eventType: 'unauthorized_access' | 'failed_login' | 'admin_action' | 'suspicious_query',
    resource: string,
    details: any = {},
    userId?: string
) {
    const supabase = createClient()

    // We use service role if possible for logging to ensure it's not blocked by RLS of the user
    // But here we'll use the current client for simplicity if service role isn't explicitly set up in a separate helper.
    await supabase.from('security_events').insert({
        user_id: userId,
        event_type: eventType,
        resource,
        details,
        // IP address would typically be gathered from headers in middleware/api routes
    })
}
