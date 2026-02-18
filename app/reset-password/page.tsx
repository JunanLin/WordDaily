'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function ResetPasswordPage() {
    const t = useTranslations('auth');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
        } else {
            setMessage(t('passwordUpdated'));
            setTimeout(() => {
                router.push('/');
                router.refresh();
            }, 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen max-w-sm mx-auto p-6 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black font-outfit bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {t('newPasswordPlaceholder')}
                </h2>
                <p className="text-white/40 font-medium">Please enter your new password below.</p>
            </div>

            <form onSubmit={handleUpdate} className="w-full space-y-6">
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                    <input
                        type="password"
                        placeholder={t('newPasswordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-white/30"
                        required
                        minLength={6}
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20 px-4">
                        {error}
                    </p>
                )}

                {message && (
                    <div className="flex flex-col items-center gap-3 py-6 text-indigo-400 animate-in fade-in zoom-in duration-300">
                        <CheckCircle size={48} />
                        <p className="font-bold text-center">{message}</p>
                    </div>
                )}

                {!message && (
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-xl shadow-indigo-500/20"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : t('updatePassword')}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                )}
            </form>
        </div>
    );
}
