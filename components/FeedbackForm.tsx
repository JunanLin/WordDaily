'use client';

import { useState } from 'react';
import { MessageSquare, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { submitFeedback } from '@/lib/actions/feedback';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackForm() {
    const t = useTranslations('feedback');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [page, setPage] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const pages = [
        { id: 'home', label: 'Home' },
        { id: 'review', label: 'Review' },
        { id: 'history', label: 'History' },
        { id: 'settings', label: 'Settings' },
        { id: 'lists', label: 'Lists' },
        { id: 'other', label: 'Other' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setStatus(null);

        try {
            const res = await submitFeedback({ message: message.trim(), page: page || undefined });
            if (res.success) {
                setStatus({ type: 'success', message: t('success') });
                setMessage('');
                setPage('');
            } else {
                setStatus({ type: 'error', message: res.error || t('error') });
            }
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: t('unexpectedError') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 text-[var(--foreground-20)] px-2">
                <MessageSquare size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('title')}</span>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-6 border-[var(--card-border)]">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--foreground-40)] uppercase tracking-widest px-1">
                            {t('messageLabel')}
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t('messagePlaceholder')}
                            rows={4}
                            required
                            className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-[var(--foreground-20)] resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--foreground-40)] uppercase tracking-widest px-1">
                            {t('pageLabel')}
                        </label>
                        <div className="relative group">
                            <select
                                value={page}
                                onChange={(e) => setPage(e.target.value)}
                                className="w-full bg-[var(--foreground-10)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-[var(--foreground-60)] cursor-pointer"
                            >
                                <option value="" className="bg-[var(--modal-bg)] text-[rgb(var(--foreground-rgb))]">{t('notPageSpecific')}</option>
                                {pages.map(p => (
                                    <option key={p.id} value={p.id} className="bg-[var(--modal-bg)] text-[rgb(var(--foreground-rgb))]">{p.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--foreground-20)] pointer-events-none group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                "flex items-center gap-3 p-4 rounded-xl text-xs font-medium",
                                status.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                            )}
                        >
                            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {status.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/20 text-indigo-400 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none group"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={18} />
                    ) : (
                        <>
                            <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                            {t('submit')}
                        </>
                    )}
                </button>
            </form>
        </section>
    );
}
