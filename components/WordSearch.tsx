'use client';

import { useState, useEffect } from 'react';
import { lookupWord, addWordToUserList } from '@/lib/actions/word-ingestion';
import { Search, Plus, Loader2, Volume2, CheckCircle2, XCircle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatWord } from '@/lib/utils/format';

interface WordSearchProps {
    useCapitalCase?: boolean;
}

export default function WordSearch({ useCapitalCase = false }: WordSearchProps) {
    const t = useTranslations('add');
    const tReview = useTranslations('review');
    const [word, setWord] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAdded, setIsAdded] = useState(false);
    const [expandedDefs, setExpandedDefs] = useState(false);
    const [shouldLemmatize, setShouldLemmatize] = useState(true);
    const [showTip, setShowTip] = useState(false);
    const [showFreqTip, setShowFreqTip] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!word.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setIsAdded(false);
        setExpandedDefs(false);

        try {
            const res = await lookupWord(word.trim(), shouldLemmatize);
            if (res.success) {
                setResult(res);
                setWord(''); // Clear input after successful lookup
            } else {
                if (res.error === 'word_not_found') {
                    setError(t('wordNotFound'));
                } else {
                    setError(res.error || t('error'));
                }
            }
        } catch (err: any) {
            setError(err.message || t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!result?.id) return;
        setAdding(true);
        try {
            const res = await addWordToUserList(result.id);
            if (res.success) {
                setIsAdded(true);
                window.dispatchEvent(new CustomEvent('refresh-due-count'));
            } else {
                setError(res.error || 'Failed to add word');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add word');
        } finally {
            setAdding(false);
        }
    };

    const playAudio = () => {
        if (result?.audioUrl) {
            const audio = new Audio(result.audioUrl);
            audio.play().catch(e => {
                console.error('Audio play error, falling back to TTS:', e);
                const utterance = new SpeechSynthesisUtterance(result.word);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            });
        } else if (result?.word) {
            const utterance = new SpeechSynthesisUtterance(result.word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    };

    const parseExchange = (exchange: string) => {
        if (!exchange) return [];
        const codes: Record<string, string> = {
            p: t('pastTense'),
            d: t('pastParticiple'),
            i: t('presentParticiple'),
            '3': t('thirdPersonSingle'),
            r: t('comparative'),
            t: t('superlative'),
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

    return (
        <div className="space-y-4">
            <form onSubmit={handleSearch} className="relative group">
                <div className="relative">
                    <input
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        placeholder={t('placeholder')}
                        className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-[1.5rem] py-5 px-14 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-[var(--foreground-40)] shadow-inner text-[rgb(var(--foreground-rgb))]"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--foreground-40)] group-focus-within:text-indigo-400 transition-colors" size={22} />

                    <button
                        type="submit"
                        disabled={loading || !word.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-[var(--foreground-10)] disabled:text-[var(--foreground-10)] text-white px-6 rounded-[1.1rem] font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-[var(--foreground-20)] border-t-[rgb(var(--foreground-rgb))] rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="hidden sm:inline">{t('search')}</span>
                                <Search size={18} />
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-4 flex items-center gap-3 px-2">
                    <label className="flex items-center gap-2 cursor-pointer group/label">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={shouldLemmatize}
                                onChange={(e) => setShouldLemmatize(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="w-9 h-5 bg-[var(--foreground-20)] rounded-full peer-checked:bg-indigo-600 transition-colors border border-[var(--card-border)]" />
                            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                        </div>
                        <span className="text-xs font-bold text-[var(--foreground-40)] group-hover/label:text-[var(--foreground-rgb)] transition-colors">
                            {t('lemmatizeLabel')}
                        </span>
                    </label>

                    <div className="relative">
                        <button
                            type="button"
                            onMouseEnter={() => setShowTip(true)}
                            onMouseLeave={() => setShowTip(false)}
                            onClick={() => setShowTip(!showTip)}
                            className="text-[var(--foreground-40)] hover:text-indigo-400 transition-colors"
                        >
                            <HelpCircle size={14} />
                        </button>

                        <AnimatePresence>
                            {showTip && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute left-auto right-0 sm:left-0 bottom-full mb-3 w-64 p-4 rounded-2xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl z-50 text-xs pointer-events-none"
                                >
                                    <div className="font-black text-[var(--indigo-text)] uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                        {t('proTipTitle')}
                                    </div>
                                    <div className="text-[var(--foreground-40)] leading-relaxed text-[0.6875rem]">
                                        {t('proTipDesc')}
                                    </div>
                                    <div className="absolute right-2 sm:right-auto sm:left-4 top-full w-2 h-2 bg-[var(--modal-bg)] border-r border-b border-[var(--card-border)] rotate-45 -translate-y-1" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </form>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
                    >
                        <XCircle size={16} />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {result && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 min-h-screen overscroll-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setResult(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-xl bg-[var(--modal-bg)] border border-[var(--card-border)] rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 pb-0 flex justify-between items-start z-10">
                                <div className="space-y-1">
                                    <h3 className={cn("text-4xl font-black font-outfit tracking-tight text-[rgb(var(--foreground-rgb))]", useCapitalCase ? "uppercase" : "lowercase")}>
                                        {formatWord(result.word, useCapitalCase)}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[var(--foreground-40)] font-mono italic text-sm">{result.phonetic || '/.../'}</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); playAudio(); }}
                                            className="p-1.5 bg-indigo-500/10 rounded-full text-[var(--indigo-text)] hover:bg-indigo-500/20 transition-colors"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setResult(null)}
                                    className="p-3 bg-[var(--foreground-10)] rounded-2xl text-[var(--foreground-40)] hover:text-[rgb(var(--foreground-rgb))] hover:bg-[var(--foreground-20)] transition-all"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-hide">
                                <div className="space-y-4">
                                    {/* exchange info */}
                                    {result.exchange && (
                                        <div className="p-3 px-5 rounded-2xl bg-[var(--foreground-10)] border border-[var(--card-border)]">
                                            <p className="text-[0.625rem] font-black uppercase py-0.5 px-2 rounded-full border border-[var(--card-border)] text-[var(--foreground-40)] mb-2 w-fit">
                                                {t('inflections')}
                                            </p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                {parseExchange(result.exchange).map((ex, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="text-[var(--foreground-40)]">{ex.label}:</span>
                                                        <span className="text-[var(--indigo-text)] font-medium">{formatWord(ex.value, useCapitalCase)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats & Metadata Section */}
                                    {(result.tags || result.posDist || result.bnc || result.frq) && (
                                        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                            <p className="text-[0.625rem] font-black uppercase tracking-widest text-[var(--indigo-text)] opacity-60">
                                                {tReview('wordStats')}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {result.tags?.split(' ').filter(Boolean).map((tag: string) => (
                                                    <span key={tag} className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[0.625rem] font-bold text-[var(--indigo-text)]">
                                                        {tReview(`tag_${tag}`)}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                {result.posDist && (
                                                    <div className="space-y-1">
                                                        <p className="text-[0.625rem] text-[var(--foreground-40)] font-bold uppercase">{tReview('posDistribution')}</p>
                                                        <p className="text-xs text-[var(--indigo-text)] font-mono">{result.posDist}</p>
                                                    </div>
                                                )}
                                                {(result.bnc || result.frq) && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 relative">
                                                            <p className="text-[0.625rem] text-[var(--foreground-40)] font-bold uppercase">{tReview('frequency')}</p>
                                                            <button
                                                                type="button"
                                                                onMouseEnter={() => setShowFreqTip(true)}
                                                                onMouseLeave={() => setShowFreqTip(false)}
                                                                onClick={(e) => { e.stopPropagation(); setShowFreqTip(!showFreqTip); }}
                                                                className="text-[var(--foreground-40)] hover:text-indigo-400 transition-colors"
                                                            >
                                                                <HelpCircle size={10} />
                                                            </button>
                                                            <AnimatePresence>
                                                                {showFreqTip && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        className="absolute left-0 bottom-full mb-3 w-72 sm:w-80 p-4 rounded-2xl bg-[var(--modal-bg)] border border-[var(--card-border)] shadow-2xl z-[110] text-[0.625rem] pointer-events-none"
                                                                    >
                                                                        <div className="font-black text-[var(--indigo-text)] uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                            <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                                                            {tReview('frequencyHelpTitle')}
                                                                        </div>
                                                                        <div className="space-y-2 text-[var(--foreground-40)] leading-relaxed">
                                                                            <div className="flex gap-1"><span className="text-[rgb(var(--foreground-rgb))] font-bold underline decoration-indigo-500/50">BNC:</span> {tReview('bncDescription')}</div>
                                                                            <div className="flex gap-1"><span className="text-[rgb(var(--foreground-rgb))] font-bold underline decoration-indigo-500/50">FRQ:</span> {tReview('frqDescription')}</div>
                                                                            <div className="pt-1 text-[var(--indigo-text)] italic font-medium">{tReview('frequencyCombined')}</div>
                                                                        </div>
                                                                        <div className="absolute left-16 sm:left-20 top-full w-2 h-2 bg-[var(--modal-bg)] border-r border-b border-[var(--card-border)] rotate-45 -translate-y-1" />
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        <div className="flex gap-3 text-xs text-[var(--indigo-text)] font-mono">
                                                            {result.bnc && <span>BNC #{result.bnc}</span>}
                                                            {result.frq && <span>FRQ #{result.frq}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {result.meanings.map((m: any, i: number) => (
                                        <div key={i} className="p-5 rounded-3xl bg-[var(--foreground-10)] border border-[var(--card-border)] space-y-3 group hover:bg-indigo-500/5 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[0.625rem] font-black uppercase py-0.5 px-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-[var(--indigo-text)]">
                                                    {m.part_of_speech || 'N/A'}
                                                </span>
                                                <p className="font-bold text-xl text-[rgb(var(--foreground-rgb))]">{m.chinese_meaning}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {result.examples && result.examples.length > 0 && (
                                        <div className="mt-2 space-y-4">
                                            <p className="text-[0.625rem] font-black text-[var(--indigo-text)] uppercase tracking-[0.2em] px-2">{t('usageContext')}</p>
                                            {result.examples.map((ex: any, ei: number) => (
                                                <div key={ei} className="text-sm bg-[var(--foreground-10)] p-4 rounded-[1.5rem] border border-[var(--card-border)]">
                                                    <p className="text-[rgb(var(--foreground-rgb))] opacity-80 italic font-medium leading-relaxed">&quot;{ex.en}&quot;</p>
                                                    <div className="h-px bg-[var(--card-border)] w-8 my-2" />
                                                    <p className="text-[var(--indigo-text)] opacity-60 text-xs font-medium">{ex.zh}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-[var(--foreground-10)] border-t border-[var(--card-border)] flex gap-4">
                                <button
                                    onClick={handleAdd}
                                    disabled={adding || isAdded}
                                    className={cn(
                                        "flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest transition-all shadow-xl",
                                        isAdded
                                            ? "bg-green-500/10 text-green-400 border border-green-500/20 cursor-default"
                                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 hover:shadow-indigo-600/40 transform active:scale-[0.98]"
                                    )}
                                >
                                    {adding ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : isAdded ? (
                                        <CheckCircle2 size={20} />
                                    ) : (
                                        <Plus size={20} />
                                    )}
                                    {isAdded ? t('lexiconStored') : adding ? t('archiving') : t('addToCollection')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
