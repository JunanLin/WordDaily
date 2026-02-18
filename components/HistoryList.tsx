'use client';

import { useState, useEffect, useTransition } from 'react';
import {
    format,
    parseISO,
    isSameDay,
    isSameMonth,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    subMonths,
    addMonths,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { ChevronRight, Trash2, Calendar as CalendarIcon, Plus, X, ChevronLeft, Volume2 } from 'lucide-react';
import { deleteUserWord } from '@/lib/actions/delete-word';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatWord } from '@/lib/utils/format';

interface Example {
    example_en: string;
    example_zh: string;
}

interface Meaning {
    part_of_speech: string;
    chinese_meaning: string;
}

interface UserWord {
    id: string;
    created_at: string;
    next_review_at: string;
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

interface HistoryListProps {
    history: UserWord[];
    recentLookups: UserWord[];
    useCapitalCase?: boolean;
}

const getPOSColor = (pos: string) => {
    const p = pos ? pos.toLowerCase() : '';
    if (p.includes('noun') || p === 'n') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (p.includes('verb') || p === 'v') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (p.includes('adj') || p === 'a') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (p.includes('adv') || p === 'r') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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

export default function HistoryList({ history: initialHistory, recentLookups, useCapitalCase = false }: HistoryListProps) {
    const t = useTranslations('history');
    const tReview = useTranslations('review');
    const locale = useLocale();
    const dateLocale = locale === 'zh' ? zhCN : enUS;

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedWord, setSelectedWord] = useState<UserWord | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [visibleDaysCount, setVisibleDaysCount] = useState(3);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [history, setHistory] = useState(initialHistory);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const playAudio = (text: string, url?: string) => {
        if (url) {
            const audio = new Audio(url);
            audio.play().catch(e => {
                console.error('Audio play error, falling back to TTS:', e);
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
            });
        } else {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
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

    // Only update local history if the initialHistory changes AND we are not in the middle of a transition
    useEffect(() => {
        if (!isPending) {
            setHistory(initialHistory);
        }
    }, [initialHistory, isPending]);

    // Handle direct word links from query params
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const wordId = searchParams.get('wordId');
        if (wordId) {
            const word = history.find(w => w.id === wordId) || recentLookups.find(w => w.id === wordId);
            if (word) {
                setSelectedWord(word);
                // Clear the param so it doesn't reopen on every mount
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            } else {
                // If not found, maybe re-trigger a refresh or wait
                // For now, let's just wait as history might update
            }
        }
    }, [history, recentLookups, router]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (selectedWord) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedWord]);

    // Group history by date
    const groupedHistory = history.reduce((acc: Record<string, UserWord[]>, item) => {
        const date = format(parseISO(item.created_at), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const dates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

    const handleDelete = async (userWordId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('deleteConfirm'))) return;

        setIsDeleting(userWordId);

        // Optimistic update
        setHistory(prev => prev.filter(w => w.id !== userWordId));

        startTransition(async () => {
            try {
                const res = await deleteUserWord(userWordId);
                if (res.success) {
                    router.refresh();
                    window.dispatchEvent(new CustomEvent('refresh-due-count'));
                } else {
                    // Rollback on failure
                    setHistory(initialHistory);
                    alert(t('deleteFailed'));
                }
            } catch (error) {
                console.error('Delete failed:', error);
                setHistory(initialHistory);
                alert(t('deleteFailed'));
            } finally {
                setIsDeleting(null);
            }
        });
    };

    // Calendar logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { locale: dateLocale });
    const calendarEnd = endOfWeek(monthEnd, { locale: dateLocale });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Weekdays header
    const weekdays = locale === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const getHeatmapColor = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = groupedHistory[dateStr]?.length || 0;
        if (count === 0) return 'bg-white/5 opacity-20';
        if (count < 3) return 'bg-emerald-500/20 text-emerald-300';
        if (count < 7) return 'bg-emerald-500/40 text-emerald-200';
        return 'bg-emerald-500/70 text-white';
    };

