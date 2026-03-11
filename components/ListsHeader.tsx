'use client'

import { useState } from 'react'
import { ArrowLeft, HelpCircle, Shuffle, X } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

export default function ListsHeader() {
    const t = useTranslations('lists')
    const [showHelp, setShowHelp] = useState(false)

    return (
        <>
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-5">
                    <Link
                        href="/"
                        className="p-3 bg-[var(--foreground-10)] hover:bg-[var(--foreground-20)] border border-[var(--card-border)] rounded-2xl transition-all active:scale-95"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black font-outfit uppercase tracking-tight text-[rgb(var(--foreground-rgb))]">
                            {t('title')}
                        </h1>
                        <p className="text-[var(--foreground-40)] text-xs font-bold uppercase tracking-[0.2em] pt-1">{t('subtitle')}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowHelp(true)}
                    className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/20 transition-all active:scale-95"
                >
                    <HelpCircle size={24} />
                </button>
            </div>

            <AnimatePresence>
                {showHelp && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[var(--modal-bg)] border border-[var(--card-border)] rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold font-outfit uppercase tracking-tight">
                                        {t('randomSystemTitle')}
                                    </h2>
                                    <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-[var(--foreground-10)] rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-4">
                                        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 h-fit">
                                            <Shuffle size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-[var(--foreground-60)] leading-relaxed">
                                                {t('randomSystemDesc')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowHelp(false)}
                                        className="btn-primary w-full py-4 uppercase tracking-widest text-sm"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
