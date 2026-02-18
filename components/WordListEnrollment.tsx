'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, Shuffle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { enrollRandomWords } from '@/lib/actions/wordLists'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface WordListEnrollmentProps {
    listId: string
    listName: string
    onClose: () => void
    onSuccess: () => void
}

export default function WordListEnrollment({ listId, listName, onClose, onSuccess }: WordListEnrollmentProps) {
    const t = useTranslations('lists')
    const router = useRouter()

    const [step, setStep] = useState<'help' | 'enroll' | 'success'>('help')
    const [wordCount, setWordCount] = useState<number | ''>(50)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)
    const [enrolledCount, setEnrolledCount] = useState(0)
    const [allRemaining, setAllRemaining] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const skipHelp = localStorage.getItem('hideWordListHelp') === 'true'
        if (skipHelp) {
            setStep('enroll')
        }
    }, [])

    const handleEnroll = async () => {
        setIsSubmitting(true)
        setError(null)
        try {
            const result = await enrollRandomWords(listId, Number(wordCount)) as any
            if (result.success) {
                setEnrolledCount(result.enrolledCount)
                setAllRemaining(result.allRemaining || false)
                setStep('success')
                if (dontShowAgain) {
                    localStorage.setItem('hideWordListHelp', 'true')
                }
                onSuccess()
            } else if (result.error === 'LIST_LOCKED') {
                setError(t('listLocked'))
            } else {
                setError(result.error || 'Failed to add words')
            }
        } catch (error) {
            console.error(error)
            setError('Failed to add words. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold font-outfit uppercase tracking-tight">
                            {step === 'success'
                                ? (allRemaining ? t('title') : t('enrollSuccess', { count: enrolledCount }))
                                : t('enrollmentTitle', { name: listName })}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'help' && (
                            <motion.div
                                key="help"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-4">
                                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 h-fit">
                                        <Shuffle size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-indigo-300">{t('randomSystemTitle')}</h3>
                                        <p className="text-sm text-white/40 leading-relaxed">
                                            {t('randomSystemDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 px-1 mt-4">
                                    <input
                                        type="checkbox"
                                        id="dontShow"
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="dontShow" className="text-sm text-white/40 cursor-pointer">
                                        {t('doNotShowAgain')}
                                    </label>
                                </div>

                                <button
                                    onClick={() => setStep('enroll')}
                                    className="btn-primary w-full py-4 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                                >
                                    Continue <ArrowRight size={18} />
                                </button>
                            </motion.div>
                        )}

                        {step === 'enroll' && (
                            <motion.div
                                key="enroll"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-white/40 uppercase tracking-widest block px-1">
                                        {t('howManyWords')}
                                    </label>
                                    <input
                                        type="number"
                                        value={wordCount}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') {
                                                setWordCount('');
                                            } else {
                                                setWordCount(parseInt(val) || 0);
                                            }
                                        }}
                                        min={1}
                                        max={500}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-2xl font-black font-outfit text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                                    />
                                    <div className="grid grid-cols-4 gap-2">
                                        {[10, 20, 50, 100].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setWordCount(val)}
                                                className={`py-2 rounded-xl text-xs font-bold transition-all ${wordCount === val ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border border-white/5 text-white/40 hover:bg-white/10'}`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleEnroll}
                                    disabled={isSubmitting || !wordCount || Number(wordCount) <= 0}
                                    className="btn-primary w-full py-4 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('enrollButton')}
                                </button>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-8 text-center py-4"
                            >
                                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                    <CheckCircle2 size={40} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">
                                        {allRemaining ? t('allRemainingSuccess') : t('enrollSuccess', { count: enrolledCount })}
                                    </h3>
                                    <p className="text-sm text-white/40">
                                        {t('successMessage', { defaultValue: 'Your selected words are now in your Review tab. Start learning them now to boost your memory!' })}
                                    </p>
                                </div>
                                <div className="space-y-3 pt-4">
                                    <button
                                        onClick={() => router.push('/review')}
                                        className="btn-primary w-full py-4 uppercase tracking-widest text-sm"
                                    >
                                        {t('goToReview')}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 text-xs font-bold text-white/20 hover:text-white transition-colors"
                                    >
                                        Back to Lists
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    )
}
