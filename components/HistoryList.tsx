'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
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
import { ChevronRight, Trash2, Calendar as CalendarIcon, Plus, X, ChevronLeft, Volume2, HelpCircle } from 'lucide-react';
import { deleteUserWord, deleteRecentSearches } from '@/lib/actions/delete-word';
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
    word_id?: string;
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

export default function HistoryList({ history: initialHistory, recentLookups, useCapitalCase = false }: HistoryListProps) {
    const t = useTranslations('history');
    const tReview = useTranslations('review');
    const locale = useLocale();
    const dateLocale = locale === 'zh' ? zhCN : enUS;

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedWord, setSelectedWord] = useState<UserWord | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [visibleDaysCount, setVisibleDaysCount] = useState(3);
    const [showFreqTip, setShowFreqTip] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [history, setHistory] = useState(initialHistory);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Recent searches: long-press a word to enter edit mode, then remove words individually
    const [lookups, setLookups] = useState(recentLookups);
    const [editingLookups, setEditingLookups] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressStart = useRef<{ x: number; y: number } | null>(null);
    const longPressFired = useRef(false);

    useEffect(() => {
        setLookups(recentLookups);
    }, [recentLookups]);

    // Exit edit mode once nothing is left
    useEffect(() => {
        if (lookups.length === 0) {
            setEditingLookups(false);
            setConfirmClear(false);
        }
    }, [lookups.length]);

    const cancelLongPress = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        longPressStart.current = null;
    };

    const startLongPress = (e: React.PointerEvent) => {
        longPressFired.current = false;
        longPressStart.current = { x: e.clientX, y: e.clientY };
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            setEditingLookups(true);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
        }, 500);
    };

    const moveLongPress = (e: React.PointerEvent) => {
        const start = longPressStart.current;
        // Cancel if the finger moves (the user is scrolling)
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancelLongPress();
    };

    const removeLookups = async (wordIds: string[]) => {
        const ids = Array.from(new Set(wordIds.filter(Boolean)));
        if (ids.length === 0) return;
        const previous = lookups;
        setLookups(prev => prev.filter(l => !l.word_id || !ids.includes(l.word_id)));
        try {
            await deleteRecentSearches(ids);
            router.refresh();
        } catch (error) {
            console.error('Failed to delete recent searches:', error);
            setLookups(previous);
            alert(t('deleteSearchFailed'));
        }
    };

    const handleClearLookups = () => {
        if (!confirmClear) {
            setConfirmClear(true);
            return;
        }
        setConfirmClear(false);
        removeLookups(lookups.map(l => l.word_id || ''));
    };

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
        if (count === 0) return 'bg-[var(--foreground-10)] opacity-20';
        if (count < 3) return 'bg-emerald-500/20 text-emerald-300';
        if (count < 7) return 'bg-emerald-500/40 text-emerald-200';
        return "bg-emerald-500/70 text-[rgb(var(--foreground-rgb))]";
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
                                    className="p-2 bg-[var(--foreground-10)] rounded-lg hover:bg-[var(--foreground-20)] transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                    className="p-2 bg-[var(--foreground-10)] rounded-lg hover:bg-[var(--foreground-20)] transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {weekdays.map((day) => (
                                <div key={day} className="text-[0.625rem] font-black text-[var(--foreground-20)] text-center uppercase py-1">
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
                                            hasWords && "hover:ring-2 hover:ring-[var(--foreground-20)] active:scale-90 cursor-pointer"
                                        )}
                                    >
                                        {format(day, 'd')}
                                        {hasWords && (
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                <span className="bg-[var(--modal-bg)] text-[rgb(var(--foreground-rgb))] text-[0.5rem] py-1 px-2 rounded-full border border-[var(--card-border)] uppercase font-black">
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
                        <div className="px-2 flex items-center justify-between gap-2 min-h-[2rem]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-40)]">{t('recentSearches')}</h3>
                            {lookups.length > 0 && (
                                <div className="flex items-center gap-2">
                                    {editingLookups && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingLookups(false); setConfirmClear(false); }}
                                            className="px-3 py-1 rounded-lg text-xs font-bold text-[var(--indigo-text)] hover:bg-[var(--foreground-10)] transition-colors"
                                        >
                                            {t('doneEditing')}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleClearLookups}
                                        onBlur={() => setConfirmClear(false)}
                                        aria-label={t('clearSearches')}
                                        title={t('clearSearches')}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-lg transition-colors",
                                            confirmClear
                                                ? "px-3 py-1 bg-red-500/15 text-red-500 text-xs font-bold"
                                                : "p-1.5 text-[var(--foreground-40)] hover:text-red-500 hover:bg-red-500/10"
                                        )}
                                    >
                                        <Trash2 size={16} />
                                        {confirmClear && <span>{t('clearSearchesConfirm')}</span>}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 px-2">
                            {lookups.length > 0 ? (
                                lookups.map((lookup) => (
                                    <div key={lookup.id} className="relative">
                                        <button
                                            type="button"
                                            onPointerDown={startLongPress}
                                            onPointerMove={moveLongPress}
                                            onPointerUp={cancelLongPress}
                                            onPointerLeave={cancelLongPress}
                                            onPointerCancel={cancelLongPress}
                                            onContextMenu={(e) => e.preventDefault()}
                                            onClick={() => {
                                                // A long press only enters edit mode; don't also open the word
                                                if (longPressFired.current) {
                                                    longPressFired.current = false;
                                                    return;
                                                }
                                                if (editingLookups) {
                                                    removeLookups([lookup.word_id || '']);
                                                    return;
                                                }
                                                setSelectedWord({
                                                    id: lookup.id,
                                                    created_at: lookup.created_at,
                                                    next_review_at: '',
                                                    dictionary: lookup.dictionary
                                                });
                                            }}
                                            style={{ WebkitTouchCallout: 'none' }}
                                            className={cn(
                                                "px-4 py-2 bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-xl text-sm transition-colors select-none",
                                                editingLookups
                                                    ? "pr-8 border-red-500/30 hover:bg-red-500/10"
                                                    : "hover:bg-[var(--foreground-20)]"
                                            )}
                                            aria-label={editingLookups ? t('removeSearch', { word: lookup.dictionary.word }) : undefined}
                                        >
                                            {formatWord(lookup.dictionary.word, useCapitalCase)}
                                        </button>
                                        {editingLookups && (
                                            <X
                                                size={14}
                                                aria-hidden="true"
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none"
                                            />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-[var(--foreground-20)] italic px-2">{t('noRecentSearches')}</p>
                            )}
                        </div>
                        {lookups.length > 0 && (
                            <p className="text-[0.625rem] text-[var(--foreground-20)] px-2">
                                {editingLookups ? t('tapToRemoveHint') : t('longPressHint')}
                            </p>
                        )}
                    </div>

                    <div className="space-y-0.5 px-2 pt-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-40)]">{t('recentSessions')}</h3>
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
                                        <p className="text-xs text-[var(--foreground-40)] font-bold uppercase tracking-widest pt-0.5">
                                            {t('wordsCount', { count: groupedHistory[date].length })}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-[var(--foreground-20)] group-hover:text-[var(--foreground-60)] transition-colors" />
                            </button>
                        ))}
                    </div>

                    {dates.length > visibleDaysCount && (
                        <button
                            onClick={() => setVisibleDaysCount(prev => prev + 10)}
                            className="w-full py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--foreground-40)] hover:text-[rgb(var(--foreground-rgb))] transition-colors bg-[var(--foreground-10)] rounded-2xl border border-dashed border-[var(--card-border)]"
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
                        <p className="text-[var(--foreground-40)] text-[0.625rem] uppercase tracking-[0.2em] font-black">{t('vocabularyArchive')}</p>
                    </div>

                    <div className="space-y-3">
                        {groupedHistory[selectedDate] ? (
                            groupedHistory[selectedDate].map((uw) => (
                                <div key={uw.id} className="card py-4 px-5 flex items-center justify-between group cursor-pointer hover:bg-[var(--foreground-10)] transition-all" onClick={() => setSelectedWord(uw)}>
                                    <div className="space-y-0.5">
                                        <h4 className="text-lg font-bold">{formatWord(uw.dictionary.word, useCapitalCase)}</h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-[var(--foreground-40)] italic">{uw.dictionary.phonetic || '/.../'}</p>
                                            <p className="text-xs text-[var(--foreground-60)] line-clamp-1">{uw.dictionary.translation}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(uw.id, e)}
                                            disabled={isDeleting === uw.id}
                                            className="p-2 text-[var(--foreground-10)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                        >
                                            {isDeleting === uw.id ? (
                                                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                        <ChevronRight size={18} className="text-[var(--foreground-10)]" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 bg-[var(--foreground-10)] rounded-3xl border border-dashed border-[var(--card-border)] text-center">
                                <p className="text-[var(--foreground-40)] text-sm">{t('noWordsDate')}</p>
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
                            className="w-full max-w-md bg-[var(--modal-bg)] border border-[var(--card-border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                        >
                            <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden">
                                <div className="flex justify-between items-start flex-shrink-0">
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black font-outfit">{formatWord(selectedWord.dictionary.word, useCapitalCase)}</h2>
                                        <p className="text-[var(--foreground-40)] font-mono italic text-sm">{selectedWord.dictionary.phonetic || '/.../'}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWord(null)}
                                        className="p-2 bg-[var(--foreground-10)] rounded-full hover:bg-[var(--foreground-20)]"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-2 flex-grow scrollbar-thin scrollbar-thumb-[var(--foreground-10)] scrollbar-track-transparent">
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
                                        <div className="p-3 rounded-xl bg-[var(--foreground-10)] border border-[var(--card-border)]">
                                            <p className="text-[0.625rem] font-bold text-[var(--foreground-40)] uppercase tracking-widest mb-1">Inflections</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                {parseExchange(selectedWord.dictionary.exchange).map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="text-[var(--foreground-40)]">{ex.label}:</span>
                                                        <span className="text-indigo-400 font-medium">{ex.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats & Metadata Section */}
                                    {(selectedWord.dictionary.tag || selectedWord.dictionary.pos || selectedWord.dictionary.bnc || selectedWord.dictionary.frq) && (
                                        <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                                            <p className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-400/60">
                                                {tReview('wordStats')}
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {selectedWord.dictionary.tag?.split(' ').filter(Boolean).map((tag: string) => (
                                                    <span key={tag} className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[0.625rem] font-bold text-indigo-300">
                                                        {tReview(`tag_${tag}`)}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                {selectedWord.dictionary.pos && (
                                                    <div className="space-y-1">
                                                        <p className="text-[0.625rem] text-[var(--foreground-40)] font-bold uppercase">{tReview('posDistribution')}</p>
                                                        <p className="text-xs text-indigo-200/80 font-mono">{selectedWord.dictionary.pos}</p>
                                                    </div>
                                                )}
                                                {(selectedWord.dictionary.bnc || selectedWord.dictionary.frq) && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 relative">
                                                            <p className="text-[0.625rem] text-[var(--foreground-40)] font-bold uppercase">{tReview('frequency')}</p>
                                                            <button
                                                                type="button"
                                                                onMouseEnter={() => setShowFreqTip(true)}
                                                                onMouseLeave={() => setShowFreqTip(false)}
                                                                onClick={(e) => { e.stopPropagation(); setShowFreqTip(!showFreqTip); }}
                                                                className="text-[var(--foreground-20)] hover:text-indigo-400 transition-colors"
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
                                                                        <p className="font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                            <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                                                            {tReview('frequencyHelpTitle')}
                                                                        </p>
                                                                        <div className="space-y-2 text-[var(--foreground-60)] leading-relaxed">
                                                                            <p><span className="text-[var(--foreground-80)] font-bold underline decoration-indigo-500/50">BNC:</span> {tReview('bncDescription')}</p>
                                                                            <p><span className="text-[var(--foreground-80)] font-bold underline decoration-indigo-500/50">FRQ:</span> {tReview('frqDescription')}</p>
                                                                            <p className="pt-1 text-indigo-300/80 italic font-medium">{tReview('frequencyCombined')}</p>
                                                                        </div>
                                                                        <div className="absolute left-16 sm:left-20 top-full w-2 h-2 bg-[var(--modal-bg)] border-r border-b border-[var(--card-border)] rotate-45 -translate-y-1" />
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        <div className="flex flex-col gap-1 text-[0.625rem] text-indigo-200/80 font-mono">
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
                                        <div key={i} className="p-4 rounded-2xl bg-[var(--foreground-10)] border border-[var(--card-border)] space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-[0.625rem] font-bold uppercase py-0.5 px-1.5 rounded border leading-none", getPOSColor(m.part_of_speech))}>
                                                    {m.part_of_speech || 'N/A'}
                                                </span>
                                                <p className="text-xl font-bold text-[rgb(var(--foreground-rgb))]">{m.chinese_meaning?.replace(/\r?\n|\\n/g, '  ')}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Examples */}
                                    {parseExamples(selectedWord.dictionary.detail).length > 0 && (
                                        <div className="space-y-3 pt-4">
                                            <div className="flex items-center gap-2 px-1">
                                                <Volume2 size={12} className="text-indigo-400" />
                                                <span className="text-[0.625rem] font-bold text-indigo-400/60 uppercase tracking-widest">Usage Context</span>
                                            </div>
                                            {parseExamples(selectedWord.dictionary.detail).map((ex: any, ei: number) => (
                                                <div key={ei} className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-1 hover:bg-indigo-500/10 transition-colors">
                                                    <p className="text-sm text-[var(--foreground-80)] leading-relaxed italic">&quot;{ex.en || ex.example_en}&quot;</p>
                                                    <p className="text-xs text-[var(--foreground-40)]">{ex.zh || ex.example_zh}</p>
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
