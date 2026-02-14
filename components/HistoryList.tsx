'use client';

import { useState } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ChevronRight, Trash2, Calendar, BookOpen, Plus, X } from 'lucide-react';
import { deleteUserWord } from '@/lib/actions/delete-word';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface HistoryListProps {
    history: any[];
}

export default function HistoryList({ history }: HistoryListProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedWord, setSelectedWord] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    // Group history by date
    const groupedHistory = history.reduce((acc: any, item) => {
        const date = format(parseISO(item.created_at), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {});

    const dates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

    const handleDelete = async (userWordId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this word from your list?')) return;

        setIsDeleting(userWordId);
        try {
            await deleteUserWord(userWordId);
            // The data will refresh via revalidatePath, but we can also hide it locally if needed
            // For simplicity, we rely on server action refreshing the page
            router.refresh();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete word');
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-4">
            {!selectedDate ? (
                /* Main List - Grouped by Date */
                <div className="space-y-3">
                    {dates.map((date) => (
                        <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className="card w-full flex items-center justify-between py-5 px-6 group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                    <Calendar size={20} />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-lg">
                                        {isSameDay(parseISO(date), new Date()) ? "Today's Words" : format(parseISO(date), 'MMMM do, yyyy')}
                                    </h4>
                                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest pt-0.5">
                                        {groupedHistory[date].length} Words Learned
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-white/20 group-hover:text-white/60 transition-colors" />
                        </button>
                    ))}
                </div>
            ) : (
                /* Daily Detail View */
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSelectedDate(null)}
                            className="text-indigo-400 text-sm font-bold flex items-center gap-1 hover:text-indigo-300 transition-colors"
                        >
                            <ChevronRight size={16} className="rotate-180" /> Back to Groups
                        </button>
                        <button
                            onClick={() => router.push('/add')}
                            className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold hover:bg-white/10 transition-colors"
                        >
                            <Plus size={14} /> Add Word
                        </button>
                    </div>

                    <div className="space-y-1 pb-2">
                        <h3 className="text-3xl font-black font-outfit">
                            {format(parseISO(selectedDate), 'MMM do')}
                        </h3>
                        <p className="text-white/40 text-sm uppercase tracking-widest font-bold">List Details</p>
                    </div>

                    <div className="space-y-3">
                        {groupedHistory[selectedDate].map((uw: any) => (
                            <div
                                key={uw.id}
                                onClick={() => setSelectedWord(uw)}
                                className="card group relative overflow-hidden py-4 px-5 flex items-center justify-between hover:bg-white/[0.07] transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                            >
                                <div className="flex flex-col">
                                    <h4 className="text-xl font-bold font-outfit">{uw.words.lemma}</h4>
                                    <p className="text-sm text-white/40">{uw.words.word_meanings?.[0]?.chinese_translation}</p>
                                </div>
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
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Word Detail Modal */}
            <AnimatePresence>
                {selectedWord && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h2 className="text-4xl font-black font-outfit">{selectedWord.words.lemma}</h2>
                                        <p className="text-white/40 font-mono italic text-sm">{selectedWord.words.phonetic}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWord(null)}
                                        className="p-2 bg-white/5 rounded-full hover:bg-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-none">
                                    {selectedWord.words.word_meanings.map((m: any, i: number) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                    {m.part_of_speech}
                                                </span>
                                                <p className="font-bold text-lg">{m.chinese_translation}</p>
                                            </div>
                                            <p className="text-sm text-white/60 leading-relaxed">
                                                {m.english_definition}
                                            </p>
                                            {m.example_sentence && (
                                                <p className="text-xs text-indigo-400/60 italic border-l-2 border-indigo-400/20 pl-2">
                                                    "{m.example_sentence}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setSelectedWord(null)}
                                    className="btn-primary w-full py-4 text-sm font-bold tracking-widest uppercase"
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
