'use client';

import { useState } from 'react';
import { lookupWord, addWordToUserList } from '@/lib/actions/word-ingestion';
import { Search, Plus, Loader2, Volume2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function WordSearch() {
    const t = useTranslations('add');
    const tReview = useTranslations('review');
    const [word, setWord] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAdded, setIsAdded] = useState(false);
    const [expandedDefs, setExpandedDefs] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!word.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setIsAdded(false);
        setExpandedDefs(false);

        try {
            const res = await lookupWord(word.trim());
            if (res.success) {
                setResult(res);
            } else {
                if (res.error === 'word_not_fount') {
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
            audio.play().catch(console.error);
        }
    };

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

    return (
        <div className="space-y-4">
            <form onSubmit={handleSearch} className="relative group">
                <div className="relative">
                    <input
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        placeholder={t('placeholder')}
                        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-14 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-white/20 shadow-inner"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={22} />

                    <button
                        type="submit"
                        disabled={loading || !word.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-white/5 disabled:text-white/10 text-white px-6 rounded-[1.1rem] font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="hidden sm:inline">{t('search')}</span>
                                <Search size={18} />
                            </>
                        )}
                    </button>
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
                            className="relative w-full max-w-xl bg-[#121218] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 pb-0 flex justify-between items-start z-10">
                                <div className="space-y-1">
                                    <h3 className="text-4xl font-black font-outfit uppercase tracking-tight text-white">{result.word}</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-white/40 font-mono italic text-sm">{result.phonetic || '/.../'}</p>
                                        {result.audioUrl && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); playAudio(); }}
                                                className="p-1.5 bg-indigo-500/10 rounded-full text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                            >
                                                <Volume2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setResult(null)}
                                    className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-hide">
                                <div className="space-y-4">
                                    {/* exchange info */}
                                    {result.exchange && (
                                        <div className="p-3 px-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                            <p className="text-[10px] font-black uppercase py-0.5 px-2 rounded-full border border-white/10 text-white/40 mb-2 w-fit">
                                                Inflections
                                            </p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                {parseExchange(result.exchange).map((ex, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="text-white/30">{ex.label}:</span>
                                                        <span className="text-indigo-400 font-medium">{ex.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats & Metadata Section */}
                                    {(result.tags || result.posDist || result.bnc || result.frq) && (
                                        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">
                                                {tReview('wordStats')}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {result.tags?.split(' ').filter(Boolean).map((tag: string) => (
                                                    <span key={tag} className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300">
                                                        {tReview(`tag_${tag}`)}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                {result.posDist && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-white/40 font-bold uppercase">{tReview('posDistribution')}</p>
                                                        <p className="text-xs text-indigo-200/80 font-mono">{result.posDist}</p>
                                                    </div>
                                                )}
                                                {(result.bnc || result.frq) && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-white/40 font-bold uppercase">{tReview('frequency')}</p>
                                                        <div className="flex gap-3 text-xs text-indigo-200/80 font-mono">
                                                            {result.bnc && <span>BNC #{result.bnc}</span>}
                                                            {result.frq && <span>FRQ #{result.frq}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {result.meanings.map((m: any, i: number) => (
                                        <div key={i} className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3 group hover:bg-white/[0.05] transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase py-0.5 px-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                                                    {m.part_of_speech || 'N/A'}
                                                </span>
                                                <p className="font-bold text-xl text-indigo-100">{m.chinese_meaning}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {result.examples && result.examples.length > 0 && (
                                        <div className="mt-4 space-y-4 pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{tReview('contextualUsage')}</p>
                                            {result.examples.map((ex: any, ei: number) => (
                                                <div key={ei} className="text-sm bg-black/20 p-4 rounded-[2rem] border border-white/5">
                                                    <p className="text-white/80 italic font-medium leading-relaxed">&quot;{ex.en}&quot;</p>
                                                    <div className="h-px bg-white/5 w-8 my-2" />
                                                    <p className="text-indigo-400/60 text-xs font-medium">{ex.zh}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4">
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
                                    {isAdded ? 'Stored in Lexicon' : adding ? 'Archiving...' : 'Add to Collection'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
