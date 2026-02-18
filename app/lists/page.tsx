import { getWordLists } from '@/lib/actions/wordLists'
import WordListCard from '@/components/WordListCard'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import ListsHeader from '@/components/ListsHeader'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function WordListsPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const t = await getTranslations('lists')

    if (!user) {
        return (
            <main className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-8">
                <div className="w-24 h-24 bg-white/[0.03] border border-white/5 rounded-[2.5rem] flex items-center justify-center text-white/20 shadow-2xl">
                    <Lock size={40} />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black font-outfit tracking-tight">Access Required</h1>
                    <p className="text-white/40 max-w-[280px] leading-relaxed mx-auto font-medium">
                        🔒 Please log in to access your word lists and start your learning journey.
                    </p>
                </div>

                <div className="flex flex-col w-full gap-3 pt-4">
                    <Link
                        href="/login?redirect=/lists"
                        className="btn-primary w-full py-4 text-lg font-black"
                    >
                        Log in / Sign up
                    </Link>
                    <Link
                        href="/"
                        className="text-white/20 hover:text-white/40 text-sm font-bold uppercase tracking-widest transition-colors"
                    >
                        Back to Home
                    </Link>
                </div>
            </main>
        )
    }

    const lists = await getWordLists()

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
