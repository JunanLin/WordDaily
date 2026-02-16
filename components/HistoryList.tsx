'use client';

import { useState, useEffect } from 'react';
import {
    format,
    parseISO,
    isSameDay,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    subMonths,
    addMonths,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { ChevronRight, Trash2, Calendar as CalendarIcon, Plus, X, ChevronLeft } from 'lucide-react';
import { deleteUserWord } from '@/lib/actions/delete-word';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface Example {
    example_en: string;
    example_zh: string;
}

interface WordDefinition {
    part_of_speech: string;
    definition_text_zh: string;
    definition_text_en: string;
    examples: Example[];
}

interface UserWord {
    id: string;
    created_at: string;
    next_review_at: string;
    words: {
        word: string;
        phonetic_ipa?: string;
        definitions: WordDefinition[];
        general_examples?: Example[];
    };
}

interface HistoryListProps {
    history: UserWord[];
}

const getPOSColor = (pos: string) => {
    const p = pos ? pos.toLowerCase() : '';
    if (p.includes('noun')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (p.includes('verb')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (p.includes('adj')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (p.includes('adv')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
};

export default function HistoryList({ history }: HistoryListProps) {
    const t = useTranslations('history');
    const locale = useLocale();
    const dateLocale = locale === 'zh' ? zhCN : enUS;

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedWord, setSelectedWord] = useState<UserWord | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [visibleDaysCount, setVisibleDaysCount] = useState(3);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const router = useRouter();

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
        try {
            await deleteUserWord(userWordId);
            router.refresh();
        } catch (error) {
            console.error('Delete failed:', error);
            alert(t('deleteFailed'));
        } finally {
            setIsDeleting(null);
        }
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

                    <div className="space-y-0.5 px-2">
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
                        <button
                            onClick={() => router.push('/add')}
                            className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold hover:bg-white/10 transition-colors"
                        >
                            <Plus size={14} /> {t('addWordsDate')}
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
                                <div
                                    key={uw.id}
                                    onClick={() => setSelectedWord(uw)}
                                    className="card group relative overflow-hidden py-4 px-5 flex items-center justify-between hover:bg-white/[0.07] transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                                >
                                    <div className="flex flex-col">
                                        <h4 className="text-xl font-bold font-outfit leading-tight">{uw.words.word}</h4>
                                        <p className="text-sm text-white/40">{uw.words.definitions?.[0]?.definition_text_zh}</p>
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
                                <button
                                    onClick={() => router.push('/add')}
                                    className="mt-4 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:underline"
                                >
                                    {t('addWordsDate')}
                                </button>
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
                                        <h2 className="text-4xl font-black font-outfit">{selectedWord.words.word}</h2>
                                        <p className="text-white/40 font-mono italic text-sm">{selectedWord.words.phonetic_ipa}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWord(null)}
                                        className="p-2 bg-white/5 rounded-full hover:bg-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-2 flex-grow scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {/* Definitions */}
                                    {selectedWord.words.definitions.map((m, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-[10px] font-bold uppercase py-0.5 px-1.5 rounded border", getPOSColor(m.part_of_speech))}>
                                                    {m.part_of_speech || 'N/A'}
                                                </span>
                                                <p className="font-bold text-lg">{m.definition_text_zh}</p>
                                            </div>
                                            <p className="text-sm text-white/60 leading-relaxed italic">
                                                {m.definition_text_en}
                                            </p>
                                            {m.examples && m.examples.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {m.examples.map((ex, ei) => (
                                                        <div key={ei} className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{t('example')}</p>
                                                            <p className="text-xs text-white/80 leading-relaxed italic">
                                                                &quot;{ex.example_en}&quot;
                                                            </p>
                                                            <p className="text-[10px] text-white/40 mt-1">{ex.example_zh}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* General Usage Examples */}
                                    {selectedWord.words.general_examples && selectedWord.words.general_examples.length > 0 && (
                                        <div className="space-y-3 mt-6 pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">
                                                {t('usageExamples')}
                                            </div>
                                            <div className="space-y-3">
                                                {selectedWord.words.general_examples.map((ex, ei) => (
                                                    <div key={ei} className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                                        <p className="text-xs text-white/80 leading-relaxed italic">
                                                            &quot;{ex.example_en}&quot;
                                                        </p>
                                                        <p className="text-[10px] text-white/40 mt-1">{ex.example_zh}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedWord(null)}
                                    className="btn-primary w-full py-4 text-sm font-bold tracking-widest uppercase flex-shrink-0 mt-auto shadow-2xl"
                                >
                                    {t('closeDetail')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
