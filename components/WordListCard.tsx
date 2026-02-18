'use client'

import { Star, Sun, ChevronRight, Lock } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface WordListCardProps {
    list: {
        id: string
        code: string
        name: string
        description: string
        total_words: number
        isLocked?: boolean
        progress: {
            current_position: number
            completed_rounds: number
            stars: number
            suns: number
        } | null
    }
}

export default function WordListCard({ list }: WordListCardProps) {
    const t = useTranslations('lists')

    // Attempt to get localized name, fallback to list.name
    const localizedName = t.has(`${list.code}_name`) ? t(`${list.code}_name`) : list.name

    const progress = list.progress || {
        current_position: 0,
        completed_rounds: 0,
        stars: 0,
        suns: 0
    }

    const percentage = list.total_words > 0
        ? Math.round((progress.current_position / list.total_words) * 100)
        : 0

    return (
        <Link href={`/lists/${list.code}`}>
            <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "card group cursor-pointer h-full flex flex-col justify-between p-6 transition-all",
                    list.isLocked && "opacity-80 border-amber-500/20"
                )}
            >
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-[0.2em]">
                                {list.code}
                            </div>
                            {list.isLocked && (
                                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-[0.2em] flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </div>
                            )}
                        </div>
                        <div className="flex gap-1 text-yellow-500">
                            {[...Array(progress.suns)].map((_, i) => (
                                <Sun key={`sun-${i}`} size={16} fill="currentColor" />
                            ))}
                            {[...Array(progress.stars)].map((_, i) => (
                                <Star key={`star-${i}`} size={16} fill="currentColor" />
                            ))}
                        </div>
                    </div>

                    <h3 className="text-2xl font-black font-outfit text-white mb-2 group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate">
                        {localizedName}
                    </h3>
                    <p className="text-white/40 text-sm line-clamp-2 mb-6 font-medium leading-relaxed">
                        {list.description}
                    </p>
                </div>

                <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('wordsInReview')}</p>
                            <span className="text-sm font-bold text-white/60">
                                {progress.current_position} <span className="text-white/20">/</span> {list.total_words}
                            </span>
                        </div>
                        <span className="text-lg font-black font-outfit text-indigo-400">
                            {percentage}%
                        </span>
                    </div>
                    <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                        />
                    </div>
                    {progress.completed_rounds > 0 && (
                        <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400/60">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                            {t('completedRounds', { count: progress.completed_rounds })}
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    )
}
