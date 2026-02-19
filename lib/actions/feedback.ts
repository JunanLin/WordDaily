'use server'

import { validateSession } from '@/lib/security'
import { revalidatePath } from 'next/cache'

export async function submitFeedback(data: { message: string, page?: string }) {
    try {
        const { user, supabase } = await validateSession()

        const { error } = await supabase
            .from('feedbacks')
            .insert({
                user_id: user.id,
                message: data.message,
                page: data.page || null,
                status: 'new'
            })

        if (error) throw error

        revalidatePath('/settings')
        return { success: true }
    } catch (error: any) {
        console.error('[Feedback] Error submitting:', error)
        return { success: false, error: error.message }
    }
}
