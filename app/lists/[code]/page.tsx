import { createClient } from '@/lib/supabase/server'
import WordListStudyClient from '@/components/WordListStudyClient'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

interface PageProps {
    params: {
        code: string
    }
}

export default async function WordListDetailPage({ params }: PageProps) {
    const supabase = createClient()

    const { data: list, error: listError } = await supabase
        .from('word_lists')
        .select('*')
        .eq('code', params.code)
        .single()

    if (listError || !list) {
        notFound()
    }

    const t = await getTranslations('lists')
    const localizedName = t.has(`${list.code}_name`) ? t(`${list.code}_name`) : list.name

    const { data: { user } } = await supabase.auth.getUser()
    let isLocked = false

    if (user) {
        // Fetch words from this list that are currently in review (next_review_at <= now)
        const { count: pendingCount } = await supabase
            .from('user_words')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .lte('next_review_at', new Date().toISOString())
            .in('word_id', (
                await supabase
                    .from('word_list_items')
                    .select('word_id')
                    .eq('list_id', list.id)
            ).data?.map(i => i.word_id) || [])

        isLocked = (pendingCount || 0) > 0
    }

    return (
        <main className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">
                <WordListStudyClient listId={list.id} listName={localizedName} isLocked={isLocked} />
            </div>
        </main>
    )
}
