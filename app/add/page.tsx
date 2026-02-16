'use client';

import { useState } from 'react';
import { ingestWord } from '@/lib/actions/word-ingestion';
import { Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AddWordPage() {
    const t = useTranslations('add');
    const [word, setWord] = useState('');
    const [shouldLemmatize, setShouldLemmatize] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!word.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await ingestWord(word.trim(), shouldLemmatize);
            if (res.success) {
                setResult({ success: true, message: t('success', { word: res.word }) });
                setWord('');
            } else {
                setResult({ success: false, message: res.error || t('error') });
            }
        } catch (error: unknown) {
            setResult({ success: false, message: (error as Error).message || t('error') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 h-[70vh] flex flex-col justify-center">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold font-outfit">{t('title')}</h2>
                <p className="text-white/40">{t('subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="relative group">
                        <input
                            type="text"
                            value={word}
                            onChange={(e) => setWord(e.target.value)}
                            disabled={loading}
                            placeholder={t('placeholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-white/20"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <label className="text-sm text-white/40 cursor-pointer flex items-center gap-2 select-none" onClick={() => setShouldLemmatize(!shouldLemmatize)}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${shouldLemmatize ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                {shouldLemmatize && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            {t('lemmatizeLabel')}
                        </label>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !word.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <Plus size={20} />
                    )}
                    {loading ? t('processing') : t('button')}
                </button>
            </form>

            {result && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {result.success ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    <p className="text-sm font-medium">{result.message}</p>
                </div>
            )}

            {/* Quick Tips */}
            <div className="mt-auto pt-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">{t('proTipTitle')}</h4>
                    <p className="text-sm text-white/50 leading-relaxed">
                        {t('proTipDesc')}
                    </p>
                </div>
            </div>
        </div>
    );
}
