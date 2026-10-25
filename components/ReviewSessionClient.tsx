'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, ChevronRight, CheckCircle2, Loader2, RotateCcw, XCircle, Info } from 'lucide-react';
import { submitReview } from '@/lib/actions/review';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { formatWord } from '@/lib/utils/format';
import type { ReviewRating } from '@/lib/services/sm2';

/** Max times a forgotten word is requeued within one session. */
const MAX_REQUEUES_PER_WORD = 2;

interface Example {
    example_en: string;
    example_zh: string;
}

interface Meaning {
    part_of_speech: string;
    chinese_meaning: string;
}

interface ReviewWord {
    id: string;
    dictionary: {
        word: string;
        phonetic?: string;
        translation?: string;
        pos?: string;
        tag?: string;
        bnc?: number;
        frq?: number;
        exchange?: string;
        detail?: any;
        audio?: string;
    };
}

interface ReviewSessionClientProps {
    words: ReviewWord[];
    useCapitalCase?: boolean;
}

const getPOSColor = (pos: string) => {
    const p = pos ? pos.toLowerCase() : '';
    if (p.includes('noun') || p === 'n') return 'bg-[var(--pos-noun-bg)] text-[var(--pos-noun-text)] border-[var(--pos-noun-border)]';
    if (p.includes('verb') || p === 'v') return 'bg-[var(--pos-verb-bg)] text-[var(--pos-verb-text)] border-[var(--pos-verb-border)]';
    if (p.includes('adj') || p === 'a') return 'bg-[var(--pos-adj-bg)] text-[var(--pos-adj-text)] border-[var(--pos-adj-border)]';
    if (p.includes('adv') || p === 'r') return 'bg-[var(--pos-adv-bg)] text-[var(--pos-adv-text)] border-[var(--pos-adv-border)]';
    return 'bg-[var(--pos-other-bg)] text-[var(--pos-other-text)] border-[var(--pos-other-border)]';
};

/**
 * Helper to parse ECDICT translation string into meanings array
 */
const parseMeanings = (translation: string, fallbackPos?: string) => {
    if (!translation) return [];
    // Split by actual newlines or literal \n strings
    return translation.split(/\r?\n|\\n/).map(line => {
        const match = line.match(/^([a-z]+\.)\s*(.*)/);
        if (match) return { part_of_speech: match[1].replace('.', ''), chinese_meaning: match[2].trim() };
        return { part_of_speech: fallbackPos || 'N/A', chinese_meaning: line.trim() };
    }).filter(m => m.chinese_meaning);
};

/**
 * Helper to extract examples from dictionary detail JSON
 */
const parseExamples = (detail: any) => {
    if (!detail || !detail.examples) return [];
    return detail.examples;
};

