'use client';

import { useState } from 'react';
import { ingestWord } from '@/lib/actions/word-ingestion';
import { Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AddWordPage() {
    const [word, setWord] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!word.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await ingestWord(word.trim());
            setResult({ success: true, message: `"${res.lemma}" added successfully!` });
            setWord('');
            // Optional: redirect to dashboard after a delay
            setTimeout(() => router.push('/'), 2000);
        } catch (error: unknown) {
            setResult({ success: false, message: (error as Error).message || 'Something went wrong' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 h-[70vh] flex flex-col justify-center">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold font-outfit">New Word</h2>
                <p className="text-white/40">Expand your vocabulary today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                    <input
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                        disabled={loading}
                        placeholder="Enter an English word..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-white/20"
                        autoFocus
                    />
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
                    {loading ? 'Processing...' : 'Add Word'}
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
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Pro Tip</h4>
                    <p className="text-sm text-white/50 leading-relaxed">
                        Words are lemmatized automatically. For example, adding &quot;developing&quot; will store &quot;develop&quot;.
                    </p>
                </div>
            </div>
        </div>
    );
}
