'use client'

import { useState } from 'react'
import { ArrowLeft, BookOpen, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import WordListEnrollment from './WordListEnrollment'
import { useTranslations } from 'next-intl'

interface WordListStudyClientProps {
    listId: string
    listName: string
    isLocked?: boolean
}

export default function WordListStudyClient({ listId, listName, isLocked = false }: WordListStudyClientProps) {
    const t = useTranslations('lists')
    const [showEnrollment, setShowEnrollment] = useState(!isLocked)
    const router = useRouter()

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <Link
                    href="/lists"
                    className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={18} /> {t('backToLists')}
                </Link>
                <button
                    onClick={() => {
                        localStorage.removeItem('hideWordListHelp')
                        setShowEnrollment(true)
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-indigo-400 transition-all"
                >
                    <HelpCircle size={20} />
                </button>
            </div>

            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-6">
                <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto">
                    <BookOpen size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black font-outfit uppercase tracking-tight">{listName}</h2>
                    <p className="text-white/40 max-w-sm mx-auto text-sm px-6">
                        {isLocked ? t('listLocked') : t('randomSystemDesc')}
                    </p>
                </div>

                <button
                    onClick={() => setShowEnrollment(true)}
                    disabled={isLocked}
                    className="btn-primary py-4 px-12 uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('enrollButton')}
                </button>
            </div>

            {showEnrollment && (
                <WordListEnrollment
                    listId={listId}
                    listName={listName}
                    onClose={() => {
                        setShowEnrollment(false)
                        // If we just landed here, we might want to stay in the placeholder state
                    }}
                    onSuccess={() => {
                        // Success state handled by modal
                    }}
                />
            )}
        </div>
    )
}