export default function ReviewSessionClient({ words: initialWords, useCapitalCase = false }: ReviewSessionClientProps) {
    const t = useTranslations('review');
    // Session queue: forgotten words are appended again so they're reviewed more often.
    const [words, setWords] = useState(initialWords);
    const [requeueCounts, setRequeueCounts] = useState<Record<string, number>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [step, setStep] = useState<'STUDY' | 'REVEAL' | 'SCORE'>('STUDY');
    const [rating, setRating] = useState<ReviewRating | null>(null);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [submitError, setSubmitError] = useState(false);
    const [isMeaningsExpanded, setIsMeaningsExpanded] = useState(false);
    const router = useRouter();
    const submitRef = useRef<() => void>(() => {});

    // Keyboard shortcuts on the rating step: 1 = mastered, 2 = needs review, 3 = forgot, Enter = continue
    useEffect(() => {
        if (step !== 'SCORE') return;
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === '1') setRating('mastered');
            else if (e.key === '2') setRating('review');
            else if (e.key === '3') setRating('forgot');
            else if (e.key === 'Enter') {
                // Leave Enter alone on links/other controls; only handle it when nothing
                // specific is focused or focus is on a rating button.
                const onBody = !target || target === document.body;
                if (!onBody && !target.closest('[data-rating-group]')) return;
                e.preventDefault();
                submitRef.current();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [step]);

    // Reset due count in navigation when session is empty or finished
    useEffect(() => {
        if (initialWords.length === 0) {
            window.dispatchEvent(new CustomEvent('review-finished'));
        }
    }, [initialWords.length]);

    const currentWord = words[currentIndex];
    const total = words.length;

    // Safety check for empty session or finished session
    if (words.length === 0 && !finished) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold">{t('allCaughtUp')}</h2>
                <p className="text-[var(--foreground-40)]">{t('noWordsDue')}</p>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-indigo-500/20 p-6 rounded-full text-indigo-400 mb-4"
                >
                    <CheckCircle2 size={48} />
                </motion.div>
                <h2 className="text-3xl font-bold font-outfit">{t('sessionComplete')}</h2>
                <p className="text-[var(--foreground-40)]">{t('sessionDoneDesc')}</p>
                <button
                    onClick={() => router.push('/')}
                    className="btn-primary mt-4"
                >
                    {t('backToDashboard')}
                </button>
            </div>
        );
    }

    if (!currentWord) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-[var(--foreground-40)]">{t('loading') || 'Loading...'}</p>
            </div>
        );
    }


    // A requeued card is the same object appended later in the queue.
    const isRetry = words.indexOf(currentWord) !== currentIndex;
    // Only requeue when other cards remain, so the word really comes back "later" rather than immediately.
    const willRequeue = rating === 'forgot'
        && currentIndex + 1 < total
        && (requeueCounts[currentWord.id] || 0) < MAX_REQUEUES_PER_WORD;

    const handleSubmit = async () => {
        if (!rating || loading) return;
        setLoading(true);
        setSubmitError(false);
        try {
            await submitReview(currentWord.id, rating, 'EN_TO_CN', isRetry);

            // Forgot → show the word again later in this session
            let nextTotal = total;
            if (willRequeue) {
                setWords(prev => [...prev, currentWord]);
                setRequeueCounts(prev => ({ ...prev, [currentWord.id]: (prev[currentWord.id] || 0) + 1 }));
                nextTotal += 1;
            }

            if (currentIndex + 1 < nextTotal) {
                setCurrentIndex(currentIndex + 1);
                setStep('STUDY');
                setRating(null);
                setIsMeaningsExpanded(false);
            } else {
                setFinished(true);
                // Dispatch event to update navigation immediately
                window.dispatchEvent(new CustomEvent('review-finished'));

                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                // setTimeout(() => router.push('/'), 2500);
            }
        } catch (error) {
            console.error(error);
            setSubmitError(true);
        } finally {
            setLoading(false);
        }
    };

    submitRef.current = handleSubmit;

    const ratingOptions: {
        value: ReviewRating;
        label: string;
        desc: string;
        shortcut: string;
        Icon: typeof CheckCircle2;
        active: string;
        idle: string;
    }[] = [
        {
            value: 'mastered',
            label: t('ratingMastered'),
            desc: t('ratingMasteredDesc'),
            shortcut: '1',
            Icon: CheckCircle2,
            active: 'bg-emerald-500/15 border-emerald-500/60 text-[var(--rating-mastered-text)] ring-2 ring-emerald-500/30',
            idle: 'hover:border-emerald-500/40 hover:text-[var(--rating-mastered-text)]',
        },
        {
            value: 'review',
            label: t('ratingReview'),
            desc: t('ratingReviewDesc'),
            shortcut: '2',
            Icon: RotateCcw,
            active: 'bg-amber-500/15 border-amber-500/60 text-[var(--rating-review-text)] ring-2 ring-amber-500/30',
            idle: 'hover:border-amber-500/40 hover:text-[var(--rating-review-text)]',
        },
        {
            value: 'forgot',
            label: t('ratingForgot'),
            desc: t('ratingForgotDesc'),
            shortcut: '3',
            Icon: XCircle,
            active: 'bg-red-500/15 border-red-500/60 text-[var(--rating-forgot-text)] ring-2 ring-red-500/30',
            idle: 'hover:border-red-500/40 hover:text-[var(--rating-forgot-text)]',
        },
    ];

    const parseExchange = (exchange: string) => {
        if (!exchange) return [];
        const codes: Record<string, string> = {
            p: '过去式',
            d: '过去分词',
            i: '现在分词',
            '3': '第三人称单数',
            r: '比较级',
            t: '最高级',
            s: '复数',
            '0': '原型',
            '1': '变换'
        };

        return exchange.split('/').map(part => {
            const [code, val] = part.split(':');
            return {
                label: codes[code] || code,
                value: val
            };
        });
    };

    const playAudio = () => {
        if (currentWord.dictionary.audio) {
            const audio = new Audio(currentWord.dictionary.audio);
            audio.play().catch(e => {
                console.error('[Audio] Playback failed, falling back to TTS:', e);
                const utterance = new SpeechSynthesisUtterance(currentWord.dictionary.word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            });
        } else if (currentWord.dictionary.word) {
            const utterance = new SpeechSynthesisUtterance(currentWord.dictionary.word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    };

    const getWordSizeClass = (word: string) => {
        const len = word.length;
        if (len > 20) return 'text-2xl';
        if (len > 15) return 'text-3xl';
        if (len > 10) return 'text-4xl';
        return 'text-6xl';
    };

    const getRevealWordSizeClass = (word: string) => {
        const len = word.length;
        if (len > 20) return 'text-xl';
        if (len > 15) return 'text-2xl';
        if (len > 10) return 'text-3xl';
        return 'text-4xl';
    };

    return (
        <div className="flex flex-col h-full min-h-[70vh] items-center space-y-6">
            {/* Progress */}
            <div className="w-full flex justify-between items-center text-xs font-bold text-[var(--foreground-40)] uppercase tracking-widest px-2">
                <span>{t('sessionProgress')}</span>
                <span>{currentIndex + 1} / {total}</span>
            </div>

            <div className="w-full h-1 bg-[var(--foreground-10)] rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
            </div>

            {/* Card Section */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${currentIndex}-${step}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-[450px]"
                >
                    <div className="card w-full h-full flex flex-col items-center justify-start text-center p-8 relative overflow-y-auto ring-1 ring-[var(--card-border)] shadow-2xl bg-[var(--modal-bg)] scrollbar-thin scrollbar-thumb-[var(--foreground-10)] scrollbar-track-transparent">
                        {step === 'STUDY' && (
                            <div className="space-y-8 my-auto py-4">
                                <span className="text-[0.625rem] font-bold text-indigo-400 uppercase tracking-[0.2em]">{t('englishOrigin')}</span>
                                <div className="space-y-4">
                                    <h2 className={cn("font-black font-outfit tracking-tight break-words", getWordSizeClass(currentWord.dictionary.word))}>
                                        {formatWord(currentWord.dictionary.word, useCapitalCase)}
                                    </h2>
                                    <p className="text-[var(--foreground-20)] font-mono text-sm tracking-widest">{currentWord.dictionary.phonetic || '/.../'}</p>
                                </div>
                                <button
                                    onClick={playAudio}
                                    className="p-5 bg-indigo-500/10 rounded-full hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95 shadow-lg shadow-indigo-500/5 group"
                                >
                                    <Volume2 size={32} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        )}

                        {step === 'REVEAL' && (
                            <div className="space-y-6 w-full max-w-lg py-4">
                                <div className="space-y-2">
                                    <h2 className={cn("font-black font-outfit tracking-tight break-words", getRevealWordSizeClass(currentWord.dictionary.word))}>
                                        {formatWord(currentWord.dictionary.word, useCapitalCase)}
                                    </h2>
                                    <div className="flex items-center justify-center gap-3">
                                        <p className="text-[var(--foreground-20)] font-mono text-xs tracking-widest">{currentWord.dictionary.phonetic || '/.../'}</p>
                                        <button
                                            onClick={playAudio}
                                            className="p-1.5 bg-indigo-500/10 rounded-full text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats & Metadata */}
                                {(currentWord.dictionary.tag || currentWord.dictionary.pos || currentWord.dictionary.bnc || currentWord.dictionary.frq || currentWord.dictionary.exchange) && (
                                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {currentWord.dictionary.tag?.split(' ').filter(Boolean).map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[0.625rem] font-bold text-indigo-300">
                                                    {t(`tag_${tag}`)}
                                                </span>
                                            ))}
                                        </div>
                                        {currentWord.dictionary.exchange && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[0.625rem]">
                                                {parseExchange(currentWord.dictionary.exchange).map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex gap-1.5">
                                                        <span className="text-[var(--foreground-20)] uppercase font-black">{ex.label}</span>
                                                        <span className="text-indigo-400 font-bold">{formatWord(ex.value, useCapitalCase)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {currentWord.dictionary.pos && (
                                            <div className="pt-2 border-t border-indigo-500/10">
                                                <p className="text-[0.625rem] text-[var(--foreground-40)] font-bold uppercase mb-1">{t('posDistribution')}</p>
                                                <p className="text-xs text-indigo-200/80 font-mono italic">{currentWord.dictionary.pos}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3 text-left">
                                    {parseMeanings(currentWord.dictionary.translation || '', currentWord.dictionary.pos).map((m: any, i: number) => (
                                        <div key={i} className="p-4 rounded-xl bg-[var(--foreground-10)] border border-[var(--card-border)] flex items-center gap-3">
                                            <span className={cn("text-[0.625rem] font-bold uppercase py-0.5 px-1.5 rounded border", getPOSColor(m.part_of_speech))}>
                                                {m.part_of_speech || 'N/A'}
                                            </span>
                                            <p className="text-lg font-bold text-[rgb(var(--foreground-rgb))]">{m.chinese_meaning}</p>
                                        </div>
                                    ))}

                                    {parseExamples(currentWord.dictionary.detail).length > 0 && (
                                        <div className="mt-4 space-y-4">
                                            <p className="text-[0.625rem] font-black text-[var(--indigo-text)] uppercase tracking-[0.2em] px-2">{t('contextualUsage')}</p>
                                            {parseExamples(currentWord.dictionary.detail).map((ex: any, ei: number) => (
                                                <div key={ei} className="text-sm bg-[var(--foreground-10)] p-4 rounded-[1.5rem] border border-[var(--card-border)]">
                                                    <p className="text-[rgb(var(--foreground-rgb))] opacity-80 italic font-medium leading-relaxed">&quot;{ex.en || ex.example_en}&quot;</p>
                                                    <div className="h-px bg-[var(--card-border)] w-8 my-2" />
                                                    <p className="text-[var(--indigo-text)] opacity-60 text-xs font-medium">{ex.zh || ex.example_zh}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 'SCORE' && (
                            <div className="space-y-8 w-full my-auto py-4">
                                <span className="text-[0.75rem] font-bold text-green-400 uppercase tracking-[0.2em]">{t('selfAssessment')}</span>
                                <div className="space-y-2">
                                    <h3 className={cn("font-black font-outfit break-words", getRevealWordSizeClass(currentWord.dictionary.word))}>
                                        {formatWord(currentWord.dictionary.word, useCapitalCase)}
                                    </h3>
                                    <div className="text-[var(--foreground-40)] text-sm">{t('howEasy')}</div>
                                </div>

                                <div className="space-y-4 bg-[var(--foreground-10)] p-4 sm:p-6 rounded-2xl border border-[var(--card-border)]">
                                    <div role="group" data-rating-group aria-label={t('howEasy')} className="grid grid-cols-3 gap-2 sm:gap-3">
                                        {ratingOptions.map(({ value, label, desc, shortcut, Icon, active, idle }) => {
                                            const selected = rating === value;
                                            return (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    aria-pressed={selected}
                                                    aria-keyshortcuts={shortcut}
                                                    onClick={() => setRating(value)}
                                                    className={cn(
                                                        "relative flex flex-col items-center justify-center gap-1.5 px-2 py-4 rounded-2xl border transition-all active:scale-95",
                                                        selected
                                                            ? active
                                                            : cn("bg-[var(--modal-bg)] border-[var(--card-border)] text-[rgb(var(--foreground-rgb))]", idle)
                                                    )}
                                                >
                                                    <span aria-hidden="true" className="absolute top-1.5 right-2 text-[0.625rem] font-bold text-[var(--foreground-20)] hidden sm:block">{shortcut}</span>
                                                    <Icon size={22} />
                                                    <span className="text-sm font-black">{label}</span>
                                                    <span className="text-[0.625rem] font-medium leading-tight opacity-90">{desc}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-start gap-2 text-left text-[0.75rem] text-[var(--foreground-40)] leading-relaxed">
                                        <Info size={14} className="shrink-0 mt-0.5 text-[var(--indigo-text)]" />
                                        <p>{t('ratingReminder')}</p>
                                    </div>

                                    <div className="min-h-[1.25rem] flex items-center justify-center">
                                        <AnimatePresence>
                                            {willRequeue && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-[0.75rem] text-[var(--rating-forgot-text)] font-medium italic"
                                                >
                                                    {t('ratingRequeued')}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <p className="text-[0.625rem] text-[var(--foreground-20)] hidden sm:block">{t('ratingShortcutHint')}</p>
                                </div>

                                {parseExamples(currentWord.dictionary.detail).length > 0 && (
                                    <div className="mt-6 space-y-4 text-left">
                                        <p className="text-[0.625rem] font-black text-[var(--indigo-text)] uppercase tracking-[0.2em] px-2">{t('contextualUsage')}</p>
                                        {parseExamples(currentWord.dictionary.detail).map((ex: any, ei: number) => (
                                            <div key={ei} className="text-sm bg-[var(--foreground-10)] p-4 rounded-[1.5rem] border border-[var(--card-border)]">
                                                <p className="text-[rgb(var(--foreground-rgb))] opacity-80 italic font-medium leading-relaxed">&quot;{ex.en || ex.example_en}&quot;</p>
                                                <div className="h-px bg-[var(--card-border)] w-8 my-2" />
                                                <p className="text-[var(--indigo-text)] opacity-60 text-xs font-medium">{ex.zh || ex.example_zh}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="w-full pt-4 space-y-4">
                {step === 'STUDY' && (
                    <button
                        onClick={() => setStep('REVEAL')}
                        className="btn-primary w-full py-6 flex items-center justify-center gap-2 group"
                    >
                        {t('showTranslation')}
                        <span className="group-hover:translate-x-1 transition-transform">
                            <ChevronRight size={20} />
                        </span>
                    </button>
                )}
                {step === 'REVEAL' && (
                    <button
                        onClick={() => setStep('SCORE')}
                        className="btn-primary w-full py-6 flex items-center justify-center gap-2 group bg-gradient-to-r from-purple-600 to-indigo-600"
                    >
                        {t('rateAssessment')}
                        <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                )}
                {step === 'SCORE' && submitError && (
                    <p role="alert" className="text-center text-[0.75rem] font-medium text-[var(--rating-forgot-text)]">
                        {t('submitError')}
                    </p>
                )}
                {step === 'SCORE' && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !rating}
                        className="btn-primary w-full py-6 flex items-center justify-center gap-2 group bg-gradient-to-r from-indigo-600 to-emerald-600 border-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : (
                            <>
                                {rating ? t('nextWord') : t('selectRatingFirst')}
                                <span className="group-hover:translate-x-1 transition-transform">
                                    <ChevronRight size={24} />
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
