'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
    const t = useTranslations('auth');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        // Ensure we encode the next path to handle redirects properly
        const nextPath = '/reset-password';
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo,
        });

        if (resetError) {
            setError(resetError.message);
        } else {
            setMessage(t('resetEmailSent'));
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen max-w-sm mx-auto p-6 space-y-8">
            <div className="w-full">
                <Link
                    href="/login"
                    className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors font-bold text-sm uppercase tracking-widest"
                >
                    <ArrowLeft size={16} />
                    {t('signIn')}
                </Link>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black font-outfit bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {t('resetPassword')}
                </h2>
                <p className="text-white/40 font-medium">{t('resetPasswordDesc')}</p>
            </div>

            <form onSubmit={handleReset} className="w-full space-y-6">
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                    <input
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring_indigo-500/50 transition-all placeholder:text-white/30"
                        required
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20 px-4">
                        {error}
                    </p>
                )}

                {message && (
                    <p className="text-indigo-400 text-sm text-center bg-indigo-500/10 py-3 rounded-xl border border-indigo-500/20 px-4">
                        {message}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading || !!message}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-xl shadow-indigo-500/20"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : t('sendResetLink')}
                    {!loading && <Send size={20} />}
                </button>
            </form>
        </div>
    );
}
