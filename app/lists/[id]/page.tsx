import { createClient } from '@/lib/supabase/server'
import WordListStudyClient from '@/components/WordListStudyClient'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

interface PageProps {
    params: {
        id: string
    }
}

export default async function WordListDetailPage({ params }: PageProps) {
    const supabase = createClient()

    const { data: list, error } = await supabase
        .from('word_lists')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error || !list) {
        notFound()
    }

    const t = await getTranslations('lists')
    const localizedName = t.has(`${list.code}_name`) ? t(`${list.code}_name`) : list.name

    return (
        <main className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">
                <WordListStudyClient listId={list.id} listName={localizedName} />
            </div>
        </main>
    )
}