    return (
        <div className="space-y-4">
            {!selectedDate ? (
                /* Main List - Grouped by Date */
                <div className="space-y-6">
                    {/* Month Picker & Calendar */}
                    <div className="card space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold font-outfit uppercase tracking-tight">
                                {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {weekdays.map((day) => (
                                <div key={day} className="text-[10px] font-black text-white/20 text-center uppercase py-1">
                                    {day}
                                </div>
                            ))}
                            {calendarDays.map((day, idx) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const hasWords = !!groupedHistory[dateStr];
                                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => hasWords && setSelectedDate(dateStr)}
                                        disabled={!hasWords}
                                        className={cn(
                                            "aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all relative group",
                                            getHeatmapColor(day),
                                            !isCurrentMonth && "opacity-0 pointer-events-none",
                                            hasWords && "hover:ring-2 hover:ring-white/20 active:scale-90 cursor-pointer"
                                        )}
                                    >
                                        {format(day, 'd')}
                                        {hasWords && (
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                <span className="bg-black text-[8px] py-1 px-2 rounded-full border border-white/10 uppercase font-black">
                                                    {t('wordsCount', { count: groupedHistory[dateStr].length })}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="px-2">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/30">Recent Searches</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 px-2">
                            {recentLookups && recentLookups.length > 0 ? (
                                recentLookups.map((lookup) => (
                                    <button
                                        key={lookup.id}
                                        onClick={() => setSelectedWord({
                                            id: lookup.id,
                                            created_at: lookup.created_at,
                                            next_review_at: '',
                                            dictionary: lookup.dictionary
                                        })}
                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
                                    >
                                        {formatWord(lookup.dictionary.word, useCapitalCase)}
                                    </button>
                                ))
                            ) : (
                                <p className="text-xs text-white/20 italic px-2">No recent searches</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-0.5 px-2 pt-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white/30">{t('recentSessions')}</h3>
                    </div>

                    <div className="space-y-3">
                        {dates.slice(0, visibleDaysCount).map((date) => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                className="card w-full flex items-center justify-between py-5 px-6 group active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-lg">
                                            {isSameDay(parseISO(date), new Date()) ? t('todaysWords') : format(parseISO(date), 'PP', { locale: dateLocale })}
                                        </h4>
                                        <p className="text-xs text-white/30 font-bold uppercase tracking-widest pt-0.5">
                                            {t('wordsCount', { count: groupedHistory[date].length })}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-white/20 group-hover:text-white/60 transition-colors" />
                            </button>
                        ))}
                    </div>

                    {dates.length > visibleDaysCount && (
                        <button
                            onClick={() => setVisibleDaysCount(prev => prev + 10)}
                            className="w-full py-4 text-xs font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors bg-white/5 rounded-2xl border border-dashed border-white/10"
                        >
                            {t('showMore', { count: dates.length - visibleDaysCount })}
                        </button>
                    )}
                </div>
            ) : (
                /* Daily Detail View */
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="text-indigo-400 text-sm font-bold flex items-center gap-1 hover:text-indigo-300 transition-colors"
                        >
                            <ChevronRight size={16} className="rotate-180" /> {t('backToHistory')}
                        </button>
                    </div>

                    <div className="space-y-1 pb-2">
                        <h3 className="text-3xl font-black font-outfit text-indigo-400">
                            {format(parseISO(selectedDate), 'MMMM do', { locale: dateLocale })}
                        </h3>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">{t('vocabularyArchive')}</p>
                    </div>

                    <div className="space-y-3">
                        {groupedHistory[selectedDate] ? (
                            groupedHistory[selectedDate].map((uw) => (
                                <div key={uw.id} className="card py-4 px-5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.07] transition-all" onClick={() => setSelectedWord(uw)}>
                                    <div className="space-y-0.5">
                                        <h4 className="text-lg font-bold">{formatWord(uw.dictionary.word, useCapitalCase)}</h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-white/40 italic">{uw.dictionary.phonetic || '/.../'}</p>
                                            <p className="text-xs text-white/60 line-clamp-1">{uw.dictionary.translation}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(uw.id, e)}
                                            disabled={isDeleting === uw.id}
                                            className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        >
                                            {isDeleting === uw.id ? (
                                                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                        <ChevronRight size={18} className="text-white/10" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center">
                                <p className="text-white/40 text-sm">{t('noWordsDate')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Word Detail Modal */}
            <AnimatePresence>
                {selectedWord && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overscroll-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                        >
                            <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden">
                                <div className="flex justify-between items-start flex-shrink-0">
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black font-outfit">{formatWord(selectedWord.dictionary.word, useCapitalCase)}</h2>
                                        <p className="text-white/40 font-mono italic text-sm">{selectedWord.dictionary.phonetic || '/.../'}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWord(null)}
                                        className="p-2 bg-white/5 rounded-full hover:bg-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-2 flex-grow scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    <div className="flex justify-center py-2">
                                        <button
                                            onClick={() => playAudio(selectedWord.dictionary.word, selectedWord.dictionary.audio)}
                                            className="p-4 bg-indigo-500/10 rounded-full hover:bg-indigo-500/20 text-indigo-400 transition-all active:scale-95"
                                        >
                                            <Volume2 size={24} />
                                        </button>
                                    </div>

                                    {/* Exchange / Inflections */}
                                    {selectedWord.dictionary.exchange && (
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Inflections</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                {parseExchange(selectedWord.dictionary.exchange).map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="text-white/30">{ex.label}:</span>
                                                        <span className="text-indigo-400 font-medium">{ex.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats & Metadata Section */}
                                    {(selectedWord.dictionary.tag || selectedWord.dictionary.pos || selectedWord.dictionary.bnc || selectedWord.dictionary.frq) && (
                                        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">
                                                {tReview('wordStats')}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {selectedWord.dictionary.tag?.split(' ').filter(Boolean).map((tag: string) => (
                                                    <span key={tag} className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300">
                                                        {tReview(`tag_${tag}`)}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                {selectedWord.dictionary.pos && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-white/40 font-bold uppercase">{tReview('posDistribution')}</p>
                                                        <p className="text-xs text-indigo-200/80 font-mono">{selectedWord.dictionary.pos}</p>
                                                    </div>
                                                )}
                                                {(selectedWord.dictionary.bnc || selectedWord.dictionary.frq) && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-white/40 font-bold uppercase">{tReview('frequency')}</p>
                                                        <div className="flex flex-col gap-1 text-[10px] text-indigo-200/80 font-mono">
                                                            {selectedWord.dictionary.bnc && <span>BNC #{selectedWord.dictionary.bnc}</span>}
                                                            {selectedWord.dictionary.frq && <span>FRQ #{selectedWord.dictionary.frq}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Meanings */}
                                    {parseMeanings(selectedWord.dictionary.translation || '', selectedWord.dictionary.pos).map((m: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-[10px] font-bold uppercase py-0.5 px-1.5 rounded border leading-none", getPOSColor(m.part_of_speech))}>
                                                    {m.part_of_speech || 'N/A'}
                                                </span>
                                                <p className="text-xl font-bold text-white/90">{m.chinese_meaning?.replace(/\r?\n|\\n/g, '  ')}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Examples */}
                                    {parseExamples(selectedWord.dictionary.detail).length > 0 && (
                                        <div className="space-y-3 pt-4">
                                            <div className="flex items-center gap-2 px-1">
                                                <Volume2 size={12} className="text-indigo-400" />
                                                <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest">Usage Context</span>
                                            </div>
                                            {parseExamples(selectedWord.dictionary.detail).map((ex: any, ei: number) => (
                                                <div key={ei} className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-1 hover:bg-indigo-500/10 transition-colors">
                                                    <p className="text-sm text-white/80 leading-relaxed italic">&quot;{ex.en || ex.example_en}&quot;</p>
                                                    <p className="text-xs text-white/40">{ex.zh || ex.example_zh}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedWord(null)}
                                    className="btn-primary w-full py-4 text-sm font-bold tracking-widest uppercase flex-shrink-0 mt-auto shadow-2xl"
                                >
                                    Close Detail
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
