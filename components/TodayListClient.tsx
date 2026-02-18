'use client';

import { useState, useTransition, useEffect } from 'react';
import { Trash2, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { deleteUserWord } from '@/lib/actions/delete-word';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatWord } from '@/lib/utils/format';

interface UserWord {
    id: string;
    next_review_at: string;
    dictionary: {
        word: string;
        phonetic?: string;
        translation?: string;
    };
}

interface TodayListClientProps {
    initialWords: UserWord[];
    useCapitalCase?: boolean;
}

const parseMeanings = (translation: string) => {
    if (!translation) return '';
    const line = translation.split(/\r?\n|\\n/)[0];
    const match = line.match(/^([a-z]+\.)\s*(.*)/);
    return match ? match[2].trim().replace(/\r?\n|\\n/g, '  ') : line.trim().replace(/\r?\n|\\n/g, '  ');
};

export default function TodayListClient({ initialWords, useCapitalCase = false }: TodayListClientProps) {
    const t = useTranslations('history');
    const [words, setWords] = useState(initialWords);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        if (!isPending) {
            setWords(initialWords);
        }
    }, [initialWords, isPending]);

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;
        setIsDeleting(id);

        // Optimistic update
        setWords(prev => prev.filter(w => w.id !== id));

        startTransition(async () => {
            try {
                const res = await deleteUserWord(id);
                if (res.success) {
                    router.refresh();
                    window.dispatchEvent(new CustomEvent('refresh-due-count'));
                } else {
                    setWords(initialWords);
                    alert(t('deleteFailed'));
                }
            } catch (error) {
                console.error('Delete failed:', error);
                setWords(initialWords);
                alert(t('deleteFailed'));
            } finally {
                setIsDeleting(null);
            }
        });
    };

    if (words.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <BookOpen className="mx-auto text-white/20 mb-4" size={48} />
                <p className="text-white/40">No words added yet today.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {words.map((uw) => (
                <div key={uw.id} className="card py-4 px-5 flex items-center justify-between group">
                    <div className="space-y-0.5">
                        <h4 className="text-lg font-bold">{formatWord(uw.dictionary.word, useCapitalCase)}</h4>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-white/40 italic">{uw.dictionary.phonetic || '/.../'}</p>
                            <p className="text-xs text-white/60 line-clamp-1">{parseMeanings(uw.dictionary.translation || '')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {new Date(uw.next_review_at) > new Date() ? (
                                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                                    <CheckCircle2 size={12} /> Learned
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                                    <Clock size={12} /> Pending
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => handleDelete(uw.id)}
                            disabled={isDeleting === uw.id}
                            className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                            {isDeleting === uw.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Trash2 size={16} />
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
