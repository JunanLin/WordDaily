import { getWordLists } from '@/lib/actions/wordLists'
import WordListCard from '@/components/WordListCard'
import { ArrowLeft, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import ListsHeader from '@/components/ListsHeader'

export const dynamic = 'force-dynamic'

export default async function WordListsPage() {
    const lists = await getWordLists()
    const t = await getTranslations('lists')

    return (
        <main className="min-h-screen p-6 pb-24 max-w-4xl mx-auto">
            <ListsHeader />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lists.map(list => (
                    <WordListCard key={list.id} list={list} />
                ))}
            </div>

            {lists.length === 0 && (
                <div className="text-center py-32 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                    <p className="text-white/20 font-bold uppercase tracking-widest">{t('noLists')}</p>
                </div>
            )}
        </main>
    )
}
